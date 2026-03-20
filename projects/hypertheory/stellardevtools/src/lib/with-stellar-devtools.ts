import { inject, effect } from '@angular/core';
import { signalStoreFeature, withHooks, getState } from '@ngrx/signals';
import { StellarRegistryService } from './stellar-registry.service';
import { RegisterOptions } from './models';

export function withStellarDevtools(name: string, options: RegisterOptions = {}) {
  return signalStoreFeature(
    withHooks({
      onInit(store) {
        const registry = inject(StellarRegistryService);
        registry.register(name, options);

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
