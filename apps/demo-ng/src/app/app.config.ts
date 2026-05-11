import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withExperimentalAutoCleanupInjectors } from '@angular/router';
import {
  provideStellar,
  withNgrxSignalStoreTools,
  withHttpTrafficMonitoring,
  withStellarBridge,
} from '@hypertheory-labs/stellar-ng-devtools';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withExperimentalAutoCleanupInjectors disposes route injectors when their
    // routes are deactivated, which is what makes route-scoped store destroy
    // hooks fire. Required for the /lifecycle showcase to demonstrate
    // mount/unmount lifecycle truthfully — and a permanent regression test
    // against the inject-in-onDestroy class of bugs (NG0203).
    provideRouter(routes, withExperimentalAutoCleanupInjectors()),
    provideStellar(
      withNgrxSignalStoreTools(),
      withHttpTrafficMonitoring(),
      // Connects the running app to a stellar-mcp server over WebSocket so AI
      // agents can query state without launching a browser. Defaults to
      // ws://localhost:4280/__stellar — match it to the --port the MCP CLI
      // is started with. Silently retries if the server isn't running yet.
      withStellarBridge(),
    ),
  ],
};
