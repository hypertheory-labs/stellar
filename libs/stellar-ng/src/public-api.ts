export { withStellarDevtools } from './lib/with-stellar-devtools';
export { withNgrxSignalStoreTools } from './lib/with-ngrx-signal-store-tools';
export { withHttpTrafficMonitoring } from './lib/with-http-traffic-monitoring';
export type { HttpTrafficMonitoringOptions } from './lib/with-http-traffic-monitoring';
export { withStellarBridge } from './lib/with-stellar-bridge';
export type { StellarBridgeOptions } from './lib/with-stellar-bridge';
export { StellarBridgeService } from './lib/stellar-bridge.service';
export type { StellarFeature, AnyStellarFeature, StellarFeatureKind } from './lib/stellar-feature';
export { provideStellar } from './lib/provide-stellar';
export { StellarOverlayComponent } from './lib/stellar-overlay.component';
export type {
  StoreEntry,
  StoreInstance,
  StateSnapshot,
  HttpEvent,
  RegisterOptions,
  ShapeMap,
  ShapeValue,
  RecordingSession,
  RecordingNode,
  RecordingEdge,
  RecordingNodeType,
} from './lib/models';
export { RecordingService } from './lib/recording.service';

// The canonical `window.__stellarDevtools` contract. The MCP server, agent
// integrations, and any external tooling depend on this single type — keep
// the interface and the implementation in provide-stellar.ts in lockstep.
export type {
  StellarDevtoolsApi,
  FormatForAIApi,
  InstanceQuery,
  InstanceManifest,
  StoreManifest,
  DescribeResult,
  DiffResult,
} from './lib/stellar-devtools-api';

// AI-formatted markdown helpers. Used internally by the overlay's clipboard
// buttons and exposed at runtime via window.__stellarDevtools.formatForAI.
// Re-exported here for consumers writing custom Angular tooling that wants
// the same markdown shape without going through window.
export {
  formatStoreForAI,
  formatHttpEventsForAI,
  formatRecordingForAI,
  formatAllStoresForAI,
} from './lib/format-for-ai';

// Bridge protocol — public so the MCP server (and any other consumer) can
// type-check messages on the wire against the same shapes the app uses. The
// protocol version is exported so consumers can compare versions on connect.
export {
  BRIDGE_PROTOCOL_VERSION,
  isAppToServer,
  isServerToApp,
} from './lib/bridge-protocol';
export type {
  AppToServer,
  BridgeRpcArgs,
  BridgeRpcMethod,
  BridgeRpcResults,
  BridgeState,
  HelloAckMessage,
  HelloAppMessage,
  ProtocolMismatchMessage,
  RpcErrorMessage,
  RpcRequestMessage,
  RpcResponseMessage,
  ServerToApp,
  StateMessage,
} from './lib/bridge-protocol';

// Re-exported from @hypertheory-labs/sanitize for convenience — consumers of
// stellardevtools don't need a separate import just to type their sanitize config.
export { sanitizeConfig } from '@hypertheory-labs/sanitize';
export type { SanitizationConfig, SanitizationHandler } from '@hypertheory-labs/sanitize';
