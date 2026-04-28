import { z } from 'zod';
import type { StellarClient } from '../types';
import { isStellarMcpError } from '../errors';
import { defineTool, errorResult, jsonResult } from './tool-types';

export function diffTool(client: StellarClient) {
  return defineTool({
    name: 'stellar_diff',
    title: 'Diff the two most recent snapshots',
    description:
      'Returns `{ from, to }` — the two most recent state snapshots for a store. Use ' +
      'when you only need to know what just changed, not the full timeline. Operates ' +
      'within a single instance only — cross-instance diffs are intentionally not ' +
      'supported because state is not continuous across remounts.',
    inputShape: {
      name: z.string().min(1).describe('Store name to diff.'),
      instance: z
        .string()
        .min(1)
        .optional()
        .describe('Specific instance id; defaults to latest active.'),
    },
    handler: async input => {
      try {
        const result = await client.diff(input.name, { instance: input.instance });
        if (!result) {
          return errorResult(
            `Cannot diff "${input.name}" — fewer than 2 snapshots available.`,
            'A store needs at least two state transitions before a diff is meaningful.',
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
