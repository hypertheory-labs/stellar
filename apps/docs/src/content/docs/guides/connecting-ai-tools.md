---
title: Connecting AI tools
description: Configure Claude Code, VS Code (Copilot agent mode), and Codex to talk to the stellar-mcp server so your AI agent can read live state from a running dev app.
---

The Stellar MCP server is the same Node CLI for every agent: `npx @hypertheory-labs/stellar-mcp`. Each tool just looks for it in a different config file with a slightly different shape. Once any one of them is wired up, the agent gets `stellar_describe`, `stellar_snapshot`, `stellar_history`, `stellar_diff`, `stellar_http_traffic`, `stellar_recording`, and `stellar_ai_context` — all reading sanitized live state from your running app.

## Before you start

Your app must include `withStellarBridge()` in its `provideStellar(...)` call. Without it, the MCP server starts but has no app to mirror state from:

```typescript
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

The bridge auto-reconnects, so the MCP server and the dev app can start in either order.

## Claude Code

Create `.mcp.json` at the **root of the directory you open Claude Code from** (not necessarily the repo root — Claude Code only reads `.mcp.json` from its working directory):

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

Reload the session. Claude will spawn the server and the `stellar_*` tools become available. You can verify with `/mcp` inside Claude Code.

## VS Code (Copilot agent mode)

Create `.vscode/mcp.json` at the workspace root:

```json
{
  "servers": {
    "stellar": {
      "type": "stdio",
      "command": "npx",
      "args": ["@hypertheory-labs/stellar-mcp"]
    }
  }
}
```

Open the agent mode chat panel and the server starts on first tool call. Note the field is `servers` (not `mcpServers`) and each entry needs an explicit `"type": "stdio"` — VS Code's schema differs from Claude Code's.

## Codex CLI

Add a section to `~/.codex/config.toml`:

```toml
[mcp_servers.stellar]
command = "npx"
args = ["@hypertheory-labs/stellar-mcp"]
```

Codex's MCP config is user-scoped, not project-scoped — the same entry serves every repo you use it from.

## One tool at a time

The MCP server binds TCP port `4280` so your dev app can connect to it. Only one process can hold that port. Each AI tool spawns its **own** child instance of the server when you start a session with it, so:

- If two tools (e.g. Claude Code and Copilot) try to start the server at the same time, the second spawn silently fails to bind the port and the agent ends up with no tools loaded.
- If you start the MCP server manually in a terminal and *then* launch an AI tool, the tool's spawn fails the same way.

**Use one AI tool at a time.** When you switch tools, kill any running stellar-mcp processes first:

```bash
# Find the process holding port 4280
netstat -ano | grep :4280     # Windows
lsof -i :4280                  # macOS / Linux

# Then kill it by PID
taskkill /PID <pid> /F         # Windows
kill <pid>                     # macOS / Linux
```

Multi-agent simultaneous access is on the roadmap (an SSE transport so additional clients can attach to a running instance), but it's not shipped yet.

## Verifying the connection

Once the agent is configured, ask it to call `stellar_describe`. You should get back a manifest listing every store registered in your dev app, with descriptions, snapshot counts, and registration timestamps. If you get an empty store list, the MCP server is up but the app hasn't connected — check that `withStellarBridge()` is in your `provideStellar(...)` call and that the dev server is running.

## Troubleshooting

**Tools don't appear after configuring.** The most common cause is that the agent tried to start the server while port 4280 was already taken. Kill any stray stellar-mcp processes (see above) and reload the agent session.

**`.mcp.json` is in the repo but Claude Code doesn't see it.** Claude Code reads `.mcp.json` from its working directory, not the git root. If you opened Claude Code from a parent directory, either move/copy `.mcp.json` to that directory (with the path adjusted) or open Claude Code with the repo as the working directory.

**Port collision with another service.** Override the bridge port on both sides:

```json
{
  "mcpServers": {
    "stellar": {
      "command": "npx",
      "args": ["@hypertheory-labs/stellar-mcp", "--port", "4281"]
    }
  }
}
```

Match it on the app: `withStellarBridge({ url: 'ws://localhost:4281/__stellar' })`.

**Agent says the tool failed with a protocol version mismatch.** The bridge protocol version in the app and in the MCP must match. Update both `@hypertheory-labs/stellar-ng-devtools` and `@hypertheory-labs/stellar-mcp` to the same release.
