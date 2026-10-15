---
title: Getting Started
description: Install and configure Stellar Devtools in an Angular application using NgRx Signal Store.
---

:::note[Pre-1.0]
Stellar is published on npm but hasn't reached 1.0. Expect API changes between minor versions.
:::

## Prerequisites

- Angular 22+
- `@ngrx/signals` 22+

## Install

```bash
npm install @hypertheory-labs/stellar-ng-devtools
```

`@hypertheory-labs/sanitize` is installed automatically as a dependency, and its config helpers are re-exported from the devtools package, so you never need to import it directly.

## Configure the provider

In your `app.config.ts`, add `provideStellar()` to your providers:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideStellar } from '@hypertheory-labs/stellar-ng-devtools';

export const appConfig: ApplicationConfig = {
  providers: [
    provideStellar(),
    // ...your other providers
  ],
};
```

:::caution
Stellar does not switch itself off in production builds. Wherever `provideStellar()` is in your providers, the overlay works and `window.__stellarDevtools` is exposed. Include it only in development configurations.
:::

## Mount the overlay

In your root component template, add the overlay element:

```html
<!-- app.html -->
<router-outlet />
<stellar-overlay />
```

Import `StellarOverlayComponent` in your component:

```typescript
import { RouterOutlet } from '@angular/router';
import { StellarOverlayComponent } from '@hypertheory-labs/stellar-ng-devtools';

@Component({
  imports: [RouterOutlet, StellarOverlayComponent],
  // ...
})
export class App {}
```

## Add devtools to a store

Use `withStellarDevtools` as a feature in any NgRx Signal Store:

```typescript
import { signalStore, withState } from '@ngrx/signals';
import { withStellarDevtools } from '@hypertheory-labs/stellar-ng-devtools';

export const CounterStore = signalStore(
  withState({ count: 0 }),
  withStellarDevtools('CounterStore', {
    description: 'Counter for the home page. Increment, decrement, reset.',
  }),
);
```

The store name (`'CounterStore'`) is the key used in the overlay and in the `window.__stellarDevtools` API.

The `description` says what the store is *for*, which is the one thing an AI assistant can't work out from the code. Leave it out and Stellar logs a dev-mode warning. See [Using Stellar](/guides/using-stellar/) for more on describing stores.

## Sanitizing sensitive state

If your store contains sensitive values, declare a sanitization config:

```typescript
import { signalStore, withState } from '@ngrx/signals';
import { withStellarDevtools, sanitizeConfig } from '@hypertheory-labs/stellar-ng-devtools';

type UserState = { userId: string; email: string; sessionToken: string; role: string };

export const UserStore = signalStore(
  withState<UserState>({ userId: '', email: '', sessionToken: '', role: '' }),
  withStellarDevtools('UserStore', {
    description: 'The signed-in user and their session.',
    sanitize: sanitizeConfig<UserState>({
      email: 'email',          // → jo***@example.com
      sessionToken: 'omitted', // removed entirely from snapshots
    }),
  }),
);
```

Top-level fields whose names exactly match a built-in sensitive name (`password`, `token`, `secret`, `apiKey`, `ssn`, `creditCard`, `debitCard`, `phoneNumber`, `email`, `emailAddress`) get the matching rule automatically, with no config. Nested fields and variations like `sessionToken` or `authToken` need explicit config. See the [sanitize reference](/reference/sanitize/) for every rule and operator.

## Next steps

- **[Using Stellar](/guides/using-stellar/)** — open the overlay, capture recordings, copy state for an AI assistant.
- **[Connecting AI tools](/guides/connecting-ai-tools/)** — wire Claude Code, VS Code (Copilot agent mode), or Codex to read live state directly from your dev app via `@hypertheory-labs/stellar-mcp`.
