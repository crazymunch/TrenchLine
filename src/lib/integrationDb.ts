/**
 * The one database an integration test is allowed to write to.
 *
 * Found while reviewing an external audit, which had not reported it. The nine
 * integration suites each read `process.env.DATABASE_URL` and ran against
 * whatever it pointed at, with no check of any kind. In this project's own
 * development environment that variable points at **production Neon** — it is
 * what `scripts/apply-migrations-http.mjs` uses — so `npm test` would create
 * users, campaigns and warbands in the live database, and several suites end
 * with a `deleteMany`.
 *
 * Nothing had gone wrong yet because the sandbox cannot reach TCP 5432, so the
 * suites failed to connect and skipped. That is a network accident standing in
 * for a safety rule, and it stops protecting anyone the moment a developer runs
 * the tests somewhere with a working connection.
 *
 * So the address comes from its own variable, and this file refuses anything
 * that is not local:
 *
 *   - `DATABASE_URL` is the application's database. It may be production.
 *   - `TRENCHLINE_TEST_DATABASE_URL` is the test database. It must be local,
 *     and nothing reads it but the test suites.
 *
 * Unset means the integration suites skip, which is the existing behaviour for
 * anyone without a database. Set to a remote host means the run **fails**
 * rather than skipping: a developer who has pointed this at a server has made
 * a mistake worth interrupting, and silently skipping would hide it.
 */

/**
 * Hosts a test database may live on.
 *
 * An allowlist, not a denylist of known-production hostnames. A denylist has
 * to be updated every time infrastructure changes and fails open when someone
 * forgets; this fails closed on anything it has not been told is local.
 */
const LOCAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
  /* The service name CI's Postgres container answers to, and the one a
     docker-compose setup conventionally uses. */
  'postgres',
  'db',
  'host.docker.internal',
]);

export class RemoteTestDatabaseError extends Error {
  constructor(host: string) {
    super(
      `TRENCHLINE_TEST_DATABASE_URL points at "${host}", which is not a local host. `
      + 'Integration tests create and delete rows, so they may only run against a '
      + 'database you can afford to lose. Set it to a local Postgres (or unset it '
      + 'to skip these suites). DATABASE_URL is deliberately not used here — see '
      + 'docs/DATABASE.md.',
    );
    this.name = 'RemoteTestDatabaseError';
  }
}

/**
 * The test database URL, or `null` when there is none.
 *
 * Throws — rather than returning null — when one is configured but points
 * somewhere it should not. The difference matters: null means "no database,
 * skip the suite", and throwing means "you have told me to do something
 * dangerous", and those must not look the same to the caller.
 */
export function integrationDbUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env.TRENCHLINE_TEST_DATABASE_URL?.trim();
  if (!raw) return null;

  let host: string;
  try {
    /* `postgresql://` is not a URL scheme `URL` knows the authority rules for
       in every runtime, but it parses the host the same way. A value that does
       not parse at all is not something to guess about. */
    host = new URL(raw).hostname;
  } catch {
    throw new RemoteTestDatabaseError(raw);
  }

  if (!LOCAL_HOSTS.has(host.toLowerCase())) throw new RemoteTestDatabaseError(host);
  return raw;
}

/**
 * True where the integration suites should run.
 *
 * Calls `integrationDbUrl`, so a misconfigured remote host throws here too
 * rather than quietly reporting "no database" and skipping.
 */
export const hasIntegrationDb = (env?: NodeJS.ProcessEnv): boolean =>
  integrationDbUrl(env) !== null;
