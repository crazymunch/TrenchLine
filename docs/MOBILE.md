# Mobile & Tablet Standards

TrenchLine is used **at a table, on a phone, with dice in one hand**. Play Mode
in particular is a phone app that happens to also run on a desktop. The original
build inverted this: it is a dense desktop UI scaled down until it stops working.

## Target devices

| Breakpoint | Width | Primary use |
|---|---|---|
| Base (no prefix) | 375px | Phone — **the default target** |
| `sm:` | ≥640px | Large phone landscape |
| `md:` | ≥768px | Tablet portrait — the common table device |
| `lg:` | ≥1024px | Tablet landscape / small laptop |
| `xl:` | ≥1280px | Desktop |

**Write base styles for the phone.** Every unprefixed utility is a phone style;
`sm:`/`md:`/`lg:` add desktop affordances. The current codebase does the
opposite, which is why it degrades rather than adapts.

## Rules

### 1. Viewport units

Never use `vh` for anything that must stay on screen. iOS Safari resolves `vh`
against the *large* viewport, so `90vh` extends under the collapsing toolbar and
cuts off modal footers.

```css
/* wrong — 30 occurrences in the current codebase */
max-h-[90vh]
/* right */
max-h-[90dvh]
```

Use `dvh` for anything interactive, `svh` where you need the guaranteed-visible
minimum.

### 2. Safe areas

The app has a fixed bottom nav and full-screen modals. Both must respect the
home indicator and notch. Zero occurrences of `env(safe-area-inset-*)` exist
today.

```css
/* globals.css */
:root {
  --safe-b: env(safe-area-inset-bottom, 0px);
  --safe-t: env(safe-area-inset-top, 0px);
}
.pb-safe { padding-bottom: calc(0.5rem + var(--safe-b)); }
```

Add `viewport-fit=cover` to the viewport meta, or the insets always report `0`.

### 3. Touch targets — enforced in `globals.css`

**44×44px minimum** for anything tappable. This is no longer a convention to
remember: on the phone, `button:not(.tap)` has **`min-height: 44px` and
`min-width: 44px`**, and form controls have `min-height: 44px` and
`font-size: 16px !important`.

Width was missing until 2026-09-20, and height alone was half the rule: a thumb
is round, so a control 44px tall and 20px wide is as easy to miss as one 20px
tall. What it left behind were the controls reached for most — the `+`/`-`
steppers on every wound, Blood Marker and Blessing Marker row in Play Mode, at
44×20, side by side, with dice in the other hand.

Fixing 150 buttons one at a time fixes them once — the next toolbar button
someone writes is 30px again, because nothing says otherwise. So the rule is in
the stylesheet and `.tap` is the documented opt-out.

**`.tap`** gives a control a 44px hit area as an invisible centred overlay,
without changing how it looks. Use it for anything that must stay visually
small: a remove cross beside a weapon name, a category chip, a modal's close
button.

**The touch rules run to 1023px, not 639px.** The tablet in the table above is
"the common table device": it is touched, not moused, and iPad Safari zooms a
sub-16px input exactly as iPhone Safari does. `sm:` is large phone *landscape*,
which is still a thumb. Density is restored at `lg:`, where a laptop starts — so
a touch-target override is `lg:min-h-0`, never `sm:min-h-0`.

```jsx
/* a control that can afford to grow */
className="min-h-[44px] lg:min-h-0 lg:py-1.5"
/* a control that cannot */
className="tap p-1 text-theme-muted hover:text-status-error"
```

> This example said `sm:min-h-0` until 2026-09-20 — contradicting the paragraph
> directly above it — and ten controls across six files copied the example
> rather than the rule. They released the floor at 640px, so the Dice Engine's
> `Risky` and `Bloodbath` toggles were 34px on the 768px tablet this document
> calls the common table device. A worked example that disagrees with its own
> rule is worse than no example.

**A checkbox is measured by its label.** A checkbox's own box is the one hit
area you cannot grow without the result looking absurd, and you do not need to:
the browser makes its `<label>` toggle it, so the label is what a thumb aims at.
Give the label the floor (`min-h-[44px]`), not the box. `expectTouchTargets`
measures it that way, and still fails a checkbox with no label at all — which
is the case that really is unreachable. A box that is an *indicator* inside a
clickable row, rather than a control, says so with `pointer-events-none` (and
`readOnly`, `tabIndex={-1}`, `aria-hidden`), and is skipped.

Both rules live **outside `@layer`**, for the reason the theme variables do:
Tailwind drops `@layer base` rules whose selectors it cannot find in the content
globs, which is exactly how all six theme blocks vanished from the compiled
stylesheet in 3.5.

### 4. Type scale

The app uses 9–11px text in 431 places. On a phone, in a dim room, next to a
painted model, that is unreadable.

| Role | Phone | Desktop |
|---|---|---|
| Body / stats | `text-sm` (14px) | `sm:text-xs` |
| Labels | `text-xs` (12px) | `sm:text-[11px]` |
| Headings | `text-lg` | `sm:text-base` |
| **Form inputs** | **`text-base` (16px), always** | — |

Inputs below 16px make iOS Safari zoom the page on focus and never zoom back.
This is non-negotiable regardless of visual density.

`text-[9px]`, `text-[10px]` and `text-[11px]` are banned outside `sm:`-and-up
prefixes. The app had 397 of them; they are now all `text-xs sm:text-[Npx]`, so
the phone reads at 12px and the desktop keeps its density.

**Raising the type can break a layout, and a clipped label is worse than a small
one.** Raising the bottom nav's labels to 12px clipped `Campaign` to `Campaig…`
at every phone width. The fix was to give the labels room — the theme switcher
and bug reporter became icon-only, since they are utilities rather than
destinations — and to use the view's own shorter name, `Crusade`. Check for
clipping after a type change, not just for size.

### 5. No dynamic Tailwind class names

Tailwind resolves classes by static scanning and cannot see interpolated
strings. `MobileNav` was the shipped example and is **fixed** — the bar is now a
flex row of `flex-1` buttons, which takes any number of items without naming a
column count at all. The broken shape is kept below because the rule it
illustrates has not changed:

```jsx
/* BROKEN — grid-cols-7 is never generated, the nav collapses to one column */
<div className={`grid grid-cols-${navItems.length + 2} gap-1`}>

/* right — map to whole class names */
const COLS = { 5:'grid-cols-5', 6:'grid-cols-6', 7:'grid-cols-7', 8:'grid-cols-8' };
<div className={`grid ${COLS[count]} gap-1`}>
```

Better still for a nav of variable length: `flex` with `flex-1` children, which
has no such failure mode.

### 6. Never mask overflow

`globals.css` sets `overflow-x: hidden` on `body`. Remove it. It hides layout
bugs instead of fixing them, and it silently clips content on narrow screens.

Wide content — stat tables, the territory map, scenario diagrams — scrolls
inside its own `overflow-x-auto` container. The page body never scrolls
sideways.

**Nor does a row of controls, at any width.** This rule was written about the
page and got obeyed literally: the builder toolbar, the codex filters, the
category chips and eight other rows each became their own `overflow-x-auto`
rail with a `min-w-max` track, which keeps the page honest and hides the
controls. On a 375px screen four of the toolbar's nine buttons were off the
edge and the only thing advertising them was a cut-off eighth. It was no
better at 1440: there is no swipe on a desktop, so what is past the edge is
reached by dragging a 4px bar, or not reached.

A row of buttons **wraps** — `flex flex-wrap`, or a grid when the labels change
length as they are pressed and a wrapping row would move its neighbours. The
cost is that buttons carrying a count move as the count changes; that is worth
paying, and it is why the highest-consequence controls get their own row rather
than a place in the wrap. Only a `<table>` or a `<pre>` scrolls in a container
of its own.

`e2e/mobile.spec.ts` holds it: on every top-level view, no element with two or
more controls in it has a computed `overflow-x` of `auto` or `scroll` unless it
wraps a table.

### 6b. One home for a setting

The theme switcher, the bug reporter and the ruleset selector each existed in
three places: the desktop top bar, the desktop sidebar's footer, and the phone
account menu. Three copies of one control is two of them drifting, and it was
already happening — the top bar's ruleset select carried a 96px width budget
the sidebar's had never heard of.

They live in the **account menu in the top bar**, at every width. That menu
opens signed out as well: none of the three is an account feature, and
local-only play is supported everywhere else in the app.

The same rule settled the warband pill. The top bar showed the active
warband's name, Ducats and Glory; at `lg:` the sidebar appears and already
carries the faction, a selector naming the warband and a Ducat meter. The pill
is now `lg:hidden` — it stays below `lg:`, where there is no sidebar — and
Glory moved into the sidebar, because it was the one figure the pill had that
the sidebar did not.

The account itself was the last one to move. The sidebar's footer carried a
Login button when signed out, and when signed in the name, the admin crown and
a button opening the same sign-in sheet — a second copy of what the top bar's
account menu already had, on a screen showing both at once. Two Login buttons
is not a convenience: it is two things to keep in step, and a reader has to
work out whether they do the same thing. The sidebar's footer now holds the
expand toggle and, when the sidebar is expanded, renders nothing at all — an
always-present footer would rule a line across the bottom with nothing under
it, which reads as something failing to load.

`e2e/mobile.spec.ts` holds all three: exactly one ruleset select and exactly
one Login exist anywhere on the page, and the budget is stated once at each
width. The Login count replaced a `page.locator('header')` workaround the test
needed to get past the duplicate — the disambiguation became the assertion.

### 6c. The phone bar is five slots, and the fifth is a door

Five is a ceiling, not a current count. A 375px bar gives each slot about 53px
of label, and whether a given word *appears* to fit depends on the platform
font — `Directory` fitted exactly in the sandbox and ellipsed on CI's, which is
how a clipped label shipped twice. §4 records the rest of the history.

So the count stopped being a variable. Four destinations, then a **More**
button opening the shared `Sheet` with everything else. A new view costs a row
in that sheet and nothing else; nobody has to reopen the question of which
seven-character word can be shaved out of the bar.

What goes in the bar rather than behind the door is *how often it is opened
mid-game*, not how important it is. The Codex keeps a slot because it is
consulted with a model in your other hand, so an extra tap is paid on every
use. Roster Directory and the Chronicle of Battles are read between games.

The door is marked active when the view behind it is the one on screen, so the
bar still says where you are. Labels in the sheet are the full names — a list
with the whole width to itself has no seven-character budget — which is why it
reads `Roster Directory` there and read `Players` in the bar.

`e2e/helpers.ts` routes `goTo` through the sheet for the views behind it, so
the per-view mobile sweep covers them like any other. That matters more than it
sounds: the Chronicle shipped with seven `text-[10px]` spans because no test in
the sweep had ever opened it on a phone.

**The sheet is a sibling of the bar, never a child of it.** The bar carries
`backdrop-blur`, and an element with a `filter` or `backdrop-filter` becomes
the containing block for its `position: fixed` descendants — so a sheet
rendered inside it resolves `inset-0` against the bar's own 73px strip rather
than the viewport. It fit on a 375px phone by luck and put a row outside the
viewport on the tablet: visible, enabled, and unclickable. The sheet's own
markup was correct throughout, which is why this is a rule and not a fix.

The same trap applies to `transform`, `perspective`, `contain: paint` and a
`will-change` naming any of them. If an overlay has to live under one of those,
it needs a portal, not a bigger `z-index`.

### 7. Modals become sheets

Thirty modals hand-roll `fixed inset-0 flex items-center justify-center p-4`.
Replace all of them with one primitive:

```
<Modal>  →  phone:   bottom sheet, full width, max-h-[90dvh], safe-area padding,
                     drag-to-dismiss, sticky header + footer
            desktop: centred dialog, max-w-*, click-outside to close
```

The primitive owns body scroll lock, focus trap, `Escape`, and the safe-area and
`dvh` handling — so those are fixed once rather than thirty times.

**Until a modal has moved, it calls `useOverlay`.** Migrating thirty modals to
`Sheet` structurally is a lot of JSX surgery, and the behaviour does not have to
wait for it: `src/components/ui/useOverlay.ts` is the implementation `Sheet`
uses, extracted so a component still rendering its own overlay gets the scroll
lock, the focus trap and `Escape` from one call. A component that has moved to
`Sheet` does not call it — `Sheet` does.

`TerritoryMap`'s dossier is the first adopter: it had none of the three, so it
could not be closed from a keyboard, Tab walked out into the map behind it, and
the page scrolled under a finger on the panel.

**A thing you can click is a `<button>`.** Not a `<div>` with an `onClick` —
that has no focus, no Enter or Space, and nothing announcing it as pressable, so
it is unreachable without a pointer. The territory pins and theatre cards were
both written that way; making them buttons is what gives them all three, with no
`onKeyDown` of our own. Where the drawn control is smaller than the touch floor
(the map pin is 24px), `tap` widens the hit area without changing what is drawn.

`headerAside` pins a live figure to the top-right of the sticky header, left of
the close button. The recruit sheet uses it for Ducats remaining: on a phone the
budget is otherwise a scroll away on the view behind, so it was only ever
discovered after the Warband had been built. It is for a *figure*, not a second
action — a control there competes with Close for the same thumb.

### 8. Images

102 MB currently ships from `public/`, including a 5.9 MB world-map PNG, via
raw `<img>` tags.

- Use `next/image` everywhere. Configure `deviceSizes` in `next.config.mjs`.
- Convert maps and art to WebP/AVIF with responsive `sizes`.
- Full-resolution scenario maps load **only** in the lightbox, never in a list.
- Target: < 200 kB of imagery on first paint.

### 9. PWA

**Done.** `public/manifest.json` is linked from `layout.tsx`, declares icons at
192/512 in both `any` and `maskable`, an `apple-touch-icon`, a `theme-color`,
and `display: standalone` with `orientation: any` (players hold tablets both
ways). Install-to-home-screen is the highest-value mobile feature for a
table-side companion, and it works.

**The home-screen icon is full bleed.** A maskable icon is cropped by the
launcher to a shape the app does not choose — a circle on a Pixel, a squircle
on Samsung, a rounded rect on iOS — so *every pixel is artwork* and the mark
sits inside the guaranteed safe circle (80% of the width).

This was got wrong once, and the failure is worth remembering because the
manifest was correct throughout: it declared `purpose: "maskable"` from the
start, while the artwork was a small silver badge floating on a near-black
ground. Masked to a circle that is a dark disc with a little square inside it;
letterboxed instead, a dark square. The app's owner sent a screenshot of his
launcher with TrenchLine as the only square tile in a grid of circles.

Two rules follow, and `scripts/__tests__/appIcons.test.mjs` holds both:

- **No border, no margin, no backdrop.** The outer edge must be artwork.
  Anything the author treats as margin is something the launcher may treat as
  the icon.
- **The mark clears the safe CIRCLE, not the safe square.** A wordmark sized
  to fit the square still loses its corners to a circular mask, which is how
  `T✝C` comes out as `✝`.
- **Any hard boundary in the artwork lies outside the safe circle.** This is
  the reported bug stated exactly: a badge with its own field, ending partway
  in, means the mask crops the surround rather than the icon.
- **Content past the safe circle goes all the way round, or is not there.** A
  rim is drawn at the edge on purpose and may be shaved; a wordmark that
  overflows at a few angles gets a bite taken out of it, which is how `T✝C`
  came out as `✝`.

These checks have been wrong twice, in opposite directions, and the file says
so where it matters. First they encoded a PALETTE — the edge had to be lighter
than luminance 120, and the mark was found by being darker than the ground —
both true of the silver badge they were written beside and neither a property
of a maskable icon. Then they encoded a COMPOSITION: a small mark centred on a
ground running edge to edge. That is one good way to draw an icon and not the
only one; the artwork now is a disc that fills the frame, and all three checks
rejected it.

What they assert now is neither. Each has been proved to fail on the bug it
exists for — the artwork shrunk into a field of its own, a wordmark overflowing
the circle, and transparent corners — and to pass on artwork that is simply
composed differently.

`npm run icons:build` regenerates every icon, both favicons and the masthead
from `public/brand/icon.svg`, the app's own artwork. It renders and nothing
else: the source is drawn FOR the frame — the disc reaches 95.5% of the
half-width and the lettering stops 0.8px inside the safe circle — so there is
nothing to fit, and sizing artwork that is already the right size can only make
it wrong. Two variants come out of the one file: full bleed for the home-screen
icons, and the same file with its background rect removed for the browser tab
and the in-app masthead, where a dark square inside dark chrome draws a box
around nothing.

## Component priorities

Ordered by how much time a user spends in them on a phone:

1. ~~**`MobileNav`** — broken; fix first.~~ **Done.** Flex row, `flex-1`
   buttons, 44px targets, and a comment in the file saying why it is not a
   grid.
2. **`UnitCard`** (622 lines, 1 breakpoint) — the most-used component. Needs a
   phone layout: collapsed summary row, tap to expand, statline as a scrollable
   strip, actions in a sheet rather than a 3-column button bar.
3. **`PlayModeView`** — already the most responsive view. Needs touch-target and
   type-scale work, not restructuring.
4. **`AddEquipmentModal` / `UnitAdvancementModal`** — the two heaviest modals;
   sheet treatment plus a real mobile filter UI.
5. **`WarbandBuilder`** — header/budget bar reflow.
6. **`CodexView`**, **`CampaignHubView`** — reference reading; lower frequency.

## Offline

The app opens with no signal, and says so honestly when it cannot reach the
server.

- The shell, the static chunks, the icons and the scenario maps are cached by
  `public/sw.js`.
- The ruleset is cached stale-while-revalidate. It is ~1.6 MB served from
  `/api/dataset` rather than bundled, so without it a cached shell opens an app
  with no statlines — which looks like it works.
- A roster's own data is **not** served from the service worker. It lives in
  `localStorage` with a merge rule (see
  [`ARCHITECTURE.md`](ARCHITECTURE.md#persistence-and-which-copy-wins)); a
  cached HTTP response would be a third copy with no rule for reconciling it.
- `SyncStatus` in the top bar says which of local-only, syncing, backed up,
  pending or failed is true, and why. "Did my roster save?" is a question
  asked at a table with no signal, and the app used to answer it only in the
  console.

`e2e/offline.spec.ts` cuts the network for real rather than mocking a route.

## Definition of done

Three formats, all first-class: the **phone** (375×667) is where a roster gets
built on a commute and checked at the table, the **tablet** (768×1024) is the
table device during a game, and the **desktop** (1440×900) is where most roster
building actually happens. A view is not finished until all three hold.

At every width:

- No horizontal page scroll (with `overflow-x: hidden` removed from `body`).
- Modals open, scroll and close with the keyboard up.
- No view throws.
- Playwright covers the flow at that width.

Below 1024px — phone and tablet, the two that are touched — additionally:

- Every interactive element is ≥44px, as height or as a `.tap` overlay.
- No text below 12px, no input below 16px.
- The bottom nav clears the home indicator.

The touch floors stop at 1024px on purpose. A mouse does not need 44px, and
enforcing it on a desktop only makes neighbouring controls fight each other for
clicks — so `playwright.config.ts` runs the `desktop` project without those two
assertions rather than with a weaker version of them. The rules that implement
them live in `globals.css` under `@media (max-width: 1023px)`, not in the
components, so the next component written inherits them.
