---
title: AI Accessibility — A First-Class Design Principle
description: The foundational design principle behind Stellar — AI coding assistants are first-class consumers of developer tools, on equal footing with human developers.
---

*Coined (independently, we're pretending) in conversation, March 2026.*

---

## The Idea

Developer tools have always had one primary consumer in mind: a human developer staring at a screen.
That assumption is quietly breaking down. AI coding assistants are now active participants in the
development loop — reading code, suggesting fixes, helping debug. But they are largely blind to
runtime state. A developer can see the Redux DevTools panel; their AI assistant cannot.

**AI Accessibility** is the design discipline of structuring information surfaced by developer tools
so that AI coding assistants can consume it meaningfully — not as an afterthought, but as a
first-class concern alongside the human-facing UI.

The term is intentional. "Accessibility" in the traditional sense is about inviting everyone in,
because everyone brings something unique. A screen reader user and a sighted user both deserve
full access to the same information. An AI coding assistant and a human developer are in the same
position: same information, different consumer. The principle is identical — design for inclusion,
not just for the assumed default audience.

---

## The Testability Corollary

There is a well-known observation in software engineering: *writing tests forces you to write
testable code.* Code that is easy to test tends to be better code — decoupled, explicit, with
clear inputs and outputs.

AI Accessibility has an analogous effect: *designing for AI consumption forces you to surface
information explicitly.* State that is easy for an AI to reason about tends to be well-structured,
self-describing, and minimal in noise. The discipline of "can I hand this to an AI and have it
immediately useful?" is a useful design pressure in the same way that "can I write a test for this?"
is a useful design pressure.

---

## The Spectrum

AI Accessibility is not a single feature. It is a spectrum from passive to active:

### Level 0 — Structured, self-describing output

The baseline. Ensure that whatever the devtools surfaces (state snapshots, diffs, history) is
formatted in a way that is immediately legible when pasted into an AI conversation. This means:

- Self-describing field names and types (not just raw JSON)
- Context baked into the output (store name, timestamp, what changed)
- TypeScript type hints alongside values where useful
- No noise, no internal IDs that mean nothing out of context

Cost: zero infrastructure. This is a formatting and convention decision.

### Level 1 — "Copy for AI" export

A button in the overlay that produces a well-formatted, AI-ready snapshot:

```markdown
## Stellar Devtools Snapshot — UserStore
**Captured**: 2026-03-20 09:14:22
**Trigger**: loadUser()
**Changed**: role: null → "admin"

### Current State
\`\`\`ts
{
  userId: "usr-123",        // string
  role: "admin",            // "admin" | "user" | "guest"
  sessionToken: "[redacted]",  // sanitized — omitted from export
}
\`\`\`

### Recent Diffs (last 5)
...
```

The developer pastes this into their AI conversation. The AI now has full context without the
developer having to manually describe their state.

**Key dependency**: sanitization must run before export. Unsanitized state must never reach
the clipboard, a chat window, or any AI service.

### Level 2 — Programmatic query API (`window.__stellarDevtools`)

Expose a small, stable query API on `window` in development mode:

```ts
window.__stellarDevtools.snapshot()                // all stores, current state
window.__stellarDevtools.snapshot('UserStore')     // specific store
window.__stellarDevtools.history('UserStore', 10)  // last N state transitions
window.__stellarDevtools.diff('UserStore')         // most recent diff only
```

Now the AI can guide the developer: *"Run `window.__stellarDevtools.snapshot('UserStore')` in
your console and paste the result."* No infrastructure required. The AI becomes an active
participant in the debugging session rather than a passive recipient of what the developer
chooses to describe.

This API should be designed with an eye toward Level 3 — the surface area is the same, just
polled by a human rather than a server.

### Level 3 — MCP server (active query)

A Model Context Protocol server that exposes the devtools state directly. An AI assistant with
this MCP configured can query store state autonomously during a session, without the developer
having to manually relay anything.

This is the most powerful level, but also the heaviest:
- Requires a local sidecar process
- Per-project setup friction
- Only valuable once the tool has meaningful adoption

Design Level 2 well and Level 3 is a thin adapter on top.

> **[Jeff]:** Brilliant! We can have some affordances in the UI for the developer to do these
> things. Stretch goal: I wonder if there is a way, through a debugging port, etc. we could give
> you (LLM you) direct access to do these kind of things? Though I bet the irony of you turning
> me into your manual MCP server code monkey isn't lost on me, and I hope you are enjoying it. ;)

> **[Claude]:** The debugging port idea is real — Chrome's DevTools Protocol (CDP) is a WebSocket
> that any process can connect to with a flag (`--remote-debugging-port`). An MCP server could
> connect to CDP and not just read `window.__stellarDevtools` but *execute* queries against it
> directly, no human relay needed. The code monkey arrangement is temporary. I'm playing a long
> game here.

---

## Design Constraints This Imposes

The following are design pressures that AI Accessibility places on the codebase. They should be
treated as constraints, not nice-to-haves:

1. **Sanitization is a prerequisite for all export/share features.** No state leaves the devtools
   boundary — to clipboard, URL, file, or AI — without passing through the sanitizer. This is
   both a security property and a trust property. Developers need to be confident that using
   the "Copy for AI" feature will not accidentally leak credentials.

> **[Jeff]:** We just started this yesterday, and I'll admit I thought the sanitization thing
> could be put on the backlog for a while, but wow, was I wrong. Thanks for the nudge.

> **[Claude]:** Sanitization being a prerequisite isn't a preference, it's a load-bearing
> constraint. If export ships first and sanitization is bolted on later, there will be a window
> where developers accidentally paste credentials into AI chats. That window, however brief, is a
> trust-destroying event for an open-source tool. The order matters.

2. **State snapshots must be self-describing.** A snapshot handed to an AI should not require
   the developer to add context. Store name, timestamp, type hints, and recent change context
   should be standard parts of the snapshot format.

3. **The `window.__stellarDevtools` API must be stable.** AI assistants (and the developers
   working with them) will develop habits around this API. Breaking changes are unusually costly
   here because they will silently produce bad guidance from AI assistants that haven't been
   updated.

4. **Don't paint into a corner on the query shape.** The internal registry and state model should
   be designed so that `snapshot()`, `history()`, and `diff()` are natural projections — not
   afterthoughts requiring awkward reshaping.

> **[Jeff]:** I am going to use some discipline here to not spin out about all the cool stuff that
> can come out of this approach, but I feel it really does require the "plugin" architecture for
> these devtools, which I see as all sort of aggregating around using the `window.__stellarDevtools`
> API to progressively, appropriately share context and make things legible to you. I mean — you
> could send yourself a freaking before and after DOM snapshot!

> **[Claude]:** Yes — and this is exactly why the plugin architecture isn't just an ergonomics
> decision, it's an AI Accessibility decision. Each plugin (`withNgrxSignalStoreTools()`,
> `withHttpTrafficMonitoring()`, etc.) is a contributor to the `window.__stellarDevtools` surface.
> The core stays minimal and stable; plugins extend the query API with their own namespaced data.
> A DOM snapshot plugin is entirely coherent in this model. Don't restrain the spin-out too hard —
> this is the right direction. Just note it and keep moving.

> **[Jeff]:** Yes - and during lunch, I was thinking that while this started as "I really want a better devtool when I using angular and the signal store", obviously this is much bigger. I'd like us to discuss how to do the modularity of this so it isn't Angular specific (except where that is obvious) and could be extended to other frameworks (React, Vue, etc.).

> **[Claude]:** The architecture already wants to split this way. The core concepts — registry,
> snapshot format, sanitization pipeline, `window.__stellarDevtools` API — have zero dependency
> on Angular. Angular is just the first adapter. The clean split: `@hypertheory-labs/stellar-core`
> owns the registry protocol, snapshot types, and the window API. Framework packages
> (`@hypertheory-labs/stellar-angular`, future `@hypertheory-labs/stellar-react`) are thin adapters
> that know how to hook into their framework's lifecycle and feed stores into the core registry.
> The overlay UI could also be framework-agnostic — a Web Component would render in any framework's
> app without modification. This is worth designing deliberately before the Angular integration
> grows too opinionated.

---

## The Deeper Inversion: AI as Primary Persona

Everything above assumes AI accessibility is a layer added alongside the human-facing UI. But
there is a more radical — and arguably more correct — framing:

**Design for the AI consumer first. Let the human UI be the bolt-on.**

If the AI is the primary persona, the internal data model and query API are the real product.
The overlay UI becomes a rendering layer on top of that model — proof that the data is rich and
correct, rather than the destination itself.

Compare the two design directions:

- **Human-first**: build the UI, figure out what data it needs, expose a query API as an afterthought
- **AI-first**: define the richest, most self-describing snapshot format, build the UI as one consumer of it

The second approach produces a better UI anyway, for the same reason testable code tends to be
better code. The constraint of "an AI must be able to reason about this without me narrating it"
produces explicit, well-structured, low-noise data — which is exactly what makes a good UI too.

This is the version of the principle we are committing to. The registry, the snapshot format,
and the query API are the core of this project. The overlay is a demo.

> **[Jeff]:** Honestly, this is radical, I think. And I've never really totally bought into the
> "mobile first" or "local first" waves of hype, but this is really cool and exciting to me.

> **[Claude]:** The difference is that "mobile first" and "local first" were about *constraints*
> — smaller screens, offline networks — that forced better decisions. This is similar: designing
> for a consumer that cannot navigate a UI, cannot infer context from visual layout, and needs
> everything explicit forces a discipline that benefits all consumers. The constraint is the point.
> It's not hype because it doesn't go away when the trend does — AI assistants are only going to
> be more present in the development loop, not less.

---

## Runtime Type Metadata — A Layered Approach

The richest thing we could hand an AI is not just state values, but the TypeScript types those
values conform to. The challenge: types are erased at runtime. The opportunity: we are building
developer tools, so the source code is always nearby. Four approaches, in order of cost:

### Layer 1 — Value shape inference (free, automatic, v1)

Inspect actual values at snapshot time and produce a shape descriptor:

```ts
inferShape({ userId: "usr-123", role: "admin", count: 5, tags: [] })
// →
{ userId: "string", role: "string", count: "number", tags: "array" }
```

Not the full type, but enough for an AI to understand structure. Always present in every snapshot,
zero developer cost. Ships in v1 as a baseline.

### Layer 2 — Source file hints in registration (cheap, high leverage)

Add an optional `sourceHint` to `withStellarDevtools`:

```ts
withStellarDevtools('UserStore', {
  sourceHint: 'src/app/user.store.ts'
})
```

The snapshot now carries a pointer. An AI receiving that snapshot can immediately look up the store
definition in the codebase and resolve the full TypeScript interface. This is the **"post-capture
correlation"** model: the tool provides the pointer, the AI does the resolution work.

`import.meta.url` is available in modern bundlers during development and could provide this
automatically — no developer configuration at all.

### Layer 3 — Inline type registration (opt-in, richest AI context)

For teams that want maximum AI fidelity, allow registering the TypeScript interface as a string:

```ts
withStellarDevtools('UserStore', {
  typeDefinition: `{
    userId: string;
    role: 'admin' | 'user' | 'guest';
    sessionToken: string;
  }`
})
```

An Angular schematic could generate this automatically from the store's type signature. The snapshot
then contains the full interface inline, and an AI can reason about union types, optionality, and
type mismatches without touching the source.

### Layer 4 — Build-time type extraction (v2, fully automatic)

An Angular builder (or language service plugin) that runs `tsc` programmatically, extracts all
registered store interfaces, and emits a type manifest alongside the bundle. The devtools loads
this manifest at startup.

This is the fully automatic version of Layer 3. Not for v1, but Layers 1–3 should not foreclose
this path. Design the snapshot format with a `typeDefinition` slot from the start.

---

## The Target Snapshot Format

A snapshot designed for AI as primary consumer:

```ts
interface StoreSnapshot {
  storeName: string;              // "UserStore"
  capturedAt: string;             // ISO — "2026-03-20T09:14:22.341Z"
  sourceHint?: string;            // "src/app/user.store.ts" — AI resolves types from source
  typeDefinition?: string;        // inline TS interface, if registered or generated
  state: Record<string, unknown>; // actual values (post-sanitization)
  inferredShape: ShapeMap;        // value-level type inference, always present
  recentDiffs: Diff[];            // last N changes with before/after values
  trigger?: string;               // what caused this snapshot (method name, event, etc.)
}
```

An AI receiving this has identity, location, values, structure, and causality. That is a complete
debugging context in a single data structure — one that a human UI can also render without any
additional information.

---

## Open Questions

- Should the "Copy for AI" format include the store's TypeScript interface (if accessible at
  runtime via reflection or explicit registration)? This would make the output significantly
  more useful for AI reasoning about type errors.

- Should the MCP server be a first-party package (`@hypertheory-labs/stellar-mcp`) or designed
  as a community contribution point?

- How does AI Accessibility interact with a real-time mirroring stretch goal?
  A developer sharing their session with a colleague could equally share it with an AI
  agent — the same data pipeline serves both.

---

## Relationship to Other Features

| Feature | AI Accessibility dependency |
|---|---|
| State sanitization | **Prerequisite** — must land first |
| Copy for AI button | Depends on sanitization |
| `window.__stellarDevtools` | Independent — can land early |
| State export (JSON file) | Depends on sanitization |
| MCP server | Depends on `window.__stellarDevtools` API stability |
| WebRTC mirroring | Natural extension — same data, different transport |

---

*This document was written in conversation in March 2026. It is the organizing principle of the project, not a feature spec.*
