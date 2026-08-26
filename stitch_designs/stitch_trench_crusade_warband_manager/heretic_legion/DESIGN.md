---
name: Heretic Legion
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#e7bdb2'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#ad887e'
  outline-variant: '#5d4038'
  surface-tint: '#ffb5a0'
  primary: '#ffb5a0'
  on-primary: '#601400'
  primary-container: '#ff5625'
  on-primary-container: '#541100'
  inverse-primary: '#b12d00'
  secondary: '#ffb4a8'
  on-secondary: '#690000'
  secondary-container: '#920703'
  on-secondary-container: '#ff9a8a'
  tertiary: '#e9bbbb'
  on-tertiary: '#462828'
  tertiary-container: '#b08786'
  on-tertiary-container: '#3e2222'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbd1'
  primary-fixed-dim: '#ffb5a0'
  on-primary-fixed: '#3b0900'
  on-primary-fixed-variant: '#872000'
  secondary-fixed: '#ffdad4'
  secondary-fixed-dim: '#ffb4a8'
  on-secondary-fixed: '#410000'
  on-secondary-fixed-variant: '#920703'
  tertiary-fixed: '#ffdad9'
  tertiary-fixed-dim: '#e9bbbb'
  on-tertiary-fixed: '#2e1414'
  on-tertiary-fixed-variant: '#5f3e3e'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-xl:
    fontFamily: Bricolage Grotesque
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.05em
  headline-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Bricolage Grotesque
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  body-md:
    fontFamily: Courier Prime
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  stats-lg:
    fontFamily: Space Mono
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
  label-sm:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1'
spacing:
  base: 4px
  gutter: 16px
  margin: 24px
  stack-sm: 8px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

The design system embodies the "Heretic Legion" faction—a descent into a hellscape of rust, soot, and occult violence. The aesthetic is **Grim-Industrial Brutalism** mixed with **Occult Visuality**. It is designed to feel heavy, dangerous, and physically weathered.

The UI should evoke the sensation of looking at a cursed war engine or a blood-stained ritual altar. Key characteristics include:
- **Visceral Textures:** Interfaces appear forged from oxidized iron and stained by ancient soot.
- **Aggressive Geometry:** Sharp angles, spiked borders, and asymmetrical layouts that reject "clean" corporate standards.
- **Atmospheric Decay:** UI elements should feel like they are smoldering or decaying, with subtle "embers" and "flicker" effects on high-importance actions.

## Colors

The palette is rooted in the darkness of the trenches, punctuated by the violent glow of hellfire.

- **Background (Charcoal Soot):** Used for the deepest layer of the interface, providing a void-like foundation.
- **Surface (Oxidized Iron):** Used for cards, panels, and container elements. It represents the physical metal of the legion's gear.
- **Borders (Dried Blood/Rust):** Defines structural boundaries. These are never clean; they should feel encrusted and aged.
- **Primary Accent (Hellfire Orange):** Reserved for critical information, active states, and destructive actions. It represents the burning energy of the abyss.
- **Secondary Accent (Dark Crimson):** Used for ritualistic elements, health indicators, and secondary navigation.

## Typography

Typography in this design system balances raw, expressive headers with the cold, utilitarian feel of a military ledger.

- **Headlines:** While the specific blackletter request is aesthetic, we utilize **Bricolage Grotesque** (at its most eccentric weights) or custom SVG paths for headers to ensure a jagged, aggressive, and characterful presence.
- **Body:** **Courier Prime** provides the "weathered typewriter" feel of trench reports and heretical manuscripts.
- **Stats & Labels:** **Space Mono** is used for all numeric data and technical labels, mimicking the stamped metal plates found on war machinery.
- **Styling:** All headers should use `text-transform: uppercase` to maximize their imposing presence.

## Layout & Spacing

The layout follows a **Fixed, Fragmented Grid**. Elements do not always align perfectly; small offsets are encouraged to create a sense of chaotic construction.

- **The 4px Unit:** All spacing must be a multiple of 4px.
- **Asymmetry:** Larger panels should have varying padding (e.g., 24px top, 32px bottom) to simulate handmade, jagged construction.
- **Breakpoints:**
  - **Mobile:** Single column. Full-width borders with "spiked" corner treatments.
  - **Desktop:** Multi-column (12-column). Use heavy vertical "rust-lines" as gutters between content sections.

## Elevation & Depth

This design system rejects soft shadows and light-source logic in favor of **Tonal Layering and Material Texture**.

- **Depth via Contrast:** Elevation is communicated by shifting from #0a0a0a (Base) to #1a1512 (Surface).
- **Hard Outlines:** Instead of shadows, use 2px solid borders in #4a2c2c (Dried Blood).
- **Glow Effects:** The only "light" in the UI comes from the Primary Accent (#ff4500). Use `box-shadow` only as an inner-glow or outer-bloom for "Hellfire" elements to simulate burning embers.
- **Overlay:** Apply a subtle noise or film-grain texture over the entire UI to unify the "soot" aesthetic.

## Shapes

The shape language is **uncompromisingly sharp**. 

- **Sharp Edges:** All containers, buttons, and inputs must have 0px border-radius.
- **Spiked Accents:** Use `clip-path` or SVG masks to add "spikes" or "teeth" to the corners of primary containers.
- **Ritual Sigils:** Circular elements are permitted only for occult symbols or unit icons, but even these should be encased in a square, rusted frame.

## Components

### Buttons
- **Primary:** Background #ff4500 (Hellfire), text #0a0a0a. On hover, the background should flicker (opacity oscillation) and the border should expand by 2px.
- **Secondary:** Border #4a2c2c, no background. Text #ff4500.

### Input Fields
- Solid #1a1512 background. Bottom-only border (2px) in #4a2c2c.
- Focus state: Border changes to #ff4500 with a faint orange bloom.

### Cards & Panels
- Background: #1a1512.
- Border: 2px solid #4a2c2c.
- Corner Treatment: Add 8px SVG "spikes" to the top-left and bottom-right corners.

### Chips & Stats
- Used for unit keywords or status effects. 
- Appearance: Small, dark rectangles with #8b0000 (Crimson) text and a mono font.

### Lists
- Separated by horizontal "scratches" rather than clean lines.
- Use a small "tri-spiked" bullet point for list items.

### Occult Sigils
- Interactive elements (like "Confirm" or "Summon") should be accompanied by a faint, rotating ritual sigil in the background, rendered in #8b0000 at 20% opacity.