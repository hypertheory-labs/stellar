import type { StellarClient } from '../types';
import { isStellarMcpError } from '../errors';
import { defineTool, errorResult, jsonResult } from './tool-types';

export function describeTool(client: StellarClient) {
  return defineTool({
    name: 'stellar_describe',
    title: 'Describe registered Stellar stores',
    description:
      'Returns the manifest of every store registered with Stellar Devtools in the current ' +
      'browser tab — names, human-written descriptions, snapshot counts, registration ' +
      'timestamps, and per-instance lifecycle metadata. Always call this first when ' +
      'orienting in an unfamiliar app: it reveals what state surfaces exist before you ' +
      'snapshot any of them. Honors lazy-loaded routes (caveat in the response).',
    inputShape: {},
    handler: async () => {
      try {
        const result = await client.describe();
        return jsonResult(result);
      } catch (err) {
        if (isStellarMcpError(err)) return errorResult(err.message, err.hint);
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  });
}
