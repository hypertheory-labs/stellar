import { describe, it, expect, beforeEach } from 'vitest';
import { aiContextTool } from '../../tools/ai-context';
import {
  FakeStellarClient,
  sampleFormattedAll,
  sampleFormattedHttp,
  sampleFormattedStore,
} from '../fixtures';

describe('stellar_ai_context tool', () => {
  let client: FakeStellarClient;
  let tool: ReturnType<typeof aiContextTool>;

  beforeEach(() => {
    client = new FakeStellarClient();
    tool = aiContextTool(client);
  });

  describe('scope=all', () => {
    it('delegates to the browser-side formatter and returns its markdown', async () => {
      const result = await tool.handler({ scope: 'all' });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(sampleFormattedAll);
      expect(client.calls.formatAll).toBe(1);
      // Critically, no separate snapshot/http calls — the browser-side
      // formatter does the joins.
      expect(client.calls.snapshot).toBe(0);
      expect(client.calls.http).toBe(0);
    });
  });

  describe('scope=store', () => {
    it('requires a name', async () => {
      const result = await tool.handler({ scope: 'store' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('requires `name`');
    });

    it('delegates to the browser-side store formatter', async () => {
      const result = await tool.handler({ scope: 'store', name: 'CounterStore' });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(sampleFormattedStore);
      expect(client.calls.formatStore).toEqual([{ name: 'CounterStore' }]);
    });

    it('returns an error when the formatter returns null (store missing)', async () => {
      client.formattedStoreResult = null;
      const result = await tool.handler({ scope: 'store', name: 'GhostStore' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('GhostStore');
    });
  });

  describe('scope=http', () => {
    it('delegates to the browser-side http formatter', async () => {
      const result = await tool.handler({ scope: 'http' });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(sampleFormattedHttp);
      expect(client.calls.formatHttp).toBe(1);
    });
  });

  it('rejects unknown scope', () => {
    expect(tool.inputSchema.safeParse({ scope: 'wat' }).success).toBe(false);
  });
});
