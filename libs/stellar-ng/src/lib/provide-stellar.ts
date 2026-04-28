import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { StellarRegistryService } from './stellar-registry.service';
import { SnapshotWriterService } from './snapshot-writer.service';
import { RecordingService } from './recording.service';
import { AnyStellarFeature } from './stellar-feature';
import { RecordingSession, StateSnapshot, StoreEntry, StoreInstance } from './models';
import {
  DescribeResult,
  DiffResult,
  FormatForAIApi,
  InstanceQuery,
  StellarDevtoolsApi,
} from './stellar-devtools-api';
import {
  formatAllStoresForAI,
  formatHttpEventsForAI,
  formatRecordingForAI,
  formatStoreForAI,
} from './format-for-ai';
import { buildDescribeResult } from './build-describe';

export function provideStellar(...features: AnyStellarFeature[]): EnvironmentProviders {
  const featureProviders = features.flatMap(f => f.providers);

  return makeEnvironmentProviders([
    ...featureProviders,
    provideEnvironmentInitializer(() => {
      const registry = inject(StellarRegistryService);
      const writer = inject(SnapshotWriterService);
      const recorder = inject(RecordingService);

      const appStart = Date.now();

      // Resolve the instance to operate on for a name + optional query. Default
      // is "latest active, falling back to latest destroyed" so an AI consumer
      // asking about a known store name always gets a useful answer instead of
      // null. Explicit { instance: id } selects a specific instance.
      const resolveInstance = (name: string, q?: InstanceQuery): StoreInstance | undefined => {
        if (q?.instance) {
          const inst = registry.getInstance(q.instance);
          return inst && inst.name === name ? inst : undefined;
        }
        const all = registry.getInstancesByName(name);
        if (all.length === 0) return undefined;
        const active = all.slice().reverse().find(i => i.destroyedAt === undefined);
        return active ?? all[all.length - 1];
      };

      const describe = (): DescribeResult =>
        buildDescribeResult(registry, recorder, appStart);

      function snapshot(): StoreEntry[];
      function snapshot(name: string): StoreEntry | null;
      function snapshot(name: string, query: InstanceQuery): StoreEntry | StoreInstance | null;
      function snapshot(name?: string, query?: InstanceQuery) {
        if (!name) return registry.getAllStores();
        if (query?.instance) return resolveInstance(name, query) ?? null;
        return registry.getStore(name) ?? null;
      }

      const history = (
        name: string,
        n = 10,
        query?: InstanceQuery,
      ): StateSnapshot[] | null => {
        const inst = resolveInstance(name, query);
        return inst ? inst.history.slice(-n) : null;
      };

      const diff = (name: string, query?: InstanceQuery): DiffResult | null => {
        // Cross-instance diffs are nonsense — state isn't continuous across
        // re-mounts. diff() always operates within a single instance.
        const inst = resolveInstance(name, query);
        if (!inst || inst.history.length < 2) return null;
        const h = inst.history;
        return { from: h[h.length - 2], to: h[h.length - 1] };
      };

      const formatForAI: FormatForAIApi = {
        store: (name: string) => {
          const entry = registry.getStore(name);
          if (!entry) return null;
          return formatStoreForAI(entry, registry.getHttpEvents());
        },
        all: () => formatAllStoresForAI(registry.getAllStores(), registry.getHttpEvents()),
        http: () => formatHttpEventsForAI(registry.getHttpEvents(), registry.getAllStores()),
        recording: (session?: RecordingSession) => {
          const target = session ?? recorder.lastSession();
          return target ? formatRecordingForAI(target) : null;
        },
      };

      const api: StellarDevtoolsApi = {
        describe,
        snapshot,
        history,
        diff,
        save: () => writer.save(registry.getAllStores()),
        http: () => registry.getHttpEvents(),
        record: {
          start: (name?: string) => recorder.start(name),
          stop: () => recorder.stop(),
          stopAndDownload: () => {
            const session = recorder.stop();
            if (session) recorder.download(session);
            return session;
          },
        },
        formatForAI,
      };

      window.__stellarDevtools = api;
    }),
  ]);
}
