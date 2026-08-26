# Trench Crusade Digital Suite: Antigravity Export Dossier

## Project Overview
This document serves as the technical handoff for the Trench Crusade campaign management suite. It includes the design tokens, shared component logic, and high-fidelity screen specifications for the five core factions: New Antioch, Heretic Legion, Sultanate of the Iron Wall, Principality of Hell, and the Trench Pilgrims.

---

## 1. Design Systems & Visual Identities

### Iron Sanctum (New Antioch / Core)
- **Primary Color:** #D4AF37 (Sacred Gold)
- **Background:** #0C0E12 (Void Black)
- **Typography:** OSWALD (Headers), JetBrains Mono (Stats), Inter (Body)
- **Aesthetic:** Dieselpunk, riveted iron, industrial gothic.

### Heretic Legion
- **Primary Color:** #FF4500 (Ember Orange)
- **Background:** #131313 (Charred Earth)
- **Typography:** BRICOLAGE GROTESQUE (Aggressive, Heavy)
- **Aesthetic:** Oxidized, visceral, chaotic.

### Sultanate of the Iron Wall
- **Primary Color:** #008080 (Lapis Teal)
- **Background:** #0F1419 (Fortified Slate)
- **Typography:** PLAYFAIR DISPLAY (Elegant, Sturdy)
- **Aesthetic:** Fortified, opulent, geometric.

### Principality of Hell
- **Primary Color:** #FF0000 (Soul Red)
- **Background:** #210E0B (Infernal Obsidian)
- **Typography:** NEWSREADER (Bureaucratic, Cold)
- **Aesthetic:** Infernal bureaucracy, sharp edges, pulsing energy.

### Penitent Trench (Trench Pilgrims)
- **Primary Color:** #F5F5DC (Parchment Bone)
- **Background:** #151311 (Trench Mud)
- **Typography:** EB GARAMOND (Sacred, Archaic)
- **Aesthetic:** Fanatical, lo-fi, handwritten.

---

## 2. Core Functional Components

### A. Warband Roster Builder (Desktop)
- **Features:** Ducat budget tracking, stat tables, armament management, injury tracking.
- **Data Points:** MOV, RNG, MELEE, ARMOUR, Glory, Treasury.

### B. Combat Companion HUD (Mobile)
- **Features:** Round counters, wound/blood token steppers, activation status toggles.
- **Interactions:** Touch-optimized for tabletop play.

### C. Post-Battle Wizard
- **Workflow:** 1. Outcome -> 2. Casualties -> 3. Advancements -> 4. Loot.
- **Logic:** Integrated D66 roller for injuries and exploration.

### D. Campaign Hub & Map
- **Features:** Global leaderboard, multiplayer standings, interactive sector nodes.
- **Map Nodes:** State-based perks (e.g., +5 Ducats/turn).

---

## 3. Deployment Artifacts

| Screen Title | Placeholder ID | Device |
|--------------|----------------|--------|
| Warband Roster Builder | {{DATA:SCREEN:SCREEN_19}} | Desktop |
| Combat Companion HUD | {{DATA:SCREEN:SCREEN_18}} | Mobile |
| Campaign Hub & Map | {{DATA:SCREEN:SCREEN_17}} | Desktop |
| Post-Battle Wizard | {{DATA:SCREEN:SCREEN_16}} | Desktop |
| Customizer & Sync Resolver | {{DATA:SCREEN:SCREEN_14}} | Desktop |
| Heretic Legion Roster | {{DATA:SCREEN:SCREEN_12}} | Desktop |
| Sultanate Roster | {{DATA:SCREEN:SCREEN_10}} | Desktop |
| Principality of Hell Roster | {{DATA:SCREEN:SCREEN_8}} | Desktop |
| Trench Pilgrim Roster | {{DATA:SCREEN:SCREEN_6}} | Desktop |

---

## 4. Visual Assets
- **New Antioch Sigil:** {{DATA:IMAGE:IMAGE_20}}

---

**End of Dossier**
