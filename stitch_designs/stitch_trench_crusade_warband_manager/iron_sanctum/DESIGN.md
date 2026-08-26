---
name: Iron Sanctum
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363941'
  surface-container-lowest: '#0b0e15'
  surface-container-low: '#191c23'
  surface-container: '#1d2027'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e0e2ec'
  on-surface-variant: '#d0c5af'
  inverse-surface: '#e0e2ec'
  inverse-on-surface: '#2d3038'
  outline: '#99907c'
  outline-variant: '#4d4635'
  surface-tint: '#e9c349'
  primary: '#f2ca50'
  on-primary: '#3c2f00'
  primary-container: '#d4af37'
  on-primary-container: '#554300'
  inverse-primary: '#735c00'
  secondary: '#ffb4a8'
  on-secondary: '#690000'
  secondary-container: '#920703'
  on-secondary-container: '#ff9a8a'
  tertiary: '#91dfae'
  on-tertiary: '#00391f'
  tertiary-container: '#76c394'
  on-tertiary-container: '#00502f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe088'
  primary-fixed-dim: '#e9c349'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#ffdad4'
  secondary-fixed-dim: '#ffb4a8'
  on-secondary-fixed: '#410000'
  on-secondary-fixed-variant: '#920703'
  tertiary-fixed: '#a5f4c1'
  tertiary-fixed-dim: '#89d7a6'
  on-tertiary-fixed: '#002110'
  on-tertiary-fixed-variant: '#005230'
  background: '#10131a'
  on-background: '#e0e2ec'
  surface-variant: '#32353c'
typography:
  headline-xl:
    fontFamily: Oswald
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: 0.05em
  headline-lg:
    fontFamily: Oswald
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Oswald
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  stats-lg:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.0'
  stats-sm:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.0'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.2'
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system embodies a "Grimdark Gothic WWI" aesthetic, merging the industrial grit of dieselpunk warfare with the ornate, oppressive atmosphere of ecclesiastical gothicism. The target audience seeks a tactical, immersive, and high-stakes environment characterized by technical precision and religious fervor.

The UI style is a hybrid of **Brutalism** and **Tactile Skeuomorphism**. It utilizes heavy borders, riveted containers, and weathered surfaces to simulate the feeling of a fortified bunker or an armored prayer book. Visuals are intentionally dense and authoritative, evoking a sense of dread, duty, and sanctity.

## Colors
The palette is rooted in a stygian dark mode to emphasize the "Grimdark" atmosphere. 
- **Sacred Gold (#D4AF37):** Used for divine intervention, primary actions, and high-tier navigation.
- **Blood Crimson (#8B0000):** Reserved for combat alerts, damage states, and sacrificial costs.
- **Sanctified Green (#4E9A6E):** Utilized for tactical data, healing, and "blessed" status effects.
- **Neutrals:** The background and surfaces are tiered deep charcoal and slate to provide high contrast against the vibrant primary accents.

## Typography
Typography is split between narrative authority and technical readout.
- **Headers (Oswald):** Used for titles and dramatic labels. Always bold and often uppercase to mimic propaganda posters or etched stone.
- **Body (Inter):** High-legibility sans-serif for long-form lore and descriptions.
- **Technical/Stats (JetBrains Mono):** Used for all numerical data, tactical coordinates, and equipment specifications to reinforce the "Dieselpunk" engineering aspect.

## Layout & Spacing
This design system uses a **Fixed Grid** model. Content is contained within heavy, structural modules.
- **Grid:** A 12-column grid for desktop with wide 24px gutters to allow for thick "riveted" border treatments between sections.
- **Rhythm:** A 4px baseline grid ensures technical alignment of stats and monospaced text.
- **Responsiveness:** On mobile, margins shrink to 16px, and complex "command-center" sidebars collapse into a bottom-anchored tactical tray.

## Elevation & Depth
Depth is not achieved through soft shadows, but through **Tonal Layering and Bevels**.
- **Inner Bevels:** All containers use a 1px solid highlight on the top/left and a 1px dark stroke on the bottom/right to create an "etched" or "stamped" metal appearance.
- **Rivets:** Corner junctions should feature 4px circular "rivet" assets to reinforce the industrial construction.
- **Sacred Glow:** Only the "Sacred Gold" elements may use a diffused outer glow (bloom) to signify divinity or high importance against the dark background.

## Shapes
The shape language is strictly **Sharp (0px)**. Curvature is seen as a weakness of form.
- **Chisels:** Buttons and cards may use 45-degree angled corners (dog-ears) instead of rounding to evoke military dog tags or gothic architecture.
- **Thickness:** Borders should be a minimum of 2px to feel substantial and industrial.

## Components
- **Buttons:** High-contrast blocks. Default state is #161920 with a #323846 border. Hover state switches to a Sacred Gold border. Active state uses a Blood Crimson inner fill for "combat" actions.
- **Tactical Counters:** Small JetBrains Mono readouts housed in recessed boxes (#0C0E12 fill).
- **Cards:** Riveted containers with a #20242E background. Headers on cards should be separated by a heavy horizontal rule with a Gothic crest icon in the center.
- **Input Fields:** Styled as "Field Reports"—monospaced text with a blinking underscore cursor and a subtle "scanline" texture overlay.
- **Chips/Status Tags:** Use a "Sanctified Green" stroke for positive status and "Blood Crimson" for negative. Use heavy, all-caps Oswald font at small sizes.
- **Gothic Crests:** Ornamental vector separators used to divide major content sections, acting as both visual flair and structural grounding.