# Deployment

What the running environment has to provide, and which layer enforces what.

## Environment

| | required | what happens without it |
|---|---|---|
| `DATABASE_URL` | **yes** | Prisma cannot connect; every cloud route fails. Local-only use still works. On Neon this must be the **pooled** endpoint — see below. |
| `DIRECT_DATABASE_URL` | for migrations | `prisma migrate`, `diff` and `studio` refuse to run. `prisma generate` does not need it, so a deployment that forgets it still **builds and serves** — only schema changes fail. Same value as `DATABASE_URL` wherever there is no pooler. |
| `NEXTAUTH_SECRET` | **yes** | The server **fails closed** at request time. There is no fallback: the constant that used to be one is in this repository's history, so any deployment reaching it would have signed sessions with a published key. |
| `NEXTAUTH_URL` | yes in production | The links in verification and reset mail are built from it. **Also the fallback origin for `robots.txt` and `sitemap.xml`** — see the row below. |
| `NEXT_PUBLIC_SITE_URL` | no, but read the row | The public origin `robots.txt` and `sitemap.xml` name. `lib/siteUrl.ts` reads this, then `NEXTAUTH_URL`, then Vercel's `VERCEL_PROJECT_PRODUCTION_URL`, and **throws at build time if none is set** — so a deployment with none of the three fails to build rather than publishing a sitemap that names the wrong origin. There is no default on purpose: a sitemap saying `http://localhost:3000` is not a broken sitemap, it is one a search engine fetches and believes. Set this only when the canonical public origin differs from where auth runs. Deliberately NOT `VERCEL_URL`, which is the per-deployment preview host. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | The Google button is not offered. Credentials sign-in is unaffected. |
| `TRENCHLINE_ADMIN_EMAILS` | no | Nobody is an administrator by address. Persisted grants still work — see [`DATABASE.md`](DATABASE.md#the-administrator-role). Being able to drop this is the point of AUTH-1. |
| `MAIL_TRANSPORT` | no, but read the row | `log` or `none`. Unset means no mail **and no verification requirement** — see below. |
| `RATE_LIMIT_BACKEND` | no | `memory` (default) or `none`. Read the next section before choosing. |

## The custom domain, and the three places it has to agree

`trenchline.app` is the canonical host. `www` redirects to it, not the other way
round, and the apex is what `NEXTAUTH_URL` and Google OAuth are set to.

Getting the DNS right is the easy half. The half that fails quietly is that the
host appears in three systems that do not talk to each other, and two of them
fail in ways that look like something else:

| where | value | what a mismatch looks like |
|---|---|---|
| Vercel → Domains | `trenchline.app` serving, `www` redirecting to it | a 308 loop, or the wrong host in the address bar |
| Vercel → env → `NEXTAUTH_URL` | `https://trenchline.app` | sign-in appears to work; **verification and reset mail links point at the old host**, because `lib/accountMail.ts` builds every link from this |
| Vercel → env → `NEXT_PUBLIC_SITE_URL` (or `NEXTAUTH_URL`, which it falls back to) | `https://trenchline.app` | `sitemap.xml` and the `Sitemap:` line in `robots.txt` name the wrong host, and Search Console reports URLs that do not resolve. With none of the three set, the build fails instead — which is the intended behaviour |
| Google Cloud → OAuth client | origin `https://trenchline.app`, redirect `https://trenchline.app/api/auth/callback/google` | `redirect_uri_mismatch` at the moment of sign-in, and only for Google |

The redirect URI must match character for character — scheme, host, path, no
trailing slash. `www.trenchline.app` and `trenchline.app` are different origins
to Google, so whichever one is canonical is the one that goes in.

### DNS, on Cloudflare

Vercel issues a per-project CNAME target now (`<hash>.vercel-dns-0NN.com`); the
old `76.76.21.21` and `cname.vercel-dns.com` still resolve but are not what the
dashboard hands out. Take the value from Vercel rather than from any guide,
this one included.

Two things specific to Cloudflare:

- **A CNAME at the apex is not legal DNS**, and works here only because
  Cloudflare applies CNAME flattening to the root record automatically.
- **The proxy must be off — grey cloud, "DNS only".** Proxied, Cloudflare
  terminates TLS itself, Vercel's certificate challenge never reaches it, and
  the domain sits on "Failed to generate cert" indefinitely. Vercel's own DNS
  table says `Proxy: Disabled` for this reason. Turning it on later is possible
  but requires SSL/TLS mode **Full (strict)**, and buys a hobby app very little
  in front of a CDN that is already global.

Delete whatever Cloudflare parked at `@` and `www` when the domain was added
before adding these; a leftover A record at the root silently wins.

### Cutting over

Order matters, and the old host keeps working throughout:

1. DNS records in, grey cloud. Refresh in Vercel until both rows go green.
2. Add the new origin and redirect URI in Google Cloud, **keeping the existing
   `*.vercel.app` ones**.
3. Set `NEXTAUTH_URL` to the new host, redeploy.
4. Sign in with Google, and put a real address through registration and
   password reset — the mail links are the thing most likely to be wrong, and
   nothing else exercises them.
5. Only then remove the `*.vercel.app` entries from Google.

## Where the functions run, and how they connect

Two settings that are easy to leave at their defaults and expensive to.

### The region is pinned, and it is pinned to the database

`vercel.json` sets `regions: ["syd1"]`. Without it Vercel runs functions in
`iad1` — Washington DC — while the database is in `ap-southeast-2`, Sydney.
That is a Pacific crossing of roughly 200ms **per query**, and a request making
four Prisma calls pays it four times. It is not a cold start and it does not
warm up: it is every request, forever.

The pairing is what matters, not Sydney. Move the database and this moves with
it. The players are in Australia, so the function sits beside the database and
both hops are short; a mostly-European audience would want the opposite
decision, and the way to make it is to measure rather than to assume.

`vercel.json` and not `preferredRegion`: the route-segment export only takes
effect on Vercel for the **Edge** runtime, and these routes are Node — Prisma
requires it. A `preferredRegion` in an App Router route here would be read,
accepted, and ignored.

### The app connects through the pooler; migrations do not

Every serverless invocation gets its own connection, so a direct endpoint means
a fresh Postgres backend per request. `DATABASE_URL` therefore names Neon's
pooled host — `-pooler` in the hostname — with `pgbouncer=true`, which tells
Prisma to stop using prepared statements because the pooler runs PgBouncer in
**transaction** mode and hands the connection back after every transaction.

Migrations cannot use it. They take session-level locks and set session state,
which is precisely what transaction-mode pooling discards, and through the
pooler they fail intermittently rather than cleanly. Hence `directUrl` in
`prisma/schema.prisma` and `DIRECT_DATABASE_URL` beside it.

Set both to the same value for any database with no pooler in front of it,
which is every local and CI one — `.github/workflows/ci.yml` does exactly that,
and says so, because `prisma migrate` fails outright when the variable is
missing and that is not a thing to discover from a red build.

## Rate limiting: the edge enforces

`src/lib/api/rateLimit.ts` is the application's **half of a contract**, not the
enforcement. Its store is a `Map` in one process, and this app deploys to
Vercel, where requests are spread across instances that share nothing. A
process-local counter there sees a fraction of the traffic and lets the rest
through.

Presenting that as protection is exactly the "looks defended, is not" the audit
was about, so it is written down here rather than implied:

| | enforces | how |
|---|---|---|
| **Edge / platform** | the real limit | Per-IP rules on the routes in the table below. Configure in the platform's WAF or firewall rules. |
| **Application** | the contract | Buckets, keying, and a `429` with `Retry-After`. Real protection on a single-instance deployment; a backstop and a specification everywhere else. |

Set `RATE_LIMIT_BACKEND=none` once the edge is configured, so the two are not
counting the same requests twice with different windows.

### The surfaces, and what each allows

| surface | route | bucket |
|---|---|---|
| Credentials sign-in | NextAuth `authorize` | 10 / 15 min |
| Registration, verification | `POST /api/auth/register`, `/api/auth/verify` | 5 / hour |
| Password reset, both halves | `POST /api/auth/reset` | 5 / hour |
| Invite preview | `GET /api/campaigns?code=` | 20 / 15 min |
| Anonymous bug report | `POST /api/bug-reports` | 10 / hour |
| Trench Companion import | `POST /api/import/trench-companion` | 20 / 15 min |

**The Trench Companion row is the one that is not only about us.** That route
makes a request to *somebody else's server* on ours, so an unenforced limit is
a limit on their site as well as on this one: until an edge rule exists, the
route can be used to walk their warband ids one at a time, from our address,
at whatever rate a caller likes. It reads one warband, on a user's action, and
nothing about it should be able to become a crawl of their site — see
[`TRENCH-COMPANION-IMPORT.md`](TRENCH-COMPANION-IMPORT.md) for the rest of the
etiquette.

### Two rules the keying follows

**Never key on a caller-supplied address alone.** A bucket keyed only on an
email is a weapon: send `victim@example.com` enough times and the victim can no
longer sign in or reset their password. Every account bucket is keyed on the IP
**and** the address, so an attacker fills only their own.

**Both buckets must pass.** The IP bucket catches one caller trying many
addresses — enumeration — which a paired bucket alone would miss entirely.

Addresses are hashed into the key. A rate-limit store is not a place to keep a
list of who has an account here.

## Mail

`MAIL_TRANSPORT` has no default, because every default is wrong somewhere. An
unknown value **throws** rather than quietly disabling verification on a
deployment that believed it had configured a mailer.

Verification is required to sign in **only where mail can be sent**. Demanding
proof nobody can produce locks every account out, including the maintainer's,
so `authRequiresVerification()` ties the requirement to the capability. That is
a real limitation, and it is the thing to fix before inviting public sign-ups:
add a `Transport` in `src/lib/mail.ts` and a case in `mailer()`.

## What the deployment does not carry

`.vercelignore` keeps `data-sources/`, `docs/`, `scratch/`, `stitch_designs/`
and the tests out of every upload — Deployment Storage is cumulative, and this
project reached Vercel's ceiling at 63 GB with roughly 50 MB per deployment
being source material the running app never reads.

**So nothing under `src/` may import or read from `data-sources/`**: a value the
app needs travels as generated output — read from `data-sources/` by
`scripts/rules-build.mjs`, where its citations live, and emitted into
`src/data/generated/`, which is committed and shipped. The rule bites silently
otherwise, because CI has the whole checkout and passes: the Trench Companion id
equivalence table was imported straight from `data-sources/` and the Vercel
build failed twice, forty seconds in, while `check` was green.
`src/__tests__/deployedSources.test.ts` fails on the next one.

## Database changes

Never `prisma db push` against a database anyone else uses. Migrations are
committed and applied with `prisma migrate deploy`; expand, migrate and
contract are three releases, not one. See [`DATABASE.md`](DATABASE.md).
