import { inject, effect } from '@angular/core';
import { signalStoreFeature, withHooks, getState } from '@ngrx/signals';
import { StellarRegistryService } from './stellar-registry.service';
import { RegisterOptions } from './models';
import { SanitizationConfig, sanitized as applySanitized } from '@hypertheory/sanitize';

interface StellarDevtoolsOptions extends RegisterOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sanitize?: SanitizationConfig<any>;
}

export function withStellarDevtools(name: string, options: StellarDevtoolsOptions = {}) {
  return signalStoreFeature(
    withHooks({
      onInit(store) {
        const registry = inject(StellarRegistryService);
        registry.register(name, options);

        effect(() => {
          const raw = getState(store) as Record<string, unknown>;
          const state = options.sanitize
            ? applySanitized(raw, options.sanitize)
            : raw;
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
