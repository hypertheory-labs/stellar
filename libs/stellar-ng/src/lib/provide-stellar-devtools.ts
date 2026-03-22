import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { StellarRegistryService } from './stellar-registry.service';
import { AnyStellarFeature } from './stellar-feature';

export function provideStellarDevtools(...features: AnyStellarFeature[]): EnvironmentProviders {
  const featureProviders = features.flatMap(f => f.providers);

  return makeEnvironmentProviders([
    ...featureProviders,
    provideEnvironmentInitializer(() => {
      const registry = inject(StellarRegistryService);

      (window as any).__stellarDevtools = {
        snapshot: (name?: string) =>
          name ? registry.getStore(name) : registry.getAllStores(),
        history: (name: string, n = 10) => {
          const store = registry.getStore(name);
          return store ? store.history.slice(-n) : null;
        },
        diff: (name: string) => {
          const store = registry.getStore(name);
          if (!store || store.history.length < 2) return null;
          const h = store.history;
          return { from: h[h.length - 2], to: h[h.length - 1] };
        },
      };
    }),
  ]);
}
