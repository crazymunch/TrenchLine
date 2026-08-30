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

### 3. Touch targets

**44×44px minimum** for anything tappable. `UnitCard`'s action buttons are
currently ~26px (`py-1.5` + `text-[10px]`).

```jsx
/* wrong */  className="py-1.5 text-[10px]"
/* right */  className="min-h-[44px] px-3 text-sm sm:min-h-0 sm:py-1.5 sm:text-xs"
```

Icon-only buttons get an invisible expanded hit area, not a bigger icon.

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

`text-[9px]` and `text-[10px]` are banned outside `sm:`-and-up prefixes.

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

## Definition of done

A view is not finished until, at **375×667** and **768×1024**:

- No horizontal page scroll (with `overflow-x: hidden` removed from `body`).
- Every interactive element is ≥44px.
- No text below 12px, no input below 16px.
- Modals open, scroll and close with the keyboard up.
- The bottom nav clears the home indicator.
- Playwright covers the flow at both widths.
