import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

/**
 * The lint config the project did not have.
 *
 * `next.config.mjs` carried `eslint: { ignoreDuringBuilds: true }`, which reads
 * like a backlog of violations being deferred. It was not: there was no ESLint
 * config and no ESLint dependency, so the flag was suppressing a linter that
 * did not exist. Removing the flag without this file would have failed the
 * build asking to set one up interactively.
 *
 * `next/core-web-vitals` is the baseline. The rules below are the ones this
 * codebase actually needs an opinion on, and each says why — a rule turned off
 * without a reason is how a config stops meaning anything.
 */
export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      // Build output. Its shape is the emitter's business, and 40,000 lines of
      // generated data is not worth a lint pass.
      'src/data/generated/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      // One-off investigation scripts kept for the record, not shipped and not
      // imported by anything. Linting them says nothing about the app.
      'scratch/**',
      // Written by `next build`. Its triple-slash reference is Next's, not
      // ours, and it is regenerated on every build.
      'next-env.d.ts',
    ],
  },
  {
    rules: {
      /*
        `any` is a real problem here — the store and the older components are
        full of it — but it is a migration, not a build blocker. Warn so it is
        visible and countable; do not fail CI on a debt that predates the
        config.
      */
      '@typescript-eslint/no-explicit-any': 'warn',

      /*
        Unused code IS an error. It is the cheapest possible signal that a
        refactor left something behind, and this project has had several.
        Leading-underscore names are the escape hatch for a deliberately
        unused binding.
      */
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        /*
          `ignoreRestSiblings` is not a convenience. Destructure-to-omit —

              const { origin, ...rule } = m;   // dedupe ignoring `origin`

          — has an unused binding BY DESIGN: the binding is how the key is
          removed. Flagging it invites exactly the fix that breaks it, and
          that is not hypothetical. Sweeping the first run of this rule
          deleted `origin` from that very line in `parse-battlescribe.mjs`,
          which stopped modifiers differing only by `origin` from deduping
          and put 452 duplicate modifiers into both generated datasets. CI's
          "generated data is up to date" check caught it; nothing else would
          have, because the app still rendered.
        */
        ignoreRestSiblings: true,
      }],

      /*
        The app is a game companion with a lot of apostrophes in rules text.
        `react/no-unescaped-entities` catches them, and the fix — writing
        `&rsquo;` inside prose lifted verbatim from the rulebook — makes the
        source harder to diff against the book, which matters more here than
        it would elsewhere.
      */
      'react/no-unescaped-entities': 'off',
    },
  },
];
