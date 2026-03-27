# /review — Stellar Housekeeping

Run a structured review of the project. Work through each section in order.
Report findings concisely. Clean sections get one line. Flag blocking issues separately.

---

## 1. Build health

Build both libraries:
- `npx nx build @hypertheory-labs/sanitize`
- `npx nx build @hypertheory-labs/stellar-ng-devtools`

Any failure is blocking. Report the full error.

---

## 2. TypeScript hygiene

Search `libs/` and `apps/demo-ng/src/` for:
- Explicit `any` type annotations (not in comments)
- `@ts-ignore` and `@ts-expect-error`
- `// TODO` and `// FIXME`

Report `file:line` for each finding.

---

## 3. Design commitment drift

Read the **Design Commitments — Enforce These** section in `CLAUDE.md`.
Then check the current code against each commitment:

- **`description` warning** — does `stellar-registry.ts` still warn in dev mode when `description` is absent? Is the warning suppressible by default?
- **Sanitization upstream** — does any export path (`snapshot()`, `http()`, recordings, `describe()`) expose raw unsanitized state?
- **`window.__stellarDevtools` stability** — have any existing method signatures changed shape without a versioning note?
- **Recording is a directed graph** — is `RecordingSession` still nodes + edges? Has anything flattened it?
- **`describe()` completeness** — does `describe()` still carry the lazy-loading caveat?

Report any drift as **blocking**. These are explicit commitments.

---

## 4. CLAUDE.md vs reality

Skim the **Current Implementation Status** section in `CLAUDE.md`.
Check: does it still match what's actually in the code?

- Anything listed as "to do" that has since shipped?
- Anything listed as done that's actually incomplete or removed?
- Any file paths that have moved?

---

## 5. CURRENT.md freshness

Read `CURRENT.md`. For each item in "Just landed":
- Is it actually in the code? (Spot-check one or two.)

For each item in "Next":
- Is it still the right priority, or has something unblocked / blocked it?

For each item in "Parked":
- Has any context changed that would move it back to active?

Flag anything that feels stale or misclassified.

---

## 6. TDR assumption tracking

Read `docs/use-case-log.md` and `apps/docs/src/content/docs/explainers/making-stellar-legible-to-ai.md`.

Both documents contain explicit assumptions marked for future testing:
- Has the `registeredAt` + caveat approach to lazy-loading been exercised against a real multi-route app? Any evidence it's insufficient?
- Has any use case from `use-case-log.md` moved from "imaginable" to "clearly buildable now"?

Not blocking — just flag anything that looks ready to move.

---

## 7. Test coverage gaps

Check `apps/demo-ng/e2e/` for spec files.
Are these areas covered by at least one test?
- `window.__stellarDevtools.describe()` shape and fields
- `registeredAt` on store entries
- `description` appearing in `describe()` output
- `window.__stellarDevtools.record` API (start/stop/stopAndDownload)
- `httpEventId` on snapshots after HTTP response
- Recording session JSON structure (nodes + edges, edge labels)

Flag uncovered areas. These should become the next test sprint.

---

## Output format

End with:

**Blocking** — must fix before shipping anything new
**Worth noting** — not urgent, worth tracking
**Assumption watch** — things to observe as the project is used
**Clean** — areas with nothing to report
