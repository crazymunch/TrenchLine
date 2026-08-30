# Codebase Audit — August 2026

Audit of TrenchLine at commit `80f3451`, the last commit of the original
AI-generated build. Every claim below is backed by something reproducible from
the repository or from the official sources listed in
[`DATA-SOURCES.md`](DATA-SOURCES.md).

## Summary

| Area | State |
|---|---|
| Build & typecheck | Passing (`next build` succeeds on a clean `.next`) |
| Game data accuracy | **Critical** — 97% of checkable unit statlines are wrong |
| Roster validation | **Missing** — the core builder feature does not exist |
| Mobile / tablet | **Critical** — one hard bug plus systemic desktop-only layout |
| Documentation | **Absent** — README describes a different tech stack |
| Tests / CI | **Absent** — no test runner, no workflows |

The application shell, the feature set, and the visual direction are worth
keeping. The game data and the responsive layer need to be rebuilt.

---

## 1. Game data is invented

### 1.1 The evidence

The official BattleScribe catalogues at
[`Fawkstrot11/TrenchCrusade`](https://github.com/Fawkstrot11/TrenchCrusade) —
the same data NewRecruit uses for this system — expose every unit's
Movement / Ranged / Melee / Armour / Base as structured XML. Comparing them
against `src/data/defaultRules.ts`:

```
app units parsed        38
catalogue unit profiles 79
matched by name         30
  correct               1
  MISMATCHED            29  (97%)
unmatched               8
```

Reproduce:

```bash
npm run rules:fetch      # pulls the catalogues into data-sources/battlescribe/
npm run rules:crosscheck # prints the table above; --full for all rows
```

**One** of the thirty checkable units — the New Antioch Yeoman — has a fully
correct statline.

Representative failures:

| Unit | Field | App | Source |
|---|---|---|---|
| Lieutenant | Ranged / Melee / Armour | +1 / +1 / −1 | **+2 / +2 / 0** |
| Sniper Priest | Melee / Armour | +0 / −1 | **−1 / 0** |
| War Prophet | Ranged / Melee / Armour | +1 / +1 / −1 | **+2 / +2 / 0** |
| Communicant | Ranged / Armour | +1 / −2 | **−3 / 0** |
| Brazen Bull | Armour / Movement | −3 / 5" | **0 / 6"/Infantry** |
| Stigmatic Nun | Movement | 6" | **8"/Infantry** |

Three further entries were only matched after adding an alias map for the app's
invented naming (`Trench Dog / War Hound` → `Trench Dog`, `Anchorite Shrine` →
`Anchorite`, `Yüzbaşı` → `Yüzbaşı Captain`) — and all three turned out to be
mismatched too. The 8 still unmatched (`Combat Engineer`, `The Faithful`,
`Martyr / Flagellant`, `Mechanized Heavy Infantry`, `Takwin Homunculus` and
others) need checking against the rulebook to establish whether they are real
entries under another name or inventions. `Combat Engineer` is a known case of
the *catalogue* being incomplete: it has a full profile in both the rulebook and
the Dispatch.

### 1.2 Ducat costs are mostly right; everything else is not

Lieutenant is 70 Ducats in both app and rulebook. Sniper Priest is 50 in both.
The generator evidently had access to real cost figures and then invented the
statlines around them. Two systematic tells:

- **Armour was filled in with a default.** 22 of 45 units carry `armour: '-1'`.
  Every unit checked should be `0`.
- **Weapon costs are a generated ladder.** In `BASE_WEAPONS`, the first seven
  melee weapons cost 1, 2, 3, 4, 5, 6, 7 Ducats in file order.

### 1.3 Keywords are partly fabricated

`Slashing`, `Concussive`, `Fast Strike` and `Bayonet Lug` appear **zero times**
in the extracted rulebook text and zero times across all ten BattleScribe
catalogues. They are inventions.

Real keywords do exist in the data (`ASSAULT`, `BLAST`, `CUMBERSOME`, `HEAVY`,
`CRITICAL`), but their *descriptions* in `officialRulesData.ts` are paraphrases
rather than rules text. `COVER` is described as "subtract 1 or 2 from enemy
ranged hit rolls", where Trench Crusade expresses cover as a DICE modifier.

### 1.4 Faction special rules are invented

`FACTIONS[].rules` contains "Voice of Command", "Ecstatic Zeal", "Prophetic
Vision", "Infernal Blood Tithe" and others. None correspond to published
faction rules. Trench Crusade expresses faction identity through warband
composition and unit abilities, not through a per-faction rules block.

### 1.5 Rosters are incomplete, and one faction is orphaned

| Faction | App units | Catalogue model entries |
|---|---|---|
| New Antioch | 9 | 12 |
| Iron Sultanate | 9 | 16 |
| Heretic Legions | 7 | 12 |
| Trench Pilgrims | 7 | 11 |
| Black Grail | **3** | 11 |
| Court of the Seven-Headed Serpent | **3** | 12 |
| Mercenaries | 7 (orphaned) | 11 |
| **Total** | **45** | **85** |

Seven units carry `factionId: 'mercenaries'`, but there is no `mercenaries`
entry in `FACTIONS` (`src/data/defaultRules.ts:17`). Those units are
unreachable by any faction lookup in the app.

### 1.6 The data model cannot express the rules

Beyond wrong values, the schema in `src/types/rules.ts` is missing concepts the
game depends on:

- **No Glory cost.** `UnitProfile.baseCost` is Ducats only. The catalogues carry
  `<cost name="Glory Points">` as a first-class second currency, and the
  Dispatch describes a whole **Glory Items** system (`Blessings of Beelzebub —
  Limit: 1 — 9 Glory`). The app cannot represent any of it.
- **No constraints.** Zero units set `maxCount`. The catalogues carry **1,187
  `<constraint>` elements** — `min`/`max`, scoped to `roster` or `parent` —
  encoding "an Iron Sultanate Warband must include 1 Yüzbaşı", "0-1 Amalgam",
  "Halberd-Gun: ELITE only, Limit: 2".
- **No base sizes.** `Statline.baseSize` exists and is never populated. Base
  size is load-bearing in the rules (the Amalgam's *Unstoppable*, the Sin
  Eater's *Devour the Guilty*, and the Brazen Bull's *Living Battering Ram* all
  branch on 32mm/40mm/60mm).
- **No movement type.** The source is `6"/Infantry`; the app stores `6"`,
  discarding the type that `FLYING` and terrain rules depend on.
- **No per-model upgrades.** Strains, Vile Corpus, Goetic Powers and Glory Items
  are all "purchasable option attached to a model, with a cost and a limit". The
  app has no such concept.

### 1.7 Roster validation, the core feature, is absent

`src/components/builder/WarbandBuilder.tsx:79-83` computes `eliteCount`,
`trooperCount` and `mercenaryCount` — and never uses them. The only validation
that runs is *has a Leader* and *over budget*
(`WarbandBuilder.tsx:289`). No unit limits, no composition requirements, no
wargear legality, no Glory budget.

This is the feature that would make TrenchLine a NewRecruit replacement, and it
does not exist.

### 1.8 Fabricated network fallback

`src/services/githubSync.ts:32-51` — when the GitHub API call fails,
`fetchLatestRepoCommit` returns an invented commit:

```js
return {
  sha: 'a4f91e2b',
  commit: {
    message: 'v1.4.2 Community Errata: Updated Trench Pilgrim Martyr abilities & Ducat costs',
    author: { name: 'Fawkstrot11 (Maintainer)', date: new Date().toISOString() }
  }
};
```

This presents fabricated data to the user as a real upstream sync result. It
must be deleted, not repaired.

### 1.9 Ruleset metadata is unsourced

`src/data/rulesets/index.ts` dates the "1.0.2 Official Digital Errata" to
"August 2026" and lists changes with no traceable source. The `1.0.2TD`
("Trench Dispatch Preview") entry describes content that does not match the
actual Trench Dispatch. The whole file is replaced by the model in
[`RULESET-MODEL.md`](RULESET-MODEL.md).

---

## 2. Mobile and tablet

### 2.1 The hard bug

`src/components/layout/MobileNav.tsx:32`:

```jsx
<div className={`grid grid-cols-${navItems.length + 2} gap-1`}>
```

Tailwind resolves class names by static scanning; it cannot see interpolated
strings. `grid-cols-7` and `grid-cols-8` appear nowhere else in the source, so
neither class is ever generated. The element falls back to a single-column
grid — **the bottom navigation renders as 7–8 stacked full-width buttons
covering most of the phone screen.**

This alone accounts for much of "unusable on mobile".

### 2.2 Systemic issues

| Issue | Evidence |
|---|---|
| Viewport units break on iOS | `max-h-[90vh]` and friends in 30 modals; zero uses of `dvh`. `vh` resolves to the *large* viewport under Safari's collapsing toolbar, so modal footers and close buttons sit off-screen. |
| No safe areas | Zero occurrences of `env(safe-area-inset-*)`. The fixed bottom nav sits under the iOS home indicator. |
| Overflow masked, not fixed | `overflow-x: hidden` on `body` (`globals.css`) hides horizontal overflow instead of fixing it, so layout bugs clip content silently. |
| Desktop-only density | 431 uses of 9–11px text. `UnitCard.tsx` — the most-used component in the app — is 622 lines with **one** breakpoint. `UnitAdvancementModal.tsx` is 681 lines with two. |
| Touch targets below minimum | `UnitCard` action buttons are `py-1.5` + `text-[10px]` ≈ 26px tall, against a 44px minimum. |
| 30 duplicated modal shells | Every modal hand-rolls `fixed inset-0 flex items-center justify-center p-4`. No shared primitive, so no scroll lock, no focus trap, no escape handling, and no way to fix any of it once. |
| Unoptimised images | **102 MB** in `public/` (88 MB of scenario maps). 9 raw `<img>` tags, zero `next/image`. A single 5.9 MB world-map PNG ships at full size to phones. |
| PWA broken | `public/manifest.json` is never linked from `layout.tsx`, and its declared 192/512 icons point at 2.5 MB design mockups. "Add to home screen" — the highest-value feature for a table-side companion — does not work. |

### 2.3 Single-route architecture

`src/app/page.tsx` renders all six views and switches between them with Zustand
state. Consequences: 266 kB first-load JS with no code splitting, no deep
links, no shareable roster URLs, and the browser back button does nothing.

---

## 3. Project hygiene

- **README is wrong.** It describes "React 19 + TypeScript + **Vite**"; the app
  is Next.js 15 App Router. It claims 7 factions; the data defines 6.
- **Dead Vite scaffolding.** `src/App.tsx`, `src/main.tsx`, `src/index.css` and
  both `tsconfig.*.tsbuildinfo` files are orphans from before the Next.js
  migration. `App.tsx` is a stale duplicate of `page.tsx`.
- **The only real source material is gitignored.** `scratch/` holds genuine
  extracted rulebook text and ~40 extraction scripts, and `.gitignore` excludes
  it. The project's most valuable asset is unversioned.
- **The theme system is decorative.** Seven themes, a switcher modal, CSS custom
  properties and Tailwind token mappings — against **3,698 hardcoded hex colours
  in components and 0 uses of the theme tokens**. Switching themes changes
  almost nothing.
- **No tests, no CI.** No test runner in `package.json`, no `.github/`.
- **`ignoreDuringBuilds: true`** for ESLint in `next.config.mjs`.

---

## 4. What is genuinely good

### Verified correct: the All Out War data

`src/data/allOutWarData.ts` was checked against the official All Out War PDF and
is **correct** — the three scenarios and the full 52-card Betrayal Table match
essentially word-for-word, including the Coup/Ruse split, card values and timing
clauses.

This matters for how the rest of the data is handled: **where the original build
had the source PDF, the data is good; where it did not, it invented.** So each
data file gets verified individually rather than deleted wholesale. See
[`FEATURES.md`](FEATURES.md) for the file-by-file position.


Worth stating, because the rebuild should preserve it:

- The Next.js + Prisma + NextAuth + Zustand stack is a reasonable choice.
- The feature scope — builder, play HUD, campaign hub, codex, post-battle
  sequence — is the right set of features for this game.
- `PlayModeView` is actually responsive (`grid-cols-1 md:… lg:…` throughout).
  The responsive work is uneven, not absent.
- The visual direction is strong and consistent.
- `services/xmlParser.ts` + `newRecruitImporter.ts` already parse BattleScribe
  XML. The mechanism for the correct data pipeline is already in the repo — it
  was just wired up as a runtime "diff" feature alongside hand-written data,
  instead of being the source of that data.
