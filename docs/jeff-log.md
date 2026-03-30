# Jeff Log 

- "Time Travel" 
    - This devtool was originally meant to be a replacement for the Redux Devtools browser extension. It now feels like saying "We replaced your Volkswagon Jetta with a Ferrari", but I digress. One thing that redux devtools had that I want us to consider is the "Time Travel" - the ability to move backwards and forwards through the state, and the UI updates accordingly.
    - Honestly, the biggest value I ever got from this was the "wow" factor in demoing it. I am skeptical of the actual "real world" value.
    - Absolutely open to the idea that this is actually valuable to other people and even it should be valuable to me, but I never fully grasped the use case. 
    - The thing I'm most uncomfortable with is that it *does* have value as a "demo" thing, and I'm wondering if the humans that are evaluating this will be too quick to dismiss this because it doesn't have that feature, even if they too never use it.


Several things I'd like to look at today. In no particular order - let's see what appeals to us:

- The "Explainers" section of the docs is getting a bit overwhelming. I have some ideas on this I'd like to talk through with you, and I'd like to see if you have any ideas.
- On the Devtools visualizations (for humans) - *really* need to talk through this one, but:
    - I *think* we might need a way for human developers to visualize the data in the store "pre-sanitized". For example, I imagine a scenario where I am debugging an http issue, and want to make sure an API Key is getting copied from the store correctly into the HTTP request (in a header or something). 
    - This feels weird because it is something that won't (and can't) be available to the AI user persona, which is sort of against our "jam".
    - It also may be harder than I suspect, because of where we put the sanitization in the "pipeline".
- I need to record a few videos demonstrating what we've done here. I'd like to talk through their content with you, and maybe work together to create a few high-level outlines.


## Explainers / TDRs

These are all really amazing and information rich. I am feeling like they are too "complex" (using the Rich Hickey thinking) and need to be a little more "Simplex".

I am thinking out loud here and not proposing a solution, but giving you some vectors to follow what I think here:

1. Some of these explainers are either very precise explanations of technical decisions we've made very specifically about this particular software.
    - Sometimes these "points" are buried in the prose of other things.
2. Some are much more high-level and philosophical - and I want to make sure that we are being careful not to "overshare" too much in this project. 
    - We need to "keep" just enough so other developers that arrive here, if they are interested, can see the underpinnings of our decisions - AI First, etc.
3. Some of this content is much more general and not specifically about this project but some things that are "above" this particular project.
    - I think the general idea of AI First Persona, etc. falls into this category.
    - There is a lot of stuff about how you and I are feeling around to find a good way to work together

The stuff in number 3 is going to end up elsewhere. There is another project you are helping me with that is more on this level. 

So, the "need" is to address the fact that the explainers are too prolix, have too much stuff of real value "hidden" in them, etc. 
I don't want to lose ANY of it, but not all of it belongs here. The above three categories are - I apologize, I'll work on it - a recognition of the fact that I have 30+ years of experience writing software, and have trained myself to think best while also thinking about the solution. That's never been "right" but often needed for economy - but even more wrong now that I have a more than apt collaborator - so feel absolutely invited to propose ANYTHING else you think might get me to addressing the need, including reframing the need to be more clear.