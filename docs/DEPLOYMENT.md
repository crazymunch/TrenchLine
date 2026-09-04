# Deployment

What the running environment has to provide, and which layer enforces what.

## Environment

| | required | what happens without it |
|---|---|---|
| `DATABASE_URL` | **yes** | Prisma cannot connect; every cloud route fails. Local-only use still works. |
| `NEXTAUTH_SECRET` | **yes** | The server **fails closed** at request time. There is no fallback: the constant that used to be one is in this repository's history, so any deployment reaching it would have signed sessions with a published key. |
| `NEXTAUTH_URL` | yes in production | The links in verification and reset mail are built from it. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | The Google button is not offered. Credentials sign-in is unaffected. |
| `TRENCHLINE_ADMIN_EMAILS` | no | Nobody is an administrator by address. Persisted grants still work — see [`DATABASE.md`](DATABASE.md#the-administrator-role). Being able to drop this is the point of AUTH-1. |
| `MAIL_TRANSPORT` | no, but read the row | `log` or `none`. Unset means no mail **and no verification requirement** — see below. |
| `RATE_LIMIT_BACKEND` | no | `memory` (default) or `none`. Read the next section before choosing. |

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

## Database changes

Never `prisma db push` against a database anyone else uses. Migrations are
committed and applied with `prisma migrate deploy`; expand, migrate and
contract are three releases, not one. See [`DATABASE.md`](DATABASE.md).
