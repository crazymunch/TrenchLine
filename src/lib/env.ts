/**
 * Required server environment, validated once.
 *
 * `authOptions` used to fall back to a constant when `NEXTAUTH_SECRET` was
 * absent — `trenchline_grimdark_secret_salt_2026`, checked into this
 * repository. Anyone who could read the source could forge a session cookie
 * for any account, so a deployment that simply forgot to set the variable
 * booted successfully and signed its sessions with a published key.
 *
 * The fix is not a better default. There is no acceptable default: a signing
 * secret that anybody can read is not a secret, and a fallback turns a
 * configuration mistake into a silent one. This module throws instead.
 *
 * Tests must set their own value. `NEXTAUTH_SECRET=test-secret` in a test
 * setup is an explicit choice, and it is a different thing from a production
 * deployment inheriting a constant nobody chose.
 */

/** Variables the server cannot run without, and what each is for. */
const REQUIRED = {
  NEXTAUTH_SECRET:
    'signs and verifies session JWTs. Generate one per environment with '
    + '`openssl rand -base64 32` and set it in the host\'s secret store. '
    + 'Rotating it invalidates every existing session, which is how you revoke '
    + 'them after an incident.',
} as const;

type RequiredKey = keyof typeof REQUIRED;

/**
 * Read a required variable, or throw.
 *
 * Thrown rather than returned as an error because there is nothing sensible to
 * do with the failure: a server that cannot verify a session cannot serve a
 * request, and a server that carries on with a placeholder is worse than one
 * that refuses to start.
 */
export function requireEnv(key: RequiredKey): string {
  const value = process.env[key];
  if (typeof value === 'string' && value.trim() !== '') return value;

  throw new Error(
    `${key} is not set. It ${REQUIRED[key]}\n`
    + 'See .env.example for the full list of variables this server needs.',
  );
}

/**
 * Every required variable that is currently missing.
 *
 * Reported together so a fresh deployment learns about all of them at once
 * rather than one restart at a time.
 */
export function missingEnv(): RequiredKey[] {
  return (Object.keys(REQUIRED) as RequiredKey[]).filter((k) => {
    const v = process.env[k];
    return typeof v !== 'string' || v.trim() === '';
  });
}

/**
 * The email addresses that may hold the application admin role.
 *
 * **Interim, and deliberately empty by default.** Admin used to be derived
 * from a list written in `src/lib/auth.ts`, which meant the role was granted
 * by source code rather than by anything the deployment controlled or could
 * audit — and one of the two addresses on it was also the shared identity that
 * the signed-out API routes wrote to, so an anonymous request could bring that
 * account into existence and then sign in as it.
 *
 * Reading it from the environment does not make email a good identity for a
 * role; it makes the grant a deployment decision that can be changed without a
 * release and revoked without one. The real fix is a persisted, auditable role
 * on the user record, which needs a schema migration and lands with that work.
 *
 * `commander@trenchline.org` is **not** on the default list and must not be
 * put back on it. That address is the shared identity the signed-out API
 * routes wrote to, so an anonymous request could bring the account into
 * existence; combined with the sign-in bypass it was an admin takeover that
 * needed no credential at any step. It is an ordinary account now, and the
 * routes that shared it no longer do.
 */
const DEFAULT_ADMIN_EMAILS = ['crazymunch@gmail.com'];

export function adminEmails(): string[] {
  const configured = (process.env.TRENCHLINE_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);

  // The environment wins outright when it is set, including setting it to a
  // single address to drop the default. An empty value is not a configuration.
  return configured.length ? configured : DEFAULT_ADMIN_EMAILS;
}
