# Architecture

> **Status: Phase 0 (recon).** No application code was changed to produce this document.
> Every claim in §1–§3 is backed by a command, API response, or live check recorded in
> §6 Evidence. §5b is deliberately incomplete — see §4.

---

## 1. Current state (verified)

### 1.1 Repository

| | |
|---|---|
| Remote | `https://github.com/shawon2210/DEMO.Odd_World.git` |
| Branch | `main` (tracking `origin/main`, clean) |
| Visibility | **Public** |
| Production | https://odd-world-nine.vercel.app |
| Head | `a44c985` |

### 1.2 Stack

| Layer | Choice |
|---|---|
| Markup | One static `index.html`, semantic landmarks, JSON-LD |
| Styling | One `styles.css`, ~55 CSS custom properties on `:root` |
| Behaviour | 7 native ES modules under `js/`, MVC layering, no framework |
| Animation | `requestAnimationFrame` loop → CSS variables → compositor-only properties |
| Fonts | Self-hosted `Ogg Medium` woff2, single weight |
| Imagery | AVIF + WebP at 3 widths (144/288 for icons), committed to `assets/` |
| Tests | `node:test`, 38 assertions, zero dependencies |

**There is no `package.json`, no `node_modules`, no lockfile, no `tsconfig.json`, and no build
step.** Verified by direct filesystem probe. Node 24 detects the ESM syntax in `js/`, so
`node --test` runs the suites without a package manifest.

### 1.3 Folder structure

```
index.html                  7 KB   markup + metadata + JSON-LD
styles.css                 14 KB   scroll rig, z-stack, variable contract
AGENTS.md / README.md      25 KB   working rules + documentation
ow_cdp.mjs                  9 KB   Chrome DevTools Protocol inspection tool
js/                         28 KB   config, model, view, controller, utils
tests/                      31 KB   4 suites + golden fixture + regenerator
assets/                   4.7 MB   55 responsive images + 1 woff2 + favicons
```

Tracked total **4.87 MB**, of which **96% is `assets/images`**. Source is 91 KB.

### 1.4 Build pipeline

There isn't one. `main` is served verbatim.

1. Push to `main`
2. Vercel's Git integration auto-deploys (no build step, no build command)
3. `X-Vercel-Cache: HIT`, `Server: Vercel`, region `iad1`

### 1.5 Verification status

| Check | Result |
|---|---|
| `node --test` | **38 pass, 0 fail**, 153 ms |
| Live console errors | **0** |
| Live page exceptions | **0** |
| Live failed requests | **0** (one `ERR_ABORTED` traced to Chrome's own new-tab-page, not the site) |
| Live transfer @390px @2x | **0.33 MB / 20 requests** (was 41.25 MB before Phase 0 of the last cycle) |

---

## 2. Verified constraints

### 2.1 BLOCKER — Hobby plan is non-commercial

The team is on the Vercel **Hobby** plan. Vercel's plan documentation states:

> "the Hobby plan restricts users to non-commercial, personal use only."

So **the current hosting cannot carry a paid SaaS.** Phase 4 billing cannot ship until the team
moves to Pro (developer seats $20/user/month). This needs a decision before any backend work.

### 2.2 Hobby compute budget shapes the architecture

Included monthly usage on Hobby:

| Resource | Hobby included |
|---|---|
| Active CPU | **4 CPU-hours** |
| Provisioned memory | 360 GB-hours |
| Function invocations | 1,000,000 |
| Fast Data Transfer | 100 GB |
| Runtime log retention | **1 hour** |
| Deployments per day | 100 |

Four CPU-hours/month is the binding constraint. A server-rendered page that queries Postgres on
every request spends CPU continuously. **The architecture must therefore optimise for static
generation and reserve dynamic execution for genuinely dynamic routes**, rather than adopting
per-request SSR as a default. One hour of log retention is also too short to debug production
incidents, which is a second reason to upgrade.

### 2.3 No CI

No `.github/` directory. Nothing runs tests or blocks a bad merge except a human remembering
to run `node --test`. Every commit in the last cycle was verified manually via a throwaway
CDP harness that is not in the repo.

### 2.4 No environment variables

`vercel_filter_project_envs` returns an empty list. There is no `.env.example` and no secret
management. Nothing to leak yet, but the backend phase introduces this surface immediately.

### 2.5 Security headers are minimal

Confirmed by direct HTTP request against production:

| Header | State |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy` | **absent** |
| `X-Content-Type-Options` | **absent** |
| `X-Frame-Options` | **absent** |
| `Referrer-Policy` | **absent** |
| `Permissions-Policy` | **absent** |

Acceptable for a static brochure, not for an authenticated application. A strict CSP is the
single highest-value addition once a backend exists.

### 2.6 `AGENTS.md` has drifted

Line 40 still describes the project as `index.html`, `styles.css`, `script.js`. `script.js` was
replaced by the MVC modules in `b828a78`. The file also asserts "no test runner", which became
false in `a44c985`.

### 2.7 Public repository

`DEMO.Odd_World` is public. Any API key, database URL, or webhook secret committed here is
world-readable immediately. This makes rule 5 (never commit secrets) load-bearing rather than
advisory, and means `.env` must be git-ignored from the moment it is introduced.

---

## 3. What this pivot actually costs

The brief describes moving from a dependency-free static site to a full-stack SaaS. That is not
an incremental extension; it reverses the central constraint the repo was built around.

| Currently | Phase 4 requires |
|---|---|
| No `package.json` | `package.json` + lockfile + `node_modules` |
| No build step | Bundler/transpiler, CI build gate |
| No type checking | Shared typed contract |
| No env vars | Secrets, rotation, provider dashboards |
| No server runtime | API, sessions, database connections |
| 91 KB of source | Thousands of lines of application code |

`AGENTS.md` currently forbids the first two. **Those rules must be rewritten, deliberately, as
part of this work** — not quietly worked around. That rewrite should be its own reviewed commit.

---

## 4. Blocking input required

The brief was delivered with five `[FILL IN]` placeholders. One is resolvable from the repo; four
are not, and **the target architecture cannot be specified without them.**

| # | Question | Why it blocks |
|---|---|---|
| 1 | What does the SaaS do, and who are the users? | Determines every route, permission, and data model |
| 2 | Core entities (the brief hints vendors/shops/products/orders) | Determines schema, tenancy, and API surface |
| 3 | Monetisation model | Determines whether billing, metering, and plan gating are needed at all |
| 4 | Target locales for the dead language switcher | Blocks Phase 2c (i18n) |

Resolved from the repository: **repo** is `shawon2210/DEMO.Odd_World`.

Answering #1–#3 is cheap and unblocks Phases 3–4. Answering #4 unblocks Phase 2c.

---

## 5. Target architecture

### 5a. Platform baseline — decidable now

These choices hold regardless of product, because they follow from §2's constraints.

**Frontend + API: Next.js App Router on Vercel.**

| | |
|---|---|
| **Why** | SSR, route handlers, middleware and server actions all run natively on Vercel with no extra infrastructure. Middleware gives a clean seam for auth gating and tenant resolution. Best-supported ecosystem for auth and payments. |
| **Trade-off** | Introduces the `package.json` + build step that §3 says we are giving up. Larger dependency tree. Some Vercel coupling. |
| **Alternative** | Astro with `/api` functions — smaller and closer to the current minimalism, keeps the marketing page static-first, but materially worse ergonomics for authenticated app routes and more manual wiring. |
| **Recommendation** | Next.js. The auth/billing requirement in Phase 4 dominates the aesthetic argument for a zero-build toolchain. |

**Keep the scroll experience as a static route.** It is a proven, tested asset: 0.33 MB, zero
console errors, 38 passing tests, WCAG-audited. It should become a route in the new app, still
statically generated, still covered by its existing tests. It should not be rewritten into the
app framework.

**Database: Postgres on Neon.**

| | |
|---|---|
| **Why** | Vercel-aligned, serverless driver, and free database branching — which makes migration testing possible before production. Postgres is the safe default for relational SaaS data and supports row-level security if tenant isolation needs a backstop. |
| **Trade-off** | Neon is a single vendor. Avoid serverless-HTTP drivers that hold connections open, or the 4-CPU-hour budget will be consumed by idle connections rather than work. |
| **Alternative** | Supabase bundles Postgres + auth + storage + RLS, which reduces service count substantially. Heavier, and couples auth to Postgres roles. |

**Payments: Stripe Checkout + webhooks.** Not optional if monetising. Webhooks require signature
verification, replay protection, and idempotency keys — the single most commonly botched part of
any billing integration.

**Email: Resend.** Simple API, good deliverability defaults, cheap at low volume. Postmark is the
alternative if transactional focus matters more than marketing sends.

**File storage: Vercel Blob** while volume is low (included on Hobby); move to S3/R2 when
bandwidth or egress argues for it.

**Observability: Vercel Logs + Sentry.** Note the 1-hour Hobby log retention (§2.2) — Sentry
becomes the primary debugging surface until Pro is bought.

**CI: GitHub Actions** running `node --test`, a secrets scan, and a build gate on every PR, with
Vercel preview deployments already handled by the existing Git integration.

### 5b. Depends on the §4 answers — cannot be specified yet

Intentionally left blank. Deciding these now would be guessing:

- **Domain model and schema.** Unknown until #2 is answered.
- **Tenancy strategy.** Single-tenant-per-account vs shared-schema multi-tenant vs
  schema-per-tenant changes the data model, the indexes, and the isolation tests.
- **Auth approach.** Self-hosted session auth (argon2id, httpOnly cookies, CSRF) keeps identity
  inside the same database transaction boundary as tenant scoping, which makes isolation
  enforceable in one place. A managed provider (Clerk/Auth0/Supabase Auth) is faster and cheaper
  in engineering time but splits identity from the data layer. **If the team is one or two
  people, managed auth is likely the right trade; the isolation requirement in the brief is much
  easier to prove with a single auth source.**
- **Whether billing is needed at all.** Unknown until #3.
- **Locale set and RTL.** Unknown until #4. Relevant: Bosnian, Croatian and Serbian are all
  Latin-script LTR, so RTL readiness is probably a non-issue — but that is an assumption, not a
  finding.

---

## 6. Evidence

| Claim | How verified |
|---|---|
| Tests pass | `node --test` → 38 pass, 0 fail, 153 ms |
| Zero console errors live | CDP `Runtime.consoleAPICalled` + `exceptionThrown` across a full scroll and carousel interaction → both empty |
| Zero real failed requests | CDP `Network.loadingFailed`, then correlated via `requestWillBeSent`; the single abort was `chrome-untrusted://new-tab-page/one-google-bar`, `canceled: true` |
| No `package.json` / `node_modules` / `.github` / `.env` | `Test-Path` per path → all `False` |
| Repo structure and sizes | `git ls-files` + `Get-Item` grouped by area |
| Zero env vars on Vercel | `vercel_filter_project_envs` → `{"envs": [], "hiddenProductionEnvCount": 0}` |
| Plan is Hobby | `vercel_get_git_deployment_context` → `"plan": "hobby"` |
| Hobby is non-commercial | `https://vercel.com/docs/plans/hobby` → "restricts users to non-commercial, personal use only" |
| Hobby CPU / log limits | Same page: Active CPU 4 CPU-hrs, Runtime Logs 1 hour |
| Missing security headers | `Invoke-WebRequest` against production, header-by-header |
| No build step | `vercel_get_project` → `"framework": null`; deployment completes with no build command |
| Transfer weight | CDP `PerformanceResourceTiming` at 390px @2x |

---

## 7. Roadmap

Phase numbers below match the brief. Phases 2a–2d are grouped because they share the same
frontend foundation and can ship as one reviewable body of work.

| Phase | Scope | Depends on |
|---|---|---|
| **1** | Carry-over decisions: `#bazaar` offset, carousel off-screen card | Nothing — ready now |
| **2** | Frontend foundation: progressive enhancement, deep-linking, i18n, a11y/perf regression gates | #4 for i18n |
| **3** | API + database + typed contract + endpoint tests | #1–#3, Pro upgrade |
| **4** | SaaS core: auth, authorisation, tenancy, billing, dashboard, email | #1–#3, Pro upgrade |
| **5** | Production readiness: OWASP review, headers, observability, privacy, CI/CD | 3, 4 |

**Gating recommendation.** The Vercel Pro upgrade (§2.1) is a prerequisite for Phase 4 and
strongly recommended before Phase 3, because Phase 3's runtime and logging behaviour will be
materially different on Hobby. It is a billing decision, not a technical one, and should be made
deliberately rather than discovered mid-implementation.

**Suggested sequencing.** Do Phase 1 first — it is small, it is fully unblocked, and it retires
two known visual defects before the codebase grows. Then take the §4 answers and start Phase 2.

---

## 8. Open questions

1. **Product:** what does the SaaS do, and who are the users?
2. **Entities:** what are the core entities?
3. **Monetisation:** free, paid tiers, per-seat, usage-based, or not yet?
4. **Locales:** which languages should the switcher offer?
5. **Vercel Pro:** approve the upgrade? It is required before monetisation.
6. **`AGENTS.md`:** approve rewriting the "no package.json / no build step" rules? They currently
   contradict the requested direction.
