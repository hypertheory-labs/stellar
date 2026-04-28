import { z } from 'zod';
import type { StellarClient } from '../types';
import { isStellarMcpError } from '../errors';
import { defineTool, errorResult, textResult } from './tool-types';

export function aiContextTool(client: StellarClient) {
  return defineTool({
    name: 'stellar_ai_context',
    title: 'Pre-formatted AI handoff document',
    description:
      'Returns a markdown-formatted, AI-friendly context document combining store state, ' +
      'inferred shape, recent diffs, and HTTP traffic with cross-references. Prefer this ' +
      'over raw stellar_snapshot when you need to *explain* state to a human or include ' +
      'context in a generated artifact (PR description, bug report, doc). Output is ' +
      'identical to the overlay\'s "Copy for AI" buttons — both call the same browser-side ' +
      'formatter.',
    inputShape: {
      scope: z
        .enum(['all', 'store', 'http'])
        .describe(
          'all: every store + HTTP traffic in one document. ' +
            'store: a single store with diffs (requires `name`). ' +
            'http: just HTTP traffic with cross-references.',
        ),
      name: z
        .string()
        .min(1)
        .optional()
        .describe('Required when scope=store.'),
    },
    handler: async input => {
      try {
        if (input.scope === 'store') {
          if (!input.name) {
            return errorResult('scope=store requires `name`.');
          }
          const md = await client.formatForAI.store(input.name);
          if (md === null) {
            return errorResult(
              `No store named "${input.name}" is registered.`,
              'Call stellar_describe to list available store names.',
            );
          }
          return textResult(md);
        }
        if (input.scope === 'http') {
          return textResult(await client.formatForAI.http());
        }
        // scope === 'all'
        return textResult(await client.formatForAI.all());
      } catch (err) {
        if (isStellarMcpError(err)) return errorResult(err.message, err.hint);
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  });
}
