import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { StellarClient } from './types';
import { buildAllTools, type McpToolDefinition } from './tools';

export interface StellarMcpServerOptions {
  /** Override package version reported in MCP metadata. */
  version?: string;
  /** Inject a custom set of tools (testing). Defaults to the standard set. */
  toolsFor?: (client: StellarClient) => McpToolDefinition[];
}

export const SERVER_NAME = 'stellar-mcp';
export const SERVER_VERSION = '0.0.1';

/**
 * Builds an MCP server pre-wired with every Stellar tool. The server is not
 * connected to a transport — the caller chooses one (stdio for the CLI, an
 * in-memory transport for tests).
 *
 * Each tool's `inputShape` is passed verbatim to `registerTool` (which expects
 * a `ZodRawShape`), so there is no `(schema as any).shape` extraction. The
 * type contract between `defineTool` and `registerTool` is enforced by the
 * compiler.
 */
export function createStellarMcpServer(
  client: StellarClient,
  options: StellarMcpServerOptions = {},
): { server: McpServer; tools: McpToolDefinition[] } {
  const server = new McpServer({
    name: SERVER_NAME,
    version: options.version ?? SERVER_VERSION,
  });

  const tools = (options.toolsFor ?? buildAllTools)(client);
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputShape,
      },
      async (input: unknown) => {
        const result = await tool.handler(input as never);
        return {
          content: result.content,
          isError: result.isError,
          structuredContent: result.structuredContent,
        };
      },
    );
  }

  return { server, tools };
}

/**
 * Boot the server on stdio. Returns a function that gracefully shuts the
 * server down — useful for signal handlers and tests.
 */
export async function startStdioServer(
  client: StellarClient,
  options: StellarMcpServerOptions = {},
): Promise<{ shutdown: () => Promise<void>; tools: McpToolDefinition[] }> {
  const { server, tools } = createStellarMcpServer(client, options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return {
    tools,
    shutdown: async () => {
      await server.close();
    },
  };
}
