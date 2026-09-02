/**
 * The generated-data model.
 *
 * This is what `npm run rules:build` emits. It replaces the hand-written model
 * in `types/rules.ts`, which cannot express Glory costs, recruitment limits,
 * base sizes, movement types or per-model options — see docs/AUDIT.md §1.6.
 *
 * `rules.ts` is deliberately left in place: the app still consumes it, and
 * migrating the UI onto this model is Phase 2 (the rules engine). Keeping the
 * two side by side lets Phase 1 land and be verified on its own.
 *
 * Nothing here is written by hand. See docs/RULESET-MODEL.md.
 */

/* ------------------------------------------------------------------ costs */

/** Trench Crusade has two currencies, and the app previously modelled one. */
export interface Cost {
  ducats: number;
  glory: number;
}

export const ZERO_COST: Cost = { ducats: 0, glory: 0 };

export const addCost = (a: Cost, b: Cost): Cost => ({
  ducats: a.ducats + b.ducats,
  glory: a.glory + b.glory,
});

/* -------------------------------------------------------------- statlines */

export interface Statline {
  /** Verbatim, e.g. `6"/Infantry`. The type matters to terrain and FLYING. */
  movement: string;
  /** Derived from `movement` for range maths, e.g. 6. */
  movementInches: number | null;
  /** Derived from `movement`, e.g. 'Infantry' | 'Flying' | 'Cavalry'. */
  movementType: string | null;
  /** e.g. '+2 DICE', '-1 DICE', '-' (no attack of this kind). */
  ranged: string;
  melee: string;
  /** e.g. '0', '-1'. Not a dice modifier. */
  armour: string;
  /** e.g. '32mm', '30x60mm'. Load-bearing: several rules branch on base size. */
  base: string;
}

/* ------------------------------------------------------------ constraints */

export type ConstraintType = 'min' | 'max';

/**
 * A recruitment or wargear limit. Mirrors the BattleScribe shape, which is
 * also how the rulebook states them ("0-2 Sniper Priests", "Limit: 2").
 */
export interface Constraint {
  type: ConstraintType;
  value: number;
  /** 'roster' = across the whole warband; 'parent' = within its container. */
  scope: 'roster' | 'parent' | string;
  /** Whether nested selections count toward the limit. */
  includeChildSelections: boolean;
  /** Free text when the source states a condition we do not model yet. */
  condition?: string;
}

/* ---------------------------------------------------------------- options */

/**
 * A purchasable thing attached to one model: a Strain, a Vile Corpus, a Goetic
 * Power, a Glory Item, a Takwin upgrade, a named variant of an entry.
 *
 * `modifies` reuses LayerOp on purpose. "A model with the Hellfly Host Strain
 * replaces their Movement with 6"/Flying and gains FLYING" is the same kind of
 * operation as an errata change — just scoped to one model at roster-build time
 * rather than to the dataset at build time. One engine, two uses.
 */
export interface UnitOption {
  id: string;
  name: string;
  /**
   * The catalogue's own group name — `Strains`, `Alchemical Formulae`,
   * `Goetic Power`, `Sagas`, `Arts of Assassination`. Read from the source
   * rather than mapped onto a fixed enum: the sets differ per faction and a
   * new one arrives with every release, so a closed list would silently drop
   * whatever it had not heard of.
   */
  group: string;
  cost: Cost;
  constraints: Constraint[];
  /** Rules text as published. */
  description: string;
  /** The profile the rules text came from, used to tell an option from gear. */
  profileId?: string;
  /** Conditional rules attached to the option itself. */
  modifiers?: Modifier[];
}

/* ----------------------------------------------------------------- rules */

export interface Ability {
  id: string;
  name: string;
  description: string;
}

export interface Keyword {
  name: string;
  /** 'Effect' | 'Tag' | 'Keyword' as the sources classify them. */
  type?: string;
  description?: string;
}

/* -------------------------------------------------------------- modifiers */

/**
 * A conditional rule, read verbatim out of the BattleScribe catalogues.
 *
 * This is how the catalogues express everything that depends on a choice: the
 * House of Wisdom renaming an Azeb to a Kavass, Armour derived from the armour
 * you equipped, an option that adds Ducats. There are ~1,860 of them and they
 * are the machine-readable form of rules the books state only as prose.
 *
 * Evaluated by `src/rules/modifiers.ts` against a roster selection.
 */
export interface Modifier {
  /** BattleScribe's verbs. `set` is by far the most common. */
  op: 'set' | 'increment' | 'decrement' | 'add' | 'remove'
    | 'append' | 'prepend' | 'replace' | 'set-primary' | 'unset-primary';
  /**
   * Where it writes: a path on this entity ('stats.armour', 'cost.ducats',
   * 'name', 'keywords'), or 'hidden' / 'category' / 'error', which gate
   * availability rather than change a value.
   */
  field: string;
  value: string;
  /** Set only when the source field id could not be resolved to a name. */
  rawField?: string;
  /** 'entry', or 'profile:<name>' when it hung off a profile. */
  origin: string;
  /** Separator for append/prepend. Usually U+00A0, a non-breaking space. */
  join?: string;
  /** The modifier's own scope, e.g. 'model'. Distinct from a condition's. */
  scope?: string;
  /** Which constraint bound a `constraint:` modifier moves. */
  constraintBound?: 'min' | 'max';
  /** Absent means unconditional. */
  when?: Condition;
  /** The catalogue author's own label for the rule, e.g. 'armour adjustments'. */
  comment?: string;
}

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | ConditionLeaf;

export interface ConditionLeaf {
  /** 'atLeast' | 'atMost' | 'equalTo' | 'instanceOf' … */
  type: string;
  value: string;
  /** Usually 'selections'. */
  field: string;
  /** 'self' | 'parent' | 'roster' | 'force' | an entry id. */
  scope: string;
  /** The entry being counted. */
  childId?: string;
  /** That entry's name, resolved at build time so the rule is readable. */
  childName?: string;
  includeChildSelections?: boolean;
}

/* --------------------------------------------------------------- entities */

export interface WeaponProfile {
  id: string;
  /** The containing selectionEntry's id — what rosters select. */
  entryId?: string;
  name: string;
  /** '1-Handed' | '2-Handed' | 'Equipment' | 'Special' … */
  type: string;
  /** 'Melee', '24"', 'Melee/16"' … */
  range: string;
  keywords: string[];
  rules?: string;
  cost: Cost;
  constraints: Constraint[];
  /**
   * The union of every faction's armoury restrictions on this weapon — a quick
   * "restricted somewhere" signal only. What actually governs a warband is its
   * own faction's armoury row (`src/rules/armoury.ts`), because the same weapon
   * is restricted differently by different factions.
   */
  restrictions: string[];
  /** Conditional rules from the catalogue. See `Modifier`. */
  modifiers: Modifier[];
  factionId?: string;
  /** See `UnitProfile.hiddenByDefault`. */
  hiddenByDefault?: boolean;
  /**
   * Names of the models or options that reveal this entry — the catalogue's
   * own answer to an Armoury row's "X only" shorthand. See rules/restrictions.
   */
  unlockedBy?: string[];
}

/** One piece of gear a model always has. See `UnitProfile.battlekit`. */
export interface ForcedBattlekit {
  /** The gear entry's id, shared with the Armoury row that also stocks it. */
  id: string;
  /** The link on the model, which is what a roster selection addresses. */
  linkId: string;
  name: string;
  /** How many the model carries — 1 for everything the catalogues force today. */
  quantity: number;
  /** Keywords the gear grants the model: NEGATE GAS, NEGATE SHRAPNEL. */
  keywords: string[];
  /**
   * Almost always zero. The catalogue prices the model to include the kit, so
   * a non-zero cost here is the model's, not an extra the player chose.
   */
  cost: Cost;
  profileId?: string;
}

export interface UnitProfile {
  id: string;
  /** The containing selectionEntry's id — what roster exports and modifier
   *  conditions address. Distinct from `id`, which is the profile's own. */
  entryId?: string;
  name: string;
  factionId: string;
  /** From categoryLinks: 'Elite' | 'Troop' | 'Mercenary' … */
  roles: string[];
  stats: Statline;
  cost: Cost;
  /** Recruitment limits: "1 Lieutenant" -> min 1 max 1; "0-2" -> min 0 max 2. */
  min: number | null;
  max: number | null;
  keywords: string[];
  abilities: Ability[];
  options: UnitOption[];
  /**
   * Gear the model always has, from the catalogue's `min="1"` entryLinks.
   *
   * The Warbands book states it as a Battlekit line — "A Combat Medic always
   * has Standard Armour, a Gas Mask, a Medi-kit, and a Misericordia". The
   * parser used to drop those links, so the model carried neither the gear nor
   * the keywords it grants (no NEGATE GAS on a model wearing a gas mask), and
   * the player could buy a second Gas Mask for 5 Ducats it should not cost.
   */
  battlekit: ForcedBattlekit[];
  constraints: Constraint[];
  /** Conditional rules from the catalogue. See `Modifier`. */
  modifiers: Modifier[];

  /**
   * Which Warbands may hire this entry, for a MERCENARY.
   *
   * Catalogue faction names, as printed. `undefined` means unrestricted — any
   * Warband — which is a real answer for a few (the Scripture Guardian) and
   * must not be confused with "we do not know".
   *
   * It exists because the recruit list was granting every Mercenary to every
   * faction: a Court of the Seven-Headed Serpent Warband was offered the
   * Mendelist Ammo Monk and the Observer, which are NEW ANTIOCH and PILGRIM
   * only. The catalogues do carry host restrictions, in `modifiers`, but
   * unevenly — several Mercenaries have none and one is keyed to an injury —
   * so the Trench Dispatch's recruitment sentences are the source, quoted per
   * op in `dispatch-01.layer.json`.
   */
  allowedFactions?: string[];

  lore?: string;
  /**
   * The catalogue entry is `hidden="true"`: off the list until a modifier
   * reveals it. See `rules/variantLocks.ts` — a variant's `set hidden false`
   * means "this is what unlocks the model" on a hidden entry and "undo another
   * variant's ban" on a visible one.
   */
  hiddenByDefault?: boolean;
}

export interface FactionSpecialRule {
  name: string;
  description: string;
}

/** Papal States Intervention Force, House of Wisdom, Trench Ghosts, … */
export interface WarbandVariant {
  id: string;
  /** The catalogue entry a roster selects to take this variant. */
  entryId?: string;
  factionId: string;
  name: string;
  /** Which sources carry it: 'catalogue', 'rulebook', or both. */
  sources?: string[];
  /**
   * Unofficial: condoned by Factory Fortress but written by other people. The
   * catalogues hold these in a `Third Party` selectionEntryGroup, and the units
   * they unlock are hidden until the variant is taken. See rules/thirdParty.ts.
   */
  thirdParty?: boolean;
  lore?: string;
  specialRules: FactionSpecialRule[];
  /** Papal States starts on a different budget, for example. */
  budget?: Partial<Cost>;
  /** Applied to the roster's view of the dataset, not to the dataset. */
  ops: LayerOp[];
}

export interface Faction {
  id: string;
  name: string;
  specialRules: FactionSpecialRule[];
  /**
   * True when the book states this faction has no special rules — distinct from
   * an empty `specialRules`, which would also mean "we failed to find any".
   */
  noSpecialRules?: boolean;
  /** The published starting budget, where the book gives one. */
  budget?: Partial<Cost>;
  variants: WarbandVariant[];
  /** Presentation only; never rules. */
  color?: string;
  icon?: string;
  description?: string;
}

/* ------------------------------------------------------------- layer ops */

export type Ref = { kind: 'unit' | 'weapon' | 'faction' | 'option' | 'keyword'; id: string };

export type LayerOp =
  | { op: 'set'; target: Ref; field: string; value: unknown }
  | { op: 'replace'; target: Ref; entity: unknown }
  | { op: 'add'; collection: 'units' | 'weapons' | 'factions' | 'keywords'; entity: unknown }
  | { op: 'remove'; target: Ref }
  | { op: 'addKeyword'; target: Ref; keyword: string }
  | { op: 'setKeywords'; target: Ref; keywords: string[] }
  | { op: 'addAbility'; target: Ref; ability: Ability }
  | { op: 'replaceAbility'; target: Ref; name: string; ability: Ability }
  | { op: 'setCost'; target: Ref; currency: keyof Cost; value: number; scope?: Ref[] };

export interface Layer {
  id: string;
  name: string;
  /** Where the ops were transcribed from. */
  sourceRef: string;
  publishedAt?: string;
  status: 'official' | 'public-beta' | 'community' | 'speculative';
  ops: LayerOp[];
}

/* ------------------------------------------------------------- provenance */

/**
 * Where a single field's value came from. A field with no provenance entry
 * fails the build — that is the whole point of the pipeline.
 */
export interface FieldProvenance {
  /** 'base' for the catalogues, otherwise the layer id. */
  layer: string;
  /** e.g. 'battlescribe:Iron Sultanate.cat@1b463a8'. */
  source: string;
  /** Set once a cross-check confirms the value, e.g. 'rulebook:warbands'. */
  verified?: string;
}

export type ProvenanceMap = Record<string, Record<string, FieldProvenance>>;

/* ---------------------------------------------------------------- ruleset */

export interface Ruleset {
  id: string;
  name: string;
  description: string;
  base: { source: 'battlescribe'; repo: string; commit: string };
  /** Applied in order. */
  layers: string[];
  includeBeta: boolean;
  isDefault?: boolean;
}

/* ------------------------------------------------------------- the bundle */

/** One priced offer of one piece of wargear in one faction's Armoury Table. */
export interface ArmouryRow {
  name: string;
  /** Null where the rulebook lists Battlekit the catalogues do not carry. */
  weaponId: string | null;
  /** 'Ranged Weapons' | 'Melee Weapons' | 'Grenades' | 'Armour' | 'Equipment' */
  section: string;
  cost: Cost;
  restrictions: string[];
}

/**
 * A faction's Armoury Table: the pricing and legality authority for wargear.
 *
 * Pricing is per faction — an Automatic Rifle is 40 Ducats in one armoury and
 * 2 Glory in another — so this cannot collapse into `WeaponProfile.cost`.
 */
export interface Armoury {
  factionId: string;
  faction: string;
  rows: ArmouryRow[];
}

/**
 * One entry of the rulebook's Battlekit chapter.
 *
 * Deliberately carries no cost. Wargear is priced **per faction** — the same
 * Automatic Rifle is 40 Ducats in one Armoury and 2 Glory in another — so a
 * price on a single shared record cannot be right for more than one faction at
 * a time. `Armoury` prices it; this carries what the Armoury Table does not
 * print: what the thing is, and the special rules under its profile.
 */
export interface BattlekitEntry {
  name: string;
  /** 'Ranged Weapons' | 'Melee Weapons' | 'Grenades' | 'Shields' | 'Armour' | 'Equipment' */
  section: string;
  /** As printed: '1-Handed' | '2-Handed' | 'Grenade' | 'Armour' | 'Shield' | 'Equipment' */
  type: string;
  /** '24"', 'Melee', '12"/Melee', '-'. Verbatim, including the book's quote marks. */
  range: string;
  keywords: string[];
  /** The published description, unwrapped onto one line. */
  description: string;
  /** Unbulleted rules text printed under the profile. Only the Field Shrine has any. */
  note: string;
  /** The `**` special rules printed under the profile, each unwrapped. */
  rules: string[];
}

/**
 * One scenario, as the rulebook prints it.
 *
 * `sections` is an ordered list rather than a fixed set of fields because the
 * six core headings are not all a scenario has: Dragon Hunt adds THE DRAGON,
 * Armoured Train adds TRAIN WAGONS, Don't Breathe adds ICHOR PIT MARKERS. Those
 * are the rules that make the scenario itself, and a fixed shape would drop
 * them.
 */
export interface ScenarioSection {
  /** The heading exactly as printed: 'GAME LENGTH', 'THE DRAGON'. */
  heading: string;
  /** The body as markdown — `**Sub-heading**` and `- bullet`. */
  body: string;
}

export interface ScenarioEntry {
  /** 1-12. */
  number: number;
  /** The numeral the book prints: 'I' … 'XII'. */
  roman: string;
  name: string;
  /** Derived from the name, and checked against `public/maps/` at build time. */
  slug: string;
  tagline: string;
  sections: ScenarioSection[];
  /** The deployment map, verified to exist when the dataset was built. */
  mapImage: string;
}

export type ExplorationTableName = 'common' | 'rare' | 'legendary';

/**
 * One row of an Exploration Location table.
 *
 * `roll` is a single number, not a range: the tables are sparse and a roll that
 * is not listed discovers nothing. The description is verbatim because the
 * reward amounts live in it.
 */
export interface ExplorationLocation {
  roll: number;
  name: string;
  description: string;
}

export type SkillsTableName = 'melee' | 'ranged' | 'stealth' | 'wildcard';

export interface SkillRow {
  /** 2 to 12. Patron Skill sits at both ends. */
  roll: number;
  name: string;
  description: string;
}

export interface TraumaRow {
  /** A D66 result, or the one range the table has: `41-63`. */
  roll: string;
  name: string;
  description: string;
  /**
   * Which source carried it. The catalogue is exact and machine-readable; the
   * rulebook rows come off a two-column page whose extraction scrambles, so
   * they were read individually. Recorded because the two are not equal.
   */
  source: 'catalogue' | 'rulebook' | 'catalogue+rulebook';
}

/**
 * One section of the rulebook's Core Rules or Comprehensive Rules chapter.
 *
 * This replaced `src/data/officialCoreRules.ts`, eight chapters of hand-written
 * prose that gave Initiative to the highest D6 roll (the book gives it to the
 * player with the fewest models), put the Success table's failure band at 1-6
 * (1 is not a result on 2D6), and read Morale off "50% of starting models"
 * rather than the book's "half the models in your Warband, rounded up".
 */
export interface CoreRuleSection {
  /** Slugified title, stable across builds. */
  id: string;
  title: string;
  /** 'Core Rules' or 'Comprehensive Rules' — the book's own chapter. */
  category: string;
  /** The printed page, so a player can check it against the PDF. */
  page: number;
  /** Markdown: `**Sub-heading**`, `- ` bullets, paragraphs. */
  content: string;
  source: { file: string; page: number; lines: [number, number] };
}

/**
 * One row of the Hell on Earth Weather Events table.
 *
 * An optional module the game publishes. It is the real thing the app's
 * invented weather was standing in for — twenty-three fabricated "conditions"
 * across the Codex and Play Mode, deleted in favour of nothing at all until
 * this existed.
 */
export interface WeatherEvent {
  /** 2 to 12. Every result has a row. */
  roll: number;
  name: string;
  /** The italic line under the name. Not a rule. */
  flavour: string;
  /** The rule, verbatim. `Grim and Indifferent` is "No effect." */
  effect: string;
}

export interface Dataset {
  factions: Faction[];
  units: UnitProfile[];
  weapons: WeaponProfile[];
  keywords: Keyword[];
  /** One per faction that publishes an Armoury Table. */
  armouries: Armoury[];
  /** Every Warband Variant, with its rules and its derived ops. */
  variants: WarbandVariant[];
  /** The rulebook's Battlekit chapter: descriptions and per-item special rules. */
  battlekit: BattlekitEntry[];
  /** The twelve scenarios, as printed. */
  scenarios: ScenarioEntry[];
  /** The Core Rules and Comprehensive Rules chapters, in the book's order. */
  coreRules: CoreRuleSection[];
  /**
   * Hell on Earth: the Weather Events table, and the procedure for using it.
   *
   * Optional by the module's own words — "you and your opponent(s) **may**
   * choose to influence your battles by generating a Weather Event" — so the
   * app offers it rather than applying it.
   */
  weather: { procedure: string; events: WeatherEvent[] };
  /** The campaign economy's published numbers, derived from the rulebook. */
  campaign: {
    /** The Warband Threshold Table: game -> Force cost cap and model cap. */
    thresholds: { game: number; threshold: number; fieldStrength: number }[];
    /** What a new warband recruits on. 700, read from the faction entries. */
    startingBudget: number;
    /** The Exploration Step: dice, table selection, and the three Location tables. */
    exploration: {
      /** Games played -> how many D6 to roll. `to: null` means "or more". */
      dice: { from: number; to: number | null; value: number }[];
      /** Games played -> which Location tables are available, and whether it is a choice. */
      tables: { from: number; to: number | null;
                value: { tables: ExplorationTableName[]; choose: boolean } }[];
      locations: Record<ExplorationTableName, ExplorationLocation[]>;
      /** Ducats per point of the Exploration Roll. */
      lootPerPoint: number;
    };
    /** The four Advancement Skills tables. 2D6, dense, 11 rows each. */
    skills: Record<SkillsTableName, SkillRow[]>;
    /** The Trauma Table. Sparse only in that 41-63 is one range. */
    trauma: TraumaRow[];
  };
  meta: {
    rulesetId: string;
    /** The pinned catalogue commit. No build timestamp — output is reproducible. */
    baseCommit: string;
    layers: string[];
  };
}
