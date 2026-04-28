import { createServer, type Server as HttpServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, type WebSocket as WsWebSocket } from 'ws';
import {
  BRIDGE_PROTOCOL_VERSION,
  isAppToServer,
  type AppToServer,
  type BridgeRpcArgs,
  type BridgeRpcMethod,
  type BridgeRpcResults,
  type BridgeState,
  type DescribeResult,
  type DiffResult,
  type FormatForAIClient,
  type HttpEvent,
  type InstanceQuery,
  type RecordControl,
  type RecordingSession,
  type ServerToApp,
  type StateSnapshot,
  type StellarClient,
  type StoreEntry,
  type StoreInstance,
} from './types';
import { StellarMcpError } from './errors';

export interface BridgeServerOptions {
  /** TCP port to bind. Default 4280. */
  port?: number;
  /** Bind host. Default 127.0.0.1 (loopback only — never expose this to the network). */
  host?: string;
  /** Path the WebSocket upgrade is served on. Default `/__stellar`. */
  path?: string;
  /** Per-RPC timeout. Default 5s — generous for browser-side formatters. */
  rpcTimeoutMs?: number;
}

interface PendingRpc {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const DEFAULT_PORT = 4280;
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PATH = '/__stellar';
const DEFAULT_RPC_TIMEOUT_MS = 5_000;

/**
 * WebSocket-based StellarClient implementation. Hosts a server that the
 * Angular app connects to via `withStellarBridge(...)`. Replaces the previous
 * Playwright/CDP-based `BrowserBridge` — no browser is involved.
 *
 * Architectural notes:
 * - Hub-of-one. Only one app connection is meaningful at a time. If a second
 *   app connects (page reload, user opening a duplicate tab), the previous
 *   connection is replaced. Multiple parallel apps would race on RPC and
 *   produce inconsistent state — the user-facing assumption is "one running
 *   dev app + one MCP server".
 * - State mirror. The server caches the last `BridgeState` it received from
 *   the app so synchronous query methods can answer immediately without
 *   round-tripping. A consumer that connects and asks "what stores exist?"
 *   gets a useful answer in <1ms.
 * - RPC for mutations. `record.start`, `save`, and the formatter calls are
 *   round-tripped because they need to run code in the live app (for record
 *   start/stop) or because they consume large data the mirror already has
 *   (formatters). The formatter calls *could* run server-side from the mirror
 *   — kept on the app side to preserve the "single source of truth for AI
 *   formatters" rule from the project conventions.
 */
export class BridgeServer implements StellarClient {
  private httpServer: HttpServer;
  private wss: WebSocketServer;
  private appSocket: WsWebSocket | null = null;
  private mirror: BridgeState | null = null;
  private pending = new Map<string, PendingRpc>();
  private rpcTimeoutMs: number;
  private host: string;
  private port: number;
  private path: string;

  readonly record: RecordControl = {
    isRecording: async (): Promise<boolean> => {
      // Cheap path: the mirror already tracks this. Keeps the recording-tool
      // happy when the app hasn't pushed in a while.
      return this.mirror?.recordingActive ?? false;
    },
    start: async (name?: string): Promise<void> => {
      await this.rpc('record.start', [name]);
    },
    stop: async (): Promise<RecordingSession | null> => {
      return (await this.rpc('record.stop', [])) ?? null;
    },
  };

  readonly formatForAI: FormatForAIClient = {
    store: async (name: string): Promise<string | null> => {
      return (await this.rpc('formatForAI.store', [name])) ?? null;
    },
    all: async (): Promise<string> => {
      const result = await this.rpc('formatForAI.all', []);
      return result ?? '';
    },
    http: async (): Promise<string> => {
      const result = await this.rpc('formatForAI.http', []);
      return result ?? '';
    },
    recording: async (session?: RecordingSession): Promise<string | null> => {
      return (await this.rpc('formatForAI.recording', [session])) ?? null;
    },
  };

  constructor(options: BridgeServerOptions = {}) {
    this.port = options.port ?? DEFAULT_PORT;
    this.host = options.host ?? DEFAULT_HOST;
    this.path = options.path ?? DEFAULT_PATH;
    this.rpcTimeoutMs = options.rpcTimeoutMs ?? DEFAULT_RPC_TIMEOUT_MS;

    // Bare HTTP server so we can answer health probes and constrain WS upgrade
    // to the configured path. Anything that isn't the upgrade path returns
    // a small JSON status — useful for `curl http://localhost:4280` to verify
    // the server is alive without speaking WS.
    this.httpServer = createServer((req, res) => {
      if (req.url === '/' || req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          name: 'stellar-mcp-bridge',
          protocol: BRIDGE_PROTOCOL_VERSION,
          appConnected: this.appSocket !== null,
        }));
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });

    this.wss = new WebSocketServer({ noServer: true });
    this.httpServer.on('upgrade', (req, socket, head) => {
      if (req.url !== this.path) {
        socket.destroy();
        return;
      }
      this.wss.handleUpgrade(req, socket, head, (ws) => this.handleConnection(ws));
    });
  }

  /** Bind the server. Resolves once listening; rejects with `PORT_IN_USE` on conflict. */
  async listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      const onError = (err: NodeJS.ErrnoException) => {
        this.httpServer.off('listening', onListening);
        if (err.code === 'EADDRINUSE') {
          reject(
            new StellarMcpError(
              'PORT_IN_USE',
              `Port ${this.port} on ${this.host} is already in use.`,
              'Another stellar-mcp instance may be running, or a different process is bound. Pass --port <n> to pick another port.',
            ),
          );
        } else {
          reject(err);
        }
      };
      const onListening = () => {
        this.httpServer.off('error', onError);
        resolve();
      };
      this.httpServer.once('error', onError);
      this.httpServer.once('listening', onListening);
      this.httpServer.listen(this.port, this.host);
    });
  }

  /** Stop accepting connections, terminate the live app socket, free pending RPCs. */
  async close(): Promise<void> {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new StellarMcpError('APP_DISCONNECTED', 'Server shutting down.'));
    }
    this.pending.clear();
    if (this.appSocket) {
      try {
        this.appSocket.close();
      } catch {
        // best-effort
      }
      this.appSocket = null;
    }
    await new Promise<void>((resolve, reject) => {
      this.wss.close((err) => (err ? reject(err) : resolve()));
    });
    await new Promise<void>((resolve, reject) => {
      this.httpServer.close((err) => (err ? reject(err) : resolve()));
    });
  }

  endpoint(): string {
    return `ws://${this.host}:${this.port}${this.path}`;
  }

  appConnected(): boolean {
    return this.appSocket !== null;
  }

  // ── StellarClient interface ────────────────────────────────────────────────

  async isAvailable(): Promise<boolean> {
    return this.appSocket !== null && this.mirror !== null;
  }

  async describe(): Promise<DescribeResult> {
    return this.requireMirror().describe;
  }

  async snapshot(): Promise<StoreEntry[]> {
    return this.requireMirror().stores;
  }

  async snapshotByName(
    name: string,
    query?: InstanceQuery,
  ): Promise<StoreEntry | StoreInstance | null> {
    const stores = this.requireMirror().stores;
    const entry = stores.find((s) => s.name === name);
    if (!entry) return null;
    if (!query?.instance) return entry;
    return entry.instances.find((i) => i.id === query.instance) ?? null;
  }

  async history(
    name: string,
    n = 10,
    query?: InstanceQuery,
  ): Promise<StateSnapshot[] | null> {
    const stores = this.requireMirror().stores;
    const entry = stores.find((s) => s.name === name);
    if (!entry) return null;
    if (query?.instance) {
      const instance = entry.instances.find((i) => i.id === query.instance);
      return instance ? instance.history.slice(-n) : null;
    }
    // Default: most recent active instance, falling back to most recent ever.
    const active = entry.instances.slice().reverse().find((i) => i.destroyedAt === undefined);
    const target = active ?? entry.instances[entry.instances.length - 1];
    return target ? target.history.slice(-n) : null;
  }

  async diff(name: string, query?: InstanceQuery): Promise<DiffResult | null> {
    const stores = this.requireMirror().stores;
    const entry = stores.find((s) => s.name === name);
    if (!entry) return null;
    let target: StoreInstance | undefined;
    if (query?.instance) {
      target = entry.instances.find((i) => i.id === query.instance);
    } else {
      const active = entry.instances.slice().reverse().find((i) => i.destroyedAt === undefined);
      target = active ?? entry.instances[entry.instances.length - 1];
    }
    if (!target || target.history.length < 2) return null;
    const h = target.history;
    return { from: h[h.length - 2], to: h[h.length - 1] };
  }

  async http(): Promise<HttpEvent[]> {
    return this.requireMirror().httpEvents;
  }

  // ── WebSocket plumbing ─────────────────────────────────────────────────────

  private requireMirror(): BridgeState {
    if (!this.mirror) {
      throw new StellarMcpError(
        'APP_NOT_CONNECTED',
        'No app has connected to the bridge yet, or it has not pushed state.',
        'Open the dev app in a browser. The app must call provideStellar(withStellarBridge()) during bootstrap.',
      );
    }
    return this.mirror;
  }

  private handleConnection(ws: WsWebSocket): void {
    // Hub-of-one: replace any existing app connection. The previous tab
    // closed (or the user reloaded) — either way, the new socket is the
    // authoritative source of truth from this point.
    if (this.appSocket) {
      try {
        this.appSocket.close(1000, 'replaced by new connection');
      } catch {
        // ignore
      }
    }
    this.appSocket = ws;

    ws.on('message', (data) => this.handleMessage(ws, data.toString()));
    ws.on('close', () => {
      if (this.appSocket === ws) {
        this.appSocket = null;
      }
      // Reject any RPCs that were waiting on this socket — the app is gone.
      for (const [id, pending] of this.pending.entries()) {
        clearTimeout(pending.timer);
        pending.reject(
          new StellarMcpError(
            'APP_DISCONNECTED',
            'App disconnected before RPC completed.',
          ),
        );
        this.pending.delete(id);
      }
    });
    ws.on('error', () => {
      // 'close' fires after; cleanup happens there.
    });
  }

  private handleMessage(ws: WsWebSocket, raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return; // ignore garbage
    }
    if (!isAppToServer(parsed)) return;

    const msg = parsed as AppToServer;
    switch (msg.type) {
      case 'hello':
        if (msg.protocol !== BRIDGE_PROTOCOL_VERSION) {
          this.sendToApp(ws, {
            type: 'protocol-mismatch',
            serverProtocol: BRIDGE_PROTOCOL_VERSION,
            clientProtocol: msg.protocol,
            message: `Server speaks protocol ${BRIDGE_PROTOCOL_VERSION}; app sent ${msg.protocol}. Update one side to match.`,
          });
          ws.close(1002, 'protocol mismatch');
          return;
        }
        this.sendToApp(ws, {
          type: 'hello-ack',
          protocol: BRIDGE_PROTOCOL_VERSION,
          serverVersion: BRIDGE_PROTOCOL_VERSION,
        });
        return;
      case 'state':
        this.mirror = msg.payload;
        return;
      case 'rpc-response': {
        const pending = this.pending.get(msg.id);
        if (!pending) return; // stale/timed-out — ignore
        clearTimeout(pending.timer);
        this.pending.delete(msg.id);
        if (msg.ok) {
          pending.resolve(msg.result);
        } else {
          pending.reject(
            new StellarMcpError(
              'RPC_FAILED',
              `App-side RPC failed: ${msg.error.message}`,
            ),
          );
        }
        return;
      }
    }
  }

  private sendToApp(ws: WsWebSocket, msg: ServerToApp): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // ignore — close handler will reset state
    }
  }

  /**
   * Issue an RPC to the connected app. The result type is constrained by
   * `BridgeRpcResults[M]` so callers in this file get exact typing per
   * method. `record.isRecording` is intentionally NOT in this set — it reads
   * from the mirror, no round-trip needed.
   */
  private rpc<M extends BridgeRpcMethod>(
    method: M,
    args: BridgeRpcArgs[M],
  ): Promise<BridgeRpcResults[M]> {
    if (!this.appSocket) {
      return Promise.reject(
        new StellarMcpError(
          'APP_NOT_CONNECTED',
          `RPC '${method}' requires an active app connection.`,
          'Make sure the dev app is open in a browser and has called provideStellar(withStellarBridge()).',
        ),
      );
    }
    const id = randomUUID();
    return new Promise<BridgeRpcResults[M]>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new StellarMcpError(
            'RPC_TIMEOUT',
            `RPC '${method}' timed out after ${this.rpcTimeoutMs}ms.`,
            'The app may be unresponsive — check the browser console.',
          ),
        );
      }, this.rpcTimeoutMs);
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timer,
      });
      this.sendToApp(this.appSocket!, {
        type: 'rpc-request',
        id,
        method,
        args,
      });
    });
  }
}
