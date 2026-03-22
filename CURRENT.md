# Current Work

A short-lived document. Read this at the start of a session to orient quickly.
Updated at the end of every session via `/capture`.

---

## Just landed
- "Copy for AI" clipboard button — per-store and all-stores, AI-readable markdown format
- JSON syntax highlighting in state view (Catppuccin Mocha, inline styles)
- Default panel width 80dvw, resizable column divider between history and state pane
- Plugin architecture: `provideStellarDevtools(...features)` + `withNgrxSignalStoreTools()`
- Library build fixed — both packages build cleanly for npm-link / publish
- NgRx events API wired as trigger source: trigger now shows e.g. `[Counter] Increment — click: "+"`
- Demo counter store migrated to `withReducer` + `eventGroup` as live example
- Three deployment contexts named and designed: Exploratory Dev, Testing, Runtime Diagnostics
- Session tracking: `CURRENT.md`, `docs/sessions/`, `/capture` skill updated

## Next
1. **Playwright tests** — `window.__stellarDevtools` API contract, trigger field, sanitization (load-bearing, currently untested), "Copy for AI" format
2. **`withHttpTrafficMonitoring()`** — intercept `fetch`, surface in existing UI and AI context; design question: augment state view with causal HTTP links vs. dedicated HTTP panel (probably both)
3. Filesystem snapshot write — `.stellar/snapshot.json` at project root

## Design questions open
- HTTP view: augment existing state timeline with fetch causality, or separate panel, or both?
- WebSockets and SSE — explicitly parked, revisit when fetch is solid

## Parked / not this sprint
- `withNgrxReduxStoreTools()` — classic NgRx/Store users have Redux DevTools; low demand signal needed before building
- MCP server (filesystem write first)
- `createSanitizer()` factory (Tier 3 custom aliases)
- Production-mode gating of the overlay
- Causal event stream / `withPlaywrightObserver()` (longer road — but HTTP monitoring is the on-ramp)
- **Bug: panel clips at high browser zoom** — good first GitHub issue when issues are opened
- Tree view for deeply nested state (need a demo store with big state first)
