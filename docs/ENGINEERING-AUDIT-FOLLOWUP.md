# Engineering Audit Follow-up

Implementation plan following the 3 September 2026 engineering audit of
revision `4e14c5b`.

This is not a second audit. It reconciles the original findings with the code
that landed afterward, records the remaining risks, and divides the follow-up
into work packages that another developer or coding agent can take without
repeating the completed security milestone.

**Plan baseline:** `main` at `69ab01d`, with draft PR #27
(`claude/project-handover-e0sj82`) reviewed separately as pending work.

## Executive decision

The original instruction not to expose database-backed features until SEC-01
through SEC-04 were complete has been satisfied by merged PR #14. Password
verification, API ownership, strict payload validation, private-by-default
rosters, route tests, database migrations, and dependency scanning are present
on `main`.

Do not reopen those findings as new feature work. The immediate job is to merge
the already-green Carcass Front branch, bring the documentation up to date, and
then improve the remaining account and synchronization boundaries in small,
independently reviewable releases.

## Reconciliation with the original audit

| Finding | Current status | Evidence / remaining qualification |
|---|---|---|
| SEC-01 — credentials bypass | **Closed** | `verifyCredentials` requires both fields, rejects accounts without a password, performs bcrypt verification, and never creates an account. Covered by `src/lib/__tests__/auth.test.ts`. |
| SEC-02 — known fallback session secret / admin takeover chain | **Closed** | `NEXTAUTH_SECRET` fails closed at request time; the shared anonymous identity was removed; admin grants are no longer taken from client state. |
| SEC-03 — campaign APIs lacked authorization | **Closed** | `src/lib/api/policy.ts` enforces actor, membership, campaign-admin, warband ownership, and campaign enrolment. Invite codes return preview data only. |
| SEC-04 — anonymous custom rules shared one owner | **Closed** | Cloud writes require a session and overrides are scoped by `(userId, ruleType, ruleId)`. Anonymous customization remains local-only. |
| API-01 — public directory leaked private roster/account data | **Closed** | Visibility is PRIVATE by default and the directory uses a narrow public DTO. Existing rows were backfilled to PRIVATE. |
| API-02 — unvalidated and unbounded bodies | **Closed** | `src/lib/api/parse.ts` measures bodies, applies strict Zod schemas, bounds values and JSON, and returns controlled error messages. |
| API-03 — in-memory, publicly readable bug reports | **Closed** | Reports are persisted; listing is admin-only; attribution comes from the session; submission returns a receipt. |
| API-04 — a warband GET mutated ownership | **Closed** | The mutating read was deleted. One-off repairs are required to use migrations. |
| DATA-01 — no migration history | **Closed** | Committed Prisma migrations apply from an empty Postgres and CI checks schema drift. See `docs/DATABASE.md`. |
| DATA-02 — campaign “sync” created duplicate rows | **Closed** | Superseded by SYNC-1/2/3. Campaigns are no longer local-only: a campaign acquires a cloud identity from a client-minted id, and every write carries a client-generated `opId` that `CampaignSyncOp` records, so a retry is a constraint violation rather than a second row — the duplicate-row failure this row named cannot recur. `TerritoryNode` is keyed the same way, per campaign. See [`CAMPAIGN-SYNC.md`](CAMPAIGN-SYNC.md). *This row read “contained, not complete” long after the work landed; the entry was stale, not the code.* |
| TEST-01 — no route/auth boundary tests | **Closed** | Auth, registration, campaign, custom-rule, directory, bug-report, and real-Postgres ownership tests now exist and run in CI. |
| OPS-01 — no dependable dependency gate | **Closed** | Production high/critical advisories fail CI. Draft PR #27 improves outage classification and retries transient audit-endpoint failures without treating them as passes. |
| OPS-02 — missing response hardening headers | **Closed with accepted limitation** | CSP, framing, MIME, referrer, and permissions policies are configured. The CSP permits inline Next.js bootstrap scripts; tightening it requires a nonce/dynamic-rendering decision. |
| A11Y-01 — incomplete combobox semantics | **Closed** | Active option linkage, keyboard behavior, and touch target were added. |
| MAINT-01 — broad `any` use and weak lint enforcement | **Partially closed** | Boundary code treats explicit `any` as an error. Older UI code remains warning-level debt and should be reduced by ratchet, not a repository-wide rewrite. |
| PERF-01 — unbounded directory query | **Closed** | The public directory is cursor-paginated with a deterministic order. |

## Delivery order

The packages below are deliberately ordered. A later package may start in
parallel only when its dependency line says it can.

### AUD-0 — Land the work already completed

**Priority:** immediate  
**Dependency:** none  
**Scope:** review and delivery, not new implementation

1. Review the Vercel preview for draft PR #27 at phone and desktop widths.
2. Confirm its green CI result is still current after any rebase.
3. Update the PR description: its first three sections no longer describe all
   11 commits. It must mention the Carcass Front map tables and campaign
   framework, removal of invented territory perks, catalogue-counter handling,
   and dependency-audit changes.
4. Mark the PR ready and merge it without splitting the generated data from the
   parser and tests that produce it.

**Acceptance:** PR #27 is merged; `main` remains green; no generated dataset
drift; the five Carcass Front maps and twelve corrected core maps render in the
deployed app.

### AUD-1 — Make the documentation truthful again

**Priority:** immediate, directly after AUD-0  
**Dependency:** AUD-0

Re-read code before changing status markers. At minimum reconcile:

- `docs/HANDOVER-CARCASS-FRONT.md`: remove completed map/table work from “What
  is left”; retain the zone-board adjacency, Campaign Tracker layout, and
  deliberately omitted verse as distinct limitations.
- `docs/FEATURES.md`: update stale claims about generated statlines, campaign
  tables, armouries, theme tokens, and the attack calculator.
- `docs/RESTRUCTURE-PLAN.md`: remove or annotate stale Phase 1/2 outstanding
  items, including work superseded by later parser, variant-armoury, and
  campaign commits.
- `CLAUDE.md`: reconcile the authenticated `api.github.com` environment note.

Add a small documentation test or lint script that fails when completed phase
rows still use known stale phrases only if it can be based on stable structural
markers. Do not add a brittle grep over prose merely to claim automation.

**Acceptance:** the handover, feature inventory, phase plan, and working notes
agree on what is complete; every remaining item names a concrete code or source
dependency.

### AUTH-1 — Persist and audit the application admin role

**Priority:** high  
**Dependency:** AUD-0 only; may run alongside AUD-1

The environment email allowlist closed the takeover chain, but authorization
is still derived from an address. Replace it with an auditable database grant.

Implementation outline:

1. Add a `UserRole` enum and nullable/defaulted role field through an **expand**
   migration. Follow `docs/DATABASE.md`; do not use `prisma db push`.
2. Add a one-shot, explicitly configured promotion command for the initial
   administrator. It must name the target user and report what changed.
3. During migration, read the persisted role first and temporarily fall back to
   `TRENCHLINE_ADMIN_EMAILS` only for users not yet backfilled.
4. Backfill intentional grants, then remove the runtime email fallback in a
   later release. Do not combine expansion and contraction.
5. Record grant/revoke time and actor. If a separate audit table is excessive,
   document the minimum operational log that supplies this evidence.
6. Keep role resolution on every JWT refresh so revocation takes effect without
   waiting for a new sign-in.

Tests must cover promotion, revocation of an existing JWT on refresh, an email
change that does not confer or remove authority, and failure when no bootstrap
administrator is configured.

**Acceptance:** no source file or environment email list grants admin access;
the database records the grant; route policies and client controls consume the
same issued role; migrations build an empty database and show no drift.

### AUTH-2 — Verification, recovery, and enumeration-resistant registration

**Priority:** high before inviting untrusted public sign-ups  
**Dependency:** product choice and mail delivery provider; independent of AUTH-1

Registration currently proves that a password was supplied, not that the
registrant owns the address. Its distinct duplicate response is also an account
membership oracle. These two problems should be solved together.

Implementation outline:

1. Choose and document a mail provider and the allowed sender/domain. Do not
   embed a provider-specific client throughout route handlers.
2. Reuse or replace NextAuth's verification-token model with hashed,
   single-use, expiring tokens. Store no raw bearer token.
3. Make registration return the same status and outward body whether the
   address is new, existing, OAuth-only, or already verified.
4. Do not permit credentials sign-in until the address is verified. Preserve
   OAuth sign-in semantics: the OAuth provider, not the password form, owns that
   proof.
5. Define the transition for existing password accounts. Do not manufacture an
   `emailVerified` timestamp merely because an account predates this feature;
   require verification or an explicit, audited maintainer decision.
6. Add password-reset tokens with the same generic response, expiry and
   one-time use. Add a per-user session epoch (or equivalent persisted claim)
   so a reset can revoke that user's stateless JWTs without rotating the global
   secret and signing everybody out.
7. Avoid logging addresses, raw tokens, or passwords.

Tests must use a fake mail adapter and cover token expiry, reuse, wrong user,
duplicate registration, OAuth-only accounts, reset revocation, and identical
public responses for present and absent accounts.

**Acceptance:** a credentials account cannot sign in before verification;
registration and reset do not disclose membership through body or status;
tokens are single-use and time-bounded.

### AUTH-3 — Rate-limit the public account and invite surfaces

**Priority:** high with AUTH-2; medium while access remains private  
**Dependency:** deployment/platform decision

Rate limiting belongs primarily at the edge, but the repository must state and
test the contract it expects. Protect at least:

- credentials sign-in;
- registration, verification resend, and password reset;
- campaign invite-code preview/join;
- anonymous bug-report submission.

Use per-IP limits at the edge plus normalized-account buckets for account
routes. Return `429` with `Retry-After`. Do not key only on a caller-supplied
email, which lets an attacker target another user, and do not treat a
process-local map as production enforcement on a multi-instance deployment.

**Acceptance:** the deployment configuration names the enforcement layer;
route tests cover the application response contract; operations can identify
and tune false positives without reading secrets or message bodies.

### SYNC-1 — Implement campaign cloud synchronization as a real protocol

**Priority:** medium-high product work  
**Dependency:** AUD-0; can run independently of AUTH packages  
**Status:** built, with one gap, per [`CAMPAIGN-SYNC.md`](CAMPAIGN-SYNC.md).

The design turned up something this package did not anticipate: the
`Campaign`/`TerritoryNode` tables model a campaign the app no longer creates —
four fixed territories against the store's twelve theatres or thirty-two
Carcass Front zones, with no concept of a framework or of perk provenance. That
was put to the maintainer rather than guessed at, the answer was "the rows are
example data, discard them", and the protocol, the endpoint, both queues, the
store wiring and the campaign indicator followed. Every test this section
required now exists, including the browser test of the pending / synced /
conflict / failed states.

**The gap:** nothing gives a campaign a cloud identity. `createCampaign` mints
`camp-<timestamp>` locally, which is not an id the API would recognise, so no
campaign in the app syncs today — each one is local and the indicator says so.
Closing it needs `POST /api/campaigns` to be able to represent a campaign this
app made, and a decision about territory ids, which are meaningful and stable
locally but not unique across campaigns. Both are written up in that document.

`storage.syncCampaignToCloud` is gone, along with the six fire-and-forget call
sites that ignored its answer. Do not restore the deleted create calls.

Design before implementation:

1. Decide authority per field: server-owned membership/identity, organizer-owned
   campaign settings, and player-owned warband/post-battle data.
2. Give mutations stable operation IDs and make server writes idempotent.
3. Add explicit create/read/update operations. Never use create as update.
4. Add an outbox with the same properties as roster sync: queue before sending,
   clear only after acknowledgment, and retain failed work across reloads.
5. Define conflict behavior for two devices. Compare player edit versions, not
   server receipt time. Conflicts that cannot merge must be shown, not resolved
   by last arrival.
6. Fetch before push and stop on an unavailable fetch so an offline device
   cannot overwrite a newer cloud copy.
7. Preserve campaign policy checks on every operation; a sync endpoint is not a
   trusted back door.

Required tests:

- two devices editing different fields;
- two devices editing the same field;
- repeated delivery of one operation;
- offline edit followed by reconnect;
- fetch failure before push;
- non-member, removed member, wrong warband, and campaign-admin-only changes;
- browser E2E showing pending, synced, conflict, and failed states.

**Acceptance:** one logical campaign has one cloud identity; retries do not
duplicate rows or match records; no acknowledged local edit is lost; ownership
integration tests pass against Postgres.

### OPS-1 — Finish the security delivery controls

**Priority:** medium  
**Dependency:** AUD-0; repository settings require maintainer action

1. **Needs the maintainer.** Enable GitHub's dependency graph and dependency
   review if the repository plan supports them, then add `actions/dependency-review-action@v4` as a
   high-severity PR gate. Until enabled, keep the existing explicit note rather
   than a permanently red or `continue-on-error` job.
2. Keep `npm audit` fail-closed behavior from PR #27. Verify both advisory and
   endpoint-failure paths with the stubbed CI test already introduced there.
3. ~~Add a scheduled production-dependency scan so unchanged lockfiles are
   rechecked when new advisories appear.~~ **Done** —
   `.github/workflows/dependency-advisories.yml`, daily at 07:00 UTC, running
   the same gate as the pull-request check. `scripts/__tests__/auditGate` pins
   the two identical, because the cost of copying nine lines of shell is drift
   and one copy quietly falling behind is worse than either arrangement.
4. **Needs the maintainer.** Confirm HSTS at the actual TLS terminator before
   documenting it as enforced — it cannot be observed from inside the
   application, which is the whole point of the item.
5. Run a bounded CSP nonce/static-rendering spike. Measure the affected routes
   and cache behavior; adopt nonces only if the security gain justifies making
   those routes dynamic. Otherwise record the accepted `script-src
   'unsafe-inline'` limitation and revisit it when the framework supports the
   desired policy without that trade-off.

**Acceptance:** every claimed control is observed at its real enforcement
point; scanner outages never pass; exceptions have an owner and revisit date.

### TEST-2 — Extend boundary tests through the deployed shape

**Priority:** medium  
**Dependency:** add coverage with each AUTH/SYNC package, not as one late sweep

The route-level gap from the audit is closed. Remaining coverage should focus
on seams that unit mocks cannot prove:

- credentials sign-in through the actual NextAuth route with a migrated test
  database, not only direct calls to `verifyCredentials`;
- security headers and hydration against `next start`;
- migrations plus the authorization matrix against real Postgres;
- service-worker exclusion of every current and future user-data API;
- public DTO snapshots that fail if a sensitive field is added;
- maximum body size both with and without a truthful `Content-Length` header.

**Acceptance:** the test names the boundary it proves. Avoid generic filenames
such as `routes.test.ts` for URL helpers that do not exercise route handlers.

### MAINT-2 — Continue the lint and component-size ratchet

**Priority:** low-medium; opportunistic after correctness work  
**Dependency:** none

Do not launch a repository-wide `any` cleanup. Keep new boundary code at error
level and take one cohesive area at a time:

1. Remove explicit `any` from the area being changed.
2. Raise that directory to error level only when it is warning-free.
3. Extract stateful seams from the largest live components when a feature or bug
   already requires touching them. Current candidates include
   `PlayModeView.tsx`, `CodexView.tsx`, `WarbandBuilder.tsx`,
   `AddEquipmentModal.tsx`, and `UnitCard.tsx`.
4. Prefer domain hooks and tested pure functions over file splitting that merely
   moves JSX between files.

**Acceptance:** warning count never rises; each promoted directory is enforced
in ESLint; extracted logic has focused tests; generated files are excluded from
size and lint-debt metrics.

## Explicitly accepted or deferred risks

These are not silent omissions:

- **CSP inline scripts:** accepted pending OPS-1's measured nonce spike.
- **HSTS:** controlled at the TLS terminator, not asserted by application code.
- **Anonymous local use:** supported; it conveys no cloud identity or write
  permission.
- **Campaign cloud sync:** the protocol meets its data-loss tests; it has no
  supply of campaigns until a campaign can acquire a cloud identity (SYNC-1's
  remaining gap).
- **Live match sync:** separate product work, not a shortcut through campaign
  persistence.
- **Email verification and recovery:** unavailable until AUTH-2 has a mail
  provider and generic outward responses.

## Commit and PR discipline

- One work package per branch/PR; do not combine AUTH-1's migrations with
  AUTH-2's mail flow or SYNC-1's persistence protocol.
- Commit schema, generated migration, route policy, and tests together.
- Update `docs/SECURITY.md` or `docs/DATABASE.md` in the same PR as a boundary
  decision.
- Never hand-edit generated rules data and never introduce a plausible fallback
  when a source, lookup, scan, or sync fails.
- Before marking a package ready: migrations from empty, schema-drift check,
  typecheck, lint, unit/integration tests, rules check, production build, and
  the affected Playwright paths must pass.

## Recommended next three branches

1. `docs/audit-reconciliation` — AUD-1 after PR #27 merges.
2. `security/persisted-admin-role` — AUTH-1, using expand/backfill/contract.
3. `campaign/real-cloud-sync` — SYNC-1 design and server contract; implementation
   can proceed while mail-provider decisions for AUTH-2 are pending.
