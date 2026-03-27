export { withStellarDevtools } from './lib/with-stellar-devtools';
export { withNgrxSignalStoreTools } from './lib/with-ngrx-signal-store-tools';
export { withHttpTrafficMonitoring } from './lib/with-http-traffic-monitoring';
export type { HttpTrafficMonitoringOptions } from './lib/with-http-traffic-monitoring';
export type { StellarFeature, AnyStellarFeature, StellarFeatureKind } from './lib/stellar-feature';
export { provideStellar } from './lib/provide-stellar';
export { StellarOverlayComponent } from './lib/stellar-overlay.component';
export type { StoreEntry, StateSnapshot, HttpEvent, RegisterOptions, ShapeMap, ShapeValue, RecordingSession, RecordingNode, RecordingEdge, RecordingNodeType } from './lib/models';
export { RecordingService } from './lib/recording.service';

// Re-exported from @hypertheory-labs/sanitize for convenience — consumers of
// stellardevtools don't need a separate import just to type their sanitize config.
export { sanitizeConfig } from '@hypertheory-labs/sanitize';
export type { SanitizationConfig, SanitizationHandler } from '@hypertheory-labs/sanitize';
