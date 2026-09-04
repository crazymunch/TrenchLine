#!/usr/bin/env node
/**
 * Grant or revoke the application administrator role.
 *
 * Authority used to come from `TRENCHLINE_ADMIN_EMAILS`, so changing it meant a
 * deploy, every environment had its own copy, and nothing recorded who decided
 * or when. The grant is `User.role` now; this is how it is set.
 *
 *   node scripts/grant-role.mjs --email someone@example.com --role ADMIN
 *   node scripts/grant-role.mjs --email someone@example.com --role USER
 *   node scripts/grant-role.mjs --email someone@example.com --role ADMIN --bootstrap
 *
 * `--bootstrap` is the one-shot that creates the FIRST administrator, and it
 * refuses to run once one exists: after that a promotion must be made by an
 * administrator who is named, with `--actor`. Bootstrapping into an
 * already-administered system is how an audit trail gets an anonymous entry at
 * the top of it.
 *
 * Reports what it changed, including when nothing changed, and never prints a
 * password or a token.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name) => process.argv.includes(`--${name}`);

function fail(message) {
  console.error(`grant-role: ${message}`);
  process.exitCode = 1;
  return null;
}

async function main() {
  const email = arg('email')?.trim().toLowerCase();
  const role = (arg('role') ?? 'ADMIN').toUpperCase();
  const actorEmail = arg('actor')?.trim().toLowerCase();
  const bootstrap = has('bootstrap');

  if (!email) return fail('--email is required.');
  if (role !== 'ADMIN' && role !== 'USER') {
    return fail(`--role must be ADMIN or USER, not "${role}".`);
  }

  const target = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, roleGrantedAt: true, roleGrantedBy: true },
  });
  /*
    Never created. A promotion command that creates the account it promotes is
    the shape of the takeover this replaced: something that both invents an
    identity and gives it authority.
  */
  if (!target) return fail(`no user with that address. Sign in once first, then re-run.`);

  /* Who is making the change. An audit row with no actor is barely an audit row. */
  let grantedBy;
  const existingAdmins = await prisma.user.count({
    where: { role: 'ADMIN', roleGrantedAt: { not: null } },
  });

  if (bootstrap) {
    if (existingAdmins > 0) {
      return fail(
        `--bootstrap refused: ${existingAdmins} administrator(s) already granted. `
        + 'Use --actor <an administrator\'s email> so the change is attributable.');
    }
    grantedBy = 'bootstrap';
  } else {
    if (!actorEmail) {
      return fail(
        'either --actor <an administrator\'s email>, or --bootstrap for the very first one.');
    }
    const actor = await prisma.user.findUnique({
      where: { email: actorEmail },
      select: { id: true, role: true, roleGrantedAt: true },
    });
    if (!actor) return fail('--actor names no user.');
    /* Same precedence the app uses: an explicit grant wins, otherwise nothing.
       The environment list is deliberately NOT consulted here — a change to the
       audit trail should be made by someone the audit trail already knows. */
    if (!(actor.roleGrantedAt && actor.role === 'ADMIN')) {
      return fail('--actor is not a granted administrator.');
    }
    grantedBy = actor.id;
  }

  const before = target.roleGrantedAt ? target.role : `${target.role} (never set)`;
  if (target.role === role && target.roleGrantedAt) {
    console.log(`grant-role: ${email} is already ${role}, granted `
      + `${target.roleGrantedAt.toISOString()} by ${target.roleGrantedBy ?? 'unknown'}. `
      + 'Nothing changed.');
    return;
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { role, roleGrantedAt: new Date(), roleGrantedBy: grantedBy },
    select: { email: true, role: true, roleGrantedAt: true, roleGrantedBy: true },
  });

  console.log(
    `grant-role: ${updated.email}\n`
    + `  role   ${before} -> ${updated.role}\n`
    + `  at     ${updated.roleGrantedAt?.toISOString()}\n`
    + `  by     ${updated.roleGrantedBy}\n`
    + '  Takes effect on that user\'s next request; no sign-out is needed.');
}

main()
  .catch((e) => { console.error(`grant-role: ${e.message}`); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
