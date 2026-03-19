import {
  ApplicationRef,
  createComponent,
  EnvironmentInjector,
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { StellarOverlayComponent } from './stellar-overlay.component';

export function provideStellarDevtools(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      const appRef = inject(ApplicationRef);
      const envInjector = inject(EnvironmentInjector);
      const overlayRef = createComponent(StellarOverlayComponent, {
        environmentInjector: envInjector,
      });
      document.body.appendChild(overlayRef.location.nativeElement);
      appRef.attachView(overlayRef.hostView);
    }),
  ]);
}
