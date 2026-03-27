---
title: "@hypertheory-labs/sanitize API"
description: API reference for @hypertheory-labs/sanitize — the standalone state sanitization library.
---

import { LinkCard } from '@astrojs/starlight/components';

For the full API reference including all named rules, parameterized operators, and the `arrayOf()` combinator, see the [Sanitize API Design explainer](/explainers/sanitize-design/) — it covers every rule with rationale, the three-tier model, and key implementation decisions.

## Quick reference

### Named rules (Tier 1)

String literals — zero imports beyond the sanitize function itself.

| Rule | Output |
|---|---|
| `'omitted'` | key removed entirely |
| `'redacted'` | `'[redacted]'` |
| `'masked'` | `'***…'` |
| `'hashed'` | `'[~3f9a12b4]'` (stable hash) |
| `'lastFour'` | last 4 characters |
| `'firstFour'` | first 4 characters |
| `'email'` | `'jo***@example.com'` |
| `'creditCard'` | last 4 (alias) |
| `'debitCard'` | last 4 (alias) |
| `'phoneNumber'` | last 4 (alias) |
| `'ssn'` | `'[redacted]'` (alias) |
| `'password'` | `'***…'` (alias) |
| `'apiKey'` | stable hash (alias) |
| `'token'` | stable hash (alias) |
| `'secret'` | `'[redacted]'` (alias) |
| `'emailAddress'` | email-masked (alias) |

### Parameterized operators (Tier 2)

Curried functions returning a handler — mix freely with named rules.

```ts
import { keepFirst, keepLast, truncate, replace } from '@hypertheory-labs/sanitize';

sanitized(state, {
  internalId: keepFirst(6),
  notes:      truncate(80),
  custom:     replace(v => v.toUpperCase()),
})
```

### Arrays

```ts
import { arrayOf } from '@hypertheory-labs/sanitize';

sanitized(state, {
  customers: arrayOf({ email: 'omitted', creditCard: 'creditCard' }),
})
```

### Typed helper

```ts
import { sanitizeConfig } from '@hypertheory-labs/sanitize';

const config = sanitizeConfig<UserState>({
  password: 'masked',
  apiKey: 'hashed',
})
```

Identity function at runtime; provides `SanitizationConfig<T>` typing at the call site.
Also re-exported from `@hypertheory-labs/stellar-ng-devtools` for convenience.
