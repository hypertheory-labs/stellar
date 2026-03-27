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
  "name": "@hypertheory/sanitize",
  "version": "0.0.1",
  "description": "State sanitization library for developer tools — redact, mask, and transform sensitive fields before they reach any observer.",
  "keywords": ["sanitize", "redact", "state", "devtools", "ngrx", "angular"],
  "license": "MIT",
  "homepage": "https://stellar-devtools.dev/reference/sanitize/",
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
  "name": "@hypertheory/stellar-ng-devtools",
  "version": "0.0.1",
  "description": "In-browser developer overlay for NgRx Signal Store — state inspection, diffs, HTTP monitoring, and AI-accessible snapshots.",
  "keywords": ["ngrx", "signals", "angular", "devtools", "state", "debugging", "ai"],
  "license": "MIT",
  "homepage": "https://stellar-devtools.dev",
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
    "@hypertheory/sanitize": "^0.0.1",
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
`@hypertheory/sanitize`), link to full docs + overlay screenshot, license badge.

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
ls dist/hypertheory/sanitize/
ls dist/stellar-ng/

# Dry-run publishes — reads exactly what npm would upload
cd dist/hypertheory/sanitize && npm publish --dry-run
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

## Phase 5 — Docs site on Vercel (30 min)

The docs site is an Astro Starlight app at `apps/docs/`.

### Initial Vercel deploy

1. Push the repo to GitHub if not already there
2. Go to vercel.com → Add New Project → Import from GitHub
3. Vercel will auto-detect Astro. Override the defaults:
   - **Root directory:** `apps/docs`
   - **Build command:** `npm run build` (or `astro build`)
   - **Output directory:** `dist`
   - **Node version:** 20 or 22
4. Deploy — verify the preview URL works

### Custom domain

1. In Vercel project settings → Domains → Add `stellar-devtools.dev`
2. Vercel gives you DNS records (usually a CNAME + A record for apex)
3. Add them in your registrar's DNS settings
4. Propagation takes 5–60 min; Vercel auto-provisions TLS

### Make sure `astro.config.mjs` has the correct `site` URL

```js
// apps/docs/astro.config.mjs
export default defineConfig({
  site: 'https://stellar-devtools.dev',
  // ...
})
```

This matters for canonical links, the sitemap plugin, and llms.txt generation.

---

## Phase 6 — GitHub Actions (1 hour)

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

      - name: Publish @hypertheory/sanitize
        run: npm publish --provenance --access public
        working-directory: dist/hypertheory/sanitize
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish @hypertheory/stellar-ng-devtools
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

Always publish `@hypertheory/sanitize` before `@hypertheory/stellar-ng-devtools`.
stellar-ng lists sanitize as a peer dependency — if sanitize isn't on npm yet, anyone who
tries to install stellar-ng will get a peer dep warning or resolution failure.
