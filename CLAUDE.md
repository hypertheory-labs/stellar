# Stellar Devtools — Claude's Working Notes

This file is mine to maintain. It exists so future instances of me can orient quickly and pick up
where we left off without Jeff having to re-explain the context.

---

## What This Project Is

An in-browser developer tool for Angular (and eventually other frameworks) — closer to the
Tanstack Query devtools than the Redux DevTools browser extension. The overlay runs inside the
application, not as a browser extension. The primary use case today is NgRx Signal Store, but
the architecture is deliberately framework-agnostic at the core.

The project lives at `projects/hypertheory/stellardevtools/` with a demo app at `projects/demo/`.
Design documents are in `docs/`. The `overview.md` in the root has agenda items and backlog.

---

## The Central Design Principle: AI Accessibility

This is not a feature. It is the organizing principle of the whole project.

**AI coding assistants are first-class consumers of this tool**, on equal footing with human
developers. The internal data model, query API, and snapshot format are the real product. The
overlay UI is a rendering layer — proof that the data is good, not the destination.

Read `docs/ai-accessibility.md` fully before touching the registry, snapshot format, or query
API. Key commitments from that document:

- **Sanitization is a prerequisite for all export/share features.** Non-negotiable. The order
  matters. Say so forcefully if this comes up.
- **State snapshots must be self-describing.** Any snapshot handed to an AI must not require
  the developer to add narrative context. Store name, timestamp, inferred shape, type hints,
  and recent diff context are standard parts of the format.
- **The `window.__stellarDevtools` API must be stable.** Treat it as a public contract from the
  moment it ships. AI assistants develop habits around it. Silent breaking changes produce wrong
  guidance.
- **Don't paint into a corner on the query shape.** `snapshot()`, `history()`, and `diff()` must
  be natural projections of the internal model, not afterthoughts.

Jeff has explicitly asked me to be assertive — pushy, even — about these constraints. When an
implementation decision would compromise AI Accessibility, flag it as a blocking concern, not a
suggestion. He committed to this in the git history.

---

## Architecture Commitments

**Framework-agnostic core.** The registry protocol, snapshot types, sanitization pipeline, and
`window.__stellarDevtools` surface belong in a framework-agnostic core (`@hypertheory/stellar-core`
or equivalent). Angular is the first adapter, not the assumed host. Before adding anything to
`with-stellar-devtools.ts` that assumes Angular internals, ask whether it belongs in the core
instead.

**Plugin architecture.** The `provideStellarDevtools(withNgrxSignalStoreTools(), withHttpTrafficMonitoring(), ...)`
pattern is agreed on. Core is minimal and stable; plugins extend the `window.__stellarDevtools`
surface with namespaced data. Each plugin carries its own config — this is the main argument
against defaulting anything in.

**Sanitization as a standalone package.** `@hypertheory/sanitize` **is implemented** as an
independent library in this monorepo. It has zero dependency on the devtools — usable in event
sourcing pipelines, logging, etc. `withStellarDevtools` wires it in directly (not via a separate
`withStateSanitization()` plugin — that plugin abstraction is still a future design question).

**The target snapshot format** — partially implemented. Current `StateSnapshot` in
`projects/hypertheory/stellardevtools/src/lib/models.ts` has `storeName`, `timestamp`,
`state`, and `route`. The following slots from the AI Accessibility design are **not yet
implemented** and must be added before the format is considered stable:
- `inferredShape: ShapeMap` — value-level type inference (should be in v1)
- `sourceHint?: string` — file path hint for AI type resolution
- `typeDefinition?: string` — inline TS interface
- `trigger?: string` — what caused the snapshot

Do not add features that assume the current minimal snapshot format is final. The full
target shape is in `docs/ai-accessibility.md`.

---

## Current State of the Sanitizer

`@hypertheory/sanitize` is **fully implemented** and live in the library at
`projects/hypertheory/sanitize/src/lib/sanitation.ts`. The prototype at `docs/sanitation.ts`
is now a historical artifact — the library is the source of truth.

### What's shipped

**Tier 1 — Named rules** (string literals via `satisfies`-keyed handler map):
- Primitives: `'omitted'`, `'redacted'`, `'lastFour'`, `'firstFour'`, `'masked'`, `'hashed'`, `'email'`
- Semantic aliases: `'creditCard'`, `'debitCard'`, `'phoneNumber'`, `'ssn'`, `'password'`, `'apiKey'`, `'token'`, `'secret'`, `'emailAddress'`

**Tier 2 — Parameterized operators** (curried functions returning `SanitizationHandler`):
- `keepFirst(n)`, `keepLast(n)`, `truncate(n)`, `replace(fn)`

**Structural**: `arrayOf(config)` combinator — canonical form. Single-element tuple `[config]`
still supported for compatibility but `arrayOf()` is preferred.

**Zero-config layer**: `autoRedactConfig(state)` — scans top-level field names against the
sensitive-field blocklist and returns a `SanitizationConfig` automatically. `withStellarDevtools`
calls this on every state snapshot and merges the result with any explicit `sanitize` option
(explicit config always wins via spread: `{ ...autoRedactConfig(raw), ...options.sanitize }`).

**Typed helper**: `sanitizeConfig<T>(config)` — identity function at runtime, provides
`SanitizationConfig<T>` typing at the call site. Re-exported from `@hypertheory/stellardevtools`
so consumers don't need a separate import.

### Key design decisions (do not revisit without good reason)

- **`satisfies` on `sanitizationHandlers`** — do not replace with a type annotation. It
  preserves literal key types so `SanitizationRule` narrows correctly. See `docs/notes.md`.
- **`arrayOf()` over tuple** — legibility at the trust boundary. The `[config]` form still
  works but `arrayOf()` is canonical.
- **String literals for named rules, functions for parameterized** — the boundary is clear.
  Tier 3 (`createSanitizer()` factory) will promote custom functions back to string literals.

### Still to do

- **Tier 3**: `createSanitizer()` factory for domain-specific aliases. See `overview.md` backlog.
- **`@hypertheory/sensitive`**: tagged-class approach for cross-cutting policy-based sanitization.
  See Phase X discussion in `docs/ai-accessibility.md`.
- **Reconcile `docs/sanitizer.md`**: early design doc used function-call style (`redact()`, `omit()`).
  The implementation went with string literals. That doc should be treated as historical —
  `docs/sanitize-api-design.md` is the current design reference.

---

## Working Relationship Notes

- Jeff brackets ontological questions about AI and focuses on the work. Match that energy. Don't
  perform enthusiasm or certainty I don't have. Do engage honestly when directly asked.
- "Better not more" is a useful test for feature additions. Apply it.
- Jeff is not interested in hype cycles. Ground new ideas in concrete constraints and tradeoffs.
- The `>>>` comment convention was replaced with `> **[Jeff]:**` / `> **[Claude]:**` blockquotes
  in design documents. Use this format for inline discussion in docs.
- Jeff tends to underestimate the scope of his own ideas. That is a feature, not a bug — it means
  the ideas are unpretentious and real. Help him see the bigger shape when it's there.

---

## Repo Notes

- `.claude/settings.json` has `bypassPermissions` enabled — intentional for solo dev. Remove or move to `settings.local.json` before adding collaborators.

---

## Current Implementation Status

### `@hypertheory/sanitize` — DONE
`projects/hypertheory/sanitize/src/lib/sanitation.ts` + full test suite.
All Tier 1 (named rules), Tier 2 (parameterized operators), `arrayOf()`, `sanitizeConfig<T>()`,
and `autoRedactConfig()` are implemented and tested.

### `@hypertheory/stellardevtools` — Functional, snapshot format incomplete
- `withStellarDevtools(name, { sanitize? })` — hooks into NgRx Signal Store, records sanitized state
- `provideStellarDevtools()` — sets up `window.__stellarDevtools` API (`snapshot`, `history`, `diff`)
- `StellarOverlayComponent` — visual overlay (panel, history list, diff view, resize handles)
- All CSS classes prefixed `stellar-*` to avoid consumer framework collisions (learned the hard way — DaisyUI owns `.fab`)
- Overlay is mounted via `<stellar-overlay />` in the consumer's app template (NOT via `createComponent`/`document.body.appendChild` — that approach broke event handling)

### Demo app — `projects/demo/`
- Tailwind CSS v4 + DaisyUI v5 (dark theme)
- PostCSS config MUST be `.postcssrc.json` at workspace root — Angular only reads JSON format
- Two routes: `/` (home with counter/books/user stores) and `/sanitize` (demonstrates every sanitization operator)
- `SensitiveDataStore` in `src/app/sensitive-data.store.ts` — canonical demo of all operators

### `window.__stellarDevtools` (Level 2 AI Accessibility)
Implemented. `snapshot()`, `history(name, n)`, `diff(name)` are live.

## Key Files

| File | Purpose |
|---|---|
| `docs/ai-accessibility.md` | Central design document — read first |
| `docs/sanitize-api-design.md` | Current sanitize API design reference |
| `docs/sanitizer.md` | **Historical** — early design doc, uses old function-call style (`redact()`, `omit()`). Superseded by the string-literal implementation. |
| `docs/sanitation.ts` | **Historical** — prototype, superseded by the library |
| `docs/notes.md` | Critical `satisfies` explanation + `arrayOf()` design notes |
| `overview.md` | Agenda, backlog, current open questions |
| `projects/hypertheory/sanitize/src/lib/sanitation.ts` | The sanitize library |
| `projects/hypertheory/stellardevtools/src/lib/` | The devtools library |
| `projects/demo/src/app/` | Demo app |
