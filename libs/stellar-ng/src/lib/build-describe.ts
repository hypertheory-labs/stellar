import type { DescribeResult } from './stellar-devtools-api';
import type { StellarRegistryService } from './stellar-registry.service';
import type { RecordingService } from './recording.service';

/**
 * Builds a `DescribeResult` from the live registry + recording state. Extracted
 * so both `provideStellar(...)` (which mounts it on `window.__stellarDevtools`)
 * and `withStellarBridge(...)` (which pushes it over the bridge protocol) get
 * the same shape from a single implementation.
 *
 * `appStart` is the wall-clock origin used to report relative timestamps. Both
 * call sites must use the same origin so an MCP consumer comparing timestamps
 * across a `describe` push and an inline `register`/`destroy` event sees a
 * consistent timeline.
 */
export function buildDescribeResult(
  registry: StellarRegistryService,
  recorder: RecordingService,
  appStart: number,
): DescribeResult {
  return {
    version: '1.1',
    stores: registry.getAllStores().map(s => {
      const totalSnapshots = s.instances.reduce((sum, i) => sum + i.history.length, 0);
      return {
        name: s.name,
        description: s.description ?? null,
        snapshotCount: totalSnapshots,
        registeredAt: s.registeredAt - appStart,
        destroyedAt: s.destroyedAt !== undefined ? s.destroyedAt - appStart : null,
        sourceHint: s.sourceHint ?? null,
        instances: s.instances.map(i => ({
          id: i.id,
          registeredAt: i.registeredAt - appStart,
          destroyedAt: i.destroyedAt !== undefined ? i.destroyedAt - appStart : null,
          snapshotCount: i.history.length,
        })),
      };
    }),
    api: ['snapshot', 'history', 'diff', 'http', 'record', 'describe', 'formatForAI'],
    recordingActive: recorder.isRecording(),
    caveat:
      'Lazy-loaded routes may register additional stores. Navigate to all relevant ' +
      'routes before calling describe() for full coverage. A store name may have ' +
      'multiple instances over a session — each route mount or component-providers ' +
      'scope creates a new one. snapshot()/history()/diff() default to the most ' +
      'recent instance; pass { instance: id } to select a specific one.',
  };
}
