# @hypertheory-labs/stellar-ng-devtools

In-browser developer overlay for Angular applications using NgRx Signal Store.

- **State inspection** — see current state and recent diffs for every registered store
- **HTTP monitoring** — fetch interceptor with causal linking to the state changes it produced
- **Recording sessions** — capture a bounded interaction as a directed causal graph; export or view in the timeline
- **AI-accessible snapshots** — `window.__stellarDevtools` API and "Copy for AI" export designed for AI coding assistants as first-class consumers
- **MCP bridge** — `withStellarBridge()` opens a WebSocket to a `stellar-mcp` server so AI agents can query live state without a browser automation harness
- **Sanitization built in** — sensitive fields are redacted before they reach any surface; powered by `@hypertheory-labs/sanitize`

**[Full documentation →](https://stellar.hypertheory-labs.dev)**
**[Live demo →](https://stellar-demo.hypertheory-labs.dev)**

---

## Installation

```bash
npm install @hypertheory-labs/stellar-ng-devtools @hypertheory-labs/sanitize
```

Peer dependencies: Angular 21+, NgRx Signals 21+.

---

## Quick start

**1. Add `provideStellar()` to your app config:**

```ts
// app.config.ts
import {
  provideStellar,
  withHttpTrafficMonitoring,
  withStellarBridge,
} from '@hypertheory-labs/stellar-ng-devtools';

export const appConfig: ApplicationConfig = {
  providers: [
    // ...
    provideStellar(
      withHttpTrafficMonitoring(),
      // Optional — only add when you want AI agents to query live state via
      // @hypertheory-labs/stellar-mcp. Defaults to ws://localhost:4280/__stellar.
      withStellarBridge(),
    ),
  ],
};
```

**2. Register your stores with `withStellarDevtools()`:**

```ts
// user.store.ts
import { withStellarDevtools } from '@hypertheory-labs/stellar-ng-devtools';
import { sanitizeConfig } from '@hypertheory-labs/sanitize';

export const UserStore = signalStore(
  withState<UserState>({ ... }),
  withStellarDevtools('UserStore', {
    description: 'Authenticated user identity and session state.',
    sourceHint: 'src/app/user.store.ts',
    sanitize: sanitizeConfig<UserState>({
      sessionToken: 'omitted',
      apiKey: 'hashed',
    }),
  })
);
```

**3. Add the overlay to your app template:**

```html
<!-- app.component.html -->
<router-outlet />
<stellar-overlay />
```

The overlay appears as a floating button in the corner. Click it to open the devtools panel.

---

## `window.__stellarDevtools`

Available in development mode in the browser console:

```ts
window.__stellarDevtools.snapshot()           // all stores, current sanitized state
window.__stellarDevtools.snapshot('UserStore') // specific store
window.__stellarDevtools.history('UserStore', 10) // last N state snapshots
window.__stellarDevtools.diff('UserStore')     // most recent diff
window.__stellarDevtools.http()               // all captured HTTP events
window.__stellarDevtools.describe()           // manifest of all registered stores

window.__stellarDevtools.record.start('my session')
window.__stellarDevtools.record.stop()
window.__stellarDevtools.record.stopAndDownload()
```

---

## Peer dependencies

| Package | Version |
|---|---|
| `@angular/core` | ^21.2.0 |
| `@angular/common` | ^21.2.0 |
| `@angular/platform-browser` | ^21.2.0 |
| `@ngrx/signals` | ^21.0.0 |
| `@hypertheory-labs/sanitize` | ^0.0.1 |

---

## Stability

Pre-1.0. The shape of `window.__stellarDevtools` and the data passed to AI
consumers (`describe()`, `RecordingSession`, etc.) may change between minor
versions until a 1.0 release commits to a stable contract. AI assistants
consuming this surface should re-read `describe()` rather than cache
assumptions. Breaking changes within a minor are documented in TDRs under
[explainers](https://stellar.hypertheory-labs.dev).

---

## License

MIT © Jeffry Gonzalez
