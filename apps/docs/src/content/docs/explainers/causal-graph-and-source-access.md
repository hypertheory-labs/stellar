---
title: Causal Graphs, Source Access, and What That Changes
description: Why Stellar's epistemic position is different from generic developer tools — and what becomes possible when the tool has access to the source code.
---

*Design thinking note — 2026-03-22*

---

## The standard framing and why it's limiting

Generic developer tools — browser network panels, Redux DevTools, most observability products — are
epistemically downstream of the runtime. They observe what happens. They can't know *why* it
happened except by inference from timing and correlation. The tool sees a fetch at T+400ms and a
state change at T+650ms and draws an arrow. That arrow is a guess.

This limits what generic tools can surface. They can tell you *what* changed. They can tell you
*when*. Causation requires inference the tool doesn't have the context to make confidently.

---

## What changes when the tool has the source

Stellar is not a generic tool. It runs inside the application, built by developers with an AI
assistant that has read the codebase. The epistemic position is different:

**The causal graph exists in the source code before runtime.**

When the AI reads a counter store, it knows:
- Clicking "+" dispatches an increment event
- The reducer handles it with a state delta of exactly `{ count: count + 1 }`
- There are no side effects; no HTTP calls follow from this event

That's not an inference from runtime data. That's a static fact about the code. Tests are an
explicit encoding of part of that graph — they verify expected behavior. But the graph itself
exists *before* any test runs.

---

## The loop

The circuit, fully closed:

1. **AI reads source** → derives the causal map (which actions trigger which effects, which HTTP
   calls follow which events, which state transitions are possible)

2. **Tests encode the map** → Playwright tests verify the map at runtime, creating ground truth about
   which causal chains are real and exercised

3. **Runtime traces** → `withHttpTrafficMonitoring()` and the event/click trigger system
   record what actually happened, in context

4. **Traces annotated against the map** → not just "a fetch happened" but "this fetch was initiated
   in the context of this event, dispatched by this click, and produced this state delta — and
   we knew this was a possible causal chain"

5. **Annotated traces back into AI context** → the snapshot format includes not just current state
   but the causal provenance of recent state changes; future AI sessions have richer context without
   requiring the developer to explain what happened

---

## Why the correlation problem is tractable here

Correlating "this HTTP response is from that action dispatched when the user clicked that button"
sounds like a hard distributed tracing problem. It is — for generic tools.

For Stellar it's different because of point 1 above. We're not trying to infer causation from timing
alone. We have the causal map. At the moment a `fetch` is initiated:

- The last event is known (buffered in the registry)
- The click that triggered the dispatch is known
- The source code tells us whether this event is *expected* to trigger a fetch at all

So the correlation isn't a guess. It's a match: "this fetch was predicted by the causal map, was
initiated in the window established by this event, and the response matches the expected state
transition." Discrepancies from the expected map are themselves informative — unexpected fetches,
missing state transitions, wrong deltas.

---

## What this means for the data model

An HTTP record shouldn't be just:

```ts
{ method, url, status, duration, requestBody, responseBody, timestamp }
```

It should be:

```ts
{
  method, url, status, duration,
  requestBody, responseBody,
  timestamp,
  initiatingEvent?: string,      // the event type in context when fetch was called
  initiatingClick?: string,      // the click label, if within recency window
  resultingSnapshot?: string,    // name + timestamp of the snapshot produced by this response
}
```

This makes the HTTP record a *node in the causal graph*, not just a log entry. The overlay can then
render the graph: click → event → fetch → response → state delta.

---

## The graph visualization

For a developer debugging "why is my state wrong after clicking Login?", the graph view shows:

```
[click: "Login"]
  → [UserStore] login event dispatched
  → POST /api/auth  (pending 240ms)
    → 200 OK
    → UserStore snapshot: { loggedIn: true, name: "Jeff G." }
```

vs. a broken case:

```
[click: "Login"]
  → [UserStore] login event dispatched
  → POST /api/auth  (pending 240ms)
    → 401 Unauthorized
    → [no state change recorded]   ← error: expected snapshot not produced
```

The second case is only detectable as an error because we know from the source what *should* have
happened. Generic tools would just show the 401. Stellar can show the 401 in context of the
expected causal chain that was broken.

---

## The AI context implication

The snapshot format should eventually include causal provenance for recent state changes. Not just:

```json
{ "state": { "loggedIn": true }, "trigger": "[User] login — click: \"Login\"" }
```

But:

```json
{
  "state": { "loggedIn": true },
  "trigger": "[User] login — click: \"Login\"",
  "causalChain": [
    { "type": "click", "label": "Login" },
    { "type": "event", "name": "[User] login" },
    { "type": "http", "method": "POST", "url": "/api/auth", "status": 200, "duration": 240 }
  ]
}
```

An AI assistant receiving this snapshot can reason about "what caused this state" without being told.
The data is self-describing about causation, not just about the current value.

---

*This is design thinking, not a spec. The implementation will teach us things this document
doesn't know yet.*
