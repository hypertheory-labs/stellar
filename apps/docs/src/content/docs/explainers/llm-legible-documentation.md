---
title: Making Documentation Legible for LLMs
description: Why and how Stellar Devtools structures its documentation for AI coding assistant consumption — the two distinct problems involved, what we chose and why, and what we deliberately deferred.
---

*This is a Technical Discussion Record (TDR) — a note capturing design thinking and tradeoffs, written for developers and future collaborators. It records not just what we decided but why, and what we consciously chose not to do.*

---

## What we were trying to solve

When we set out to build the Stellar Devtools documentation site, we had a constraint that most documentation projects don't explicitly state: AI coding assistants are first-class users of this project, not an afterthought. That's the central commitment of the devtools themselves — state snapshots are structured for AI consumption, sanitization runs before anything leaves the trust boundary, the `window.__stellarDevtools` API is a stable contract rather than an implementation detail.

The same principle has to apply to the documentation.

But "make the docs legible for LLMs" turns out to be two distinct problems that require different solutions.

## The two problems

**Problem A: Training data ingestion.** Can a future model's training pipeline crawl and understand our docs? This is the problem most LLM-legibility guides address. It's about robots.txt, static HTML rendering, semantic markup, avoiding JavaScript-only content. Starlight handles most of this out of the box: clean static output, no JS-only rendering, sitemap generation.

**Problem B: AI coding assistant usability right now.** Can a developer today tell an AI assistant "help me use `@hypertheory-labs/stellar-ng-devtools`" and get correct, useful guidance? This is the more immediately relevant problem for us. It's about the shape of the content, not just its crawlability.

These are not the same problem. A site can be perfectly crawlable and still be nearly useless to an AI assistant trying to help a developer implement something, because the information is fragmented, inconsistently named, or buried in prose where structured data would serve better.

We prioritized Problem B.

## What we decided

### `llms.txt` and `llms-full.txt`

We added the `starlight-llms-txt` plugin, which generates `/llms.txt` and `/llms-full.txt` automatically from the Starlight content. The convention (proposed by Jeremy Howard / fast.ai) is analogous to `robots.txt`: a structured markdown file at the root that gives AI systems an orientation to the site and its contents. `llms-full.txt` goes further — it concatenates the entire docs site into a single artifact an AI assistant can consume in one read, without navigating multiple pages.

This matters specifically for AI *coding assistants* (rather than training pipelines) because they often have a single context window to work with. Fragmented docs across many URLs require multiple fetches; a single consolidated artifact is dramatically more useful.

### `description` frontmatter on every page

Every page in the docs has a `description` field in its frontmatter — a single clear sentence about what the page contains. The `llms-full.txt` plugin uses these to build the index; AI systems use them to decide whether a page is relevant to a given question. We established this as a convention from the first page, not as something to retrofit.

### Canonical, typed code examples

LLMs pattern-match on examples more than on prose. A well-typed TypeScript example with a realistic scenario teaches more than three paragraphs of description. We prioritize: minimal example first (shows the shape), realistic example second (shows a real use case), explicit anti-pattern where useful (shows what not to do and why).

### Consistent terminology, never synonyms

Technical concepts have one name throughout the docs. `SanitizationConfig`, `SanitizationRule`, `StateSnapshot` — defined once, cross-referenced everywhere, never abbreviated or aliased to something else in a different section. LLMs that encounter inconsistent naming for the same concept produce inconsistent guidance.

## The dog-fooding principle

This documentation is an instance of what the project advocates. The devtools are about making runtime state legible to AI. The documentation is about making the library API legible to AI. Same principle, different layer. We named this explicitly because it informs decisions that might otherwise look like unnecessary overhead — "why do we need `description` frontmatter on a placeholder page?" Because establishing the convention now, consistently, means it's never missing when it matters.

## What we deliberately deferred

**Documentation graph.** The Copilot-generated summary we evaluated during our design session included a "documentation graph" — a structured artifact describing concept relationships and API call graphs. This is genuinely useful for complex systems. We deferred it not because it's a bad idea, but because it requires content to be useful, and our content is still sparse. `llms-full.txt` is already a reasonable consolidated artifact. We'll revisit when the reference section is substantive.

**File boundary markers.** The `=== START FILE: /path ===` convention was suggested as a way to help LLMs track provenance within a concatenated document. `starlight-llms-txt` uses standard Markdown headings for this instead, which are more readable to both humans and models. We chose readability over the structural explicitness.

**Timestamps on pages.** Timestamps in docs signal staleness. A page marked "last updated 18 months ago" is treated with suspicion by both humans and AI systems, even if the content is still accurate. We version the libraries explicitly; we don't timestamp individual pages.

## What we're watching

The `llms.txt` convention is still emerging. Jeremy Howard proposed it in 2024; adoption is growing but not universal. If a more established standard displaces it, migration is straightforward — the content doesn't change, only the generation mechanism. We chose `starlight-llms-txt` because it's Starlight-native, actively maintained, and generates all three variants (`/llms.txt`, `/llms-full.txt`, `/llms-small.txt`) automatically.

---

*This TDR was written from the session of 2026-03-21, during which the Starlight docs site was scaffolded and the documentation architecture was designed.*
