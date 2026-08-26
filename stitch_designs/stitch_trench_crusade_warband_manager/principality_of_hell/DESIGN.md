---
name: Principality of Hell
colors:
  surface: '#210e0b'
  surface-dim: '#210e0b'
  surface-bright: '#4c332f'
  surface-container-lowest: '#1b0907'
  surface-container-low: '#2b1613'
  surface-container: '#2f1a17'
  surface-container-high: '#3b2420'
  surface-container-highest: '#472f2b'
  on-surface: '#ffdad4'
  on-surface-variant: '#ebbbb4'
  inverse-surface: '#ffdad4'
  inverse-on-surface: '#422a27'
  outline: '#b18780'
  outline-variant: '#603e39'
  surface-tint: '#ffb4a8'
  primary: '#ffb4a8'
  on-primary: '#690100'
  primary-container: '#ff5540'
  on-primary-container: '#5c0000'
  inverse-primary: '#c00100'
  secondary: '#ddb7ff'
  on-secondary: '#4a0080'
  secondary-container: '#622599'
  on-secondary-container: '#d1a1ff'
  tertiary: '#acc7ff'
  on-tertiary: '#002f67'
  tertiary-container: '#488fff'
  on-tertiary-container: '#00285b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a8'
  on-primary-fixed: '#410000'
  on-primary-fixed-variant: '#930100'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0050'
  on-secondary-fixed-variant: '#622599'
  tertiary-fixed: '#d7e2ff'
  tertiary-fixed-dim: '#acc7ff'
  on-tertiary-fixed: '#001a40'
  on-tertiary-fixed-variant: '#004491'
  background: '#210e0b'
  on-background: '#ffdad4'
  surface-variant: '#472f2b'
typography:
  headline-lg:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: 0.05em
  headline-sm:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0.1em
  body-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0px
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0px
  label-caps:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.2em
  headline-lg-mobile:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
spacing:
  unit: 4px
  gutter: 16px
  margin: 24px
  container-max: 1280px
---

## Brand & Style
This design system embodies the terrifying intersection of infernal divinity and bureaucratic cruelty. The aesthetic is rooted in **Industrial-Gothic Brutalism**, combining the cold, calculated logic of a multi-planar administration with the raw, visceral agony of damnation. 

The UI should evoke the feeling of interacting with a soul-bound machine: heavy, obsidian-slick surfaces, razor-sharp edges, and glowing conduits that pulse with the life force of the condemned. It is a visual language of absolute authority, eternal debt, and supernatural machinery. High-contrast interfaces against an abyssal backdrop create a sense of focused, predatory menace.

## Colors
The palette is forged in the deepest pits of the Principality. 
- **The Abyss (#050000):** Used for the primary background, representing the infinite void.
- **Obsidian Glass (#120a0a):** Used for containers and surface layers. It should have a high-gloss finish with subtle, jagged reflections.
- **Heated Iron (#301010):** Reserved for structural borders and separators, suggesting metal on the verge of melting.
- **Agony Red (#ff0000):** The primary interactive color. It must glow. Use it for critical actions, headers, and pulsing "soul-energy" indicators.
- **Soul-Fire (#4b0082):** A secondary accent used for esoteric data, rank indicators, and "divine" infernal elements. It provides a cold, eerie contrast to the heat of the red.

## Typography
The typography contrasts ancient authority with mechanical precision.
- **Headlines:** Use a sharp, high-contrast serif (represented here by Newsreader) to mimic the "Cinzel Decorative" feel. These should feel like inscriptions carved into stone with a hot blade.
- **Data & Body:** Use **JetBrains Mono** for all technical descriptions and lore text. It should always be rendered in a faint Agony Red or Soul-Fire tint to simulate a glowing HUD.
- **Labels:** **Space Mono** in all-caps serves as the bureaucratic stamp, used for classification, ranks, and unit designations. 
- **Styling:** All text should have a subtle 2px red outer glow (`text-shadow`) to simulate bioluminescent infernal energy.

## Layout & Spacing
The layout follows a **Rigid Grid** system, reflecting the uncompromising bureaucracy of Hell. 
- Use a 12-column grid for desktop with 0px gutters between connected "obsidian slabs" but 16px gutters between distinct modules.
- Elements should be "bolted" to the grid. Use 4px increments for all internal padding.
- **Razor-wire Separators:** Replace standard horizontal rules with a custom graphic or 1px dashed line that mimics barbed wire, colored in #301010.
- Verticality is key; layouts should feel like towering monoliths.

## Elevation & Depth
Depth is not achieved through soft shadows, but through **Tonal Stacking and Inner Glows**.
- **Surfaces:** Use #120a0a for panels. Instead of a drop shadow, use a 1px inner border of #301010.
- **Cracked Obsidian:** High-elevation elements (like active cards) should feature a subtle "cracked" texture overlay with Agony Red light bleeding through the fissures.
- **Soul Energy Flows:** Use linear gradients (transparent to #ff000033 to transparent) that animate slowly across the background or along borders to represent the movement of harvested souls through the machine.

## Shapes
The Principality does not tolerate softness. 
- All corners are **Sharp (0px)**. 
- Use clipped corners (45-degree angles) on buttons and container headers to reinforce the "machined metal" and "carved stone" aesthetic.
- Intersecting lines should feel like blades meeting; overlap borders slightly to create "crosshair" effects at corners.

## Components
- **Buttons:** Sharp-edged boxes with a #301010 border. On hover, the background fills with #ff0000 and the text color switches to #050000. Use a pulsing "glow" animation for primary actions.
- **Input Fields:** Single bottom border (1px) in #301010. Active states trigger a Soul-Fire (#4b0082) underline and a red "rune" to appear at the end of the field.
- **Cards:** Obsidian slabs with a 1px border. Headers should be separated by razor-wire graphics. The body text should use the red digital monospace.
- **Chips/Badges:** Small, angular hex-shapes or rectangles. High-status badges use the Soul-Fire palette; low-status or "debt" badges use Agony Red.
- **Runes:** Decorative icons should be SVG-based glowing runes. They should pulse at irregular intervals (3s to 7s) to feel "alive" and unstable.
- **Progress Bars:** Segmented bars where each segment is a soul-trap. Filled segments glow Agony Red; empty segments are #120a0a with a faint #301010 outline.