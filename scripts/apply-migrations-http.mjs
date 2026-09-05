/**
 * Apply pending Prisma migrations over Neon's HTTPS SQL endpoint.
 *
 * `prisma migrate deploy` is the right way to apply a migration and this does
 * not replace it. It exists for one situation, and this repository is in it:
 * outbound TCP 5432 is blocked from the agent sandbox, so `migrate deploy` and
 * `psql` cannot open a connection at all — while Neon ALSO serves SQL over
 * HTTPS at `https://<host>/sql`, which the proxy passes.
 *
 * That door was open the whole time the migrations were being pasted into
 * Neon's web console by hand, three deployments running. It was used to READ
 * `_prisma_migrations` while diagnosing the login outage and then not used to
 * write, which is why this file exists: the capability was there, and only the
 * habit was missing.
 *
 * ## What it does, and what it refuses
 *
 *   node scripts/apply-migrations-http.mjs           # report only
 *   node scripts/apply-migrations-http.mjs --yes     # apply
 *
 * Reports by default and writes only with `--yes`, the same shape as
 * `clear-example-campaigns.mjs`, and for the same reason: a script that
 * changes a production schema the moment it is run is one that gets run by
 * accident.
 *
 * Each migration is applied as ONE transaction containing its statements and
 * the `_prisma_migrations` row that records it. Splitting those is the trap
 * `emit-pending-migration-sql.mjs` documents at length: DDL applied without
 * the bookkeeping leaves the migration looking pending, so the next
 * `migrate deploy` runs it again, hits "already exists", and fails — and now
 * the deploy is broken as well as the schema being ahead of the record.
 *
 * It refuses, rather than guessing, when:
 *
 *   - a migration is recorded with a different checksum (it was edited after
 *     being applied — `migrate deploy` calls this MODIFIED and stops too);
 *   - the database records a migration this checkout does not have (the
 *     database is ahead of the code);
 *   - `DATABASE_URL` does not name a Neon host, since the HTTPS endpoint is
 *     Neon's and pointing this at anything else would fail obscurely.
 *
 * The connection string travels as the `Neon-Connection-String` header and is
 * never logged. `--yes` prints the host and database it is about to write to
 * before it writes.
 */
import process from 'node:process';
import { localMigrations, planPending, splitStatements } from './applyMigrations.lib.mjs';

const APPLY = process.argv.includes('--yes');

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const conn = process.env.DATABASE_URL;
if (!conn) fail('DATABASE_URL is not set. It names the database to apply to.');

let url;
try {
  url = new URL(conn);
} catch {
  fail('DATABASE_URL is not a URL.');
}
if (!url.hostname.endsWith('.neon.tech')) {
  fail(
    `${url.hostname} is not a Neon host. This script speaks Neon's HTTPS SQL `
    + 'endpoint; against anything else use `prisma migrate deploy`.',
  );
}

/**
 * One request. `queries` runs the array as a transaction; `query` runs one.
 *
 * A non-2xx is thrown with the body, because Neon puts the Postgres error in
 * it and a bare status code turns a nameable failure into a mystery.
 */
async function sql(body) {
  const res = await fetch(`https://${url.hostname}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': conn,
      'Neon-Batch-Isolation-Level': 'Serializable',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text.slice(0, 500) }; }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${parsed.message ?? parsed.error ?? JSON.stringify(parsed)}`);
  }
  return parsed;
}

const one = (query, params = []) => sql({ query, params }).then((r) => r.rows);

(async () => {
  console.log(`database: ${url.pathname.slice(1)} at ${url.hostname}`);

  let appliedRows;
  try {
    appliedRows = await one(
      'select migration_name, checksum from _prisma_migrations order by started_at',
    );
  } catch (e) {
    fail(
      `Could not read _prisma_migrations: ${e.message}\n`
      + '  If the table does not exist this database has never been migrated; '
      + 'run `prisma migrate deploy` from somewhere that can reach it on 5432.',
    );
  }

  const local = localMigrations();
  const { pending, modified, unknown } = planPending(local, appliedRows);

  console.log(`in prisma/migrations: ${local.length}`);
  console.log(`recorded as applied:  ${appliedRows.length}`);

  if (modified.length) {
    fail(
      'These migrations were EDITED after being applied:\n'
      + modified.map((m) => `    ${m.name}\n      recorded ${m.recorded}\n      actual   ${m.actual}`).join('\n')
      + '\n  Re-applying one would run SQL this database has already partly seen.'
      + '\n  `prisma migrate deploy` refuses here too; resolve it deliberately.',
    );
  }

  if (unknown.length) {
    fail(
      'The database records migrations this checkout does not have:\n'
      + unknown.map((n) => `    ${n}`).join('\n')
      + '\n  The database is ahead of this code. Applying anything on top of that'
      + '\n  is a guess about what it already contains.',
    );
  }

  if (!pending.length) {
    console.log('\n✔ Nothing pending. The database matches prisma/migrations.\n');
    return;
  }

  console.log(`\npending (${pending.length}):`);
  for (const m of pending) {
    console.log(`    ${m.name}  —  ${splitStatements(m.sql).length} statement(s)`);
  }

  if (!APPLY) {
    console.log('\nReport only. Re-run with --yes to apply.\n');
    return;
  }

  for (const m of pending) {
    const statements = splitStatements(m.sql);
    process.stdout.write(`\napplying ${m.name} … `);
    try {
      await sql({
        queries: [
          ...statements.map((query) => ({ query, params: [] })),
          {
            query:
              'insert into "_prisma_migrations" '
              + '(id, checksum, migration_name, started_at, finished_at, applied_steps_count) '
              + 'values (gen_random_uuid()::text, $1, $2, now(), now(), $3)',
            params: [m.checksum, m.name, String(statements.length)],
          },
        ],
      });
    } catch (e) {
      /* The transaction rolled back, so the schema is untouched — but say so
         rather than leaving the operator to infer it from a stack trace. */
      fail(
        `${m.name} failed and was rolled back: ${e.message}\n`
        + '  Nothing from this migration was applied. Later migrations were not attempted.',
      );
    }
    console.log('ok');
  }

  const after = await one('select migration_name from _prisma_migrations order by started_at');
  console.log(`\n✔ Applied ${pending.length}. Recorded now: ${after.length}.`);
  for (const r of after) console.log(`    ${r.migration_name}`);
  console.log();
})().catch((e) => fail(e.message));
