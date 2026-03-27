# /sync-public — Sync private repo to public GitHub repo

Pushes a filtered snapshot of the current branch to the `public` remote, excluding
private files. Safe to run at any time — the private repo's history is never touched.

## Private files excluded from public repo

- `docs/` — private working notes, logs, planning docs
- `CURRENT.md` — session-facing status document
- `overview.md` — personal backlog and agenda
- `.claude/settings.json` — contains bypassPermissions and local config
- `.claude/settings.local.json` — local overrides

`.claude/commands/` (skills) and `CLAUDE.md` **are** published — they're useful to
contributors and future AI sessions working on the public repo.

---

## Steps to execute

### 1. Check prerequisites

Run `git status --short` and verify the working tree is clean. If there are uncommitted
changes, stop and tell the user to commit or stash first. Do not proceed with a dirty tree.

### 2. Check the `public` remote exists

Run `git remote -v` and look for a remote named `public`.

**If it does not exist:** stop and print the first-time setup instructions below.
Do not proceed until the user confirms the remote is configured.

### 3. Show what will be pushed

Run `git log public/master..HEAD --oneline 2>/dev/null || echo "(first push to public)"` to
show commits that are new since the last sync. Also remind the user which files will be
stripped. Ask for confirmation before proceeding.

### 4. Create the filtered temp branch

```bash
git checkout -b _public_sync_tmp
```

### 5. Remove private files from the temp branch

Remove each item if it exists (use `--ignore-unmatch` so it doesn't fail if absent):

```bash
git rm -r --cached --ignore-unmatch docs/ CURRENT.md overview.md .claude/settings.json .claude/settings.local.json
git commit -m "chore: strip private files for public sync" --allow-empty
```

### 6. Push to public remote

```bash
git push public _public_sync_tmp:master --force-with-lease
```

### 7. Clean up

```bash
git checkout master
git branch -D _public_sync_tmp
```

Report success: tell the user what was pushed and remind them the private repo is unchanged.

### 8. If anything fails

Ensure you always return to `master` and delete the temp branch before reporting the error.
A leftover `_public_sync_tmp` branch is confusing; clean it up even on failure.

---

## First-time setup instructions (print if `public` remote missing)

```
The `public` remote is not configured. One-time setup:

1. Create the public GitHub repo (if not done):
   gh repo create hypertheory-labs/stellar --public --description "In-browser developer tools for Angular — state inspection, HTTP monitoring, and AI-accessible snapshots."

2. Add the public remote:
   git remote add public https://github.com/hypertheory-labs/stellar.git

3. Run /sync-public again to do the initial push.

Your private repo remote (origin) is unchanged.
```

---

## Notes

- `--force-with-lease` on the push protects against accidentally overwriting someone else's
  work on the public repo, but since you're the only committer it will always succeed.
- The public repo's commit history will show sync-point commits, not the full private history.
  This is intentional and fine — the rich history lives in the private repo.
- If you add new private files or directories in the future, update the removal step in this
  skill and the list at the top of this file.
