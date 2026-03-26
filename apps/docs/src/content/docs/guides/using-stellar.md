---
title: Using Stellar
description: A walkthrough of the Stellar overlay and the AI handoff workflow — from inspecting state to recording a causal trace.
---

This guide assumes you have Stellar installed and your stores are registered. If you haven't done that yet, start with [Getting Started](/guides/getting-started/).

---

## The overlay

Click **✦ Stellar** in the bottom-right corner of your app. The picker lists every registered store, plus shortcuts to the HTTP panel and any saved recording.

Click a store name to open it. You'll see:

- A **history list** on the left — one entry per state change, with timestamp and a brief note about what triggered it (a click label, an NgRx event, or a `← GET /path (200)` badge if an HTTP response caused it)
- The **State** view — the current snapshot, syntax-highlighted
- The **Diff** view — what changed between this snapshot and the previous one

You can click any history entry to compare snapshots at different points in time. The diff view shows added fields in green, removed in red, and changed values as before → after pairs.

Resize the panel from the top or left edge. The history column width is also adjustable.

---

## Describing your stores

When you add `withStellarDevtools` to a store, Stellar will warn in development mode if you omit the `description` option:

```typescript
withStellarDevtools('CartStore', {
  description: 'Manages the shopping cart — items, quantities, and checkout state.',
})
```

The warning is intentional. State shape, history, and field names can all be inferred from code — but *why a store exists and what it's responsible for* cannot. That's the one thing a developer or AI assistant cannot figure out without being told.

A useful description is one sentence. It names what the store manages and hints at its scope: what operations it owns, what it doesn't touch, and how it relates to other parts of the app.

---

## Monitoring HTTP traffic

Add `withHttpTrafficMonitoring()` to your `provideStellar()` call:

```typescript
// app.config.ts
import { provideStellar, withHttpTrafficMonitoring } from '@hypertheory/stellar-ng-devtools';

export const appConfig: ApplicationConfig = {
  providers: [
    provideStellar(
      withHttpTrafficMonitoring(),
    ),
  ],
};
```

This intercepts `window.fetch` and records every request — method, URL, status, duration, and response body (for JSON responses). Open the **HTTP** panel from the picker to see the full list in reverse chronological order.

More usefully, Stellar links HTTP responses to the state changes they caused. In the history list for a store, any snapshot that was triggered by an HTTP response shows a `← METHOD /path (status)` badge instead of a trigger label. This makes it easy to read a sequence like:

> click "Load" → GET /api/todos → state: loading=true → 200 OK → state: todos=[...], loading=false

To exclude requests you're not interested in (analytics pings, health checks), pass an `exclude` option:

```typescript
withHttpTrafficMonitoring({
  exclude: ['/analytics', /\/health$/],
})
```

---

## Recording a scenario

When you need to understand a specific interaction — not just the current state but the *sequence of events that led to it* — use the recorder.

In the picker, click **⏺ Rec**, perform the interaction you want to capture, then click **⏹ Stop & Export**.

The overlay switches to the **timeline view**:

- **Trigger lane** (top): a marker for each user action — orange for clicks, blue for NgRx events. Each marker is at the moment the action was captured.
- **HTTP lane**: a horizontal bar for each request, spanning from the moment the request was sent to the moment the response arrived. Bars are green for success, yellow for 4xx, red for 5xx or network errors. When multiple requests are in flight simultaneously, they stack into separate rows.
- **Store lanes** (bottom): one lane per registered store, with a dot for each state snapshot.

The causal connections are drawn as dashed lines: a click connects to the request it initiated (blue), and to any optimistic state updates it caused (orange). An HTTP response connects to the state snapshot it produced (green).

Click any node to inspect it — you'll see the URL and status code for HTTP bars, or the state delta for snapshot dots.

**Copy for AI** in the timeline header copies a formatted version of the recording to the clipboard — the same data as the downloaded file, but laid out as markdown with the format explanation and store context ahead of the graph. Paste it into a conversation and ask your question. The recording is self-contained: an LLM doesn't need any additional context to read it.

**↓ Export** downloads the JSON file. The downloaded file also embeds the format explanation and store context, so it's useful when sharing asynchronously or attaching to a ticket.

The **⏺ Timeline** chip in the picker lets you return to this view at any time during the session.

---

## Handing off to an AI

Stellar's data model is built around the idea that an AI coding assistant should be able to answer questions about your application's state without you having to narrate what's happening.

The quickest starting point is the browser console:

```js
window.__stellarDevtools.describe()
```

This returns a manifest of every registered store — names, descriptions, snapshot counts, and when each store registered (lazy-loaded stores appear here only after you visit their route). Share this output when you want an AI to orient itself quickly.

For current state across all stores, click **Copy all for AI** in the picker, or call:

```js
window.__stellarDevtools.snapshot()
```

For a specific causal question — "why did the cart total change when I clicked Remove?" or "what happened between these two state snapshots?" — a recording is the right artifact. Record the interaction, export the JSON, and paste it directly into the conversation. The directed graph format (nodes and edges) gives the AI explicit cause-and-effect structure rather than asking it to infer sequence from a flat log.

See the [API reference](/reference/stellar-ng-devtools/) for the full `window.__stellarDevtools` surface, including `history()`, `diff()`, and `http()`.
