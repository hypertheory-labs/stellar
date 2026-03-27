---
title: Going Public — Infrastructure Decisions
description: The hosting, domain, package scope, and repo structure decisions made before first publish — and the reasoning that made each one obvious.
---

*This is a Technical Discussion Record (TDR) — a record of how we thought, not what we built. It exists so future contributors (and future instances of Claude) can understand not just what exists, but why it exists in that form and what was deliberately ruled out.*

---

## What we were actually solving

The surface problem was "how do we publish the npm packages." The real problem was broader: before anything goes public, a set of structural decisions need to be made that are cheap now and expensive later. Package scope, domain, hosting platform, repo visibility, private/public split. Each of these has a "do it before first publish" window that closes the moment real consumers exist.

The session was about making those decisions deliberately rather than stumbling into defaults.

---

## Package scope: `@hypertheory-labs` not `@hypertheory`

The original package names used `@hypertheory/` — matching the company name. The problem: someone else owns the `hypertheory` GitHub org, and likely the npm scope too. Attempting to publish `@hypertheory/sanitize` would have failed at the registry or created a confusing attribution.

The fix was obvious once the GitHub org situation was clear: rename to `@hypertheory-labs/` to match the org Jeff actually controls. This is a zero-cost change before first publish and a painful migration (deprecating old packages, updating all consumer imports) after.

The `-labs` suffix turned out to be appropriate anyway — it signals "tooling / experimental / builder community" rather than a commercial product, which is accurate for v0.0.1.

**The constraint that made it obvious:** do the rename before any published artifact exists. The window was open; we used it.

---

## Hosting: Cloudflare Pages, not Vercel

Vercel was the default assumption (the publish checklist was originally written for Vercel). Two things changed that:

**The org tax.** Vercel's free "Hobby" plan only works with personal GitHub repos. Deploying from a GitHub org requires a paid plan (~$20/user/month). Since the plan was to move the repo to `hypertheory-labs`, Vercel would require payment for what Cloudflare gives free.

**The existing infrastructure.** Jeff already owns `hypertheory-labs.dev` through Cloudflare, with DNS managed there. Adding subdomains is a CNAME entry in a panel he already has access to — no registrar hop, no propagation surprises, TLS auto-provisioned.

Cloudflare Pages has no restriction on org repos. The free tier covers unlimited bandwidth for static assets. For this project (static Angular app + Astro docs site), there's no meaningful tradeoff.

**What was ruled out:** self-hosting both sites on the existing on-prem Kubernetes cluster. The cluster is real infrastructure (it serves `hypertheory-labs.dev` already) and could technically host static files. The argument against: ops overhead for zero gain. Static files behind a CDN have better availability guarantees than a homelab cluster, and the cluster's value is for server-side workloads — the MCP server, any future API surface — not for serving HTML.

**The principle that emerged:** static content → Cloudflare edge, server-side workloads → the cluster. Don't cross those streams.

---

## Two repos: private working repo + public repo

The `/docs` directory accumulated over the project's life: design thinking, personal logs, planning docs, historical prototypes. Valuable to us, not appropriate to publish.

Three options were considered:

1. **`.gitignore` + local only** — simplest, but not backed up anywhere and not accessible across machines
2. **`.gitignore` + private backup repo** — same working dir, private copy elsewhere for backup
3. **Parallel repos: private source of truth + public filtered export** — private repo has everything, public repo gets a filtered push

Option 3 was chosen because Jeff works across machines. The private repo is the canonical working environment; the public repo is a read-only view for the world.

The mechanism: a `/sync-public` skill that creates a temp branch, removes private files from the index (`git rm --cached`), pushes that branch to the `public` remote as `master`, then cleans up. The private repo's history is never touched.

**What made the temp-branch approach right:** git doesn't let you selectively push files — you push commits. The only clean solution is to create a commit where the private files are absent, push that, and throw the commit away locally. The private repo retains the full history; the public repo sees only sync-point commits.

**Files excluded from the public repo:**
- `docs/` — private working notes, logs, planning docs
- `CURRENT.md` — session-facing status (useful to us, noise to the world)
- `overview.md` — personal backlog
- `.claude/settings.json` / `.claude/settings.local.json` — `bypassPermissions: true` is a solo-dev configuration that shouldn't ship to collaborators

**What stays public:** `CLAUDE.md` (design commitments and architecture notes — useful to contributors), `.claude/commands/` (skills — useful to anyone working on the project).

---

## Promoting design docs before going public

The `/docs` directory held design artifacts that belonged in the public docs site — they were just never promoted because the site was private. Before the first sync, we sorted:

- **Promote to `apps/docs/explainers/`:** anything that records design thinking (the AI accessibility spectrum, use cases, causal graph design, sanitize API rationale, clean code for AI, library-provided AI context)
- **Keep private:** personal working notes (`jeff-log.md`), operational docs (`publish-checklist.md`), session artifacts (`sample-*.json`), historical prototypes (`sanitation.ts`)

The test: "would a future contributor or AI session benefit from reading this?" If yes, it goes public. If it's about the process of building rather than the decisions made, it stays private.

---

## Manual publish before CI

The publish workflow was done manually (build → dry-run → publish) before any GitHub Actions were written. The reasoning: GitHub Actions adds a layer that obscures the real friction. The first time you publish, you want to see the actual errors — npm auth, scope ownership, 2FA, build path surprises — not a CI log that says "exit code 1" somewhere in 400 lines.

Manual first also confirms the full sequence is understood before automating it. The automation is straightforward once you've done it once; the discovery phase is where you need direct feedback.

**What was deferred:** GitHub Actions for automated publish on release tags. The checklist has the workflow YAML ready. The condition to build it: when the manual process has been run at least once and the sequence is confirmed.

---

## What we deliberately deferred

- **`CONTRIBUTORS.md`** — waiting until the contribution workflow is real (branching strategy, PR expectations, issue process). The trigger: when the NgRx team is invited in (~2026-04-03). Writing it now would be aspirational rather than descriptive.
- **GitHub Actions CI/publish workflow** — the mechanics are documented in the publish checklist; the condition to build it is "after the first manual publish confirms the sequence."
- **Cloudflare Pages setup** — the build configs and `_redirects` file are ready; the actual Cloudflare project creation is a UI step that waits on this session's work landing.

---

*This TDR was written from the session of 2026-03-27.*
