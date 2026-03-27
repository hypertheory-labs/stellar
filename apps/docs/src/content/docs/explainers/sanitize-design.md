---
title: The Sanitize API — Design Decisions
description: Why the sanitize API is shaped the way it is — the three-tier model, named rules vs. parameterized operators, and the principle of legibility at the trust boundary.
---

*Living document. Updated as decisions are made.*

---

## Core Principle: Legibility at the Trust Boundary

`@hypertheory-labs/sanitize` sits at the boundary between developer intent and what gets shared with
AI assistants, logging systems, and export pipelines. The config a developer writes is also
an audit surface — a security reviewer should be able to scan it and immediately verify
coverage without understanding implementation details.

**Legibility is not an aesthetic preference here. It is a security property.**

This means we prioritise readable configs over clever APIs, even when a clever API would
be smaller or more elegant. Every addition to the surface area is weighed against whether
it makes a config harder to scan at a glance.

---

## The Three-Tier Model

The API is layered so that complexity is opt-in. Most developers never leave Tier 1.

### Tier 1 — Named rules (string literals)

```ts
sanitized(state, {
  password:   'password',    // masked
  apiKey:     'apiKey',      // hashed correlation token
  creditCard: 'creditCard',  // last four digits
  ssn:        'omitted',     // key removed entirely
})
```

Zero imports beyond `sanitized` itself. Full autocomplete. Config reads like a
description of intent. This covers the vast majority of real-world cases.

### Tier 2 — Parameterized operators (curried functions)

```ts
import { sanitized, keepFirst, truncate } from '@hypertheory-labs/sanitize';

sanitized(state, {
  internalId: keepFirst(6),
  notes:      truncate(80),
})
```

Used when the finite named vocabulary doesn't fit. Returns a plain `(v: string) => string`
function — no new concepts, just function composition. Can be mixed freely with Tier 1
rules in the same config.

### Tier 3 — Domain factory (custom aliases)

```ts
const { sanitized } = createSanitizer({
  policyNumber: keepFirst(6),   // custom alias → parameterized operator
  claimNumber:  'hashed',       // custom alias → named primitive
  memberId:     'omitted',
});

// Now usable as string literals with full type safety:
sanitized(state, { policyNumber: 'policyNumber', claimNumber: 'claimNumber' })
```

Promotes Tier 2 back to Tier 1 ergonomics for a specific domain. Companies define their
vocabulary once; developers in that domain use string literals and never see curried
functions. *Not yet implemented — see backlog.*

---

## Named Rules: Primitives and Semantic Aliases

Named rules are string literals drawn from the `sanitizationHandlers` map. The `satisfies`
constraint on that map is what makes `SanitizationRule` narrow to a union of literal keys
rather than `string` — this is load-bearing for autocomplete and type safety.

### Primitives — transformation vocabulary

| Rule | Output | Use when |
|---|---|---|
| `'omitted'` | *(key removed)* | Field shouldn't appear in output at all |
| `'redacted'` | `'[redacted]'` | Field should be visible but value hidden |
| `'lastFour'` | last 4 chars | Explicit about the transformation |
| `'firstFour'` | first 4 chars | Explicit about the transformation |
| `'masked'` | `'***…'` (≤8 chars) | Length-approximate masking |
| `'hashed'` | `'[~3f9a12b4]'` | Correlation without exposure |
| `'email'` | `'jo***@example.com'` | Standard email masking |

### Semantic aliases — data-type vocabulary

| Rule | Maps to | Rationale |
|---|---|---|
| `'creditCard'` | `lastFour` | Industry standard: show last 4 |
| `'debitCard'` | `lastFour` | Same convention |
| `'phoneNumber'` | `lastFour` | Common display convention |
| `'ssn'` | `redacted` | Last-4 SSN is common UX but too risky for devtools output |
| `'password'` | `masked` | Length-approximate — presence visible, value hidden |
| `'apiKey'` | `hashed` | Identity correlation useful; value must not appear |
| `'token'` | `hashed` | Same as apiKey |
| `'secret'` | `redacted` | Fully hidden |
| `'emailAddress'` | `email` | Verbose alias for clarity |

### `omitted` vs `redacted` — an important distinction

`omitted` removes the key — the field does not exist in the sanitized output. `redacted` keeps
the key with `'[redacted]'` as the value. For AI accessibility, `redacted` is generally preferable:
the AI can see that a field exists and understand the data shape, even if it cannot see the value.
Use `omitted` only when the field's *existence* would itself be misleading.

### `hashed` and identity correlation

Replacing an API key with `[~3f9a12b4]` preserves the ability to tell whether two stores are using
the same key (same hash) or whether the key changed between snapshots (different hash). This is
genuinely useful for debugging without exposing the value.

---

## Parameterized Operators

For cases the named vocabulary doesn't cover. Each returns a `SanitizationHandler`
(`(v: string) => string`) — a plain function usable anywhere a named rule can be used.

| Operator | Signature | Output |
|---|---|---|
| `keepFirst(n)` | `(n: number) => SanitizationHandler` | First `n` chars |
| `keepLast(n)` | `(n: number) => SanitizationHandler` | Last `n` chars |
| `truncate(n)` | `(n: number) => SanitizationHandler` | First `n` chars + `…` |
| `replace(fn)` | `(fn) => SanitizationHandler` | Custom transform — escape hatch |

`replace` is intentionally the escape hatch, not a first-class pattern. Encourage named
rules and parameterized operators first; `replace` exists for genuinely one-off cases.

---

## `arrayOf()` — Structural Combinator

Arrays require a structural signal: "apply this config to each element." Two options were
considered:

```ts
// Tuple convention — works but opaque
customers: [{ email: 'omitted' }]

// arrayOf() — explicit and readable
customers: arrayOf({ email: 'omitted', creditCard: 'creditCard' })
```

`arrayOf()` was chosen on legibility grounds — it reads like English at the trust boundary
and doesn't require knowing the `[config]` convention.

**Vocabulary borrowed from Zod**: `z.array()` serves the same structural purpose in Zod's
API. There is no further convergence with Zod's API surface — this is the full extent of the
overlap. `arrayOf()` is the end of that road, not the beginning of a descent into schema territory.

Both forms are supported for compatibility, but `arrayOf()` is canonical.

---

## Why `satisfies` on the handler map is load-bearing

```ts
const sanitizationHandlers = {
    omitted: null,
    lastFour: (v: string) => v.slice(-4),
    // ...
} satisfies Record<string, ((v: string) => string) | null>;
```

`SanitizationRule` is derived as `keyof typeof sanitizationHandlers`. If `satisfies` is replaced
with a type annotation (`: Record<string, ...>`), TypeScript widens the type and `keyof` produces
`string` instead of `'omitted' | 'lastFour' | ...`, breaking the entire config type and
eliminating autocomplete. `satisfies` validates the shape while preserving the narrow literal key
types. Do not change this.

---

## Zero-Config Layer: `autoRedactConfig()`

`autoRedactConfig(state)` scans top-level field names against a sensitive-field blocklist and
returns a `SanitizationConfig` automatically. `withStellarDevtools` calls this on every state
snapshot and merges the result with any explicit `sanitize` option:

```ts
{ ...autoRedactConfig(raw), ...options.sanitize }
```

Explicit config always wins. This means you get protection for common field names without
writing any config, and any explicit rules override the defaults.

---

## Open / Backlog

- **`createSanitizer()` factory** — enables domain-specific aliases (Tier 3). Design note:
  values in the custom map can be either a named primitive (string) or a `SanitizationHandler`
  function; the factory promotes them all to string aliases with full type safety.

- **`@hypertheory-labs/sensitive`** — a companion package for runtime-visible tagging of
  sensitive data using tagged classes (Effect-style `_tag` pattern). Sanitization rules
  could be derived automatically from tags — a field of type `SSN` would be redacted
  everywhere without explicit config. Enables cross-cutting policy-based sanitization and,
  eventually, AI-assisted security auditing ("is any value tagged `employee-id` ever
  appearing in a route segment?").
