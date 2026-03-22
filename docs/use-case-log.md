# Use Case Log

*Not a roadmap. Not a backlog. A place to keep possibilities in the room.*

These are use cases that have emerged from the "inside the codebase" framing —
things that become imaginable once you accept that the tool is a participant,
not an observer. They are not commitments. They are shapes worth preserving
so they don't evaporate before we know what to do with them.

---

## Story card recordings

Each story card a developer works on has an associated recording of how it
manifests as user interactions — clicks, events, HTTP calls, state transitions,
causally linked. Not a test (though Playwright tests could be the substrate).
A *record* of how this feature behaves in practice, attached to the work that
produced it.

The artifact: a directed graph export from a recording session, named for the
story, committed alongside the code. Future developers (and future AI sessions)
can replay the story not as code but as behavior.

**What unlocks this**: the recording session UI (bounded capture with explicit
start/end), plus a named export format. The causal graph data already exists.

---

## Production incident triage

"The app is on fire when the user does *this*." Developer opens Stellar,
steps through the failing scenario, hits export. That recording — with full
causal structure, source hints, state transitions — goes directly to the AI.

The AI isn't starting cold. It has the source, it has the recording, it has
the exact sequence of events that preceded the failure. The distance between
"something is wrong" and "here's where to look" collapses.

**What makes this different from logs**: logs record what happened. This
records *why* — the causal chain from user action to system state. Post-mortem
analysis vs. present-tense reasoning.

---

## Onboarding / code tour

"What actually happens when I click this button?" is the question no
architecture diagram answers. A recording session that captures a complete
interaction — click, events, HTTP calls, state transitions, all causally linked
— plus an AI that can annotate each node with source locations and explanations,
gives a new developer a *guided tour* derived from actual behavior rather than
someone's mental model of how the system works.

The tour updates itself when the behavior changes. Documentation that can't go
stale because it's generated from execution.

---

## Cross-application UX consistency analysis

"Your Code as Crime Scene" found hotspots by looking at churn and complexity.
The equivalent for UI: where do similar user intentions produce inconsistent
causal graphs? "Add item" in three different contexts — does it follow the same
pattern? Should it?

With recordings across a large application, you could surface:
- Mixed metaphors (same action, different interaction model)
- Inconsistent state transitions for equivalent operations
- Workflows that should be similar but aren't

This is UX analysis grounded in actual behavior rather than design review.
The data source is the same recordings used for everything else.

---

## Abstraction timing

Jeff's rule of thumb: do a thing three times before declaring you know what it
is and making it reusable. Sound heuristic. Applied manually, by feel.

With recording data across all UI interactions in an application, this becomes
computable: "this causal pattern appears in N places — here's how the
implementations are similar, here's how they diverge, here's whether the
divergence is meaningful or accidental."

The AI's role: not to decide when to abstract, but to surface the evidence
the developer needs to make that call with confidence rather than intuition.
"You've done this four times. Here's what's consistent across all four. Here's
what's different. The difference in case 3 appears intentional — the trigger
is an HTTP response rather than a user click. Cases 1, 2, and 4 are
structurally identical."

This might be the highest-leverage use case in the list. Premature abstraction
is one of the most persistent sources of complexity in large codebases. Having
actual usage data — not code structure, but *behavioral patterns* — to inform
that decision is genuinely new.

---

## Notes on what these have in common

All of these are downstream of the same foundation:
- Bounded recordings with causal structure
- Named exports (directed graph format)
- AI annotation pass (source locations, pattern recognition, confidence)
- Some surface to receive enriched data back

The foundation is close. The recording session UI is the next concrete step
that unlocks most of this list.

---

*Started 2026-03-22. Meant to grow without becoming a spec.*
