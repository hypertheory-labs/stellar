---
title: Making Stellar Legible to AI — Design Decisions
description: Why describe() exists, how we handle the lazy-loading completeness problem, and why description is optional in TypeScript but not in spirit.
---

*This is a Technical Discussion Record (TDR) — not about a feature, but about the design choices behind Stellar's AI self-description surface and why they were made the way they were.*

---

## What we were trying to solve

An AI dropped into a fresh session with a Stellar-instrumented app currently needs the developer to narrate context: "this app has these stores, this one manages auth, that one is the outbox queue." That narration is exactly the kind of friction that the rest of Stellar is designed to eliminate.

The goal: the library carries enough context about itself that an AI can orient without developer narration. Not perfectly — the developer's intent is always going to be partially opaque — but enough to go from "I have no idea what this app does" to "I understand the domain well enough to be useful."

---

## The `describe()` endpoint

`window.__stellarDevtools.describe()` returns a structured manifest of what's registered:

```json
{
  "version": "1.0",
  "stores": [
    {
      "name": "TodosStore",
      "description": "Manages the todo list — fetch, add, toggle. All mutations go through the todos API.",
      "snapshotCount": 4,
      "registeredAt": 0,
      "sourceHint": "src/app/todos.store.ts"
    }
  ],
  "api": ["snapshot", "history", "diff", "http", "record"],
  "recordingActive": false
}
```

This is the runtime equivalent of `llms.txt` — a machine-readable entry point designed for AI consumers, not human readers. It answers "what is this app, and where do I start?" before the developer has said a word.

The `llms_full.txt` in the docs site is the complement: it explains the full `window.__stellarDevtools` API for an AI that hasn't seen it before. Together, these let a developer hand off to an AI with a single instruction: "call `describe()` and check `llms_full.txt`."

---

## The lazy-loading completeness problem

`describe()` is always accurate at the moment you call it. The problem is that in a real Angular app, stores register lazily — they come online when their route is first activated. Calling `describe()` on app load might show 3 stores when the app actually has 12. The AI gets a partial picture and, worse, doesn't know it's partial.

### What we considered

A "living document" approach — `describe()` that accretes as the app is exercised — sounds appealing but inverts the responsibility. The developer, not the library, decides when the picture is complete enough to hand off.

### What we decided

**`registeredAt`** on each store entry (ms since app start). This doesn't solve the incompleteness problem, but it makes it *visible*:

```json
{ "name": "CheckoutStore", "registeredAt": 4523 }
```

An AI seeing `CheckoutStore` registered 4.5 seconds after app start knows to ask "have you navigated through checkout?" rather than assuming the manifest is exhaustive. Silent incompleteness is worse than visible incompleteness.

**`describe()` carries an explicit caveat**: "Lazy-loaded routes may register additional stores. Navigate to all relevant routes before calling describe() for full coverage."

**The recording session is the complete artifact.** If you want to give an AI a full picture of what the app does — all stores, all routes, the full causal graph — the right tool is to record a walkthrough, not to call `describe()` on a fresh load. The recording captures every store that came online during the session, every HTTP call, every state transition. It's bounded and complete in a way a manifest can never be.

**The right workflow for AI handoff:**
1. Navigate to every relevant route (or the route you're debugging)
2. Exercise the interactions you care about
3. *Then* call `describe()` or `copyAllForAI()`

For a full-app tour: record the walkthrough, `stopAndDownload()`, hand the recording to the AI.

---

## The `description` field

`description` is the only piece of metadata about a store that cannot be derived from code. State shape is recoverable. Source location is recoverable. Type definitions are recoverable. But "this store manages the outbox queue for optimistic UI mutations" — that sentence lives only in the developer's head until they write it down.

This makes `description` the highest-value metadata in the entire library. One sentence, written once, collapses minutes of inference into seconds.

### Why it's optional in TypeScript

The instinct to make it a required field is understandable — it reflects the seriousness of AI accessibility as a design commitment. But a required TypeScript field gets gamed. The developer writes `description: 'store'` to satisfy the compiler and moves on. That's worse than nothing: it tells an AI the developer has thought about this, when they haven't.

The implementation that actually serves the ethic is a **dev-mode warning** — in development, Stellar warns if a store is registered without a description. The warning links to the documentation explaining why this matters. A warning can't be satisfied by a meaningless string without the developer actively lying to themselves.

The JSDoc on `RegisterOptions.description` carries the explanation directly to the developer's IDE at the moment of instrumentation:

> *"This is the only piece of context about your store that cannot be derived from code. AI coding assistants use this to orient quickly when debugging or exploring your application. A good description collapses minutes of investigation into seconds."*

This is the ethic expressed through guidance rather than enforcement. It's more likely to produce a genuinely useful description than a compiler gate — because the developer understands *why*, not just *that*.

---

## What this means for the `llms_full.txt` and consumer guidance

The standard onboarding for an AI coding assistant working with a Stellar-instrumented app should be:

1. A `CLAUDE.md` snippet (or equivalent for other AI tools) that the consumer drops into their project:
   ```
   This app uses Stellar devtools. Call window.__stellarDevtools.describe() to see
   registered stores. Exercise the app before calling describe() — lazy-loaded stores
   only appear after their route is visited.
   ```

2. `llms_full.txt` in the Stellar docs — the full API reference written for an AI reader, covering `describe()`, `snapshot()`, `history()`, `http()`, `record`, and how to interpret recording JSON.

3. Eventually: a Claude Code skill that walks through the structured inspection procedure. This builds on the same surface; it's not a different thing.

---

## What we deliberately deferred

- **Automatic `sourceHint` population** — needs either build-time tooling or Angular reflection APIs. The slot exists in `RegisterOptions`; populating it automatically is a separate problem.
- **`typeDefinition` in `describe()` output** — the slot exists; auto-generating TypeScript interface strings from inferred shapes is possible but not yet implemented.
- **Claude Code skill** — `/stellar-inspect` as a publishable skill. Worth doing; not this sprint.

## What shipped

- **MCP server (`@hypertheory-labs/stellar-mcp`)** — the right answer for AI tools that can call tools in a loop. Hosts a WebSocket bridge on `localhost:4280/__stellar`; the Angular app connects via `withStellarBridge()`. The agent calls `stellar_describe`, `stellar_snapshot`, and `stellar_ai_context` directly — no developer relay needed. Sanitization runs upstream in `withStellarDevtools()`, so every value the agent sees is already scrubbed. See [The Libraries](/overview/libraries/) for the full tool list.

---

## The assumption to test

The working hypothesis is that `registeredAt` + explicit caveat makes lazy-loading incompleteness visible enough that it doesn't cause AI confusion in practice. The alternative — requiring a full walkthrough recording before any AI handoff — may be the right answer for complex apps. We don't know yet. Flag this if real-world usage surfaces cases where `describe()` + caveat isn't enough.

---

*This TDR was written from the session of 2026-03-22.*
