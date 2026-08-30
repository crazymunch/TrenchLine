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
  kind:
    | 'strain'
    | 'vile-corpus'
    | 'goetic-power'
    | 'glory-item'
    | 'upgrade'
    | 'variant'
    | 'unknown';
  cost: Cost;
  constraints: Constraint[];
  /** Rules text as published. */
  effect: string;
  modifies?: LayerOp[];
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

/* --------------------------------------------------------------- entities */

export interface WeaponProfile {
  id: string;
  name: string;
  /** '1-Handed' | '2-Handed' | 'Equipment' | 'Special' … */
  type: string;
  /** 'Melee', '24"', 'Melee/16"' … */
  range: string;
  keywords: string[];
  rules?: string;
  cost: Cost;
  constraints: Constraint[];
  /** Restriction text from the Armoury Tables, e.g. 'ELITE only'. */
  restrictions: string[];
  factionId?: string;
}

export interface UnitProfile {
  id: string;
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
  constraints: Constraint[];
  lore?: string;
}

export interface FactionSpecialRule {
  name: string;
  description: string;
}

/** Papal States Intervention Force, House of Wisdom, Trench Ghosts, … */
export interface WarbandVariant {
  id: string;
  factionId: string;
  name: string;
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

export interface Dataset {
  factions: Faction[];
  units: UnitProfile[];
  weapons: WeaponProfile[];
  keywords: Keyword[];
  meta: {
    rulesetId: string;
    /** The pinned catalogue commit. No build timestamp — output is reproducible. */
    baseCommit: string;
    layers: string[];
  };
}
