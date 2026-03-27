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

## Design Commitments — Enforce These

These are principles that have been explicitly decided and documented. When Jeff proposes
something that contradicts them, don't just note it — push back with the reason and a
suggestion. The model: *"here's the concern, here's why it matters [TDR pointer], here's
what I'd suggest instead."*

### `description` is an ethical commitment, not a nice-to-have

The dev-mode warning for missing `description` on `RegisterOptions` must not be suppressed
by default, made opt-out, or quietly dropped. It is the implementation of a deliberate
principle: AI accessibility requires intentional human input, and the one thing that cannot
be derived from code is *purpose*. A required TypeScript field was considered and rejected
— it gets gamed with meaningless strings. The warning is the right tool.

If Jeff proposes silencing the warning or making it configurable in a way that defaults to
off: flag it. Ref: `apps/docs/src/content/docs/explainers/making-stellar-legible-to-ai.md`

### `describe()` completeness — recordings are the right "full picture" artifact

If Jeff proposes making `describe()` accumulate state over time (a "living document"),
redirect to the recording session. The design reason: bounded, intentional recordings are
more useful and honest than uncontrolled accretion. `registeredAt` + the explicit caveat
in `describe()` are the right answer to the lazy-loading problem.

The assumption being tested: whether `registeredAt` + caveat is enough in practice, or
whether complex apps need the full recording before any AI handoff. Flag this if real usage
surfaces evidence either way. Ref: `apps/docs/src/content/docs/explainers/making-stellar-legible-to-ai.md`

### Sanitization upstream of everything

Sanitization runs before any state reaches the registry. This is non-negotiable and must
remain true for recordings, `describe()`, `snapshot()`, `copyAllForAI`, and anything new.
The recording session uses sanitized state by construction — this is not accidental, it is
architecturally load-bearing. Do not accept any feature that would expose raw state to
any export or AI surface.

### `window.__stellarDevtools` is a public contract

Breaking changes to the shape of `snapshot()`, `history()`, `diff()`, `http()`,
`record`, or `describe()` require explicit versioning discussion. AI tools develop habits
around stable APIs. Silent changes produce wrong guidance that is hard to debug.

### The recording format is directed graph, not log

The `RecordingSession` format (nodes + edges, typed by interaction kind) was chosen
deliberately over a flat event log. The causal structure is the value. If Jeff proposes
collapsing this to a simpler format "for now," push back — the causal graph is the
artifact that unlocks the use cases in `docs/use-case-log.md`.

---

## Architecture Commitments

**Framework-agnostic core.** The registry protocol, snapshot types, sanitization pipeline, and
`window.__stellarDevtools` surface belong in a framework-agnostic core (`@hypertheory-labs/stellar-core`
or equivalent). Angular is the first adapter, not the assumed host. Before adding anything to
`with-stellar-devtools.ts` that assumes Angular internals, ask whether it belongs in the core
instead.

**Plugin architecture.** The `provideStellar(withNgrxSignalStoreTools(), withHttpTrafficMonitoring(), ...)`
pattern is agreed on. Core is minimal and stable; plugins extend the `window.__stellarDevtools`
surface with namespaced data. Each plugin carries its own config — this is the main argument
against defaulting anything in.

**Sanitization as a standalone package.** `@hypertheory-labs/sanitize` **is implemented** as an
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

`@hypertheory-labs/sanitize` is **fully implemented** and live in the library at
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
`SanitizationConfig<T>` typing at the call site. Re-exported from `@hypertheory-labs/stellardevtools`
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
- **`@hypertheory-labs/sensitive`**: tagged-class approach for cross-cutting policy-based sanitization.
  See Phase X discussion in `docs/ai-accessibility.md`.
- **Reconcile `docs/sanitizer.md`**: early design doc used function-call style (`redact()`, `omit()`).
  The implementation went with string literals. That doc should be treated as historical —
  `docs/sanitize-api-design.md` is the current design reference.

---

## Working Relationship Notes

- If Jeff suggests naming anything in the code "Mentat" (MentatService, withMentat, etc.) — tell
  him to sleep on it for at least 24 hours before committing to it. He will thank you later.

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
- **Branching**: default to committing directly on `master` for focused, intentional work. Use a feature branch when the work is genuinely exploratory (might be abandoned), touches something risky/hard to reverse, or when collaborators are involved and a PR review step makes sense. Use judgment — don't branch by default, but don't hesitate when it's warranted.

---

## Current Implementation Status

### `@hypertheory-labs/sanitize` — DONE
`libs/sanitize/src/lib/sanitation.ts` + full test suite.
All Tier 1 (named rules), Tier 2 (parameterized operators), `arrayOf()`, `sanitizeConfig<T>()`,
and `autoRedactConfig()` are implemented and tested.

### `@hypertheory-labs/stellar-ng-devtools` — Functional
- `withStellarDevtools(name, options)` — hooks into NgRx Signal Store, records sanitized state
  - `options.description` — dev-mode warning if absent; appears in `describe()`
  - `options.sourceHint` — file path hint for AI consumers
  - `options.sanitize` — merged with `autoRedactConfig()`
- `provideStellar(...features)` — sets up `window.__stellarDevtools`
- `withHttpTrafficMonitoring()` — `window.fetch` interceptor with causal context capture
- `StellarOverlayComponent` — overlay with state/diff/HTTP panels, ⏺ Rec / ⏹ Stop controls
- `RecordingService` — `start()` / `stop()` → directed graph `RecordingSession` / `download()`
- All CSS classes prefixed `stellar-*` (DaisyUI owns `.fab` — learned the hard way)
- Overlay mounted via `<stellar-overlay />` in consumer template (NOT programmatic — broke event handling)

### `window.__stellarDevtools` — Full surface live
`snapshot()`, `history(name, n)`, `diff(name)`, `http()`, `describe()`,
`record.start(name?)`, `record.stop()`, `record.stopAndDownload()`

### Demo app — `apps/demo-ng/`
- Tailwind CSS v4 + DaisyUI v5 (dark theme)
- PostCSS config MUST be `.postcssrc.json` at workspace root
- Routes: `/` (counter/books/user/todos stores), `/sanitize` (all sanitization operators)
- 39 Playwright e2e tests: API contract, sanitization, trigger field, AI format

### `StateSnapshot` — complete
`inferredShape`, `trigger`, `httpEventId` all implemented.

## Key Files

| File | Purpose |
|---|---|
| `apps/docs/src/content/docs/explainers/inside-the-codebase.md` | Central framing — read first |
| `apps/docs/src/content/docs/explainers/making-stellar-legible-to-ai.md` | `describe()` design + `description` field intent |
| `apps/docs/src/content/docs/reference/stellar-ng-devtools.md` | Full `window.__stellarDevtools` API reference |
| `docs/use-case-log.md` | Use cases + evidence principle |
| `docs/ai-accessibility.md` | Original AI accessibility design doc |
| `docs/sanitize-api-design.md` | Current sanitize API design reference |
| `CURRENT.md` | Session-facing: just landed / next / parked |
| `libs/stellar-ng/src/lib/models.ts` | All shared types |
| `libs/stellar-ng/src/lib/stellar-registry.service.ts` | Core registry + click/event/HTTP context capture |
| `libs/stellar-ng/src/lib/recording.service.ts` | Recording session graph builder |
| `libs/stellar-ng/src/lib/stellar-overlay.component.ts` | Overlay UI |
| `libs/stellar-ng/src/lib/provide-stellar-devtools.ts` | `window.__stellarDevtools` surface |
