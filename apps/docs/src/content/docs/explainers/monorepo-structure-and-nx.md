---
title: Monorepo Structure and the NX Decision
description: Why we chose NX over npm workspaces, how we arrived at the libs/apps directory structure, and what we ruled out along the way.
---

*This is a Technical Discussion Record (TDR) — a note capturing design thinking and tradeoffs, written for developers and future collaborators. It records not just what we decided but why, and what we consciously chose not to do.*

---

## What we were trying to solve

The workspace started as a single Angular CLI project with libraries registered in `angular.json` under `projects/hypertheory/`. By the time we had two libraries (`stellardevtools`, `sanitize`) and one demo app, the friction was already visible: no build caching, no dependency graph, no way to add a non-Angular project (like a docs site) without shell scripts.

The immediate trigger was wanting to add an Astro Starlight docs site. At that point we had: two Angular libraries, one Angular app, and a forthcoming Astro project. Four projects of two different types is the point where monorepo tooling stops being overhead and starts earning its keep.

## What we considered

**npm workspaces** — handles package linking between packages, nothing more. No build orchestration, no caching, no dependency graph. Fine at two packages; not what we needed at four with mixed project types.

**NX** — the right tool, but it carried anxiety from prior experience. The concern was the ".vimrc problem": getting distracted by NX configuration rather than the actual work. This was a real concern worth taking seriously, not dismissing.

The resolution: `nx init` on an existing Angular CLI workspace is genuinely incremental. It adds `nx.json` and local caching. It does not replace `angular.json` or break any existing `ng` commands. The Angular CLI continues to work exactly as before; NX wraps it rather than replacing it. The per-project `project.json` files it generates are optional artifacts, not a new required workflow.

The payoff that justified the anxiety: `nx affected` (only build/test what changed) becomes genuinely valuable once Playwright tests are in the mix, which is on the near-term roadmap.

## The directory structure decision

The Angular CLI convention is `projects/`. The NgRx team uses `modules/` and `projects/`. We chose `libs/` and `apps/` — the NX convention — for one reason: it's what NX generators default to, which means less friction when adding new projects later. Choosing the tool's idiom over a custom one removes a category of future decisions.

The specific names matter less than the consistency. Future projects land in `libs/` (publishable packages) or `apps/` (runnable applications, including the docs site). The distinction is clear enough to be useful without requiring a decision each time.

## The rename: `stellardevtools` → `stellar-ng-devtools`

The original name had no framework indicator. Given that React and Vue adapters are plausible future additions, the Angular library needed to signal its scope in the package name. `@hypertheory-labs/stellar-ng-devtools` makes the Angular specificity visible at the import site. The framework-agnostic `@hypertheory-labs/sanitize` is unchanged — it has no Angular dependency and the name is correct as-is.

## What we deliberately deferred

**NX Cloud** — skipped during `nx init` with `--no-cloud`. Local caching is sufficient for a solo-developer project. Revisit when there are multiple contributors and CI build times become a problem.

**NX generators for new projects** — rather than using `nx generate @nx/angular:library` for future libraries, we'll continue scaffolding manually and registering in `project.json`. The generators make assumptions (file structure, test runner) that we'd want to override anyway.

**Playwright integration** — identified as the primary future use case for `nx affected`. Deferred until the demo app is stable enough to write meaningful tests against.

---

*This TDR was written from the session of 2026-03-21.*
