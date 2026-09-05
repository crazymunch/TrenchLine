# Database delivery

How the schema changes, and why it is done this way.

## What was wrong

`prisma/` held a `schema.prisma` and a `seed.ts` and **no migration history**.
The schema reached a database through `prisma db push`, which computes a diff
at run time and applies it. That has four consequences, and the repository was
living with all of them:

- **A schema change could not be reviewed.** There is no artefact — a reviewer
  sees the new model and has to imagine the SQL, including whether it drops a
  column or rewrites a table.
- **It could not be rolled back**, because nothing recorded what was applied.
- **The database could not be recreated**, so no test could run against a real
  one, so nothing verified the ownership rules the application depends on.
- **It could not be deployed in stages**, which is why
  `src/app/api/warbands/route.ts` carries a comment explaining that `editedAt`
  rides inside a JSON column rather than being a real column: adding one was
  judged unsafe. That is a data model bent around a delivery problem.

## The rule now

**Every schema change is a committed migration.** `prisma/migrations/` is the
history, `20260903031234_baseline` captures the schema as it stood, and CI
enforces two things on every pull request:

1. `prisma migrate deploy` applies the committed migrations to an **empty**
   Postgres. If the history cannot build the database, the build fails.
2. `prisma migrate diff --exit-code` compares the migrations against
   `schema.prisma`. A migration edited by hand, or a change someone pushed with
   `db push` and never captured, fails here rather than becoming a column that
   only exists in production.

### Making a change

```bash
# 1. Edit prisma/schema.prisma, then:
npx prisma migrate dev --name what_it_does

# 2. Read the generated SQL. This is the review artefact.
cat prisma/migrations/*_what_it_does/migration.sql

# 3. Commit the migration WITH the schema change. They are one commit.
```

### Deploying

`npx prisma migrate deploy`. **Never `db push`** against a database anyone
cares about: it is the thing this document exists to replace.

Migrations need the **unpooled** connection. `prisma/schema.prisma` sets
`directUrl = env("DIRECT_DATABASE_URL")` for exactly this: Neon's pooler runs
PgBouncer in transaction mode, which has no session state and so cannot hold
the advisory lock a migration takes. Pass both:

```bash
DATABASE_URL="<pooled Neon URL>" \
DIRECT_DATABASE_URL="<unpooled Neon URL, no -pooler in the host>" \
npx prisma migrate deploy
```

### Nothing checks that this happened, and it once did not

On 5 September 2026 Google sign-in stopped working in production. The cause
was not the auth code: **the deployed database was three migrations behind the
deployed application**, and had been for a day.

```
prisma/migrations/                       production
  20260903031234_baseline                  applied
  20260903031552_warband_visibility…       applied
  20260904224810_user_role_expand          MISSING
  20260904225558_auth_tokens_and_…         MISSING
  20260905021934_campaign_sync_expand      MISSING
```

The symptom was nothing like the cause. Signing in with Google bounced back to
the landing page with no session, on every device, which reads as an OAuth
misconfiguration — and the OAuth configuration was perfect.

**Prisma selects every column the schema declares.** The schema declared
`User.role`, `roleGrantedAt`, `roleGrantedBy` and `sessionEpoch`; the database
had none of them. So *every* query touching `User` threw `column "role" does
not exist` — including the ones NextAuth's `PrismaAdapter` makes to link a
Google account. NextAuth caught the failure and redirected to its error page,
and `pages: { signIn: '/' }` makes that page the landing page. Hence a loop
back to where you started, with nothing in the logs a user could see.

The same gap had `AuthToken` missing, so email verification and password
recovery were dead, and `CampaignSyncOp` missing, so campaign sync was dead.
Neither had been noticed, because neither is on the path a maintainer walks.

Two things to take from it:

- **A schema that is behind is invisible from the outside.** The site is up,
  the build is green, the tests pass — they run against a database built from
  the migrations, which is the one database guaranteed to be current.
- **The failure surfaces somewhere else entirely.** This one surfaced as an
  auth bug, four files away from anything to do with schema.

### Checking, before something breaks

From anywhere that can reach the database:

```sql
select migration_name, finished_at from _prisma_migrations order by started_at;
```

against `ls prisma/migrations/`. If the lists differ, the deployed app is
running on a schema it was not written for.

### When 5432 is blocked but HTTPS is not

`migrate deploy` needs a direct TCP connection on 5432, and the agent sandbox
does not have one — the proxy passes HTTPS and nothing else. **Neon also serves
SQL over HTTPS**, at `https://<host>/sql`, taking the connection string as a
`Neon-Connection-String` header. That endpoint is reachable from the sandbox,
and it is how the three-migrations-behind diagnosis above was made.

```bash
node scripts/apply-migrations-http.mjs           # report what is pending
node scripts/apply-migrations-http.mjs --yes     # apply it
```

Each migration goes up as ONE transaction carrying its statements and the
`_prisma_migrations` row that records it, so the trap below cannot be sprung.
It reports by default and writes only with `--yes`, and it refuses rather than
guessing when a migration was edited after being applied (`migrate deploy`
calls that MODIFIED and stops too), when the database records a migration this
checkout does not have, or when `DATABASE_URL` names something that is not a
Neon host.

Statements are split by a scanner that tracks quoting rather than by
`split(';')`, because a semicolon inside a string literal, a quoted identifier,
a comment or a dollar-quoted body is not a boundary — `DEFAULT 'a;b'` is
ordinary SQL and would be cut in half.
`scripts/__tests__/applyMigrationsHttp.test.mjs` covers all five cases and
needs no database.

**This was available the whole time three migrations were being pasted into
Neon's web console by hand.** The endpoint had already been used to READ
`_prisma_migrations` during that incident, and nobody thought to write through
it. Recorded because a capability nobody remembers is the same as one nobody
has.

`migrate deploy` from somewhere with a real connection is still the way. This
is what to do when that somewhere does not exist.

### The trap under any hand-applied migration

Where neither door is open, the temptation is to paste the migration's DDL into
Neon's SQL editor.

**That works and leaves a trap.** The DDL changes the schema and tells Prisma
nothing, so `_prisma_migrations` still lists the migration as pending. The next
`migrate deploy` runs it again, hits "column already exists" and fails — and now
the deploy is broken as well as the record being wrong. A half-applied state is
worse than an unapplied one, because neither side shows it.

```bash
node scripts/emit-pending-migration-sql.mjs <migration> [<migration> …]
```

emits the DDL **and** the `_prisma_migrations` row for each, in one
transaction. The row carries the sha256 of the migration file, which is what
Prisma stores and compares on the next run; a wrong checksum makes `migrate
deploy` report the migration as MODIFIED, which is louder but still a failure.
The algorithm was verified against an already-applied row before it was
trusted.

`apply-migrations-http.mjs` does the same thing without the copy-paste, and
should be preferred where the host is Neon. Both are fallbacks, not policy.

## Expand, migrate, contract

A deployment is never atomic — the old code and the new code run at the same
time, for at least the length of a rollout, and longer if a rollback happens.
So a schema change that the old code cannot tolerate takes **three** releases,
not one:

| | schema | code | safe because |
|---|---|---|---|
| **Expand** | add the new column, nullable, with a default | unchanged | old code ignores a column it does not select |
| **Migrate** | backfill | writes both old and new; reads new, falls back to old | either version can serve any row |
| **Contract** | drop the old column | reads and writes only the new | nothing left that reads the old one |

Renaming a column is the same shape: add, backfill, dual-write, switch reads,
drop. A rename done in one step is a rename that breaks every request in
flight.

Destructive steps — dropping a column, tightening a constraint, adding a
`NOT NULL` without a default — belong in **contract**, alone, after the code
that needed them has been running for long enough to be trusted.

## The administrator role

Authority used to be derived from an **address** — a constant list in
`auth.ts`, then `TRENCHLINE_ADMIN_EMAILS`. That closed the takeover chain but
left the grant on a mutable, user-supplied field, with no record of who granted
it or when, and revocable only by a deploy.

`User.role` is the grant now; `roleGrantedAt` and `roleGrantedBy` are the
evidence. `src/lib/adminRole.ts` is the one place that decides, and it reads
both sources in a defined order while the migration is in progress:

| the user | decided by |
|---|---|
| `roleGrantedAt` is set | `role`, and the email list is ignored |
| never set | the email list, for now |

The first row is what makes revocation real: demoting someone whose address is
still listed must actually demote them, or the persisted grant is decorative.
The second is what keeps a deployment working before anyone is backfilled.

This is the **migrate** step. Deleting the fallback — and `TRENCHLINE_ADMIN_EMAILS`
with it — is **contract**, a later release on its own.

### Granting it

```bash
# The very first administrator. Refuses once one exists.
node scripts/grant-role.mjs --email someone@example.com --role ADMIN --bootstrap

# Every one after that names who is making the change.
node scripts/grant-role.mjs --email someone@example.com --role ADMIN --actor boss@example.com
node scripts/grant-role.mjs --email someone@example.com --role USER  --actor boss@example.com
```

It never creates the account it promotes — a command that invents an identity
*and* gives it authority is the shape of the bug this replaced — and it reports
what changed, including when nothing did. A change takes effect on that user's
next request: the role is resolved on every JWT refresh, not only at sign-in.

## Verification, recovery and the session epoch

`AuthToken` carries both the email-verification and the password-reset links.
One model, because they have identical security properties and two
nearly-identical tables is two places to get them wrong.

**The raw token is never stored.** What goes in the row is a SHA-256 of it, so
a backup, a log or a replica someone reached does not hand over the ability to
verify an address or take an account. SHA-256 rather than bcrypt on purpose: a
work factor exists to slow a guess at a *low-entropy* secret, and these are 32
random bytes. The lookup is *on* the digest, so it has to be fast and
deterministic to be an indexed read at all.

Spending is a conditional update — `where: { id, usedAt: null }` — so two
requests arriving together cannot both succeed; the loser updates zero rows.
Rows are marked, not deleted, so a replayed link is distinguishable from one
that never existed.

`User.sessionEpoch` is how one user's stateless JWTs are revoked. A password
reset increments it, and the JWT callback refuses a token carrying an older
one. The alternative — rotating `NEXTAUTH_SECRET` — signs out every account on
the deployment to fix one.

### Mail is a deployment choice

`MAIL_TRANSPORT` is explicit and has no default:

| | |
|---|---|
| `log` | writes to the server log, for development. Prints the link but **never the address**, so a log does not become a list of who has an account here |
| `none`, or unset | no mail is sent, and the application knows it |

A real provider is a new `Transport` in `src/lib/mail.ts` and a case in
`mailer()`. Nothing in a route changes — that is the point of the seam.

**Verification is required only where mail can be sent.** Demanding proof that
nobody can produce locks every account out, including the maintainer's, so
`authRequiresVerification()` is tied to the transport. That is a real stated
limitation rather than a silent one, and it is the thing to revisit before
inviting public sign-ups.

Pre-existing password accounts are **not** given a manufactured `emailVerified`.
On a deployment with a transport configured they must verify — the same link
anyone else gets — which AUTH-2 asks for explicitly.

## Backups and rollback

Rolling back *code* is a deploy. Rolling back *schema* is not: a migration that
dropped a column cannot be undone by redeploying, because the data is gone.
That asymmetry is the reason destructive changes are isolated into their own
release.

Before any contract step:

1. Take a backup and **verify it restores**, on a scratch database. An unrestored
   backup is a hypothesis.
2. Deploy the contract migration on its own, with nothing else in it.
3. Keep the backup until the release has been live long enough that a rollback
   is no longer plausible.

Prisma has no `migrate down`. A reversal is a new forward migration, written
deliberately, which is another reason the destructive step should be small
enough to reason about on its own.

## Seeding

`prisma/seed.ts` creates a demo user and a sample warband. The demo user is
seeded **with no password** and cannot be signed into — it used to carry
`trenchline2026`, written in this repository, for an account that was also on
the admin list. Set `SEED_DEMO_PASSWORD` if you want to sign in as it locally,
and choose your own value.

## Testing against a real database

`src/app/api/__tests__/ownership.integration.test.ts` runs the API handlers
against real rows: two unrelated users, their warbands, a campaign, and the
four ways a territory claim can be wrong. It **skips itself** when
`DATABASE_URL` is unset, so the fast suite stays fast and a contributor without
Postgres still gets a green run. CI sets it, so the skip cannot hide a failure
there.

Locally:

```bash
DATABASE_URL=postgresql://... npx prisma migrate deploy
DATABASE_URL=postgresql://... npx vitest run
```
