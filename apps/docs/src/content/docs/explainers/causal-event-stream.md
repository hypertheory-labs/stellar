---
title: Causal Event Streams and the Playwright Observer
description: Design notes on recovering the causal chain that NgRx Signal Store trades for ergonomics — and how a Playwright-integrated observer could deliver it.
---

*Design notes from conversation, March 2026. This describes planned/future work — the concepts inform the architecture but the Playwright observer is not yet implemented.*

---

## The Problem

A state snapshot tells you *where* an application is. It does not tell you *how it got there*.

When debugging with an AI assistant, the developer currently has to manually relay the sequence of events that led to a bug — what they clicked, what requests fired, what state changed and when. This is the primary friction in AI-assisted debugging sessions. The AI is doing archaeology on a static artifact without the causal chain that produced it.

This is the same problem Redux solved by making every state change an explicit named action. The action log *is* the causal chain. NgRx Signal Store trades that explicitness for ergonomics — less boilerplate, but causally opaque. We can recover it.

---

## What We Want

A structured, ordered event log that looks like this:

```
[click]  button "Load User"
[fetch]  GET /api/user/123 → 200 (142ms)
[state]  UserStore: { loading: true } → { loading: false, userId: "123", role: "admin" }
[click]  button "Edit Profile"
[state]  UserStore: { editing: false } → { editing: true }
[fetch]  PUT /api/user/123 → 403 (34ms)
[state]  UserStore: { editing: true } → { editing: false, error: "Forbidden" }
```

That sequence — user intent, network effect, state outcome — is a complete debugging context. An AI receiving it can reason about the failure without any additional narration from the developer.

---

## The Mechanism: Instrumented Monkey-Patching

Zone.js pioneered this model in Angular: patch the platform primitives, track causality across async boundaries. Angular is moving toward zoneless — but the *model* is valid independently of Zone.js. A lightweight, purpose-built observer patches just what it needs:

```ts
// Network causality
const originalFetch = window.fetch
window.fetch = function(...args) {
  const taskId = stellarObserver.startTask('fetch', args[0])
  return originalFetch.apply(this, args)
    .then(res => {
      stellarObserver.endTask(taskId, res.status)
      return res
    })
}

// User interaction capture
document.addEventListener('click', e => {
  stellarObserver.recordEvent('click', {
    target: e.target.tagName,
    label: e.target.textContent?.slice(0, 50),
    testId: e.target.getAttribute('data-testid'),
  })
}, { capture: true })
```

The observer is unpatched on teardown. It has no production footprint.

### What gets instrumented

| Layer | API | What we get |
|---|---|---|
| Network | `fetch` / `XHR` | Request URL, method, status, duration |
| User interaction | `document` capture listener | Click, input, navigation intent |
| State changes | Store method wrapping (already in `withStellarDevtools`) | Before/after values, method name as trigger |
| Navigation | History API | Route transitions |

---

## Integration with Playwright

The cleanest delivery mechanism is Playwright's `page.addInitScript()` — runs before the page's own scripts, so instrumentation is in place before anything executes:

```ts
// In your Playwright test setup
await page.addInitScript({ path: 'stellar-observer.js' })

// Stream events back through Playwright's console bridge
page.on('console', msg => {
  if (msg.text().startsWith('__stellar:')) {
    const event = JSON.parse(msg.text().slice('__stellar:'.length))
    eventLog.push(event)
  }
})

// At the end of a test / on demand
const log = await page.evaluate(() => window.__stellarObserver.flush())
```

Events flow: browser → `console.log` → Playwright listener → local file / AI context. No external network connection. Developer-initiated. Scoped to the test session.

### What this enables

- **Post-test AI debugging**: attach the event log to a failed test and hand it to an AI. The AI has the full causal chain, not just the assertion failure.
- **Conditional capture**: start recording detailed traces only when a condition is met (see watchpoints below).
- **Regression context**: compare event logs between passing and failing runs to find where the causal chain diverges.

---

## Conditional Watchpoints

A state-level equivalent of conditional debugger breakpoints:

```ts
window.__stellarDevtools.watch(
  'UserStore',
  state => state.errorCount > 3,
  { label: 'too many errors', mode: 'notify' }
)
```

Three modes:

- **`notify`** — fire a console event / overlay badge when condition becomes true. Safe, low friction.
- **`pause`** — `debugger` statement equivalent at the state level. Stop execution when condition hits.
- **`record`** — begin capturing a detailed trace when condition is met. Low overhead normally, rich context on demand.

The Playwright connection: a watch condition can trigger a screenshot + full state dump automatically. "When this error state appears, capture everything without me having to notice and react."

---

## The `data-stellar-label` Convention

When an element's text content isn't descriptive enough — icon buttons, symbol buttons (`−`, `+`),
elements whose visible label doesn't map cleanly to an action — developers can annotate with
`data-stellar-label` to provide an explicit hint to the click correlator:

```html
<button data-stellar-label="decrement" (click)="counter.decrement()">−</button>
<button data-stellar-label="increment" (click)="counter.increment()">+</button>
```

The correlator's label priority order:

1. `data-stellar-label` — explicit developer intent, wins always
2. `aria-label` — already semantic, free, no extra work if present
3. `textContent.trim()` — what the user sees (works well for most buttons)
4. `tagName.toLowerCase()` — fallback

**Why this matters for AI correlation:** a history entry showing `click: "increment"` is
directly correlatable to the `increment()` method in the store source. The label is the bridge
between the UI event and the code.

Teams already using `data-testid` for Playwright/Cypress will find this immediately familiar.
The attribute is inert to the application, survives minification, and works in any framework.

---

## Safety

The key variable is **where the stream goes**, not the instrumentation itself.

| Destination | Assessment |
|---|---|
| `window.__stellarObserver` (in-browser, developer reads it) | Safe |
| `console.log` captured by Playwright locally | Safe |
| Local WebSocket to sidecar (localhost only) | Safe |
| External endpoint | Do not do this |

The same sanitization principle that governs state snapshots applies here: **no unsanitized data enters the log**. Auth headers stripped. Sensitive field names redacted per the `@hypertheory-labs/sanitize` blocklist.

---

## The Proposed Package: `withPlaywrightObserver()`

A plugin for `provideStellar` with:

- Zero production footprint (tree-shaken unless explicitly included in test config)
- Injected via `page.addInitScript()` in Playwright setup
- Produces a structured `StellarEventLog` that complements `StateSnapshot`
- Feeds the `trigger` field in snapshots automatically
- Exposes `window.__stellarObserver.flush()` for on-demand retrieval

The event log format should be designed as a first-class AI-readable artifact alongside the snapshot format — same self-describing conventions, same sanitization guarantees.

---

*Design notes from March 2026. The concepts here inform how the existing trigger/causal system was designed. `withPlaywrightObserver()` as a dedicated package is future work.*
