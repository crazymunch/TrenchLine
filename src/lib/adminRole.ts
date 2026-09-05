import type { UserRole } from '@prisma/client';
import { prisma } from './prisma';
import { adminEmails } from './env';

/**
 * Who is an administrator, read from the database rather than from an address.
 *
 * Authority used to be derived from `User.email`: first a constant list in
 * `auth.ts`, then `TRENCHLINE_ADMIN_EMAILS`. That closed the takeover chain but
 * left three problems an environment variable cannot solve:
 *
 *   - the grant is attached to a MUTABLE, user-supplied field;
 *   - there is no record of who granted it, or when;
 *   - revoking it means a deploy, and every deployment target has its own copy.
 *
 * `User.role` is the grant now, `roleGrantedAt`/`roleGrantedBy` are the
 * evidence, and this module is the one place that decides.
 *
 * ## The migration window
 *
 * This is the MIGRATE step of expand/migrate/contract (`docs/DATABASE.md`), so
 * both sources are read, in a defined order:
 *
 *   1. a user whose role has been SET explicitly — `roleGrantedAt` is not null
 *      — is exactly what the database says, and the email list is ignored;
 *   2. a user who has never been set is still judged by the email list.
 *
 * Rule 1 is what makes revocation possible: demoting an administrator whose
 * address is still in `TRENCHLINE_ADMIN_EMAILS` must actually demote them, or
 * the persisted grant is decorative. Rule 2 is what keeps a deployment working
 * before anyone has been backfilled.
 *
 * The CONTRACT step — deleting rule 2 and the environment variable with it —
 * is a later release, deliberately not combined with this one.
 */

/** A user record, as much of it as this decision needs. */
export interface RoleFacts {
  email?: string | null;
  role?: UserRole | null;
  roleGrantedAt?: Date | null;
}

/**
 * Is this user an administrator?
 *
 * Pure, so the precedence above can be tested without a database.
 */
export function isAdminUser(user: RoleFacts | null | undefined): boolean {
  if (!user) return false;

  // 1. An explicit grant or revocation wins outright.
  if (user.roleGrantedAt) return user.role === 'ADMIN';

  // 2. Never set: the configured list still applies, for now.
  return emailGrantsAdmin(user.email);
}

/**
 * The legacy source, kept only for users nobody has decided about yet.
 *
 * `commander@trenchline.org` is off the list for good: it was the identity the
 * signed-out routes shared, so it must never be an address that carries
 * authority. An empty or unset variable grants nothing.
 */
export function emailGrantsAdmin(email?: string | null): boolean {
  if (!email) return false;
  const allowed = adminEmails();
  if (!allowed.length) return false;
  return allowed.includes(email.toLowerCase().trim());
}

/**
 * The same decision, for a user id, against the database.
 *
 * Read on every JWT refresh rather than only at sign-in, so a revocation takes
 * effect on the next request instead of when the last session happens to
 * expire. A user id that no longer exists is not an administrator — a deleted
 * account must not keep authority through a token that outlives it.
 */
export async function isAdminUserId(userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true, roleGrantedAt: true },
  });
  return isAdminUser(user);
}
