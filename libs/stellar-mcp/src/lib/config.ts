import { StellarMcpError } from './errors';

export interface CliConfig {
  /** TCP port to bind the bridge server. */
  port: number;
  /** Bind host. */
  host: string;
  /** When true, print help text and exit 0 instead of starting the server. */
  showHelp: boolean;
  /** When true, print version and exit. */
  showVersion: boolean;
}

export const DEFAULT_PORT = 4280;
export const DEFAULT_HOST = '127.0.0.1';

const HELP = `stellar-mcp — Model Context Protocol server for Stellar Devtools

USAGE
  stellar-mcp [options]

WHAT IT DOES
  Hosts a WebSocket bridge that your Angular app connects to via
  \`provideStellar(withStellarBridge())\`. State pushes from app to MCP on
  every store change; MCP exposes that state to AI agents over stdio.

  No browser automation, no Chrome DevTools Protocol — just a TCP socket
  on localhost.

OPTIONS
  --port <n>         TCP port to bind. Default ${DEFAULT_PORT}.
                     Env: STELLAR_MCP_PORT
  --host <name>      Bind host. Default ${DEFAULT_HOST} (loopback only).
                     Env: STELLAR_MCP_HOST
  --help, -h         Print this help and exit.
  --version, -v      Print version and exit.

PREREQUISITE
  Your app must include \`withStellarBridge()\` in its provideStellar(...)
  call:

    provideStellar(
      withNgrxSignalStoreTools(),
      withHttpTrafficMonitoring(),
      withStellarBridge(),
    )

  The bridge defaults to ws://localhost:${DEFAULT_PORT}/__stellar — match it
  in withStellarBridge({ url: ... }) if you change --port here.
`;

/**
 * Pure parser — no I/O, no exit calls. Returns a typed config or throws
 * StellarMcpError('INVALID_CONFIG'). The CLI entry point is responsible for
 * reading argv/env and reacting to the result.
 */
export function parseConfig(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
): CliConfig {
  let port: string | undefined;
  let host: string | undefined;
  let showHelp = false;
  let showVersion = false;

  const takeValue = (flag: string, value: string | undefined): string => {
    if (!value) {
      throw new StellarMcpError('INVALID_CONFIG', `${flag} requires a value.`);
    }
    return value;
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--help':
      case '-h':
        showHelp = true;
        break;
      case '--version':
      case '-v':
        showVersion = true;
        break;
      case '--port':
        port = takeValue('--port', argv[++i]);
        break;
      case '--host':
        host = takeValue('--host', argv[++i]);
        break;
      default:
        if (arg.startsWith('--port=')) {
          port = arg.slice('--port='.length);
        } else if (arg.startsWith('--host=')) {
          host = arg.slice('--host='.length);
        } else {
          throw new StellarMcpError(
            'INVALID_CONFIG',
            `Unknown argument: ${arg}`,
            'Run stellar-mcp --help for usage.',
          );
        }
    }
  }

  const resolvedPort = port ?? env['STELLAR_MCP_PORT'];
  const resolvedHost = host ?? env['STELLAR_MCP_HOST'];

  let portNum = DEFAULT_PORT;
  if (resolvedPort) {
    portNum = Number(resolvedPort);
    if (!Number.isInteger(portNum) || portNum <= 0 || portNum > 65535) {
      throw new StellarMcpError(
        'INVALID_CONFIG',
        `--port must be an integer between 1 and 65535. Got: ${resolvedPort}`,
      );
    }
  }

  return {
    port: portNum,
    host: resolvedHost ?? DEFAULT_HOST,
    showHelp,
    showVersion,
  };
}

export function helpText(): string {
  return HELP;
}
