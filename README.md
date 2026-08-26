# TrenchLine

> **A Tactical Warband Builder, Tabletop Combat Companion, and Multi-Player Campaign Manager for Trench Crusade.**

![TrenchLine Banner](public/assets/stitch/campaign_hub_map.png)

## ⚔️ Core Features

- **Warband Roster Builder:** Full support for all official factions (New Antioch, Trench Pilgrims, Iron Sultanate, Heretic Legion, Black Grail, Court of the Seven-Headed Serpent, Mercenaries), dynamic Ducat point calculation, equipment slots, and printable military dossiers.
- **Tabletop Play Mode (Tactical HUD):** Live match companion with one-tap Wound steppers, Blood Token pool, Active / Downed / Out of Action status chips, instant rule keyword popovers, and an integrated D6/2D6/D66 action test roller.
- **Multi-Player Campaign Hub:** Live leaderboard (Glory, Warband Rating, Win/Loss records, Treasury), shared campaign invite codes, narrative chronicle feed, and an interactive sector trench map with node claiming and territorial perks.
- **Official 4-Step Post-Battle Sequence Wizard:** Automated D66 Casualty & Injury rolls, survival XP and stat increase selectors (+1 Melee, +1 Ranged, +1 Armour, +1" Move), and D66 No Man's Land Exploration rolls.
- **In-App Rule Customizer & GitHub 3-Way Diff Resolver:** Tweak unit stats and Ducat costs in-app, parse BattleScribe `.cat`/`.gst` XML, and perform side-by-side diff resolution against upstream GitHub commits (`Fawkstrot11/TrenchCrusade`).
- **Grimdark Dark Mode Theme:** Custom UI tokens inspired by dieselpunk gothic trench warfare, with faction-specific themes exported from Stitch.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Run

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build for production
npm run build
```

---

## 🏗️ Architecture & Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS + Custom Grimdark Tokens (Void Black `#0C0E12`, Gunmetal Slate `#161920`, Sacred Gold `#D4AF37`, Blood Crimson `#8B0000`)
- **State Management:** Zustand with local storage persistence
- **Data Parsing:** `fast-xml-parser` for BattleScribe `.cat` and `.gst` XML
- **Diff Engine:** 3-way conflict resolver for local overrides vs GitHub repository updates

---

## 📜 License
Personal and community tool for the *Trench Crusade* wargame.
