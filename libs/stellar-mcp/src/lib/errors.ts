/**
 * Typed errors for predictable handling at the CLI / MCP boundary.
 *
 * Each error carries a `code` so the CLI can map to the right exit status and
 * surface message without relying on string matching.
 */
export type StellarMcpErrorCode =
  | 'INVALID_CONFIG'
  | 'PORT_IN_USE'
  | 'APP_NOT_CONNECTED'
  | 'APP_DISCONNECTED'
  | 'PROTOCOL_MISMATCH'
  | 'RPC_FAILED'
  | 'RPC_TIMEOUT';

export class StellarMcpError extends Error {
  readonly code: StellarMcpErrorCode;
  readonly hint?: string;

  constructor(code: StellarMcpErrorCode, message: string, hint?: string) {
    super(message);
    this.name = 'StellarMcpError';
    this.code = code;
    this.hint = hint;
  }
}

export function isStellarMcpError(err: unknown): err is StellarMcpError {
  return err instanceof StellarMcpError;
}
