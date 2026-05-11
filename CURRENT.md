# Current Work

A short-lived document. Read this at the start of a session to orient quickly.
Updated at the end of every session via `/capture`.

---

## Just landed (this session)
- **`@hypertheory-labs/stellar-mcp` package shipped** — Node MCP server on `feature/stellar-mcp`. Hosts a WS bridge on `localhost:4280/__stellar`; Angular app connects via `withStellarBridge()`. Exposes `stellar_describe`, `stellar_snapshot`, `stellar_history`, `stellar_diff`, `stellar_http_traffic`, `stellar_recording`, `stellar_ai_context` to AI agents over stdio. Sanitization runs upstream — no raw state crosses the wire.
- **`withStellarBridge()` added to `stellar-ng` public API** — auto-reconnects with backoff; bridge protocol is the single source of truth (`bridge-protocol.ts` shared by app and MCP). `stellar-ng` bumped to v0.1.0 to reflect the new public surface.
- **`StellarDevtoolsApi` typed contract** — `libs/stellar-ng/src/lib/stellar-devtools-api.ts` is the canonical type for `window.__stellarDevtools`; consumers (overlay, MCP `BridgeServer`, e2e tests) all depend on it.
- **AI-formatter functions exported** — `formatStoreForAI`, `formatHttpEventsForAI`, `formatRecordingForAI`, `formatAllStoresForAI` re-exported from `stellar-ng` for consumers writing custom Angular tooling that wants the same markdown shape without going through `window`.
- **Connecting AI tools guide** — `apps/docs/src/content/docs/guides/connecting-ai-tools.md`. Side-by-side Claude Code / VS Code (Copilot agent mode) / Codex CLI configs, plus the "one tool at a time" port-4280 caveat and troubleshooting for the working-directory + port-binding silent-failure modes.
- **Repo discoverability for stellar-mcp** — added to root `README.md` packages table, workspace tree, and `nx build`/`test` examples. CONTRIBUTORS.md flags the local-build prerequisite for AI tooling and explains the workspace dependency-pinning band-aids (`overrides` + tsconfig `paths` for `@ngrx/signals`).
- **Verify-bridge smoke test** — `scripts/verify-bridge.mjs` connects to a running stellar-mcp as a fake app, pushes a synthetic state, and exercises the RPC channel. Useful manual check before publishing.
- **PR hygiene fixes** — `nx build stellar-mcp` switched from `tsc` to `tsup` (was producing a broken dist), `@nx/nx-win32-x64-msvc` removed from root deps (Windows-only binding accidentally added — was breaking Cloudflare Pages builds), LICENSE file added to `libs/stellar-mcp/`.

## Just landed (prior session)
- **`@hypertheory-labs/sanitize` published to npm** — v0.0.1 live at npmjs.com
- **`@hypertheory-labs/stellar-ng-devtools` published to npm** — v0.0.1 live at npmjs.com (now bumped to v0.1.0 locally for the stellar-mcp peer-dep contract)
- **Public repo live** — `github.com/hypertheory-labs/stellar`; private files stripped via `/sync-public` skill
- **Package scope renamed** — `@hypertheory/` → `@hypertheory-labs/` across all files
- **Hosting decided** — Cloudflare Pages for docs + demo (static), k8s cluster reserved for server-side workloads
- **`demo` build config** — `nx build demo-ng --configuration demo` for Cloudflare Pages deploy (MSW on, production settings)
- **`_redirects` file** — SPA routing for Cloudflare Pages
- **7 design docs promoted** to `apps/docs/explainers/`: ai-accessibility, use-cases, clean-code-for-ai, library-ai-context, causal-graph-and-source-access, causal-event-stream, sanitize-design
- **Sanitize reference page** — replaced empty stub with real quick-reference table
- **Library READMEs** — replaced Angular CLI boilerplate with real content
- **`/sync-public` skill** — private→public repo sync workflow
- **TDR: Going Public — Infrastructure Decisions** — `explainers/going-public-infrastructure-decisions.md`

## Just landed (prior session)
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
- **Timeline view in overlay** — stop recording → shows timeline instead of auto-downloading. Trigger lane (click=orange, ngrx-event=blue), HTTP lane (greedy row assignment, status-coloured bars, label inside if wide enough), per-store snapshot lanes (purple dots), dashed causal edges. Click any node for details. Export button downloads JSON.
  - Key files: `libs/stellar-ng/src/lib/timeline.utils.ts`, `libs/stellar-ng/src/lib/stellar-timeline.component.ts`
- **Trigger dedup fix** — 500ms → 50ms window in `recording.service.ts`. The 500ms window was merging rapid clicks on the same button label into one trigger node.
- **Products demo a11y** — removed `[disabled]` from Add button; `add()` uses `Product-<timestamp>` fallback, doesn't clear name field, enabling rapid-click parallel request demos.
- **MSW + outbox demo** — `ProductsStore` with add/update/delete, dead-letter queue, in-flight badge; `/products` route in demo app
- **Self-describing recordings** — `RecordingSession` now carries `description` (compact LLM format explanation) and `storeContext` (store name → description for stores in the recording). `formatRecordingForAI()` emits markdown with header, store context, format, and graph JSON. "Copy for AI" button in timeline header.
- **`⏺ Timeline` chip in picker** — `lastSession` signal on `RecordingService` persists the session for app lifetime; chip in picker navigates back to timeline at any time.
- **Docs sprint** — `guides/using-stellar.md`, `guides/working-with-ai.md` (sample prompts including CodeTour generation), `explainers/pair-programming-with-ai.md` ("the description field is its seed syllable"), reference updated with `description`/`storeContext` fields, sample "Copy for AI" output in using-stellar.
- **Showcase app (`/showcase`)** — three reproducible scenarios in demo-ng: outbox pattern, race condition (stale-closure bug + chaos mode), error path (forced 500s + chaos mode). Scenario landing page with all six planned scenarios as cards including the suggested AI prompt. MSW chaos infrastructure (`__mocks__/chaos.ts`, `/api/__dev/chaos`, `/api/__dev/reset`). `NaiveProductsStore` with intentional stale-closure bug for race condition demo.
- **`docs/demo-plan.md`** — living inventory of all showcase scenarios with requirements, status, and shared infrastructure table.
- **TDR: Designing reproducible demos** — `apps/docs/src/content/docs/explainers/designing-reproducible-demos.md`

## Just landed (prior session — docs sprint)
- **Explainer cleanup** — 22 → 17 explainers; 5 removed (general philosophy → blog), 1 trimmed, `keeping-principles-alive` replaced with three-artifact continuity doc
- **Blog posts (9)** — extracted from explainers + new originals; `stop-giving-your-ai-a-role`, `designing-for-two-audiences`, `pair-programming-with-ai` among them; blog post `making-video-legible-to-ai` added this session
- **`docs/` cleanup** — 11 historical artifacts removed
- **AI Accessibility reframe** — `ai-accessibility.md` now explicit: accessibility = removing unnecessary exclusivity, never about deficit
- **NgRx Events async demo** — `BookSearchEventsStore` + `/events` route; `withReducer` + `withEventHandlers` + debounce/switchMap against Open Library API
- **CONTRIBUTORS.md** — philosophy-first, non-negotiables named
- **89/89 Playwright tests passing** — verified on Ubuntu headless; barrier tests confirmed
- **Dependabot alerts assessed** — all dev toolchain, zero published package risk; fix plan: `npm audit fix` + `ng update` tomorrow with pipeline work
- **TDR: Documentation architecture** — `explainers/documentation-architecture.md`
- **TDR: NgRx Events integration** — `explainers/ngrx-events-integration.md`; what the recording revealed, causal gap, future Dispatcher integration point
- **Demo video live** — Vimeo (1179648231); embedded on docs landing page with timecoded chapter guide and GPT-5.4 testimonial blurb
- **`reference/demo-video.md`** — timecoded AI-legible description converted from DaVinci Resolve EDL; GPT-5.4 responses preserved verbatim; auto-promoted in `llms.txt` via `reference/` autogenerate
- **TDR: Video legibility** — `explainers/video-legibility.md`; placement rationale, format decision, why GPT-5.4 responses are preserved verbatim

## Next
1. **CI/CD pipeline + `ng update`** — GitHub Actions workflows drafted in `docs/publish-checklist.md`; copy-paste job. Fix Dependabot chain at same time.
2. **Playwright tests** — `/events` route coverage; timeline mode; "Copy for AI" button; chaos mode reset on navigation
3. **Showcase scenarios: coming-soon three** — missing test coverage, story card verification
4. **Testimonials page** — build when 4–5 quotes collected; GPT-5.4 quote captured; GPT-5 quote from blog post captured

## Design questions open
- WebSockets and SSE — parked until fetch is solid
- Outbox pattern demo — perfect case study for causal graph view; Jeff has an existing implementation
- Angular-native Tanstack Query — `withQuery()` as a signal store feature; natural Stellar integration point; separate design session needed
- **Timing visibility / passive vs. active observer** — the 300ms `recentHttpEventId` window is a timing bet with no external visibility. If Angular's effect runs >300ms after the HTTP response, `httpEventId` is silently absent. Bigger question: should the devtools surface the *gap* between "HTTP response landed" and "state updated"? That gap is valuable performance information in its own right — not just a diagnostic for our causal linking. Don't solve yet; let it fester.

## Parked / not this sprint
- **`/capture-scenario` skill** — after a debugging session where Stellar + AI found a bug, the skill extracts the generalizable pattern (what structural condition caused it, what the recording showed, what the fix was) and scaffolds a new scenario component following the established showcase template. Two artifacts: the skill prompt (~markdown file) and a scenario stub template. Near-term, low build cost. See `docs/demo-plan.md` for the longer version of the idea including the "LLM communal knowledge" angle (pattern library accessible via llms.txt — needs more thought on curation and hosting before building).
- `withNgrxReduxStoreTools()` — classic NgRx/Store users have Redux DevTools; low demand signal
- `createSanitizer()` factory (Tier 3 custom aliases)
- Production-mode gating of the overlay
- **Bug: panel clips at high browser zoom** — good first GitHub issue
- Tree view for deeply nested state
- **OpenTelemetry adapter** — RecordingSession → OTel trace export. Our directed graph is richer than OTel's tree (multi-cause nodes don't map to single parent_id), so the right move is an adapter, not aligning the data model. Worth asking around on demand before building. Mapping: RecordingSession → Trace, http-request+response pair → CLIENT span, state-snapshot/click/ngrx-event → INTERNAL spans.
- **Session replay via HTTP re-injection** — a `withSessionRecording` that captures sanitized request/response bodies and generates MSW handlers, letting the app re-derive state from real inputs. Better framing than "time travel": the cause, not the output. Sanitization of response bodies is load-bearing. Parked pending community signal — candidate for a GitHub discussion. TDR: `explainers/time-travel-and-session-replay.md`.
