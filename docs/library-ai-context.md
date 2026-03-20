# Library-Provided AI Context — Design Idea

*From conversation, March 2026.*

---

## The Idea

Library authors currently ship types, documentation, and examples. The emerging opportunity:
**ship AI context as a first-class artifact alongside the library.**

An MCP server from a library vendor (e.g. JasperFx/Wolverine) could include a **prompt resource** —
a context document the AI reads before querying — that encodes domain knowledge the library author
has and the AI doesn't:

- What specific field combinations mean
- Which message/event types are more urgent than others
- How the library's internals (retry policy, backoff timing) affect what the AI is looking at
- What patterns in the data indicate known failure modes vs. expected behavior

Example for a Wolverine dead-letter queue MCP server:

> "A message with `attemptCount > 3` and `failureReason` containing 'timeout' typically indicates
> a downstream availability issue, not a message format problem."
>
> "Messages of type `*Command` are fire-and-forget; `*Query` types expect a response — a DLQ'd
> Query is more urgent than a DLQ'd Command."
>
> "Wolverine's retry policy uses exponential backoff — the timestamp delta between attempts is
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
The JasperFx pattern does it at the MCP prompt layer alongside the data. Both approaches; same
principle: **don't make the developer narrate context the tooling already knows.**

---

## Potential Conversation

Worth raising with Jeremy Miller (JasperFx) at some point. The Wolverine/Marten ecosystem is
a natural fit — event sourcing, messaging, dead-letter queues are exactly the domains where
AI-assisted debugging is high-value and where the library author's domain knowledge is hardest
for an AI to reconstruct from raw data alone.

The question to put to library authors generally: *what would you include in the "orientation
document" you'd hand an AI before it looked at your library's runtime data?* That document
is the prompt resource. Most authors could write it in an afternoon.
