---
title: Deployment Contexts, Plugin Architecture, and the AI Context Surface
description: How we reframed "modes" as deployment contexts, settled the plugin architecture pattern, and named the AI-facing output surface.
---

*This is a Technical Discussion Record (TDR) — a record of how we thought, not what we built. It exists so future contributors (and future instances of Claude) can understand not just what exists, but why it exists in that form and what was deliberately ruled out.*

---

## What we were actually solving

The session started as a "Next Up" review but quickly became about something harder: **how does this tool grow without becoming a configuration nightmare or losing its identity?**

Three pressures were converging:
- The tool was already doing more than one thing (state inspection, sanitization, AI export) and more features were coming
- The security model needed to vary by context — sanitization that's mandatory in production is unnecessary overhead in a test fixture
- The question of what to build next (clipboard export, plugin architecture, snapshot format, Redux store support) didn't have an obvious answer without a clearer picture of what the tool *is*

## Deployment contexts, not modes

The first reframing: Jeff described "modes" (exploratory dev, testing, runtime diagnostics). The important architectural consequence of calling them **deployment contexts** rather than modes is that the tool doesn't toggle between them — it *composes differently for each one*.

A `mode: 'test'` flag in a config object implies one tool with a switch. Deployment contexts imply different compositions of the same plugin primitives. That distinction matters for the Angular DI model: you don't write `if (mode === 'test') skip sanitization`, you just don't include the sanitization-enforcing plugin in your test provider.

**The three contexts:**

- **Exploratory Dev** — running in a real app, may touch production data, sanitization is mandatory, AI context is the primary output. This is the context the current implementation targets.
- **Testing** — Playwright fixture or test environment, state is fixture data, sanitization opt-out is explicit (not default-off). Key insight: `page.evaluate(() => window.__stellarDevtools.snapshot())` works today with no additional infrastructure — that's the zero-cost MCP equivalent for test contexts.
- **Runtime Diagnostics** — structural and behavioral signals only, never sees state *values*. This is actually the most privacy-safe context by default, because it doesn't need values — only that a service was created, destroyed, how many times, in what sequence.

## The plugin architecture decision

We landed on `StellarFeature<K>` — a discriminated union type matching Angular's own `RouterFeature<RouterFeatureKind.X>` pattern. What was considered and rejected:

**Rejected: just accepting `EnvironmentProviders[]`**
Works mechanically but loses the discriminant. You can't validate inputs, can't detect duplicate plugins, and there's no vocabulary for what a feature *is*. The Angular pattern exists for good reasons.

**Rejected: a `mode` string on `provideStellar`**
`provideStellar({ mode: 'test' })` hardcodes the assumption that there are exactly N modes and that they're mutually exclusive. The plugin pattern is open-ended — `withHttpTrafficMonitoring()` doesn't care what other plugins are present.

**The constraint that made it obvious:** each `withXxx()` carries its own config. If anything is baked in by default, its config has to go somewhere — either on the plugin or on `provideStellar`. Keeping the core empty and everything explicit avoids that entirely. The Angular idiom also means any Angular developer already knows how to read `provideStellar(withNgrxSignalStoreTools())` without documentation.

## withNgrxReduxStoreTools() — deliberately not built

The classic NgRx/Store (Redux-style) already has the Redux DevTools browser extension. The signal store does not have a good in-app devtool. That asymmetry, combined with NgRx's own signals/events API making the migration path explicit, makes the case for classic store support weak relative to everything else in the backlog.

**What would change this:** signal from actual users that they're on the classic store and need this. Absence of that signal = don't build it.

## The NgRx events API as trigger source

The events API (`@ngrx/signals/events`, out of experimental as of NgRx 21) is Redux patterns rebuilt natively inside the signal store. The timing insight that made the implementation clean: `Events` fires *after* `ReducerEvents` (which handles state transitions) but *before* Angular's effect scheduler runs the `getState` effect. So by the time `recordState` is called, the last dispatched event is already in the buffer.

The decision to **combine event and click** rather than replace: `[Counter] Increment — click: "+"` preserves both the precise semantic trigger (the event type) and the human-legible interaction context (what was clicked). Neither alone is as useful as both together.

## Naming: "AI Context"

The AI-facing output surface needed a name. Rejected: "AII" (sounds like a pirate), "AI Interface" (generic), "AI Accessibility surface" (too long for casual use). Settled on **AI Context** — it describes what it actually is: structured context that an AI can reason against. The full design principle remains "AI Accessibility"; "AI Context" is the shorthand for the output artifact.

## The browser-tools-mcp / Kapture research

We evaluated browser MCP tools for giving Claude live access to the running app. `browser-tools-mcp` (agentdeskai) is dead. Kapture is a viable alternative — Chrome extension + local Node server, console interception via method override and custom events (not CDP). The conclusion at the time: **don't take the dependency now**. The `window.__stellarDevtools` API already provides everything Kapture would need to relay.

*Update (later session):* `@hypertheory-labs/stellar-mcp` shipped a first-party answer: a push-based WebSocket bridge that inverts the dependency (MCP hosts the WS server; the Angular dev app connects to it). No browser extension, no Chrome required, no polling. The bridge is part of the `provideStellar(withStellarBridge())` call. See [The Libraries](/overview/libraries/) for the full picture.

**Jina.ai reader mode** (`r.jina.ai/` prefix) was discovered as the reliable way to fetch JavaScript-rendered documentation. Worth remembering.

## Session tracking improvements

`overview.md` was doing too many jobs (backlog, resolved archive, design notes, next-up queue). Split into:
- `CURRENT.md` — session-facing, 30-second read, what just landed / in progress / next
- `overview.md` — long-form parking lot for ideas and deferred work
- `docs/sessions/YYYY-MM-DD.md` — session kick-off notes (raw material that TDRs distill)
- TDRs — the permanent record of design thinking

The `/capture` skill was updated to also update `CURRENT.md` as part of end-of-session ritual.

## What we deliberately deferred

- **Playwright tests** — not too premature, actually good timing. Deferred only because the plugin architecture and events wiring were higher priority. The `window.__stellarDevtools` contract is stable enough to test against. Sanitization in particular is load-bearing and currently untested. Playwright's `page.route()` will be needed for HTTP monitoring tests anyway — good to set it up before that work starts.

- **`withHttpTrafficMonitoring()`** — the open design question is whether HTTP data augments the existing state timeline (showing causal fetch→state links) or gets its own panel, or both. WebSockets and SSE are explicitly parked until fetch is solid.

- **Filesystem snapshot write** — `.stellar/snapshot.json` was considered a stepping stone to MCP. Not needed: `@hypertheory-labs/stellar-mcp` shipped a WebSocket bridge instead, which is push-based and requires no filesystem polling.

- **Tree view for deeply nested state** — deferred until we have a demo store with intentionally large state so the expand/collapse behavior is tested against real pressure.

---

*This TDR was written from the session of 2026-03-22.*
