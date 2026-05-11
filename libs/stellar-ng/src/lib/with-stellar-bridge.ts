import { inject, provideEnvironmentInitializer } from '@angular/core';
import { StellarBridgeService, StellarBridgeOptions } from './stellar-bridge.service';
import { StellarFeature, StellarFeatureKind } from './stellar-feature';

export type { StellarBridgeOptions } from './stellar-bridge.service';

/**
 * Connects the running app to a `stellar-mcp` server over WebSocket. State
 * pushes from app → server on every registry change; the server fans state
 * out to MCP tool calls without ever touching a browser. Mutations
 * (`record.start`, `save`, etc.) and AI-formatter calls round-trip via RPC.
 *
 * Add this to `provideStellar(...)` to make the app discoverable to AI
 * agents without launching Chrome / Playwright. The MCP server defaults to
 * binding `ws://localhost:4280/__stellar`; the bridge connects there unless
 * `options.url` overrides.
 *
 * Order does not matter relative to other `with*` features — the bridge runs
 * as an independent observer of the registry. Sanitization runs upstream in
 * `withStellarDevtools(...)`, so the bridge only ever sees sanitized state.
 *
 * @example
 *   provideStellar(
 *     withNgrxSignalStoreTools(),
 *     withHttpTrafficMonitoring(),
 *     withStellarBridge(),
 *   )
 *
 *   // custom port (when running multiple agents or dodging port conflicts)
 *   withStellarBridge({ url: 'ws://localhost:4281/__stellar' })
 */
export function withStellarBridge(
  options: StellarBridgeOptions = {},
): StellarFeature<StellarFeatureKind.Bridge> {
  return {
    kind: StellarFeatureKind.Bridge,
    providers: [
      provideEnvironmentInitializer(() => {
        const bridge = inject(StellarBridgeService);
        bridge.start(options);
      }),
    ],
  };
}
