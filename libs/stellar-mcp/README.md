# @hypertheory-labs/stellar-mcp

Model Context Protocol (MCP) server that exposes [Stellar Devtools](https://stellar.hypertheory-labs.dev) state, HTTP traffic, and causal recordings to AI coding agents — directly from a running dev app.

Eliminates the copy-paste step between the Stellar overlay and an AI assistant. Your agent calls `stellar_describe`, `stellar_snapshot`, or `stellar_ai_context` and gets sanitized live state from the app you're debugging.

**No Chrome. No Playwright. No browser automation.** The MCP server hosts a tiny WebSocket bridge on localhost; your dev app connects to it.

---

## How it fits

```
Agent (Claude Code, Copilot, ...)
  ↕  stdio (MCP protocol)
@hypertheory-labs/stellar-mcp           ← this package (Node.js CLI)
  ↕  WebSocket on localhost:4280/__stellar  (the bridge)
Your running dev app
        → withStellarBridge()           ← @hypertheory-labs/stellar-ng-devtools
        → window.__stellarDevtools      (overlay UI, unchanged)
```

The MCP server boots a WS server on `127.0.0.1:4280/__stellar`. Your Angular app connects to it from `provideStellar(withStellarBridge())` during bootstrap. State pushes app → MCP on every store change; mutations (`record.start`, `save`) and AI-formatter calls round-trip via RPC. Sanitization runs upstream in `withStellarDevtools(...)` so every value the agent sees is already scrubbed.

## Install

```bash
npm install --save-dev @hypertheory-labs/stellar-mcp @hypertheory-labs/stellar-ng-devtools
```

`stellar-ng-devtools` must be a peer because both packages share a runtime contract — the bridge protocol shapes and the `window.__stellarDevtools` API.

## Run

1. Add `withStellarBridge()` to your `provideStellar(...)` call:

   ```ts
   import {
     provideStellar,
     withNgrxSignalStoreTools,
     withHttpTrafficMonitoring,
     withStellarBridge,
   } from '@hypertheory-labs/stellar-ng-devtools';

   export const appConfig: ApplicationConfig = {
     providers: [
       provideStellar(
         withNgrxSignalStoreTools(),
         withHttpTrafficMonitoring(),
         withStellarBridge(),
       ),
     ],
   };
   ```

2. Configure your agent. For Claude Code, add `.mcp.json` at your repo root:

   ```json
   {
     "mcpServers": {
       "stellar": {
         "command": "npx",
         "args": ["@hypertheory-labs/stellar-mcp"]
       }
     }
   }
   ```

3. Start your dev server and your agent. That's it. The bridge auto-reconnects in either direction — the order doesn't matter.

### Options

| Flag | Default | Env |
|---|---|---|
| `--port <n>` | `4280` | `STELLAR_MCP_PORT` |
| `--host <name>` | `127.0.0.1` (loopback only) | `STELLAR_MCP_HOST` |

If you change `--port`, match it on the app side: `withStellarBridge({ url: 'ws://localhost:4281/__stellar' })`.

## Tools

| Tool | When the agent calls it |
|---|---|
| `stellar_describe` | First call — orient in an unfamiliar app. Lists every registered store with description, snapshot count, and instance metadata. |
| `stellar_snapshot` | Read current state, with optional `name` and `instance` selectors. |
| `stellar_history` | Read the most recent N state snapshots for a store. Each entry includes trigger, route, and any linked HTTP event. |
| `stellar_diff` | Just the last two snapshots — quickest answer to "what changed?". |
| `stellar_http_traffic` | List captured fetch traffic. Filter by method, URL substring, or `onlyErrors=true`. |
| `stellar_recording` | Start / stop / status of causal recording sessions. Stop returns the directed graph (`format: "json"` default, or `format: "markdown"`). |
| `stellar_ai_context` | Pre-formatted markdown handoff document — combines stores + HTTP with cross-references. Use for embedding in PR descriptions or bug reports. |

Every tool has a strict input schema (zod), a detailed `description` for agent decision-making, and consistent error responses (text content with `isError: true` + actionable hints).

## Programmatic API

For embedding in a custom transport, IDE plugin, or test harness:

```ts
import {
  BridgeServer,
  createStellarMcpServer,
  startStdioServer,
} from '@hypertheory-labs/stellar-mcp';

// Boot the bridge — this is what the CLI does internally.
const bridge = new BridgeServer({ port: 4280 });
await bridge.listen();

// Start a stdio MCP server backed by the bridge.
const { shutdown, tools } = await startStdioServer(bridge);

// Or build the server and choose your own transport.
const { server } = createStellarMcpServer(bridge);
```

## Architecture notes

### Why a WebSocket bridge instead of CDP / Playwright

Earlier prototypes used Chrome DevTools Protocol via `playwright-core` to attach to a running browser tab and read `window.__stellarDevtools` through `page.evaluate()`. That worked, but it required: a Chromium binary somewhere, a `--remote-debugging-port` flag at browser launch, and the user remembering which Chrome window the MCP was supposed to attach to.

A push-based WebSocket inverts the constraint: the dev app is the natural client (it has the data), the MCP is the natural server (it lives outside the browser anyway). One TCP socket on localhost replaces a browser-automation subsystem.

### Hub-of-one

Only one app connection is meaningful at a time. If a second app connects (page reload, duplicate tab), the previous connection is replaced. This is the right shape for a developer's machine: one running dev app, one MCP, one consumer agent.

### Reads come from a mirror, mutations are RPC

`BridgeServer` caches the last `BridgeState` it received from the app. `describe()`, `snapshot()`, `history()`, `diff()`, and `http()` answer from the cache — no round-trip. `record.start`, `record.stop`, `save`, and the `formatForAI.*` calls round-trip via RPC because they need to run code in the app process.

### Single source of truth for AI formatters

The app already runs `formatStoreForAI`, `formatAllStoresForAI`, `formatHttpEventsForAI`, and `formatRecordingForAI` for the overlay's "Copy for AI" buttons. Rather than duplicate that code into a Node-side module, those functions are reachable through the bridge protocol's RPC channel. The agent gets exactly the same markdown a developer pastes from the overlay. When new formatters land in `stellar-ng`, they appear on the MCP surface automatically — no second update, no drift.

### Why a `StellarClient` interface

Tools depend on `StellarClient`, never on `ws` or HTTP. Unit tests substitute a fake; the real `BridgeServer` is used for end-to-end protocol tests. The interface mirrors `StellarDevtoolsApi` from `@hypertheory-labs/stellar-ng-devtools` with three deliberate adaptations: every method returns a `Promise` (network boundary), `snapshot()` is split into `snapshot()` / `snapshotByName()` for cleaner per-call types, and `record.isRecording()` is a first-class method instead of a `describe()` field read.

### `defineTool` and the input schema contract

Each tool is built with `defineTool({ name, title, description, inputShape, handler })`. `inputShape` is a plain Zod raw shape (`{ field: z.string(), ... }`). The handler's `input` parameter is inferred from the shape, and the same shape is what the MCP SDK's `registerTool` accepts. There are no `as any` casts in `server.ts` — the type contract runs end to end.

## Tests

```bash
npm test
```

Unit tests cover: tools (with fake `StellarClient`), config parsing, error mapping, MCP server registration / round-trip over in-memory transport, and the full bridge protocol via `bridge-server.spec.ts` (real WebSockets, in-test fake app — no browser anywhere).

## License

MIT
