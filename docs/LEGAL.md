# The three documents

`/about`, `/privacy` and `/terms` — what they claim, why they exist, and what
must be true for them to stay honest.

Source: `src/app/(legal)/`. Guarded by `src/app/(legal)/__tests__/legal.test.ts`
and `src/app/__tests__/seo.test.ts`.

## Why they exist

Google Safe Browsing flagged `trenchline.app` as a deceptive page in early
September 2026.

**Nothing was compromised.** The deployed HTML was fetched and read: no
third-party script, no injected content, no off-origin asset, security headers
present and correct, HSTS enforced by Vercel at `max-age=63072000`. There was no
defacement to clean up and nothing to roll back.

What the site had was the *profile* of a phishing page, and the profile is what
an automated classifier scores:

- a domain a few weeks old,
- an email-and-password form on the front page,
- a Google sign-in button beside it,
- and not one crawlable page saying who ran the site, what it did with an
  address, or where to complain. The entire footer was a single disclaimer
  sentence.

Every one of those but the last is load-bearing and stays. The last was a real
gap, and these three pages close it. That is the *whole* remedy in this
repository — see "Getting the flag lifted" below for the part that is not code.

## What each page is for

| Page | Answers |
|---|---|
| `/about` | Who runs this, what it is, that it is unofficial, and where the game data comes from. |
| `/privacy` | Every field that is stored, where, who else sees it, and how to have it deleted. |
| `/terms` | Free, unofficial, as-is; your data is yours; don't attack it. |

They render for a **signed-out** visitor, because a signed-out visitor is the
only kind an automated reviewer is. They are a route group of their own, so they
inherit none of `(app)/layout.tsx`: no store hydration, no dataset, no service
worker. They are static documents.

## The rule these pages live under

Rule 2 in `CLAUDE.md` — never invent a fallback — applies to prose. A policy
that names an operator who does not exist is a lie on the page whose only job is
to be true, and `TODO` shipped to production is the same lie with worse grammar.

So `src/app/(legal)/operator.ts` holds the only facts that cannot be derived
from the code, and two of them are **nullable with no placeholder**:

| Constant | State | Effect when null |
|---|---|---|
| `CONTACT` | required | — |
| `NAME` | optional | the pages describe "one hobbyist" and name nobody |
| `COUNTRY` | optional | the governing-law and supervisory-authority sentences are omitted rather than guessed |
| `EFFECTIVE` | required | the date shown on `/privacy` and `/terms` |

Both branches are asserted by the test suite, so "unset" stays a supported state
rather than decaying into a defect.

**`CONTACT` must be a mailbox that accepts mail before this is worth anything.**
An address in a privacy policy that bounces is worse than no policy, to a reader
and to a reviewer alike. `trenchline.app` was bought through Vercel, which
registers domains but does not run mailboxes: an email host has to be pointed at
the domain with MX records (a full mailbox from Fastmail, Zoho or Google
Workspace; or forwarding-only from a service that just relays to an existing
inbox). Until that is done, `/about` promises a reply that cannot arrive.

## What keeps them true

A privacy policy is the page in an application that rots silently: it is prose,
nothing imports it, and a change to a route handler two directories away can
falsify it without breaking a test. `legal.test.ts` is the mechanism against
that, and each assertion names a real drift:

- **The directory projection is pinned.** `toPublic` in
  `src/app/api/warbands/route.ts` decides exactly what a published warband shows
  the world, and `/privacy` claims to list it in full. The test reads the keys
  out of that function and requires a phrase in the policy for each. Add a field
  and the suite fails with the field name and what to do.
  - It also asserts that the reader *found* keys at all. An extraction that
    silently returns nothing would make every assertion in that block pass while
    checking nothing — which is exactly the failure this file exists to prevent,
    and it is how the first version of the test was wrong.
- **One contact address.** The documents must import `CONTACT`; a literal email
  address anywhere in them fails.
- **No placeholders.** `TODO`, `FIXME`, `Lorem ipsum`, `[your`, `XXX`.
- **Reachable.** The landing footer must link to all three, and they must
  cross-link. A policy nobody can navigate to is a file, not a page.
- **Crawlable.** `seo.test.ts` requires all three in `robots.ts`'s allow list and
  in the sitemap. Tidying `/privacy` out of the sitemap would recreate the
  original problem exactly.

Source text is matched with whitespace flattened, so an assertion depends on the
words rather than on where JSX happened to wrap them.

## Claims that are checkable, and where

Everything factual in `/privacy` can be verified in this repository. If you
change one of these, change the policy in the same commit:

| Claim | Where it is true |
|---|---|
| no analytics, no ads, no tracking | no analytics dependency in `package.json`; nothing imports one |
| no third-party script or asset | `src/app/layout.tsx` — `next/font/google` downloads the three faces at **build** time; `font-src 'self'` in `next.config.mjs` |
| account fields | `model User` in `prisma/schema.prisma` |
| passwords are bcrypt hashes | `bcryptjs`, `src/lib/auth.ts` |
| verification and reset links are hashed and expire once | `model AuthToken` — SHA-256 at rest, `usedAt` for single use |
| Google fields, only if you use Google | `model Account`, populated by NextAuth |
| synced roster and campaign fields | `model Warband`, `model Campaign`, `model CampaignMember`, `model MatchRecord`, `model TerritoryNode` |
| a synced warband is private by default | `WarbandVisibility` defaults to `PRIVATE`, and the migration backfilled every existing row to it |
| the directory publishes exactly nine fields, none of them an address | `PUBLIC_SELECT` and `toPublic` in `src/app/api/warbands/route.ts` |
| bug reports are attributed from the session, never the body | `model BugReport.reporterId`, and the route that sets it |
| one cookie, set only after sign-in | `session: { strategy: 'jwt' }` in `src/lib/auth.ts`; theme and settings are `tc_*` keys in local storage |
| ownership is checked server-side on every call | `src/app/api/__tests__/ownership.integration.test.ts` |
| account and invite endpoints are rate-limited | `src/lib/api/rateLimit.ts` |

Two claims are deliberately soft because the code is:

- **Email we send you.** `MAIL_TRANSPORT` is explicit and may be unset, in which
  case the deployment sends nothing at all (`src/lib/mail.ts`). The policy
  therefore describes what mail is *for* rather than promising it arrives.
- **Account deletion.** There is no self-service delete yet. The policy says so
  in as many words and gives the address instead of implying a button exists.
  Building it is the honest fix; until then the sentence is accurate.

## Getting the flag lifted

The code half is done once these pages are deployed. The rest is not in this
repository and is in this order:

1. **Stand up `admin@trenchline.app`** and check that mail to it arrives. Nothing
   below is worth doing while the contact address bounces.
2. **Deploy**, then load `/about`, `/privacy` and `/terms` on production and
   confirm they render signed out.
3. **Verify the domain in Search Console** if it is not already, so the review
   result is visible.
4. **Only then request a review**, under Security Issues → Deceptive pages.
   Requesting one before the site's profile has actually changed spends the
   request and resets the clock.

A review typically takes a few days. Do not request a second one while the first
is pending.
