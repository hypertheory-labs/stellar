import { z } from 'zod';
import type { StellarClient } from '../types';
import { isStellarMcpError } from '../errors';
import { defineTool, errorResult, jsonResult } from './tool-types';

export function historyTool(client: StellarClient) {
  return defineTool({
    name: 'stellar_history',
    title: 'Read store snapshot timeline',
    description:
      'Returns the most recent N state snapshots for a store, oldest first. Each snapshot ' +
      'includes timestamp, route, trigger (if known), inferredShape, and the linked HTTP ' +
      'event id when state mutated as a result of a network response. Use this to answer ' +
      '"how did this store get into its current state?" without needing to step through ' +
      'the app manually.',
    inputShape: {
      name: z.string().min(1).describe('Store name to read history for.'),
      n: z
        .number()
        .int()
        .positive()
        .max(500)
        .optional()
        .describe('Most recent N snapshots to return. Defaults to 10.'),
      instance: z
        .string()
        .min(1)
        .optional()
        .describe('Specific instance id; defaults to latest active.'),
    },
    handler: async input => {
      try {
        const result = await client.history(input.name, input.n, {
          instance: input.instance,
        });
        if (!result) {
          return errorResult(
            `No history available for "${input.name}".`,
            'Call stellar_describe to confirm the store is registered and has snapshots.',
          );
        }
        return jsonResult(result);
      } catch (err) {
        if (isStellarMcpError(err)) return errorResult(err.message, err.hint);
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  });
}
