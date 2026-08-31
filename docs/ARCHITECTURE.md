# Architecture

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript 5.7 |
| Styling | Tailwind CSS 3.4 + CSS custom properties for theming |
| Client state | Zustand 5, persisted to `localStorage` |
| Server state | Prisma 5 + PostgreSQL |
| Auth | NextAuth 4 (`@next-auth/prisma-adapter`), credentials provider |
| XML | `fast-xml-parser` (BattleScribe `.cat` / `.gst`) |
| Icons | `lucide-react` |

> The root `README.md` previously described a Vite app. It does not. Next.js App
> Router is the framework; `src/App.tsx` and `src/main.tsx` are dead Vite
> scaffolding scheduled for deletion.

## Current layout

```
src/
├── app/
│   ├── layout.tsx           root layout, fonts, SessionProvider
│   ├── page.tsx             ALL six views, switched by Zustand state
│   ├── globals.css          theme tokens + base styles
│   └── api/                 warbands, campaigns, custom-rules, bug-reports, auth
├── components/
│   ├── builder/             roster building (UnitCard, WarbandBuilder, modals)
│   ├── play/                tabletop HUD (PlayModeView, DiceRoller, calculators)
│   ├── campaign/            campaign hub, territory map, post-battle wizard
│   ├── codex/               rules reference, scenarios, mission generator
│   ├── customizer/          rule overrides + GitHub diff
│   ├── admin/               roster directory
│   ├── layout/              Navbar, Sidebar, MobileNav, ThemeSwitcher
│   └── ui/                  ConfirmModal — the only shared primitive
├── data/                    HAND-WRITTEN game data (to be replaced — see AUDIT §1)
├── services/                xmlParser, newRecruitImporter, githubSync, storage
├── store/useStore.ts        2,364-line Zustand store — everything
└── types/
```

### Known structural problems

**Everything is one route.** `page.tsx` renders all six views and switches on
`currentView` from the store. No code splitting (266 kB first-load JS), no deep
links, no shareable roster URLs, and the back button does nothing.

**One store for everything.** ~~`useStore.ts` is 2,364 lines~~ — split into
seven slices in 4.2. See the plan.

**Two sources of truth for persistence** — resolved in 4.3, below.

**Data and rules-application are entangled.** `src/data/defaultRules.ts` is
2,160 lines mixing faction definitions, weapon tables, unit profiles and
re-exports of `officialRulesData.ts`. There is no rules *engine* — validation
logic is inline in components.

## Target layout

Changes only where there is a reason; this is a refactor, not a rewrite.

```
src/
├── app/
│   ├── (app)/
│   │   ├── layout.tsx              app shell: Sidebar + Navbar + MobileNav
│   │   ├── roster/[id]/page.tsx    real routes → deep links, code splitting
│   │   ├── play/[matchId]/page.tsx
│   │   ├── campaign/[id]/page.tsx
│   │   └── codex/[...slug]/page.tsx
│   └── api/
├── components/
│   └── ui/                         Modal, Sheet, Stepper, Field, DataTable…
├── data/
│   ├── *.generated.ts              BUILD OUTPUT — never hand-edited
│   └── provenance.json
├── rules/                          NEW — the rules engine, pure and testable
│   ├── layers.ts                   layer op application
│   ├── rulesets.ts                 ruleset definitions + resolution
│   ├── validate.ts                 roster legality (constraints, costs, limits)
│   └── costs.ts                    Ducats + Glory computation
├── store/
│   ├── roster.ts                   split by domain
│   ├── match.ts
│   ├── campaign.ts
│   └── settings.ts
└── services/
```

```
data-sources/          committed inputs — see DATA-SOURCES.md
scripts/               the data pipeline — see RULESET-MODEL.md §5
docs/                  this directory
```

### Why these changes

| Change | Reason |
|---|---|
| Real routes | Deep links, code splitting, working back button, shareable rosters |
| `src/rules/` as pure functions | Roster legality is the core feature and must be unit-testable without React |
| Split the store | 2,364 lines is not maintainable; domains have different lifecycles (match state is ephemeral, roster state is persisted) |
| Shared `ui/` primitives | 30 hand-rolled modals cannot be fixed once; one `Modal` can |
| Generated data | See [`RULESET-MODEL.md`](RULESET-MODEL.md) |

## Persistence, and which copy wins

`localStorage` is the working copy and is authoritative for the device. The
cloud is a **backup a signed-in user can restore from**, not a second master.
The app is fully usable with no account and no signal; signing in is what turns
the backup on.

### What was wrong

Four defects, and they compounded:

| | |
|---|---|
| **21 of 44 mutations never bumped `updatedAt`** | The merge was last-write-wins on that field, so an edit that did not bump it was invisible to sync and lost to any other device's copy. Every Play Mode mutation was in this group. |
| **The server's `updatedAt` was a *push* time** | Prisma's `@updatedAt` rewrites it on every write, and sync pushed every warband it held on every run. Merely opening the app on a second device made that device's copies look newer than the first device's real edits. |
| **A failed fetch looked like an empty cloud** | Every call caught its own error and returned `null`. The merge read that as "the cloud has nothing" and pushed the local list over the top, so an offline sync could overwrite good cloud data. |
| **A signed-out `GET` returned the whole table** | The `where` clause collapsed to `{}` with no user. A visitor was served every warband in the database, merged them into local storage as their own, and pushed them back under a shared `commander@trenchline.org` account. |

### What holds now

- **`persistWarbands` is the only way a warband is written** (`src/store/persist.ts`).
  It compares against the previous list and works out what changed, so a
  mutation cannot fail to declare something it did not know it had to declare.
  A test asserts no slice calls `storage.saveWarbands` or
  `syncWarbandToCloud` directly — fixing 21 call sites fixes them once; the
  choke point fixes the 22nd too.
- **`editedAt` is a separate field** carrying the time the *player* changed the
  roster, supplied by the client and stored as-is. It is what the merge
  compares. `updatedAt` remains the write time and is display-only.
- **Transient match state does not mark the roster dirty.** Wounds, blood
  markers and whose turn it is are saved locally — a phone that sleeps mid-game
  keeps the board — but they do not queue a push, or one game would fire a
  hundred.
- **An unpushed edit always wins the merge**, whatever the timestamps say.
  Losing an edit that exists nowhere else is the one outcome with no recovery.
- **A failed fetch stops the sync.** No merge against a phantom empty cloud, and
  no push after it.
- **The outbox lives in `localStorage`**, not memory: the reason it exists is
  that the network is unreliable at a table, and a queue a refresh empties
  would drop exactly the edits it was there to protect.
- **Every cloud call returns `CloudResult`**, so "offline", "sign in" and "the
  server broke" are different values the UI can show. `SyncStatus` in the top
  bar renders them, because "did my roster save?" is a question a player asks
  at a table with no signal and the app used to answer it only in the console.

Writes require a session. Without one the app is local-only and says so; there
is no anonymous shared account.

**Schema note:** `Warband.editedAt` is new. Run `prisma db push` (or a
migration) against an existing database before deploying — it is nullable, and
rows without it fall back to `updatedAt` in the merge.

## Theming

Themes are defined as CSS custom properties on `[data-theme]` in `globals.css`
and mapped to Tailwind tokens (`bg-theme-surface`, `text-theme-primary`) in
`tailwind.config.ts`. **Both already exist and are used by nothing** — components
carry 3,698 hardcoded hex values against 0 token uses.

Rule going forward: components use theme tokens. A literal hex in a component is
a bug. Faction accent colours that genuinely vary per-faction come from
`faction.color` via inline `style`, which is legitimate and already done.

## Testing

Currently none. Target:

| Kind | Tool | Scope |
|---|---|---|
| Unit | Vitest | `src/rules/*` — validation, costs, layer application. The highest-value tests in the project. |
| Data | Vitest | Pipeline invariants: every field has provenance; no unresolved conflicts; known-good fixtures (Lieutenant is +2/+2/0/32mm). |
| Component | Vitest + Testing Library | `UnitCard`, `Modal`, roster flows. |
| E2E | Playwright | Build a legal warband; enter play mode; run post-battle — at 375px and 1280px. |

CI runs `rules:build`, `lint`, `typecheck`, `test` on every PR, and
`ignoreDuringBuilds` comes out of `next.config.mjs`.
