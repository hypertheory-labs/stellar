# State Sanitization — Design Thinking

> **Status: Historical.** This document captures early design exploration. The implementation
> diverged from the function-call style described here (`redact()`, `omit()`, `keepLast4()`)
> in favour of string literal named rules (`'redacted'`, `'omitted'`, `'lastFour'`). See
> `docs/sanitize-api-design.md` for the current API reference and `docs/notes.md` for why
> the `satisfies`-keyed handler map approach was chosen. The reasoning in this document about
> *why* to sanitize and *what* to consider is still valid — only the proposed API surface
> is superseded.

## The Problem

State in a devtools overlay (and especially in any export/share/WebRTC feature) may
contain sensitive values: SSNs, credit card numbers, API keys, tokens, email addresses,
passwords. We need a way to elide or transform those values **before** they are displayed,
exported, or transmitted — with as little friction as possible for the developer.

---

## Why Not Branded Types Alone?

The instinct to use TypeScript branded types is understandable:

```typescript
type SSN = string & { readonly __brand: 'SSN' };
```

The problem: **brands are compile-time only.** The `__brand` marker does not exist on
the value at runtime. For objects you could attach a Symbol as an actual property, but
SSNs, credit card numbers, and API keys are *primitives* — you cannot hang metadata off
a primitive string without boxing it into `new String()`, which breaks string operations
and equality checks throughout the app.

This is why libraries like Effect use classes — `instanceof` and `._tag` give you
reliable runtime identity. But requiring class-based state is too high a bar for most
Angular signal store usage.

---

## Why Not Zod (or Similar)?

A full validation/parsing schema library would give us runtime type information, but:

- It introduces a heavy peer dependency
- It's solving a much larger problem (parsing/validation) than we need
- Developers would be defining their state shape *twice* — once as a TypeScript interface
  for the store, once as a Zod schema for sanitization

The goal here is narrow: **transform specific fields in a known state shape before output.**
That does not require a parser.

---

## Proposed Approach: Schema Object + Finite Operator Set

A plain object that mirrors the state shape, where each leaf is a sanitization operator.
A generic wrapper provides compile-time checking that keys match the actual state type.

```typescript
const sanitizers = schema<BookState>({
  ssn:        redact(),           // → '***'
  creditCard: keepLast4(),        // → '**** **** **** 1234'
  apiKey:     omit(),             // key is removed from output entirely
  email:      maskEmail(),        // → 'j***@example.com'
  password:   redact(),
});

provideStellarDevtools(
  withNgrxSignalStoreTools(),
  withStateSanitization(sanitizers),
)
```

The `schema<T>()` call is purely a compile-time helper — it returns its argument
unchanged at runtime, but TypeScript enforces that every key matches a key of `T`.
This means:
- Autocomplete on field names
- Type error if a field is renamed in the store and the schema is not updated
- Optionally: a type-level warning if a `Sensitive<>` field has no corresponding operator
  (see "Intent Markers" below)

---

## The Operator Set

The key insight is that this is **not an infinite set.** A small, fixed vocabulary of
operators covers the vast majority of real-world use cases:

| Operator | Output | Use case |
|---|---|---|
| `redact()` | `'***'` | Passwords, tokens, secrets |
| `omit()` | *(key removed)* | API keys, internal fields |
| `maskEmail()` | `'j***@example.com'` | Email addresses |
| `keepLast4()` | `'**** **** **** 1234'` | Credit/debit card numbers |
| `keepFirst(n)` | first n chars + `'...'` | Partial display of long tokens |
| `hash()` | `'a3f9...'` (short hash) | Values where identity matters but not content |
| `truncate(n)` | first n chars | Long strings — less sensitive, just noisy |
| `replace(fn)` | custom | Escape hatch for one-off cases |

Eight operators. A ninth (`deepSanitize()` for recursing into arrays of objects) would
handle collection fields like `books: [{ owner: { ssn: ... } }]`. That probably covers
99% of cases without inventing a new language.

Operators are plain functions that return a descriptor object `{ kind, ...options }`.
The sanitizer pipeline interprets these descriptors — no magic, easy to test, easy to
extend via `replace(fn)` for anything unusual.

---

## Intent Markers (Optional Compile-Time Layer)

Branded types can still serve a purpose as *documentation and enforcement* on the state
interface, without needing runtime behavior:

```typescript
interface BookState {
  title:      string;
  ssn:        Sensitive<string>;              // must have a sanitizer
  creditCard: Sensitive<string, 'last4'>;    // hints at expected operator
  apiKey:     Sensitive<string, 'omit'>;
}
```

A utility type could then enforce that any `Sensitive<>` field in the state *must* have
a corresponding entry in the sanitization schema — a compile-time error if you forget to
cover it. This is opt-in and layered on top; the schema approach works fine without it.

---

## Relationship to the Plugin Architecture

Sanitization ships as `withStateSanitization()` — a first-party plugin for
`provideStellarDevtools()`. The operator functions (`redact`, `omit`, etc.) and the
`schema<T>()` helper would live in a **separate, general-purpose package**
(`@hypertheory/sanitize` or similar) with zero dependency on the devtools. This means:

- The operators are reusable in event sourcing, logging pipelines, or anywhere else
  sensitive state needs to be scrubbed
- `withStateSanitization()` is a thin adapter that wires the sanitize package into the
  devtools pipeline
- Teams that only want the sanitizer (not the devtools) can take it independently

---

## Open Questions

- Should `schema<T>()` enforce coverage of *all* fields, or only fields explicitly
  marked `Sensitive<>`? (Probably the latter — less noisy, more practical.)
- Array handling: `deepSanitize()` as an operator, or a separate `arrayOf(schema(...))`
  combinator for typed collection fields?
- Should operators be composable? e.g. `pipe(keepLast4(), hash())` — probably not needed
  for v1, but the descriptor-based design wouldn't preclude it later.
