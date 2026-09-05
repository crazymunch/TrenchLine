# Brief for Codex — TrenchLine

Three pieces of work, in priority order. Take them one at a time; each stands
alone. **Report findings as a review on the open pull request**, not only in
the Codex panel — findings that stay in the panel do not reach the other agent
working on this repo.

---

## Before you start: what this codebase is, and its four rules

TrenchLine is a Trench Crusade warband builder and campaign companion. Next.js
15 App Router, React 19, TypeScript, Tailwind, Zustand, Prisma 5.22 / Postgres,
NextAuth v4.

The original codebase was AI-generated and an audit found it broke four rules.
They are not style preferences — each exists because of a specific documented
failure, and they are the standard to review against:

1. **Never write game data by hand.** Statlines, costs, keywords, constraints
   and rules text are derived from `data-sources/` by the pipeline in
   `scripts/`. `src/data/generated/*.generated.ts` is build output. A hand-typed
   Ducat cost is how 97% of the app's statlines ended up wrong.
2. **Never invent a fallback.** A failed fetch, a missed lookup or an
   unavailable source must fail loudly. The shipped example was
   `src/services/githubSync.ts`, which fabricated a GitHub commit — SHA,
   message, author — whenever the API call failed and presented it as a real
   upstream sync.
3. **Mobile-first.** Base Tailwind utilities target a 375px phone; `sm:`/`md:`/
   `lg:` add desktop. `dvh` never `vh`. 44px minimum touch targets, 16px
   minimum font size on form inputs. **No dynamic Tailwind class names** —
   `` `grid-cols-${n}` `` never reaches the compiled stylesheet. Never
   `overflow-x: hidden` to hide a layout problem. Full rules in
   [`docs/MOBILE.md`](MOBILE.md).
4. **Document decisions with the change.** A change to the data model, the
   ruleset layering, the source list or the mobile standards updates the
   relevant file in `docs/` in the same commit.

Read [`docs/README.md`](README.md) first. [`docs/AUDIT.md`](AUDIT.md) records
what was broken and what is left.

### Running it

```bash
npm run dev
npm test                  # vitest; needs DATABASE_URL for the integration specs
npx playwright test       # e2e across phone (375), tablet (768), desktop (1440)
npm run lint              # eslint . — note this covers e2e/, `next lint` does not
npx tsc --noEmit
```

`next build` fails with `<Html> should not be imported outside of
pages/_document` unless `NODE_ENV=production`. Build with:

```bash
NODE_ENV=production DATABASE_URL=... NEXTAUTH_SECRET=... \
  NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3210 npx next build
```

### What a useful finding looks like here

- **A reproduction, not a category.** "The reset endpoint leaks whether an
  address exists" is actionable; "improve error handling" is not. Give the
  request, the observed response and the expected one.
- **Verified against the source.** Several past findings were wrong because
  they were read from a comment rather than the code. Check the code.
- **Ranked.** If you find twelve things, say which three matter.
- **No fix required.** A precise finding is worth more than a speculative patch.
  If you do propose a patch, keep it minimal and say what you ran to check it.

---

## 1. Security review of the authentication surface — highest value

This is the area the resident agent wrote, so it is the area its own review is
least trustworthy on. Adversarial second-pass wanted.

### Files

| Path | What it is |
| --- | --- |
| `src/lib/auth.ts` | NextAuth options: the Credentials provider's `authorize()`, the Google provider, JWT and session callbacks |
| `src/lib/authTokens.ts` | Email-verification and password-reset token minting and redemption |
| `src/lib/adminRole.ts` | The persisted admin role and its audit trail |
| `src/lib/api/rateLimit.ts` | Buckets, `clientIp()`, `consume()`, `limitAccountRoute()` |
| `src/lib/api/policy.ts` | `currentActor()` and the ownership guards every route is meant to use |
| `src/lib/env.ts` | Fail-closed environment validation |
| `src/app/api/auth/register/route.ts` | Registration |
| `src/app/api/auth/reset/route.ts` | Password recovery |
| `src/app/api/auth/verify/route.ts` | Email verification |
| `src/app/api/auth/[...nextauth]/route.ts` | The NextAuth handler |

Existing tests, which describe the intended behaviour and are the thing to try
to break: `src/lib/__tests__/authTokens.integration.test.ts`,
`src/lib/__tests__/adminRole.integration.test.ts`,
`src/app/api/auth/__tests__/accountFlows.integration.test.ts`.

### Specific questions, in the order they matter

1. **Does enumeration resistance actually hold?** Registration and password
   reset are supposed to return byte-identical responses and comparable timing
   for a known and an unknown address. Probe the edges: an address that exists
   as a **Google OAuth user with no password**, an address that exists but is
   unverified, an address differing only in case (`A@x.com` vs `a@x.com`), an
   address with a plus tag, and one with surrounding whitespace. Does the
   response, the status code, the header set, or the response time differ?
2. **Can the rate limiter be walked around?** `clientIp()` derives the key from
   request headers — check what it trusts and whether a client can set it.
   Then: is the bucket keyed on the raw email or a normalised one? If raw,
   `a@x.com`, `A@x.com` and `a+1@x.com` are three buckets against one account.
   Is the store per-process? If so, say what that means on a multi-instance
   deployment (this runs on Vercel).
3. **Can the admin role be reached without a database row?** `adminRole.ts`
   replaced an "is your email in this list" check with a persisted grant.
   Verify the JWT and session callbacks in `auth.ts` cannot reintroduce the old
   path, that `isAdmin` on the session cannot be set by anything the client
   controls, and that a revoked grant takes effect on the next request rather
   than at the next sign-in.
4. **Token redemption.** In `authTokens.ts`: are verification and reset tokens
   single-use, time-bounded, and compared in a way that does not leak by
   timing? Is a reset token invalidated when the password changes by another
   route? Can a verification token be redeemed for a different account than the
   one it was minted for?
5. **`authorize()` in `auth.ts`.** The original code had a bypass here. Confirm
   it cannot return a user without a successful password comparison, including
   for a user row with a null or empty `passwordHash` (an OAuth-only account).

### Out of scope

Do not propose adding a new auth provider, a session store, or a dependency.
The finding is the deliverable.

---

## 2. Ownership boundaries on the API routes

The original app shipped a signed-out `GET /api/warbands` that returned **every
warband in the database**, which the client then merged into local storage as
the visitor's own. That is fixed and tested. The campaign sync endpoint is
newer and less exercised.

### Files

| Path |
| --- |
| `src/app/api/warbands/route.ts` |
| `src/app/api/campaigns/route.ts` |
| `src/app/api/campaigns/sync/route.ts` |
| `src/app/api/custom-rules/route.ts` |
| `src/app/api/bug-reports/route.ts` |
| `src/app/api/dataset/route.ts`, `src/app/api/dataset/provenance/route.ts` |
| `src/lib/api/policy.ts`, `src/lib/api/parse.ts`, `src/lib/api/http.ts` |

Tests: `src/app/api/__tests__/ownership.integration.test.ts`,
`src/app/api/campaigns/__tests__/sync.integration.test.ts`.
Design notes: [`docs/CAMPAIGN-SYNC.md`](CAMPAIGN-SYNC.md).

### The question

**Does any route act on a client-supplied id without checking the session owns
it?** `policy.ts` exists so a handler cannot forget — its guards return the
verified actor and throw otherwise, so the result cannot be used without having
passed the check. Verify every route actually goes through it, and that none
re-derives ownership inline.

Then, specifically on `campaigns/sync`:

- The protocol is operation-based: the client mints an `opId` which is the
  primary key, so a retry is idempotent; a monotonic `version` field detects
  conflicts; the handler fetches before pushing and throws on conflict so the
  transaction rolls back. **Can a client forge an `opId` that collides with
  another user's operation**, and what happens if it does?
- Can a client push an operation naming a campaign or territory it is not a
  member of? Can it push a `version` that is lower, or wildly higher, than the
  server's?
- Does a rolled-back transaction leave the outbox or the server state
  inconsistent?

Also worth a look: `src/app/api/dataset/route.ts` — it serves generated data,
so check nothing user-controlled reaches a file path.

---

## 3. Interface testing on a phone

Two shipped bugs in a row were "this screen is too big and doesn't scroll", and
the guard that should have caught the first one asserted `toBeVisible()` — which
passes for an element that is rendered but unreachable. So this is worth a real
pair of eyes.

### Where to look, at 375×667

1. **The warband builder / muster flow** — `src/components/builder/`. A user
   reported being unable to progress because a screen was too tall and would
   not scroll. Six overlay components were fixed
   (`WarbandDashboard`, `CampaignHubView`, `TerritoryMap`, `ui/ConfirmModal`,
   `play/KeywordPopover`, `builder/WarbandBuilder`) by giving each panel
   `max-h-[90dvh] flex flex-col` with a `flex-1 min-h-0 overflow-y-auto` body.
   **Is any overlay still unscrollable, and can every primary action be
   reached?** Note the six are hand-rolled rather than built on the shared
   `Sheet`, so they lack focus trapping and Escape-to-close — worth confirming
   whether that bites.
2. **The new landing page** at `/` — `src/components/landing/Landing.tsx`.
   Just rebuilt from a designer's handoff that was written desktop-first and
   inverted to mobile-first by hand, which is exactly where a translation error
   hides. Check the hero, the armoury preview table (it drops a column below
   `sm:` rather than scrolling) and every touch target.
3. **Play Mode** — `src/components/play/PlayModeView.tsx`. The combat screen is
   ~6,300px tall with nine models deployed. The turn controls are in a sticky
   strip; confirm they stay reachable through a whole match, and that the
   All Out War card console opens and is usable at 375.

### The standard to test against

- 44px minimum touch target below 1024px; 16px minimum font on inputs; nothing
  under 12px anywhere on a phone.
- The page must **never** scroll sideways. Wide content scrolls inside its own
  container.
- `dvh`, not `vh`, for anything that must stay on screen.

### A trap worth avoiding

`toBeVisible()` is not reachability. `e2e/helpers.ts` has `expectReachable()`,
which checks the element is in the viewport **or** has an ancestor with a
computed `overflow-y` of `auto`/`scroll` and real scrollable height. Use that
idea. Note also that `overflow: hidden` still scrolls programmatically, so
`scrollIntoViewIfNeeded()` will hide the bug rather than find it.

---

## What NOT to do

**Do not run another broad code audit.** There have been three. The last Codex
sweep produced one finding; it was real and correct (a README image pointing at
a deleted asset) but it was one finding. Remaining known debt is written down in
[`docs/AUDIT.md`](AUDIT.md) and
[`docs/ENGINEERING-AUDIT-FOLLOWUP.md`](ENGINEERING-AUDIT-FOLLOWUP.md) — a fourth
sweep will mostly re-find it. Targeted beats broad here.

Also out of scope unless you find a defect in them: the data pipeline in
`scripts/`, the generated datasets, and the ruleset layering. Those are
verified against the published catalogues by `npm run rules:crosscheck` and
have their own test suite.
