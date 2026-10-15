---
title: What This Is
description: Stellar Devtools is an exploration of what developer tooling looks like when AI coding assistants are treated as first-class users, not an afterthought.
---

Stellar Devtools is two things simultaneously.

**On the surface:** a practical, usable in-browser developer tool for Angular applications using NgRx Signal Store. You add it to your app, you get a panel that shows you store state, history, and diffs. You can use it without thinking about anything below.

**Underneath:** an exploration of what developer tooling looks like when AI coding assistants are treated as first-class users — on equal footing with the human developer staring at the overlay.

Most developer tools are designed for human eyes. The Redux DevTools chrome extension, for instance, is excellent for humans reading state trees. But if you want to hand that state to an AI assistant for debugging help, you're copy-pasting from a UI, hoping the values aren't sensitive, and manually narrating context the tool already has.

Stellar is trying to answer a different question: *what if the tool were designed from the start so that AI could consume the same data the human sees, safely, in a structured format, without any additional work from the developer?*

That drives decisions at every level — the shape of state snapshots, the sanitization pipeline, the `window.__stellarDevtools` API surface, and yes, how this documentation is written.

## This is not a finished answer

This is active exploration. The libraries are usable and have real design commitments behind them. But the deeper question — how do developer tools and AI coding assistants collaborate most effectively? — is genuinely open. We're working toward it deliberately, not claiming to have solved it.

## What we are specifically not building

- A browser extension (the overlay runs inside the app)
- A replacement for your AI coding assistant (we're building the data layer it needs)
- A compliance tool (though the sanitizer is useful for compliance)
- A surveillance tool (state stays on your machine unless you hand it to an AI tool, through Copy for AI or the optional local MCP bridge, and it's sanitized before it does)
