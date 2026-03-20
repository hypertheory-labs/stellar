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

**Sanitization as a standalone package.** `@hypertheory/sanitize` is designed to be usable
independently of the devtools — event sourcing pipelines, logging, etc. `withStateSanitization()`
in the devtools is a thin adapter. The prototype lives in `docs/sanitation.ts`.

**The target snapshot format** (designed, not yet implemented):
```ts
interface StoreSnapshot {
  storeName: string;
  capturedAt: string;             // ISO timestamp
  sourceHint?: string;            // file path — AI resolves types from source
  typeDefinition?: string;        // inline TS interface if registered/generated
  state: Record<string, unknown>; // post-sanitization values
  inferredShape: ShapeMap;        // value-level type inference, always present
  recentDiffs: Diff[];
  trigger?: string;               // what caused this snapshot
}
```
These slots need to be in the registry model from the start.

---

## Current State of the Sanitizer

The prototype is `docs/sanitation.ts` with tests in `docs/sanitation.spec.ts`. It is not yet
in the library. Key design decisions made:

- String literal operators (`'omitted'`, `'lastFour'`, `'mask'`) via a `satisfies`-keyed handler
  map — do not replace `satisfies` with a type annotation, it breaks key narrowing (see `docs/notes.md`)
- Single-element tuple `[config]` for array fields — signals "map this config over every element"
- Nested object configs recurse automatically

**Open decisions** (from `overview.md` agenda):
1. Parameterized operators (`keepFirst(n)`, `truncate(n)`) — leaning curried functions, needs decision
2. `[config]` tuple vs explicit `arrayOf()` combinator — needs decision before public API
3. Reconcile string-literal implementation with function-call style in `sanitizer.md`
4. Tagged-class approach for cross-cutting policy-based sanitization (Phase X — see `ai-accessibility.md`)

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

## Key Files

| File | Purpose |
|---|---|
| `docs/ai-accessibility.md` | Central design document — read first |
| `docs/sanitation.ts` | Sanitization prototype (not yet in library) |
| `docs/sanitation.spec.ts` | Tests for the prototype |
| `docs/sanitizer.md` | Sanitization design doc (needs reconciling with implementation) |
| `docs/notes.md` | Implementation notes — critical `satisfies` explanation |
| `overview.md` | Agenda, backlog, current open questions |
| `projects/hypertheory/stellardevtools/src/lib/` | The actual library |
| `projects/demo/src/app/` | Demo app with example stores |
