# TrenchLine — working notes for AI assistants

A Trench Crusade warband builder and campaign companion. Next.js 15 App Router,
React 19, TypeScript, Tailwind, Zustand, Prisma/Postgres, NextAuth.

**Read [`docs/README.md`](docs/README.md) first.** The project is mid-restructure
following an audit; [`docs/AUDIT.md`](docs/AUDIT.md) explains what is broken and
[`docs/RESTRUCTURE-PLAN.md`](docs/RESTRUCTURE-PLAN.md) explains the order of work.

## Four rules

The original codebase was AI-generated and broke all four. They exist because of
specific, documented failures — not as style preferences.

### 1. Never write game data by hand

Statlines, costs, keywords, constraints, scenarios and rules text are **derived**
from `data-sources/` by the pipeline in `scripts/`. `src/data/*.generated.ts` is
build output.

If you find yourself typing a Ducat cost or a `+2 DICE` into a source file,
stop — that is exactly how the app ended up with 97% of its statlines wrong.
Get the value from `data-sources/battlescribe/` and cite it.

### 2. Never invent a fallback

If a fetch fails, a lookup misses, or a source is unavailable: **fail loudly**.
Do not return plausible-looking placeholder data.

The shipped example is `src/services/githubSync.ts`, which fabricated a GitHub
commit — SHA, message, author — whenever the API call failed, and presented it
to the user as a real upstream sync.

### 3. Mobile-first

Base Tailwind utilities target a **375px phone**; `sm:`/`md:`/`lg:` add desktop.
The app is used at a table, on a phone, one-handed.

Hard requirements (full list in [`docs/MOBILE.md`](docs/MOBILE.md)):

- `dvh`, never `vh`, for anything that must stay on screen.
- 44px minimum touch targets; 16px minimum for form inputs.
- **No dynamic Tailwind class names** — `` `grid-cols-${n}` `` does not compile.
  `MobileNav` was the shipped example and is **fixed**: the bar is a flex row of
  `flex-1` buttons, so it takes any number of items without naming a column
  count. The rule stands; the example is now a comment in that file explaining
  why it is written the way it is.
- Never `overflow-x: hidden` to hide a layout problem.

### 4. Document decisions with the change

A change to the data model, the ruleset layering, the source list, or the mobile
standards updates the relevant file in `docs/` in the same commit.

## Commands

```bash
npm run dev
npm run build             # needs DATABASE_URL; rm -rf .next if /404 prerender fails
npm run rules:fetch       # pull BattleScribe catalogues, pinned by commit SHA
npm run rules:crosscheck  # report drift between app data and the catalogues
npm run rules:extract     # PDF -> text
```

## Environment notes

- `trenchcrusade.com` is **not reachable** from the sandbox (proxy returns 403).
  Official rulebook PDFs must be supplied by the user and committed to
  `data-sources/rulebook/`.
- `raw.githubusercontent.com` **is** reachable, and so is `api.github.com` —
  verified from this sandbox, 200 unauthenticated. This note used to say the API
  was blocked; that was wrong and `HANDOVER-CARCASS-FRONT.md` had already
  flagged it. The fetch script still resolves commit SHAs with `git ls-remote`,
  which needs no token and no rate limit, so there is no reason to change it.
- `pdf-parse` (a devDependency) handles PDF text extraction — see
  `scripts/extract-pdf.mjs`. The system Python's `cryptography` module is broken,
  so Python PDF libraries do not work here.

## Gotchas

- `next build` fails with `<Html> should not be imported outside of
  pages/_document` when **`NODE_ENV` is not `production`**. This sandbox sets
  `NODE_ENV=development`, so a bare `next build` always hits it — Next falls
  back to the Pages Router `_error` page while prerendering `/404` and `/500`.
  It is not a code error, and `rm -rf .next` does **not** fix it. Build with:

  ```bash
  NODE_ENV=production DATABASE_URL=... NEXTAUTH_SECRET=... npx next build
  ```
- `src/store/useStore.ts` **was** 2,364 lines covering every domain. Phase 4.2
  split it into seven slices under `src/store/slices/`; the entry point is now
  83 lines. Change the slice, not the entry point.
- Components **were** carrying ~3,700 hardcoded hex colours, so the theme
  switcher did almost nothing. That migration is essentially finished: 13 hex
  literals remain across 6 files. Use the `theme-*` Tailwind tokens.
