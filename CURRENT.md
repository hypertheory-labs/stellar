# Current Work

A short-lived document. Read this at the start of a session to orient quickly.
Updated at the end of every session via `/capture`.

---

## Just landed
- **`describe()` on `window.__stellarDevtools`** — structured manifest: store list with `description`, `snapshotCount`, `registeredAt` (lazy-loading visibility), `sourceHint`, API list, `caveat`
- **`description` field on `RegisterOptions`** — JSDoc, dev-mode warning if absent, populated on all demo stores
- **`registeredAt` on `StoreEntry`** — ms since app start; makes lazy-loading incompleteness visible to AI consumers
- **`window.__stellarDevtools` API reference** — full reference doc at `apps/docs/src/content/docs/reference/stellar-ng-devtools.md`, feeds `llms_full.txt`; includes CLAUDE.md snippet for consumers
- **Design commitments in CLAUDE.md** — five explicit commitments with pushback instructions; TDRs provide the reasoning, CLAUDE.md provides the mandate
- **`/review` skill updated** — now includes design commitment drift check, TDR assumption tracking, and test coverage gap audit
- **TDR: Making Stellar Legible to AI** — `apps/docs/src/content/docs/explainers/making-stellar-legible-to-ai.md`
- **TDR: Keeping Principles Alive Across Sessions** — `apps/docs/src/content/docs/explainers/keeping-principles-alive.md`
- **Recording session** — `RecordingService.start()` / `stop()` + `⏺ Rec` / `⏹ Stop & Export` buttons in overlay; `stop()` builds a directed graph `RecordingSession` and downloads it as JSON
- **`window.__stellarDevtools.record`** — `record.start(name?)`, `record.stop()`, `record.stopAndDownload()`
- `RecordingSession`, `RecordingNode`, `RecordingEdge`, `RecordingNodeType` types in public API
- `docs/use-case-log.md` — five use cases + evidence principle + Mentat framing
- `docs/sample-snapshot.json` + `docs/sample-ai-context.md` — realistic sample output for visualization
- `apps/docs/src/content/docs/explainers/inside-the-codebase.md` — pinned TDR (sidebar.order: 0)
- **Playwright e2e suite** — 39 tests: API contract, sanitization (all operators), trigger field, AI format validity
- **`withHttpTrafficMonitoring()`** — `window.fetch` interceptor, causal context captured at call time
- **Causal linking** — `httpEventId` on `StateSnapshot`; history items show `← GET /path (200)` badge
- **`window.__stellarDevtools.http()`** — returns full `HttpEvent[]`
- **TodosStore demo** — jsonplaceholder fetch to exercise HTTP monitoring end-to-end

## Just landed (continued)
- **Playwright tests for recording** — 21 tests: API surface, session shape, state capture, edge wiring (caused/resolved/produced), HTTP capture with mocked routes; `apps/demo-ng/e2e/recording.spec.ts`
- **`withHttpTrafficMonitoring({ exclude })` option** — string (substring) or RegExp patterns; checked before trigger context capture so filtered requests don't consume the click buffer; `HttpTrafficMonitoringOptions` exported from public API. `StellarHttpDefaults.CommonIgnores` constant parked for later.
- **Note:** e2e coverage for the exclude behavior needs a config-injection test harness we don't have yet. Logic is a trivial pure function; gap is acceptable for now.

## Next
1. **Playwright tests for HTTP monitoring + describe()** — `http()` shape, `httpEventId` on snapshots, `describe()` output shape including `description` and `registeredAt`
3. **Causal graph view in overlay** — proper visualization of the recording; outbox pattern or query cache as demo candidate
4. ~~**`withHttpTrafficMonitoring()` options**~~ — done (see Just landed)

## Design questions open
- WebSockets and SSE — parked until fetch is solid
- Outbox pattern demo — perfect case study for causal graph view; Jeff has an existing implementation
- Angular-native Tanstack Query — `withQuery()` as a signal store feature; natural Stellar integration point; separate design session needed
- **Timing visibility / passive vs. active observer** — the 300ms `recentHttpEventId` window is a timing bet with no external visibility. If Angular's effect runs >300ms after the HTTP response, `httpEventId` is silently absent. Bigger question: should the devtools surface the *gap* between "HTTP response landed" and "state updated"? That gap is valuable performance information in its own right — not just a diagnostic for our causal linking. Don't solve yet; let it fester.

## Parked / not this sprint
- `withNgrxReduxStoreTools()` — classic NgRx/Store users have Redux DevTools; low demand signal
- MCP server
- `createSanitizer()` factory (Tier 3 custom aliases)
- Production-mode gating of the overlay
- **Bug: panel clips at high browser zoom** — good first GitHub issue
- Tree view for deeply nested state
- **OpenTelemetry adapter** — RecordingSession → OTel trace export. Our directed graph is richer than OTel's tree (multi-cause nodes don't map to single parent_id), so the right move is an adapter, not aligning the data model. Worth asking around on demand before building. Mapping: RecordingSession → Trace, http-request+response pair → CLIENT span, state-snapshot/click/ngrx-event → INTERNAL spans.
