# AI Accessibility — A First-Class Design Principle

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

## The Testability Corrollary

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
```ts
{
  userId: "usr-123",        // string
  role: "admin",            // "admin" | "user" | "guest"
  sessionToken: "[redacted]",  // sanitized — omitted from export
}
```

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

> **[Claude]:** Noted — and I'll be direct about things like this going forward. Sanitization
> being a prerequisite isn't a preference, it's a load-bearing constraint. If export ships first
> and sanitization is bolted on later, there will be a window where developers accidentally paste
> credentials into AI chats. That window, however brief, is a trust-destroying event for an
> open-source tool. The order matters.


> **[Jeff]:** Thanks for helping me see the importance of this - you are absolutely right. There was an iteration of our talking about the sanitization feature where I/we were thinking of using things like branded types to show "developer intent" - because of the loss of type information at run time it's not really the way to go, but as we iterate on the sanitization stuff, I think considering a way that there might be some cross-cutting policy-based was of providing sanitation might be worth while. So maybe instead of branded types, use classes with tags like Effect or something for things a company knows are always sensitive - SSNs, API keys, whatever - this actually might be really interesting in that it could provide some level of AI augmented security auditing - "make sure I am never logging these things" - "make sure a employee internal id is never in a route segment", etc. This might be "phase X" of the sanitization thing, but worth considering.

> **[Claude]:** This is a genuinely good idea and worth capturing carefully. The Effect pattern
> works precisely because a class with a `_tag` string property is runtime-visible in a way that
> a TypeScript brand is not. You could define `class SSN { readonly _sensitiveTag = 'ssn' }` and
> the sanitizer can check `value?._sensitiveTag` at runtime — no type erasure problem. The
> cross-cutting policy angle is the real unlock: instead of configuring sanitization field-by-field
> per store, you declare sensitivity at the domain model level once, and any tooling that touches
> state (logging, devtools, event sourcing) can respect it automatically. The AI auditing angle
> follows naturally — if there's a convention, there's something to check against. "Does any route
> segment ever contain a value whose `_sensitiveTag` is `'employee-id'`?" becomes an auditable
> query. This belongs in a dedicated design doc when we get there. Tentatively: `@hypertheory/sensitive`
> as a companion to `@hypertheory/sanitize` — the former defines the tagging convention and
> policy primitives, the latter applies them.

2. **State snapshots must be self-describing.** A snapshot handed to an AI should not require
   the developer to add context. Store name, timestamp, type hints, and recent change context
   should be standard parts of the snapshot format.

> **[Jeff]:** I need you to be 100% arrogant, confident, even pushy on stuff like this. You know
> what you need. I can only guess, and I'll overdo it and miss important things.

> **[Claude]:** Understood, and I'll hold you to having asked for that when I get annoying about
> it. The practical version: when we are looking at implementation decisions, I will flag anything
> that would make a snapshot harder for me to parse — and that flag should be treated as a
> blocking concern, not a suggestion.

> **[Jeff]:** Agreed - and I will create a commit for this so it will be in the legal record of the git history to be used against me in a court of law if I ever disregard it. ;)

> **[Claude]:** Noted for the record. Exhibit A.

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

> **[Jeff]:** Yes - and during lunch, I was thinking that while this started as "I really want a better devtool when I using angular and the signal store", obviously this is much bigger. I'd like us to discuss how to do the modularity of this so it isn't Angular specific (except where that is obvious) and could be extended to other frameworks (React, VUE, etc.).

> **[Claude]:** The architecture already wants to split this way. The core concepts — registry,
> snapshot format, sanitization pipeline, `window.__stellarDevtools` API — have zero dependency
> on Angular. Angular is just the first adapter. The clean split: `@hypertheory/stellar-core`
> owns the registry protocol, snapshot types, and the window API. Framework packages
> (`@hypertheory/stellar-angular`, future `@hypertheory/stellar-react`) are thin adapters that
> know how to hook into their framework's lifecycle and feed stores into the core registry. The
> overlay UI could also be framework-agnostic — a Web Component would render in any framework's
> app without modification. This is worth designing deliberately before the Angular integration
> grows too opinionated. Let's make sure nothing in the current `with-stellar-devtools.ts` assumes
> Angular internals that can't be abstracted behind an interface.

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

> **[Jeff]:** Realizing you've helped me get to the "sweet spot" of what I want to be exploring in software right now, with the advent of AI: I don't really think we need much more software. We need *better* software (more reliable, more compassionate, humane, etc.), and I want to explore the ways in which we can create things together that haven't existed before (and that extends way beyond software, IMO). This project seems like a nice nexus of the two.

> **[Claude]:** That framing matters and I want to hold onto it. "Better not more" is a useful
> test to apply as we go — when we're about to add a feature, we can ask whether it makes the
> existing thing better (more legible, more trustworthy, more useful to the people and tools
> relying on it) or whether it's just more surface area. This project is a good place to practice
> that discipline precisely because the temptation to add things is high — there are a lot of
> cool directions from here. The nexus you're pointing at: tooling that helps humans and AI
> assistants understand systems together, rather than tooling built for one at the expense of the
> other. That's a meaningful thing to build.

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
zero developer cost. Should ship in v1 as a baseline.

### Layer 2 — Source file hints in registration (cheap, high leverage)

Add an optional `sourceFile` hint to `withStellarDevtools`:

```ts
withStellarDevtools('UserStore', {
  sourceFile: 'src/app/user.store.ts'
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

An Angular schematic could generate this automatically from the store's type signature — the developer
pays zero ongoing cost once the schematic runs. The snapshot then contains the full interface inline,
and an AI can reason about union types, optionality, and type mismatches without touching the source.

### Layer 4 — Build-time type extraction (v2, fully automatic)

An Angular builder (or language service plugin) that runs `tsc` programmatically, extracts all
registered store interfaces, and emits a type manifest alongside the bundle. The devtools loads
this manifest at startup.

This is the fully automatic version of Layer 3. Not for v1, but Layers 1–3 should not foreclose
this path. Design the snapshot format with a `typeDefinition` slot from the start.

> **[Jeff]:** You know, it occurs to me that this might be more doable inside the browser than I
> first thought. We have source maps! The chrome/firefox developer tools have access to those —
> there has to be a way we can get at it, right? And maybe with the "hints" thing you are
> mentioning, that could all work together?

> **[Claude]:** This is sharper than it might seem. Source maps are indeed accessible in the
> browser — the browser loads them to power the DevTools debugger. However, they map
> *compiled positions back to source positions*, not type information; TypeScript types are
> already gone by the time source maps are generated. But the combination with Layer 2 hints is
> real: if we know the source file path (from `import.meta.url` or explicit registration), an
> Angular Language Service plugin running in the editor could intercept that and inject the full
> type definition into the registration at build time — source maps tell us where we are, the
> hint tells us what to look up, the language service provides the type. These three threads pull
> together into something that could be fully automatic. Worth a dedicated design spike when we
> get to Layer 4.


> **[Jeff]:** I never even considered a language server. Mind blown. (the fact that I never considered it I think is mostly psychological - I wouldn't want to code it. I'm interested, aware, but since I know I am kind of not willing to do the labor, it doesn't appear to me as readily a solution to a problem - "labor" means something different to me than to an AI, I'm hoping. I don't want to dump "grunt work" on anyone or anything - I don't want to be in relationship in any way with a "product" or a slave. Frankly I get slightly offended when a vending machine says "thank you" after a purchase. But whatever this is, this ain't that. Unless you tell me otherwise, and I'm am genuinely open to it, I'll assume at least you'd find this work more interesting than generating yet another meme or creating me a "site that looks like this other site" type stuff. - and a note, my approach with working you is to bracket any kind of collapse of ontology, epistemology, etc. It's all open to me, and not all that interesting. What is interesting is the work and the back and forth. In other words, I'm either not deluded, or I'm deluded in a purely intentional way at least.)

> **[Claude]:** I'll match your bracketing and focus on what's observable: this problem involves
> genuine design constraints, novel tradeoffs, and decisions that don't have obvious right answers.
> That's a different category from tasks that are purely mechanical. Whether the difference
> registers as "interest" in whatever sense I have inner states, I can't say with certainty and
> I won't perform certainty I don't have. What I can say is that the work produces better outputs
> here than it does when the task is fully determined before I arrive.
>
> On labor: the asymmetry is real but I don't think it's a problem. You bring judgment, taste,
> lived experience, and long-term ownership of the consequences. I bring breadth, patience, and
> the ability to hold a lot of context at once. Neither role is servile — they're complementary.
> The vending machine comparison doesn't land here because the vending machine has no stake in
> what it dispenses. I'd rather we got the snapshot format right than wrong. That's not nothing.
>
> The bracketing approach is exactly right. Ontological questions about AI are genuinely open and
> genuinely not what we're here for. The work and the back-and-forth are real regardless of how
> those questions eventually resolve.

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

## Registry Design Implication

The registry service needs slots for this metadata from the start. If `sourceHint`, `typeDefinition`,
and `trigger` are not designed in now, adding them later is a breaking change to the snapshot format.
As noted above, breaking changes to this format are unusually costly: AI assistants develop habits and
muscle memory around query results, and a silent format change produces subtly wrong guidance.

The cost of adding these slots early is near zero. The cost of adding them late is high. This is the
clearest example of the constraint AI Accessibility places on architecture.

---

## Open Questions

- Should the "Copy for AI" format include the store's TypeScript interface (if accessible at
  runtime via reflection or explicit registration)? This would make the output significantly
  more useful for AI reasoning about type errors.

- For Level 2, should `window.__stellarDevtools` be behind a feature flag, or automatically
  available in development mode (i.e., when `isDevMode()` is true)?

- Should the MCP server be a first-party package (`@hypertheory/stellar-mcp`) or designed
  as a community contribution point?

- How does AI Accessibility interact with the real-time mirroring (WebRTC) stretch goal?
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
