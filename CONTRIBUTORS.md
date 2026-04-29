# Contributing to Stellar

Thanks for your interest. This is a small project with real opinions — read this before diving in.

---

## The organizing principle

Stellar is built around one idea: **AI coding assistants are first-class consumers of developer tools**, on equal footing with human developers. Every design decision flows from that. Before contributing anything that touches the registry, snapshot format, sanitization pipeline, or `window.__stellarDevtools` surface, read [`apps/docs/src/content/docs/explainers/ai-accessibility.md`](apps/docs/src/content/docs/explainers/ai-accessibility.md).

The short version: **AI legibility wins at the data layer. The UI layer can optimize for humans.** When those two things conflict, that's the tiebreaker.

There are five explicit design commitments in [`CLAUDE.md`](CLAUDE.md) under "Design Commitments — Enforce These." They're there because they're the ones most likely to be eroded by individually-reasonable decisions. Please read them.

---

## What we actually need help with

- **Framework adapters** — Stellar's Angular integration is proof-of-concept for a framework-agnostic core. React, Vue, and Svelte adapters are the most-requested missing piece.
- **Playwright test coverage** — timeline mode, `describe()` output shape, "Copy for AI" button, chaos mode reset on navigation.
- **Showcase scenarios** — the AI Collaboration demo needs 3 more reproducible bug scenarios. See [`docs/demo-plan.md`](docs/demo-plan.md) for the spec.
- **Bug reports** — especially around edge cases in the sanitizer or causal linking.

If you have something else in mind, open a [GitHub Discussion](https://github.com/hypertheory-labs/stellar/discussions) first. Not as a gate — as a way to not waste your time on something that conflicts with an already-made decision.

---

## Setup

Node 22+. The repo is an [Nx](https://nx.dev) monorepo.

```bash
git clone https://github.com/hypertheory-labs/stellar.git
cd stellar
npm install
```

### Key commands

```bash
# Serve the demo app (localhost:4200)
npx nx serve demo-ng

# Run Playwright e2e tests (the real test suite)
cd apps/demo-ng && npx playwright test

# Run sanitize unit tests
npx nx run @hypertheory-labs/sanitize:test

# Build the libraries
npx nx build sanitize
npx nx build stellar-ng-devtools
npx nx build stellar-mcp

# Serve the docs site (localhost:4321)
npx nx serve docs
```

Install Playwright browsers once if you haven't:
```bash
npx playwright install --with-deps chromium
```

### Working with the MCP server locally

The repo's `.vscode/mcp.json` and `.mcp.json` both point at `libs/stellar-mcp/dist/cli.js` so you can dogfood AI tooling against your local changes. **The dist must exist** — if you haven't built `stellar-mcp` yet, the agent will silently fail to spawn the server. Run `npx nx build stellar-mcp` once after cloning, and rebuild whenever you change MCP-side code.

For setup of Claude Code, VS Code (Copilot agent mode), and Codex, see the [Connecting AI tools](apps/docs/src/content/docs/guides/connecting-ai-tools.md) guide.

---

## Branches and PRs

**Default**: commit directly to `master` for focused, intentional work. This is a small project and PR overhead for every change isn't worth it.

**Use a feature branch when**: the work is genuinely exploratory (might be abandoned), touches something risky or hard to reverse, or you're an external contributor opening a PR.

For external PRs:
- One concern per PR. Don't bundle unrelated changes.
- If it touches the `window.__stellarDevtools` surface or snapshot format, explain why in the PR description — these are treated as public API.
- If it changes sanitization behavior, add or update a Playwright test in `sanitization.spec.ts`.
- The barrier tests in `sanitization.spec.ts` ("Blood/brain barrier") are not negotiable. They must pass.

---

## The sanitization rule

Sanitization runs **before** any state reaches the registry. This is architecturally load-bearing, not a feature. No PR that would expose unsanitized state to any export surface — clipboard, file, AI, console — will be accepted regardless of how useful the feature is. If you're unsure whether something crosses this line, ask first.

---

## Commit style

No enforced convention. Descriptive subject lines, present tense preferred. If a commit contains a design decision worth preserving, a sentence in the body is worth writing.

---

## Questions

[GitHub Discussions](https://github.com/hypertheory-labs/stellar/discussions) for anything design-related or before starting significant work. Issues for bugs. PRs for code.

The docs site at [stellar.hypertheory-labs.dev](https://stellar.hypertheory-labs.dev) has the full API reference and explainers.
