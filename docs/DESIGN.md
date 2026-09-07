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

## Role, which is also not an accent

A Leader has always been marked — a solid header in the faction's colour, the
card's border in the same, a crown beside the word — and the other three roles
were not marked at all. So a roster of nine read as one important model and
eight identical ones, when three of the eight were an Elite and a pair of
Mercenaries with quite different jobs.

Elite and Mercenary now get the same treatment one step quieter: the header
tinted to 15% rather than filled, a 2px left rule in the full colour, and an
icon where the Leader has its crown. A **Trooper stays unmarked**, and that is
the load-bearing part — mark all four and none of them reads.

| role | colour | mark |
|---|---|---|
| Leader | `--color-primary` — the faction's | Solid header, inverted text, crown |
| Elite | `--role-elite` `#2E3A6B` | 15% header, indigo left rule, chevrons |
| Mercenary | `--role-mercenary` = `--status-legal` `#2C6152` | 15% header, green left rule, coins |
| Trooper | none | The baseline |

**Fixed across all six themes**, for the reason the accents make plain: inside
`.sheet` both `--color-primary` and `--color-accent` resolve to
`--accent-paper`, so a role drawn from either would *be* the Leader's colour —
and in the Sultanate theme it would also be the teal that theme paints
everything else with. A role has to be the same colour in every theme or it is
not a language.

Measured on `--paper-2` like everything else: elite **7.71:1**, mercenary
**5.07:1**. Elite is indigo rather than the obvious brass because brass came in
at 3.59:1 — under the 4.5 floor — and sat beside the Black Grail's brown accent
besides.

`--role-mercenary` is an **alias** of `--status-legal` rather than a copy of its
value. The recruit sheet has marked a Mercenary entry with that green since it
was written, and two screens disagreeing about what colour a Mercenary is would
be worse than neither marking one. The alias exists so the card can say what it
means; if the two ever need to part, that is the line that parts them.

The whole table lives in `src/components/ui/unitRole.ts` as **literal class
strings** — `bg-role-elite/15`, never `` bg-${token}/15 ``, which compiles to
nothing at all (§ the rules, below). Two tests hold it:
`src/components/ui/__tests__/unitRole.test.ts` asserts the four are distinct and
every colour is a token, and `e2e/roles.spec.ts` reads the painted colours off a
**production build**, because a class Tailwind never compiled is invisible to
anything static — the element simply has no background and it looks deliberate.

### The order a roster reads in

Leader, then every Elite, then every Trooper, then every Mercenary — the same
order the recruit sheet groups its entries in. It is **derived on render**
(`byRank` in `ui/unitRole.ts`), not stored, so promoting a Trooper moves its
card the moment the change lands; a stored order needs a re-sort somebody has
to remember to trigger.

The sort is stable, which matters as much as the ranking: two Troopers keep the
order they were recruited in, so a promotion moves one card and disturbs
nothing else. And it copies the array first — sorting the store's own `units`
would reorder the saved roster as a side effect of drawing it.

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

## Paper

None of the above carries over. `dvh` is meaningless on paper, a 44px touch
target is meaningless under a pen, and the two-surface tokens are built for a
lit screen. Print has its own small stylesheet — the `PRINT` block at the end
of `src/app/globals.css` — and its own rules.

**Physical units.** Points and millimetres, not `rem`. A point is a point on any
paper; a `rem` is whatever the browser's root font happens to be that day.

**`@page { size: auto; margin: 12mm }`.** A4 and US Letter differ in both
dimensions, so the page size comes from the printer rather than being named.
12mm clears the unprintable edge of every common desktop printer and leaves the
browser's own header and footer somewhere to go.

**Ink, not backlight.** Every colour is restated as black on white. A theme
built for a screen is not a palette for a photocopier, and a faction accent that
reads as mid-grey is worse than no accent.

**Pagination is a table header.** Each model is a `<table>` whose `<thead>`
carries its name, because a browser repeats a table header on every page the
table continues onto. `break-inside: avoid` is not a pagination algorithm: a
model with long rules text can exceed a page on its own, and `avoid` then either
does nothing or emits a blank page. The header gives a continuation page with
the model's name at the top, no clipping, and no shrinking font.

**Space to write is a measurement.** The notes box on a Pretty sheet is
`min-height: 22mm` — four comfortable lines of handwriting — because "space for
handwritten notes mid game" is a physical requirement and not a visual one. A
box that happens to look right at the author's zoom level is not that.

**A card's size comes from the paper, not the layout.** The Cards sheet is
`91 x 124mm`, four to a page, and those numbers are two columns and two rows of
the area **both** papers can print: A4 is 210x297mm, US Letter is 215.9x279.4mm,
and with 12mm margins the intersection is 186 x 255.4mm. A card sized to A4
alone is wrong on every American printer, which is not a rounding error.

**The stated size is a floor.** `min-height`, never `height`. A fixed height
has only two ways to handle a model with more rules than fits, and E6 forbids
both: clip it, or shrink the font. A card that grows is neither.

**The overflow policy is an appendix, deduplicated.** A card names its
abilities; their text is printed once each, for the whole warband, on its own
page after the cards. That is what lets the card have a stated size at all —
and the deduplication is not a nicety: a Black Grail roster with twelve Grail
Thralls would otherwise spend three pages printing *Overwhelming Horde* twelve
times.

**Not verified on paper.** Everything above is stated in physical units for
exactly that reason, but no printer has been run. `docs/EXPORT-CODEX-REVIEW.md`
E6 is right that browser screenshots are not a substitute, and A4 and Letter at
100% scale still need checking on a real device.

## What did not change

Every workflow, every route, every piece of state. This pass moved colour,
type, spacing and the shape of four headers. It did not touch the data
pipeline, the validation engine, the store, or what any button does.

## See also

- [`MOBILE.md`](MOBILE.md) — the three formats and the definition of done.
- `src/app/globals.css` — the token layer, with the reasoning inline.
- `src/components/landing/Landing.tsx` — the front door, and why it is ordered
  the way it is rather than in nav order.
- `scripts/build-brand-banner.mjs` — the lockup, drawn to these rules: no
  gradient on the ground, no plate behind the mark, no rim frame, no radius, no
  shadow, one hairline at one weight, and Archivo for the wordmark. It fails
  rather than substituting a face, because fontconfig will quietly hand back
  DejaVu and a wordmark in the wrong typeface renders without error.
- `src/components/ui/ViewMasthead.tsx` — the shared masthead.
