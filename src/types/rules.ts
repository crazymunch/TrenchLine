export interface Statline {
  movement: string; // e.g. "6\"/Infantry"
  /**
   * The two halves of `movement`, already split by the pipeline.
   *
   * Carried separately because they are two facts and the card has to show
   * them as two: printing `6"/Infantry` whole into a stat cell sized for
   * `+3 Dice` overflowed it onto the value beside it on every roster card.
   * Optional — a warband saved before these existed has only the string.
   */
  movementInches?: number;
  movementType?: string; // 'Infantry' | 'Cavalry' | 'Flying' | …
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
  /**
   * The Variants — or the roster selections — whose reveal is this ability's
   * only route onto the entry (DA-01).
   *
   * Present only on an ability listed under `variantAbilities`, where it is the
   * label that makes the list mean anything: "Axe Mastery (Remnants of
   * Byzantium)" is a reason to pick a Variant, and "Axe Mastery" on its own is
   * the bug.
   */
  variantOnly?: string[];
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
  /**
   * The Variant rule that puts this on offer, where it is not this faction's
   * own Battlekit. The House of Wisdom's *Weapon Collections* and the Knights
   * of Avarice's *Corrupt Merchants* each let a Warband buy from a named
   * foreign Armoury; `factionId` then says whose table priced it, and this
   * says which sentence allows it. Absent for everything a Warband stocks in
   * its own right — absent is "mine", not "unknown".
   */
  grantedBy?: string;
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
  /**
   * The Variant rule that puts this on offer, where it is not this faction's
   * own Battlekit. The House of Wisdom's *Weapon Collections* and the Knights
   * of Avarice's *Corrupt Merchants* each let a Warband buy from a named
   * foreign Armoury; `factionId` then says whose table priced it, and this
   * says which sentence allows it. Absent for everything a Warband stocks in
   * its own right — absent is "mine", not "unknown".
   */
  grantedBy?: string;
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
  /**
   * The catalogue's own group path, verbatim — `Alchemical Formulae`, or
   * `Alchemical Formulae::Eye Options`. Optional because an item written by
   * hand or seeded in lore has no catalogue behind it, and absent must not be
   * mistaken for "not a Formula" by anything that can tell the difference.
   *
   * The importer read this to decide whether to keep the selection at all and
   * then discarded it, which left the unit card guessing from the name. See
   * `src/rules/formulae.ts`.
   */
  group?: string;
  keywords?: string[];
  description?: string;
  factionId?: string;
  allowedUnits?: string[];
  allowedFactions?: string[];
  /**
   * The Variant rule that puts this on offer, where it is not this faction's
   * own Battlekit. The House of Wisdom's *Weapon Collections* and the Knights
   * of Avarice's *Corrupt Merchants* each let a Warband buy from a named
   * foreign Armoury; `factionId` then says whose table priced it, and this
   * says which sentence allows it. Absent for everything a Warband stocks in
   * its own right — absent is "mine", not "unknown".
   */
  grantedBy?: string;
  isCustom?: boolean;
}

/** One piece of gear a model always has. See `UnitProfile.battlekit`. */
export interface ForcedBattlekit {
  id: string;
  linkId: string;
  name: string;
  quantity: number;
  keywords: string[];
  cost: { ducats: number; glory: number };
  profileId?: string;
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
   * Whether the model is ELITE, from the catalogue's role or the books' keyword.
   *
   * `category` is not a substitute. It says what a model is *on a roster*, and
   * `categoryOf` resolves Mercenary before Elite — so the Witchburner, filed
   * `Mercenary/Elite` and printing the literal ELITE Keyword, categorises as
   * `Mercenary`.
   *
   * The Trauma Step turns on exactly this word: a Troop rolls one D6 and dies
   * on a 1-2; an ELITE model rolls D66 on the Trauma Table, accrues Battle
   * Scars, and is the only kind of model that earns Experience. Reading the
   * category instead would offer an ELITE model a roll it can die on.
   *
   * Optional because a warband saved before this field existed has no answer
   * recorded, and `rules/trauma.ts` must be able to tell that from `false`.
   */
  elite?: boolean;
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
  /**
   * The entry's Battlekit sentence, verbatim, where the book states one as
   * prose — "The only Ranged Weapons they can have are Automatic Pistols and
   * Pistols". A legality rule nothing in either model can express, so it is
   * shown to the player rather than paraphrased into a constraint. See
   * `UnitProfile.battlekitNote` in types/catalogue.ts.
   */
  battlekitNote?: string;
  /**
   * Gear this Mercenary may buy, against the rule that otherwise forbids all
   * of it. See `UnitProfile.mercenaryMayBuy` in `types/catalogue.ts` for the
   * sources; `equipGate.ts` is the reader.
   */
  mercenaryMayBuy?: 'Melee'[];
  innateAbilities?: Ability[];
  /**
   * Abilities this entry carries that the Warband's Variant does not reveal,
   * each labelled with what would (DA-01).
   *
   * Not rules this model has — that is `innateAbilities`, and mixing the two is
   * the defect this pair exists to end: a standard New Antioch Shocktrooper's
   * card printed four Varangian Guard rules as its own. This is the other half
   * of the same fact, shown where a player is CHOOSING: the recruit sheet lists
   * them under the entry so that "Remnants of Byzantium turns this into a
   * Varangian Guard" is visible before the Variant is picked, rather than being
   * a discovery made afterwards.
   */
  variantAbilities?: Ability[];
  /**
   * Gear the model always has, from the catalogue's `min="1"` entryLinks.
   *
   * NOT a default loadout: the player cannot remove it and cannot buy a second
   * copy. The Warbands book states it as a Battlekit line — "A Combat Medic
   * always has Standard Armour, a Gas Mask, a Medi-kit, and a Misericordia" —
   * and the catalogue hides those Armoury rows from the model for that reason.
   * See `rules/battlekit.ts`.
   */
  battlekit?: ForcedBattlekit[];
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
