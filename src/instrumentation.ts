/**
 * What the server says about its own configuration, once, at startup.
 *
 * `missingEnv` was written to report every missing variable together so "a
 * fresh deployment learns about all of them at once rather than one restart
 * at a time" — and it had **no caller anywhere in the app**. The only thing
 * that noticed a missing variable was `requireEnv` throwing at the moment
 * something needed it, which is one restart at a time by definition, and an
 * advisory variable never has such a moment at all: with no administrator
 * configured, nothing throws, every screen serves, and the deployment finds
 * out when a person cannot reach one.
 *
 * Next's `register` runs once per server process before any request is
 * handled, which is what "at startup" means here. It is deliberately the
 * whole of this file: a startup hook that does work is a startup hook that
 * can fail to start a server.
 *
 * It only reports. Nothing here throws, including for a missing required
 * variable — `requireEnv` already refuses at the point of use, and failing
 * the process here would turn a clear error on one route into a boot loop.
 */
import { envReport } from '@/lib/env';

export async function register(): Promise<void> {
  const problems = envReport();
  if (!problems.length) return;

  console.warn(
    [
      'TrenchLine: the environment is incomplete.',
      ...problems.map((p) => `  - ${p}`),
      '  See .env.example for the full list of variables this server needs.',
    ].join('\n'),
  );
}
