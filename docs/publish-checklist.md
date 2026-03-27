# Publishing Checklist

Target: npm packages + docs site live on your domain.
Work through Phase 1 → 2 → 3 in order. Phase 4 is ongoing automation.

---

## Phase 1 — Package metadata (30 min)

Both `libs/sanitize/package.json` and `libs/stellar-ng/package.json` need metadata that
ng-packagr will copy into the dist output. Do this before any build.

### `libs/sanitize/package.json` — add these fields

```json
{
  "name": "@hypertheory-labs/sanitize",
  "version": "0.0.1",
  "description": "State sanitization library for developer tools — redact, mask, and transform sensitive fields before they reach any observer.",
  "keywords": ["sanitize", "redact", "state", "devtools", "ngrx", "angular"],
  "license": "MIT",
  "homepage": "https://stellar.hypertheory-labs.dev/reference/sanitize/",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_ORG/stellar.git",  // jeffrygonzalez or hypertheory-labs — decide first
    "directory": "libs/sanitize"
  },
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "test": "vitest run --config vitest.config.ts"
  },
  "dependencies": {
    "tslib": "^2.8.1"
  },
  "sideEffects": false
}
```

### `libs/stellar-ng/package.json` — add these fields

```json
{
  "name": "@hypertheory-labs/stellar-ng-devtools",
  "version": "0.0.1",
  "description": "In-browser developer overlay for NgRx Signal Store — state inspection, diffs, HTTP monitoring, and AI-accessible snapshots.",
  "keywords": ["ngrx", "signals", "angular", "devtools", "state", "debugging", "ai"],
  "license": "MIT",
  "homepage": "https://stellar.hypertheory-labs.dev",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_ORG/stellar.git",  // same as above — fill in together
    "directory": "libs/stellar-ng"
  },
  "publishConfig": {
    "access": "public"
  },
  "peerDependencies": {
    "@angular/common": "^21.2.0",
    "@angular/core": "^21.2.0",
    "@angular/platform-browser": "^21.2.0",
    "@hypertheory-labs/sanitize": "^0.0.1",
    "@ngrx/signals": "21.0.0"
  },
  "dependencies": {
    "tslib": "^2.3.0"
  },
  "sideEffects": false
}
```

> `publishConfig.access: "public"` is required — scoped packages default to private on npm.
> Without it, `npm publish` silently fails or prompts you for a paid account.

---

## Phase 2 — READMEs (30 min)

ng-packagr copies `README.md` from the library source into the dist. The auto-generated
ones are useless. Replace both with real content.

### `libs/sanitize/README.md`

Needs: installation, the three tiers of rules (named/parameterized/arrayOf), a quick
example, link to full docs, peer dep note (none — this is standalone), license badge.

### `libs/stellar-ng/README.md`

Needs: `provideStellar()` + `withStellarDevtools()` quick-start (copy from the Getting
Started guide), peer dependency table (Angular 21, NgRx Signals 21,
`@hypertheory-labs/sanitize`), link to full docs + overlay screenshot, license badge.

---

## Phase 3 — Build and dry-run (30 min)

```bash
# Build sanitize first (stellar-ng depends on it)
nx build sanitize --configuration production
nx build stellar-ng --configuration production

# Inspect the dist output — verify it contains:
# - package.json (with your metadata above)
# - README.md (your updated one)
# - *.d.ts files
# - fesm2022/ or esm2022/ directory
ls dist/hypertheory-labs/sanitize/
ls dist/stellar-ng/

# Dry-run publishes — reads exactly what npm would upload
cd dist/hypertheory-labs/sanitize && npm publish --dry-run
cd ../../stellar-ng && npm publish --dry-run
```

Review the dry-run file list. Things to watch for:
- `package.json` missing fields (description, license, repository)
- Source maps included when they shouldn't be (`.map` files — fine for a dev library)
- Any test files or fixture data accidentally included

---

## Phase 4 — npm account and tokens (15 min)

- [ ] Log in to npmjs.com — confirm `@hypertheory` org/scope exists and you own it
- [ ] Generate a publish token: npm profile → Access Tokens → Classic Token → Automation
- [ ] Store it somewhere safe — you'll need it for GitHub Actions in Phase 6
- [ ] Verify you can publish manually: `npm publish` from each dist directory (do sanitize first)

---

## Phase 5 — Deploy to Cloudflare Pages (30 min)

Two separate Cloudflare Pages projects: one for the docs site, one for the demo app.
Both live under your existing `hypertheory-labs.dev` domain — no DNS work outside of
Cloudflare's own panel.

`astro.config.mjs` already has `site: 'https://stellar.hypertheory-labs.dev'` set.

### Cloudflare Pages gotchas (learned in production)

- **Workers vs Pages:** The dashboard defaults to Workers when you click "Create". You want
  Pages → Connect to Git. Easy to set up the wrong thing without realising.
- **Root directory field:** Leave it blank. If you set it to `apps/docs` or similar, Cloudflare
  throws "root directory not found". Nx handles project location via the build command.
- **Docs build command:** `apps/docs` has its own `package.json` (not a root workspace member),
  so `astro` isn't installed when `npm ci` runs at root. Use this build command instead:
  `cd apps/docs && npm install && npx astro build`

### Project 1: Docs site → `stellar.hypertheory-labs.dev`

1. Push the repo to GitHub if not already there
2. Go to dash.cloudflare.com → Workers & Pages → Create → **Pages** → Connect to Git
3. Select the repo, then set:
   - **Build command:** `cd apps/docs && npm install && npx astro build`
   - **Build output directory:** `apps/docs/dist`
   - **Root directory:** *(leave blank)*
   - **Node version env var:** `NODE_VERSION = 22`
4. Deploy — verify the preview URL works
5. In the Pages project → Custom domains → Add `stellar.hypertheory-labs.dev`
   - Cloudflare auto-creates the CNAME and provisions TLS (it already manages your DNS)

### Project 2: Demo app → `stellar-demo.hypertheory-labs.dev`

1. Create a second Pages project from the same repo
2. Set:
   - **Build command:** `npx nx build demo-ng --configuration demo`
   - **Build output directory:** `dist/demo-ng/browser`
   - **Node version env var:** `NODE_VERSION = 22`
3. Deploy — verify the preview URL, confirm MSW is active (console should log *"MSW active — API calls to /api/* are intercepted."*)
4. Add custom domain `stellar-demo.hypertheory-labs.dev`

### SPA routing for the demo app

Angular is a SPA — Cloudflare Pages needs a `_redirects` file to send all routes to
`index.html`. Add this file to `apps/demo-ng/public/_redirects`:

```
/* /index.html 200
```

The `public/` directory is copied into the build output by the Angular build, so this
will land at the root of `dist/demo-ng/browser/` automatically.

---

## Phase 6 — GitHub Actions (1 hour)

**Note on Cloudflare Pages deployments:** Cloudflare Pages has its own build pipeline that
triggers automatically on push — you don't need a GitHub Actions job for deploying the docs
or demo app. GitHub Actions only needs to handle tests and npm publishing.

Create `.github/workflows/`. Two workflows cover everything.

### `ci.yml` — runs on every push and PR

```yaml
name: CI
on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: nx run-many --target=test --all
      - run: nx build sanitize --configuration production
      - run: nx build stellar-ng --configuration production

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: nx e2e demo-ng-e2e
```

### `publish.yml` — runs on release tags

Trigger this by pushing a git tag like `v0.0.1` or creating a GitHub Release.

```yaml
name: Publish
on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # needed for npm provenance
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: nx build sanitize --configuration production
      - run: nx build stellar-ng --configuration production

      - name: Publish @hypertheory-labs/sanitize
        run: npm publish --provenance --access public
        working-directory: dist/hypertheory-labs/sanitize
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish @hypertheory-labs/stellar-ng-devtools
        run: npm publish --provenance --access public
        working-directory: dist/stellar-ng
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Add the npm token to GitHub

GitHub repo → Settings → Secrets and variables → Actions → New repository secret
- Name: `NPM_TOKEN`
- Value: the automation token from Phase 4

### npm provenance (optional but good)

The `--provenance` flag links the published package to the exact git commit and GitHub
Actions run. Requires `id-token: write` in the workflow permissions. Gives a verified badge
on the npm package page — worth doing for a dev tool.

---

## Phase 7 — Tag and release

To trigger the publish workflow:

```bash
# Bump version in both package.json files first, then:
git add libs/sanitize/package.json libs/stellar-ng/package.json
git commit -m "chore: bump to v0.0.1"
git tag v0.0.1
git push origin master --tags
```

Or: create a GitHub Release through the UI — it creates the tag for you and lets you write
release notes.

---

## Things to skip for now

- **CHANGELOG** — not worth the ceremony for a first publish. A GitHub Release with a
  short description is enough.
- **`exports` field in package.json** — ng-packagr generates its own entry points in the
  dist output. Adding a manual `exports` field in the source package.json may conflict.
  Leave it out until you have a reason to add it.
- **Unit tests for `stellar-ng`** — the 39 Playwright e2e tests are the coverage story.
  Don't block publish on this.
- **Versioning strategy** — you're publishing 0.0.1 as a beta. Semver formalism (breaking
  changes → major, etc.) matters more once real consumers exist. Don't overthink it now.

---

## Publish order

Always publish `@hypertheory-labs/sanitize` before `@hypertheory-labs/stellar-ng-devtools`.
stellar-ng lists sanitize as a peer dependency — if sanitize isn't on npm yet, anyone who
tries to install stellar-ng will get a peer dep warning or resolution failure.
