/**
 * Wire protocol for the Stellar Bridge — the WebSocket connection between a
 * running Angular app instrumented with `withStellarBridge(...)` and an MCP
 * server consumer (typically `@hypertheory-labs/stellar-mcp`).
 *
 * Topology: MCP hosts the WebSocket *server*. The app connects as a *client*
 * via `withStellarBridge`. State updates push from app → MCP. Mutations and
 * formatter calls round-trip MCP → app → MCP via RPC.
 *
 * This module is the single source of truth for the wire shape. Both sides
 * import these types so a breaking protocol change surfaces as a TypeScript
 * error in both packages at build time, not at runtime.
 *
 * Versioning: bump `BRIDGE_PROTOCOL_VERSION` on any breaking change to the
 * message shapes. Mismatch is reported in the `hello` handshake so old clients
 * connecting to new servers (or vice-versa) get a clear error rather than
 * silent corruption.
 */

import type { DescribeResult, FormatForAIApi, StellarDevtoolsApi } from './stellar-devtools-api';
import type { HttpEvent, RecordingSession, StoreEntry } from './models';

export const BRIDGE_PROTOCOL_VERSION = '1';

/**
 * Snapshot of everything the MCP needs to answer queries without round-tripping
 * to the app. Pushed on connect and on every registry change.
 */
export interface BridgeState {
  stores: StoreEntry[];
  httpEvents: HttpEvent[];
  describe: DescribeResult;
  recordingActive: boolean;
  /** Most recent completed recording session, if any. */
  lastRecording: RecordingSession | null;
}

/**
 * Whitelist of methods the MCP can invoke via RPC. Constrained to a fixed
 * union so the app handler is a total function — every method maps to a
 * concrete dispatch case, no string-keyed lookup that could silently miss.
 */
export type BridgeRpcMethod =
  | 'record.start'
  | 'record.stop'
  | 'record.stopAndDownload'
  | 'save'
  | 'formatForAI.store'
  | 'formatForAI.all'
  | 'formatForAI.http'
  | 'formatForAI.recording';

/** Args for each method, indexed by method name. Tuple shapes mirror the API surface. */
export interface BridgeRpcArgs {
  'record.start': [name?: string];
  'record.stop': [];
  'record.stopAndDownload': [];
  save: [];
  'formatForAI.store': [name: string];
  'formatForAI.all': [];
  'formatForAI.http': [];
  'formatForAI.recording': [session?: RecordingSession];
}

/** Return shapes for each method, mirroring `StellarDevtoolsApi`. */
export interface BridgeRpcResults {
  'record.start': void;
  'record.stop': RecordingSession | null;
  'record.stopAndDownload': RecordingSession | null;
  save: void;
  'formatForAI.store': ReturnType<FormatForAIApi['store']>;
  'formatForAI.all': ReturnType<FormatForAIApi['all']>;
  'formatForAI.http': ReturnType<FormatForAIApi['http']>;
  'formatForAI.recording': ReturnType<FormatForAIApi['recording']>;
}

// ── Message shapes ──────────────────────────────────────────────────────────

export interface HelloAppMessage {
  type: 'hello';
  role: 'app';
  protocol: string;
  appUrl: string;
  userAgent: string;
}

export interface StateMessage {
  type: 'state';
  payload: BridgeState;
}

export interface RpcRequestMessage<M extends BridgeRpcMethod = BridgeRpcMethod> {
  type: 'rpc-request';
  id: string;
  method: M;
  args: BridgeRpcArgs[M];
}

export interface RpcResponseMessage<M extends BridgeRpcMethod = BridgeRpcMethod> {
  type: 'rpc-response';
  id: string;
  ok: true;
  result: BridgeRpcResults[M];
}

export interface RpcErrorMessage {
  type: 'rpc-response';
  id: string;
  ok: false;
  error: { code: string; message: string };
}

export interface HelloAckMessage {
  type: 'hello-ack';
  protocol: string;
  serverVersion: string;
}

export interface ProtocolMismatchMessage {
  type: 'protocol-mismatch';
  serverProtocol: string;
  clientProtocol: string;
  message: string;
}

export type AppToServer = HelloAppMessage | StateMessage | RpcResponseMessage | RpcErrorMessage;
export type ServerToApp = HelloAckMessage | ProtocolMismatchMessage | RpcRequestMessage;

/**
 * Type guard reused by both sides. Keeps the parsing logic out of the
 * transport layers so they only deal with already-validated payloads.
 */
export function isAppToServer(value: unknown): value is AppToServer {
  if (!value || typeof value !== 'object') return false;
  const t = (value as { type?: unknown }).type;
  return t === 'hello' || t === 'state' || t === 'rpc-response';
}

export function isServerToApp(value: unknown): value is ServerToApp {
  if (!value || typeof value !== 'object') return false;
  const t = (value as { type?: unknown }).type;
  return t === 'hello-ack' || t === 'protocol-mismatch' || t === 'rpc-request';
}

/**
 * Re-exported from `StellarDevtoolsApi` so RPC dispatch on the app side can
 * type-check the method-to-API binding. The handler maps `BridgeRpcMethod`
 * onto methods of this surface — the compiler verifies completeness.
 */
export type { StellarDevtoolsApi };
