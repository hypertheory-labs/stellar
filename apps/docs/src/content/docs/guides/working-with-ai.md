---
title: Working with AI assistants
description: Sample prompts for getting useful answers from AI coding assistants using Stellar's Copy for AI output and window.__stellarDevtools.
---

The recording format and `window.__stellarDevtools` API were designed with AI coding assistants in mind from the start. This guide shows how to use them in practice — what to give the AI, and how to frame the question.

The pattern is consistent: **start with the data, then ask a specific question.** The data is the recording (via **Copy for AI**) or the live API (via `window.__stellarDevtools.describe()` or `snapshot()`). The question tells the AI what you need from it. The format does the rest — the AI doesn't need you to narrate what happened, because it can read the causal graph.

---

## Starting the conversation

Before asking anything else, orient the AI to your application:

```
[Paste window.__stellarDevtools.describe() output here]

This is a Stellar Devtools manifest of my Angular application. The stores listed
are NgRx Signal Stores. I'm going to share a recording of a specific interaction
next. Let me know when you're ready.
```

For a fresh debugging session where you already know which interaction is interesting, you can skip `describe()` and go straight to the recording — the `storeContext` embedded in the recording carries the essential store descriptions. `describe()` adds value when there are multiple stores involved or you want the AI to understand the full application before asking about one part of it.

---

## Orientation prompts

Use these when you want to understand what the recording shows, or when a new developer needs to get up to speed on how a feature works.

**Walk me through the sequence:**
```
[Paste Copy for AI output]

Walk me through what happened in this recording. I'm interested in the causal
chain — what triggered each state change, and what was in flight at each point.
```

**Explain the pattern:**
```
[Paste Copy for AI output]

This recording shows a feature I've built but want to explain to a new developer.
What patterns does this interaction use? Write two to three paragraphs that would
help a developer joining the project understand what's happening here and why.
```

**Summarize for a PR description:**
```
[Paste Copy for AI output]

Write a short PR description for the feature this recording demonstrates. Focus
on the behavior — what the user can do, and how the state management handles it.
Audience is a developer reviewing the code, not an end user.
```

---

## Debugging prompts

Use these when something isn't behaving as expected, or when you want to verify correctness.

**Is the behavior correct?**
```
[Paste Copy for AI output]

This recording shows [brief description of what you did]. I expected the outbox
to drain to zero after all requests resolved. Does the recording confirm that
happened correctly, or do you see anything inconsistent?
```

**Find the cause:**
```
[Paste Copy for AI output]

[Paste window.__stellarDevtools.describe() output here]

After this interaction, the product count in the UI shows 4 but I expected 5.
I can't reproduce it consistently. Looking at the causal graph, is there anything
in this recording that could explain a missed update?
```

**Concurrent mutations:**
```
[Paste Copy for AI output]

This recording includes multiple in-flight requests that overlapped. Do you see
any evidence of a race condition — state updates being applied out of order, or
one response's effect overwriting another's?
```

The last prompt is one of the most valuable in a codebase with optimistic updates. An AI reading the recording can trace each `produced` edge back to its response node and verify that the resulting state snapshot is consistent with the state that existed *before that specific request was sent* — something that's almost impossible to verify from logs alone.

---

## Testing prompts

Use these to turn a recording into a test plan, or to find gaps in existing coverage.

**What tests am I missing?**
```
[Paste Copy for AI output]

[Paste the relevant store file here]

This recording shows the happy path for the add-product flow. Looking at the
store code and what this recording exercises, what branches or conditions aren't
covered here? What tests would you write to cover them?
```

The AI can cross-reference the paths exercised in the recording (which branches produced state changes, which HTTP outcomes were hit) against the code paths that exist in the store. The `delta` fields on state-snapshot nodes tell it exactly what changed; the absence of `deadLetters` changes tells it what didn't happen.

**Verify story card coverage:**
```
[Paste the story card / acceptance criteria]

[Paste Copy for AI output]

Here is the story card I was working from, and a recording of me exercising the
completed feature. In your view, does the recording demonstrate that all the
acceptance criteria are met? Are there any criteria that aren't exercised in
this recording?
```

**Write the test descriptions:**
```
[Paste Copy for AI output]

[Paste the relevant store file here]

Based on the behavior in this recording, write a set of test descriptions
(describe/it blocks, no implementation yet) that would give good coverage
of this feature. Focus on the state transitions and HTTP interactions.
```

---

## Handoff prompts

Use these when handing work to a colleague, writing documentation, or leaving context for your future self.

**Write the store's description field:**
```
[Paste the store file here]

[Paste Copy for AI output]

I need to write a description for this store's withStellarDevtools call — one
sentence that explains what it manages and why it exists. Based on the code and
this recording of it in action, what would you write?
```

This is the one meta-use: using a recording to write the `description` that future recordings will embed. The AI has seen the store in action and can write something more accurate than a description written from static code alone.

**Document the pattern for the next developer:**
```
[Paste Copy for AI output]

[Paste the store file here]

Write a short explanation (two to three paragraphs) of the outbox pattern as
implemented in this store. Audience is a developer who understands Angular and
NgRx but hasn't seen this pattern before. Use the recording as evidence — refer
to specific things that happened in the sequence to make the explanation concrete.
```

---

## A note on what makes these prompts work

Every prompt above shares a structure: data first, then question, then audience or constraint. The data is what makes the AI's answer specific rather than generic. Without the recording, an AI assistant asked "is there a race condition?" can only reason about code structure — it has to imagine possible sequences. With the recording, it can reason about the actual sequence that occurred.

The prompts that work best ask the AI to do something with the data, not just describe it. "Walk me through the sequence" is useful. "What tests am I missing" and "verify story card coverage" are more useful — they pair the AI's ability to read the causal graph with a task that directly improves the code.
