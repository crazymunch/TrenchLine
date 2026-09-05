# The Iron Ledger

The visual language of the app, and why it is what it is.

## The idea

TrenchLine is a **dark chrome wrapped around a cream sheet of paper**. The top
bar, the navigation rail and the phone nav are the *app* — iron, unlit, out of
the way. Everything inside `<main>` is the *document* — the roster, the codex,
the campaign — and it is paper.

A warband roster is a record. It is written down, corrected, argued over across
a table, and printed. Trench Crusade's own material is a typewritten dossier
with a black-letter cover. The design that fits that is a ledger on a workbench,
not a glowing games console: flat surfaces, hairline rules, tabular numbers, and
one colour that means something.

This replaced a design that was mid-2010s dark-mode-everything: rounded cards
with drop shadows on a near-black ground, a coloured glow around the accent,
eight display faces, and body copy in a UI grey. It looked like every other
tool. Nothing about it said *record*.

## The mechanism

Two surfaces, and **the same token names mean different things in each**:

| Token | Chrome (`:root`) | Sheet (`.sheet`) |
|---|---|---|
| `--bg-base` | `#16181C` iron | `#E9E4D7` paper |
| `--bg-surface` | `#1E2127` | `#E4DECE` |
| `--bg-elevated` | `#1A1D22` | `#DFD9C9` |
| `--color-border` | `#2A2E36` | `#C3BCA8` |
| `--color-text` | `#E9E4D7` | `#191713` ink |
| `--color-muted` | `#7A8290` | `#6E6757` |
| `--color-primary` | `--accent-iron` | `--accent-paper` |

`.sheet` sits on one element — `<main>` in `src/app/page.tsx` — and redefines
those custom properties for its subtree. Custom properties inherit, so every
`bg-theme-surface` and `text-theme-text` already written across 47 component
files resolves to paper inside the sheet and to iron outside it, with no
component changed.

That is the whole reason a change this large was tractable. The alternative —
a parallel set of `paper-*` tokens applied by hand at ~3,800 call sites — would
have been a month of work and would have drifted the first time someone added a
component.

## Faction identity

Six themes, each setting **two** accents:

- `--accent-iron` is the theme's own colour, drawn for a dark ground. It is
  what the rail, the top bar and the phone nav use.
- `--accent-paper` is a colour of the same identity taken dark enough to carry
  text on cream. It is what everything inside the sheet uses.

Two, not one, because a colour legible on `#16181C` is rarely legible on
`#E9E4D7`. Iron Sanctum's gold is 1.9:1 on cream — invisible. Every paper accent
is measured against `--paper-2`, the banded row rather than the sheet, because
that is the worse case and it is where costs and headers sit. All six clear 6.7:1.

Two of the six were chosen rather than derived, because neither theme has a
colour of its own dark enough: the Sultanate's `#0F4C5C` is the dark end of the
same lapis as its `#76D6D5`, and Hell's `#73215F` is the Tyrian purple the Court
of the Seven-Headed Serpent is named for. Hue, not just value, has to separate
them — four of the six would otherwise have been reds and browns.

## Brand, which is not an accent

The landing page at `/` is the one screen that renders before any warband
exists, so it has no faction — and `--accent-paper` is overridden by all six
themes above, so a front door built on it would greet a visitor in whichever
faction they last looked at. It uses a separate, fixed set:

| token | value | what it is for |
|---|---|---|
| `--brand-oxblood` | `#8C201B` | Rules and fills: the 3px card top rules, the primary button, Glory costs on cream |
| `--brand-oxblood-lit` | `#A32A24` | That button's hover |
| `--brand-oxblood-ink` | `#C08A84` | Oxblood's **voice on dark** |
| `--brand-gold` | `#C59B27` | The eyebrow, taken from the banner wordmark |

Plus eight greys — `--brand-ground`, `-ground-2`, `-hover`, `-line`, `-line-2`,
`-body`, `-lede`, `-plate` — for the values the theme tokens do not already
carry. Six of the design's values turned out to be tokens the app has:
`#16181C` is `--bg-base`, `#1E2127` is `--bg-surface`, `#1A1D22` is
`--bg-elevated`, `#2A2E36` is `--color-border`, `#E9E4D7` is `--color-text`,
`#7A8290` is `--color-muted`. Those are used as tokens.

**Measured, and one result is a rule.** Oxblood on the iron ground is
**1.98:1** — so it is never a letterform there, only a rule or a fill, and
`--brand-oxblood-ink` (6.10:1) is what carries oxblood's meaning in text. On
the banded row it is 6.38:1, which is why Glory costs on cream can be oxblood
itself. Gold on the hero ground is 7.49:1.

The page carries no hex of its own; a test asserts it
(`src/components/landing/__tests__/previews.test.ts`). The one exception is
`GoogleMark`, whose four hexes are Google's trademark colours and must not be
tokenised or themed.

## The rules

**Flat and square.** Zero border radius, no shadows, no glow. A thing is
separated from its neighbour by a 1px rule or by a change of ground, never by a
simulated highlight. Enforced in `globals.css` with `[class*='rounded']` and
`[class*='shadow']` rather than by editing 166 `rounded-*` and 188 `shadow-*`
usages, because that is the only way the rule stays true for the next component
someone writes. `.rounded-full` is exempt: a circle is a shape, not a corner
treatment.

**Three faces, each with a job.**

| | |
|---|---|
| **Archivo** | Headings and names. A grotesque that reads as printed record. |
| **IBM Plex Mono** | Every number, label and keyword. |
| **Newsreader** italic | Flavour only — mottos, battlefield quotes, the rulebook's own prose. The one voice that is not the app's. |

Down from eight. The seven legacy `.font-*` classes are kept as aliases onto
these three; they are on ~400 call sites, and left pointing at faces the app no
longer loads they fell back to generic `serif` / `sans-serif`, which is worse
than the token stack rather than merely different.

Numbers are tabular everywhere (`font-feature-settings: 'tnum'`). A statline
that does not align in a column is harder to read than a smaller one that does.

**Three utilities carry the design.** `.eyebrow` is the small tracked mono cap
that heads a block (add `.accent` for the faction colour — two classes, so it
beats `.eyebrow`'s own colour). `.flavour` is Newsreader italic. `.meter` is a
3px bar with no gradient. One class each, instead of the same four Tailwind
utilities repeated.

## The shapes

**Mastheads.** Every top-level view opens with `ui/ViewMasthead`: an eyebrow
naming the section, a three-or-four-word title, and a strapline. The four views
that had written this by hand put an icon in a `flex items-center` row with the
`<h1>`, so once the heading wrapped to three lines — which every one of those
titles did at 375px — the icon floated in the vertical middle, level with
nothing.

**Bands, not columns.** The warband header is three stacked bands — identity,
toolbar, ledger strip — rather than an identity block beside a toolbar. Bands
stack the same way at every width; a two-column header only has one good size.

**Toolbars scroll, they do not wrap.** A wrapping toolbar is a toolbar whose
buttons move between visits. Wide rows get `overflow-x-auto` with a `min-w-max`
track and negative margins so the last button is visibly cut off at the
container edge — which is what tells you it scrolls.

## What did not change

Every workflow, every route, every piece of state. This pass moved colour,
type, spacing and the shape of four headers. It did not touch the data
pipeline, the validation engine, the store, or what any button does.

## See also

- [`MOBILE.md`](MOBILE.md) — the three formats and the definition of done.
- `src/app/globals.css` — the token layer, with the reasoning inline.
- `src/components/landing/Landing.tsx` — the front door, and why it is ordered
  the way it is rather than in nav order.
- `src/components/ui/ViewMasthead.tsx` — the shared masthead.
