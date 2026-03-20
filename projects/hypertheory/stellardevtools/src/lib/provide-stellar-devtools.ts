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
import { StellarRegistryService } from './stellar-registry.service';

export function provideStellarDevtools(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      const appRef = inject(ApplicationRef);
      const envInjector = inject(EnvironmentInjector);
      const registry = inject(StellarRegistryService);

      (window as any).__stellarDevtools = {
        snapshot: (name?: string) =>
          name ? registry.getStore(name) : registry.getAllStores(),
        history: (name: string, n = 10) => {
          const store = registry.getStore(name);
          return store ? store.history.slice(-n) : null;
        },
        diff: (name: string) => {
          const store = registry.getStore(name);
          if (!store || store.history.length < 2) return null;
          const h = store.history;
          return { from: h[h.length - 2], to: h[h.length - 1] };
        },
      };

      const overlayRef = createComponent(StellarOverlayComponent, {
        environmentInjector: envInjector,
      });
      document.body.appendChild(overlayRef.location.nativeElement);
      appRef.attachView(overlayRef.hostView);
    }),
  ]);
}
