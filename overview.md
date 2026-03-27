# Stellar Devtools — Backlog & Parking Lot

This is the long-form ideas and backlog file. For current work state, see `CURRENT.md`.
For design decisions and reasoning, see TDRs in `apps/docs/src/content/docs/explainers/`.

---

## Plugin architecture — where's the line?

The `provideStellar(withNgrxSignalStoreTools(), withHttpTrafficMonitoring(), ...)` pattern is agreed on. The open question: which plugins, if any, are so universally needed that leaving them out feels like a footgun?

Key argument against any defaults: each `withXXX()` carries its own config, so defaulting anything in forces opinionated defaults or pushes config onto `provideStellar` itself. Keeping the core empty and everything explicit avoids that.

This also sets up a clean story for the three deployment contexts:
- **Exploratory Dev** — `withNgrxSignalStoreTools()` etc. wired in `app.config.ts`
- **Testing** — a composable fixture that includes only what makes sense for tests, sanitization opt-out explicit
- **Runtime Diagnostics** — structural/behavioral signals only, no state values, different plugin set

**Don't decide production-mode gating until this is settled** — they're coupled. If each plugin is its own provider, gating applies per-plugin independently.

---

## Snapshot export — filesystem write

After clipboard is shipped: a companion action that writes the snapshot to `.stellar/snapshot.json` at the project root. In a Claude Code session, Claude reads this file directly — developer says "I saved a snapshot" and Claude reads it without copy-paste. This is the practical stepping stone to MCP.

**Prerequisite:** clipboard feature ships first.

---

## MCP server

The right long-term answer for AI assistant integration. Worth building after the filesystem approach, which will clarify exactly what the MCP server needs to expose.

---

## Causal event stream — `withPlaywrightObserver()`

State snapshots tell you *where* the app is. The causal event stream tells you *how it got there* — the sequence of user interactions, network requests, and state transitions that led to the current moment.

The mechanism: lightweight monkey-patching of `fetch`, document-level capture listeners for user interactions, and store method wrapping. Produces a structured event log:

```
[click]  button "Load User"
[fetch]  GET /api/user/123 → 200 (142ms)
[state]  UserStore: { loading: true } → { loading: false, userId: "123", role: "admin" }
[fetch]  PUT /api/user/123 → 403 (34ms)
[state]  UserStore → { error: "Forbidden" }
```

Delivered via Playwright's `page.addInitScript()` in test environments. Feeds the `trigger` field in state snapshots automatically.

Companion: **conditional watchpoints** — `window.__stellarDevtools.watch('UserStore', state => state.errorCount > 3, { mode: 'record' })`.

See `docs/causal-event-stream.md` for full design notes.

---

## Runtime diagnostics — behavioral rubrics

The most ambitious context. Angular-specific heuristics (service duplication, premature destruction, change detection thrashing, API cache staleness) encoded as detectable runtime patterns. The causal event stream is a prerequisite — you can't detect "service created twice" without a timeline.

The deeper vision: bridging the gap between subjective developer experience ("feels janky", "sluggish on this route") and objective instrumentation. Human and AI collaborating to make the felt sense of an application legible and actionable.

Not called "lint mode" — static linters check code; this checks *runtime behavior*. "Runtime diagnostics" is more accurate.

---

## User-defined semantic aliases in `@hypertheory-labs/sanitize`

`createSanitizer()` factory for domain-specific aliases. Consumers register custom aliases that extend `SanitizationRule` with their own keys, preserving the `satisfies`-based key narrowing:

```ts
const { sanitized } = createSanitizer({
  policyNumber: 'redacted',
  claimNumber:  'hashed',
  memberId:     (v) => v.slice(-4),
});
```

See backlog note in `overview.md` (pre-cleanup) for full design discussion.

---

## Production-mode gating of the overlay

`provideStellar()` registers the API only; `StellarOverlayComponent` is the optional UI layer. Consumers wrap it with whatever environment guard fits their deployment model. `isDevMode()` inside the component serves as a safe default.

Visual overlay and `window.__stellarDevtools` API are independently controllable — some teams want the API in production for headless tooling (AI assistants, automated monitoring) without the visual overlay.

**Don't design this until the plugin architecture is settled.**

---

## Multi-store pinning

"Pin" icon to keep a store panel open alongside a second. Deferred pending a real use case.

---

## Panel resize

Panel width is fixed at 480px. Add a horizontal drag-to-resize handle on the left edge.

---

## State export / import

Export a store's full snapshot history as JSON; re-import in the same or different session. QA workflow superpower from the Redux DevTools era.

**Prerequisite:** sanitization in place before this ships (already done).

**Technical note:** exporting is trivial. Importing requires the registry to hold a reference to the actual store instance to call `patchState`. Small but deliberate architectural change.

---

## Real-time state mirroring

**Near-term:** "record session" mode — compressed, timestamped bundle of all state snapshots, exportable as a file. QA attaches to a GitHub issue; developer imports and replays locally.

**Long-term (WebRTC):** state is serializable JSON so the data side is solved. Requires a signaling server — natural fit for a paid companion service if the library gets traction.

---

## HTTP traffic monitoring

Visualize API calls — cache hits, response age, etc. Likely via a development-time service worker (like MSW) that communicates HTTP activity back to the devtools.
