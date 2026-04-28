import { describe, it, expect, beforeEach } from 'vitest';
import { historyTool } from '../../tools/history';
import { FakeStellarClient, sampleSnapshots } from '../fixtures';

describe('stellar_history tool', () => {
  let client: FakeStellarClient;
  let tool: ReturnType<typeof historyTool>;

  beforeEach(() => {
    client = new FakeStellarClient();
    tool = historyTool(client);
  });

  it('forwards name, n, and instance to the client', async () => {
    await tool.handler({ name: 'CounterStore', n: 5, instance: 'inst-1' });
    expect(client.calls.history).toEqual([
      { name: 'CounterStore', n: 5, query: { instance: 'inst-1' } },
    ]);
  });

  it('returns the snapshot array as JSON', async () => {
    const result = await tool.handler({ name: 'CounterStore' });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(sampleSnapshots);
  });

  it('returns an error result when no history is available', async () => {
    client.historyResult = null;
    const result = await tool.handler({ name: 'GhostStore' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('GhostStore');
  });

  it('rejects negative n values', () => {
    expect(tool.inputSchema.safeParse({ name: 'X', n: -1 }).success).toBe(false);
    expect(tool.inputSchema.safeParse({ name: 'X', n: 0 }).success).toBe(false);
  });

  it('rejects n above the max', () => {
    expect(tool.inputSchema.safeParse({ name: 'X', n: 5000 }).success).toBe(false);
  });

  it('requires a name', () => {
    expect(tool.inputSchema.safeParse({}).success).toBe(false);
  });
});
