export interface Statline {
  movement: string; // e.g. "6\""
  ranged: string;   // e.g. "+1" or "-"
  melee: string;    // e.g. "+2"
  armour: string;   // e.g. "+1" or "0"
  keywords: string[];
}

export type UnitCategory = 'Leader' | 'Elite' | 'Trooper' | 'Mercenary';

export interface Ability {
  id: string;
  name: string;
  description: string;
}

export interface WeaponProfile {
  id: string;
  name: string;
  type: 'Melee' | 'Ranged' | 'Both';
  range: string; // e.g. "Melee" or "24\""
  modifiers: string; // e.g. "+1 Melee" or "-"
  damage: string; // e.g. "Standard" or "D3"
  keywords: string[];
  cost: number; // in Ducats
  description?: string;
  hands?: 1 | 2;
  isCustom?: boolean;
}

export interface ArmourProfile {
  id: string;
  name: string;
  armourModifier: string; // e.g. "+1 Armour" or "+2 Armour"
  cost: number;
  keywords: string[];
  description?: string;
  isCustom?: boolean;
}

export interface EquipmentItem {
  id: string;
  name: string;
  cost: number;
  effect: string;
  keywords: string[];
  isCustom?: boolean;
}

export interface UnitProfile {
  id: string;
  name: string;
  factionId: string;
  category: UnitCategory;
  baseCost: number; // in Ducats
  stats: Statline;
  maxCount?: number;
  innateAbilities: Ability[];
  defaultWeapons?: string[]; // weapon IDs
  defaultArmour?: string[]; // armour IDs
  allowedWeaponIds?: string[];
  allowedArmourIds?: string[];
  allowedEquipmentIds?: string[];
  lore?: string;
  isCustom?: boolean;
}

export interface Faction {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  specialRules: { name: string; description: string }[];
}

export interface RuleKeyword {
  name: string;
  summary: string;
  fullText: string;
  category: 'General' | 'Combat' | 'Weapon' | 'Condition';
}

export interface InjuryResult {
  roll: string; // e.g. "11-16", "21-25", etc.
  title: string;
  effect: string;
  statModifier?: Partial<Statline>;
  isDead?: boolean;
}

export interface Scenario {
  id: string;
  name: string;
  flavor: string;
  deployment: string;
  objectives: string[];
  specialRules: string[];
  victoryConditions: string;
}
