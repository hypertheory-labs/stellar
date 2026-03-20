# Jeff Log 


## When asking Claude about me doing work outside the loop of working with him, what would be helpful:

Honest answer: frequent commits with descriptive messages are the highest-signal, lowest-friction thing you can do. git log --oneline -20 is the first thing I'll run when picking up context, and a clean commit history tells me what, when, and in what order — without you having to do anything extra.

The thing git can't tell me is why — decisions made, approaches tried and rejected, things that look one way but mean another. That's what's worth capturing, and only when it's non-obvious. A quick note in CLAUDE.md or overview.md like:

Added Analog.js at projects/docs/ — using it for documentation only, not as a second framework adapter. Don't conflate it with the framework-agnostic core discussion.

...is worth more than any amount of code I can read, because it heads off a wrong assumption. Code tells me what exists; it doesn't tell me what you decided it isn't.

So the practical recommendation:

Commit freely and descriptively — that's sufficient for "here's what I built"
One sentence in CLAUDE.md if you made a significant decision, especially one that constrains something we've been designing
Don't write notes for my benefit about things that are self-evident from the code — that's just noise
