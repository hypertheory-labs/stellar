import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { BridgeServer } from '../bridge-server';
import {
  BRIDGE_PROTOCOL_VERSION,
  type AppToServer,
  type BridgeState,
  type ServerToApp,
  type StoreEntry,
} from '../types';
import {
  sampleDescribeResult,
  sampleHttpEvents,
  sampleStoreEntry,
  sampleRecording,
} from './fixtures';

/**
 * Pick a fresh ephemeral port per test to avoid bind conflicts when the suite
 * runs in parallel. Range chosen well above the 4280 default so a stale dev
 * server doesn't collide.
 */
function freePort(): number {
  return 4500 + Math.floor(Math.random() * 1000);
}

function buildState(overrides: Partial<BridgeState> = {}): BridgeState {
  return {
    stores: [sampleStoreEntry as StoreEntry],
    httpEvents: sampleHttpEvents,
    describe: sampleDescribeResult,
    recordingActive: false,
    lastRecording: null,
    ...overrides,
  };
}

/**
 * Tiny in-test fake "app". Connects as a client to the BridgeServer, sends
 * hello + initial state, and exposes hooks to simulate state pushes and
 * RPC responses.
 */
class FakeApp {
  private ws: WebSocket;
  receivedRpc: Array<{ id: string; method: string; args: unknown[] }> = [];
  rpcResponder: ((req: { id: string; method: string; args: unknown[] }) => unknown) | null = null;

  static async connect(port: number, initialState?: BridgeState): Promise<FakeApp> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/__stellar`);
      const app = new FakeApp(ws);
      let helloSent = false;
      ws.once('open', () => {
        ws.send(
          JSON.stringify({
            type: 'hello',
            role: 'app',
            protocol: BRIDGE_PROTOCOL_VERSION,
            appUrl: 'http://localhost:4200/',
            userAgent: 'fake-app',
          } satisfies AppToServer),
        );
        helloSent = true;
        if (initialState) {
          ws.send(
            JSON.stringify({ type: 'state', payload: initialState } satisfies AppToServer),
          );
        }
        resolve(app);
      });
      ws.once('error', (err) => {
        if (!helloSent) reject(err);
      });
    });
  }

  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString()) as ServerToApp;
      if (msg.type === 'rpc-request') {
        this.receivedRpc.push({ id: msg.id, method: msg.method, args: msg.args });
        if (this.rpcResponder) {
          const result = this.rpcResponder({ id: msg.id, method: msg.method, args: msg.args });
          this.ws.send(
            JSON.stringify({
              type: 'rpc-response',
              id: msg.id,
              ok: true,
              result,
            } satisfies AppToServer),
          );
        }
      }
    });
  }

  pushState(state: BridgeState): void {
    this.ws.send(JSON.stringify({ type: 'state', payload: state } satisfies AppToServer));
  }

  /** Wait until the next message arrives at the app or timeout. Useful for protocol assertions. */
  async waitForRpc(timeoutMs = 1000): Promise<{ id: string; method: string; args: unknown[] }> {
    const start = Date.now();
    while (this.receivedRpc.length === 0) {
      if (Date.now() - start > timeoutMs) throw new Error('rpc timeout');
      await new Promise((r) => setTimeout(r, 5));
    }
    return this.receivedRpc.shift()!;
  }

  close(): void {
    this.ws.close();
  }
}

describe('BridgeServer', () => {
  let server: BridgeServer;

  afterEach(async () => {
    if (server) await server.close();
  });

  describe('lifecycle', () => {
    it('binds and reports its endpoint', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();
      expect(server.endpoint()).toBe(`ws://127.0.0.1:${port}/__stellar`);
    });

    it('rejects EADDRINUSE with PORT_IN_USE error', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();
      const conflict = new BridgeServer({ port });
      await expect(conflict.listen()).rejects.toMatchObject({ code: 'PORT_IN_USE' });
    });

    it('exposes /health endpoint with status JSON', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      const body = await res.json();
      expect(body).toMatchObject({
        name: 'stellar-mcp-bridge',
        protocol: BRIDGE_PROTOCOL_VERSION,
        appConnected: false,
      });
    });

    it('appConnected flips to true once an app sends hello', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();
      const app = await FakeApp.connect(port);
      // Wait a tick for hello to land.
      await new Promise((r) => setTimeout(r, 50));
      expect(server.appConnected()).toBe(true);
      app.close();
    });
  });

  describe('reads from mirror', () => {
    it('throws APP_NOT_CONNECTED before any app pushes state', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();
      await expect(server.describe()).rejects.toMatchObject({ code: 'APP_NOT_CONNECTED' });
    });

    it('serves describe() from the mirror once state lands', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();
      await FakeApp.connect(port, buildState());
      await new Promise((r) => setTimeout(r, 50));
      const result = await server.describe();
      expect(result).toEqual(sampleDescribeResult);
    });

    it('serves snapshot() — list of stores from the mirror', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();
      await FakeApp.connect(port, buildState());
      await new Promise((r) => setTimeout(r, 50));
      const result = await server.snapshot();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('CounterStore');
    });

    it('snapshotByName resolves to the named entry', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();
      await FakeApp.connect(port, buildState());
      await new Promise((r) => setTimeout(r, 50));
      const entry = await server.snapshotByName('CounterStore');
      expect(entry).not.toBeNull();
      expect((entry as StoreEntry).name).toBe('CounterStore');
    });

    it('snapshotByName returns null for unknown names', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();
      await FakeApp.connect(port, buildState());
      await new Promise((r) => setTimeout(r, 50));
      expect(await server.snapshotByName('Nope')).toBeNull();
    });

    it('history defaults to most recent active instance', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();
      await FakeApp.connect(port, buildState());
      await new Promise((r) => setTimeout(r, 50));
      const h = await server.history('CounterStore', 2);
      expect(h).toHaveLength(2);
    });

    it('diff returns from/to of last two snapshots', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();
      await FakeApp.connect(port, buildState());
      await new Promise((r) => setTimeout(r, 50));
      const d = await server.diff('CounterStore');
      expect(d).not.toBeNull();
      expect(d!.from.state).toEqual({ count: 1 });
      expect(d!.to.state).toEqual({ count: 2 });
    });

    it('http() returns events from the mirror', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();
      await FakeApp.connect(port, buildState());
      await new Promise((r) => setTimeout(r, 50));
      const events = await server.http();
      expect(events).toEqual(sampleHttpEvents);
    });

    it('record.isRecording reads from mirror without RPC', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();
      await FakeApp.connect(port, buildState({ recordingActive: true }));
      await new Promise((r) => setTimeout(r, 50));
      expect(await server.record.isRecording()).toBe(true);
    });
  });

  describe('RPC mutations', () => {
    it('record.start round-trips the call to the app', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();
      const app = await FakeApp.connect(port, buildState());
      await new Promise((r) => setTimeout(r, 50));

      app.rpcResponder = () => undefined;
      await server.record.start('my-recording');

      const rpc = await app.waitForRpc();
      expect(rpc.method).toBe('record.start');
      expect(rpc.args).toEqual(['my-recording']);
    });

    it('record.stop returns the recording session from the app', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();
      const app = await FakeApp.connect(port, buildState());
      await new Promise((r) => setTimeout(r, 50));

      app.rpcResponder = () => sampleRecording;
      const result = await server.record.stop();
      expect(result).toEqual(sampleRecording);
    });

    it('formatForAI.all routes through RPC', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();
      const app = await FakeApp.connect(port, buildState());
      await new Promise((r) => setTimeout(r, 50));

      app.rpcResponder = () => '## Stellar Devtools Snapshot — CounterStore';
      const md = await server.formatForAI.all();
      expect(md).toContain('Stellar Devtools Snapshot');
    });

    it('rejects RPC when no app is connected', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();
      await expect(server.record.start()).rejects.toMatchObject({ code: 'APP_NOT_CONNECTED' });
    });

    it('rejects RPC when the app disconnects mid-flight', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();
      const app = await FakeApp.connect(port, buildState());
      await new Promise((r) => setTimeout(r, 50));
      // Don't respond — close instead.
      app.rpcResponder = null;
      const promise = server.record.stop();
      // Give the RPC a moment to dispatch, then yank the connection.
      await new Promise((r) => setTimeout(r, 30));
      app.close();
      await expect(promise).rejects.toMatchObject({ code: 'APP_DISCONNECTED' });
    });

    it('rejects RPC after timeout if the app never responds', async () => {
      const port = freePort();
      server = new BridgeServer({ port, rpcTimeoutMs: 100 });
      await server.listen();
      await FakeApp.connect(port, buildState());
      await new Promise((r) => setTimeout(r, 50));
      // No responder configured — RPC will hang and time out.
      await expect(server.record.start()).rejects.toMatchObject({ code: 'RPC_TIMEOUT' });
    });
  });

  describe('protocol mismatch', () => {
    it('closes the connection when the app speaks a different protocol', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();

      const ws = new WebSocket(`ws://127.0.0.1:${port}/__stellar`);
      await new Promise<void>((resolve) => ws.once('open', () => resolve()));

      const messages: ServerToApp[] = [];
      ws.on('message', (data) => messages.push(JSON.parse(data.toString())));

      ws.send(
        JSON.stringify({
          type: 'hello',
          role: 'app',
          protocol: '999',
          appUrl: '',
          userAgent: 'mismatch',
        } satisfies AppToServer),
      );

      await new Promise<void>((resolve) => ws.once('close', () => resolve()));
      const mismatch = messages.find((m) => m.type === 'protocol-mismatch');
      expect(mismatch).toBeDefined();
    });
  });

  describe('hub-of-one semantics', () => {
    it('replaces a previous app connection when a new one connects', async () => {
      const port = freePort();
      server = new BridgeServer({ port });
      await server.listen();

      const app1 = await FakeApp.connect(port, buildState());
      await new Promise((r) => setTimeout(r, 50));

      const app2 = await FakeApp.connect(port, buildState({ recordingActive: true }));
      await new Promise((r) => setTimeout(r, 100));

      // The mirror is now driven by app2's state.
      expect(await server.record.isRecording()).toBe(true);

      // app1 was forcibly closed by the server (best-effort, may already be torn down)
      app1.close();
      app2.close();
    });
  });
});
