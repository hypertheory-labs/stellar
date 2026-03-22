import { EnvironmentProviders, Provider } from '@angular/core';

export enum StellarFeatureKind {
  NgrxSignalStoreTools = 'NgrxSignalStoreTools',
}

export interface StellarFeature<K extends StellarFeatureKind> {
  kind: K;
  providers: (EnvironmentProviders | Provider)[];
}

export type AnyStellarFeature = StellarFeature<StellarFeatureKind>;
