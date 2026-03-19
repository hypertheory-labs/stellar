import {
  ApplicationRef,
  createComponent,
  EnvironmentInjector,
  EnvironmentProviders,
  inject,
  ENVIRONMENT_INITIALIZER,
  makeEnvironmentProviders,
} from '@angular/core';
import { StellarOverlayComponent } from './stellar-overlay.component';

export function provideStellarDevtools(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        const appRef = inject(ApplicationRef);
        const envInjector = inject(EnvironmentInjector);
        const overlayRef = createComponent(StellarOverlayComponent, {
          environmentInjector: envInjector,
        });
        document.body.appendChild(overlayRef.location.nativeElement);
        appRef.attachView(overlayRef.hostView);
      },
    },
  ]);
}
