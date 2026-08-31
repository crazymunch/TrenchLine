export interface Statline {
  movement: string; // e.g. "6\""
  ranged: string;   // e.g. "+1" or "-"
  melee: string;    // e.g. "+2"
  armour: string;   // e.g. "+1" or "0"
  keywords?: string[];
  baseSize?: string;
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
  damage?: string; // e.g. "Standard" or "D3"
  keywords: string[];
  cost: number; // in Ducats
  /**
   * Glory, where the entry is priced in it. Trench Crusade has two currencies
   * and this format modelled one, so a Mercenary costing 0 Ducats and 5 Glory
   * rendered as "0 D" — free, and hireable without limit. Optional because most
   * entries have no Glory component, and absent is not zero.
   */
  gloryCost?: number;
  category?: string;
  description?: string;
  hands?: 1 | 2;
  factionId?: string;
  allowedUnits?: string[];
  allowedFactions?: string[];
  isCustom?: boolean;
}

export interface ArmourProfile {
  id: string;
  name: string;
  armourModifier?: string; // e.g. "-1 Injury Modifier"
  modifier?: string;
  category?: string;
  cost: number;
  /**
   * Glory, where the entry is priced in it. Trench Crusade has two currencies
   * and this format modelled one, so a Mercenary costing 0 Ducats and 5 Glory
   * rendered as "0 D" — free, and hireable without limit. Optional because most
   * entries have no Glory component, and absent is not zero.
   */
  gloryCost?: number;
  keywords?: string[];
  description?: string;
  factionId?: string;
  allowedUnits?: string[];
  allowedFactions?: string[];
  isCustom?: boolean;
}

export interface EquipmentItem {
  id: string;
  name: string;
  cost: number;
  /**
   * Glory, where the entry is priced in it. Trench Crusade has two currencies
   * and this format modelled one, so a Mercenary costing 0 Ducats and 5 Glory
   * rendered as "0 D" — free, and hireable without limit. Optional because most
   * entries have no Glory component, and absent is not zero.
   */
  gloryCost?: number;
  effect: string;
  category?: string;
  keywords?: string[];
  description?: string;
  factionId?: string;
  allowedUnits?: string[];
  allowedFactions?: string[];
  isCustom?: boolean;
}

export interface UnitProfile {
  id: string;
  name: string;
  factionId: string;
  category: UnitCategory;
  baseCost: number; // in Ducats
  /**
   * Glory, where the entry is priced in it. Trench Crusade has two currencies
   * and this format modelled one, so a Mercenary costing 0 Ducats and 5 Glory
   * rendered as "0 D" — free, and hireable without limit. Optional because most
   * entries have no Glory component, and absent is not zero.
   */
  gloryCost?: number;
  stats: Statline;
  maxCount?: number;
  /**
   * Whether this entry may be the Warband's Leader.
   *
   * `category` cannot answer this. It says what a model *is on a roster* —
   * and 'Leader' is set there by nomination, so once a Lieutenant is
   * recruited its category is 'Leader' and every other Lieutenant profile
   * still reads 'Elite'. This is the catalogue's `Leader` role, carried
   * through so the builder can nominate without guessing.
   */
  canLead?: boolean;
  /**
   * Content the catalogues mark as third-party: condoned by Factory Fortress
   * but written by other people, with, in the source's own words, "no
   * assurances ... to balance or consistency with rules". Hidden unless the
   * Warband opts in — see `rules/thirdParty.ts`.
   */
  thirdParty?: boolean;
  /**
   * Warband Variants this model is exclusive to — it exists only inside one of
   * them. Absent means it is offered as normal. See `rules/variantLocks.ts`.
   */
  requiresVariant?: { id: string; name: string }[];
  /** The source's own disclaimer, shown rather than paraphrased. */
  thirdPartyNotice?: string;
  innateAbilities?: Ability[];
  defaultWeapons?: string[]; // weapon IDs
  defaultArmour?: string[]; // armour IDs
  allowedFactions?: string[];
  lore?: string;
  isCustom?: boolean;
}

export interface FactionSpecialRule {
  name: string;
  description: string;
}

export interface Faction {
  id: string;
  name: string;
  tagline?: string;
  theme?: string;
  description: string;
  icon: string;
  color: string;
  specialRules?: FactionSpecialRule[];
  rules?: FactionSpecialRule[];
}

export interface RuleKeyword {
  id?: string;
  name: string;
  type?: string;
  category?: string;
  summary?: string;
  fullText?: string;
  description?: string;
}

export interface InjuryResult {
  roll: string; // e.g. "11", "26", "41-63"
  title: string;
  name?: string;
  effect?: string;
  description?: string;
  statModifier?: Partial<Statline>;
  isDead?: boolean;
}

export interface ExplorationResult {
  roll: string;
  title: string;
  reward: string;
  description: string;
}

export interface TraumaTableEntry {
  roll: string;
  title: string;
  description: string;
  isDead: boolean;
}

export interface ExplorationTableEntry {
  roll: string;
  title: string;
  description: string;
  reward?: string;
}

export interface SkillEntry {
  name: string;
  description: string;
}

export type RulesetVersion = '1.0' | '1.0.2' | '1.0.2TD';

export interface Scenario {
  id: string;
  name: string;
  number?: number;
  roman?: string;
  slug?: string;
  tagline?: string;
  mapImage?: string;
  tableSize?: string;
  forces?: string;
  battlefield?: string;
  deployment?: string;
  gameLength?: string;
  victoryConditions?: string;
  gloriousDeeds?: string;
  fullRulesMarkdown?: string;
  
  // All Out War & Multiplayer expansions
  isAllOutWar?: boolean;
  packName?: string;
  minPlayers?: number;
  maxPlayers?: number;
  isBattleTeam?: boolean;
  hasBetrayalCards?: boolean;
  hasSupplyCrates?: boolean;

  // Legacy / convenience fields
  type?: string;
  flavor?: string;
  objective?: string;
  specialRules?: string[];
  rewards?: string[];
  objectives?: string[];
}
