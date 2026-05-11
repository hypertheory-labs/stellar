import { z } from 'zod';
import type { StellarClient } from '../types';
import { isStellarMcpError } from '../errors';
import { defineTool, errorResult, jsonResult } from './tool-types';

export function httpTrafficTool(client: StellarClient) {
  return defineTool({
    name: 'stellar_http_traffic',
    title: 'List HTTP requests made by the app',
    description:
      'Returns the captured fetch traffic from the running app: method, URL, status, ' +
      'duration, response body (when JSON), and the trigger context that initiated each ' +
      'request. Filter by method, URL substring, or to only failing requests. Use this ' +
      'to confirm a state change really came from the network rather than a local mutation.',
    inputShape: {
      method: z
        .string()
        .toUpperCase()
        .optional()
        .describe('Filter by HTTP method (GET, POST, ...).'),
      urlContains: z
        .string()
        .optional()
        .describe('Substring filter on URL.'),
      onlyErrors: z
        .boolean()
        .optional()
        .describe('Return only requests with status >= 400 or status === 0 (network error).'),
      limit: z
        .number()
        .int()
        .positive()
        .max(500)
        .optional()
        .describe('Most recent N matching events to return. Defaults to 50.'),
    },
    handler: async input => {
      try {
        const all = await client.http();
        const filtered = all.filter(ev => {
          if (input.method && ev.method.toUpperCase() !== input.method.toUpperCase()) return false;
          if (input.urlContains && !ev.url.includes(input.urlContains)) return false;
          if (input.onlyErrors && ev.status >= 200 && ev.status < 400) return false;
          return true;
        });
        const limit = input.limit ?? 50;
        const trimmed = filtered.slice(-limit);
        return jsonResult(trimmed);
      } catch (err) {
        if (isStellarMcpError(err)) return errorResult(err.message, err.hint);
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  });
}
