---
name: Iron Wall Sultanate
colors:
  surface: '#0f1419'
  surface-dim: '#0f1419'
  surface-bright: '#353a3f'
  surface-container-lowest: '#0a0f14'
  surface-container-low: '#171c21'
  surface-container: '#1b2025'
  surface-container-high: '#252a30'
  surface-container-highest: '#30353b'
  on-surface: '#dee3ea'
  on-surface-variant: '#bdc9c8'
  inverse-surface: '#dee3ea'
  inverse-on-surface: '#2c3136'
  outline: '#879392'
  outline-variant: '#3e4949'
  surface-tint: '#76d6d5'
  primary: '#76d6d5'
  on-primary: '#003737'
  primary-container: '#008080'
  on-primary-container: '#e3fffe'
  inverse-primary: '#006a6a'
  secondary: '#e9c349'
  on-secondary: '#3c2f00'
  secondary-container: '#af8d11'
  on-secondary-container: '#342800'
  tertiary: '#e9c176'
  on-tertiary: '#412d00'
  tertiary-container: '#8e6e2c'
  on-tertiary-container: '#fff9f4'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#93f2f2'
  primary-fixed-dim: '#76d6d5'
  on-primary-fixed: '#002020'
  on-primary-fixed-variant: '#004f4f'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#ffdea5'
  tertiary-fixed-dim: '#e9c176'
  on-tertiary-fixed: '#261900'
  on-tertiary-fixed-variant: '#5d4201'
  background: '#0f1419'
  on-background: '#dee3ea'
  surface-variant: '#30353b'
typography:
  headline-xl:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
The design system embodies the "Golden-age Industrialism" of a fortified Sultanate. It blends the architectural permanence of an iron fortress with the intricate mathematical beauty of Islamic geometry. The aesthetic is **Opulent Industrialism**: a synthesis of heavy, war-ready structures and celestial, mosaic-driven refinement.

The UI should evoke a sense of divine protection and unyielding strength. It utilizes a **Tactile / Modern** hybrid style where surfaces feel like cold, polished steel or lapis lazuli, framed by intricate brass filigree and reinforced with industrial rivets. High-contrast accents of teal glow with an inner alchemical light against a deep, nocturnal backdrop.

## Colors
The palette is rooted in the "Night Sky" (`#0f1419`), serving as the foundational void. Surfaces use a "Polished Lapis" steel (`#1c2229`) to provide depth and a sense of weight. 

- **Primary (Teal/Emerald):** Used for alchemical energy, active states, and glowing indicators. It represents the "living" element within the iron.
- **Secondary (Gold Leaf):** Reserved for high-importance highlights, rare achievements, and decorative flourishes.
- **Ancient Brass:** The structural color for borders, rivets, and mechanical framing.

## Typography
Typography contrasts the scholarly elegance of the Sultanate with the functional clarity of its engineers. 

- **Playfair Display** is used for all headlines. It should be treated with high contrast; large titles may use italic styles to emphasize the "sharpness" of the serif, mimicking calligraphy.
- **Inter** provides a systematic, utilitarian counterpoint for body text and data-heavy interfaces.
- **Label-caps** should be used for technical readouts, button labels, and metadata to maintain an industrial, stamped-metal feel.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy, suggestive of rigid fortifications. Content is organized within defined "bastions" (containers) with generous margins to allow decorative brass borders to breathe.

- **Desktop:** 12-column grid with 24px gutters. Content is centered with a max-width of 1280px to maintain the "monolith" feel.
- **Mobile:** 4-column grid. Side margins are reduced, but padding within components remains high to preserve the "opulent" sense of space.
- **Rhythm:** Spacing is strictly mathematical, utilizing a 4px baseline. Vertical rhythm is critical to mimic the precision of mosaic tiling.

## Elevation & Depth
Depth is created through **Tonal Layering** and **Industrial Framing** rather than realistic light-source shadows.

1.  **Level 0 (Background):** Deep `#0f1419`.
2.  **Level 1 (Surfaces):** `#1c2229` with a subtle noise texture (brushed steel).
3.  **Level 2 (Active Elements):** Framed with 1px Ancient Brass borders.
4.  **Special Depth:** Use "Inner Glows" in Teal (`#008080`) for alchemical components, making them appear as if they are recessed and illuminated from within. 

Avoid drop shadows. Instead, use "Hard Offsets" (1px lines) in Gold Leaf to suggest a thin edge of a metal plate.

## Shapes
Shapes are primarily **Soft-Industrial**. Standard components use a 0.25rem (4px) radius to suggest machined metal parts. 

However, the design system utilizes **Geometric Clipping**: corner treatments should occasionally use 45-degree chamfers (clipped corners) or "Arabesque Cutouts" on large containers to reference Islamic architecture. Rivets (circular 4px dots) should be placed at the four corners of primary containers as decorative structural anchors.

## Components

- **Buttons:** Primary buttons use a solid Teal fill with white or gold text. Secondary buttons are "Ancient Brass" outlines with a 1px border. All buttons feature 2px "Brass Rivets" in the corners for a bolted-down appearance.
- **Cards/Containers:** Surfaces are dark lapis. Borders must be 1px Ancient Brass. For "Legendary" items, use a double-border with an inner Gold Leaf filigree in a geometric pattern.
- **Input Fields:** Recessed appearance with a 1px `#c5a059` bottom border only. On focus, the bottom border glows Teal.
- **Chips/Badges:** Small, angular capsules with heavy borders. Use monospaced numbers for technical data within these.
- **Dividers:** Do not use plain lines. Dividers should be an "Arabesque Chain"—a repeating geometric pattern in low-opacity Brass.
- **Progress Bars:** The "well" is the background color; the fill is a Teal-to-Gold gradient, suggesting a furnace heating up.