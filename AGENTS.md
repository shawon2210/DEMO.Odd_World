# Agent Instructions

Working rules for this repository. Follow these for every task.

---

## Commit discipline — mandatory

**After every change, commit immediately. Do not batch, defer, or wait to be asked.**

1. Make the change.
2. `git add` only the files you intended to change — never `git add .` or `git add -A` blindly.
3. `git commit` with a clear, accurate message.
4. `git push origin main`.

A change is not finished until it is committed and pushed. If you edit three files, that is
three commits — or one commit that coherently covers a single logical unit of work, depending on
whether the edits belong together.

### Never leave work uncommitted

Do not end a turn with a dirty working tree unless the user explicitly asked you to hold changes.

### Verify after pushing

Confirm with `git status -sb` that the branch is tracking `origin/main` and the tree is clean.

---

## Repository

| | |
|---|---|
| **Remote** | `https://github.com/shawon2210/DEMO.Odd_World.git` |
| **Branch** | `main` |
| **Visibility** | **Public** — anything committed is immediately world-readable |

### What this project is

A dependency-free static site: `index.html`, `styles.css`, `script.js`. There is **no**
`package.json`, no build step, and no install step. Do not introduce one without being asked.

Scroll-driven animation works by reading scroll position in a `requestAnimationFrame` loop and
writing ~55 CSS custom properties onto `:root`. CSS owns rendering; JS owns state. Respect that
separation when editing — do not move layout math into CSS or state into inline styles.

### Tests

```bash
node --test
```

Node's built-in runner, no dependencies. Run it before pushing any change to `js/`. If you
intentionally retime the scroll experience, `tests/regenerate-golden.mjs` updates the snapshot and
the diff must be reviewed — every changed number is a visible change.

### Assets

`assets/` is generated output that is committed deliberately:

- `assets/fonts/` — self-hosted so the font loads same-origin. Reintroducing a third-party
  `@font-face` URL will silently fail in production, because `@font-face` fetches are always
  CORS-mode.
- `assets/images/` — AVIF with WebP fallback at three widths. Add new art at all three widths or
  the `srcset` will serve a wrong-size image.

---

## Commit message style

Follow the existing history. Commits so far:

```
Add Mostar cinematic scroll site
Add professional README
```

Rules:
- Imperative mood, capitalized, no trailing period.
- One short summary line. Add a body paragraph only when the reasoning or scope is not obvious.
- Describe *what changed and why*, not which commands were run.

---

## Safety rules

- **Never commit secrets.** This is a public repo. Before the first push of a session, scan new
  or changed files for API keys, tokens, passwords, and private keys.
- **Never commit generated artifacts.** `ow_cdp_shot.png` and `ow_shot.png` are debug output from
  `ow_cdp.mjs` and are already git-ignored. Keep them that way.
- **Do not force-push, amend, or reset published history** unless explicitly instructed.
- **Do not rewrite commits already on `origin/main`.**

---

## Housekeeping

- Line endings: git warns about `LF will be replaced by CRLF` on Windows. This is expected
  behavior on this machine, not an error. Do not "fix" it or add `.gitattributes` unasked.
- In PowerShell, a native command writing to stderr can set `$?` to `$false` even on success.
  Check actual output rather than trusting `$?` as a success flag.
