# @hypertheory-labs/sanitize

State sanitization library for developer tools — redact, mask, and transform sensitive fields
before they reach any observer: AI assistants, logging pipelines, clipboard exports, or event
sourcing streams.

Standalone. Zero dependencies on Angular, NgRx, or any framework.

**[Full documentation →](https://stellar.hypertheory-labs.dev/explainers/sanitize-design/)**

---

## Installation

```bash
npm install @hypertheory-labs/sanitize
```

---

## Quick start

```ts
import { sanitized } from '@hypertheory-labs/sanitize';

const safeState = sanitized(userState, {
  password:   'masked',       // → "***"
  apiKey:     'hashed',       // → "[~3f9a12b4]" (stable, correlation-preserving)
  creditCard: 'creditCard',   // → last 4 digits
  ssn:        'omitted',      // key removed entirely
  notes:      truncate(80),   // first 80 chars + "…"
});
```

---

## Three tiers of rules

### Tier 1 — Named rules (covers most cases)

String literals with full autocomplete. No imports needed beyond `sanitized`.

| Rule | Output | Use when |
|---|---|---|
| `'omitted'` | *(key removed)* | Field shouldn't appear at all |
| `'redacted'` | `'[redacted]'` | Value hidden, key visible |
| `'masked'` | `'***…'` | Length-approximate masking |
| `'hashed'` | `'[~3f9a12b4]'` | Correlation without exposure |
| `'lastFour'` | last 4 chars | |
| `'email'` | `'jo***@example.com'` | |
| `'creditCard'` `'debitCard'` `'phoneNumber'` | last 4 (aliases) | |
| `'password'` `'apiKey'` `'token'` `'secret'` `'ssn'` | semantic aliases | |

### Tier 2 — Parameterized operators

```ts
import { sanitized, keepFirst, keepLast, truncate, replace } from '@hypertheory-labs/sanitize';

sanitized(state, {
  internalId: keepFirst(6),
  notes:      truncate(80),
})
```

### Arrays

```ts
import { sanitized, arrayOf } from '@hypertheory-labs/sanitize';

sanitized(state, {
  customers: arrayOf({ email: 'omitted', creditCard: 'creditCard' }),
})
```

---

## Typed helper

```ts
import { sanitizeConfig } from '@hypertheory-labs/sanitize';

// Provides SanitizationConfig<T> typing at the call site — identity at runtime
const myConfig = sanitizeConfig<UserState>({
  password: 'masked',
  apiKey: 'hashed',
});
```

---

## License

MIT © Jeffry Gonzalez
