/**
 * The parts of `apply-migrations-http.mjs` worth testing on their own.
 *
 * Split out so the SQL splitter and the pending-diff can be exercised against
 * the repository's real migration files without a database, a network, or a
 * credential anywhere near the test.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../prisma/migrations');

/** Prisma's own checksum: sha256 of the migration file, hex. */
export const checksum = (sql) => crypto.createHash('sha256').update(sql).digest('hex');

/**
 * Every migration in the repository, oldest first.
 *
 * Directory order IS chronological — Prisma names them with a timestamp
 * prefix — and it is what `migrate deploy` uses, so sorting by anything else
 * would apply them in an order the tool never would.
 */
export function localMigrations(dir = MIGRATIONS_DIR) {
  return fs.readdirSync(dir)
    .filter((d) => fs.existsSync(path.join(dir, d, 'migration.sql')))
    .sort()
    .map((name) => {
      const sql = fs.readFileSync(path.join(dir, name, 'migration.sql'), 'utf8');
      return { name, sql, checksum: checksum(sql) };
    });
}

/**
 * Split a migration into statements.
 *
 * Neon's HTTP endpoint speaks the extended protocol, which carries ONE
 * statement per message — so a migration has to arrive as an array, and the
 * array is what gets wrapped in a single transaction.
 *
 * A `split(';')` would be wrong for a reason that would not show up until it
 * did: a semicolon inside a string literal, an identifier, a comment or a
 * dollar-quoted body is not a statement boundary. None of this repository's
 * six migrations contains one today. That is a fact about today's migrations,
 * not about the ones a future `prisma migrate dev` will write — a default
 * value of `'a;b'` is entirely ordinary SQL — so the scanner tracks quoting
 * rather than trusting the survey.
 */
export function splitStatements(sql) {
  const out = [];
  let buf = '';
  let i = 0;

  while (i < sql.length) {
    const c = sql[i];
    const next = sql[i + 1];

    // -- line comment
    if (c === '-' && next === '-') {
      const end = sql.indexOf('\n', i);
      const stop = end === -1 ? sql.length : end;
      buf += sql.slice(i, stop);
      i = stop;
      continue;
    }

    // /* block comment */ — Postgres nests these, so count depth.
    if (c === '/' && next === '*') {
      let depth = 1;
      let j = i + 2;
      while (j < sql.length && depth > 0) {
        if (sql[j] === '/' && sql[j + 1] === '*') { depth += 1; j += 2; continue; }
        if (sql[j] === '*' && sql[j + 1] === '/') { depth -= 1; j += 2; continue; }
        j += 1;
      }
      buf += sql.slice(i, j);
      i = j;
      continue;
    }

    // 'string' and "identifier" — a doubled quote inside is an escaped one,
    // and the scanner handles it by simply consuming both and carrying on.
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === c && sql[j + 1] === c) { j += 2; continue; }
        if (sql[j] === c) { j += 1; break; }
        j += 1;
      }
      buf += sql.slice(i, j);
      i = j;
      continue;
    }

    // $tag$ ... $tag$ — a function body, where semicolons are certain.
    const dollar = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
    if (dollar) {
      const tag = dollar[0];
      const end = sql.indexOf(tag, i + tag.length);
      const stop = end === -1 ? sql.length : end + tag.length;
      buf += sql.slice(i, stop);
      i = stop;
      continue;
    }

    if (c === ';') {
      out.push(buf);
      buf = '';
      i += 1;
      continue;
    }

    buf += c;
    i += 1;
  }

  out.push(buf);
  // A statement that is only whitespace and comments executes nothing and is
  // not sent — trailing newlines after the last `;` would otherwise be one.
  return out
    .map((s) => s.trim())
    .filter((s) => s && stripComments(s).trim() !== '');
}

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');

/**
 * What still has to be applied, and what is wrong if anything is.
 *
 * Three outcomes rather than two, because the third is the one that matters:
 * a migration recorded with a DIFFERENT checksum has been edited since it was
 * applied. `migrate deploy` calls that MODIFIED and refuses to run, and so
 * does this — re-applying an edited migration would run SQL the database has
 * already partly seen.
 */
export function planPending(local, appliedRows) {
  const applied = new Map(appliedRows.map((r) => [r.migration_name, r.checksum]));
  const pending = [];
  const modified = [];

  for (const m of local) {
    if (!applied.has(m.name)) { pending.push(m); continue; }
    const recorded = applied.get(m.name);
    /* A row with no checksum is one this script wrote through a path that had
       none, or a baseline someone inserted by hand. Not proof of a mismatch,
       so it is left alone rather than called modified. */
    if (recorded && recorded !== m.checksum) modified.push({ name: m.name, recorded, actual: m.checksum });
  }

  /* Applied rows naming a migration this checkout does not have. The database
     is AHEAD of the code — a rollback, or a deploy from a branch that is not
     this one — and applying anything on top of that is a guess. */
  const unknown = appliedRows
    .map((r) => r.migration_name)
    .filter((n) => !local.some((m) => m.name === n));

  return { pending, modified, unknown };
}
