import { StellarFeature, StellarFeatureKind } from './stellar-feature';

/**
 * Enables NgRx Signal Store integration for Stellar Devtools.
 *
 * Add to provideStellarDevtools() in your app config:
 *
 *   provideStellarDevtools(withNgrxSignalStoreTools())
 *
 * Then use withStellarDevtools('StoreName') in individual signal stores
 * to register them with the devtools.
 */
export function withNgrxSignalStoreTools(): StellarFeature<StellarFeatureKind.NgrxSignalStoreTools> {
  return {
    kind: StellarFeatureKind.NgrxSignalStoreTools,
    providers: [],
  };
}
