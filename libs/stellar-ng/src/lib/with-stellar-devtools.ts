import { inject, effect } from '@angular/core';
import {
  withHooks,
  getState,
  type SignalStoreFeature,
  type EmptyFeatureResult,
} from '@ngrx/signals';
import { StellarRegistryService } from './stellar-registry.service';
import { RegisterOptions } from './models';
import { SanitizationConfig, sanitized as applySanitized, autoRedactConfig } from '@hypertheory-labs/sanitize';

interface StellarDevtoolsOptions extends RegisterOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sanitize?: SanitizationConfig<any>;
}

/**
 * Returns SignalStoreFeature<EmptyFeatureResult, EmptyFeatureResult> so it is
 * assignable at any position in a signalStore() chain.
 *
 * TypeScript cannot infer a bound Input type parameter at call sites when no
 * argument uses Input. Returning SignalStoreFeature<EmptyFeatureResult, Empty>
 * works because by function contravariance, signalStore needs
 * InnerSignalStore<F1['state'], ...> to be assignable to InnerSignalStore<{}, {}>,
 * which holds: every state type is assignable to {} and WritableStateSource<F1>
 * is assignable to WritableStateSource<{}> = { [STATE_SOURCE]: {} }.
 */
export function withStellarDevtools(
  name: string,
  options: StellarDevtoolsOptions = {},
): SignalStoreFeature<EmptyFeatureResult, EmptyFeatureResult> {
  return withHooks((store) => {
    // Capture both the registry reference and the instance id at construction
    // time. The injection context is alive here; it is *not* alive in
    // onDestroy when Angular tears down the owning injector (router-scoped
    // stores under withExperimentalAutoCleanupInjectors, component providers,
    // etc.). Reaching for inject() in onDestroy throws NG0203.
    const registry = inject(StellarRegistryService);
    let instanceId: string | null = null;

    return {
      onInit() {
        instanceId = registry.register(name, options);
        registry.registerRawReader(instanceId, () => getState(store) as Record<string, unknown>);

        effect(() => {
          const raw = getState(store) as Record<string, unknown>;
          const merged = { ...autoRedactConfig(raw), ...options.sanitize };
          const state = Object.keys(merged).length > 0
            ? applySanitized(raw, merged as any)
            : raw;
          if (instanceId) registry.recordState(instanceId, state);
        });
      },
      onDestroy() {
        if (instanceId) registry.unregister(instanceId);
      },
    };
  }) as SignalStoreFeature<EmptyFeatureResult, EmptyFeatureResult>;
}
