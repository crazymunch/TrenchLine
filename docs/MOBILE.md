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
remember: on the phone, `button:not(.tap)` has `min-height: 44px`, and form
controls have `min-height: 44px` and `font-size: 16px !important`.

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
className="min-h-[44px] sm:min-h-0 sm:py-1.5"
/* a control that cannot */
className="tap p-1 text-theme-muted hover:text-status-error"
```

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
strings. This is a live bug in `MobileNav.tsx:32`:

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

### 8. Images

102 MB currently ships from `public/`, including a 5.9 MB world-map PNG, via
raw `<img>` tags.

- Use `next/image` everywhere. Configure `deviceSizes` in `next.config.mjs`.
- Convert maps and art to WebP/AVIF with responsive `sizes`.
- Full-resolution scenario maps load **only** in the lightbox, never in a list.
- Target: < 200 kB of imagery on first paint.

### 9. PWA

`public/manifest.json` exists, is never linked from `layout.tsx`, and declares
2.5 MB design mockups as its 192/512 icons. For a table-side companion,
install-to-home-screen is the single highest-value mobile feature.

Fix: link the manifest, generate real maskable icons at 192/512, add
`apple-touch-icon` and `theme-color`, and set `display: standalone` with
`orientation: any` (players hold tablets both ways).

## Component priorities

Ordered by how much time a user spends in them on a phone:

1. **`MobileNav`** — broken; fix first.
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
