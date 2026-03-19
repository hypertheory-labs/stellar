# Angular Developer Tools

I want to develop a set of Angular developer tools more like the Vue or Tanstack Query developer tools than the team-provided browser devtools extension.

Below are the potential features I'd like.

## Replacement for the Redux Devtools Browser Extension

For developers that are using the [Ngrx](https://ngrx.io) store, or the newer signal store, there is either direct support for hooking into the redux devtools in the browser (in the case of the NGRX Store), or with the Angular Architects `withDevtools` feature (https://github.com/angular-architects/ngrx-toolkit?tab=readme-ov-file#devtools-withdevtools)

Both of these approaches assume you are going to use the aged Redux Devtools extension, found here https://github.com/reduxjs/redux-devtools 

I would like to investigate whether a "Devtools" experience that runs in the browser (like the Tanstack Query Devtool) could be a sink and catch the same data/events that the browser devtools does currently?

## Backlog / Parking Lot

### Multi-store pinning
When viewing a store panel, a "pin" icon could keep it open so a second store can be opened alongside it. Deferred pending a real use case — don't want to add multi-panel complexity just because it's cool. Worth revisiting once the tool is in daily use and it becomes clear whether side-by-side store comparison is actually needed.

### Panel resize
The panel width is currently fixed at 480px — gets cramped with deeply nested state. Add a horizontal drag-to-resize handle on the left edge of the panel.

---

## Second Feature - maybe down the road

I think it would be useful to be able to visualize API calls made by an Angular application - find out if they are being fulfilled by the cache, the age of the responses, etc. I'm thinking the least invasive way would be a development time service worker (like Mock Service Workers (mswjs.io)) that could communicate information about the http actvity back to the development tools.