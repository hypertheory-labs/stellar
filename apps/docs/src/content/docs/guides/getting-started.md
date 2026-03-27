---
title: Getting Started
description: Install and configure Stellar Devtools in an Angular application using NgRx Signal Store.
---

:::caution[Pre-release]
Stellar Devtools has not yet published a stable release to npm. Installation instructions will appear here when the first release is available. The content below describes the intended setup.
:::

## Prerequisites

- Angular 21+
- `@ngrx/signals` 21+

## Install

```bash
npm install @hypertheory-labs/stellar-ng-devtools
```

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

## Mount the overlay

In your root component template, add the overlay element:

```html
<!-- app.html -->
<router-outlet />
<stellar-overlay />
```

Import `StellarOverlayComponent` in your component:

```typescript
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
  withStellarDevtools('CounterStore'),
);
```

The store name (`'CounterStore'`) is the key used in the overlay and in the `window.__stellarDevtools` API.

## Sanitizing sensitive state

If your store contains sensitive values, declare a sanitization config:

```typescript
import { signalStore, withState } from '@ngrx/signals';
import { withStellarDevtools, sanitizeConfig } from '@hypertheory-labs/stellar-ng-devtools';

export const UserStore = signalStore(
  withState({ userId: '', email: '', sessionToken: '', role: '' }),
  withStellarDevtools('UserStore', {
    sanitize: sanitizeConfig<UserState>({
      email: 'email',         // keeps domain, redacts local part
      sessionToken: 'omitted', // removed entirely from snapshots
    }),
  }),
);
```

Fields matching the built-in blocklist (`password`, `token`, `secret`, `apiKey`, `ssn`, `creditCard`, etc.) are redacted automatically even without an explicit config. See [The Libraries](/overview/libraries/) for the full list of available sanitization rules.
