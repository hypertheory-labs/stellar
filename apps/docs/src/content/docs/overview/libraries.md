---
title: The Libraries
description: An overview of the packages in the Stellar Devtools monorepo — what each one does and how they relate.
---

## `@hypertheory-labs/stellar-ng-devtools`

The Angular devtools library. Provides:

- `withStellarDevtools(name, options?)` — NgRx Signal Store feature that hooks into store state and feeds it to the registry
- `provideStellar(...features)` — sets up the `window.__stellarDevtools` API and the in-memory registry; accepts feature plugins
- `withHttpTrafficMonitoring()` — `window.fetch` interceptor with causal linking to the state changes each request produced
- `withStellarBridge(options?)` — connects the app to `@hypertheory-labs/stellar-mcp` over WebSocket; auto-reconnects with backoff
- `StellarOverlayComponent` — visual overlay mounted via `<stellar-overlay />` in your app template
- `sanitizeConfig<T>(config)` — typed helper for declaring per-store sanitization rules

**Peer dependencies:** `@angular/core`, `@angular/common`, `@ngrx/signals`

**Status:** functional. Full snapshot format (`inferredShape`, `trigger`, `httpEventId`) is implemented and stable.

---

## `@hypertheory-labs/sanitize`

A standalone, framework-agnostic sanitization library. Zero dependency on the devtools — usable in event sourcing pipelines, logging, or anywhere else sensitive values need to be transformed before leaving a trust boundary.

### What's implemented

**Named rules** (string literals):

| Rule | Effect |
|---|---|
| `'omitted'` | Removes the field entirely |
| `'redacted'` | Replaces with `[redacted]` |
| `'masked'` | Replaces characters with `*`, keeps length |
| `'hashed'` | Replaces with a SHA-style hash |
| `'lastFour'` | Keeps last 4 characters |
| `'firstFour'` | Keeps first 4 characters |
| `'email'` | Keeps domain, redacts local part |

**Semantic aliases** (map to the rules above): `'creditCard'`, `'debitCard'`, `'ssn'`, `'password'`, `'apiKey'`, `'token'`, `'secret'`, `'phoneNumber'`, `'emailAddress'`

**Parameterized operators**: `keepFirst(n)`, `keepLast(n)`, `truncate(n)`, `replace(fn)`

**Array combinator**: `arrayOf(config)` — applies a config to every element of an array field

**Zero-config layer**: `autoRedactConfig(state)` — scans top-level field names against the built-in blocklist and returns a `SanitizationConfig` automatically. Called by `withStellarDevtools` on every snapshot; explicit config always wins.

### Why sanitization is a prerequisite, not a feature

This is not primarily about regulatory compliance, though it satisfies that too. The specific concern is this: if a developer hands an AI assistant a raw state snapshot containing live user data, and that data contains adversarial text crafted to manipulate the AI's output, the sanitizer is a line of defense against that. Sanitization runs before any snapshot is recorded — redacted values never enter the history at all, not just hidden in the UI.

This is why sanitization shipped before export, before the clipboard feature, and before any AI-facing API surface. The order is not incidental.

---

## `@hypertheory-labs/stellar-mcp`

Model Context Protocol server that exposes Stellar Devtools state, HTTP traffic, and causal recordings to AI coding agents — directly from a running dev app.

Eliminates the copy-paste step between the Stellar overlay and an AI assistant. An agent calls `stellar_describe`, `stellar_snapshot`, or `stellar_ai_context` and gets sanitized live state without browser automation, without Chrome DevTools Protocol, and without the developer manually relaying anything.

**How it works:** The MCP server hosts a WebSocket on `localhost:4280/__stellar`. The Angular dev app connects to it via `withStellarBridge()` in `provideStellar(...)`. State pushes app → MCP on every store change; mutations and AI formatter calls round-trip via RPC. Every value the agent sees is already sanitized — that happens upstream in `withStellarDevtools(...)` before state reaches the registry.

**Tools:**

| Tool | Purpose |
|---|---|
| `stellar_describe` | Orient in an unfamiliar app — lists stores with descriptions, snapshot counts, instance metadata |
| `stellar_snapshot` | Read current state, with optional name and instance selectors |
| `stellar_history` | Most recent N snapshots for a store, with trigger, route, and HTTP links |
| `stellar_diff` | Last two snapshots — quickest answer to "what changed?" |
| `stellar_http_traffic` | Captured fetch traffic, filterable by method, URL, or errors only |
| `stellar_recording` | Start/stop causal recording sessions; stop returns the directed graph |
| `stellar_ai_context` | Pre-formatted markdown combining stores + HTTP with cross-references |

**Usage:** add `withStellarBridge()` to `provideStellar(...)`, then configure your agent:

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

**Peer dependency:** `@hypertheory-labs/stellar-ng-devtools` — both packages share the bridge protocol contract.

**Status:** functional. See [stellar-mcp README](https://github.com/hypertheory-labs/stellar/tree/master/libs/stellar-mcp) for full options and programmatic API.
