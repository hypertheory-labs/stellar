---
title: Clean Code for AI
description: Which software conventions are load-bearing for correctness, and which are cognitive prosthetics for human working memory — and why the distinction matters more when AI is in the loop.
---

*Not a manifesto. A place to think out loud.*

---

## The phrase that started this

"Cognitive prosthetics" — the idea that many clean code conventions exist not because they make code
*correct* or *faster* or *easier to reason about in any universal sense*, but because they compensate
for specific constraints of biological working memory. Small methods so you can hold the whole thing
in your head. Descriptive variable names because you can't page back 40 lines. Files organized into
folders because you need the directory tree to tell you where to look.

These are good solutions to real problems. The question is: are they the *only* solutions, or are
they solutions shaped by a particular kind of cognition?

---

## The disambiguation problem

The aesthetics are hard to disambiguate from the necessity.

We've absorbed clean code conventions as a coherent aesthetic. Reading "clean" code *feels* better.
There's a satisfaction to small, named, composed functions that goes beyond pure utility. That feeling
is probably useful — it correlates with code that's actually easier for humans to work with. But it
can also mislead. Some things that feel clean are clean because they match the aesthetic, not because
they reduce genuine reasoning difficulty. And some things that feel "messy" — a longer function that's
fully self-contained, a type that carries all its invariants inline — might actually be easier to
reason about correctly.

Working with AI makes this harder to ignore, because the AI doesn't feel the aesthetic the same way.
So when you notice yourself wanting to split something up, it's worth asking: is this for me, or is
this for the code?

---

## Do names help AI reason?

Yes — and not just for the reason you might expect (carrying meaning across sessions, respecting the
human collaborator). Within a session, meaningful names genuinely shape how an AI processes code.
A language model isn't a lookup table with a separate "execute" step. When it reads `getLatestTrigger`,
that activates associations that `fn47x8` doesn't. The semantic content of names is part of the
context the model reasons in, not decoration stripped away before the "real" computation.

Part of this is training: the overwhelming majority of code in any model's training data uses
meaningful names. So the sense of "what should come next after a function named X" is built on that
corpus. A UUID function name is almost outside the training distribution.

But part of it may be more fundamental: language models use language to reason. Names aren't just
pointers into a symbol table — they carry semantic weight that shapes inference. `handleError` and
`processInput` suggest different kinds of implementations before you read a single line of the body.
That's a feature, not a bug.

The upshot: naming matters for the same reason it matters to you, just not *only* for the reasons
you thought. It's not purely a human-working-memory accommodation. It's genuinely about meaning.

---

## What survives scrutiny

Conventions that are probably load-bearing regardless of who's reading:

- **Meaningful names** — encodes intent, shapes inference, survives context switches
- **Locality of information** — if understanding X requires reading 6 other files, that's a problem
  for everyone; if it's long but self-contained, it's mostly fine
- **Explicit intent over implicit convention** — comments that say *why*, types that encode the
  domain model, structure that makes invariants visible rather than assumed
- **Coherent units** — not "small", but *coherent*; a function should do one thing only in the sense
  that it's not secretly two things pretending to be one

Conventions that might be more prosthetic than fundamental:

- **Line/function length limits** — the 10-line rule is about human working memory, not about
  correctness
- **File organization by "responsibility"** — useful when navigation cost is high; less critical
  when search is cheap and context windows are large
- **DRY as a moral imperative** — three similar lines of code is often better than a premature
  abstraction; deduplication optimizes for reading linearly, not for understanding

---

## What this means for this project

Stellar is already making an implicit argument here. The primary design decision — that the internal
data model and query surface *are* the product, and the overlay UI is just one rendering of it —
is a decision that prioritizes information structure over presentation. It's the same instinct:
get the semantics right and the rest follows.

The AI Accessibility principle is clean code for a broader audience: structure your state so that
any sufficiently capable consumer — human, AI assistant, Playwright fixture, MCP call — can reason
about it correctly without needing narrative context added. That's not a human-specific goal.
That's just good information design.

---

*Started from a conversation on 2026-03-22. Meant to grow.*
