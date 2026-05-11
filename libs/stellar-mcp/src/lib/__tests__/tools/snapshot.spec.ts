import { describe, it, expect, beforeEach } from 'vitest';
import { snapshotTool } from '../../tools/snapshot';
import { FakeStellarClient, sampleStoreEntry } from '../fixtures';

describe('stellar_snapshot tool', () => {
  let client: FakeStellarClient;
  let tool: ReturnType<typeof snapshotTool>;

  beforeEach(() => {
    client = new FakeStellarClient();
    tool = snapshotTool(client);
  });

  it('without name, returns the array of all stores', async () => {
    const result = await tool.handler({});
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text) as Array<{ name: string }>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('CounterStore');
    expect(client.calls.snapshot).toBe(1);
    expect(client.calls.snapshotByName).toEqual([]);
  });

  it('with name, returns the single matching entry', async () => {
    const result = await tool.handler({ name: 'CounterStore' });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.name).toBe('CounterStore');
    expect(client.calls.snapshotByName).toEqual([
      { name: 'CounterStore', query: { instance: undefined } },
    ]);
  });

  it('forwards instance id when provided', async () => {
    await tool.handler({ name: 'CounterStore', instance: 'inst-2' });
    expect(client.calls.snapshotByName[0].query?.instance).toBe('inst-2');
  });

  it('returns an error result when the named store is missing', async () => {
    client.byNameResult = null;
    const result = await tool.handler({ name: 'GhostStore' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('GhostStore');
    expect(result.content[0].text).toContain('stellar_describe');
  });

  it('input schema rejects empty string for name', () => {
    const result = tool.inputSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('preserves the StoreEntry shape', async () => {
    const result = await tool.handler({ name: 'CounterStore' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(sampleStoreEntry);
  });
});
