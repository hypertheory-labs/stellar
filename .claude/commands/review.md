# /review — Stellar Housekeeping

Run a structured review of the codebase. Work through each section below in order.
Report findings concisely. If a section is clean, say so briefly and move on.
Flag anything blocking separately from anything that is just worth noting.

---

## 1. TypeScript hygiene

Search the source files in `libs/` and `apps/` for:
- `any` type usage (explicit annotations, not comments)
- `@ts-ignore` and `@ts-expect-error` directives
- `// TODO` and `// FIXME` comments

Report file:line for each finding. Group by library/app.

## 2. Build health

Attempt to build both libraries:
- `npx nx build @hypertheory/sanitize`
- `npx nx build @hypertheory/stellar-ng-devtools`

If either fails, report the error. Note: `stellar-ng-devtools` has a pre-existing
`Cannot destructure property 'pos'` error in partial compilation mode — if that is
the *only* error, note it as known/pre-existing and move on. Any *new* errors are
blocking.

## 3. Snapshot format gaps

Check `libs/stellar-ng/src/lib/models.ts`. The current `StateSnapshot` type should
eventually have these fields (from the AI Accessibility design):
- `inferredShape: ShapeMap`
- `sourceHint?: string`
- `typeDefinition?: string`
- `trigger?: string`

Report which are missing. These are not blocking — just track them.

## 4. CLAUDE.md drift

Skim `CLAUDE.md`'s "Current Implementation Status" section. Does it still match
reality? Flag anything that has shipped but is still listed as "to do", or anything
listed as done that appears incomplete in the code.

## 5. overview.md backlog

Skim `overview.md`. Flag any backlog items that look like they may have been
partially implemented without being moved to "Resolved", or any "Next Up" items
that are now clearly blocked by something not yet designed.

---

## Output format

End with a short summary:
- **Blocking** — must fix before shipping anything new
- **Worth noting** — not urgent, but don't forget
- **Clean** — areas with nothing to report
