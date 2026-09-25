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

/**
 * Variables the server runs without, and is diminished without.
 *
 * Separate from `REQUIRED` because the difference is real: a server with no
 * signing secret cannot serve a request and must refuse to start, while a
 * server with no administrator serves every request correctly and simply has
 * nobody who can administer it. Throwing for the second would take a site
 * down over a setting that costs it one screen.
 *
 * It is still not silence. An unset value here is reported at startup with
 * the same sentence a missing required one gets, because the failure mode is
 * the same shape: a deployment that thinks it configured something and did
 * not.
 */
const ADVISORY = {
  TRENCHLINE_ADMIN_EMAILS:
    'lists the addresses that hold the application admin role, separated by '
    + 'commas. There is no default: with it unset the deployment has no '
    + 'administrator, and the admin screens are closed to everyone. Set it in '
    + 'the host\'s environment and redeploy.',
} as const;

type RequiredKey = keyof typeof REQUIRED;
type AdvisoryKey = keyof typeof ADVISORY;

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
  return (Object.keys(REQUIRED) as RequiredKey[]).filter(unset);
}

/** Every advisory variable that is currently unset. */
export function missingAdvisory(): AdvisoryKey[] {
  return (Object.keys(ADVISORY) as AdvisoryKey[]).filter(unset);
}

/** An empty or whitespace value is a variable somebody meant to set. */
function unset(key: string): boolean {
  const v = process.env[key];
  return typeof v !== 'string' || v.trim() === '';
}

/**
 * What to print at startup, or an empty list when the environment is whole.
 *
 * Both kinds in one report, so a fresh deployment learns everything at once
 * rather than one restart at a time — and so the advisory ones are not
 * discovered by a person finding they cannot reach a screen.
 *
 * Returned rather than logged, because the caller decides where it goes: a
 * server logs it, a test asserts on it.
 */
export function envReport(): string[] {
  return [
    ...missingEnv().map((k) => `${k} is not set. It ${REQUIRED[k]}`),
    ...missingAdvisory().map((k) => `${k} is not set. It ${ADVISORY[k]}`),
  ];
}

/**
 * The email addresses that may hold the application admin role.
 *
 * **There is no default, and there must not be one.** This used to carry the
 * maintainer's personal address as `DEFAULT_ADMIN_EMAILS`, three lines under
 * a comment that said the list was "deliberately empty by default" — so the
 * file both claimed and contradicted the property ADM-1 restores. The address
 * itself is not a credential, and the credentials sweep of 25 September found
 * none in the tree or its history; but an identity is half of one, and it
 * told anyone reading a public repository which account to go after.
 *
 * A built-in default is also the wrong shape regardless of whose address it
 * is. It grants authority from source code, which means a deployment cannot
 * revoke it without a release, and every fork and every clone inherits the
 * grant. Reading it from the environment does not make email a good identity
 * for a role — a persisted, auditable role on the user record is what finally
 * retires this — but it makes the grant a deployment decision.
 *
 * Unset means **nobody** is an administrator. That is a working state, not a
 * broken one: every other screen serves normally. `envReport` says so at
 * startup so it is not discovered by someone finding a screen closed.
 *
 * `commander@trenchline.org` must never appear here. It is the identity the
 * signed-out API routes used to write to, so an anonymous request could bring
 * the account into existence; combined with the old sign-in bypass that was an
 * admin takeover needing no credential at any step. It is an ordinary account
 * now, and the routes that shared it no longer do.
 */
export function adminEmails(): string[] {
  return (process.env.TRENCHLINE_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);
}
