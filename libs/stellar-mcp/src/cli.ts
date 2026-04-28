#!/usr/bin/env node
import { BridgeServer } from './lib/bridge-server';
import { helpText, parseConfig } from './lib/config';
import { isStellarMcpError, StellarMcpError } from './lib/errors';
import { startStdioServer, SERVER_VERSION } from './lib/server';

/**
 * stellar-mcp CLI entry point. Boots:
 *   1. A WebSocket bridge server on localhost:<port> (default 4280) that the
 *      Angular dev app connects to via provideStellar(withStellarBridge()).
 *   2. An MCP server on stdio that forwards tool calls into that bridge.
 *
 * IMPORTANT: All log output goes to stderr. stdout is reserved for the MCP
 * stdio transport — anything written to stdout corrupts the protocol stream.
 */
async function main(): Promise<void> {
  let config;
  try {
    config = parseConfig();
  } catch (err) {
    if (isStellarMcpError(err)) {
      process.stderr.write(`stellar-mcp: ${err.message}\n`);
      if (err.hint) process.stderr.write(`  Hint: ${err.hint}\n`);
      process.exit(2);
    }
    throw err;
  }

  if (config.showHelp) {
    process.stderr.write(helpText());
    process.exit(0);
  }
  if (config.showVersion) {
    process.stderr.write(`${SERVER_VERSION}\n`);
    process.exit(0);
  }

  const bridge = new BridgeServer({ port: config.port, host: config.host });
  try {
    await bridge.listen();
  } catch (err) {
    if (isStellarMcpError(err)) {
      process.stderr.write(`stellar-mcp: ${err.message}\n`);
      if (err.hint) process.stderr.write(`  Hint: ${err.hint}\n`);
      process.exit(exitCodeFor(err));
    }
    throw err;
  }

  const { shutdown, tools } = await startStdioServer(bridge);
  process.stderr.write(
    `stellar-mcp: bridge listening on ${bridge.endpoint()}, ${tools.length} tools registered. Waiting for app connection.\n`,
  );

  const onSignal = async (signal: NodeJS.Signals) => {
    process.stderr.write(`\nstellar-mcp: received ${signal}, shutting down\n`);
    try {
      await shutdown();
      await bridge.close();
    } catch (err) {
      process.stderr.write(
        `stellar-mcp: shutdown failed: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
    process.exit(0);
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
}

function exitCodeFor(err: StellarMcpError): number {
  switch (err.code) {
    case 'INVALID_CONFIG':
      return 2;
    case 'PORT_IN_USE':
      return 3;
    default:
      return 1;
  }
}

main().catch((err) => {
  process.stderr.write(
    `stellar-mcp: fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`,
  );
  process.exit(1);
});
