/**
 * Public API of @hypertheory-labs/stellar-mcp.
 *
 * Most consumers use this package via the `stellar-mcp` bin (an MCP stdio
 * server). The exports below let advanced consumers — testing harnesses,
 * custom transports, or alternative agent integrations — reuse the building
 * blocks programmatically.
 *
 * AI-formatted markdown helpers live on `window.__stellarDevtools.formatForAI`
 * (provided by @hypertheory-labs/stellar-ng-devtools) and are reachable through
 * `BridgeServer.formatForAI` via RPC. They are intentionally NOT re-exported as
 * Node-side functions from this package — there is one source of truth, and
 * it lives in the app process.
 */

export { BridgeServer } from './lib/bridge-server';
export type { BridgeServerOptions } from './lib/bridge-server';

export {
  createStellarMcpServer,
  startStdioServer,
  SERVER_NAME,
  SERVER_VERSION,
} from './lib/server';
export type { StellarMcpServerOptions } from './lib/server';

export { parseConfig, helpText, DEFAULT_PORT, DEFAULT_HOST } from './lib/config';
export type { CliConfig } from './lib/config';

export { StellarMcpError, isStellarMcpError } from './lib/errors';
export type { StellarMcpErrorCode } from './lib/errors';

export { buildAllTools, defineTool } from './lib/tools';
export type { McpToolDefinition, DefineToolOptions } from './lib/tools';

export type {
  StellarClient,
  FormatForAIClient,
  RecordControl,
  StellarDevtoolsApi,
  FormatForAIApi,
  DescribeResult,
  DiffResult,
  InstanceQuery,
  InstanceManifest,
  StoreManifest,
  StoreEntry,
  StoreInstance,
  StateSnapshot,
  HttpEvent,
  RecordingSession,
  BridgeState,
  BridgeRpcMethod,
  AppToServer,
  ServerToApp,
} from './lib/types';

export { BRIDGE_PROTOCOL_VERSION } from './lib/types';
