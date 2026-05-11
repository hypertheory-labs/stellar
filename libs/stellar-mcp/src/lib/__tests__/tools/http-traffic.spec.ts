import { describe, it, expect, beforeEach } from 'vitest';
import { httpTrafficTool } from '../../tools/http-traffic';
import { FakeStellarClient, sampleHttpEvents } from '../fixtures';
import type { HttpEvent } from '../../types';

describe('stellar_http_traffic tool', () => {
  let client: FakeStellarClient;
  let tool: ReturnType<typeof httpTrafficTool>;

  beforeEach(() => {
    client = new FakeStellarClient();
    tool = httpTrafficTool(client);
  });

  it('returns all events when no filter is supplied', async () => {
    const result = await tool.handler({});
    const parsed = JSON.parse(result.content[0].text) as HttpEvent[];
    expect(parsed).toEqual(sampleHttpEvents);
  });

  it('filters by method (case-insensitive in input)', async () => {
    const result = await tool.handler({ method: 'post' });
    const parsed = JSON.parse(result.content[0].text) as HttpEvent[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0].method).toBe('POST');
  });

  it('filters by URL substring', async () => {
    const result = await tool.handler({ urlContains: '/api/books' });
    const parsed = JSON.parse(result.content[0].text) as HttpEvent[];
    expect(parsed).toHaveLength(2);
  });

  it('returns only failures when onlyErrors=true', async () => {
    const result = await tool.handler({ onlyErrors: true });
    const parsed = JSON.parse(result.content[0].text) as HttpEvent[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0].status).toBe(500);
  });

  it('treats network errors (status 0) as failures', async () => {
    client.httpResult = [
      ...sampleHttpEvents,
      {
        id: 'http-3',
        timestamp: 1_700_000_002_000,
        method: 'GET',
        url: '/api/x',
        status: 0,
        ok: false,
        duration: 0,
        error: 'NetworkError',
      },
    ];
    const result = await tool.handler({ onlyErrors: true });
    const parsed = JSON.parse(result.content[0].text) as HttpEvent[];
    expect(parsed.map(e => e.id)).toEqual(['http-2', 'http-3']);
  });

  it('honors limit parameter, returning the most recent N', async () => {
    client.httpResult = Array.from({ length: 10 }, (_, i) => ({
      id: `e${i}`,
      timestamp: 1000 + i,
      method: 'GET',
      url: `/api/${i}`,
      status: 200,
      ok: true,
      duration: 1,
    }));
    const result = await tool.handler({ limit: 3 });
    const parsed = JSON.parse(result.content[0].text) as HttpEvent[];
    expect(parsed.map(e => e.id)).toEqual(['e7', 'e8', 'e9']);
  });

  it('rejects negative limit', () => {
    expect(tool.inputSchema.safeParse({ limit: -1 }).success).toBe(false);
  });
});
