import { describe, it, expect, beforeEach } from 'vitest';
import { describeTool } from '../../tools/describe';
import { FakeStellarClient, sampleDescribeResult } from '../fixtures';
import { StellarMcpError } from '../../errors';

describe('stellar_describe tool', () => {
  let client: FakeStellarClient;
  let tool: ReturnType<typeof describeTool>;

  beforeEach(() => {
    client = new FakeStellarClient();
    tool = describeTool(client);
  });

  it('declares the expected name and title', () => {
    expect(tool.name).toBe('stellar_describe');
    expect(tool.title).toMatch(/Describe/);
  });

  it('rejects unexpected input via strict schema', () => {
    const parsed = tool.inputSchema.safeParse({ unexpected: 1 });
    expect(parsed.success).toBe(false);
  });

  it('returns the manifest as JSON content', async () => {
    const result = await tool.handler({});
    expect(result.isError).toBeFalsy();
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual(sampleDescribeResult);
    expect(result.structuredContent).toEqual(sampleDescribeResult);
    expect(client.calls.describe).toBe(1);
  });

  it('renders StellarMcpError messages with hint', async () => {
    client.errorToThrow = new StellarMcpError(
      'STELLAR_NOT_DETECTED',
      'no api',
      'check provideStellar()',
    );
    const result = await tool.handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('no api');
    expect(result.content[0].text).toContain('check provideStellar()');
  });

  it('renders unknown errors without crashing', async () => {
    client.errorToThrow = new Error('boom');
    const result = await tool.handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('boom');
  });
});
