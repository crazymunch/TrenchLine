# External code audit, 17 September 2026: review and disposition

Date: 17 September 2026. Status: review and sequenced work, **not implemented**.
Reviewed an external audit produced by Gemini against `main` pinned to
`1bb2454` (the merge of PR #51), not against
`claude/project-handover-e0sj82`, which carries two further commits.
Every claim below was re-tested in this checkout rather than taken from the
report.

## Executive disposition

Two of the four findings are real, one is real but its proposed remedy is
dangerous and must not be applied as written, and one is a false positive.
Separately, the audit walked past a larger problem than any it reported.

| # | Finding | Audit says | Verdict |
| --- | --- | --- | --- |
| 1 | CRLF breaks the extract parsers | HIGH, 3 suites failing | **Agree on mechanism. Not failing here — it is a portability defect, not a live one. Scope is wider than the three files named.** |
| 2 | ESLint does not ignore `dist/**` | MEDIUM, lint fails by default | **Premise is wrong — lint passes. Worth the one line anyway.** |
| 3 | Test isolation leak in `ownership.integration.test.ts` | LOW | **Leak is real. The proposed fix deletes a production row. Reject the remedy, keep the finding.** |
| 4 | `HANDOVER-CARCASS-FRONT.md` is stale | MEDIUM | **False positive. Already reconciled; AUD-1 was executed.** |
| 5 | — | *not reported* | **The integration suite runs against whatever `DATABASE_URL` is set to, with no guard. In this environment that is production.** |

## Baseline reconciliation

Measured on `claude/project-handover-e0sj82` at `d578250`:

| | Audit | Measured |
| --- | --- | --- |
| Test files | 126 suites, 122 passing | **127 files, 118 passing + 9 skipped** (integration skipped with no database) |
| Tests | 1,595 / 1,597 | **1,600 passing + 117 skipped = 1,717** |
| Failures | 4 | **0** |
| Lint | fails; 11 errors, 874 warnings | **0 errors, 42 warnings — exactly at the `--max-warnings=42` cap** |

The audit's own numbers do not reconcile: 1,597 − 1,595 is two, not the four
failures it reports. The likely reading is that "4 failing tests" means four
failing *files*, which matches three CRLF suites plus the ownership suite. The
difference in totals is partly the two-commit baseline gap — PR #52 adds 33
tests — and partly that the report counts skipped tests inconsistently.

None of this changes the findings. It does mean the headline "4 failing tests"
should not be read as a regression in `main`: **`main` is green on a Linux
checkout**, and the failures the audit saw were a property of its own working
tree.

---

## Finding 1 — CRLF in the extract parsers

**Agreed on mechanism, downgraded on severity, widened on scope.**

The diagnosis is correct and reproduces exactly:

```js
const TOC_ROW = /^(.+?)\s*\t(\d{1,3})$/;
'Chapter One\t12'.match(TOC_ROW)    // → ['Chapter One\t12', 'Chapter One', '12']
'Chapter One\t12\r'.match(TOC_ROW)  // → null
```

`\r` is a LineTerminator in ECMAScript, so `.` will not match it, and `$`
without the `m` flag anchors to the very end of input. A trailing `\r` between
the last `.` and the `$` makes the whole pattern fail. Silently — the parser
finds zero rows and reports nothing, which is exactly the failure mode
[rule 2](../CLAUDE.md#2-never-invent-a-fallback) exists to prevent.

**Not HIGH.** All three named suites pass in this checkout (97 tests, green).
The defect is latent and appears only on a checkout with CRLF endings — a
Windows contributor, or a `.txt` produced by `rules:extract` run on Windows.
There are no Windows contributors today and CI is ubuntu. It is worth fixing
because it is cheap and because the failure is silent, not because anything is
broken right now.

**Wider than three files.** The audit names `parse-commentaries.mjs`,
`parse-core-rules.mjs` and `parse-warbands.mjs` — the three whose tests happened
to catch it. Eleven parser modules under `scripts/lib/` split on `'\n'`, and
several have no `\r` defence at all: `parse-campaign.mjs` (seven call sites),
`parse-keywords.mjs`, `parse-scenarios.mjs`, `changelog-keywords.mjs`. Patching
only the three that were caught fixes the symptom and leaves the class.

The audit's `.replace(/\r/g, '')` is also slightly too broad: it deletes a
carriage return anywhere in the text, not just at a line end. Normalising
`\r\n` and lone `\r` to `\n` is the correct transformation.

**`.gitattributes` is the primary fix**, and it alone resolves the reported
failures, because the `.txt` extracts are committed and git will normalise them
on checkout. The code change is the belt-and-braces half, for text that never
goes through git.

## Finding 2 — `dist/**` missing from the ESLint ignores

**Agreed as a one-line change. The stated premise is wrong.**

`npm run lint` passes in a clean checkout: 0 errors, 42 warnings, exactly at the
ratchet cap. It does not "fail by default".

It cannot fail the way the audit describes, because **nothing in this project
emits `dist/`**. There is no `vite.config.*`, no `outDir` anywhere, and no
script that writes one; `next build` writes `.next`. The `dist` and `dist-ssr`
lines in `.gitignore` are vestigial, left from the Vite scaffold the app was
built on before the Next migration — which is consistent with the history
[`AUDIT.md`](AUDIT.md) records. The minified `dist/assets/index-*.js` the
auditor linted is Vite's output naming, so it came from a build in their tree,
not from this repository.

Add the ignore anyway: one line, no cost, and it stops a stale directory from
blocking a lint run. Downgrade to LOW. While there, decide whether the
`.gitignore` entries should go too, or carry a comment saying why they are kept.

## Finding 3 — Isolation leak in the ownership test

**The finding is real. The proposed remedy must not be applied.**

The leak is as described. `beforeEach` deletes only `@ownership.test`
addresses:

```ts
await prisma.user.deleteMany({ where: { email: { endsWith: '@ownership.test' } } });
```

and the test at line 333 asserts a different, real address is globally absent:

```ts
expect(await prisma.user.findUnique({ where: { email: 'commander@trenchline.org' } }))
  .toBeNull();
```

`prisma/seed.ts` creates that row, so any database that has been seeded fails
the assertion. That much is correct.

**The proposed fix adds `commander@trenchline.org` to the `deleteMany`.** Do not
do this. The suite constructs its Prisma client from the ambient environment:

```ts
const url = process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: url ?? 'postgresql://unused' } } });
```

`DATABASE_URL` in the working environment points at **production Neon**
(the `*.neon.tech` endpoint named in `DATABASE_URL`; the host is deliberately
not written here, because this repository is public) — see
[`DATABASE.md`](DATABASE.md). Adding
that address to a `beforeEach` delete means every local test run removes a real
production user, and `User` cascades to warbands, campaigns, campaign
memberships and custom-rule overrides. That account is the one the six warbands
in task #11 were reassigned *off*; deleting it is not a no-op and is not
recoverable from the test run.

It is also the first unscoped delete in the suite. All nine integration files
today delete only inside a synthetic domain they own — `@ownership.test`,
`@sync.test`, `@publish.test`. That discipline is the only thing making it safe
to point this suite at a real database at all, and this change is precisely
what breaks it.

**Correct fix: assert the invariant the test actually means.** The subject is
"a signed-out write creates nothing", not "this address does not exist in the
universe". Compare a snapshot across the request instead of asserting global
absence:

```ts
const shared = async () => prisma.user.findUnique({
  where: { email: 'commander@trenchline.org' },
  select: { id: true, createdAt: true, updatedAt: true },
});

it('creates no shared account for a signed-out write', async () => {
  const before = await shared();
  as(null);
  expect((await post(rulesPOST, override)).status).toBe(401);
  expect(await shared()).toEqual(before);
});
```

This is true whether or not the row was seeded, it deletes nothing, and it is
*stronger* than the original: `User.updatedAt` is `@updatedAt`, so the upsert
that was the original defect would move it and fail the test even on a database
where the row already exists.

**Correction, from running it.** An earlier draft of this document said the old
assertion "could not catch that case at all". That is wrong, and the four-way
measurement says so — seeded/absent against sabotaged/clean, on a real
Postgres:

| Row seeded? | Defect present? | Old assertion | New assertion |
|---|---|---|---|
| absent | yes | fails | fails |
| seeded | yes | fails | fails |
| seeded | **no** | **fails** | passes |

On a seeded database the old assertion fails *unconditionally*. It is not blind
to the defect; it is noise. That is worse in a different way than being blind:
a test that fails whether or not the bug exists teaches people to ignore it.

## Finding 4 — Documentation reconciliation

**Rejected. False positive.**

`docs/HANDOVER-CARCASS-FRONT.md` line 167 onward already reads:

> ## What is left
>
> **Nothing from the original CF-1..CF-5 list.** What remains is the loose ends
> below, plus two things this pass deliberately did not do.

The deployment maps the audit says are still listed as outstanding are struck
through and marked **Done**, with the finding that the rulebook's twelve maps
were separately wrong. The duplicate-keys item is struck through and marked
**Fixed**. AUD-1 was executed and closed.

The section heading "What is left" is still there, because there *are* loose
ends under it — the deliberately-unparsed Vision of Leviathan verse, the
tracker sheet's layout, and the 21 armoury rows naming Battlekit the catalogues
lack. None of them are maps, exploration tables or patrons.

The most likely explanation is that the heading was matched without the
sentence beneath it being read. No work to do.

---

## Finding 5 — not in the audit: the integration suite has no production guard

**This is the one that matters, and the audit walked past it.**

All nine integration suites select their database the same way:

```ts
const url = process.env.DATABASE_URL;
const describeDb = url ? describe : describe.skip;
```

There is no vitest setup file, and `vitest.config.mts` sets no environment. So
the rule is **"run against whatever `DATABASE_URL` happens to be"**, and in this
environment that is production. Running `npm test` here right now creates and
deletes user rows, campaigns, warbands and overrides in the production
database.

Nothing has been damaged, because every suite confines itself to a synthetic
domain. But that safety rests entirely on each test author remembering, and
nothing enforces it — which is how Finding 3's proposed remedy got written in
the first place. The guard is missing, not the discipline.

The fix inverts the default. Integration tests should run only against a
database explicitly nominated for testing, and should **fail loudly** rather
than skip when the nomination looks wrong — a misconfigured test database is an
error, not a reason to quietly pass.

Sketch, as a shared helper the nine suites import instead of reading the
environment themselves:

```ts
/** The database integration tests are allowed to write to, or null to skip. */
export function testDatabaseUrl(): string | null {
  const url = process.env.TRENCHLINE_TEST_DATABASE_URL;
  if (!url) return null;                       // no database: skip, as today
  const host = new URL(url).hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(
      `Integration tests refuse to run against ${host}. `
      + 'TRENCHLINE_TEST_DATABASE_URL must name a local database; '
      + 'they create and delete rows.',
    );
  }
  return url;
}
```

CI already uses `postgresql://postgres:postgres@localhost:5432/trenchline_ci`,
so the allowlist costs nothing there — `.github/workflows/ci.yml` gains one
environment line. An ambient production `DATABASE_URL` then skips the
integration suites instead of writing to them.

---

## Work packages

Sequenced, independent, and none of them blocking each other. All four together
are roughly a day.

### PORT-1 — CRLF cannot break the pipeline again

**Priority:** medium. **Blocks:** nothing.

1. Root `.gitattributes`:
   ```gitattributes
   * text=auto eol=lf
   ```
   Per-extension rules are unnecessary once `text=auto eol=lf` is set; add
   explicit `binary` entries for `*.pdf`, `*.png`, `*.jpg`, `*.woff2` so git
   never attempts to normalise the rulebook PDFs or the baked assets.
2. One shared reader in `scripts/lib/` — `toLines(text)` and `readLines(path)` —
   normalising `\r\n` and lone `\r` to `\n` before splitting. Move every parser
   that splits on `'\n'` onto it. Eleven files; mechanical.
3. A regression test that feeds the *same* fixture through a parser twice, once
   LF and once CRLF, and requires identical output. Without it the fix rots the
   first time somebody adds a parser.

**Acceptance:** `npm run rules:check` clean — the generated dataset must be
byte-identical before and after. That is the only proof the refactor changed
nothing, and [rule 1](../CLAUDE.md#1-never-write-game-data-by-hand) makes it the
gate that matters.

### MAINT-3 — ESLint ignores build output that no longer exists

**Priority:** low. **Blocks:** nothing.

Add `'dist/**'` to `ignores` in `eslint.config.mjs`, with a comment saying it is
defensive: nothing emits it, and the entry exists so a stale directory from an
older scaffold cannot block a lint run. Decide in the same change whether
`dist` and `dist-ssr` stay in `.gitignore`.

**Acceptance:** `npm run lint` still reports 0 errors and 42 warnings. The cap
must not move.

### TEST-02 — The ownership test asserts what it means

**Priority:** medium. **Blocks:** nothing.

Replace the global-absence assertion with the before/after snapshot above. Do
**not** add `commander@trenchline.org` to any `deleteMany`.

**Acceptance:** sabotage, per the project's usual standard — restore the
upsert in `custom-rules/route.ts` and the test must fail. The current assertion
does not catch that on a seeded database; the replacement must.

### TEST-03 — Integration tests cannot point at production

**Priority:** high. **Blocks:** nothing, but do it before TEST-02 so the
ownership work is done under the guard.

1. An `integrationDb` helper, as sketched above, beside the suites it serves.
   The path is deliberately not written as one: the file does not exist yet,
   and `scripts/__tests__/docPaths.test.mjs` requires every repository path a
   document names to be real. Throw on a non-local host;
   return null when unset.
2. Move all nine suites onto it. They stop reading `process.env.DATABASE_URL`.
3. `.github/workflows/ci.yml` sets `TRENCHLINE_TEST_DATABASE_URL` to the same
   value as `DATABASE_URL`.
4. `docs/DATABASE.md` records the split: `DATABASE_URL` is the app's database
   and may be production; `TRENCHLINE_TEST_DATABASE_URL` is the one tests are
   allowed to write to and must be local.

**Acceptance:** with production `DATABASE_URL` set and
`TRENCHLINE_TEST_DATABASE_URL` unset, `npm test` skips the nine suites and is
green. With `TRENCHLINE_TEST_DATABASE_URL` pointed at a remote host, the run
fails with the explanation, rather than skipping or proceeding.

## Not doing

- **Finding 4.** Nothing to reconcile; the document already says what the audit
  asks it to say.
- **Patching only the three parsers the audit named.** It fixes the three tests
  that caught the bug and leaves eight more files with the same defect.
- **Adding `commander@trenchline.org` to a `deleteMany`.** Covered above; it is
  a production data change wearing a test fix's clothes.
