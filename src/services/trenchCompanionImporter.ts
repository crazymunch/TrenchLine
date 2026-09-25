/**
 * Import a warband from a Trench Companion share link.
 *
 * CI-1. A player who builds in Trench Companion and plays here should not
 * have to rebuild. Their share page carries the whole campaign state — the
 * Experience, the Skills, the injuries, the Strongbox, the round — which the
 * NewRecruit import has to reconstruct from a list of models and a budget.
 *
 * ## Everything resolves by NAME, and nothing of theirs is stored
 *
 * Their ids are slugs of their published names (`md_plagueknight`,
 * `sk_standfirm`, `fc_ironsultanate_fv_houseofwisdom`) and every object in
 * their record also carries the name itself. So the join is by name against
 * our dataset — which is the opposite of what
 * [`NEWRECRUIT-IMPORT.md`](../../docs/NEWRECRUIT-IMPORT.md) concluded, and for
 * a reason that does not apply here: a BattleScribe roster carries the
 * catalogue's own `entryId`, so matching a roster line by name there was
 * throwing away the answer the file already gave. Trench Companion's ids are
 * *their* ids. They name nothing in our dataset, they would mean nothing to a
 * later reader of ours, and so none of them is written to a warband.
 *
 * ## Nothing is guessed
 *
 * Anything that does not resolve is named in the report and left off, never
 * approximated onto the nearest entry ([rule 2](../../CLAUDE.md)). Their
 * catalogue is not ours: it carries Preview entries, its own promotion ranks,
 * and its own spellings (`Greatsword / Greataxe` for our `Great Sword/Axe`),
 * and an importer that reached for the closest name would put a model on a
 * roster the player never bought.
 *
 * ## The prices on the roster are ours
 *
 * [Rule 1](../../CLAUDE.md): a cost in this app comes from the generated
 * dataset or it does not exist. Their `cost_value` is read only so that the
 * report can say where the two differ, and the Quartermaster debit is taken
 * from their own `stored_ratings.rating_ducat` — their arithmetic about their
 * roster — so that the Strongbox the player sees here is the Strongbox they
 * left.
 *
 * See [`TRENCH-COMPANION-IMPORT.md`](../../docs/TRENCH-COMPANION-IMPORT.md).
 */
import type { Dataset, Cost } from '../types/catalogue';
import type {
  Warband, ActiveUnit, EquippedWeapon, EquippedArmour, EquippedEquipment, StashedItem,
} from '../types/warband';
import type { UnitProfile } from '../types/rules';
import { book } from '../rules/ledger';
import { nameKey } from '../rules/names';
import { recruitable } from '../rules/recruitable';
import { sameFaction } from '../rules/variants';
import { catalogueUnitFor } from '../rules/catalogueUnit';
import { GOLEM_GRANTED_BY, golemGrant } from '../rules/golem';
import { carriesAsBattlekit } from '../rules/battlekit';
import { isAlchemicalFormula } from '../rules/formulae';
import { removeFromRoster } from '../rules/fallen';
import { explorationChoices, explorationGrants } from '../rules/campaign';
import { TRENCH_COMPANION_IDS } from '../data/generated/trench-companion-ids.generated';

/* ------------------------------------------------------------ their shape */

/*
  Everything optional and nothing asserted, for the reason the NewRecruit
  importer states: this is a parser for somebody else's file, which is the one
  place a program cannot assume the shape it is handed. What the types buy is
  that a typo in a member name is a compile error rather than `undefined`
  flowing into a statline.

  Measured on a public warband on 25 September 2026, and then against the
  owner's own — `data-sources/fixtures/trench-companion/`, which is the one
  committed here. The stranger's id is deliberately not written down anywhere
  in this repository; it is not ours to publish. A field this does not name is
  a field this does not read, and the report says so.
*/

/** `{ object_id: 'sk_standfirm', … }` — how they reference anything by id. */
interface TcRef { object_id?: string }

/** A line's price and the relation it was bought through. */
interface TcPurchase {
  cost_value?: number;
  /** 0 is Ducats. See `theirCost`. */
  cost_type?: number;
  purchaseid?: string;
  /**
   * The relation the line was bought through, which says WHERE it came from.
   *
   * `rel_fc_eq_jezzail` is a Faction Armoury row; `rel_md_eq_mamlukfarisbase`
   * is the MODEL's own equipment relation — kit the entry comes with. See
   * `includedInTheirModel`.
   */
  faction_rel_id?: string;
  /**
   * Ducats their record takes off this line's price.
   *
   * Seven lines of the owner's warband carry one, and each is their record
   * stating that the Warband was given something rather than buying it: the
   * Golem's model line (40, the whole entry price), the four Formulae its
   * allowance covers (15, 15, 10, 10 — fifty exactly), and both Arsenal rows,
   * which the Sniper's Lair grants by name. Read as part of their price, and
   * cross-checked against ours per model.
   */
  discount?: number;
  /** The relation, which carries a name of its own — sometimes a different one. */
  custom_rel?: { name?: string };
}

interface TcEquipment {
  purchase?: TcPurchase;
  equipment?: { id?: string; name?: string };
}

interface TcUpgrade {
  purchase?: TcPurchase;
  upgrade?: TcRef;
}

/**
 * One of the model's own equipment relations, and the package taken from it.
 *
 * `{ object_id: 'rel_md_eq_mamlukfarisbase', selections: [{ option_refID:
 * 'ot_mamlukequipmentpackages', selection_ID: 'rel_md_eq_mamlukpackage_1' }] }`
 * — the relation names the entry's own kit, and a selection is the entry's
 * choice of kit where it offers one. See `UNMAPPED_MODEL`.
 */
interface TcModelEquipment {
  object_id?: string;
  selections?: { option_refID?: string; selection_ID?: string | null }[];
}

interface TcModelInner {
  id?: string;
  /** The variant's display name — `Executor`, `Fly Bereaved`. */
  name?: string;
  /** Their entry id, e.g. `md_plagueknight_executor`. */
  model?: string;
  elite?: boolean;
  experience?: number;
  equipment?: TcEquipment[];
  list_upgrades?: TcUpgrade[];
  list_skills?: (TcRef | string)[];
  list_injury?: (TcRef | string)[];
  /* Read to report what they record and this does not. See `UNMAPPED_MODEL`. */
  list_modelequipment?: TcModelEquipment[];
  /** Abilities, and the choice each one records where it asks for one. */
  subproperties?: TcModelEquipment[];
  /* Read only to report that they are not mapped. See `UNMAPPED_MODEL`. */
  scar_reserves?: unknown;
  stat_selections?: unknown[];
  active?: unknown;
  recruited?: unknown;
  notes?: unknown;
}

interface TcModelLine { purchase?: TcPurchase; model?: TcModelInner }

interface TcWarbandData {
  name?: string;
  ducat_bank?: number;
  glory_bank?: number;
  debts?: { ducats?: number; glory?: number };
  tags?: { tc_version?: string };
  context?: {
    campaign_round?: number;
    victory_points?: number;
    failed_promotions?: number;
    stored_ratings?: {
      rating_ducat?: number;
      rating_glory?: number;
      spare_ducat?: number;
      spare_glory?: number;
      /** The Arsenal's own value, which `rating_*` does NOT include. */
      stash_rating_ducat?: number;
      stash_rating_glory?: number;
    };
  };
  faction?: {
    faction_property?: TcRef;
    /** `pt_houseofwisdom` — the Patron the Warband took. See `readPatron`. */
    patron_id?: string;
    /** Their record of the faction's own rules, and the choices inside them. */
    faction_rules?: { object_id?: string; selections?: { selection_ID?: string | null }[] }[];
  };
  exploration?: {
    explorationskills?: (TcRef | string)[];
    locations?: unknown[];
    /** The standing effect of a Location they hold. See `readExploration`. */
    location_mods?: unknown[];
    templocations?: unknown[];
  };
  models?: TcModelLine[];
  /** The Warband's stash. */
  equipment?: TcEquipment[];
  fireteams?: unknown[];
  notes?: unknown;
  modifiers?: unknown[];
  /* Modifiers attached to a Location rather than to the Warband. */
  modifiersloc?: unknown[];
  consumables?: unknown[];
  restrictions_list?: unknown[];
  /** The campaign expansions this Warband is playing. */
  expansion_ids?: unknown[];
  expansion_data?: { expansion_data?: { id?: string; name?: string } }[];
}

/** What their endpoint returns: an envelope whose `warband_data` is a JSON STRING. */
export interface TrenchCompanionEnvelope {
  warband_id?: number | string;
  warband_data?: string | TcWarbandData;
}

/* ------------------------------------------------------------- our report */

/** One item whose price differs between their record and our dataset. */
export interface PriceDifference {
  /** The item, by the name OUR dataset gives it. */
  name: string;
  /** What their record charged for it. */
  theirs: Cost;
  /** What ours charges. This is the price on the roster. */
  ours: Cost;
  /**
   * Where it was read: the models carrying it, or the Arsenal.
   *
   * One entry per ITEM rather than per purchase. Four Kavass carrying the same
   * Standard Armour produced the same line four times, and a report that says
   * the same thing four times is one a player stops reading — while the fact
   * they actually need, which models it is on, was in none of them.
   */
  where: string[];
}

export interface TrenchCompanionImportResult {
  warband: Warband;
  /**
   * Things their record names that our dataset has no entry for.
   *
   * The same contract as `ImportResult.unmatched`: these were left off, not
   * approximated, and the import screen prints them above the preview.
   */
  unmatched: string[];
  /** Everything the player should read before pressing Import. */
  warnings: string[];
  /** Fields their record carries that this import does not read. */
  unmapped: string[];
  /** Where their price and ours disagree. Ours is what the roster charges. */
  priceDifferences: PriceDifference[];
}

/* --------------------------------------------------------------- reading */

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** `{object_id: 'sk_x'}` or a bare `'sk_x'` — both occur in their JSON. */
const refId = (r: TcRef | string | undefined): string =>
  (typeof r === 'string' ? r : r?.object_id ?? '');

/** The part of `sk_standfirm` that is a name. Their prefixes are two or three letters. */
const slugTail = (id: string): string => id.replace(/^[a-z]{2,3}_/, '');

/**
 * Their ids where no rule of spelling reaches our name.
 *
 * Three entries today, each citing their bundle and ours. The source of truth
 * is `data-sources/trench-companion/id-name-equivalence.json`, where the
 * citations live and where `trenchCompanionEquivalence.test.ts` reads it to
 * fail when an entry stops being needed. Everything else resolves by the slug
 * rules below, because their ids ARE slugs of their names.
 *
 * Read here from the GENERATED copy, not from that file. `.vercelignore`
 * excludes `data-sources/` from every deployment — the app is meant to read
 * the generated output — so importing the source directly built in CI, which
 * has the whole checkout, and failed the Vercel build, which does not.
 * `rules-build.mjs` copies it into `src/data/generated/` verbatim and the
 * guard asserts the two are identical.
 */
type Equivalence = Record<string, { ours: string | null; theirs: string; why: string }>;

/**
 * An id the table says this ruleset has no counterpart for, and who carried it.
 *
 * Collected rather than reported per model: four Kavass carrying the same
 * unresolvable upgrade produced the same paragraph four times.
 */
interface NullEquivalence { id: string; theirs: string; why: string; on: string }

/**
 * A thing on a model that this ruleset has no entry for, and who carried it.
 *
 * Collected so the report says it ONCE. Four Kavass carrying the same
 * unresolvable upgrade and the same unresolvable item produced eight lines —
 * two facts, said eight times — and a report that repeats itself is one a
 * player stops reading before they reach the line that matters.
 */
interface Miss { what: string; on: string }

const EQUIVALENT: Equivalence = TRENCH_COMPANION_IDS.ids;


/**
 * The Book of Golems, written into the id.
 *
 * `md_takwincreation_golem` is a Takwin Homunculus the grant created — their
 * bundle files it under `variant_name: "Rare_Exploration"`, which is the
 * Exploration row this app already reads (GOLEM-1). The model is the same
 * entry either way, so the suffix is taken off before resolution and the
 * answer carried out separately, the way `golemOnImport` keeps the decision
 * apart from the model.
 */
function golemStripped(tail: string): { slug: string; golem: boolean } {
  return tail.endsWith('_golem')
    ? { slug: tail.slice(0, -'_golem'.length), golem: true }
    : { slug: tail, golem: false };
}

/**
 * The names one of their upgrade ids can mean.
 *
 * Their upgrade ids are namespaced by the option GROUP as well as by the
 * model, and they keep the underscores inside a name:
 * `up_alchemicalformulae_massive_size` is `Massive Size` in the
 * `Alchemical Formulae` group, and `up_secrets_secretsoftakwin` is
 * `Secrets of Takwin` under `Secrets`.
 *
 * So: the whole tail, then the tail with its FIRST underscore-delimited
 * segment dropped — which is the group, whatever the group happens to be
 * called, without this file needing a list of their group names. Then the
 * same again with the model's own slug taken off the front, for the ids that
 * are namespaced by the model instead.
 *
 * Underscores inside a name are simply not significant: `nameKey` drops every
 * non-alphanumeric, so `massive_size` and `Massive Size` are the same key.
 *
 * Exported for the equivalence table's guard, which asks of every `up_` entry
 * the same question this asks of every upgrade: does a slug rule reach it
 * already? A guard that re-derived the keys itself would be guarding its own
 * copy of the rules rather than these.
 */
export function upgradeSlugKeys(id: string, modelSlug: string | undefined): string[] {
  const tail = slugTail(id);
  const own = nameKey(golemStripped(slugTail(modelSlug ?? '')).slug);
  const withoutGroup = tail.includes('_') ? tail.slice(tail.indexOf('_') + 1) : '';
  const flat = nameKey(tail);
  return [...new Set([
    flat,
    nameKey(withoutGroup),
    own && flat.startsWith(own) ? flat.slice(own.length) : '',
  ].filter(Boolean))];
}

/**
 * Their price for a line, in the currency their `cost_type` names.
 *
 * `cost_type` 0 is Ducats on every line measured. `1` is read as Glory
 * because that is the only other currency the game has — but an **unknown**
 * value is not guessed at: it comes back `null`, the comparison is skipped,
 * and the report says a price could not be read. A wrong currency in a
 * "their price differs" line would send a player to change something that was
 * never wrong.
 */
function theirCost(p: TcPurchase | undefined): Cost | null {
  /*
    A price they did not state is not a price of zero.

    Reading a missing `cost_value` as 0 produced a report line saying an item
    was "free in Trench Companion" — a claim about their record that their
    record never made, and exactly the shape of invention rule 2 forbids. An
    unstated price is not compared, and the report says so.
  */
  if (typeof p?.cost_value !== 'number' || !Number.isFinite(p.cost_value)) return null;
  /*
    Less what their record took off it.

    Seven lines of the owner's warband carry a `discount`, and every one of them
    is their record saying the Warband did not pay: the Golem's model line (40,
    the whole entry price), the four Formulae its 50-Ducat allowance covers, and
    both Arsenal rows, which the Sniper's Lair grants by name. Read as part of
    the price because that is what it is — the line's price is what their record
    charged for it, and comparing our nothing against their gross 40 reported a
    disagreement where the two records in fact agree. The discount is separately
    cross-checked against ours, per model, where they differ.
  */
  const v = p.cost_value - num(p.discount);
  if (p.cost_type === 0 || p.cost_type === undefined) return { ducats: v, glory: 0 };
  if (p.cost_type === 1) return { ducats: 0, glory: v };
  return null;
}

const sameCost = (a: Cost, b: Cost) => a.ducats === b.ducats && a.glory === b.glory;

const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

/** A number their record actually states, or `undefined`. Never a default. */
const stated = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

/* ------------------------------------------------------------- resolution */

/**
 * The names a Trench Companion line can be resolved by, in order.
 *
 * Their `equipment.name` is the catalogue's name for the thing; the relation's
 * `custom_rel.name` is what the faction that stocks it calls the same thing,
 * and the two differ often enough to matter — their `Urn of Bitter Ashes` is
 * the Dirge of the Great Hegemon's `Broken Crown`, and their
 * `Greatsword / Greataxe` is bought through a relation called
 * `Great-Sword/Axe`, which is the one our books print. Both are NAMES in
 * their record, so trying both is not a second guess; it is the same join
 * against the other spelling they published.
 *
 * The slug is last, and it is a name too — their ids are slugs OF the names.
 */
function namesFor(
  primary: string | undefined,
  relation: string | undefined,
  slug: string | undefined,
): string[] {
  const out = [primary, relation, slug ? slugTail(slug) : undefined]
    .map((n) => nameKey(n))
    .filter(Boolean);
  return [...new Set(out)];
}

/**
 * The one candidate whose name matches, or nothing.
 *
 * **Ambiguity resolves to nothing**, which is the whole reason this is a
 * function rather than a `find`. Six entries in the shipped ruleset are called
 * `Homunculus` (ID-1), and `find` takes whichever is first — so a name that
 * names five things names none of them, and the report says so. The caller
 * narrows by faction first, which is what makes a name unique where it can be.
 */
function uniqueByName<T>(candidates: T[], nameOf: (x: T) => string, keys: string[]): T | undefined {
  const found = lookupBy(candidates, (x) => [nameOf(x)], keys);
  return found.kind === 'one' ? found.hit : undefined;
}

/**
 * One candidate, none, or several — the three outcomes kept apart.
 *
 * `undefined` conflates two answers that must not be conflated: "no entry
 * carries this name" and "several do". The first is a gap another rule may
 * fill; the second is an ambiguity, and filling it from somewhere else picks a
 * winner between entries that all hold the name outright. See
 * `uniqueByNameOrAlias`, where telling them apart is the whole point.
 */
type Found<T> = { kind: 'one'; hit: T } | { kind: 'none' } | { kind: 'many' };

function lookupBy<T>(
  candidates: T[],
  namesOf: (x: T) => string[],
  keys: string[],
): Found<T> {
  for (const key of keys) {
    const hits = candidates.filter((c) => namesOf(c).some((n) => nameKey(n) === key));
    if (hits.length === 1) return { kind: 'one', hit: hits[0] };
    if (hits.length > 1) return { kind: 'many' };
  }
  return { kind: 'none' };
}

/**
 * By name, and then — only where no name answered — by the catalogue's other
 * spelling for the same entry.
 *
 * `Elixer of Al-Khidr` is the case, and it is OUR catalogue's own word for it:
 * the Iron Sultanate's `selectionEntry name="Elixer of Al-Khidr"` wraps a
 * profile named `Elixir of Al-Khidr` (`Iron Sultanate.cat:77` and `:90`), and
 * the pipeline now ships the entry's spelling as `aliases`. So a file written
 * against their spelling resolves from the catalogue rather than from a
 * hand-written equivalence — rule 1, the same rule that keeps costs out of
 * that table.
 *
 * Names first, always. An alias can only fill a gap: where an entry holds the
 * name outright it answers, so an alias can never redirect a real item to
 * another entry (the failure `parse-battlescribe.mjs` records from the attempt
 * that made entry names into names).
 *
 * **A name that is AMBIGUOUS is not a gap**, and this shipped for one round
 * treating it as one. Four names each belong to two entries in this ruleset —
 * `Anti-Tank Hammer`, `Punt Gun`, `Warcross`, `Molotov Cocktail` — and the
 * Court of the Seven-Headed Serpent's Weapon Collections rows carry the same
 * four as `Claimed: Anti-Tank Hammer` with the bare name as their alias. So a
 * plain Iron Sultanate model holding an Anti-Tank Hammer, which this ruleset's
 * Sultanate list does not stock and which was correctly reported, resolved to
 * another faction's `Claimed:` row at no cost. Ambiguity resolves to nothing,
 * as it does everywhere else here, and the aliases are asked only when no
 * entry answered to the name at all.
 */
function uniqueByNameOrAlias<T extends { name: string; aliases?: string[] }>(
  candidates: T[],
  keys: string[],
): T | undefined {
  const byOwnName = lookupBy(candidates, (x) => [x.name], keys);
  if (byOwnName.kind !== 'none') return byOwnName.kind === 'one' ? byOwnName.hit : undefined;
  const byAlias = lookupBy(candidates, (x) => x.aliases ?? [], keys);
  return byAlias.kind === 'one' ? byAlias.hit : undefined;
}

/**
 * Their fighter status, and what each of its five values means here.
 *
 * `active` is not a flag; it is a state, and their own bundle names the
 * values it tests for:
 *
 *   `IsDead(){return "dead"==this.State}`
 *   `IsReserve(){return "reserved"==this.State}`
 *   `IsLost(){return "lost"==this.State}`
 *   `"dog"==e.model.State`   — a Trench Dog attached to a handler
 *
 * Four of the five map onto something this app already has. `lost` does not,
 * and is the one that must NOT be guessed: neither "dead" nor "benched" is a
 * safe reading of a word whose meaning is stated nowhere public, and either
 * guess silently either kills a model or keeps one the player has lost. It is
 * left off the roster and named in the report, with their word.
 */
type FighterStatus =
  | { keep: true; benched: boolean; dead: boolean; note?: string }
  | { keep: false; why: string };

function fighterStatus(raw: unknown, label: string): FighterStatus {
  /*
    Anything that is not a string is the `lost` case, not the `active` one.

    It used to read `typeof raw === 'string' ? … : 'active'`, so a record whose
    `active` was a number, an object, or missing altogether imported the model
    as a fighting member of the Warband — a default dressed as a reading. Their
    five states are strings; a value that is not one of them says nothing this
    import can act on, and the model is left off and named rather than put on
    the roster on the strength of a fallback.
  */
  if (typeof raw !== 'string' || !raw.trim()) {
    return {
      keep: false,
      why: `${label}: their record's fighter status is `
        + `${raw === undefined ? 'absent' : typeof raw === 'string' ? 'empty' : JSON.stringify(raw)}`
        + ', which is not one of the states this import knows (active, reserved, dead, lost, dog). '
        + 'Whether the model is on the roster at all is exactly what that field says, so it is '
        + 'left off rather than imported as a guess.',
    };
  }
  const state = raw.trim().toLowerCase();
  switch (state) {
    case 'active':
      return { keep: true, benched: false, dead: false };
    case 'reserved':
      /* "Models you do not use will have to sit the game out" — `benched` is
         the same choice, durable for the same reason (p.97). */
      return { keep: true, benched: true, dead: false };
    case 'dead':
      return {
        keep: true, benched: false, dead: true,
        note: `${label} is dead in their record, and is imported to the memorial with its `
          + 'Battlekit rather than onto the roster.',
      };
    case 'dog':
      /*
        A Trench Dog attached to a handler. Our dataset holds the Dog as its own
        entry, so it is imported as the model it names; the attachment itself is
        theirs and we have nowhere to put it.

        No warband measured has carried one, so what their record does with a
        dog that also holds purchases of its own — whether the handler's price
        includes it, whether its kit is listed on the dog or on the handler — is
        not known, and the note says so rather than implying the price is
        settled.
      */
      return {
        keep: true, benched: false, dead: false,
        note: `${label} is marked 'dog' in their record, which attaches it to a handler. `
          + 'It is imported as the model it names and priced from this ruleset like any other '
          + 'model; the attachment is not mapped. No warband this import has been measured '
          + 'against carries one, so if their record prices a dog through its handler — or lists '
          + "the handler's kit on the dog — that is not something this has been able to check.",
      };
    default:
      return {
        keep: false,
        why: `${label} is '${state}' in their record. What that means is not stated anywhere `
          + 'public, and neither dead nor benched is a safe reading of it, so the model is '
          + 'left off rather than imported as a guess.',
      };
  }
}

/* ------------------------------------------------------------ the importer */

/**
 * What this import does not read, and says so every time.
 *
 * Listed unconditionally, and written for the player rather than for us: a
 * report is read by whoever pressed Import, so it says what the field is and
 * why nothing was taken from it, without reference to whose warband it was
 * first measured on. The count of models carrying a value is appended, so a
 * line about a field this Warband does not use says so.
 */
const UNMAPPED_MODEL: { field: keyof TcModelInner; why: string }[] = [
  {
    field: 'stat_selections',
    why: 'What a stat selection changes is not stated anywhere public, so there is nothing to '
      + 'read it from. It waits for a record that says what one does, rather than being guessed '
      + 'at from the name.',
  },
  {
    field: 'subproperties',
    why: 'Their own ids for the abilities the model\'s ENTRY carries: `ab_artificialbody` is '
      + 'this ruleset\'s Artificial Life, `ab_pummellingblows` its Pummeling Blows, '
      + '`ab_agilelion` its Agile. A model\'s abilities are read from its entry here — which is '
      + 'also why the spellings differing does not matter — so the list itself adds nothing. '
      + 'Some of them DO carry a choice the player made, and every one of those is named below '
      + 'rather than left in this line: an ability that asks which Keyword, or which other model, '
      + 'records the answer in its `selections`. `ab_limitedupgrades` is the Book of Golems\' own '
      + 'restrictions, which this import carries on the model as its grant instead.',
  },
  {
    field: 'list_modelequipment',
    why: 'The relation a model\'s Battlekit came through — `rel_md_eq_sultanatesapper` — and, '
      + 'where the entry offers a choice of kit, which package was taken. The relation itself is '
      + 'not idle: the same `rel_md_eq_…` on an equipment LINE is how this import knows that line '
      + 'was not a purchase, which is what stops a Mamluk Faris being charged for the kit its own '
      + 'price includes. What is not read is the package: what one contains is not stated '
      + 'anywhere public, so each choice their record states is named below rather than applied.',
  },
];

/**
 * Turn one share-link envelope into a warband and a report.
 *
 * `envelope` is exactly what `/api/import/trench-companion` returned —
 * `warband_data` still a JSON string. Parsing it here rather than in the route
 * keeps the route a transport and this the only thing that knows their shape.
 *
 * Throws, rather than returning an empty warband, when the envelope is not
 * one: a faction we cannot name is a warband we cannot build, and a warband
 * built anyway would be a plausible-looking wrong answer.
 */
export function importTrenchCompanionWarband(
  envelope: TrenchCompanionEnvelope,
  dataset: Dataset,
  /**
   * The id equivalence table to resolve with.
   *
   * Defaults to the shipped one, and is a parameter for one reason: the guard
   * that proves a `{ ours: null }` entry cannot shadow a resolution has to run
   * the real import with such an entry in the table. Without the seam that
   * guard could only re-derive the resolution order, which is the thing it is
   * meant to be checking.
   */
  equivalent: Equivalence = EQUIVALENT,
): TrenchCompanionImportResult {
  const data = readWarbandData(envelope);

  const unmatched: string[] = [];
  const warnings: string[] = [];
  const unmapped: string[] = [];
  const priceDifferences: PriceDifference[] = [];
  /** Ids the table says resolve to nothing here — one line each, below. */
  const nullEquivalence: NullEquivalence[] = [];
  /** `_mv_` names no list here has, one line per name — see below. */
  const variantMisses: { form: string; profile: UnitProfile; on: string }[] = [];
  /** Things on a model this ruleset has no entry for — one line each, below. */
  const unresolved: Miss[] = [];
  /**
   * The models this import put on the roster, dead ones included.
   *
   * What `reportUnmapped` speaks for. It used to walk their whole list, so a
   * model their record calls `lost` — which this import deliberately does not
   * take — still had its `list_modelequipment` choice reported and was still
   * counted in "9 models carry a value for it". A report about a model the
   * player did not import is the thing round 1's item 10 was about, one reader
   * further on.
   */
  const kept: TcModelInner[] = [];

  /* ---------------------------------------------------------- the ruleset */

  const version = data.tags?.tc_version;
  if (version && version !== 'ver_default') {
    warnings.push(
      `This warband is built against Trench Companion's '${version}' rules, not its Official `
      + "rules ('ver_default') — their Preview rules. TrenchLine's rulesets carry the published "
      + 'entries, so anything from the Preview will be reported below as having no entry here.',
    );
  }

  /* --------------------------------------------------- faction and variant */

  const appFactionIds = (dataset.factions ?? []).map((f) => f.id ?? f.name);
  const { factionId, factionName, variantId } = readFaction(dataset, data, appFactionIds, unmatched);
  const patron = readPatron(dataset, data, unmatched);

  const shelf = recruitable(dataset, factionId, appFactionIds, variantId);

  /* ------------------------------------------------------------- the models */

  const stamp = Date.now();
  const units: ActiveUnit[] = [];
  /* Models their record calls dead. Taken off the roster below through
     `removeFromRoster`, which is the one path a removed model leaves by. */
  const deadIds: string[] = [];

  (data.models ?? []).forEach((line, idx) => {
    const m = line.model;
    const theirName = (m?.name ?? '').trim();
    const label = theirName || `An unnamed model (${m?.model ?? 'no entry id'})`;
    if (!m || !theirName) {
      unmatched.push(label);
      return;
    }

    const { profile, golem, variantMiss } = resolveModel(
      shelf.units, factionId, theirName, m.model, equivalent);
    if (!profile) {
      unmatched.push(`${theirName}${m.model ? ` (${m.model})` : ''}`);
      return;
    }

    /*
      Whether the model is on this roster at all, asked BEFORE anything is read
      off it.

      It used to be asked last, so a model their record calls `lost` — one this
      import deliberately does not take — still spent its gear and its upgrades
      into the report: prices compared, shelves warned about, items named as
      unmatched, all for a model that never reached the roster. The player read
      a report about a model they had not imported.
    */
    const status = fighterStatus(m.active, theirName);
    if (!status.keep) {
      unmatched.push(status.why);
      return;
    }
    if (status.note) warnings.push(status.note);
    /* Only a model the import KEPT is one the report speaks for. */
    kept.push(m);

    /*
      Their id named a Variant's model, and this Warband's list does not have
      that name. See `resolveModel`: a Variant can reprice a model as well as
      rename it, so falling back to the base entry is a different price and not
      only a different name.

      Which Variant carries the name is LOOKED UP rather than asserted away.
      The line used to say "no list this ruleset carries has an entry of that
      name", which is false whenever another Variant of the same faction does —
      and the player needs to know that it is the wrong Variant rather than an
      unknown model. Collected per Variant form, not per model: four models
      under the same absent Variant said the same thing four times.
    */
    if (variantMiss) variantMisses.push({ form: variantMiss, profile, on: theirName });

    /*
      A model the Book of Golems gave the Warband costs nothing.

      *"Add a Takwin Homunculus … to your Warband"*, with no cost in the
      sentence — the reading `golem.ts` records, and the reading their own
      record agrees with: it carries `discount: 40` on this line, the whole of
      the entry's price. Recorded the way the app records any model a rule
      gave: `grantedFree`, which is what `fromWarband` prices at nothing and
      what `convert` refuses to refund. The entry's own cost stays on the
      profile snapshot, because that is what the entry costs.
    */
    const grantedFree = golem && !!golemGrant(dataset);
    const ownCost: Cost = grantedFree ? { ducats: 0, glory: 0 } : ourUnitCost(profile);

    /*
      Their discount, read as the cross-check it is.

      It was classed as their bookkeeping and never read, which left the one
      place their record states the same conclusion unexamined. Where they take
      Ducats off a model and this import does not, or takes off a different
      number, the two records disagree about what the model cost and the player
      is told rather than left to notice.
    */
    const theirDiscount = num(line.purchase?.discount);
    const ourDiscount = grantedFree ? ourUnitCost(profile).ducats : 0;
    if (theirDiscount !== ourDiscount) {
      warnings.push(
        `${theirName}: their record takes ${theirDiscount} Ducats off this model's price and this `
        + `import takes ${ourDiscount} off. The roster is priced from this ruleset either way — `
        + `the model is on it at ${costLabel(ownCost)} — and the two records disagree about why.`,
      );
    }

    comparePrice(profile.name, theirCost(line.purchase), ownCost,
      priceDifferences, warnings, theirName);

    const gear = readGear(dataset, shelf, factionId, factionName, m, profile, theirName,
      stamp, idx, unresolved, warnings, priceDifferences);

    const upgrades = readUpgrades(dataset, factionId, factionName, profile, m, theirName, golem,
      stamp, idx, equivalent, unresolved, priceDifferences, warnings, nullEquivalence);

    const trauma = readTrauma(dataset, m, theirName, unresolved);

    const tough = (profile.stats.keywords ?? []).some((k) => /^TOUGH$/i.test(k.trim()));
    const maxWounds = tough ? 2 : 1;

    const unitId = `u-tc-${stamp}-${idx}`;
    if (status.dead) deadIds.push(unitId);

    units.push({
      id: unitId,
      /* Their display name is the player's own name for the model; the
         catalogue's name stays on the snapshot, as the NewRecruit import
         leaves it. */
      customName: theirName,
      /*
        The Book of Golems, where their id said so (GOLEM-1).

        `md_takwincreation_golem` is the grant's own model, and `grantedBy` is
        what every rule that cares reads — the free-Formula allowance, and
        *"can never be Promoted"*. Marked from their record rather than
        guessed at by `golemOnImport`, which is the one case that function
        exists to handle and cannot: their record already says which model it
        was.
      */
      ...(golem ? { grantedBy: GOLEM_GRANTED_BY } : {}),
      baseProfileId: profile.id,
      profileSnapshot: profile,
      equippedWeapons: gear.weapons,
      equippedArmour: gear.armour,
      equippedEquipment: [...gear.equipment, ...upgrades.equipment],
      specialUpgrades: upgrades.bought,
      xp: num(m.experience),
      isElite: m.elite === true,
      advancements: [],
      skills: readSkills(dataset, m, theirName, unresolved),
      injuries: trauma.injuries,
      ...(trauma.scars.length ? { scars: trauma.scars } : {}),
      /* Their fighter status, read from `active`. See `fighterStatus`. */
      ...(status.benched ? { benched: true } : {}),
      isDead: false,
      /* A model a rule gave the Warband, and the rule that gave it. */
      ...(grantedFree ? { grantedFree: GOLEM_GRANTED_BY } : {}),
      /* Our prices, added up. Theirs is reported, never charged. */
      totalCost: ownCost.ducats + gear.ducats + upgrades.ducats,
      currentWounds: maxWounds,
      maxWounds,
      bloodMarkers: 0,
      blessingMarkers: 0,
      status: 'Active',
      hasActedThisTurn: false,
    });
  });

  /*
    The dead, off the roster and into the memorial.

    Through `removeFromRoster` rather than by filtering here: that function is
    the single path a removed model leaves by (RR-25 / FD-05a), and it is what
    clears the battle state, sets `isDead` and carries the Battlekit across.
    A model left in `units` behind a flag is a model every reader has to
    remember to skip, and three of them did not.
  */
  const { units: living, fallen } = removeFromRoster({ units, fallen: [] }, deadIds);

  /* -------------------------------------------------------------- the stash */
  /* After the Exploration read, because a row their record prices at nothing is
     explained by a Location the Warband holds — see `grantedByHeldLocation`. */

  /* ------------------------------------------------------- campaign state */

  const ratings = data.context?.stored_ratings ?? {};
  /*
    Only what their record actually states.

    A missing `campaign_round` was being recorded as round 1 — a fact about
    their campaign that their record never asserted, and one a player reading
    it here would take for their own. Absent stays absent.
  */
  const statedRound = stated(data.context?.campaign_round);
  const statedVp = stated(data.context?.victory_points);
  const round = statedRound ?? 1;
  const misses = num(data.context?.failed_promotions);

  const debts = data.debts;
  if (num(debts?.ducats) !== 0 || num(debts?.glory) !== 0) {
    warnings.push(
      `Their record carries a debt of ${num(debts?.ducats)} Ducats and ${num(debts?.glory)} Glory. `
      + 'TrenchLine has no debt of its own, so nothing was booked for it — the Strongbox below is '
      + 'the balance before any debt is settled.',
    );
  }

  const exploration = readExploration(dataset, shelf, data, round, stamp, equivalent,
    unmatched, unmapped);

  const stash = readStash(dataset, shelf, data.equipment ?? [], stamp,
    exploration.discoveries, unmatched, priceDifferences, warnings);
  /*
    One line per `_mv_` name no list here carries, listing the models under it
    and naming the Variant that DOES carry it, where one does.
  */
  for (const form of [...new Set(variantMisses.map((v) => v.form))]) {
    const rows = variantMisses.filter((v) => v.form === form);
    const carrier = variantWithEntryNamed(dataset, appFactionIds, factionId, form);
    warnings.push(
      `${listOf([...new Set(rows.map((r) => r.on))])}: their record files `
      + `${rows.length === 1 ? 'this model' : 'these models'} as '${form}', a Warband Variant's `
      + `own name for the entry. ${carrier
        ? `It is what the ${carrier.replace(/^the\s+/i, '')} list calls it, and this Warband is `
          + 'not that Variant'
        : 'No list this ruleset carries has an entry of that name'}`
      + `, so ${rows.length === 1 ? 'it is' : 'they are'} imported as `
      + `${rows[0].profile.name}, the entry their id names underneath, and priced at that entry's `
      + `${costLabel(ourUnitCost(rows[0].profile))}. Where a Variant reprices the model it `
      + 'renames, that is not the same price — check it against their record.',
    );
  }

  /*
    One line per id the table rules out, listing the models that carried it —
    not the same paragraph once per model.
  */
  for (const id of [...new Set(nullEquivalence.map((n) => n.id))]) {
    const rows = nullEquivalence.filter((n) => n.id === id);
    unmapped.push(
      `${id} ('${rows[0].theirs}') on ${listOf([...new Set(rows.map((r) => r.on))])}: `
      + rows[0].why,
    );
  }

  /*
    One line per thing this ruleset could not resolve, listing the models that
    carried it — see `Miss`. After the Warband-level lines, which are about the
    Warband rather than about a model.
  */
  for (const what of [...new Set(unresolved.map((x) => x.what))]) {
    const who = [...new Set(unresolved.filter((x) => x.what === what).map((x) => x.on))];
    unmatched.push(`${what}, on ${listOf(who)}`);
  }

  reportUnmapped(data, kept, dataset.keywords ?? [], unmapped);

  const now = new Date().toISOString();
  const bare: Warband = {
    id: `wb-tc-${stamp}`,
    name: (data.name ?? '').trim() || 'Imported Warband',
    factionId,
    variantId,
    /* The ruleset every name above was resolved against (RV-1). Without it
       the imported warband would be the one kind that cannot be converted:
       the conversion report needs to know what it is converting FROM. */
    ...(dataset.meta?.rulesetId ? { rulesetId: dataset.meta.rulesetId } : {}),
    forceMode: 'campaign',
    /* Their founding allowance, which is what a campaign Warband musters on. */
    ducatLimit: num(data.ducat_bank),
    treasuryDucats: 0,
    gloryPoints: 0,
    ledger: [],
    units: living,
    ...(fallen.length ? { fallen } : {}),
    /* What they hold, and what a Location gave — see `arsenalGrant`. */
    armoryStash: [...stash.items, ...exploration.granted],
    explorationDiscoveries: exploration.discoveries,
    explorationEffects: exploration.effects,
    ...(misses > 0 ? { promotionMisses: misses } : {}),
    /* Recorded only when their record says something. See `stated` above. */
    ...(statedRound !== undefined || statedVp !== undefined
      ? {
        importedCampaign: {
          source: 'trench-companion' as const,
          ...(statedRound !== undefined ? { round: statedRound } : {}),
          ...(statedVp !== undefined ? { victoryPoints: statedVp } : {}),
        },
      }
      : {}),
    ...(patron ? { patron } : {}),
    ...(typeof data.notes === 'string' && data.notes.trim() ? { notes: data.notes.trim() } : {}),
    createdAt: now,
    updatedAt: now,
    editedAt: now,
  };

  const warband = openFoundingPot(
    bare,
    /* The founding allowance, in both currencies, exactly as their record
       banks it. `bare.gloryPoints` is 0 here by construction — money enters
       this warband through `book` and nowhere else — so the Glory allowance
       has to come from `glory_bank` rather than be read back off the object. */
    { ducats: num(data.ducat_bank), glory: num(data.glory_bank) },
    ratings, warnings, now,
  );

  /*
    Deduplicated, because the same sentence is true of every model that
    carries the item: five Corpse Guards with a Grail Devotee each is one
    fact about the Grail Devotee, not five, and a report a player scrolls
    past is a report a player does not read.
  */
  return {
    warband,
    unmatched,
    warnings: [...new Set(warnings)],
    /* Deduplicated for the same reason as the warnings: three Kavass each
       carrying the Variant's own rename is one fact about the Variant. */
    unmapped: [...new Set(unmapped)],
    priceDifferences: dedupePrices(priceDifferences),
  };
}

/** One line per item, however many models carry it. See the call site. */
const dedupePrices = (list: PriceDifference[]): PriceDifference[] => {
  const seen = new Set<string>();
  return list.filter((d) => {
    const k = `${d.name}|${d.theirs.ducats}/${d.theirs.glory}|${d.ours.ducats}/${d.ours.glory}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

/* ------------------------------------------------------------------ parts */

/**
 * The envelope's `warband_data`, parsed.
 *
 * Their shape is a JSON STRING inside a JSON envelope. The route has already
 * proved it parses; this parses it again rather than trusting that, because
 * this function is also called directly from a test and from a fixture, and
 * "somebody else checked" is not an invariant.
 */
function readWarbandData(envelope: TrenchCompanionEnvelope): TcWarbandData {
  const raw = envelope?.warband_data;
  if (isRecord(raw)) return raw as TcWarbandData;
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error(
      'That response carries no warband_data, so there is nothing to import from it.',
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('That response\'s warband_data is not JSON. Nothing was imported.');
  }
  if (!isRecord(parsed)) {
    throw new Error('That response\'s warband_data is not a warband. Nothing was imported.');
  }
  return parsed as TcWarbandData;
}

/**
 * The faction and Warband Variant, from the one id that names both.
 *
 * `fc_ironsultanate_fv_houseofwisdom` is the faction slug and, after `_fv_`,
 * the Variant slug. Both are slugs of the published names, so both resolve by
 * name — the Variant against our own `id` first, because our ids are already
 * that slug (`houseofwisdom`), and against the printed name second, with a
 * leading `The` folded away on BOTH sides so `The Great Hunger` and
 * `fv_thegreathunger` agree whichever of them carries the article.
 *
 * A faction that does not resolve throws. Every model, every item and every
 * price is scoped by it, so carrying on would produce a roster built against
 * whichever faction happened to be first in the list.
 */
function readFaction(
  dataset: Dataset,
  data: TcWarbandData,
  appFactionIds: string[],
  unmatched: string[],
): { factionId: string; factionName: string; variantId?: string } {
  const id = refId(data.faction?.faction_property);
  if (!id) {
    throw new Error('That warband names no faction, so it cannot be imported.');
  }

  const [factionPart, variantPart] = id.split('_fv_');
  const factionSlug = nameKey(slugTail(factionPart));

  const faction = (dataset.factions ?? []).find((f) =>
    nameKey(f.id ?? '') === factionSlug || nameKey(f.name) === factionSlug);
  if (!faction) {
    throw new Error(
      `'${factionPart}' is not a faction this ruleset carries, so the warband cannot be imported. `
      + `This ruleset has: ${(dataset.factions ?? []).map((f) => f.name).join(', ')}.`,
    );
  }
  const factionId = appFactionIds.find((f) => sameFaction(f, faction.id ?? faction.name))
    ?? faction.id ?? faction.name;

  if (!variantPart) return { factionId, factionName: faction.name };

  /* The article, folded on both sides. Our `The House of Wisdom` has the id
     `houseofwisdom`; their `The Great Hunger` has the slug `thegreathunger`. */
  const dropThe = (s: string) => s.replace(/^the/, '');
  const want = nameKey(variantPart);
  const variant = (dataset.variants ?? []).find((v) =>
    nameKey(v.id) === want
    || nameKey(v.name) === want
    || dropThe(nameKey(v.id)) === dropThe(want)
    || dropThe(nameKey(v.name)) === dropThe(want));

  if (!variant) {
    unmatched.push(
      `Warband Variant '${variantPart}' — this ruleset has no such Variant for ${faction.name}, `
      + 'so the warband was imported as the faction\'s standard list.',
    );
    return { factionId, factionName: faction.name };
  }
  return { factionId, factionName: faction.name, variantId: variant.id };
}

/**
 * Which of this faction's Variants calls an entry by that name, if any.
 *
 * Asked only when a `_mv_` name resolved to nothing in the Warband's own list,
 * which is rare — so the cost of building each Variant's list here is paid
 * once, on a report line that would otherwise state something false.
 *
 * The Variant's printed name, for a player to read: "it is what the Defenders
 * of the Iron Wall list calls it, and this Warband is not that Variant" is an
 * answer; "no list carries that name" was not.
 */
function variantWithEntryNamed(
  dataset: Dataset,
  appFactionIds: string[],
  factionId: string,
  name: string,
): string | undefined {
  const want = nameKey(name);
  for (const variant of dataset.variants ?? []) {
    if (!sameFaction(variant.factionId, factionId)) continue;
    const list = recruitable(dataset, factionId, appFactionIds, variant.id);
    if (list.units.some((u) => nameKey(u.name) === want)) return variant.name;
  }
  return undefined;
}

/**
 * The Patron the Warband took, from their `patron_id`.
 *
 * `pt_houseofwisdom` against this ruleset's `HOUSE OF WISDOM`: `nameKey` folds
 * the case and the spaces, so their slug is our name with a prefix on it.
 *
 * Worth reading rather than reporting, because the Patron is not a label. Both
 * ends of every 2D6 Skill Table are a `Patron Skill` result, and
 * `advancement.ts`'s `patronSkillsFor` matches `warband.patron` against these
 * names to fill them — so a warband imported without its Patron loses the
 * roll of 2 and the roll of 12 on every Advancement Roll it ever makes.
 *
 * Stored as the NAME because that is what the field holds and what the lookup
 * matches: `warband.patron` is free text a player typed before the Patrons
 * were derived data.
 *
 * One that does not resolve is reported and left unset. A Patron decides which
 * six Skills a model may pick from, and the wrong one is six wrong Skills.
 */
function readPatron(
  dataset: Dataset,
  data: TcWarbandData,
  unmatched: string[],
): string | undefined {
  const id = String(data.faction?.patron_id ?? '').trim();
  if (!id) return undefined;
  const hit = uniqueByName(dataset.patrons ?? [], (p) => p.name, [nameKey(slugTail(id))]);
  if (!hit) {
    unmatched.push(
      `Patron '${id}' — this ruleset has no Patron of that name, so none is recorded. `
      + `It carries: ${(dataset.patrons ?? []).map((p) => p.name).join(', ')}.`,
    );
    return undefined;
  }
  return hit.name;
}

/**
 * The catalogue entry one of their models is an instance of.
 *
 * By name within the faction first, because that is what makes a name unique
 * — five factions field a `Homunculus` — then by their `md_` slug, which is a
 * slug of the same name and catches a display name a Variant has renamed.
 *
 * Then both tests again across the whole recruitable list, and **only when
 * exactly one entry carries the name**: a Mercenary sits on a roster whose
 * faction is not its own, so restricting to the Warband's faction would fail
 * every one of them. Ambiguity there resolves to nothing rather than to the
 * first match — see `uniqueByName`.
 */
function resolveModel(
  units: UnitProfile[],
  factionId: string,
  theirName: string,
  theirSlug: string | undefined,
  equivalent: Equivalence,
): { profile?: UnitProfile; golem: boolean; variantMiss?: string } {
  const golem = golemStripped(slugTail(theirSlug ?? '')).golem;
  const mine = units.filter((u) => sameFaction(u.factionId, factionId));
  const pick = (keys: string[]) => (keys.length
    ? uniqueByName(mine, (u) => u.name, keys) ?? uniqueByName(units, (u) => u.name, keys)
    : undefined);

  /*
    The SLUG first, and the name second.

    On the first warband this was measured against, every `model.name` was the
    entry's own display name, so resolving by name worked — by accident. On
    the owner's warband it is the PLAYER's name: `Jawhar al-Sari` on a
    `md_mamlukfaris`, `Al-Qahhar, the Crippled` on a `md_brazenbull`. Matching
    those against our entries resolves nothing at best, and at worst resolves
    a nickname to some other entry that happens to share it.

    Their id is the stable half of their record, so it goes first. The name is
    kept as the fallback for an id no rule reaches, and it is otherwise the
    player's own name for the model — `customName`, nothing more.
  */
  /*
    Their slug's three readings, tried one at a time rather than as a list, so
    the caller can be told WHICH one answered.

    Their ids carry structure, and it is structure about OUR data:

      `md_azeb_mv_kavass`        the Azeb under a named Variant; `_mv_`
                                 separates the base entry from the Variant's
                                 own name for it, and our Variant-applied list
                                 calls that model a "Kavass".
      `md_takwincreation_golem`  the same entry, created by the Book of Golems.
                                 The suffix says how the model ARRIVED and not
                                 which entry it is, so it is stripped first and
                                 answered separately (GOLEM-1).

    So: the whole slug, then the part after `_mv_`, then the part before it.

    `md_azeb_mv_kavass` resolves on its `_mv_` half in a House of Wisdom
    Warband, because that list calls the Azeb a Kavass. The same slug in a
    Warband without that Variant resolves on the base entry instead — and that
    is a fact the player needs, because a Variant can reprice the model as well
    as rename it. `md_mamlukfaris_mv_sipahi` is the case that proves it: the
    Defenders of the Iron Wall state the Sipahi as a Variant RULE — "can
    include up to 1 Sipahi Automaton Cavalry Mercenary at a cost of 110 ducats
    … they use the Mercenary Entry for a Mamluk Faris" — so this ruleset has no
    entry of that name in any list, and the base Mamluk Faris it falls back to
    costs 4 Glory and no Ducats at all.
  */
  const tail = golemStripped(slugTail(theirSlug ?? '')).slug;
  const [before, after] = tail.includes('_mv_') ? tail.split('_mv_') : [tail, ''];

  const byWhole = tail ? pick([nameKey(tail)]) : undefined;
  if (byWhole) return { profile: byWhole, golem };
  const byVariantName = after ? pick([nameKey(after)]) : undefined;
  if (byVariantName) return { profile: byVariantName, golem };
  const byBase = before ? pick([nameKey(before)]) : undefined;
  if (byBase) return { profile: byBase, golem, ...(after ? { variantMiss: after } : {}) };

  /*
    Their id where no rule of spelling reaches our name. Each entry cites both
    sides; see `EQUIVALENT` for how many there are and what guards them.

    Looked up under the golem-stripped id as well as the raw one, because
    `_golem` says how the model arrived and not which entry it is:
    `md_takwincreation_golem` and `md_takwincreation` are the same Takwin
    Homunculus, and the table names the entry once.
  */
  const bare = theirSlug ? `md_${golemStripped(slugTail(theirSlug)).slug}` : '';
  const named = (theirSlug ? equivalent[theirSlug] : undefined) ?? equivalent[bare];
  if (named?.ours) {
    const byTable = pick([nameKey(named.ours)]);
    if (byTable) return { profile: byTable, golem };
  }

  return { profile: pick([nameKey(theirName)].filter(Boolean)), golem };
}

/** Our price for an entry, in both currencies. */
const ourUnitCost = (u: UnitProfile): Cost =>
  ({ ducats: u.baseCost, glory: u.gloryCost ?? 0 });

/**
 * Record a price that differs, and say when one could not be read.
 *
 * Both are the report's job rather than the roster's: the roster is priced
 * from our dataset either way (rule 1). What the player needs is to be told,
 * per item, that the number moved — a 5-Ducat difference across a dozen models
 * is the difference between a legal roster and an illegal one.
 */
function comparePrice(
  name: string,
  theirs: Cost | null,
  ours: Cost,
  into: PriceDifference[],
  warnings: string[],
  /** The model it was read on, or the Arsenal. See `PriceDifference.where`. */
  where = '',
): void {
  if (!theirs) {
    const line = `${name}: their record does not state a price this import can read — either `
      + 'none at all, or one in a currency it does not know — so their price is not compared. '
      + 'It is priced here from this ruleset, as everything on the roster is.';
    if (!warnings.includes(line)) warnings.push(line);
    return;
  }
  if (sameCost(theirs, ours)) return;
  /* One line per item, listing the models — see `PriceDifference.where`. */
  const seen = into.find((d) => d.name === name
    && sameCost(d.theirs, theirs) && sameCost(d.ours, ours));
  if (seen) {
    if (where && !seen.where.includes(where)) seen.where.push(where);
    return;
  }
  into.push({ name, theirs, ours, where: where ? [where] : [] });
}

/**
 * One standing Exploration effect, in words, for a report a person reads.
 *
 * The fields are `ExplorationEffect`'s: a Skill is a name, and the other three
 * are numbers the book states in a sentence.
 */
const saidEffect = (e: NonNullable<Warband['explorationEffects']>[number]): string => {
  if (e.gloryItemsUpTo) {
    return `Glory Items up to ${e.gloryItemsUpTo} Glory, purchasable from now on`;
  }
  if (e.lootBonus) return `${e.lootBonus} Ducats more loot each Exploration Step`;
  if (e.gloryItemOnce) return `one Glory Item up to ${e.gloryItemOnce} Glory`;
  return `the ${e.name} Exploration Skill`;
};

/** `a`, `a and b`, `a, b and c` — for a report a person reads. */
const listOf = (names: readonly string[]): string =>
  (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

const costLabel = (c: Cost) =>
  [c.ducats ? `${c.ducats} Ducats` : null, c.glory ? `${c.glory} Glory` : null]
    .filter(Boolean).join(' + ') || 'free';

/** The report line for one price difference, for the screens that print it. */
export const priceDifferenceLine = (d: PriceDifference): string =>
  `${d.name}: ${costLabel(d.theirs)} in Trench Companion, ${costLabel(d.ours)} here.`
  + (d.where.length ? ` On ${d.where.join(', ')}.` : '');

/* --------------------------------------------------------------- the gear */

type Shelf = ReturnType<typeof recruitable>;

/**
 * One model's Battlekit, resolved by name against what this Warband can buy.
 *
 * Three shelves, in order, and every one of them is our dataset:
 *
 *  1. **this faction's Armoury**, which is where a price for wargear lives —
 *     the same item is priced differently by different factions, so this is
 *     the only shelf that can answer "what does it cost *this* Warband";
 *  2. **the model's own entry options**, for gear a model buys off its own
 *     entry rather than off the table — the Executor's `Urn of Bitter Ashes`
 *     is not an Armoury row anywhere;
 *  3. **the catalogue's Battlekit**, for an entry that is real but that this
 *     faction's table does not stock. It is priced at the catalogue's own
 *     cost and the report says the Armoury does not carry it, because the
 *     legality strip is about to say the same thing and a player should hear
 *     it here first.
 *
 * Anything none of them has is named in `unmatched` and left off the model.
 */
/**
 * Kit our own entry carries, which was never a purchase.
 *
 * Their record lists a model's Battlekit as equipment lines like any other —
 * `Combat Helmet` and `Reinforced Armour` on the Scripture Guardian, the
 * Sapper's own `Shovel` — and this import priced every one of them off the
 * Armoury Table, so a model the catalogue prices WITH its kit was charged for
 * that kit a second time: 45 Ducats on the Guardian, 5 on the Sapper.
 * `rules/battlekit.ts` is the file that exists to stop exactly that
 * double-buy, and `carriesAsBattlekit` is the same answer the equip sheet uses
 * to hide an Armoury row from a model that already has the item.
 *
 * Nothing is lost by leaving the line off the equipped lists: forced kit lives
 * on the profile snapshot, which is where the card renders it (`UnitCard`),
 * where the carrying limits count it (`battlekitLimits`) and where the
 * Mercenary rule reads it (`validate.ts`). Putting it in `equippedArmour` as
 * well would print it twice and give a Mercenary's Battlekit — which "cannot
 * be removed or lost over the course of the campaign for any reason" — a
 * delete button.
 *
 * Priced at nothing because the catalogue prices the model to include it: all
 * 21 entries that carry kit in the shipped ruleset state its cost as 0, and
 * the New Antioch Combat Medic is that arithmetic in the open (40 plus
 * Standard Armour 15, Gas Mask 5 and Medi-kit 5 is the book's printed 65 — see
 * `rules/battlekit.ts`).
 */
function entryCarries(
  profile: UnitProfile,
  names: readonly (string | undefined)[],
): boolean {
  return names.some((n) => !!n && carriesAsBattlekit(profile, { name: n }));
}

/**
 * Kit THEIR record says the model came with, where ours does not hold it.
 *
 * Read off the relation, which is their own structure and not a guess about
 * their prices: `rel_fc_eq_jezzail` is a Faction Armoury row, while
 * `rel_md_eq_mamlukfarisbase` is the MODEL's equipment relation — and they
 * price those lines at `cost_value: 0`.
 *
 * The Mamluk Faris is the live case. The errata gives it "Reinforced Armour, a
 * Combat Helmet, and a a Jezzail with Alchemical Ammunition from the Iron
 * Sultanate Faction List" inside its 4-Glory price (Warbands 1.0.2 p179,
 * `data-sources/rulebook/extracted/changelog-1.0.2.txt`), and the catalogue
 * states the armour and the helmet as `infoLinks` rather than as forced
 * `entryLink`s (`Mercenaries.cat` from L1478), which is why our pipeline
 * carries no Battlekit for the entry at all — the gap `equipGate.ts`'s
 * `mercenaryRefusal` documents. Pricing those four lines off the Armoury added
 * 55 Ducats to a model whose price is 4 Glory.
 *
 * Taking their 0 here invents no cost: it reads the one their record states,
 * for a line their record also says is not a purchase. It is reported rather
 * than applied silently, because a price that came from their file instead of
 * from this ruleset is one the player has to be able to check.
 */
const includedInTheirModel = (e: TcEquipment): boolean =>
  /^rel_md_eq_/.test(e.purchase?.faction_rel_id ?? '')
  && num(e.purchase?.cost_value) === 0;

function readGear(
  dataset: Dataset,
  shelf: Shelf,
  factionId: string,
  factionName: string,
  m: TcModelInner,
  profile: UnitProfile,
  modelLabel: string,
  stamp: number,
  idx: number,
  misses: Miss[],
  warnings: string[],
  priceDifferences: PriceDifference[],
): { weapons: EquippedWeapon[]; armour: EquippedArmour[]; equipment: EquippedEquipment[]; ducats: number } {
  const weapons: EquippedWeapon[] = [];
  const armour: EquippedArmour[] = [];
  const equipment: EquippedEquipment[] = [];
  let ducats = 0;
  /* Reported once for the model, not once per item. See below. */
  const includedFree: string[] = [];

  (m.equipment ?? []).forEach((e, j) => {
    const theirName = (e.equipment?.name ?? '').trim();
    const relName = (e.purchase?.custom_rel?.name ?? '').trim();
    const label = theirName || relName || e.equipment?.id || 'an unnamed item';
    const keys = namesFor(theirName, relName, e.equipment?.id);
    if (!keys.length) {
      misses.push({ what: 'an item with no name', on: modelLabel });
      return;
    }

    const instance = `tc-${stamp}-${idx}-${j}`;

    /* Kit this entry carries. Off the purchase list, and on the profile. */
    if (entryCarries(profile, [theirName, relName])) return;

    /* Kit theirs hands the model, where ours does not record the entry's. */
    const included = includedInTheirModel(e);
    if (included) includedFree.push(label);
    /** Nothing, for a line that is not a purchase. Otherwise the shelf's price. */
    const chargeD = (d: number) => (included ? 0 : d);
    const chargeG = (g: number | undefined) => (included ? undefined : g || undefined);

    const w = uniqueByNameOrAlias(shelf.weapons, keys);
    if (w) {
      weapons.push({
        ...w, cost: chargeD(w.cost), gloryCost: chargeG(w.gloryCost),
        instanceId: `w-inst-${instance}`,
      });
      ducats += chargeD(w.cost);
      comparePrice(w.name, theirCost(e.purchase),
        { ducats: chargeD(w.cost), glory: chargeG(w.gloryCost) ?? 0 },
        priceDifferences, warnings, modelLabel);
      return;
    }

    const a = uniqueByNameOrAlias(shelf.armour, keys);
    if (a) {
      armour.push({
        ...a, cost: chargeD(a.cost), gloryCost: chargeG(a.gloryCost),
        instanceId: `a-inst-${instance}`,
      });
      ducats += chargeD(a.cost);
      comparePrice(a.name, theirCost(e.purchase),
        { ducats: chargeD(a.cost), glory: chargeG(a.gloryCost) ?? 0 },
        priceDifferences, warnings, modelLabel);
      return;
    }

    const q = uniqueByNameOrAlias(shelf.equipment, keys);
    if (q) {
      equipment.push({
        ...q, cost: chargeD(q.cost), gloryCost: chargeG(q.gloryCost),
        instanceId: `e-inst-${instance}`,
      });
      ducats += chargeD(q.cost);
      comparePrice(q.name, theirCost(e.purchase),
        { ducats: chargeD(q.cost), glory: chargeG(q.gloryCost) ?? 0 },
        priceDifferences, warnings, modelLabel);
      return;
    }

    const entry = catalogueUnitFor(dataset, { baseProfileId: profile.id }, factionId);
    const option = uniqueByName(entry?.options ?? [], (o) => o.name, keys);
    if (option) {
      equipment.push({
        id: `opt-${nameKey(option.name)}`,
        name: option.name,
        cost: chargeD(option.cost.ducats),
        gloryCost: chargeG(option.cost.glory),
        effect: option.description || '',
        group: option.groupPath ?? option.group,
        category: option.group,
        instanceId: `e-inst-${instance}`,
      });
      ducats += chargeD(option.cost.ducats);
      comparePrice(option.name, theirCost(e.purchase),
        { ducats: chargeD(option.cost.ducats), glory: chargeG(option.cost.glory) ?? 0 },
        priceDifferences, warnings, modelLabel);
      return;
    }

    const loose = uniqueByNameOrAlias(dataset.weapons ?? [], keys);
    if (loose) {
      const section = (dataset.battlekit ?? []).find((b) => nameKey(b.name) === nameKey(loose.name))?.section;
      if (!included) {
        warnings.push(
          `${loose.name} is in this ruleset but is not on the ${factionName} Armoury Table, so it `
          + `is priced at the catalogue's own ${costLabel(loose.cost)}. The legality check will `
          + 'report it as not stocked.',
        );
      }
      const looseCost: Cost = {
        ducats: chargeD(loose.cost.ducats), glory: chargeG(loose.cost.glory) ?? 0,
      };
      ducats += looseCost.ducats;
      comparePrice(loose.name, theirCost(e.purchase), looseCost, priceDifferences, warnings,
        modelLabel);
      if (section === 'Armour' || section === 'Shields') {
        armour.push({
          id: loose.id, name: loose.name, cost: looseCost.ducats,
          gloryCost: looseCost.glory || undefined,
          modifier: loose.keywords.find((kw) => /INJURY MODIFIER/i.test(kw)),
          keywords: loose.keywords, category: section,
          instanceId: `a-inst-${instance}`,
        });
      } else if (section === 'Equipment' || !section) {
        equipment.push({
          id: loose.id, name: loose.name, cost: looseCost.ducats,
          gloryCost: looseCost.glory || undefined,
          effect: loose.rules ?? '', keywords: loose.keywords,
          category: section ?? 'Equipment',
          instanceId: `e-inst-${instance}`,
        });
      } else {
        weapons.push({
          id: loose.id, name: loose.name, cost: looseCost.ducats,
          gloryCost: looseCost.glory || undefined,
          type: /melee/i.test(loose.range) ? (/\//.test(loose.range) ? 'Both' : 'Melee') : 'Ranged',
          range: loose.range,
          modifiers: loose.keywords.filter((kw) => /DICE|INJURY|ARMOUR PIERCING/i.test(kw)).join(', ') || '-',
          keywords: loose.keywords,
          hands: loose.type === '2-Handed' ? 2 : loose.type === '1-Handed' ? 1 : undefined,
          category: section,
          instanceId: `w-inst-${instance}`,
        });
      }
      return;
    }

    misses.push({ what: label, on: modelLabel });
  });

  /*
    One line for the model, naming its kit, rather than one line per item: the
    Mamluk Faris's four made the same statement four times over, and a report
    that repeats itself is one a player stops reading.
  */
  if (includedFree.length) {
    warnings.push(
      `${modelLabel}: ${listOf(includedFree)} ${includedFree.length === 1 ? 'is' : 'are'} kit `
      + "their record hands the model at no cost, and this ruleset does not record it as the "
      + 'entry\'s Battlekit. It is on the roster at nothing, as their record prices it, rather '
      + `than at the ${factionName} Armoury price — the model's own price already includes it.`,
    );
  }

  return { weapons, armour, equipment, ducats };
}

/**
 * A model's purchased upgrades, against its own entry's option groups.
 *
 * Their `up_` ids are namespaced by the model — `up_plagueknightrottencross`
 * is the Plague Knight's — so the model's own slug is stripped from the front
 * before the name is compared. That is not a fuzzy match: it removes a prefix
 * this file knows the meaning of, and what is left is still matched in full.
 */
function readUpgrades(
  dataset: Dataset,
  factionId: string,
  factionName: string,
  profile: UnitProfile,
  m: TcModelInner,
  modelLabel: string,
  /** Created by the Book of Golems, which supplies one Formula. */
  golem: boolean,
  stamp: number,
  idx: number,
  equivalent: Equivalence,
  misses: Miss[],
  priceDifferences: PriceDifference[],
  warnings: string[],
  nullEquivalence: NullEquivalence[],
): {
  bought: { id: string; name: string; cost: number; category: string }[];
  /** What their record files as an upgrade and this ruleset holds as gear. */
  equipment: EquippedEquipment[];
  ducats: number;
} {
  const bought: { id: string; name: string; cost: number; category: string }[] = [];
  const equipment: EquippedEquipment[] = [];
  let ducats = 0;
  const list = m.list_upgrades ?? [];
  if (!list.length) return { bought, equipment, ducats };

  const entry = catalogueUnitFor(dataset, { baseProfileId: profile.id }, factionId);

  /*
    What the Book of Golems pays for, priced the way the app's own path prices
    it (`formulaShelf.ts`, and the purchase `AddEquipmentModal` writes from it).

    *"It has the Human Hands Alchemical Formula, plus Alchemical Formulas worth
    a total of up to 50 👑 for free (you do not have to pay for the Formulas
    that you choose)."* Two things, and round 1 only did the first:

      the named Formula        given, so priced at nothing
      the next 50 Ducats       of Alchemical Formulae, also at nothing

    Read from the grant rather than by name or by number — `golem.ts` reads
    both out of the shipped Exploration table — so a Dispatch that renames the
    Formula or moves the allowance needs no edit here.

    Allocated in the order their record lists them, which is the order the
    player bought them in and the order `formulaShelf` would have charged them:
    free while the allowance stretches, priced from the entry once it does not.
    A Formula costing Glory is never covered, for the same reason the shelf
    does not cover one: the allowance is stated in Ducats.
  */
  const grant = golem ? golemGrant(dataset) : null;
  const givenFormula = nameKey(grant?.startsWith ?? '');
  /** Ducats of the allowance still unspent. See the note above. */
  let freeLeft = grant?.freeFormulaDucats ?? 0;

  for (const u of list) {
    const id = refId(u.upgrade);

    /*
      The slug rules run FIRST, and the table only answers what they miss.

      The other way round is how `up_meleemight` came to be dropped: a table
      entry that said "nothing to resolve to" was consulted before the rules
      that would have found something, so a wrong `null` hid a real answer and
      three models each lost 5 Ducats and a point of Melee. A table is allowed
      to fill a gap; it is not allowed to shadow a resolution.
    */
    const keys = upgradeSlugKeys(id, m.model);
    /** The entry's own options, and then the gear shelf — see below. */
    const bySlug = (k: string[]) => {
      const opt = uniqueByName(entry?.options ?? [], (o) => o.name, k);
      return { opt, loose: opt ? undefined : uniqueByNameOrAlias(dataset.weapons ?? [], k) };
    };
    let { opt: option, loose } = bySlug(keys);

    /*
      The table, and only now.

      EVERY slug rule first, the gear shelf included. Round 1 put the table
      after the option lookup and before the shelf, which is the same defect
      one shelf over: a `{ ours: null }` entry for `up_secrets_secretsoftakwin`
      would have dropped the Secrets of Takwin — which the shelf below resolves
      — and every guard on the table would have stayed green. A table may fill
      a gap; it may not shadow a resolution, wherever the resolution lives.
    */
    if (!option && !loose) {
      const named = equivalent[id];
      if (named?.ours) {
        const byTable = bySlug([nameKey(named.ours)]);
        option = byTable.opt;
        loose = byTable.loose;
      }
      if (!option && !loose && named && named.ours === null) {
        nullEquivalence.push({ id, theirs: named.theirs, why: named.why, on: modelLabel });
        continue;
      }
    }

    /*
      Their "upgrades" and our options are not the same split.

      *Secrets of Takwin* is the case: their record files it as an upgrade on
      the Alchemist, and this ruleset carries it as a Battlekit-typed entry of
      the Iron Sultanate's — the catalogue states the House of Wisdom's Secrets
      in a `Secrets of the House of Wisdom` group on the WARBAND rather than on
      the model (`Iron Sultanate.cat:2831`), so the pipeline emits it beside the
      gear and not among the Alchemist's own options. The model may have it —
      "Each Jabirean Alchemist in a House of Wisdom Warband can have one of
      following abilities at the cost indicated below" — so it is resolved
      there rather than reported as missing, and lands on the model as the
      thing this ruleset holds: an item, at the catalogue's own price.

      The same third shelf `readGear` uses, and the same sentence about it: the
      Armoury Table does not stock it, and the legality strip will say so.
    */
    if (!option) {
      if (loose) {
        warnings.push(
          `${modelLabel}: ${loose.name} is recorded as an upgrade in their record and as a `
          + `${loose.type || 'Battlekit'} entry in this ruleset, which the ${factionName} Armoury `
          + `Table does not stock. It is on the model at the catalogue's own `
          + `${costLabel(loose.cost)}, and the legality check will report it as not stocked.`,
        );
        equipment.push({
          id: loose.id,
          name: loose.name,
          cost: loose.cost.ducats,
          gloryCost: loose.cost.glory || undefined,
          effect: loose.rules ?? '',
          keywords: loose.keywords,
          category: 'Battlekit',
          /* `-upgrade-` says where it came from: their upgrade list rather
             than their equipment list. The gear reader numbers its instances
             by the line's index instead. */
          instanceId: `e-inst-tc-${stamp}-${idx}-upgrade-${nameKey(loose.name)}`,
        });
        ducats += loose.cost.ducats;
        comparePrice(loose.name, theirCost(u.purchase), loose.cost, priceDifferences, warnings,
          modelLabel);
        continue;
      }
    }

    if (!option) {
      misses.push({ what: `upgrade '${id || 'unnamed'}'`, on: modelLabel });
      continue;
    }
    const list: Cost = { ducats: option.cost.ducats, glory: option.cost.glory };
    const granted = !!givenFormula && nameKey(option.name) === givenFormula;
    /* The allowance, spent in their record's order. */
    const covered = !granted && !!grant && isAlchemicalFormula(option)
      && !list.glory && freeLeft >= list.ducats;
    if (covered) freeLeft -= list.ducats;
    /*
      A Formula the allowance does not stretch to.
      The app's own shelf does not merely price one of these — it refuses it:
      the grant's own sentence says the model "can never be Promoted or receive
      additional Alchemical Formulas", and `formulaShelf` returns that text as
      the reason. Their record holds it, so it is on the model at the entry's
      price rather than dropped, and the report says which rule that crosses.
    */
    if (grant?.noFurtherFormulas && !granted && !covered && isAlchemicalFormula(option)) {
      warnings.push(
        `${modelLabel}: ${option.name} costs ${costLabel(list)} and is beyond the `
        + `${grant.freeFormulaDucats} Ducats of Formulae the ${grant.name} gives this model. That `
        + 'grant states it can receive no additional Alchemical Formulas, so the Formulas tab '
        + 'here refuses this one outright. It is on the model as their record holds it, priced '
        + "from the entry — the refusal is this ruleset's rule, and the disagreement is theirs.",
      );
    }
    const cost: Cost = granted || covered ? { ducats: 0, glory: 0 } : list;
    bought.push({
      id: `su-${nameKey(option.name)}`,
      name: option.name,
      cost: cost.ducats,
      /*
        The group PATH, not the leaf — what `AddEquipmentModal` writes when the
        same Formula is bought in the app, for the reason FD-13a states:
        `formulaeOf` decides what is a Formula by asking whether the category
        CONTAINS `Alchemical Formulae`, and an `Eye Options` leaf fails that
        test. Imported with the leaf, Hawk Eyes and Hypnotic Eyes were not
        Formulae on the model that held them — not in `traitsOf`, not in the
        card's Formula section, not in the Takwin gates.
      */
      category: option.groupPath ?? option.group,
    });
    ducats += cost.ducats;
    comparePrice(option.name, theirCost(u.purchase), cost, priceDifferences, warnings,
      modelLabel);
  }
  return { bought, equipment, ducats };
}

/**
 * The Skills a model has learned, by name against the four Advancement tables.
 *
 * The table a Skill is on is its category here, and the roll that produces it
 * is recorded with it, because that is what `ActiveUnit.skills` holds for a
 * Skill learned in the app — an imported model and a home-grown one are the
 * same shape or the advancement sheet has two cases to remember.
 */
function readSkills(
  dataset: Dataset,
  m: TcModelInner,
  modelLabel: string,
  misses: Miss[],
): ActiveUnit['skills'] {
  const tables = dataset.campaign?.skills ?? {} as Dataset['campaign']['skills'];
  const rows = Object.entries(tables).flatMap(([table, list]) =>
    (list ?? []).map((r) => ({ ...r, table })));

  const out: NonNullable<ActiveUnit['skills']> = [];
  for (const ref of m.list_skills ?? []) {
    const id = refId(ref);
    const hit = uniqueByName(rows, (r) => r.name, [nameKey(slugTail(id))]);
    if (!hit) {
      misses.push({ what: `Skill '${id || 'unnamed'}'`, on: modelLabel });
      continue;
    }
    out.push({
      name: hit.name, category: hit.table, roll: String(hit.roll), effect: hit.description,
    });
  }
  return out.length ? out : undefined;
}

/**
 * The injuries a model carries, and the Battle Scars that go with them.
 *
 * Their `list_injury` is the injuries, and `scar_reserves` is the Scars a
 * model carries **beyond** them. Measured on the owner's own Companion screen
 * (25 September): Al-Qahhar, the Crippled carries `in_lostarm` and
 * `scar_reserves: 0`, and their screen shows exactly one Battle Scar. So the
 * count is one Scar per injury plus the reserves — which is what the book
 * implies, because a Full Recovery and a paid ransom each leave a Scar with no
 * injury behind it.
 *
 * Both halves land on `ActiveUnit.scars`, because that is the list
 * `scarCount` reads and `unfitForDuty` retires a model on. Writing only
 * `injuries` would have left an imported model judged by a different rule from
 * a home-grown one: `scars` and `injuries` are separate arrays on purpose, and
 * RC-05 is specifically about not inferring one from the other.
 */
function readTrauma(
  dataset: Dataset,
  m: TcModelInner,
  modelLabel: string,
  misses: Miss[],
): { injuries: string[]; scars: NonNullable<ActiveUnit['scars']> } {
  const rows = dataset.campaign?.trauma ?? [];
  const injuries: string[] = [];
  const scars: NonNullable<ActiveUnit['scars']> = [];

  for (const ref of m.list_injury ?? []) {
    const id = refId(ref);
    const hit = uniqueByName(rows, (r) => r.name, [nameKey(slugTail(id))]);
    if (!hit) {
      misses.push({ what: `injury '${id || 'unnamed'}'`, on: modelLabel });
      continue;
    }
    injuries.push(hit.name);
    /* The Scar that came with it, carrying the row's own name and roll. */
    scars.push({ name: hit.name, roll: hit.roll, effect: hit.description });
  }

  /*
    The Scars with no injury beside them.

    Named as what they are rather than given a Trauma row they do not have: we
    know how MANY there are and nothing else, and inventing a result to label
    each one would be exactly the fabrication rule 2 forbids.
  */
  const reserves = Math.max(0, num(m.scar_reserves));
  for (let i = 0; i < reserves; i += 1) {
    scars.push({
      name: 'Battle Scar',
      effect: 'Carried over from Trench Companion, which records the count but not '
        + 'which Trauma result caused it.',
    });
  }

  return { injuries, scars };
}

/** The Warband's stash, by the same three shelves a model's gear uses. */
function readStash(
  dataset: Dataset,
  shelf: Shelf,
  list: TcEquipment[],
  stamp: number,
  /** The Locations this Warband holds. See `grantedByHeldLocation`. */
  discoveries: readonly string[],
  unmatched: string[],
  priceDifferences: PriceDifference[],
  warnings: string[],
): { items: StashedItem[] } {
  const items: StashedItem[] = [];

  list.forEach((e, j) => {
    const theirName = (e.equipment?.name ?? '').trim();
    const relName = (e.purchase?.custom_rel?.name ?? '').trim();
    const keys = namesFor(theirName, relName, e.equipment?.id);
    if (!keys.length) {
      unmatched.push('Stash: an item with no name');
      return;
    }

    const add = (name: string, cost: Cost, type: StashedItem['type']) => {
      /*
        A row their record prices at nothing, where a Location they hold says
        why.

        Both of the owner's Arsenal rows carry a discount equal to their cost,
        and the Warband holds the Sniper's Lair: *"Add the Battlekit listed
        below for your Faction to your Arsenal … * Iron Sultanate: Siege
        Jezzail, Alchemical Ammunition, and a Cloak of Alamut."* Their record
        states the discount and our own text names the items, so recording them
        as given is reading both records rather than believing either alone —
        the same treatment the Workshop's Curative Fluids get.

        A row discounted to nothing that NO held Location accounts for keeps the
        ruleset's price and is reported as a difference: their zero is then a
        statement this import cannot explain, and adopting it would be taking
        their arithmetic on trust.
      */
      const theirs = theirCost(e.purchase);
      const free = num(e.purchase?.discount) > 0
        && !!theirs && theirs.ducats === 0 && theirs.glory === 0;
      const granter = free ? grantedByHeldLocation(dataset, discoveries, name) : undefined;
      if (granter) {
        warnings.push(
          `${name} is in the Arsenal at no cost: their record prices it at nothing — a discount `
          + `equal to its price — and ${granter}, which this Warband holds, adds it to the Arsenal `
          + `by name. It is recorded as granted by that Location rather than priced from the `
          + `${cost.ducats || cost.glory ? costLabel(cost) : 'shelf'} this ruleset would charge.`,
        );
        /* Their own row, at nothing: the kind their record gave it, the id it
           would have had, and the Location that accounts for the price. */
        items.push({
          id: `stash-tc-${stamp}-${j}`,
          name,
          type,
          cost: 0,
          currency: 'ducats',
          price: { ducats: 0, glory: 0 },
          quantity: 1,
          grantedBy: granter,
        });
        return;
      }
      items.push({
        id: `stash-tc-${stamp}-${j}`,
        name,
        type,
        cost: cost.glory && !cost.ducats ? cost.glory : cost.ducats,
        currency: cost.glory && !cost.ducats ? 'glory' : 'ducats',
        price: cost,
        quantity: 1,
      });
      comparePrice(name, theirCost(e.purchase), cost, priceDifferences, warnings, 'the Arsenal');
    };

    const w = uniqueByNameOrAlias(shelf.weapons, keys);
    if (w) return add(w.name, { ducats: w.cost, glory: w.gloryCost ?? 0 }, 'Weapon');
    const a = uniqueByNameOrAlias(shelf.armour, keys);
    if (a) return add(a.name, { ducats: a.cost, glory: a.gloryCost ?? 0 }, 'Armour');
    const q = uniqueByNameOrAlias(shelf.equipment, keys);
    if (q) return add(q.name, { ducats: q.cost, glory: q.gloryCost ?? 0 }, 'Equipment');

    const loose = uniqueByNameOrAlias(dataset.weapons ?? [], keys);
    if (loose) {
      const section = (dataset.battlekit ?? [])
        .find((b) => nameKey(b.name) === nameKey(loose.name))?.section;
      return add(loose.name, loose.cost,
        section === 'Armour' || section === 'Shields' ? 'Armour'
        : section === 'Equipment' || !section ? 'Equipment' : 'Weapon');
    }

    unmatched.push(`Stash: ${theirName || relName || e.equipment?.id || 'an unnamed item'}`);
  });

  return { items };
}

/**
 * Exploration: the Skills a Warband holds, and the Locations it has found.
 *
 * FD-07 records a discovery by the Location's own name, and an Exploration
 * Skill as an `ExplorationEffect` naming what granted it and when. `source`
 * says this one came from the import rather than from a roll, because a
 * player reading the list should be able to tell the difference.
 */
function readExploration(
  dataset: Dataset,
  shelf: Shelf,
  data: TcWarbandData,
  round: number,
  stamp: number,
  equivalent: Equivalence,
  unmatched: string[],
  unmapped: string[],
): {
  discoveries: string[];
  effects: Warband['explorationEffects'];
  /** Items a Location's own text puts in the Arsenal. See `arsenalGrant`. */
  granted: StashedItem[];
} {
  const known = dataset.campaign?.exploration?.skills ?? [];
  const effects: NonNullable<Warband['explorationEffects']> = [];

  for (const ref of data.exploration?.explorationskills ?? []) {
    const id = refId(ref);
    /*
      `es_reroll` against our `Re-roll`: `nameKey` folds the hyphen and the
      case, so their ids are slugs of our names wherever we carry the Skill.

      Not "all of them", which is what this used to say. This ruleset carries
      SEVEN Exploration Skills — Extra dice, Duplicate, Re-roll, Set Dice,
      Seek, Circle Back, Lucky — and their bundle offers one more,
      `es_scoutreport`, that no name here reaches. That is a gap in our data
      rather than a failure of the reading, the same kind as the Lion of
      Jabir's `Fierce Lion` (see the fixture test's `what it could not
      resolve`), and a Warband holding it is told so by name.
    */
    const hit = uniqueByName(known, (s) => s.name, [nameKey(slugTail(id))]);
    if (!hit) {
      unmatched.push(`Exploration Skill '${id || 'unnamed'}'`);
      continue;
    }
    effects.push({ name: hit.name, source: 'Imported from Trench Companion', sinceGame: round });
  }

  const locations = dataset.campaign?.exploration?.locations ?? {};
  const rows = Object.values(locations).flat();
  const discoveries: string[] = [];
  const granted: StashedItem[] = [];
  /**
   * What this ruleset read from each Location's own text.
   *
   * Kept so the report can say it. The `location_mods` note below used to
   * state that "the Location's own standing effect is read from that text"
   * whatever the reader had returned — and for the Ransacked Alchemist
   * Workshop it had returned nothing at all. A report that claims a reading it
   * did not make is worse than one that says nothing.
   */
  const readFrom = new Map<string, string[]>();
  for (const loc of data.exploration?.locations ?? []) {
    const id = typeof loc === 'string' ? loc : refId(loc as TcRef);
    /*
      A Location id can carry the book it came from: `_cf` for Carcass Front,
      as on `el_ransackedalchemistworkshop_cf`. Our tables hold one row per
      Location whatever printed it, so the suffix is taken off before the name
      is matched — it says which book, not which Location.
    */
    const tail = slugTail(id).replace(/_cf$/, '');
    /*
      The equivalence table answers an `el_` id the slug rules cannot, exactly
      as it does an `md_` or an `up_` one — and it was consulted for neither
      here, so `el_snipersnest` was reported as an unknown Location while the
      table sat beside it naming our `Sniper’s Lair` and citing both sides.
      The rules first and the table second, for the reason `readUpgrades`
      states: a table may fill a gap, never shadow a resolution.
    */
    const named = equivalent[id]?.ours;
    const hit = tail
      ? uniqueByName(rows, (r) => r.name, [nameKey(tail), ...(named ? [nameKey(named)] : [])])
      : undefined;
    if (hit) {
      discoveries.push(hit.name);
      /*
        What the Location hands over for the rest of the campaign, read from
        OUR text by pack G's `explorationGrants` — the Black Market's *"From
        now on, in the Quartermaster Step, you can purchase Glory Items
        costing 8 ☼ or less"* is a permission the Warband keeps, and an import
        that recorded only the discovery dropped it.

        Their record states the same thing in `location_mods`, and that is
        deliberately not what is read: the ceiling is a number in the book's
        sentence (`gloryItemsUpTo`), and their modifier ids carry no number at
        all. The mods are checked against this below instead.

        A Location that asks the player to CHOOSE grants nothing here:
        `explorationGrants` returns nothing without the option, and reading
        every option would hand the Warband both halves of a choice the book
        makes it pick between. The choice is reported, not guessed.
      */
      const standing = explorationGrants(dataset, hit, round);
      effects.push(...standing);

      /* What its text puts in the Arsenal is read from their `location_mods`
         below, not from the discovery — see the note there. */
      readFrom.set(hit.name, standing.map(saidEffect));
    } else unmatched.push(`Exploration Location '${id || 'unnamed'}'`);

    /*
      The option the player took, where their record keeps one.

      Pack G reads a Location's options (`explorationChoices`) and what each
      one grants (`explorationGrants` with `chosen`), so the answer has
      somewhere to go — when their id says WHICH of our options it is. Theirs
      are ids of their own (`ot_snipersnest` → `el_snipersnest_ironsultanate`),
      and nothing states them to be our order or our labels, so the option is
      named rather than applied, beside the labels this ruleset prints for that
      Location so the player can see the two lists together.

      Reported even where the Location itself did not resolve, under their own
      id. The player made that choice whether or not we can name the row it
      belongs to, and losing it twice over is worse than losing it once.
    */
    const chosen = isRecord(loc) && Array.isArray(loc.selections) ? loc.selections : [];
    for (const sel of chosen) {
      const option = isRecord(sel) ? String(sel.option_refID ?? '') : '';
      const picked = isRecord(sel) ? String(sel.selection_ID ?? '') : '';
      const ours = hit ? explorationChoices(hit).map((c) => c.label) : [];
      unmapped.push(
        `${hit?.name ?? id}: the option taken (${option || 'unnamed'}`
        + `${picked ? ` → ${picked}` : ''}) is recorded on their side and is not applied here. `
        + (ours.length
          ? `This ruleset prints its options as ${ours.map((l) => `'${l}'`).join(', ')}, and their `
            + 'ids do not say which of those they are.'
          : "This ruleset's text for it states no options to choose between, so there is nothing "
            + 'here for the choice to select.'),
      );
    }
  }

  /*
    Their `location_mods` — the standing effect of a Location they hold, one
    entry per Location, its id the Location's with `_mod` on the end.

    Read as a CHECK rather than as a source. Everything a Location grants is in
    its own text, which is where `explorationGrants` above takes it from; what
    their mods can add is the answer to a Location that offers a choice, in ids
    of theirs (`ot_ransackedalchemistworkshop_a`) whose letters are nowhere
    stated to be our option order. So a mod whose Location is discovered and
    whose text offers no choice needs no line of its own, and everything else
    is named: a mod for a Location we did not resolve, and a mod that records
    an option.
  */
  for (const mod of data.exploration?.location_mods ?? []) {
    const id = typeof mod === 'string' ? mod : refId(mod as TcRef);
    const tail = slugTail(id.replace(/_mod$/, '')).replace(/_cf$/, '');
    const hit = tail ? uniqueByName(rows, (r) => r.name, [nameKey(tail)]) : undefined;
    if (!hit) {
      unmapped.push(
        `location_mods '${id || 'unnamed'}': no Location of that name in this ruleset, so what it `
        + 'modifies cannot be named. Their standing Location effects are not read — each '
        + "Location's own text is — and this one is reported so it is not lost silently.",
      );
      continue;
    }
    if (!discoveries.includes(hit.name)) {
      unmapped.push(
        `location_mods '${id}': their record holds a standing effect for ${hit.name}, which is `
        + 'not among the Locations it lists as discovered, so nothing on this Warband records it.',
      );
      continue;
    }
    /*
      What this Location's text puts in the Arsenal, keyed on their MOD.

      Their `_mod` is the Location's effect still standing: the Ransacked
      Alchemist Workshop's carries the option that has not been answered yet
      (`selection_ID: null`), which is their record saying the Curative Fluids
      are still held and no model has been chosen to spend them on. Keyed on the
      discovery instead, a Warband that had already used them would be handed
      them back on every import.
    */
    const gift = arsenalGrant(dataset, shelf, hit, granted.length, stamp);
    const pending = (isRecord(mod) && Array.isArray(mod.selections) ? mod.selections : [])
      .some((sel) => isRecord(sel) && sel.selection_ID === null);
    if (gift.item) {
      granted.push(gift.item);
      readFrom.set(hit.name, [
        ...(readFrom.get(hit.name) ?? []),
        `${gift.item.name} in the Arsenal, at no cost`
        + (pending ? ', with the model it is spent on still unchosen in their record' : ''),
      ]);
    } else if (gift.names) {
      unmapped.push(
        `${hit.name}: its text adds '${gift.names}' to the Arsenal, which is not one entry this `
        + 'ruleset can name — a per-faction list, or a name two entries here carry — so nothing '
        + 'was added for it. Anything their own record holds for it is in the Arsenal above.',
      );
    }

    const picked = (isRecord(mod) && Array.isArray(mod.selections) ? mod.selections : [])
      .map((sel) => (isRecord(sel) ? String(sel.option_refID ?? '') : ''))
      .filter(Boolean);
    if (!picked.length) continue;
    const ours = explorationChoices(hit).map((c) => c.label);
    const got = readFrom.get(hit.name) ?? [];
    unmapped.push(
      `location_mods '${id}': their record keeps the option '${picked.join("', '")}' for `
      + `${hit.name}. ${ours.length
        ? `This ruleset prints its options as ${ours.map((l) => `'${l}'`).join(', ')}, and their `
          + 'ids do not say which of those they are, so no option\'s effect is applied. '
        : "This ruleset's text for it states no options to choose between, so there is nothing "
          + 'here for the choice to select. '}`
      + (got.length
        ? `What was read from that text: ${listOf(got)}.`
        : 'Nothing in that text is anything this app records, so the discovery itself is all that '
          + 'is on the Warband for it.'),
    );
  }

  return {
    discoveries,
    effects: effects.length ? effects : undefined,
    granted,
  };
}

/**
 * What a Location's own text puts in the Arsenal, where that can be READ.
 *
 * *"Add Curative Fluids to your Warband’s Arsenal."* Four of the shipped
 * Locations hand an item over outright, and `explorationGrants` does not read
 * them: it answers the Exploration Skills, the loot bonus and the Glory Item
 * permissions, and returns nothing at all for the Ransacked Alchemist
 * Workshop, whose entire effect is that sentence.
 *
 * Read from the sentence rather than from a list of Location names — the rule
 * `explorationGrants` itself follows — and the sentence has to say something
 * specific for anything to happen. Sixteen of the thirty-four Locations match a
 * loose reading of it, and most of them name nothing:
 *
 *   `Add it to your Arsenal`        the Heavy Weapons Cache, the Fallen
 *                                   Soldier, the Ruined Church — a pronoun
 *   `Add them to your Arsenal`      the Ruined House, the Warband Strongbox,
 *                                   the Battlefield of Corpses
 *   `Add one Glory Item …`          the Treasure of the Holies — a quantity
 *
 * The first version of this reader wrote a report line for every one of them,
 * each stating something untrue: *"Heavy Weapons Cache: its text adds 'it' to
 * the Arsenal"*. So the capital letter is part of the pattern: the books name an
 * item with one, and a pronoun or a quantity has none. The article in front of
 * it is dropped, which is why `an Angelic Instrument` is looked up as
 * `Angelic Instrument`.
 *
 * **A Location that offers a choice grants nothing here.** The Trench Shrine's
 * *"Add a Troop Flag"* belongs to one of its three options, and their record
 * answers a choice in ids of its own (`ot_snipersnest` →
 * `el_snipersnest_ironsultanate`) that say nothing about which of our options
 * they are — so a Warband that took the Shrine's `Return` would have been given
 * a Troop Flag it never had. `explorationChoices` is asked first, and a
 * Location with options is left alone.
 *
 * Priced at **nothing**, and marked with the Location that gave it: the Warband
 * did not buy it. Where the sentence names something this ruleset cannot
 * resolve to exactly one entry — the Sniper's Lair's *"the Battlekit listed
 * below for your Faction"* is a per-faction list, and two entries here are
 * called `Angelic Instrument` — the caller reports the phrase rather than
 * adding a guess.
 */
const ARSENAL_GRANT =
  /Add\s+(?:(?:an|a|the)\s+)?([A-Z][A-Za-z ’'-]*?)\s+to your (?:Warband(?:’|')?s )?Arsenal/;

function arsenalGrant(
  dataset: Dataset,
  shelf: Shelf,
  location: { name: string; description?: string },
  index: number,
  stamp: number,
): { item?: StashedItem; names?: string } {
  /* A choice is not ours to answer. See the note above. */
  if (explorationChoices(location).length) return {};

  const said = ARSENAL_GRANT.exec(location.description ?? '');
  if (!said) return {};
  const names = said[1].trim();
  if (!names) return {};

  const found = uniqueByNameOrAlias(
    [...shelf.weapons, ...shelf.armour, ...shelf.equipment], [nameKey(names)])
    ?? uniqueByNameOrAlias(dataset.weapons ?? [], [nameKey(names)]);
  if (!found) return { names };

  return { item: grantedStashItem(dataset, found, location.name, index, stamp) };
}

/**
 * Which Location this Warband holds accounts for an item it was given.
 *
 * Read from the Location's own text: the Sniper's Lair names the Siege Jezzail
 * and the Alchemical Ammunition in its per-faction list, so a row their record
 * prices at nothing has a granter this ruleset can name. Only where exactly one
 * held Location names it — two would be a guess between them, and none means
 * their zero is unexplained and their price is reported as a difference
 * instead.
 */
function grantedByHeldLocation(
  dataset: Dataset,
  discoveries: readonly string[],
  item: string,
): string | undefined {
  const want = nameKey(item);
  if (!want) return undefined;
  const held = Object.values(dataset.campaign?.exploration?.locations ?? {}).flat()
    .filter((row) => discoveries.includes(row.name))
    .filter((row) => nameKey(row.description ?? '').includes(want));
  return held.length === 1 ? held[0].name : undefined;
}

/**
 * One Arsenal row the Warband was given: no price, and the granter's name.
 *
 * The kind comes from the three sources `recruitable` reads for a Glory Item,
 * in the same order — the Battlekit chapter's section, then the profile's own
 * kind, and only then `Equipment`, which is what an entry stating no kind at
 * all means. `Curative Fluids` is the case: the chapter has no section for it
 * and its profile is typed `Special`, so it is gear, arrived at rather than
 * assumed.
 */
function grantedStashItem(
  dataset: Dataset,
  entry: { id: string; name: string; type?: string; range?: string },
  grantedBy: string,
  index: number,
  stamp: number,
): StashedItem {
  const section = (dataset.battlekit ?? [])
    .find((b) => nameKey(b.name) === nameKey(entry.name))?.section;
  const fromProfile = (() => {
    if (/^(armour|shield)/i.test(entry.type ?? '')) return 'Armour';
    const range = (entry.range ?? '').trim();
    if (range && range !== '-') return 'Ranged Weapons';
    if (/handed|grenade/i.test(entry.type ?? '')) return 'Melee Weapons';
    return undefined;
  })();
  const kind = section ?? fromProfile ?? 'Equipment';
  return {
    id: `stash-tc-${stamp}-granted-${index}`,
    name: entry.name,
    type: kind === 'Armour' || kind === 'Shields' ? 'Armour'
      : kind === 'Equipment' ? 'Equipment' : 'Weapon',
    cost: 0,
    currency: 'ducats',
    price: { ducats: 0, glory: 0 },
    quantity: 1,
    grantedBy,
  };
}

/**
 * What one of their choice ids actually names, where this can be said.
 *
 * A model, by the purchase id their record gives each model — which is also
 * that model's `id` — or a Keyword from this ruleset's glossary. Anything else
 * is left as their id alone, which is still the honest answer: a line that
 * says `kw_gas` and nothing more tells the player exactly what their record
 * states.
 */
function saidChoice(
  models: readonly TcModelInner[],
  keywords: readonly { name: string }[],
  picked: string,
): string {
  const model = models.find((m) => m.id === picked);
  if (model) return ` — ${(model.name ?? '').trim() || picked} on this roster`;
  const keyword = uniqueByName(keywords as { name: string }[], (k) => k.name,
    [nameKey(slugTail(picked))]);
  if (keyword) return ` — the ${keyword.name} Keyword`;
  return '';
}

/**
 * The fields their record carries that this import does not read.
 *
 * Listed so a player can see what was skipped rather than find out later that
 * something did not arrive. The three per-model ones are always listed (see
 * `UNMAPPED_MODEL`); the Warband-level ones only when they hold something,
 * because "fireteams: none" is not news.
 */
function reportUnmapped(
  data: TcWarbandData,
  /** The models this import kept. See `kept` — never their whole list. */
  models: readonly TcModelInner[],
  /** This ruleset's Keyword glossary, for the choices that name one. */
  keywords: readonly { name: string }[],
  unmapped: string[],
): void {

  for (const { field, why } of UNMAPPED_MODEL) {
    const carrying = models.filter((m) => {
      const v = m[field];
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'number') return v !== 0;
      if (typeof v === 'string') return v !== '' && v !== 'active';
      return v !== undefined && v !== null && v !== false;
    }).length;
    unmapped.push(
      `${field}: not mapped. ${why} `
      + (carrying
        ? `${carrying} ${carrying === 1 ? 'model carries' : 'models carry'} a value for it.`
        : 'No model in this warband carries a value for it.'),
    );
  }

  /*
    The kit choice their record states, model by model.

    Named rather than counted, because a choice is a fact about that model: the
    Mamluk Faris's three-way loadout ("either a Greatsword, or a Polearm and a
    Trench Shield, or a Pistol and a Sword/Axe") is recorded here as
    `rel_md_eq_mamlukpackage_1`, and which of the three that is is not stated
    anywhere public.
  */
  for (const m of models) {
    const label = (m.name ?? '').trim() || (m.model ?? 'an unnamed model');
    for (const rel of m.list_modelequipment ?? []) {
      const chosen = (rel.selections ?? [])
        .map((sel) => sel.selection_ID)
        .filter((id): id is string => typeof id === 'string' && id !== '');
      if (!chosen.length) continue;
      unmapped.push(
        `list_modelequipment on ${label}: their record takes '${chosen.join("', '")}' from `
        + `'${rel.object_id ?? 'an unnamed relation'}'. What that package contains is not stated `
        + 'anywhere public, so the choice is reported and not applied.',
      );
    }

    /*
      An ability that asks a question, and the answer their record gives it.

      Two kinds on the owner's warband, and the line for each says what the
      answer IS rather than repeating their id for it:

        `ab_masteryoftheelements` → `kw_gas`
            The Jabirean Alchemist's Mastery of the Elements picks an element.
            Resolved against this ruleset's Keyword glossary, so the line names
            GAS rather than a slug.

        `ab_chosenhomunculus` → `md_takwincreation_10_1789965799416`
            The Takwin association — which Homunculus is this Alchemist's — and
            the answer is a MODEL, by the purchase id their record gives that
            model. So it resolves to a name on this roster. `golem.ts` searched
            the Homunculi for this association and found none, which is
            correct: it is recorded on the Alchemist.

      Reported rather than applied: this app holds no field for either answer
      (`takwinRestrictions` asks whether an Alchemist is alive, not which
      Homunculus is whose), and inventing one from an import is how a fact
      nobody can check gets onto a roster.
    */
    for (const sub of m.subproperties ?? []) {
      for (const sel of sub.selections ?? []) {
        const picked = typeof sel.selection_ID === 'string' ? sel.selection_ID.trim() : '';
        if (!picked) continue;
        unmapped.push(
          `subproperties on ${label}: '${sub.object_id ?? 'an unnamed ability'}' records the `
          + `choice '${picked}'${saidChoice(models, keywords, picked)}. This app holds no field `
          + 'for it, so it is named here rather than applied.',
        );
      }
    }
  }

  /*
    Their copy of the faction's own rules, and the choices inside them.

    The rules themselves are this ruleset's: `rl_takwinhomunculus` is the
    House of Wisdom's Takwin rule, which the app reads from the faction's own
    text rather than from their id for it. What their record adds is the
    answer to a rule that asks for one — `rl_weaponcollections` with
    `rel_fc_eq_machinearmour` names the Armoury row the House of Wisdom's
    *Weapon Collections* opened — and this app records that permission as
    `grantedBy` on the item, which an import cannot set from an id whose
    meaning is not published. The item itself is on the roster, priced from
    the shelf; the rule that opened it is not recorded against it.
  */
  const ruleChoices = (data.faction?.faction_rules ?? []).flatMap((r) => {
    const picks = (r.selections ?? [])
      .map((sel) => sel.selection_ID)
      .filter((id): id is string => typeof id === 'string' && id !== '');
    return picks.length ? [`${r.object_id ?? 'an unnamed rule'} → ${picks.join(', ')}`] : [];
  });
  if (ruleChoices.length) {
    unmapped.push(
      `faction_rules: ${ruleChoices.length} of their faction rules record a choice `
      + `(${ruleChoices.join('; ')}), and the choice is not mapped. The rules themselves are read `
      + "from this ruleset's own text; an item a rule opened is on the roster and priced from the "
      + 'shelf, but which rule opened it is not recorded against it.',
    );
  }

  if ((data.fireteams ?? []).length) {
    /*
      Named, not counted. A Fireteam's members are what it IS, and their record
      gives each as a model's purchase id — which resolves to a name on this
      roster, exactly as an ability's choice does.
    */
    const members = (data.fireteams ?? []).flatMap((ft) => (
      isRecord(ft) && Array.isArray(ft.selections) ? ft.selections : [])
      .map((sel) => (isRecord(sel) && typeof sel.selection_ID === 'string'
        ? sel.selection_ID : ''))
      .filter(Boolean)
      .map((picked) => `${picked}${saidChoice(models, keywords, picked)}`));
    unmapped.push(`fireteams: ${(data.fireteams ?? []).length} recorded, and not mapped. `
      + 'A Fireteam is a name on a model here; their grouping has not been measured. '
      + (members.length
        ? `The member${members.length === 1 ? '' : 's'} their record names: ${listOf(members)}.`
        : 'Their record names no member for it.'));
  }
  if ((data.modifiers ?? []).length) {
    unmapped.push(`modifiers: ${(data.modifiers ?? []).length} recorded, and not mapped.`);
  }
  if ((data.modifiersloc ?? []).length) {
    unmapped.push(`modifiersloc: ${(data.modifiersloc ?? []).length} recorded, and not mapped — `
      + 'modifiers their record attaches to a Location rather than to the Warband.');
  }
  if ((data.restrictions_list ?? []).length) {
    unmapped.push(`restrictions_list: ${(data.restrictions_list ?? []).length} recorded `
      + `(${(data.restrictions_list ?? []).map((r) => String(r)).join(', ')}), and not mapped — `
      + 'a setting of their campaign rather than anything on the roster.');
  }
  /*
    The campaign expansions, named. Their `expansion_data` carries a whole
    campaign state per expansion — resources, unlocked tiers, special
    properties — and TrenchLine models none of it, so the honest report is the
    names and the fact that nothing inside them was read.
  */
  const expansions = (data.expansion_data ?? [])
    .map((x) => x.expansion_data?.name || x.expansion_data?.id)
    .filter((n): n is string => !!n);
  if (expansions.length || (data.expansion_ids ?? []).length) {
    unmapped.push(
      `expansion_data: ${Math.max(expansions.length,
        (data.expansion_ids ?? []).length)} campaign expansion(s) recorded, named by `
      + '`expansion_ids`'
      + `${expansions.length ? ` (${expansions.join(', ')})` : ''}, with their resources, tiers `
      + 'and special properties. TrenchLine models no expansion campaign state, so none of it is '
      + 'read — the models, the Arsenal and the money above are the whole import.',
    );
  }
  if ((data.consumables ?? []).length) {
    unmapped.push(`consumables: ${(data.consumables ?? []).length} recorded, and not mapped.`);
  }
  if (Array.isArray(data.notes) && data.notes.length) {
    unmapped.push(`notes: ${data.notes.length} recorded as a list, and not mapped — `
      + 'a warband\'s notes are one piece of text here.');
  }
}

/**
 * Open the ledger the way an imported NewRecruit warband's is opened.
 *
 * `migrateFoundingPot` books two entries for a Warband that has the allowance
 * nowhere: the allowance credited, then the roster debited, leaving what is
 * unspent as the Strongbox. That is exactly the shape their record states —
 * `ducat_bank` is the founding allowance, `rating_ducat` is what the roster is
 * worth, and `spare_ducat` is what is left — so the same two entries are
 * booked here rather than a third shape being invented for an import.
 *
 * **The debit is THEIR rating, not our arithmetic over the roster.** A model
 * or an item that did not resolve is not on our roster and never cost us
 * anything, so summing our prices would hand the player back the Ducats they
 * spent on it. Their rating is what they actually spent, and using it is what
 * makes the Strongbox here the Strongbox they left.
 *
 * Where their own numbers do not add up the report says so and their
 * `spare_*` is believed, because that is the figure printed on their page.
 */
function openFoundingPot(
  warband: Warband,
  allowance: Cost,
  ratings: NonNullable<NonNullable<TcWarbandData['context']>['stored_ratings']>,
  warnings: string[],
  at: string,
): Warband {
  const rating = { ducats: num(ratings.rating_ducat), glory: num(ratings.rating_glory) };
  const stashRating = {
    ducats: num(ratings.stash_rating_ducat), glory: num(ratings.stash_rating_glory),
  };
  const spare = { ducats: num(ratings.spare_ducat), glory: num(ratings.spare_glory) };

  /*
    The debit is what their bank less their Strongbox says was spent, not
    `rating_*`.

    `rating_*` is the ROSTER's value and `stash_rating_*` is the Arsenal's,
    and the two are separate numbers in their record: a warband holding
    anything in its stash had `bank - rating` larger than `spare` by exactly
    the stash's worth, and debiting `rating` alone left the Strongbox here
    richer than the Strongbox on their page by that amount.

    So the figure that must come out right is `spare_*` — it is what their
    page prints and what the player expects to see — and the debit is derived
    from it. Both of their own figures are named in the note, so the entry
    still says where the money went rather than just how much.
  */
  const spent = {
    ducats: allowance.ducats - spare.ducats,
    glory: allowance.glory - spare.glory,
  };

  const credited = book(warband, {
    reason: 'founding',
    ducats: allowance.ducats,
    glory: allowance.glory,
    game: 1,
    note: 'Founding allowance, as Trench Companion recorded it.',
  }, at);

  const debited = book(credited, {
    reason: 'quartermaster',
    ducats: -spent.ducats,
    glory: -spent.glory,
    game: 1,
    note: `Roster and Arsenal at import: ${warband.units.length} model`
      + `${warband.units.length === 1 ? '' : 's'}. Trench Companion valued the roster at `
      + `${rating.ducats} Ducats and ${rating.glory} Glory, and the stash at `
      + `${stashRating.ducats} Ducats and ${stashRating.glory} Glory.`,
  }, at);

  /*
    Their own arithmetic, checked rather than assumed.

    The debit above makes the Strongbox equal their `spare_*` by construction,
    so what is worth reporting is whether their own three figures agree:
    roster plus stash should be exactly what the bank is down by. Where they
    do not, the Strongbox here is still their `spare_*` — their page's own
    number — and the note says which of their figures did not add up.
  */
  const accounted = {
    ducats: rating.ducats + stashRating.ducats,
    glory: rating.glory + stashRating.glory,
  };
  if (accounted.ducats !== spent.ducats || accounted.glory !== spent.glory) {
    /*
      Their four figures, stated. Not "their numbers are wrong".

      On the owner's own warband they read 1460 banked, 1455 roster, 33 stash,
      60 spare — so the bank is down by 1400 while the roster and stash come
      to 1488. We do not know what their app counts where, and saying their
      arithmetic is broken would be asserting something we have not checked.
      What IS certain is which figure their page prints as the Strongbox, and
      that is the one this import lands on.
    */
    const money = (c: Cost) => `${c.ducats} Ducats and ${c.glory} Glory`;
    warnings.push(
      'Their four figures do not reconcile against each other, so here they are as their '
      + `record states them: banked ${money(allowance)}; roster valued at ${money(rating)}; `
      + `stash valued at ${money(stashRating)}; Strongbox ${money(spare)}. `
      + `Bank less Strongbox is ${money(spent)}, which is what the quartermaster entry above `
      + `debits, while roster plus stash is ${money(accounted)}. The Strongbox here is their `
      + 'own Strongbox figure — the number their page prints — so the two agree whatever the '
      + 'rest of their totals mean.',
    );
  }

  return debited;
}
