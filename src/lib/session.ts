import type { Session } from 'next-auth';

/**
 * Does this session hold the admin role?
 *
 * Six components used to answer this with
 * `session.user.email === 'crazymunch@gmail.com' || session.user.isAdmin`,
 * which is wrong twice over: it grants on an address the client can see rather
 * than on the role the server issued, and it disagrees with the server, which
 * now grants admin only from `TRENCHLINE_ADMIN_EMAILS`. A UI that offers
 * controls the API will refuse is worse than one that hides them.
 *
 * Client-side gating is cosmetic either way — every admin action is checked
 * again on the server — but it should be cosmetic about the truth.
 */
export function sessionIsAdmin(session: Session | null | undefined): boolean {
  return Boolean((session?.user as { isAdmin?: boolean } | undefined)?.isAdmin);
}
