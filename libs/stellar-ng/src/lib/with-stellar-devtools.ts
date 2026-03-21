import { inject, effect } from '@angular/core';
import { signalStoreFeature, withHooks, getState } from '@ngrx/signals';
import { StellarRegistryService } from './stellar-registry.service';
import { RegisterOptions } from './models';
import { SanitizationConfig, sanitized as applySanitized, autoRedactConfig } from '@hypertheory/sanitize';

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
          const merged = { ...autoRedactConfig(raw), ...options.sanitize };
          const state = Object.keys(merged).length > 0
            ? applySanitized(raw, merged as any)
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
