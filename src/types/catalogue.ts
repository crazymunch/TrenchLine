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

/**
 * A limit that governs a whole option group rather than one option.
 *
 * Every field is read off the rule's own sentence, and the sentence travels
 * with it in `text`: a screen that refuses a purchase has to be able to show
 * the player why, and none of this is enforceable-looking enough to state
 * without its source.
 */
export interface OptionGroupRule {
  /** The catalogue's own group name — `Strains`, `Vile Corpus`. */
  group: string;
  /** The base allowance. */
  max: number;
  /**
   * A further allowance the rule grants on a condition.
   *
   * "If the total cost of all of the other models in the Warband (including
   * their Battlekit, etc.) adds up to 1000 or higher, Grail Thralls may have an
   * additional Strain." OTHER models: the model being checked is excluded, or
   * an expensive Thrall would qualify itself.
   */
  bonus?: {
    /** How many more, on top of `max`. */
    max: number;
    /** What the rest of the roster must be worth. */
    otherModelsCostAtLeast: Cost;
    text: string;
  };
  /** "Once a model has a Strain, it cannot be removed or lost for any reason." */
  permanent?: boolean;
  /** "each Amalgam in a Warband must have a different Vile Corpus." */
  distinctPerRoster?: boolean;
  /** The rule as published. */
  text: string;
}

/**
 * A bound a Warband can earn during a campaign, and the price of earning it.
 *
 * Deliberately not a variant rule or a house rule: it is a published ability on
 * one entry, claimed once, at a stated moment, by giving something up. The
 * claim is a historical fact — a Warband that shrinks afterwards does not lose
 * an Amalgam it already earned — so the conditions here are checked when it is
 * claimed and never re-checked after.
 */
export interface EarnedRecruitment {
  /** The ability whose text grants it. */
  grantedBy: string;
  /** The bound once earned, replacing the entry's base `max`. */
  max: number;
  /** What the rest of the Warband must be worth to claim it. */
  otherModelsCostAtLeast: Cost;
  /** Models that must be removed from the roster to claim it. */
  spends: { profileName: string; count: number };
  /** When the rule says it may be claimed. */
  step: string;
  /** Whether claiming includes an immediate recruit at no cost. */
  freeRecruit: boolean;
  /** The rule as published. */
  text: string;
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
  /**
   * The group's full ancestry, `::`-joined, where it has one.
   *
   * `group` is the LEAF, because that is the heading a player should read —
   * `Eye Options`, not `Alchemical Formulae::Eye Options`. The path is what
   * says the leaf belongs to a parent, and without it an `Eye Option` stopped
   * being an Alchemical Formula anywhere in the app: `isAlchemicalFormula`
   * decides that by asking whether the group contains `Alchemical Formulae`.
   *
   * Absent on a top-level group, where it would only repeat `group`.
   */
  groupPath?: string;
  cost: Cost;
  constraints: Constraint[];
  /** Rules text as published. */
  description: string;
  /** The profile the rules text came from, used to tell an option from gear. */
  profileId?: string;
  /** Conditional rules attached to the option itself. */
  modifiers?: Modifier[];
  /**
   * The Unit profile this option swaps in, where the option IS a statline.
   *
   * An entry can state more than one Unit profile and let the player choose:
   * "Grail Thralls / Fly Thralls" is one entry with two, and a Trench Dog takes
   * one of five specializations. Those sub-entries used to be emitted as
   * separate recruits (DA-02); taking them off the recruit list without this
   * made them unfieldable, because `optionsOf` skips any sub-entry carrying a
   * Unit profile.
   *
   * Points at `UnitProfile.id` of the matching `secondaryProfile`. The card and
   * Play Mode's reference sheet read it to show the statline the model actually
   * has — a Fly Thrall's 6"/Flying rather than the Thrall's 5"/Infantry.
   *
   * Absent on every ordinary option, which states a rule rather than a profile.
   */
  unitProfileId?: string;
}

/* ----------------------------------------------------------------- rules */

export interface Ability {
  id: string;
  name: string;
  description: string;
  /**
   * A Glorious Deed this ability adds to the ones a scenario offers.
   *
   * "Whenever a Combat Biologist is part of your Warband, add the Gather
   * Knowledge Glorious Deed to those normally available in each scenario you
   * play" (Warbands L9804-9806). The deed belongs to the MODEL, not to the
   * scenario, so it travels with the ability that grants it and Play Mode
   * reads it off the roster rather than off the scenario list.
   */
  grantsDeed?: { name: string; description: string };
  /**
   * The catalogue prints this ability `hidden="true"`: it is not on the entry
   * until something reveals it (DA-01).
   *
   * Almost always a Warband Variant — the Shocktrooper's Axe Mastery, Shield
   * Bash, Indomitable and Weapon Familiarity all belong to the Remnants of
   * Byzantium — and occasionally one of the model's own selections. Which one
   * is stated by a `set hidden=false` modifier on the unit, under the origin
   * `profile:<this ability's name>`; `visibleAbilities` in
   * `rules/applyVariant.ts` is what reads the two together.
   *
   * Absent means printed on the entry as it stands, which is the common case.
   */
  hidden?: boolean;
  /**
   * The Variants that reveal this ability, where a Variant is the only thing
   * that does.
   *
   * For the Codex, which shows every ability a model can ever have and labels
   * the ones a particular Warband would not see — a reference that hid them
   * would be a reference with rules missing from it. Set by
   * `visibleAbilities`, never by the pipeline.
   */
  variantOnly?: string[];
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
  /**
   * The id of the profile this modifier is written on, where it is written on
   * one (DA-01, review round 1 finding J).
   *
   * `origin` is readable — `profile:Hateful` — and a name is not an identity:
   * the Yoke Fiend states `Hateful` twice, once for a Fang of the Seething
   * Black Warband and once for everybody else, each hidden by its own
   * condition. Matched on the name alone, both modifiers applied to both
   * profiles and the ability disappeared under every Variant.
   *
   * Absent on an entry-level modifier and on a ruleset generated before this,
   * so a reader falls back to `origin`.
   */
  originId?: string;
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
  /**
   * The entry's flavour text as the CATALOGUE carries it.
   *
   * The rulebook's Battlekit chapter carries the same thing for core wargear,
   * and an item published in a supplement has no entry there at all — so this
   * is the only description a Carcass Front item has. Emitted by the pipeline
   * since the supplement was added; the type simply never declared it.
   */
  lore?: string;
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
  /**
   * Every name this kit entry prints: its own, its gear profiles', and those
   * of the child entries that exist only to carry a profile.
   *
   * A forced link names the ENTRY and a roster records the PROFILE. "A
   * Sultanate Sapper always has a Shovel" (Warbands L4739) links the shared
   * `Shovel` entry, whose nested child prints `Weaponized Shovel` — the name
   * NewRecruit writes. Matching on `name` alone therefore missed the Sapper's
   * own Shovel and sent it to the Armoury Table, which does not stock it.
   *
   * Optional: a warband saved before the pipeline emitted it has none, and
   * `carriesAsBattlekit` must still answer for it from `name` and `id`.
   */
  profileNames?: string[];
}

/** A model the rulebook names in one of the Promotions tables. */
export interface PromotionTableModel {
  /** The name exactly as the rulebook prints it. */
  name: string;
  /** The dataset unit it resolves to; resolved at build time, never by name. */
  unitId: string | null;
  /** That unit's own name, where the book spells it differently. */
  unitName: string | null;
}

/** One faction's row in a Promotions table. `models: []` is the book's `-`. */
export interface PromotionTableRow {
  /** The faction heading as the rulebook prints it: `The Sultanate of the Iron Wall`. */
  faction: string;
  factionId: string;
  models: PromotionTableModel[];
}

/**
 * The Promotions & Experience Step's eligibility rules (rulebook pp.105-111).
 *
 * The Promotion Dice Pool, its assignment rule and the miss counter are not
 * here yet — they arrive with the step that rolls them.
 */
export interface PromotionRules {
  /** The Promotion step is skipped at this many ELITE models. The book says 6. */
  maxElites: number;
  /**
   * The dice half of the step, each number read from its own sentence on p.105.
   *
   * Optional because a ruleset built between FD-06a and FD-06b carries the
   * eligibility bounds and not these — and a pool of `0` dice is a real
   * answer that must stay distinguishable from a ruleset that cannot say.
   */
  /** `1D6` before any Deeds. */
  poolBase?: number;
  /** `plus 1D6 for each Glorious Deed`. */
  poolPerDeed?: number;
  /** A Promotion Die promotes on this face or better. The book says 6. */
  promoteOn?: number;
  /**
   * Misses in a row after which the next die is automatically a Promotion.
   *
   * The book says 5, and the count is kept on the Roster BETWEEN games — so
   * five misses spread over three games still make the sixth die a 6. See
   * `warband.promotionMisses`.
   */
  autoAfterMisses?: number;
  /** Models That Cannot Be Promoted, p.107. */
  cannotPromote: PromotionTableRow[];
  /**
   * Limited Potential, p.111.
   *
   * Provenance and a cross-check, not the operative rule: the model lists are
   * what the RULEBOOK says, and a Trench Dispatch keyword row outranks it.
   * `experienceCap` reads the unit's LIMITED POTENTIAL keyword instead, and
   * the build prints any model the two disagree about.
   */
  limitedPotential: { maxXp: number; factions: PromotionTableRow[] };
}

export interface UnitProfile {
  id: string;
  /** The containing selectionEntry's id — what roster exports and modifier
   *  conditions address. Distinct from `id`, which is the profile's own. */
  entryId?: string;
  name: string;
  /**
   * The containing selectionEntry's name, where it differs from `name`.
   *
   * The books print the ENTRY name and this carries the profile's, so the two
   * are routinely different: `War Wolf Assault Beast` holds a profile called
   * `War Wolf`, and `Anchorite Shrine` one called `Anchorite`. Without this,
   * a model the rulebook names by its entry cannot be found from the rulebook's
   * own words.
   *
   * Absent when the two agree, so its presence means "the books may call this
   * model something else".
   */
  entryName?: string;
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
  /**
   * A host rule the source states by ALIGNMENT rather than by name.
   *
   * The Sin Eater's is "Fallen Warbands" (Warbands L10273), not a list, and
   * writing out the Fallen factions here would be a list that goes stale the
   * moment a Fallen Warband is added — which is how the Heretic Naval Raiders
   * came to be missed by hand-written host lists before.
   *
   * Resolved in `recruitable.ts` against each faction's own `alignment`, which
   * is read from the book's "… are Faithful." / "… are Fallen." sentence. The
   * build fails if a unit states one and no faction carries an alignment: a
   * filter that matches nothing is a hire nobody can make, and it would look
   * exactly like a model the game does not have.
   */
  allowedAlignment?: 'Faithful' | 'Fallen';

  /**
   * Gear this Mercenary may buy, against a rule that otherwise forbids all of
   * it.
   *
   * "A Mercenaries' Battlekit cannot be removed or lost over the course of the
   * campaign for any reason, and they cannot have any other Battlekit"
   * (Warbands L9751-9752), and the Digital Rulebook's BATTLEKIT LIMITS
   * (L3810-3818) makes Battlekit mean weapons, grenades, armour, shields and
   * equipment alike — so the default for a Mercenary is nothing at all.
   *
   * Exactly one entry states an exception. The Scripture Guardian "must have
   * either two 1-Handed Melee Weapons or one 2-Handed Melee Weapon", bought
   * "from your Faction Armoury Tables at their normal Cost" (Dispatch
   * L748-753).
   *
   * A field rather than a sentence the engine parses, and a field rather than
   * a name the engine recognises: `equipGate.ts` exists because the modal used
   * to decide this with regexes over model names, and one more of those is
   * what this file is here to prevent. The verbatim sentence is in
   * `battlekitNote`, which the transcription test checks against the page;
   * this is the machine-readable summary of it.
   *
   * `'Melee'` means a weapon whose `range` is exactly `Melee` — not a Pistol,
   * whose `Melee/16"` makes it a Ranged weapon usable in melee rather than a
   * Melee Weapon.
   */
  mercenaryMayBuy?: 'Melee'[];

  /**
   * The entry's Battlekit sentence, verbatim, where the source states one as
   * prose rather than as links.
   *
   * "The only Ranged Weapons they can have are Automatic Pistols and Pistols"
   * is a legality rule, and nothing in this model can express it: `battlekit`
   * holds gear the model always has, and the Armoury Table says what the
   * FACTION stocks, not what this entry may take of it. Paraphrasing it into
   * a constraint would be a rewrite, so it is carried as text and shown to
   * the player, who can then apply the rule the pipeline cannot.
   */
  battlekitNote?: string;

  /**
   * How many of one option GROUP this model may hold, and whether it may ever
   * let one go.
   *
   * `Constraint` sits on a single option and can only say "at most one Bolgias
   * Gut". The Black Grail's rules are about the group: "A Grail Thrall ... can
   * have up to 1 Strain", "each Amalgam can have 1 Vile Corpus". Both were
   * published with governing clauses the dataset had no shape for, so the four
   * Strains and the Vile Corpus shipped as five independent toggles — a player
   * could take all four Strains, drop one after buying it, and give two
   * Amalgams the same Corpus (docs/RULES-COVERAGE-AUDIT.md RC-07).
   */
  optionGroups?: OptionGroupRule[];

  /**
   * A recruitment bound this entry can EARN, and what earning it costs.
   *
   * `max` on this profile is the base bound and is correct as one. The Black
   * Grail's *Curse on Creation* raises the Amalgam limit to 0-2, but only after
   * a condition is met and six Grail Thralls are removed — so the app had no
   * way to tell a legal second Amalgam from an illegal one, and neither
   * recruitment nor the wizard consumed the ability at all
   * (docs/RULES-COVERAGE-AUDIT.md RC-08).
   */
  earnedRecruitment?: EarnedRecruitment;

  /**
   * A printed statline that is NOT a recruitable model.
   *
   * Some entries print two: a Leper-Pilgrim and the Martyr Penitent it can be
   * resurrected as, a Heretic Raider and the Legionnaire it can be upgraded
   * to. The second is reached by paying a stated cost for a model you already
   * have, under a condition the model cannot express ("you cannot have more
   * Legionnaires than Raiders"). Recruiting one directly would let a player
   * field a warband of Martyr Penitents at the Pilgrim's price.
   *
   * So it stays in the dataset — the Codex shows its statline and the entry's
   * own ability explains what it costs — and `rules/recruitable.ts` keeps it
   * out of the recruit list.
   */
  secondaryProfile?: boolean;
  /**
   * The entry this profile is a second statline OF, where the catalogues state
   * it that way (DA-02).
   *
   * `Black Grail.cat` L3166: the `Grail Thrall` entry holds `Grounded` and
   * `Winged` as sub-entries with a Unit profile each, and the Trench Dog's
   * `Specialization` group holds four or five more. The parser emitted every
   * one as a recruit; the first is the model and the rest are this.
   *
   * Absent on a `secondaryProfile` the Carcass Front layer marks, which is
   * written from the book rather than from a catalogue tree and has no parent
   * entry to name.
   */
  parentEntryId?: string;

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
  /*
    The economy this Variant states for itself, where it states one.

    Only the Papal States Intervention Force does, in its "Specialist Force"
    rule (Warbands p.35, as changed by the 1.0.2 errata) — 1 of 27 Variants and
    0 of 8 factions. All four fields are read out of that rule's prose by
    `parseVariantEconomy`; none is written by hand, and `economyFrom` names the
    rule they came from so the number can be traced back to the sentence.

    Absent means the Variant musters on its faction's budget, which is what the
    other 26 do. It never means "we did not look" — a rule that states a purse
    the parser cannot read fails the build rather than defaulting to 700.
  */
  /** The starting purse, replacing the faction's. Papal States: 500 D, 11 Glory. */
  budget?: Partial<Cost>;
  /**
   * Ducats added to the Warband Threshold Table's value for this Variant.
   *
   * Signed, and a delta rather than a replacement, because the published table
   * still governs — the rule shifts it. Papal States is -200, so leaving this
   * unapplied told every Papal States player they were 200 Ducats over the
   * threshold before they actually were.
   */
  thresholdDelta?: number;
  /** Glory gained each time the Variant calls for Reinforcements. Papal States: 4. */
  reinforcementGlory?: number;
  /** The special rule the three above were read from. */
  economyFrom?: string;
  /** Applied to the roster's view of the dataset, not to the dataset. */
  ops: LayerOp[];
}

export interface Faction {
  id: string;
  name: string;
  specialRules: FactionSpecialRule[];
  /**
   * 'Faithful' or 'Fallen', where the source states it in Warband Creation.
   *
   * Load-bearing: Mercenaries are hired by alignment ("any Faithful
   * Mercenaries that can be taken by Trench Pilgrim Warbands"), and several
   * rules key off it. Only the Carcass Front lists print it today; absent
   * means the source did not state it, never a default.
   */
  alignment?: string;
  /** Which source introduced the faction, where it is not the catalogues. */
  source?: string;
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

/* ------------------------------------------------------ battlekit limits */

/**
 * How much Battlekit one model may carry, as the rulebook's own bullets state
 * it. Derived by `scripts/lib/parse-battlekit.mjs`; see `rules/battlekitLimits`
 * for what enforces it.
 */
export interface BattlekitLimit {
  /** Named as the Armoury Tables name it: `Armour`, `Shields`, `Grenades`… */
  section: string;
  /** The sentence it was read from, so the app can cite rather than paraphrase. */
  raw: string;
  /** A flat ceiling, where the rule states one. `null` means "any number". */
  max?: number | null;
  /**
   * "One 2-Handed … or two 1-Handed …" — one allowance expressed twice, keyed
   * by hands. Kept as both bounds rather than reduced to a single number,
   * because which bound applies depends on what the model is carrying.
   */
  byHands?: Record<string, number>;
  /** `name` where the rule caps distinct KINDS: "One type of Grenade". */
  per?: string;
  /** "cannot have two or more … with the same Name". */
  distinctByName?: boolean;
}

/** What carrying a Shield costs a model elsewhere. */
export interface ShieldRestrictions {
  raw: string;
  /** "a maximum of one 1-Handed Melee and Ranged Weapon each". */
  oneHandedEach?: number;
  hands?: number;
  /** The handedness a Shield blocks outright — 2. */
  blocksHands?: number;
  /** Unless both carry this stipulation: `Shield Combo`. */
  unlessBoth?: string;
}

/**
 * A carrying limit stated as a KEYWORD rather than on the limits page.
 *
 * Four of them, and only the first three were obvious: reporting a keyword
 * whose text discusses carrying but which no pattern read is what turned up
 * HELD, the compound one.
 */
export interface KeywordCarryRule {
  keyword: string;
  raw: string;
  /** STRONG: one 2-Handed Melee weapon counts as 1-Handed. */
  converts?: { count: number; section: string; from: number; to: number };
  /** CUMBERSOME: always this many hands, whatever `overrides` says. */
  fixedHands?: number;
  overrides?: string;
  /** HEAVY: at most this many pieces carrying the keyword. */
  maxPerModel?: number;
  /** HELD: occupies hands and cannot be put down. */
  occupiesHands?: number;
  /** HELD: and beside it, exactly one of these. */
  alsoOneOf?: string[];
  /** HELD: the handedness it forbids outright. */
  blocksHands?: number;
  /** HELD: the pair it forbids carrying together. */
  blocksBoth?: string[];
  /** HELD: the section it does not restrict — Grenades. */
  exempt?: string;
}

/**
 * Keywords an option gives the model that takes it, by the option's name.
 *
 * A granted Keyword appears nowhere on the catalogue entry: Al-Masyukh has
 * STRONG only because it bought Inhuman Strength, whose rules text reads "Give
 * this Takwin Homunculus the STRONG Keyword". Several rules are keyed on a
 * model's Keywords, so reading the base entry alone gets those models wrong.
 */
export interface KeywordGrant {
  name: string;
  grants: string[];
  /** The option's rules text, so the grant can be shown where it came from. */
  raw?: string;
}

export interface BattlekitLimits {
  limits: BattlekitLimit[];
  withShield?: ShieldRestrictions;
  /** The same question, answered by the Keyword Glossary. */
  byKeyword?: KeywordCarryRule[];
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
  | { op: 'setCost'; target: Ref; currency: keyof Cost; value: number; scope?: Ref[] }
  /**
   * A condition on the roster entry rather than a change to the profile.
   *
   * "The Leper-Knights …must wear a suit of Armour." The model is identical
   * whether or not it is wearing any, so there is nothing for `applyVariant`
   * to do; what changes is whether the roster is legal. `section` names an
   * Armoury Table section, which is the catalogue's own account of what
   * satisfies the requirement, and `noun` is the book's word for it so the
   * violation can be phrased the way the player read it.
   */
  | { op: 'requireGear'; target: Ref; section: string; noun: string };

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
  /**
   * 'Ranged Weapons' | 'Melee Weapons' | 'Grenades' | 'Armour' | 'Equipment',
   * or 'Glory Items' for a row printed in a faction's Glory Item Table.
   *
   * Load-bearing for that last one. Page 125 distinguishes a Glory Item from
   * the Glory-priced Battlekit in an Armoury Table, and only the first needs an
   * Exploration discovery to buy — so the gate keys on this, never on the
   * currency. See `rules/gloryItems.ts`.
   */
  section: string;
  cost: Cost;
  restrictions: string[];
  /**
   * The printed price where the book gives a range rather than a number: the
   * Trench Dog is `1-3 ☼`.
   *
   * `cost` carries the lowest of the range, so a Warband is never refused an
   * item it can afford; this is the row as printed, so the screen can show the
   * player that the price is theirs to settle.
   */
  priceRange?: string;
  /**
   * The row is printed with a bullet: the item is unique to this faction and
   * its rules are in the faction's own Battlekit section, not the core one.
   */
  unique?: boolean;
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
  /** Its number within its own book: 1-12 in the rulebook, 1-5 in Carcass Front. */
  number: number;
  /** The numeral the book prints: 'I' … 'XII'. */
  roman: string;
  name: string;
  /** Derived from the name, and checked against `public/maps/` at build time. */
  slug: string;
  tagline: string;
  sections: ScenarioSection[];
  /**
   * The deployment map, verified to exist when the dataset was built.
   *
   * Null where the source ships no map file. The rulebook's twelve all have
   * one and the build fails if a file is missing — twelve broken images is
   * what the hand-written scenarios shipped — but the Carcass Front book's
   * maps have not been extracted from the PDF, and `null` says that plainly
   * rather than pointing at a file that is not there.
   */
  mapImage: string | null;
  /**
   * Which book it is from: absent for the rulebook's twelve, `carcass-front`
   * for the supplement's five. Both number their scenarios from I, so the
   * numeral alone does not identify one.
   */
  source?: string;
  /** The quotation the scenario opens on, above its summary. */
  quotation?: string;
  /** The quotation it closes on, printed under the Glorious Deeds. */
  epigraph?: string;
}

/**
 * A terrain piece with rules of its own.
 *
 * Kept apart from the scenarios because the book is explicit that it is:
 * "rules for two different terrain pieces that you can use in ANY of your
 * Trench Crusade games". Attaching them to the five Carcass Front scenarios
 * would hide a naval mine from every other game.
 */
export interface TerrainPiece {
  /** The slug the app addresses it by. */
  slug: string;
  /** As printed, in caps: `NAVAL MINE`. */
  name: string;
  /** Title Case, for display: `Naval Mine`. */
  title: string;
  /** The rules, as Markdown — including the 2D6 detonation table. */
  body: string;
  /** Which book it is from. */
  source: string;
}

/** One row of a generator chart, with the rolls it answers already expanded. */
export interface ChartRow {
  /** As printed: `1-3`, `6`. */
  printed: string;
  /** Every roll the row answers: `1-3` -> [1, 2, 3]. */
  rolls: number[];
  /** The row's cells after the roll column, in printed order. */
  values: string[];
}

/** A named rule a generator chart points at — one deployment, one condition. */
export interface GeneratorRule {
  name: string;
  slug: string;
  /** The rule as printed, as Markdown. */
  body: string;
}

/** A chart, its introduction, and the rules it names. */
export interface GeneratorChart {
  /** The prose between the section heading and the chart. */
  intro: string;
  /** The chart's own column heads: `['D6', 'Deployment', 'Game Length']`. */
  header: string[];
  rows: ChartRow[];
  /** Empty where the chart's results need no rules of their own. */
  rules: GeneratorRule[];
}

/** One row of a Glorious Deeds chart: a named deed and how to complete it. */
export interface GeneratorDeed {
  printed: string;
  rolls: number[];
  name: string;
  description: string;
}

/**
 * The Random Scenario Generator, from the Carcass Front book.
 *
 * A procedure — "carry out the following steps in order" — so it is carried as
 * one and the app runs it, rather than printing four charts and leaving the
 * player to. It replaces a generator that rolled three invented tables (six
 * weather conditions, six "complications", six "Secret Secondary Agendas"),
 * none of which appears in any source.
 */
export interface ScenarioGenerator {
  intro: string;
  /** The four numbered steps, in order. The order is itself the rule. */
  steps: string[];
  battlefield: GeneratorChart;
  deployment: GeneratorChart;
  victory: GeneratorChart;
  gloriousDeeds: {
    intro: string;
    /** Two charts of six: one for the older player, one for the younger. */
    charts: { name: string; rows: GeneratorDeed[] }[];
    /**
     * The deed the book says is ALWAYS used in a campaign game, with its own
     * condition. Not a seventh row on either chart — a rule about when the
     * generator's output is complete.
     */
    always: { name: string; description: string; when: string };
  };
}

export type ExplorationTableName = 'common' | 'rare' | 'legendary';

/**
 * A band of Exploration Roll results, inclusive at both ends.
 *
 * `to: null` is an open range — `34+`, the last row of every Carcass Front
 * table. The pool grows all campaign, so a roll can exceed any printed number
 * and the last row has to catch it.
 */
export interface RollRange {
  from: number;
  /** `null` for an open-ended range. */
  to: number | null;
}

/**
 * One row of an Exploration Location table.
 *
 * `roll` is a RANGE, and it is a range because the two books print two
 * different kinds of table:
 *
 *   - The **rulebook's** three tables are sparse single numbers — 4, 5, 6, 8,
 *     9, 11, 14 — and a roll that is not listed discovers nothing. Those rows
 *     carry `{ from: n, to: n }`.
 *   - **Carcass Front's** four are contiguous bands: *"The rolls for the
 *     Locations on the Carcass Front Exploration Tables produce a range rather
 *     than a single number (e.g. '1-3'). A Location is discovered if the
 *     Exploration Roll corresponds to any number in the range."*
 *
 * One shape rather than two so a single lookup serves both, and the sparse
 * table stays sparse: the gaps between the rulebook's rows are still gaps.
 *
 * The description is verbatim because the reward amounts live in it.
 */
export interface ExplorationLocation {
  roll: RollRange;
  name: string;
  description: string;
}

/**
 * One of the four Carcass Front Exploration Tables, keyed by its Resource.
 *
 * A Carcass Front campaign replaces the rulebook's Exploration Step: you roll
 * on the table matching a Resource available in the zone the game was played
 * in, rather than on a rarity table your games-played band unlocks.
 */
export interface CarcassFrontExplorationTable {
  /** `favour`, `relic`, `supplies`, `territories`. */
  resource: string;
  /** The Campaign Tracker prints the glyph, so a player matches on it. */
  glyph: string;
  locations: ExplorationLocation[];
}

/**
 * One section of a Carcass Front campaign chapter.
 *
 * `level` is the book's own two levels: an ALL-CAPS banner is a part of the
 * chapter, a Title-Case heading is a rule within it. `markdown` carries the
 * prose and any tables the section prints, and `RulesProse` renders both.
 */
export interface CampaignSection {
  id: string;
  level: 1 | 2;
  heading: string;
  markdown: string;
}

/** One of a Camp's four buildings, with its three tiers. */
export interface CampBuilding {
  id: string;
  name: string;
  /** The glyph the Campaign Tracker's rewards use to name it. */
  glyph: string;
  flavour: string;
  /**
   * Three tiers, and they stack: "Each new tier adds a new benefit, which is
   * received in addition to the benefits from the lower tiers."
   */
  tiers: { tier: number; effect: string }[];
}

/**
 * A campaign Carcass Front prints: the map campaign, or the Path to Leviathan.
 *
 * Mostly prose, because most of a campaign chapter is rules a player reads
 * rather than numbers an app can hold. What is lifted into structure is what
 * the app can act on: the twelve building tiers, the fourteen Tracker rewards,
 * the two Shared Objectives, and the three ways the Path to Leviathan ends.
 */
export interface CampaignDefinition {
  id: string;
  name: string;
  /** As the book states it: `2 or more`, or `2`. */
  players: string;
  intro: string;
  sections: CampaignSection[];
  buildings: CampBuilding[];
  /** The Campaign Tracker's reward symbols and what each one does. */
  trackerRewards: { symbol: string; effect: string }[];
  /** Scored at the end, and split between players who tie on one. */
  sharedObjectives: { id: string; name: string; points: number; description: string }[];
  /**
   * How the Path to Leviathan ends. Decided by two facts and nothing else:
   * whether Leviathan was summoned in Scenario V, and whether the summoner
   * also holds the railway cannon from Scenario IV.
   */
  conclusions: { id: string; name: string; result: string; description: string }[];
  /**
   * True when the campaign needs the fold-out map from the box.
   *
   * The Carcass Front Campaign does. Its zone board, the Carcass Front Zones
   * table (which zone offers which Resources, and which scenario is played
   * there), the Special Zones table and the Scenario Generator charts it uses
   * are all printed on that map and appear in no PDF. Recorded as a fact about
   * the campaign so the app can say so, rather than showing rules that refer
   * to a table it does not have and leaving the player to work out why.
   */
  requiresMap: boolean;
}

/**
 * One of the sixteen Vision cards.
 *
 * Dealt two to a player at the start of a Carcass Front campaign, of which
 * they keep one, in secret, until the campaign ends. Three tiers of the same
 * objective worth 10, 15 and 20 🏅, and the scores are cumulative — so a card
 * fully achieved is worth 45.
 */
export interface VisionCard {
  /**
   * The card's title, lower-cased.
   *
   * The cards carry a printed number and it is deliberately not used: the
   * numbers land wherever the print sheet's layout put them rather than beside
   * the card they belong to, and one is printed twice.
   */
  id: string;
  title: string;
  tiers: { text: string; points: number }[];
  /** 45 on every card. The three tiers are cumulative. */
  maxPoints: number;
  /** The quotation printed under the tiers. Empty on the seven cards with art instead. */
  flavour: string;
  /** A clarification or footnote the card prints about its own objective. */
  note: string;
}

/**
 * A Patron: the choice a warband makes once, at the start of a campaign.
 *
 * It decides exactly one thing, and it decides it often — both ends of every
 * 2D6 Skill Table are a `Patron Skill` result, so a campaign warband reaches
 * this list every few Advancement Rolls.
 *
 * Eleven of them, from the two books that print them: the rulebook's eight and
 * Carcass Front's three. The supplement's are not a supplement feature — "The
 * following new Patrons can be taken by eligible Warbands in any Campaign (not
 * just a Carcass Front Campaign)" — so they sit in the same list.
 */
export interface Patron {
  id: string;
  /** As printed, in the book's caps: `TEMPORAL LORD`, `HOUSE OF WISDOM`. */
  name: string;
  /** Who may take it: `New Antioch only.`, `Fallen Warbands only.` */
  restriction: string;
  lore: string;
  /** Exactly six, in every entry in both books. */
  skills: { name: string; description: string }[];
  /**
   * Game data a Skill introduces that is not itself a Skill.
   *
   * One entry in eleven Patrons: the House of Wisdom's `Whispering Zīj` lets a
   * Takwin Homunculus buy a **Zīj Seal Alchemical Formulae for 20 👑**, and the
   * book prints that Formula's rules among the Skills, in a Skill's shape.
   * Carried here rather than dropped — it is a thing a player can buy — and
   * kept out of `skills` so the entry has the six it actually has.
   */
  introduces: { name: string; description: string; kind: string; unlockedBy: string }[];
  source: 'rulebook' | 'carcass-front';
}

export type SkillsTableName = 'melee' | 'ranged' | 'stealth' | 'wildcard';

export interface SkillRow {
  /** 2 to 12. Patron Skill sits at both ends. */
  roll: number;
  name: string;
  description: string;
}

/** How far Experience runs, and the totals that earn an Advancement Roll. */
export interface ExperienceTrack {
  /** The last box on the track. */
  max: number;
  /** Experience totals at which a model may make an Advancement Roll. */
  advancementAt: number[];
}

export interface TraumaRow {
  /** A D66 result, or the one range the table has: `41-63`. */
  roll: string;
  name: string;
  description: string;
  /**
   * Which source carried it.
   *
   * Every row a current build produces is `'rulebook'`. It used to be
   * `'catalogue'` for eighteen of the twenty-two, which inverted the project's
   * own precedence (docs/RULESET-MODEL.md section 6) for the one table read
   * back to a player as a rule — and shipped a 24 Dark Memory that was a
   * different rule from the book's.
   *
   * The other two values remain in the union because a ruleset generated
   * before that fix is still a valid stored ruleset, and a reader must be able
   * to tell which one it is holding.
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
/**
 * One question and answer from the official Rules Commentaries.
 *
 * `label` is the document's own — `RULES Q1`, `MISC. Q7` — and is what a
 * player would quote to an opponent across a table, so it is carried rather
 * than reduced to an index. `section` is derived from that same label, not
 * from the heading the entry sits under: headings stack in this document
 * (`Faction Lists Questions` above `Trench Pilgrims` above the first
 * question), and a label repeated on every entry cannot drift from it.
 */
export interface RulesCommentary {
  id: string;
  section: string;
  label: string;
  question: string;
  answer: string;
}

export interface BattleMarker {
  /** `BLOOD MARKERS`, as the book sets it. */
  name: string;
  id: string;
  /** The printed limit, or `null` where the book states none. */
  cap: number | null;
  /** Who may spend them — the book states this, and the two pools differ. */
  spentBy: 'opponent' | 'controller';
  page: number;
  /** The published section, quoted rather than paraphrased. */
  rules: string;
}

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

/**
 * The three tables printed on the Carcass Front fold-out campaign map.
 *
 * They are on the map and nowhere else — not in the book, not in the
 * quickstart — and the book's campaign rules point at all three. The map PDF
 * was recorded as print material with no rules content until Sep 2026, so the
 * Codex told players it was short a table it could have had all along.
 */
export interface CarcassFrontMap {
  /** Glyph -> Resource, read from the book's own legend, never written here. */
  legend: Record<string, string>;
  /** The Carcass Front Zones table: 32 zones. */
  zones: { name: string; resources: string[]; scenario: string }[];
  /** What an Outpost in one of the ten Special Zones confers. */
  outpostBonuses: { zone: string; bonus: string }[];
  /**
   * The campaign's own D6 charts. A deployment and a victory condition per
   * battlefield archetype, named with the BOOK's spelling so a cell and the
   * generator's rules text for it are the same string.
   */
  generator: {
    intro: string;
    archetypes: string[];
    rows: {
      printed: string;
      rolls: number[];
      byArchetype: Record<string, { deployment: string; victory: string }>;
    }[];
  } | null;
  /** Anything the page states that did not resolve. Empty is the fact. */
  unreadable: string[];
}

/**
 * The Trauma Step's procedure, from the rulebook's own passage.
 *
 * Every field is read from the sentence that states it; nothing is defaulted.
 * The shape deliberately keeps the numbers and the prose together, because a
 * caller that shows the rule and applies a different number is the exact
 * failure this was written to end (the app displayed Head Wound's "can no
 * longer gain Experience Points" on the same submission that added the point).
 */
export interface TraumaProcedure {
  /** Models without ELITE. One D6, dead on `1..deadUpTo`, alive on `survivesFrom+`. */
  troops: {
    definition: string;
    /** `"D6"`. Carried as text because the book names the die, not a number. */
    die: string;
    deadUpTo: number;
    survivesFrom: number;
    text: string;
  };
  /** ELITE models only. The D66 roll on the Trauma Table. */
  elite: { die: string; text: string };
  /** A killed model's Battlekit is lost outright, not returned to the Arsenal. */
  killedInAction: { battlekitLost: boolean; text: string };
  /**
   * Battle Scars accrue on ELITE models alone, and the `unfitAt`-th retires
   * the model — its kit may go to the Arsenal, unlike a killed model's.
   */
  battleScars: {
    eliteOnly: boolean;
    unfitAt: number;
    text: string;
    unfitText: string;
  };
  /** A model suffers each injury once; a repeat is rerolled until usable. */
  duplicateInjury: { rerollUntilUsable: boolean; text: string };
}

/**
 * The Campaign Scenario tables, p.96.
 *
 * Three D6 bands and a named final battle. The bands tile the games they cover
 * with no gap and the final battle is the game after the last band, both
 * checked at build time — a campaign game that falls between two tables would
 * have no scenario at all.
 */
export interface CampaignScenarioTables {
  bands: {
    /** `Early Campaign`, `Mid-Campaign`, `Endgame`, as the book heads them. */
    name: string;
    /** Inclusive game numbers this table covers. */
    from: number;
    to: number;
    rows: {
      roll: number;
      /** The scenario, resolved against `Dataset.scenarios`. */
      scenario?: string;
      /**
       * The sixth result, which is not a scenario: *"The player who has played
       * fewer games chooses one of the scenarios listed above."* Recorded as a
       * result in its own right, because rerolling it would take the choice the
       * rule hands to the player who is behind.
       */
      choose?: boolean;
      /** That result's own sentence, tie-break included. */
      text?: string;
    }[];
  }[];
  /** *"Final Battle (Battle 12) ▶ The Great War"* — a name, not a roll. */
  final: { name: string; game: number; scenario: string };
}

/**
 * The Quartermaster Step's own rules, from the pages that state them.
 *
 * Two things live here because both are gates the app could not apply for want
 * of a number, and both belong to this step rather than to the Trauma Step or
 * to an Armoury Table.
 */
export interface QuartermasterStep {
  /**
   * Retiring a model the player chooses to retire (p.123).
   *
   * **Not** `TraumaProcedure.battleScars.unfitAt.** The two counts are close
   * enough to be confused and they are opposite rules: `unfitAt` (three scars)
   * is the book removing a model whether the player likes it or not, in the
   * Trauma Step; `atScars` (two) is the player being allowed to retire one, in
   * the Quartermaster Step, while it is still fit to fight. Reading either for
   * the other either strands a veteran on the roster or deletes it.
   */
  retireInjured: {
    /** Battle Scars at which retiring becomes available. Two, in the book. */
    atScars: number;
    /** The section's own words, for the screen that removes the model. */
    text: string;
  };
  /**
   * Why a faction's Glory Item Table may be entirely absent (p.125).
   *
   * `needsDiscovery` is the gate itself; what a particular discovery permits —
   * *"Glory Items costing 5 ☼ or less"* — is stated by that discovery and read
   * from `campaign.exploration.locations`, never duplicated here.
   */
  gloryItems: {
    needsDiscovery: boolean;
    text: string;
  };
}

/**
 * Calling for Reinforcements, as the rulebook sequences it.
 *
 * The prose is carried because a screen about to empty a player's Arsenal and
 * Strongbox should quote the rule rather than paraphrase it. The four booleans
 * are the clauses a caller must ACT on, and the build fails if the sentence
 * behind one stops saying what it says — a consumer that greps rules text for
 * "Discard" stops working the day the wording changes.
 */
export interface ReinforcementsSequence {
  steps: { step: number; text: string }[];
  /** Step 1. The Arsenal is abandoned when you fall back. */
  discardsArsenal: boolean;
  /** Step 2. The Strongbox pays for favours and goes to zero. */
  zeroesStrongbox: boolean;
  /** Step 5. Unspent Ducats are lost; the Arsenal starts the next game empty. */
  unspentLost: boolean;
  /** Step 6. The one clause the app already implemented. */
  forgoesExplorationAndQuartermaster: boolean;
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
  /**
   * How much of it one model may carry — "One suit of Armour", the handedness
   * rules, the Shield restrictions. Optional because a ruleset built before
   * these were parsed has none, and an absent set means "unknown", which the
   * validator treats as "do not enforce" rather than as "no limits".
   */
  battlekitLimits?: BattlekitLimits;
  /**
   * Loadout bundles: one selectable name that grants several items, such as
   * `Polearm and Shield`. Keyed by the name a roster stores.
   */
  bundles?: {
    name: string;
    grants: string[];
    /**
     * The bundle's OWN cost, not the sum of its parts'.
     *
     * A loadout is priced as one thing, and both of the two the catalogues
     * define are free options in a Mercenary's `Loadout` group. Pricing the
     * parts out of the Armoury Table charged the model 7 Ducats for a Polearm
     * the catalogue hands it for nothing.
     */
    cost: Cost;
  }[];
  /**
   * BattleScribe's own bookkeeping entries, which are not wargear.
   *
   * A hidden entry with no cost, no profile and a roster max of ZERO that a
   * modifier increments once per `forName` the roster holds. It exists to make
   * BattleScribe count purchases; a player cannot choose it, and a roster
   * carrying one was reported as "not in this ruleset".
   *
   * Identified by that signature, not by the `(Loaded)` in most of the names:
   * the same shape without it is `Dog's Friend`, counting one marker per
   * `Man's Best Friend`.
   */
  counters?: { name: string; forName: string }[];
  /**
   * Carrying allowances a model's own entry states, which replace the
   * chapter's.
   *
   * "Unless otherwise stated" is the first line of the Battlekit Limits, and
   * Warbands of Trench Crusade states otherwise for a Takwin Homunculus with
   * `Human Hands` and an `Additional Arm`. That was why the app called its
   * Siege Jezzail illegal: the chapter forbids a 2-Handed weapon alongside a
   * Shield, and this entry says the Shield replaces a MELEE weapon.
   *
   * `bySection` is a list of COMBINATIONS, not an arithmetic of hand slots.
   * The book states alternatives — "three 1-Handed, or one 1-Handed and one
   * 2-Handed" — and they are not the same as three hands: another entry allows
   * "up to three 1-Handed OR two 1-Handed and one 2-Handed", three items in
   * one branch and four hands in the other. Any single capacity number gets
   * one of the two wrong.
   */
  carryAllowances?: {
    raw: string;
    model: string;
    /**
     * Named by the sentence itself — nothing about Formulae written here.
     *
     * Empty where the entry states the allowance unconditionally, in which
     * case it belongs to the MODEL and `model` is what selects it. A
     * Desecrated Saint's several arms are not something another model can
     * acquire by holding the right Formula.
     */
    requires: string[];
    /**
     * What the entry does with these combinations.
     *
     * `permitted` is a ceiling only — "It can have up to three 1-Handed Melee
     * Weapons or…". `required` and `innate` also state a FLOOR: a Scripture
     * Guardian "must have either two 1-Handed Melee Weapons or one 2-Handed
     * Melee Weapon", and an Anchorite Shrine "is armed with" its two. All
     * three cap what the model may carry and the validator enforces that
     * much; the floor is recorded here and reported by the build, not
     * enforced — see `docs/RULESET-MODEL.md` §7d.
     */
    modality: 'permitted' | 'required' | 'innate';
    bySection: Record<string, Record<string, number>[]>;
    /**
     * The entry forbids everything else — "It cannot have any other
     * Battlekit", which the Desecrated Saint's entry says. Recorded and
     * reported rather than enforced, for the same reason as the floor.
     */
    noOtherBattlekit?: boolean;
    /** The section a Shield takes a slot from, where the entry says so. */
    shieldReplaces?: string;
    /** False where the entry forbids using Shield Combo. */
    shieldComboUsable: boolean;
  }[];
  /**
   * The Carcass Front campaign map's tables.
   *
   * Undefined for a ruleset without the supplement — that ruleset genuinely
   * has no campaign map, which is a different thing from one we failed to
   * read.
   */
  carcassFrontMap?: CarcassFrontMap;
  /** Keywords each option grants the model that buys it. */
  keywordGrants?: KeywordGrant[];
  /** The twelve scenarios, as printed. */
  scenarios: ScenarioEntry[];
  /**
   * Terrain pieces with rules of their own, usable in any game.
   *
   * Optional: the base rulebook publishes none, so an empty list and a missing
   * one would say the same thing and neither would be a fact about the game.
   */
  terrain?: TerrainPiece[];
  /**
   * The Random Scenario Generator.
   *
   * Optional because only the Carcass Front book publishes one, and a ruleset
   * that does not carry the supplement genuinely has none — which is a
   * different thing from a generator we failed to read.
   */
  scenarioGenerator?: ScenarioGenerator;
  /** The Core Rules and Comprehensive Rules chapters, in the book's order. */
  coreRules: CoreRuleSection[];
  /**
   * The battle marker pools — BLOOD and BLESSING.
   *
   * Play Mode capped Blood with a literal `Math.min(6, …)` in the store and
   * had no Blessing pool at all. The two are not mirror images and the book
   * says so: Blood is capped at 6 and spent by your OPPONENT, Blessing has no
   * printed cap and is spent by YOU. `cap: null` means the book states none,
   * which is a fact about the game rather than a gap in the reading.
   */
  markers?: BattleMarker[];
  /**
   * The official Rules Commentaries — the game's own FAQ.
   *
   * The PDF was fetched, extracted and committed, `SOURCES.json` recorded its
   * role as "feeds the Codex and rules-engine edge cases", and nothing in the
   * tree ever opened it. Several of its 51 answers settle things the app has
   * to get right: whether a model is within X" of itself, how a 30x60mm base
   * is measured for a rule that cares about 40mm, who rolls an Injury Roll
   * that comes from something other than an attack.
   *
   * Optional because a ruleset built without the extract genuinely has no FAQ,
   * which is different from one we failed to read — and the parser throws
   * rather than return an empty list if the file is there and unreadable.
   */
  commentaries?: RulesCommentary[];
  /**
   * Hell on Earth: the Weather Events table, and the procedure for using it.
   *
   * Optional by the module's own words — "you and your opponent(s) **may**
   * choose to influence your battles by generating a Weather Event" — so the
   * app offers it rather than applying it.
   */
  weather: { procedure: string; events: WeatherEvent[] };
  /**
   * The eleven Patrons, from the rulebook and from Carcass Front.
   *
   * The app had none. `warband.patron` was free text a player typed, so
   * nothing could say what a Patron's six Skills were — and a Patron's Skills
   * are the only part of it that has rules attached.
   */
  patrons: Patron[];
  /**
   * The campaigns Carcass Front prints: the map campaign and the Path to
   * Leviathan. Empty on a ruleset without the supplement's layer.
   */
  campaigns: CampaignDefinition[];
  /**
   * The sixteen Vision cards. Empty on a ruleset without the supplement.
   *
   * A player keeps theirs secret until the end of the campaign but has to
   * work towards it from the first game, and has to keep evidence as they go —
   * which needs the card's wording available all the way through.
   */
  visionCards: VisionCard[];
  /** The campaign economy's published numbers, derived from the rulebook. */
  campaign: {
    /**
     * The six Campaign Phase Steps, in the order the book states them.
     *
     * "To carry out a Campaign Phase you must go through the following
     * Campaign Phase Steps in the order that they appear below". The order
     * carries a rule: Reinforcements comes BEFORE Exploration, and taking it
     * costs you both Exploration and the Quartermaster — which is why the
     * app's four-step post-battle wizard cannot express the choice.
     */
    phaseSteps?: { name: string; description: string }[];
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
      /**
       * The seven Exploration Skills, page 115, name and text as printed.
       *
       * *"You can have multiples of any of the Exploration Skills on this
       * list"* — so a Warband holds a LIST of them, repeats included, not a
       * set. What each one does is in its own text; `explorationSkill` in
       * `src/rules/campaign.ts` is the only place that reads a meaning out of
       * it, so a Skill whose wording changes is one edit, not a hunt.
       *
       * Optional because a ruleset built before this was parsed has none, and
       * a caller must be able to tell that from "this Warband has no Skills".
       */
      skills?: { name: string; text: string }[];
      /** The book's own five numbered steps of the Exploration Sequence. */
      sequence: string[];
      /** Ducats per point of the Exploration Roll. Read from the sequence's fifth step. */
      lootPerPoint: number;
    };
    /**
     * The four Carcass Front Exploration Tables, keyed by Resource.
     *
     * Present only on a ruleset carrying the supplement's layer. A Carcass
     * Front campaign uses these *instead of* the rulebook's three, so the two
     * sets sit side by side rather than merged — a player is on one or the
     * other, never both.
     */
    carcassFrontExploration?: Record<string, CarcassFrontExplorationTable>;
    /** The four Advancement Skills tables. 2D6, dense, 11 rows each. */
    skills: Record<SkillsTableName, SkillRow[]>;
    /** The Trauma Table. Sparse only in that 41-63 is one range. */
    /**
     * The Experience track: how far it runs, and where the circles are.
     *
     * Page 105 says Experience is checked off "one Experience box per point,
     * from left to right, starting with the top row; when you reach a box
     * that is a circle, you can make an Advancement Roll for the model" — and
     * the circles are printed on the Roster Sheet, which the PDF extraction
     * does not carry. No sentence in the book lists the numbers.
     *
     * So this comes from `Campaign Rules.cat`, which encodes them because
     * NewRecruit has to enforce them. Derived, not typed: see
     * `parseExperienceTrack`, which also records the one place it departs from
     * the catalogue's own reading.
     *
     * Optional because a ruleset built before this existed has no track, and a
     * caller must be able to tell that from "no Advancement Rolls".
     */
    experience?: ExperienceTrack;
    trauma: TraumaRow[];
    /**
     * How the Trauma Step is run: who rolls what, and what removes a model.
     *
     * Separate from `trauma` because the two failed separately. The table was
     * derived and correct; the procedure had never been parsed at all, so the
     * post-battle wizard offered a D66 Trauma roll to every casualty — and a
     * Troop, who by the book takes one D6 and dies on a 1-2, instead drew from
     * a table on which 1 result in 36 is Dead. It was handing out survival.
     *
     * Optional on the type because a ruleset built before this existed has no
     * procedure, and a caller must be able to tell that from "everyone rolls
     * D66". See docs/RULES-COVERAGE-AUDIT.md RC-01 and RC-05.
     */
    traumaProcedure?: TraumaProcedure;
    /**
     * The Reinforcements Sequence, all six published steps.
     *
     * Optional for the same reason as `traumaProcedure`: a ruleset built before
     * this existed states nothing, and a caller must be able to tell that from
     * "Reinforcements costs nothing". The app charged nothing for two years.
     */
    reinforcements?: ReinforcementsSequence;
    /**
     * The scale a campaign is won on (p.95): 15 for a win, 7 for a loss, 10
     * each for a draw.
     *
     * Optional for the same reason as `traumaProcedure`: a ruleset built
     * before this existed states nothing, and "no scale" must stay
     * distinguishable from "everyone on zero". See `campaignVictoryPoints`.
     */
    victoryPoints?: { win: number; loss: number; draw: number };
    /**
     * Who may be Promoted, and how much Experience a model may hold.
     *
     * Optional for the same reason as `traumaProcedure`: a ruleset built
     * before this existed states nothing, and "no rules" must be
     * distinguishable from "everyone may be promoted, without limit" — which
     * is what the app did for two years, with a switch on the unit card.
     */
    promotions?: PromotionRules;
    /**
     * The Quartermaster Step's own two rules (p.123 and p.125).
     *
     * Optional for the same reason as `traumaProcedure`: a ruleset built before
     * this existed states neither, and "the book does not say" must stay
     * distinguishable from "no model may be retired" and from "every Glory Item
     * is on sale".
     */
    quartermaster?: QuartermasterStep;
    /**
     * The Carcass Front Exploration Step's own two numbers, read from the
     * supplement (RR-09, review round 1 finding I).
     *
     * `startingDice` is **3** and does not grow with games played — it grows
     * with Campaign Tracker rewards and Camp buildings — and `lootPerPoint` is
     * **5** where the rulebook pays 10. Both were constants in
     * `rules/campaign.ts` with the book cited beside them, which is one rung
     * short of rule 1: the citation was right and the numbers were typed.
     *
     * Undefined on a ruleset without the supplement, which is what the
     * Exploration panel refuses on rather than falling back to the rulebook's.
     */
    carcassFrontExplorationStep?: { startingDice: number; lootPerPoint: number };
    /**
     * Which scenario a campaign game is played on (p.96).
     *
     * Optional for the same reason as `traumaProcedure`: a ruleset built before
     * this existed prints no bands, and "the ruleset does not say" must stay
     * distinguishable from "any scenario, at any game" — which is what the
     * Mission Generator did.
     */
    scenarioTables?: CampaignScenarioTables;
  };
  meta: {
    rulesetId: string;
    /** The pinned catalogue commit. No build timestamp — output is reproducible. */
    baseCommit: string;
    /**
     * The catalogue files pinned into this dataset, from the fetch manifest.
     *
     * The freshness check compares these against what changed upstream since
     * `baseCommit`. Shipped rather than listed in the app because the app's own
     * copy had drifted: it was missing `Campaign Rules.cat`, so an upstream
     * change to the injury, skill or exploration tables would not have counted.
     */
    baseFiles: string[];
    layers: string[];
  };
}
