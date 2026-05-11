/**
 * Type contract between stellar-mcp and the Stellar-instrumented browser tab.
 *
 * Every shared shape comes from `@hypertheory-labs/stellar-ng-devtools` — the
 * package that owns the canonical `window.__stellarDevtools` API. Re-exported
 * here so MCP tool authors have a single import surface and so any breaking
 * change in the peer's contract surfaces as a TypeScript error in this file
 * before it reaches an agent at runtime.
 *
 * Implementation note: type-only imports use the package path; runtime
 * imports (the protocol version constant + type guards) come straight from
 * `bridge-protocol` to avoid pulling Angular into the Node bundle. The
 * `bridge-protocol` module is pure TS — no Angular imports — so this is safe
 * and keeps `stellar-mcp` runtime-clean of UI-framework code.
 */
import type {
  DescribeResult,
  DiffResult,
  HttpEvent,
  InstanceQuery,
  RecordingSession,
  StateSnapshot,
  StoreEntry,
  StoreInstance,
} from '@hypertheory-labs/stellar-ng-devtools';

export type {
  BridgeRpcArgs,
  BridgeRpcMethod,
  BridgeRpcResults,
  BridgeState,
  AppToServer,
  ServerToApp,
  HelloAppMessage,
  HelloAckMessage,
  ProtocolMismatchMessage,
  RpcRequestMessage,
  RpcResponseMessage,
  RpcErrorMessage,
  StateMessage,
  DescribeResult,
  DiffResult,
  HttpEvent,
  InstanceManifest,
  InstanceQuery,
  RecordingSession,
  StateSnapshot,
  StellarDevtoolsApi,
  StoreEntry,
  StoreInstance,
  StoreManifest,
  FormatForAIApi,
} from '@hypertheory-labs/stellar-ng-devtools';

// Runtime imports — pulled from the leaf protocol module rather than the
// package barrel so vitest/Node test runs don't transitively load Angular.
// Tsup bundles this relative reference into stellar-mcp's dist; consumers of
// the published package never see it.
export {
  BRIDGE_PROTOCOL_VERSION,
  isAppToServer,
  isServerToApp,
} from '../../../stellar-ng/src/lib/bridge-protocol';

/**
 * Markdown facets exposed via the agent. Mirrors `StellarDevtoolsApi.formatForAI`
 * so tool handlers can request the same output the overlay's "Copy for AI"
 * buttons produce — single source of truth, no duplicate formatter code in this
 * package.
 */
export interface FormatForAIClient {
  store(name: string): Promise<string | null>;
  all(): Promise<string>;
  http(): Promise<string>;
  recording(session?: RecordingSession): Promise<string | null>;
}

export interface RecordControl {
  isRecording(): Promise<boolean>;
  start(name?: string): Promise<void>;
  stop(): Promise<RecordingSession | null>;
}

/**
 * The seam between MCP tools and the running app. Tools depend only on this
 * interface — never on Node WebSocket APIs. The `BridgeServer` implements it
 * by mirroring app-pushed state for reads and round-tripping mutations /
 * formatter calls via the WS protocol.
 *
 * Tests substitute a fake implementation (in-memory). End-to-end tests use a
 * real `BridgeServer` paired with a fake app client over real WebSockets.
 *
 * Method shapes mirror `StellarDevtoolsApi`, with three deliberate adaptations:
 *  - All return values are wrapped in Promise (network boundary).
 *  - `snapshot()` is split into `snapshot()` (all stores) and `snapshotByName()`
 *    so call sites get distinct, well-typed return shapes instead of the
 *    overload union.
 *  - `record.isRecording()` is added as an explicit method (the bridge tracks
 *    this state in its mirror; making it first-class avoids reaching for
 *    `describe()` from the recording tool).
 */
export interface StellarClient {
  isAvailable(): Promise<boolean>;
  describe(): Promise<DescribeResult>;
  snapshot(): Promise<StoreEntry[]>;
  snapshotByName(name: string, query?: InstanceQuery): Promise<StoreEntry | StoreInstance | null>;
  history(name: string, n?: number, query?: InstanceQuery): Promise<StateSnapshot[] | null>;
  diff(name: string, query?: InstanceQuery): Promise<DiffResult | null>;
  http(): Promise<HttpEvent[]>;
  record: RecordControl;
  formatForAI: FormatForAIClient;
}
