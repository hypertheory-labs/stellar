---
title: stellar-ng-devtools API
description: API reference for @hypertheory-labs/stellar-ng-devtools — the Angular NgRx Signal Store devtools library.
---

## Setup

```ts
// app.config.ts
import {
  provideStellar,
  withHttpTrafficMonitoring,
  withStellarBridge,
} from '@hypertheory-labs/stellar-ng-devtools';

export const appConfig: ApplicationConfig = {
  providers: [
    provideStellar(
      withHttpTrafficMonitoring(),
      // Optional — connect to @hypertheory-labs/stellar-mcp so AI agents can
      // query live state via MCP tools. Defaults to ws://localhost:4280/__stellar.
      withStellarBridge(),
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
  "version": "1.1",
  "stores": [
    {
      "name": "TodosStore",
      "description": "Manages the todo list — fetch, add, toggle completion.",
      "snapshotCount": 4,
      "registeredAt": 0,
      "destroyedAt": null,
      "sourceHint": "apps/demo-ng/src/app/todos.store.ts",
      "instances": [
        { "id": "i3", "registeredAt": 0, "destroyedAt": null, "snapshotCount": 4 }
      ]
    }
  ],
  "api": ["snapshot", "history", "diff", "http", "record", "describe"],
  "recordingActive": false,
  "caveat": "Lazy-loaded routes may register additional stores. Navigate to all relevant routes before calling describe() for full coverage. A store name may have multiple instances over a session — each route mount or component-providers scope creates a new one. snapshot()/history()/diff() default to the most recent instance; pass { instance: id } to select a specific one."
}
```

**Lifecycle fields (since 0.1.0).** A store *name* is identity; a store *registration* is an instance. The same name can produce multiple instances over a session — each route mount or `providers: [...]` scope creates a new one with its own `registeredAt`, optional `destroyedAt`, and history.

- `registeredAt` (top level) — milliseconds since app start for the most recent instance. Lazy-loaded stores have larger numbers.
- `destroyedAt` (top level) — `null` while at least one instance is active; otherwise the timestamp of the most recent destruction (the store has gone fully out of scope but is preserved for AI consumers).
- `snapshotCount` (top level) — total snapshot count across all instances of the name.
- `instances[]` — per-instance lifecycle and snapshot count, oldest first.

A store name with `instances.length > 1` has been re-mounted during the session. Each instance's `history` is its own — diffs and recordings should not be read across instance boundaries.

### snapshot(name?, options?)

```js
window.__stellarDevtools.snapshot()                              // all stores (latest instance per name)
window.__stellarDevtools.snapshot('TodosStore')                  // latest instance for one store
window.__stellarDevtools.snapshot('TodosStore', { instance: 'i2' }) // a specific historical instance
```

Returns `StoreEntry | StoreEntry[] | StoreInstance | null`.

A `StoreEntry` projection has `name`, `description`, `registeredAt`, `destroyedAt`, `history` (the most recent instance's), `instances[]`, and `sourceHint`. With no name, defaults to "latest active, falling back to latest destroyed" — a known store name always returns something useful for AI consumers, even after re-mount or unmount.

Each `StateSnapshot` has `timestamp`, `state`, `route`, `inferredShape`, `trigger`, and optionally `httpEventId` (links to an HTTP response that caused this snapshot).

### history(name, n?, options?)

```js
window.__stellarDevtools.history('TodosStore', 5)                  // last 5 from the latest instance
window.__stellarDevtools.history('TodosStore', 5, { instance: 'i1' }) // last 5 from a specific instance
```

Returns the last `n` snapshots (default 10) for the resolved instance, or `null` if the store doesn't exist.

### diff(name, options?)

```js
window.__stellarDevtools.diff('TodosStore')                  // latest instance, two most recent snapshots
window.__stellarDevtools.diff('TodosStore', { instance: 'i1' }) // within a specific instance
```

Returns `{ from: StateSnapshot, to: StateSnapshot }` for the two most recent snapshots within a single instance, or `null` if fewer than 2 snapshots exist. **Cross-instance diffs are deliberately not supported** — state is not continuous across re-mount, so the comparison would be meaningless.

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
A store name may have multiple `instances[]` if it was re-mounted (route or component-providers scoped); pass { instance: id } to snapshot/history/diff to inspect a specific one.
```

---

## withStellarBridge(options?)

Opens a WebSocket connection from the Angular app to a running `@hypertheory-labs/stellar-mcp` server. Once connected, state pushes automatically on every registry change — the AI agent's MCP tools always see the latest sanitized state without any developer action.

```ts
withStellarBridge()
// or with custom URL:
withStellarBridge({ url: 'ws://localhost:4281/__stellar' })
```

| Option | Default | Description |
|---|---|---|
| `url` | `ws://localhost:4280/__stellar` | WebSocket endpoint of the stellar-mcp server |

The bridge reconnects automatically with exponential backoff if the MCP server restarts or hasn't started yet — order of startup does not matter.

**Sanitization note:** `withStellarBridge()` only ever sees state that has already been sanitized by `withStellarDevtools()`. No raw state crosses the bridge wire.

See `@hypertheory-labs/stellar-mcp` for server setup and the full list of MCP tools.

---

## Stability

`@hypertheory-labs/stellar-ng-devtools` is pre-1.0. The shape of `window.__stellarDevtools`, `RecordingSession`, and the `describe()` manifest may change between minor versions until a 1.0 release commits to a stable contract. Changes are additive whenever possible (existing fields keep their meaning, new fields appear alongside) and significant changes get a TDR in [Explainers](/explainers/). AI consumers should re-read `describe()` rather than cache assumptions about the surface.

The current contract version is reported by `describe().version` (currently `1.1`). The version increments when the contract changes, separate from the package's npm version.
