import { describe, it, expect, beforeEach } from 'vitest';
import { diffTool } from '../../tools/diff';
import { FakeStellarClient, sampleSnapshots } from '../fixtures';

describe('stellar_diff tool', () => {
  let client: FakeStellarClient;
  let tool: ReturnType<typeof diffTool>;

  beforeEach(() => {
    client = new FakeStellarClient();
    tool = diffTool(client);
  });

  it('returns the from/to pair as JSON', async () => {
    const result = await tool.handler({ name: 'CounterStore' });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      from: sampleSnapshots[1],
      to: sampleSnapshots[2],
    });
  });

  it('returns an error result when fewer than two snapshots exist', async () => {
    client.diffResult = null;
    const result = await tool.handler({ name: 'NewStore' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('fewer than 2 snapshots');
  });

  it('forwards instance id', async () => {
    await tool.handler({ name: 'CounterStore', instance: 'specific' });
    expect(client.calls.diff[0].query?.instance).toBe('specific');
  });

  it('rejects empty name', () => {
    expect(tool.inputSchema.safeParse({ name: '' }).success).toBe(false);
  });
});
