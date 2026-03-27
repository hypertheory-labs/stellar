---
title: Library-Provided AI Context
description: The emerging opportunity for library authors to ship AI context as a first-class artifact alongside documentation — and how Stellar relates to this pattern.
---

*From conversation, March 2026.*

---

## The Idea

Library authors currently ship types, documentation, and examples. The emerging opportunity:
**ship AI context as a first-class artifact alongside the library.**

An MCP server from a library vendor could include a **prompt resource** —
a context document the AI reads before querying — that encodes domain knowledge the library author
has and the AI doesn't:

- What specific field combinations mean
- Which message/event types are more urgent than others
- How the library's internals (retry policy, backoff timing) affect what the AI is looking at
- What patterns in the data indicate known failure modes vs. expected behavior

Example for a message queue's dead-letter queue MCP server:

> "A message with `attemptCount > 3` and `failureReason` containing 'timeout' typically indicates
> a downstream availability issue, not a message format problem."
>
> "Messages of type `*Command` are fire-and-forget; `*Query` types expect a response — a DLQ'd
> Query is more urgent than a DLQ'd Command."
>
> "The retry policy uses exponential backoff — the timestamp delta between attempts is
> significant context for diagnosing the failure pattern."

That's knowledge the AI cannot infer from the data alone. Shipping it as a prompt resource means
the AI arrives already oriented, without the developer having to re-explain the library's mental
model every session.

---

## The Gap This Fills

Current MCP servers are mostly thin CRUD wrappers. They expose data but carry no embedded domain
knowledge. The developer still has to bridge the gap between "here is the raw data" and "here is
what this data means in the context of this library."

Library authors are uniquely positioned to close that gap — they wrote the library, they know
the failure modes, they understand the data shapes. An MCP server with embedded prompt context
is a natural extension of the documentation responsibility they already have.

---

## Relationship to Stellar

Stellar is doing the same thing at the data structure level — the `StoreSnapshot` format is
opinionated because it bakes in the context an AI needs (store name, trigger, type hints, diffs).
The pattern described above does it at the MCP prompt layer alongside the data. Both approaches;
same principle: **don't make the developer narrate context the tooling already knows.**

Stellar's `describe()` call is the simplest version of this: rather than requiring the developer
to explain what stores exist and what they're for, `describe()` returns a structured manifest that
an AI can read to orient itself before a debugging session.

---

## The question to put to library authors

*What would you include in the "orientation document" you'd hand an AI before it looked at your
library's runtime data?* That document is the prompt resource. Most authors could write it in an
afternoon. The hard part isn't the writing — it's recognizing that it's now a first-class
deliverable, not an afterthought.

---

*From conversation, March 2026.*
