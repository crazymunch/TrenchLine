/**
 * The app build, as a roster file records it.
 *
 * Read from `package.json` at build time rather than retyped, so a file cannot
 * claim a version the code was not built at. `NEXT_PUBLIC_APP_VERSION` lets a
 * deployment stamp something more specific (a commit, a tag) without this file
 * knowing how the deployment is done.
 */
import pkg from '../../package.json';

export const APP_VERSION: string =
  process.env.NEXT_PUBLIC_APP_VERSION || (pkg as { version?: string }).version || '0.0.0';
