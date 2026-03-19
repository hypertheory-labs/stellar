import { inject, effect } from '@angular/core';
import { signalStoreFeature, withHooks, getState } from '@ngrx/signals';
import { StellarRegistryService } from './stellar-registry.service';

export function withStellarDevtools(name: string) {
  return signalStoreFeature(
    withHooks({
      onInit(store) {
        const registry = inject(StellarRegistryService);
        registry.register(name);

        effect(() => {
          const state = getState(store) as Record<string, unknown>;
          registry.recordState(name, state);
        });
      },
      onDestroy() {
        const registry = inject(StellarRegistryService);
        registry.unregister(name);
      },
    }),
  );
}
