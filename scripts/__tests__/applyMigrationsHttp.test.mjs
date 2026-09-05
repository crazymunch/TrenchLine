/**
 * The two things `apply-migrations-http.mjs` can get wrong silently.
 *
 * It applies migrations to a PRODUCTION database over Neon's HTTPS endpoint,
 * so the interesting failures are the ones that still look like success:
 * a statement split in the wrong place, or a migration judged applied when it
 * is not. Neither needs a database to test, and neither should have one — a
 * test that could write to production is a test nobody dares run.
 */
import { describe, it, expect } from 'vitest';
import {
  splitStatements, planPending, localMigrations, checksum,
} from '../applyMigrations.lib.mjs';

describe('splitting a migration into statements', () => {
  it('splits on the semicolons that are statement boundaries', () => {
    expect(splitStatements('SELECT 1; SELECT 2;')).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('does not split on a semicolon inside a string literal', () => {
    /*
      The bug a `split(';')` has and does not show until a migration contains
      one. `DEFAULT 'a;b'` is entirely ordinary SQL, and splitting it produces
      two statements, neither of which parses.
    */
    const sql = `ALTER TABLE "t" ADD COLUMN "c" TEXT DEFAULT 'a;b';\nSELECT 1;`;
    expect(splitStatements(sql)).toEqual([
      `ALTER TABLE "t" ADD COLUMN "c" TEXT DEFAULT 'a;b'`,
      'SELECT 1',
    ]);
  });

  it('handles a doubled quote inside a string', () => {
    const sql = `SELECT 'it''s; fine'; SELECT 2;`;
    expect(splitStatements(sql)).toEqual([`SELECT 'it''s; fine'`, 'SELECT 2']);
  });

  it('does not split on a semicolon inside a quoted identifier', () => {
    // Prisma quotes every identifier, and Postgres permits anything inside.
    const sql = `ALTER TABLE "weird;name" ADD COLUMN "x" TEXT; SELECT 1;`;
    expect(splitStatements(sql)).toEqual([
      `ALTER TABLE "weird;name" ADD COLUMN "x" TEXT`,
      'SELECT 1',
    ]);
  });

  it('does not split on a semicolon inside a comment', () => {
    expect(splitStatements('-- a; comment\nSELECT 1;')).toHaveLength(1);
    expect(splitStatements('/* a; comment */ SELECT 1;')).toHaveLength(1);
  });

  it('handles nested block comments, which Postgres allows', () => {
    expect(splitStatements('/* outer /* inner; */ still; */ SELECT 1;')).toEqual([
      '/* outer /* inner; */ still; */ SELECT 1',
    ]);
  });

  it('does not split inside a dollar-quoted body', () => {
    // Where semicolons are a certainty rather than a possibility.
    const sql = `CREATE FUNCTION f() RETURNS int AS $$ BEGIN; RETURN 1; END; $$ LANGUAGE plpgsql;`;
    expect(splitStatements(sql)).toHaveLength(1);
  });

  it('drops a trailing fragment that is only whitespace or comments', () => {
    // Otherwise the newline after the last `;` is sent as a statement.
    expect(splitStatements('SELECT 1;\n\n-- done\n')).toEqual(['SELECT 1']);
    expect(splitStatements('SELECT 1;\n')).toEqual(['SELECT 1']);
  });

  it('keeps a final statement with no trailing semicolon', () => {
    expect(splitStatements('SELECT 1;\nSELECT 2')).toEqual(['SELECT 1', 'SELECT 2']);
  });
});

describe('every migration in this repository', () => {
  const migrations = localMigrations();

  it('has migrations to check', () => expect(migrations.length).toBeGreaterThan(0));

  for (const m of migrations) {
    it(`${m.name} splits into runnable statements`, () => {
      const statements = splitStatements(m.sql);
      expect(statements.length, 'no statements').toBeGreaterThan(0);
      for (const s of statements) {
        expect(s.trim(), 'an empty statement would be sent to the server').not.toBe('');
        /* Each fragment ends up as one extended-protocol message, so a stray
           semicolon inside one means the split missed a boundary. */
        expect(s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, ''))
          .not.toMatch(/;\s*\S/);
      }
    });
  }

  it('checksums the file exactly as Prisma does', () => {
    // sha256 of the file, hex. Wrong here and `migrate deploy` reports every
    // migration this script wrote as MODIFIED — louder than silence, but still
    // a broken deploy.
    expect(checksum('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    for (const m of migrations) expect(m.checksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is ordered the way `migrate deploy` orders them', () => {
    // Timestamp-prefixed, so lexical order IS chronological. Applying in any
    // other order would run them in a sequence the tool never would.
    expect(migrations.map((m) => m.name)).toEqual([...migrations.map((m) => m.name)].sort());
  });
});

describe('deciding what is pending', () => {
  const local = [
    { name: 'a', sql: 'SELECT 1;', checksum: 'aaa' },
    { name: 'b', sql: 'SELECT 2;', checksum: 'bbb' },
  ];

  it('is everything when nothing is recorded', () => {
    const { pending, modified, unknown } = planPending(local, []);
    expect(pending.map((m) => m.name)).toEqual(['a', 'b']);
    expect(modified).toEqual([]);
    expect(unknown).toEqual([]);
  });

  it('is what is left when some are recorded', () => {
    const { pending } = planPending(local, [{ migration_name: 'a', checksum: 'aaa' }]);
    expect(pending.map((m) => m.name)).toEqual(['b']);
  });

  it('is nothing when all are recorded', () => {
    const { pending } = planPending(local, [
      { migration_name: 'a', checksum: 'aaa' },
      { migration_name: 'b', checksum: 'bbb' },
    ]);
    expect(pending).toEqual([]);
  });

  it('reports a migration edited after it was applied', () => {
    /*
      The case that must stop the run. Re-applying an edited migration runs SQL
      the database has already partly seen; `migrate deploy` calls this
      MODIFIED and refuses, and so does the script.
    */
    const { modified, pending } = planPending(local, [
      { migration_name: 'a', checksum: 'DIFFERENT' },
    ]);
    expect(modified).toEqual([{ name: 'a', recorded: 'DIFFERENT', actual: 'aaa' }]);
    expect(pending.map((m) => m.name), 'b is still pending, but the run stops')
      .toEqual(['b']);
  });

  it('reports a database that is ahead of this checkout', () => {
    // A rollback, or a deploy from another branch. Applying on top of it is a
    // guess about what the database already contains.
    const { unknown } = planPending(local, [
      { migration_name: 'a', checksum: 'aaa' },
      { migration_name: 'z_from_somewhere_else', checksum: 'zzz' },
    ]);
    expect(unknown).toEqual(['z_from_somewhere_else']);
  });

  it('does not call a checksum-less row modified', () => {
    // A baseline someone inserted by hand has no checksum. Absent is not
    // evidence of a mismatch, and treating it as one would block every run.
    const { modified, pending } = planPending(local, [
      { migration_name: 'a', checksum: null },
    ]);
    expect(modified).toEqual([]);
    expect(pending.map((m) => m.name)).toEqual(['b']);
  });
});
