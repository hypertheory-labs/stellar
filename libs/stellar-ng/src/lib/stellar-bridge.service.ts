import { DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { StellarRegistryService } from './stellar-registry.service';
import { RecordingService } from './recording.service';
import { SnapshotWriterService } from './snapshot-writer.service';
import { buildDescribeResult } from './build-describe';
import {
  formatAllStoresForAI,
  formatHttpEventsForAI,
  formatRecordingForAI,
  formatStoreForAI,
} from './format-for-ai';
import {
  AppToServer,
  BRIDGE_PROTOCOL_VERSION,
  BridgeRpcMethod,
  BridgeState,
  isServerToApp,
  RpcRequestMessage,
  ServerToApp,
} from './bridge-protocol';
import type { RecordingSession } from './models';

export interface StellarBridgeOptions {
  /**
   * WebSocket URL the app should connect to. Default: `ws://localhost:4280/__stellar`
   * — matches the default port the `stellar-mcp` server binds to. Override
   * when running an MCP server on a non-default port (multiple agents, port
   * conflict, etc.) or when proxying through a tunnel.
   */
  url?: string;
  /**
   * Initial reconnect delay in milliseconds. Doubles up to `maxBackoffMs`
   * after each failed connect. Default 500ms — short enough that the bridge
   * comes online quickly when the MCP server starts after the app, slow
   * enough that it doesn't burn CPU when nothing is listening.
   */
  initialBackoffMs?: number;
  /** Cap for exponential backoff. Default 30s. */
  maxBackoffMs?: number;
  /**
   * When true, log lifecycle events (connect, disconnect, reconnect attempts)
   * to the console. Default: respects `ngDevMode` — verbose in dev, silent in
   * prod. Override to `false` if your dev console is too noisy.
   */
  logLifecycle?: boolean;
}

declare const ngDevMode: boolean | undefined;

const DEFAULT_URL = 'ws://localhost:4280/__stellar';
const DEFAULT_INITIAL_BACKOFF_MS = 500;
const DEFAULT_MAX_BACKOFF_MS = 30_000;
const STATE_DEBOUNCE_MS = 16;

/**
 * App-side WebSocket client for the Stellar Bridge protocol. Provided by
 * `withStellarBridge(...)`. Establishes a long-lived connection to the MCP
 * server, pushes registry + recording state on every change, and dispatches
 * RPC requests against the in-process services.
 *
 * The bridge does *not* depend on `window.__stellarDevtools`. Both this
 * service and the window API are independent observers of the same registry,
 * which means the bridge keeps working even if `window.__stellarDevtools` is
 * disabled or shadowed.
 *
 * Sanitization note: state pushed by this service is the same state already
 * placed in the registry by `withStellarDevtools(...)` — sanitization runs
 * upstream there. This service never sees raw state, by construction.
 */
@Injectable({ providedIn: 'root' })
export class StellarBridgeService {
  private registry = inject(StellarRegistryService);
  private recorder = inject(RecordingService);
  private writer = inject(SnapshotWriterService);
  private destroyRef = inject(DestroyRef);

  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private currentBackoffMs = DEFAULT_INITIAL_BACKOFF_MS;
  private hasLoggedFailure = false;
  private started = false;
  private stopped = false;
  private appStart = Date.now();
  private opts: Required<StellarBridgeOptions> = {
    url: DEFAULT_URL,
    initialBackoffMs: DEFAULT_INITIAL_BACKOFF_MS,
    maxBackoffMs: DEFAULT_MAX_BACKOFF_MS,
    logLifecycle: typeof ngDevMode === 'undefined' || ngDevMode === true,
  };

  /** Connection status, exposed as a signal for the overlay/diagnostics. */
  readonly status = signal<'idle' | 'connecting' | 'connected' | 'reconnecting'>('idle');

  constructor() {
    // The effect runs immediately and on every dependency change. Until
    // `start()` flips `started`, the effect is a no-op — this lets the service
    // be safely constructed (and signal dependencies tracked) before the
    // bridge is actually wired up by the environment initializer.
    effect(() => {
      this.registry.stores();
      this.registry.httpEvents();
      this.recorder.isRecording();
      this.recorder.lastSession();
      if (this.started) this.schedulePush();
    });

    this.destroyRef.onDestroy(() => this.shutdown());
  }

  start(options: StellarBridgeOptions = {}): void {
    if (this.started) return;
    this.opts = {
      url: options.url ?? this.opts.url,
      initialBackoffMs: options.initialBackoffMs ?? this.opts.initialBackoffMs,
      maxBackoffMs: options.maxBackoffMs ?? this.opts.maxBackoffMs,
      logLifecycle: options.logLifecycle ?? this.opts.logLifecycle,
    };
    this.currentBackoffMs = this.opts.initialBackoffMs;
    this.started = true;
    this.connect();
  }

  /** Manual disconnect. The service auto-shuts on EnvironmentInjector teardown. */
  shutdown(): void {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.reconnectTimer = null;
    this.pushTimer = null;
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // Best-effort — the underlying socket may already be torn down.
      }
      this.socket = null;
    }
    this.status.set('idle');
  }

  private connect(): void {
    if (this.stopped) return;
    this.status.set(this.hasLoggedFailure ? 'reconnecting' : 'connecting');

    let socket: WebSocket;
    try {
      socket = new WebSocket(this.opts.url);
    } catch (err) {
      this.scheduleReconnect(err instanceof Error ? err.message : String(err));
      return;
    }

    this.socket = socket;

    socket.addEventListener('open', () => {
      if (this.opts.logLifecycle) {
        console.info(`[Stellar Bridge] connected to ${this.opts.url}`);
      }
      this.hasLoggedFailure = false;
      this.currentBackoffMs = this.opts.initialBackoffMs;
      this.status.set('connected');

      this.send({
        type: 'hello',
        role: 'app',
        protocol: BRIDGE_PROTOCOL_VERSION,
        appUrl: typeof location !== 'undefined' ? location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      });
      this.pushState();
    });

    socket.addEventListener('message', (event) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(typeof event.data === 'string' ? event.data : '');
      } catch {
        return; // Malformed — ignore. Server should not send non-JSON.
      }
      if (!isServerToApp(parsed)) return;
      this.handleServerMessage(parsed);
    });

    socket.addEventListener('close', () => {
      this.socket = null;
      this.scheduleReconnect('socket closed');
    });

    socket.addEventListener('error', () => {
      // 'close' fires after 'error', so reconnect is scheduled there.
    });
  }

  private scheduleReconnect(reason: string): void {
    if (this.stopped) return;
    if (this.opts.logLifecycle && !this.hasLoggedFailure) {
      console.info(
        `[Stellar Bridge] disconnected (${reason}). Reconnecting with backoff up to ${
          this.opts.maxBackoffMs / 1000
        }s. The MCP server may not be running yet.`,
      );
      this.hasLoggedFailure = true;
    }
    this.status.set('reconnecting');
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.currentBackoffMs = Math.min(
        this.currentBackoffMs * 2,
        this.opts.maxBackoffMs,
      );
      this.connect();
    }, this.currentBackoffMs);
  }

  private schedulePush(): void {
    // Coalesce bursts of registry changes (a recordState + an unregister
    // landing in the same microtask shouldn't generate two messages).
    if (this.pushTimer) return;
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      this.pushState();
    }, STATE_DEBOUNCE_MS);
  }

  private pushState(): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    const payload = this.buildState();
    this.send({ type: 'state', payload });
  }

  private buildState(): BridgeState {
    return {
      stores: this.stripRawReaders(this.registry.getAllStores()),
      httpEvents: this.registry.getHttpEvents(),
      describe: buildDescribeResult(this.registry, this.recorder, this.appStart),
      recordingActive: this.recorder.isRecording(),
      lastRecording: this.recorder.lastSession(),
    };
  }

  /**
   * `rawReader` is a closure that reads live signal-store state on demand —
   * useful for the overlay's "peek" affordance, but not serializable and not
   * meaningful to a remote MCP consumer. Strip it before sending.
   */
  private stripRawReaders<T extends { rawReader?: unknown; instances?: unknown[] }>(
    entries: T[],
  ): T[] {
    return entries.map(e => {
      const cleaned = { ...e };
      delete cleaned.rawReader;
      if (Array.isArray(cleaned.instances)) {
        cleaned.instances = (cleaned.instances as Array<{ rawReader?: unknown }>).map(i => {
          const cleanedInstance = { ...i };
          delete cleanedInstance.rawReader;
          return cleanedInstance;
        }) as T['instances'];
      }
      return cleaned;
    });
  }

  private handleServerMessage(msg: ServerToApp): void {
    switch (msg.type) {
      case 'hello-ack':
        if (msg.protocol !== BRIDGE_PROTOCOL_VERSION && this.opts.logLifecycle) {
          console.warn(
            `[Stellar Bridge] protocol mismatch: app=${BRIDGE_PROTOCOL_VERSION}, server=${msg.protocol}. ` +
              `Update the package versions to match.`,
          );
        }
        return;
      case 'protocol-mismatch':
        console.error(
          `[Stellar Bridge] protocol mismatch — server rejected the connection: ${msg.message}`,
        );
        return;
      case 'rpc-request':
        void this.handleRpc(msg);
        return;
    }
  }

  private async handleRpc(req: RpcRequestMessage): Promise<void> {
    try {
      const result = await this.dispatchRpc(req.method, req.args);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.send({ type: 'rpc-response', id: req.id, ok: true, result: result as any });
    } catch (err) {
      this.send({
        type: 'rpc-response',
        id: req.id,
        ok: false,
        error: {
          code: 'RPC_FAILED',
          message: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  /**
   * Total dispatch over `BridgeRpcMethod`. Each branch returns the value
   * declared in `BridgeRpcResults[method]`. The cast on `args` is intentional
   * — TypeScript can't narrow the args tuple by string in a switch, but every
   * branch is statically checked against the protocol.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async dispatchRpc(method: BridgeRpcMethod, args: any[]): Promise<unknown> {
    switch (method) {
      case 'record.start': {
        this.recorder.start(args[0]);
        return undefined;
      }
      case 'record.stop': {
        return this.recorder.stop();
      }
      case 'record.stopAndDownload': {
        const session = this.recorder.stop();
        if (session) this.recorder.download(session);
        return session;
      }
      case 'save': {
        await this.writer.save(this.registry.getAllStores());
        return undefined;
      }
      case 'formatForAI.store': {
        const entry = this.registry.getStore(args[0]);
        if (!entry) return null;
        return formatStoreForAI(entry, this.registry.getHttpEvents());
      }
      case 'formatForAI.all': {
        return formatAllStoresForAI(this.registry.getAllStores(), this.registry.getHttpEvents());
      }
      case 'formatForAI.http': {
        return formatHttpEventsForAI(this.registry.getHttpEvents(), this.registry.getAllStores());
      }
      case 'formatForAI.recording': {
        const session: RecordingSession | undefined =
          args[0] ?? this.recorder.lastSession() ?? undefined;
        return session ? formatRecordingForAI(session) : null;
      }
    }
  }

  private send(msg: AppToServer): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    try {
      this.socket.send(JSON.stringify(msg));
    } catch (err) {
      if (this.opts.logLifecycle) {
        console.warn(`[Stellar Bridge] send failed: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
}
