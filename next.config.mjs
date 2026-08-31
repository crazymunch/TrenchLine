/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /*
    The build lints.

    `eslint: { ignoreDuringBuilds: true }` read like a backlog being deferred.
    It was not: there was no ESLint config and no ESLint dependency, so the
    flag suppressed a linter that did not exist, and the build had never once
    checked anything. Turning it on found four handlers wired to nothing —
    including a bug reporter with no send button and a Chronicle with no save —
    and two hooks called after an early return.

    See eslint.config.mjs for which rules are errors and why.
  */
  typescript: {
    ignoreBuildErrors: false,
  }
};

export default nextConfig;
