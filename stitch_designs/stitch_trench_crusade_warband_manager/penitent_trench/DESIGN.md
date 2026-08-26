---
name: Penitent Trench
colors:
  surface: '#151311'
  surface-dim: '#151311'
  surface-bright: '#3c3936'
  surface-container-lowest: '#100e0c'
  surface-container-low: '#1d1b19'
  surface-container: '#211f1d'
  surface-container-high: '#2c2927'
  surface-container-highest: '#373432'
  on-surface: '#e8e1dd'
  on-surface-variant: '#c8c7bc'
  inverse-surface: '#e8e1dd'
  inverse-on-surface: '#33302d'
  outline: '#929187'
  outline-variant: '#47473f'
  surface-tint: '#c8c8b0'
  primary: '#ffffff'
  on-primary: '#303221'
  primary-container: '#e4e4cc'
  on-primary-container: '#646652'
  inverse-primary: '#5e604d'
  secondary: '#ffb3ad'
  on-secondary: '#68000a'
  secondary-container: '#8f191d'
  on-secondary-container: '#ff9e97'
  tertiary: '#ffffff'
  on-tertiary: '#352f2a'
  tertiary-container: '#ebe1d8'
  on-tertiary-container: '#6a635c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e4e4cc'
  primary-fixed-dim: '#c8c8b0'
  on-primary-fixed: '#1b1d0e'
  on-primary-fixed-variant: '#474836'
  secondary-fixed: '#ffdad7'
  secondary-fixed-dim: '#ffb3ad'
  on-secondary-fixed: '#410004'
  on-secondary-fixed-variant: '#8c171b'
  tertiary-fixed: '#ebe1d8'
  tertiary-fixed-dim: '#cfc5bc'
  on-tertiary-fixed: '#201b16'
  on-tertiary-fixed-variant: '#4c463f'
  background: '#151311'
  on-background: '#e8e1dd'
  surface-variant: '#373432'
typography:
  headline-lg:
    fontFamily: EB Garamond
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: EB Garamond
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: EB Garamond
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Libre Caslon Text
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Libre Caslon Text
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Courier Prime
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
  label-sm:
    fontFamily: Courier Prime
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: EB Garamond
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

The design system embodies the grim, fanatical devotion of a pilgrim faction entrenched in an eternal holy war. The visual language is defined by **Industrial Medievalism**—a fusion of 14th-century religious fervor and 20th-century trench warfare. The UI should evoke an emotional response of claustrophobic dread tempered by unwavering zeal.

The aesthetic leans heavily into **Tactile / Skeuomorphic** elements with a **Brutalism** edge. Interfaces should feel like a collection of scavenged artifacts: weathered parchment pinned to rotting wooden planks, rusted iron frames, and crude wax seals. Elements are intentionally unrefined, favoring the "hand-made" and the "weathered" over the digital and the clean. All surfaces should incorporate grit, grain, and subtle textures representing mud, blood, and rust.

## Colors

The palette is derived from the filth and relics of the trenches.

*   **Background (#141210):** A deep, muddy charcoal representing the bottom of a trench. Use this for the primary application canvas.
*   **Surface (#25221e):** The color of cured leather and wet timber. Use for secondary containers and background layers of interactive elements.
*   **Primary Accent (#f5f5dc):** "Bleached Bone." This is the primary text color and the color of parchment. It represents purity amidst the muck.
*   **Secondary Accent (#a52a2a):** "Martyr's Dried Blood." Used for highlights, urgent alerts, and decorative wax seals.
*   **Borders (#403a34):** "Rusted Barbed Wire." Used for structural dividers and weathered iron frames.

## Typography

The typography system contrasts the divine with the mechanical.

*   **Headlines (EB Garamond):** Used for titles and headers. It provides a "hand-scribed" calligraphic feel that evokes medieval manuscripts. It should be used with tight tracking to feel urgent.
*   **Body (Libre Caslon Text):** A sturdy, literary serif for long-form reading and descriptions. It balances readability with a classical, historic aesthetic.
*   **Labels (Courier Prime):** Representing crude, stamped metal or typewriter instructions found in military field manuals. Use this for buttons, metadata, and technical labels to create a "stamped" industrial contrast.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy, reminiscent of a soldier's kit or a reliquary box. 

*   **Structure:** Use a 12-column grid for desktop and a 4-column grid for mobile. 
*   **Density:** Spacing should feel "cramped" and "heavy." Avoid airy, modern whitespace. Content should feel packed into the available space, like supplies in a bunker.
*   **Breakpoints:** 
    *   Mobile: < 600px (Single column, centered items).
    *   Tablet: 600px - 1024px (Reduced margins, 8-column).
    *   Desktop: > 1024px (12-column, fixed max-width of 1280px).
*   **Asymmetry:** Occasionally break the grid with "handwritten" notes or icons that are slightly rotated (1-3 degrees) to mimic items haphazardly tossed onto a table.

## Elevation & Depth

Depth is conveyed through **Tonal Layers** and physical metaphors rather than soft shadows.

*   **Layer 0 (Mud):** The base background (#141210).
*   **Layer 1 (Timber):** Cards and main containers use the surface color (#25221e) with a subtle vertical grain texture.
*   **Layer 2 (Parchment):** Interactive surfaces or highlighted content use parchment-colored overlays (#f5f5dc at 90% opacity) with torn edge masks.
*   **Interactions:** Instead of lifting an element with a shadow on hover, use a "stamped" effect where the element shifts 2px down and right, as if pressed into the mud.
*   **Shadows:** When used, shadows should be "hard" (0-2px blur) and very dark, appearing like grease stains or heavy soot beneath an object.

## Shapes

The shape language is **Sharp** and jagged. 

*   **Corners:** Strictly 0px roundedness for all structural iron and wood components. 
*   **Parchment:** Use irregular "torn" clipping masks for paper elements to avoid perfect rectangles. 
*   **Icons:** Should be encased in heavy #403a34 circles or squares that look like they were forged in a blacksmith's shop.
*   **Dividers:** Replace standard lines with "barbed wire" SVG patterns or rows of crude stitches.

## Components

### Buttons
Buttons should look like stamped metal plates or heavy leather patches.
*   **Primary:** Solid #a52a2a background, #f5f5dc text (Courier Prime). 1px border of #403a34.
*   **Secondary:** No background, #f5f5dc border, "stamped" text effect.
*   **Hover:** Color shifts to a darker, scorched variant of the base color.

### Cards (Wooden Planks)
The primary container for information.
*   **Visuals:** Use a dark wood grain texture (#25221e).
*   **Header:** A "nail" icon (small grey circle) in the top corners to simulate being pinned down.
*   **Edges:** Heavy 2px border of #403a34 (Rust).

### Parchment Overlays
Used for modals or critical lore entries.
*   **Visuals:** A #f5f5dc background with a rough, scanned paper texture.
*   **Edges:** Irregular, "burnt" or "torn" CSS masks.
*   **Detail:** Include a "Wax Seal" (#a52a2a circle with an embossed cross) in the bottom right corner to "validate" the content.

### Inputs & Checkboxes
*   **Inputs:** Recessed boxes that look carved into wood. Text appears in #f5f5dc.
*   **Checkboxes:** A crude "X" hand-drawn in red (#a52a2a) when selected.

### Lists
Lists should be separated by thin lines that look like suture stitches or rusted wire. Use Roman Numerals (I, II, III) for ordered lists to maintain the ecclesiastical feel.