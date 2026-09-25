# Security

What is enforced, what is deliberately accepted, and what to do when an
advisory lands.

## Boundaries

| boundary | rule | enforced by |
|---|---|---|
| sign-in | email **and** password, verified against a stored hash | `verifyCredentials`, `src/lib/__tests__/auth.test.ts` |
| registration | separate endpoint; issues no session | `POST /api/auth/register` |
| session secret | required; the server refuses to start without one | `src/lib/env.ts` |
| admin | `TRENCHLINE_ADMIN_EMAILS` and nothing else, resolved on every request; **no built-in default**, so unset means nobody | `isUserAdmin`, `src/lib/__tests__/env.test.ts` |
| warbands | a caller reads and writes only their own | route + integration tests |
| campaigns | member to read, campaign-admin to administer, owner-and-fielded to claim | `src/lib/api/policy.ts` |
| custom rules | scoped by `(userId, ruleType, ruleId)`; signed out is 401 | route + integration tests |
| bug reports | anyone may file, only an admin may list | route tests |
| every request body | `.strict()` schema, bounded, measured before parsing | `src/lib/api/parse.ts` |

Anonymous use is supported everywhere it was. It is **local-only**: the cloud
returns 401 rather than inventing an owner. A shared account for signed-out
writes is what let a stranger create an admin.

## Deploying

Required in every environment:

- `NEXTAUTH_SECRET` — unique per environment, `openssl rand -base64 32`.
  **Rotating it invalidates every session, which is how they are revoked.**
- `DATABASE_URL`

Strongly recommended:

- `TRENCHLINE_ADMIN_EMAILS` — **admin is a deployment setting only.** There is
  no in-source default to rely on, and there must not be one: a built-in
  address grants authority from source code, which a deployment cannot revoke
  without a release and which every fork and clone inherits. Unset, nobody is
  an administrator; the server starts, serves every other request, and prints
  the reason once at startup (`src/instrumentation.ts`).

  This is ADM-1. Until 25 September the module held the maintainer's personal
  address as `DEFAULT_ADMIN_EMAILS`, three lines below a comment calling the
  list "deliberately empty by default". Not a credential — the sweep of that
  date found none in the tree or its history — but an identity is half of one,
  and it told a reader of a public repository which account to go after.

See `.env.example` for the full list.

## Incident: revoking sessions

Sessions are stateless JWTs, so there is no row to delete. Rotate
`NEXTAUTH_SECRET` and redeploy: every existing token fails verification
immediately. There is no partial version of this — it signs everyone out, and
that is the intended blast radius for an incident.

## Dependency advisories

`npm audit --omit=dev --audit-level=high` runs on every pull request, in its
own job.

**Production dependencies only.** A dev-only advisory is worth knowing about
and is not a reason to block a release, because it never ships.

**An unreachable scanner fails the build.** The engineering audit's own
`npm audit` got an HTTP 403 and could report nothing; a scanner that cannot
reach its data must never read as a pass, because a clean-looking report is
worse than no report. The job distinguishes "ran and found something" from
"could not run" and fails loudly either way.

### When something is flagged

In order of preference:

1. **Update the direct dependency.**
2. **Pin the transitive copy** with an npm `override`. Prefer `"$name"`, which
   forces every copy to match the direct dependency, over a hard-coded range
   that drifts.
3. **Document an exception**, with an owner and a date to revisit. Never
   silence the gate.

Do **not** take a major framework upgrade because `npm audit fix --force`
suggested one. That is how a security fix becomes a migration project, and how
security fixes stop shipping.

### Current exceptions

None. The one that existed is recorded below because the reasoning generalises.

### Worked example: postcss

`postcss <= 8.5.22` carried four high-severity advisories — XSS via an
unescaped `</style>`, and three variations on `sourceMappingURL` reading
arbitrary `.map` files. It reached production through `next@15.5.24`, which
bundles its own copy, and `npm audit fix --force` offered exactly one remedy:
**upgrade to `next@16`**.

The real exposure here is low: all four require processing attacker-controlled
CSS, and this app compiles its own stylesheets at build time from its own
source. That is an argument for not panicking, not for ignoring it — an
advisory you have reasoned about is still an advisory.

The fix was option 2. `postcss` was already a direct devDependency at
`^8.4.49`; bumping it to `^8.5.26` and adding `"overrides": { "postcss":
"$postcss" }` makes **every** copy resolve to the fixed release, Next's
included. No framework upgrade, and `next build` still compiles the CSS.

## Known, accepted, and not fixed

Written down because an unrecorded gap is one nobody revisits.

- **Registration is enumerable.** A distinct 409 for an address that already
  exists is a membership oracle whatever the body says. Closing it means
  answering every registration identically and sending the real outcome to the
  address, and there is no mailer. Returning 201 instead would tell a genuine
  user their account was created when it was not.
- **No rate limiting.** It belongs at the reverse proxy, which is outside this
  repository. Until it exists, sign-in and registration are only bounded by
  bcrypt's cost.
- **Admin is still email-derived**, from configuration only — no address is
  baked in anywhere (ADM-1). Email remains a poor identity for a role; a
  persisted, auditable role on the user record is the real fix and needs its
  own migration.
- **No email verification.** `emailVerified` stays null because nothing proves
  a registrant owns the address, and the column should not claim otherwise.
- **`dependency-review` is not enabled.** It needs the Dependency graph and
  GitHub Advanced Security on the repository. See the note in `ci.yml`.
