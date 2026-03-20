export { withStellarDevtools } from './lib/with-stellar-devtools';
export { provideStellarDevtools } from './lib/provide-stellar-devtools';
export { StellarOverlayComponent } from './lib/stellar-overlay.component';
export type { StoreEntry, StateSnapshot, RegisterOptions, ShapeMap, ShapeValue } from './lib/models';

// Re-exported from @hypertheory/sanitize for convenience — consumers of
// stellardevtools don't need a separate import just to type their sanitize config.
export { sanitizeConfig } from '@hypertheory/sanitize';
export type { SanitizationConfig, SanitizationHandler } from '@hypertheory/sanitize';
