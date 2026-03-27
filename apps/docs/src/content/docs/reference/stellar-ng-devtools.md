---
title: stellar-ng-devtools API
description: API reference for @hypertheory-labs/stellar-ng-devtools — the Angular NgRx Signal Store devtools library.
---

## Setup

```ts
// app.config.ts
import { provideStellar, withHttpTrafficMonitoring } from '@hypertheory-labs/stellar-ng-devtools';

export const appConfig: ApplicationConfig = {
  providers: [
    provideStellar(
      withHttpTrafficMonitoring(),
    ),
  ],
};
```

```html
<!-- app.component.html -->
<stellar-overlay />
```

```ts
// in any NgRx Signal Store
withStellarDevtools('StoreName', {
  description: 'One sentence: what this store manages and why.',
  sourceHint: 'src/app/my.store.ts',
  sanitize: sanitizeConfig<MyState>({ secretField: 'omitted' }),
})
```

---

## RegisterOptions

Options passed to `withStellarDevtools(name, options)`.

| Field | Type | Notes |
|---|---|---|
| `description` | `string` | **Recommended.** One sentence describing what this store manages. The only metadata that cannot be derived from code. Omitting it triggers a dev-mode warning. |
| `sourceHint` | `string` | File path of the store, relative to the project root. Helps AI tools locate the source. |
| `typeDefinition` | `string` | Inline TypeScript interface string for the state shape. |
| `sanitize` | `SanitizationConfig<T>` | Field-level sanitization rules. Merged with auto-redaction of common sensitive field names. |

---

## window.__stellarDevtools

Available after `provideStellar()` runs. Designed as a stable API for AI coding assistants and browser console use.

### describe()

Returns a manifest of the current devtools state. **Call this first** when orienting an AI coding assistant.

```js
window.__stellarDevtools.describe()
```

```json
{
  "version": "1.0",
  "stores": [
    {
      "name": "TodosStore",
      "description": "Manages the todo list — fetch, add, toggle completion.",
      "snapshotCount": 4,
      "registeredAt": 0,
      "sourceHint": "apps/demo-ng/src/app/todos.store.ts"
    }
  ],
  "api": ["snapshot", "history", "diff", "http", "record", "describe"],
  "recordingActive": false,
  "caveat": "Lazy-loaded routes may register additional stores. Navigate to all relevant routes before calling describe() for full coverage."
}
```

`registeredAt` is milliseconds since app start. A store with `registeredAt: 4500` registered 4.5 seconds after app load — it is lazy-loaded and will only appear after its route is visited.

### snapshot(name?)

```js
window.__stellarDevtools.snapshot()           // all stores
window.__stellarDevtools.snapshot('TodosStore') // one store with full history
```

Returns `StoreEntry | StoreEntry[]`. Each `StoreEntry` has `name`, `description`, `history: StateSnapshot[]`, and `registeredAt`.

Each `StateSnapshot` has `timestamp`, `state`, `route`, `inferredShape`, `trigger`, and optionally `httpEventId` (links to an HTTP response that caused this snapshot).

### history(name, n?)

```js
window.__stellarDevtools.history('TodosStore', 5) // last 5 snapshots
```

Returns the last `n` snapshots (default 10) for the named store, or `null` if the store doesn't exist.

### diff(name)

```js
window.__stellarDevtools.diff('TodosStore')
```

Returns `{ from: StateSnapshot, to: StateSnapshot }` for the two most recent snapshots, or `null` if fewer than 2 snapshots exist.

### http()

```js
window.__stellarDevtools.http()
```

Returns `HttpEvent[]` — all captured HTTP requests and responses since the app started. Each `HttpEvent` has `id`, `method`, `url`, `status`, `duration`, `trigger` (what caused the request), and `responseBody`.

The `trigger` on an `HttpEvent` and the `httpEventId` on a `StateSnapshot` form the causal chain: click → HTTP request → HTTP response → state change.

### record

```js
window.__stellarDevtools.record.start('my scenario')
// ... do the interaction ...
window.__stellarDevtools.record.stopAndDownload()  // builds graph + triggers download
// or:
const session = window.__stellarDevtools.record.stop()  // returns RecordingSession
```

`stop()` returns a `RecordingSession` — a directed graph with `nodes` (click, ngrx-event, http-request, http-response, state-snapshot) and `edges` (caused, initiated, resolved, produced). Arrays in state deltas are summarized to their length.

`RecordingSession` includes two fields for LLM consumers:
- `description` — a compact format explanation embedded in every recording, covering node types, edge labels, and delta encoding
- `storeContext` — a `Record<string, string>` mapping store names to their `description` from `withStellarDevtools`, filtered to stores that appear in the recording

When using the overlay's **⏺ Rec** / **⏹ Stop & Export** buttons, stopping a recording opens the **timeline view** in the panel before downloading. The timeline shows triggers, HTTP bars, and store snapshot dots with causal edges connecting them. **Copy for AI** in the timeline header copies a markdown-formatted version of the recording (format explanation + store context + graph JSON) to the clipboard, ready to paste into a conversation. **↓ Export** downloads the self-describing JSON. The **⏺ Timeline** chip in the picker returns to this view for the lifetime of the session.

---

## Recommended AI handoff workflow

1. Navigate to the relevant routes (lazy-loaded stores only appear after their route is visited)
2. Exercise the interactions you want to discuss
3. Call `window.__stellarDevtools.describe()` to orient the AI
4. Call `window.__stellarDevtools.snapshot()` or use **Copy all for AI** in the overlay for full state + history

For a complete causal trace of a specific scenario:

```js
window.__stellarDevtools.record.start('load and add todo')
// click Load todos, wait for response, click Add
window.__stellarDevtools.record.stopAndDownload()
// paste the downloaded JSON to the AI
```

---

## Sample CLAUDE.md snippet

Add this to your project's `CLAUDE.md` to orient Claude automatically:

```markdown
This app uses Stellar devtools (@hypertheory-labs/stellar-ng-devtools).
To orient: call window.__stellarDevtools.describe() in the browser console.
Full API: window.__stellarDevtools has snapshot(), history(), diff(), http(), record.
Exercise the app before calling describe() — lazy-loaded stores only appear after their route is visited.
```
