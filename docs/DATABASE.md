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

### Two database addresses, and only one of them is safe to write to

`DATABASE_URL` is the **application's** database. In this development
environment it points at production Neon — it is what
`scripts/apply-migrations-http.mjs` uses.

`TRENCHLINE_TEST_DATABASE_URL` is the **test** database. It is the only one the
integration suites read, it must be a local host, and
[`src/lib/integrationDb.ts`](../src/lib/integrationDb.ts) enforces that.

The split exists because the nine integration suites used to read
`DATABASE_URL` with no check of any kind, and several of them end with a
`deleteMany`. Running `npm test` in this environment would have created and
deleted rows in production. Nothing had gone wrong only because the sandbox
cannot open TCP 5432 — a network accident standing in for a safety rule, and
one that stops protecting anyone the moment the tests run somewhere with a
working connection.

| `TRENCHLINE_TEST_DATABASE_URL` | What happens |
|---|---|
| unset | the integration suites skip; the rest of `npm test` is green |
| a local host | they run |
| anything else | the run **fails**, naming the host |

The last row is the point. Skipping and refusing must not look the same: a
developer who has pointed this at a server has made a mistake worth
interrupting, and a silent skip would hide it. The host check is an allowlist
rather than a denylist of known production hostnames, because a denylist fails
open the first time infrastructure changes.

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

## `Warband.shareToken` — the one column SH-1 adds

`20260925090000_warband_share_token`: one nullable column and one unique index,
which is the whole of it.

```sql
ALTER TABLE "Warband" ADD COLUMN "shareToken" TEXT;
CREATE UNIQUE INDEX "Warband_shareToken_key" ON "Warband"("shareToken");
```

**Purely additive, so it is an expand and nothing else.** Every existing row gets
`NULL`, which is "not shared", so the migration publishes nothing. No backfill,
no contract step.

### This project's ordering rule: name a migration after the latest one applied

**The rule, and it is ours rather than the tool's:**

> Before naming a migration folder, read back what production has recorded, and
> give the folder a timestamp later than the newest of them — so the recorded
> history stays in the order the changes actually happened.

**What the tool does and does not promise.** Prisma's own reference says only that
`migrate deploy` "applies all pending migrations"; it documents no ordering
constraint, and nothing in its docs says a migration whose folder name sorts
BEFORE an already-recorded one is refused. So **do not rely on a refusal** — treat
the folder name as the only guard there is. (An earlier version of this section
claimed `migrate deploy` refuses such a migration. That claim was not checked
against Prisma's documentation and is not supported by it; it is withdrawn.)

What that means in practice: an out-of-order migration will most likely just be
applied, and the damage is not an error but a **history that no longer reads in
order** — `_prisma_migrations` says A then B while the code was written assuming
B then A, and the next person reconstructing the schema's history from it is
misled. That is why the name is decided deliberately rather than taken from the
clock.

**How to read back what is recorded:**

```bash
node scripts/apply-migrations-http.mjs        # report only; no arguments, no confirmation
```

It prints the database host, then two counts — how many folders are in
`prisma/migrations` and how many the database records as applied — and then the
**pending ones by name**, with a statement count each. It does not list the whole
recorded set, so to see the newest recorded name, read the pending list against
the folder listing: what is in `prisma/migrations` and NOT pending is what has
been applied.

This bites in exactly the case this repository is in: **several branches open at
once.** A migration created on Monday and merged on Friday can easily carry a
timestamp older than one another branch merged on Wednesday — and nothing in the
branch, the review or CI notices, because both are valid in isolation and the
disagreement only exists against the database's record.
`20260925090000_warband_share_token` was checked this way: the newest name
recorded before it was `20260919090000_battle_records`.

**Two things the script does check itself**, whatever Prisma does — both in
`planPending`, and both fail loudly rather than proceeding: a migration whose SQL
was **edited after it was applied** (the recorded checksum and the file disagree,
so re-applying would run SQL the database has already partly seen), and a
migration the **database records that this checkout does not have**. A migration
already applied is never renamed or edited — `CLAUDE.md` — and the way out of a
migration named too early is a new migration with a later name, never a rename.

**When it goes up.** Pending migrations are applied **as part of merging the pull
request that adds them**, under `CLAUDE.md`'s standing authorisation, and what
`_prisma_migrations` reads back afterwards is reported. For an additive column the
new build selects — `shareToken` is one — the column must exist before the build
that reads it serves traffic, or every warband read 500s; applying it as the PR
merges is what puts it there. (An expand the OLD code must tolerate is the case
the three-release table above describes, and that one is staged differently.)

**Nullable AND unique on purpose.** A token is what a reader presents instead of
a session, so two rosters must never answer to one. Postgres treats `NULL`s as
distinct under a unique index, so any number of rosters may be unshared while no
two shared rosters can collide — and "not shared" is a state the column can hold
rather than a sentinel value someone has to remember.

**A real column, not a key in the `notes` metadata JSON.** That JSON is where
`editedAt` and the other client-owned fields ride, and the note in
`src/app/api/warbands/route.ts` explains why they do. This one cannot: the share
page looks a roster up **by** this value, with no session, so it has to be
indexed and unique, and a JSON key can be neither. It is also not the client's
statement about the client's copy — it is a grant the server issued.

**The token is random, never derived from the id.** `warbandCode(id)` is derived
from the id and is printed in the builder for anybody to read out; a token
derived the same way would make every roster in the database publicly readable
the moment one person shared theirs. `crypto.randomBytes(24)`, base64url.

Clearing it writes `NULL`, which is what makes "Stop sharing" final: the old link
then matches no row, so there is no state in which a stopped share still
resolves. See [`ROSTER-FILE.md`](ROSTER-FILE.md) for why the token is absent from
the `Warband` type altogether.

### What a shared roster shows, and why that is a model rather than a page

The column decides who can fetch a roster. It says nothing about what the page
then prints, and those are two separate decisions that were confused twice.

**The roster is not sent.** `rosterSheet` runs on the SERVER and the client
component is handed a `RosterSheetModel`. A `'use client'` component's props are
serialised into the HTML, so passing the loader's object put the owner's notes,
every model's notes and lore, the `chronicleLog`, snapshot labels naming
opponents, and the `ledger`'s admin entries — **another user's data** — into
view-source on a shared page.

**And the model itself takes an `audience`.** Moving the projection to the server
stopped the roster being sent; it did not settle what the sheet prints, and four
things it printed were the owner's alone:

| Field | Why it cannot be public |
| --- | --- |
| PLAYER (`creatorName`) | An ACCOUNT name. For an account registered by email with no name set, `api/auth/register/route.ts` falls back to `email.split('@')[0]` — so a share link published the owner's email, less the domain |
| the bio (`lore`) | `presentRoster` has always read it as private; a roster sheet is not the place to overrule that |
| a provenance `note` | The player's own words about how they got something |
| the legacy `advancements` strings | Free text they typed |

`audience` defaults to **`'public'`**. That direction is the point: a field added
to the model tomorrow is absent from the share page without anybody remembering
to remove it, and forgetting fails closed. A unit card carries a named
`SheetCardModel` rather than a whole `PresentedModel` for the same reason — a
field added upstream has to be named here to reach the sheet at all.

`rosterSheet.test.ts` plants fourteen distinct strings in a fixture, asserts the
fixture really carries all fourteen, then stringifies the projection and searches
for each. It also asserts the sheet still renders, so it cannot pass by rendering
nothing.

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

**There is no seed.** The Prisma seed script — prisma/seed.ts — is deleted and
`package.json` no longer declares a `prisma.seed` command, so
`prisma migrate dev` creates no rows. (The path is written plain rather than in
a code span because `scripts/__tests__/docPaths.test.mjs` requires every
backticked repository path in the docs to exist, and this one deliberately does
not any more.)

It used to create a demo user, a sample warband and a sample campaign, and
every part of that was invented: a Lieutenant with a statline no catalogue
prints (`Ranged +1`, `Melee +2`, `Armour "+2"`), a "Standard Issue Bolt-Action
Rifle" with keywords the game does not have, a `Standard (1 Wound)` damage line
in a game with no Wounds characteristic, an injury and an advancement nobody
rolled, and four territories carrying mechanical perks — `+5 Ducats supply
bonus per round`, `+2 Glory on Victory when defending` — presented in the
campaign hub beside rules the pipeline derives. Every statline, cost, keyword
and rule in this app is derived from `data-sources/`; a seed that types them by
hand is the first rule of `CLAUDE.md` broken in the one file a new contributor
is most likely to copy from.

A developer who wants data locally registers an account and builds a warband,
which exercises the real paths and produces real derived data.

The demo user had already been defanged twice — it carried `trenchline2026`,
written in this public repository, for an account that was also on the admin
list, and was later seeded with no password at all. `SEED_DEMO_PASSWORD` is
gone with the rest of it.

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
