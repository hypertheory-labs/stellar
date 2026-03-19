# Angular Developer Tools

I want to develop a set of Angular developer tools more like the Vue or Tanstack Query developer tools than the team-provided browser devtools extension.

Below are the potential features I'd like.

## Replacement for the Redux Devtools Browser Extension

For developers that are using the [Ngrx](https://ngrx.io) store, or the newer signal store, there is either direct support for hooking into the redux devtools in the browser (in the case of the NGRX Store), or with the Angular Architects `withDevtools` feature (https://github.com/angular-architects/ngrx-toolkit?tab=readme-ov-file#devtools-withdevtools)

Both of these approaches assume you are going to use the aged Redux Devtools extension, found here https://github.com/reduxjs/redux-devtools 

I would like to investigate whether a "Devtools" experience that runs in the browser (like the Tanstack Query Devtool) could be a sink and catch the same data/events that the browser devtools does currently?

## Backlog / Parking Lot

### State sanitization ⚠️ (should land before any export/share features)
Before state is displayed in the overlay, exported, or transmitted anywhere, there should be a way to elide sensitive values — PII, API keys, tokens, passwords, etc.

Two-layer approach worth designing together:

**Convention-based auto-redaction (zero config)**: any state key whose name matches a built-in blocklist (`password`, `token`, `secret`, `apiKey`, `ssn`, `creditCard`, etc.) gets its value replaced with `[redacted]` automatically. Covers the obvious cases without any developer effort.

**Per-store sanitizer function (explicit override)**: an optional second argument to `withStellarDevtools`:
```ts
withStellarDevtools('UserStore', {
  sanitize: (state) => ({ ...state, sessionToken: '[redacted]', email: '[redacted]' })
})
```

**Global sanitizer**: a config option on `provideStellarDevtools` for app-wide rules, with per-store overrides taking precedence.

The sanitizer should run *before* the snapshot is recorded — so redacted values never enter the history at all, not just hidden in the UI. This matters especially once export/share features exist. Convention-based defaults make this easy for most folks, explicit config handles the edge cases.

**Longer-term design direction — runtime operator pipeline**: Rather than a raw sanitize function, consider a composable pipeline of named operators that mirror familiar TypeScript type utilities — immediately readable to any TS developer:
```ts
withStellarDevtools('UserStore', {
  sanitize: pipe(
    omit('sessionToken', 'password'),
    pick('userId', 'role', 'preferences'),
    redact('creditCard', { keep: 'last4' }),
    redact('ssn', { keep: 'last4' }),
  )
})
```
The distinction between `omit` (remove entirely) and `redact` (transform to a safe representation) is meaningful — a masked credit card number is still useful context; an absent one isn't. This pattern also has legs in event sourcing contexts where the same problem (PII in recorded events) exists. Worth designing as a standalone composable utility that stellardevtools consumes rather than baking it in — could be its own small package.

---

### Multi-store pinning
When viewing a store panel, a "pin" icon could keep it open so a second store can be opened alongside it. Deferred pending a real use case — don't want to add multi-panel complexity just because it's cool. Worth revisiting once the tool is in daily use and it becomes clear whether side-by-side store comparison is actually needed.

### Panel resize
The panel width is currently fixed at 480px — gets cramped with deeply nested state. Add a horizontal drag-to-resize handle on the left edge of the panel.

### State export / import
Allow exporting a store's full snapshot history (or a single snapshot) as a JSON file, and re-importing it later — in the same browser session or a different one, or on a colleague's machine. This was a QA workflow superpower in the Redux DevTools era (reproduce exact state from a bug report).

**Export granularity**: Default should be "export all registered stores as a bundle" (keyed by store name) since stores often have data dependencies. Single-store export as a convenience option for simpler cases. On import, developer can apply the whole bundle or selectively choose stores.

**Technical note**: Exporting is trivial — we already have the state as plain JSON on every snapshot. Importing requires the registry to hold a reference to the actual store instance (not just its history) so we can call `patchState` on it. That's a small but deliberate architectural change. Also worth thinking through: importing into a store whose shape has changed since the export was taken.

**Prerequisite**: State sanitization should be in place before this ships.

### Real-time state mirroring (stretch goal / potential future paid tier)
A QA tester or customer reproduces a bug while a developer watches their store state update in real-time — or a developer imports a recorded session to replay it locally.

**Simpler near-term path ("record session")**: A mode that captures a compressed, timestamped bundle of all state snapshots across all stores, exportable as a file. QA hits "export session", attaches it to a GitHub issue. Developer imports and replays locally. No infrastructure, works async, gets ~80% of the value.

**Longer-term P2P path (WebRTC)**: Conceptually sound — state is already plain serializable JSON so the data side is solved. The catch is WebRTC requires a signaling server to broker the initial peer connection, which means infrastructure. A small hosted relay could be a natural companion service if the library gets traction — and a natural fit for a paid tier.

---

## Second Feature - maybe down the road

I think it would be useful to be able to visualize API calls made by an Angular application - find out if they are being fulfilled by the cache, the age of the responses, etc. I'm thinking the least invasive way would be a development time service worker (like Mock Service Workers (mswjs.io)) that could communicate information about the http actvity back to the development tools.