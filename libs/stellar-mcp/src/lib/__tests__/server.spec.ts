import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  createStellarMcpServer,
  SERVER_NAME,
  SERVER_VERSION,
} from '../server';
import { defineTool } from '../tools';
import { FakeStellarClient, sampleDescribeResult } from './fixtures';

interface ToolText { type: 'text'; text: string }
interface ToolCallResult { content: ToolText[]; isError?: boolean }
function textOf(result: unknown): string {
  return (result as ToolCallResult).content[0].text;
}

/**
 * End-to-end MCP server test: a real McpServer connected to a real Client over
 * an in-memory transport. Confirms tools are registered, listable, and callable
 * via the MCP protocol — not just via the handler function directly.
 */
describe('createStellarMcpServer', () => {
  it('registers all 7 standard Stellar tools', () => {
    const stellar = new FakeStellarClient();
    const { tools } = createStellarMcpServer(stellar);
    const names = tools.map(t => t.name).sort();
    expect(names).toEqual([
      'stellar_ai_context',
      'stellar_describe',
      'stellar_diff',
      'stellar_history',
      'stellar_http_traffic',
      'stellar_recording',
      'stellar_snapshot',
    ]);
  });

  it('honors a custom toolsFor factory', () => {
    const stellar = new FakeStellarClient();
    const { tools } = createStellarMcpServer(stellar, {
      toolsFor: () => [
        defineTool({
          name: 'just_one',
          title: 'one',
          description: 'one',
          inputShape: { ping: z.string().optional() },
          handler: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
        }),
      ],
    });
    expect(tools.map(t => t.name)).toEqual(['just_one']);
  });

  it('round-trips list-tools and call-tool over an in-memory transport', async () => {
    const stellar = new FakeStellarClient();
    const { server } = createStellarMcpServer(stellar);

    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '0.0.0' });

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const list = await client.listTools();
      expect(list.tools.map(t => t.name).sort()).toEqual([
        'stellar_ai_context',
        'stellar_describe',
        'stellar_diff',
        'stellar_history',
        'stellar_http_traffic',
        'stellar_recording',
        'stellar_snapshot',
      ]);

      const describeCall = await client.callTool({
        name: 'stellar_describe',
        arguments: {},
      });
      expect(describeCall.isError).toBeFalsy();
      expect(JSON.parse(textOf(describeCall))).toEqual(sampleDescribeResult);

      const snapshotCall = await client.callTool({
        name: 'stellar_snapshot',
        arguments: { name: 'CounterStore' },
      });
      expect(snapshotCall.isError).toBeFalsy();
      const parsed = JSON.parse(textOf(snapshotCall)) as { name: string };
      expect(parsed.name).toBe('CounterStore');

      // Confirm input schema validation flows through MCP — bad args should
      // produce an error response.
      const bad = await client.callTool({
        name: 'stellar_history',
        arguments: { name: '' },
      });
      expect(bad.isError).toBe(true);
    } finally {
      await server.close();
      await client.close();
    }
  });

  it('reports server name and version metadata', () => {
    expect(SERVER_NAME).toBe('stellar-mcp');
    expect(SERVER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
