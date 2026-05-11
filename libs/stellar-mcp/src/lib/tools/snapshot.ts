import { z } from 'zod';
import type { StellarClient } from '../types';
import { isStellarMcpError } from '../errors';
import { defineTool, errorResult, jsonResult } from './tool-types';

export function snapshotTool(client: StellarClient) {
  return defineTool({
    name: 'stellar_snapshot',
    title: 'Snapshot store state',
    description:
      'Returns the current sanitized state of one or all Stellar-registered stores. ' +
      'Without `name`, returns every store (compact form). With `name`, returns the ' +
      'full StoreEntry including history. Use `instance` to pin a specific lifecycle. ' +
      'State is already sanitized at the source — secrets are scrubbed before this tool ' +
      'sees them.',
    inputShape: {
      name: z
        .string()
        .min(1)
        .optional()
        .describe('Store name. Omit to list every registered store.'),
      instance: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Specific instance id when a store name has multiple lifecycles (route mounts, ' +
            'component-providers scopes). Defaults to the most recent active instance.',
        ),
    },
    handler: async input => {
      try {
        if (!input.name) {
          const all = await client.snapshot();
          return jsonResult(all);
        }
        const entry = await client.snapshotByName(input.name, {
          instance: input.instance,
        });
        if (!entry) {
          return errorResult(
            `No store named "${input.name}" is registered.`,
            'Call stellar_describe to list available store names.',
          );
        }
        return jsonResult(entry);
      } catch (err) {
        if (isStellarMcpError(err)) return errorResult(err.message, err.hint);
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  });
}
