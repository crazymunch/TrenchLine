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

/* ------------------------------------------------------------ their shape */

/*
  Everything optional and nothing asserted, for the reason the NewRecruit
  importer states: this is a parser for somebody else's file, which is the one
  place a program cannot assume the shape it is handed. What the types buy is
  that a typo in a member name is a compile error rather than `undefined`
  flowing into a statline.

  Measured on the public warband 225201 on 25 September 2026. A field this
  does not name is a field this does not read, and the report says so.
*/

/** `{ object_id: 'sk_standfirm', … }` — how they reference anything by id. */
interface TcRef { object_id?: string }

/** A line's price and the relation it was bought through. */
interface TcPurchase {
  cost_value?: number;
  /** 0 is Ducats. See `theirCost`. */
  cost_type?: number;
  purchaseid?: string;
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
  list_modelequipment?: unknown[];
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
  faction?: { faction_property?: TcRef };
  exploration?: { explorationskills?: (TcRef | string)[]; locations?: unknown[] };
  models?: TcModelLine[];
  /** The Warband's stash. */
  equipment?: TcEquipment[];
  fireteams?: unknown[];
  notes?: unknown;
  modifiers?: unknown[];
  consumables?: unknown[];
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
  const v = p.cost_value;
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
  for (const key of keys) {
    const hits = candidates.filter((c) => nameKey(nameOf(c)) === key);
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) return undefined;
  }
  return undefined;
}

/* ------------------------------------------------------------ the importer */

/**
 * What this import does not read, and says so every time.
 *
 * Their meaning is not stated anywhere public, and the design is explicit
 * that they wait to be measured on a warband the owner owns rather than be
 * mapped on a reading of one stranger's record. Listed unconditionally: a
 * player is owed the knowledge that a field was skipped whether or not their
 * own warband happens to carry a value in it.
 */
const UNMAPPED_MODEL: { field: keyof TcModelInner; why: string }[] = [
  { field: 'scar_reserves', why: 'Battle Scars are recorded from the Trauma Table here, and it is not known what this counter holds.' },
  { field: 'stat_selections', why: 'What a stat selection changes is not stated anywhere public.' },
  { field: 'active', why: 'It is not known whether this marks a model benched for a game or retired from the roster.' },
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
): TrenchCompanionImportResult {
  const data = readWarbandData(envelope);

  const unmatched: string[] = [];
  const warnings: string[] = [];
  const unmapped: string[] = [];
  const priceDifferences: PriceDifference[] = [];

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

  const shelf = recruitable(dataset, factionId, appFactionIds, variantId);

  /* ------------------------------------------------------------- the models */

  const stamp = Date.now();
  const units: ActiveUnit[] = [];

  (data.models ?? []).forEach((line, idx) => {
    const m = line.model;
    const theirName = (m?.name ?? '').trim();
    const label = theirName || `An unnamed model (${m?.model ?? 'no entry id'})`;
    if (!m || !theirName) {
      unmatched.push(label);
      return;
    }

    const profile = resolveModel(shelf.units, factionId, theirName, m.model);
    if (!profile) {
      unmatched.push(`${theirName}${m.model ? ` (${m.model})` : ''}`);
      return;
    }

    comparePrice(profile.name, theirCost(line.purchase), ourUnitCost(profile),
      priceDifferences, warnings);

    const gear = readGear(dataset, shelf, factionId, factionName, m, profile, theirName,
      stamp, idx, unmatched, warnings, priceDifferences);

    const upgrades = readUpgrades(dataset, factionId, profile, m, theirName,
      unmatched, priceDifferences, warnings);

    const tough = (profile.stats.keywords ?? []).some((k) => /^TOUGH$/i.test(k.trim()));
    const maxWounds = tough ? 2 : 1;

    units.push({
      id: `u-tc-${stamp}-${idx}`,
      /* Their display name is the player's own name for the model; the
         catalogue's name stays on the snapshot, as the NewRecruit import
         leaves it. */
      customName: theirName,
      baseProfileId: profile.id,
      profileSnapshot: profile,
      equippedWeapons: gear.weapons,
      equippedArmour: gear.armour,
      equippedEquipment: gear.equipment,
      specialUpgrades: upgrades.bought,
      xp: num(m.experience),
      isElite: m.elite === true,
      advancements: [],
      skills: readSkills(dataset, m, theirName, unmatched),
      injuries: readInjuries(dataset, m, theirName, unmatched),
      isDead: false,
      /* Our prices, added up. Theirs is reported, never charged. */
      totalCost: profile.baseCost + gear.ducats + upgrades.ducats,
      currentWounds: maxWounds,
      maxWounds,
      bloodMarkers: 0,
      blessingMarkers: 0,
      status: 'Active',
      hasActedThisTurn: false,
    });
  });

  /* -------------------------------------------------------------- the stash */

  const stash = readStash(dataset, shelf, data.equipment ?? [], stamp,
    unmatched, priceDifferences, warnings);

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

  const exploration = readExploration(dataset, data, round, unmatched);
  reportUnmapped(data, unmapped);

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
    units,
    armoryStash: stash.items,
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
    unmapped,
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
): UnitProfile | undefined {
  const keys = namesFor(theirName, undefined, theirSlug);
  const mine = units.filter((u) => sameFaction(u.factionId, factionId));
  return uniqueByName(mine, (u) => u.name, keys)
    ?? uniqueByName(units, (u) => u.name, keys);
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
): void {
  if (!theirs) {
    warnings.push(`${name}: their record does not state a price this import can read — either `
      + 'none at all, or one in a currency it does not know — so their price is not compared. '
      + 'It is priced here from this ruleset, as everything on the roster is.');
    return;
  }
  if (sameCost(theirs, ours)) return;
  into.push({ name, theirs, ours });
}

const costLabel = (c: Cost) =>
  [c.ducats ? `${c.ducats} Ducats` : null, c.glory ? `${c.glory} Glory` : null]
    .filter(Boolean).join(' + ') || 'free';

/** The report line for one price difference, for the screens that print it. */
export const priceDifferenceLine = (d: PriceDifference): string =>
  `${d.name}: ${costLabel(d.theirs)} in Trench Companion, ${costLabel(d.ours)} here.`;

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
  unmatched: string[],
  warnings: string[],
  priceDifferences: PriceDifference[],
): { weapons: EquippedWeapon[]; armour: EquippedArmour[]; equipment: EquippedEquipment[]; ducats: number } {
  const weapons: EquippedWeapon[] = [];
  const armour: EquippedArmour[] = [];
  const equipment: EquippedEquipment[] = [];
  let ducats = 0;

  (m.equipment ?? []).forEach((e, j) => {
    const theirName = (e.equipment?.name ?? '').trim();
    const relName = (e.purchase?.custom_rel?.name ?? '').trim();
    const label = theirName || relName || e.equipment?.id || 'an unnamed item';
    const keys = namesFor(theirName, relName, e.equipment?.id);
    if (!keys.length) {
      unmatched.push(`${modelLabel}: an item with no name`);
      return;
    }

    const instance = `tc-${stamp}-${idx}-${j}`;

    const w = uniqueByName(shelf.weapons, (x) => x.name, keys);
    if (w) {
      weapons.push({ ...w, instanceId: `w-inst-${instance}` });
      ducats += w.cost;
      comparePrice(w.name, theirCost(e.purchase),
        { ducats: w.cost, glory: w.gloryCost ?? 0 }, priceDifferences, warnings);
      return;
    }

    const a = uniqueByName(shelf.armour, (x) => x.name, keys);
    if (a) {
      armour.push({ ...a, instanceId: `a-inst-${instance}` });
      ducats += a.cost;
      comparePrice(a.name, theirCost(e.purchase),
        { ducats: a.cost, glory: a.gloryCost ?? 0 }, priceDifferences, warnings);
      return;
    }

    const q = uniqueByName(shelf.equipment, (x) => x.name, keys);
    if (q) {
      equipment.push({ ...q, instanceId: `e-inst-${instance}` });
      ducats += q.cost;
      comparePrice(q.name, theirCost(e.purchase),
        { ducats: q.cost, glory: q.gloryCost ?? 0 }, priceDifferences, warnings);
      return;
    }

    const entry = catalogueUnitFor(dataset, { baseProfileId: profile.id }, factionId);
    const option = uniqueByName(entry?.options ?? [], (o) => o.name, keys);
    if (option) {
      equipment.push({
        id: `opt-${nameKey(option.name)}`,
        name: option.name,
        cost: option.cost.ducats,
        gloryCost: option.cost.glory || undefined,
        effect: option.description || '',
        group: option.groupPath ?? option.group,
        category: option.group,
        instanceId: `e-inst-${instance}`,
      });
      ducats += option.cost.ducats;
      comparePrice(option.name, theirCost(e.purchase), option.cost,
        priceDifferences, warnings);
      return;
    }

    const loose = uniqueByName(dataset.weapons ?? [], (x) => x.name, keys);
    if (loose) {
      const section = (dataset.battlekit ?? []).find((b) => nameKey(b.name) === nameKey(loose.name))?.section;
      warnings.push(
        `${loose.name} is in this ruleset but is not on the ${factionName} Armoury Table, so it `
        + `is priced at the catalogue's own ${costLabel(loose.cost)}. The legality check will `
        + 'report it as not stocked.',
      );
      ducats += loose.cost.ducats;
      comparePrice(loose.name, theirCost(e.purchase), loose.cost, priceDifferences, warnings);
      if (section === 'Armour' || section === 'Shields') {
        armour.push({
          id: loose.id, name: loose.name, cost: loose.cost.ducats,
          gloryCost: loose.cost.glory || undefined,
          modifier: loose.keywords.find((kw) => /INJURY MODIFIER/i.test(kw)),
          keywords: loose.keywords, category: section,
          instanceId: `a-inst-${instance}`,
        });
      } else if (section === 'Equipment' || !section) {
        equipment.push({
          id: loose.id, name: loose.name, cost: loose.cost.ducats,
          gloryCost: loose.cost.glory || undefined,
          effect: loose.rules ?? '', keywords: loose.keywords,
          category: section ?? 'Equipment',
          instanceId: `e-inst-${instance}`,
        });
      } else {
        weapons.push({
          id: loose.id, name: loose.name, cost: loose.cost.ducats,
          gloryCost: loose.cost.glory || undefined,
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

    unmatched.push(`${modelLabel}: ${label}`);
  });

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
  profile: UnitProfile,
  m: TcModelInner,
  modelLabel: string,
  unmatched: string[],
  priceDifferences: PriceDifference[],
  warnings: string[],
): { bought: { id: string; name: string; cost: number; category: string }[]; ducats: number } {
  const bought: { id: string; name: string; cost: number; category: string }[] = [];
  let ducats = 0;
  const list = m.list_upgrades ?? [];
  if (!list.length) return { bought, ducats };

  const entry = catalogueUnitFor(dataset, { baseProfileId: profile.id }, factionId);
  const own = nameKey(slugTail(m.model ?? ''));

  for (const u of list) {
    const id = refId(u.upgrade);
    const tail = nameKey(slugTail(id));
    const keys = [...new Set([tail, own && tail.startsWith(own) ? tail.slice(own.length) : ''])]
      .filter(Boolean);
    const option = uniqueByName(entry?.options ?? [], (o) => o.name, keys);
    if (!option) {
      unmatched.push(`${modelLabel}: upgrade '${id || 'unnamed'}'`);
      continue;
    }
    bought.push({
      id: `su-${nameKey(option.name)}`,
      name: option.name,
      cost: option.cost.ducats,
      category: option.group,
    });
    ducats += option.cost.ducats;
    comparePrice(option.name, theirCost(u.purchase), option.cost, priceDifferences, warnings);
  }
  return { bought, ducats };
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
  unmatched: string[],
): ActiveUnit['skills'] {
  const tables = dataset.campaign?.skills ?? {} as Dataset['campaign']['skills'];
  const rows = Object.entries(tables).flatMap(([table, list]) =>
    (list ?? []).map((r) => ({ ...r, table })));

  const out: NonNullable<ActiveUnit['skills']> = [];
  for (const ref of m.list_skills ?? []) {
    const id = refId(ref);
    const hit = uniqueByName(rows, (r) => r.name, [nameKey(slugTail(id))]);
    if (!hit) {
      unmatched.push(`${modelLabel}: Skill '${id || 'unnamed'}'`);
      continue;
    }
    out.push({
      name: hit.name, category: hit.table, roll: String(hit.roll), effect: hit.description,
    });
  }
  return out.length ? out : undefined;
}

/** The injuries a model carries, by name against the Trauma Table. */
function readInjuries(
  dataset: Dataset,
  m: TcModelInner,
  modelLabel: string,
  unmatched: string[],
): string[] {
  const rows = dataset.campaign?.trauma ?? [];
  const out: string[] = [];
  for (const ref of m.list_injury ?? []) {
    const id = refId(ref);
    const hit = uniqueByName(rows, (r) => r.name, [nameKey(slugTail(id))]);
    if (!hit) {
      unmatched.push(`${modelLabel}: injury '${id || 'unnamed'}'`);
      continue;
    }
    out.push(hit.name);
  }
  return out;
}

/** The Warband's stash, by the same three shelves a model's gear uses. */
function readStash(
  dataset: Dataset,
  shelf: Shelf,
  list: TcEquipment[],
  stamp: number,
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
      items.push({
        id: `stash-tc-${stamp}-${j}`,
        name,
        type,
        cost: cost.glory && !cost.ducats ? cost.glory : cost.ducats,
        currency: cost.glory && !cost.ducats ? 'glory' : 'ducats',
        price: cost,
        quantity: 1,
      });
      comparePrice(name, theirCost(e.purchase), cost, priceDifferences, warnings);
    };

    const w = uniqueByName(shelf.weapons, (x) => x.name, keys);
    if (w) return add(w.name, { ducats: w.cost, glory: w.gloryCost ?? 0 }, 'Weapon');
    const a = uniqueByName(shelf.armour, (x) => x.name, keys);
    if (a) return add(a.name, { ducats: a.cost, glory: a.gloryCost ?? 0 }, 'Armour');
    const q = uniqueByName(shelf.equipment, (x) => x.name, keys);
    if (q) return add(q.name, { ducats: q.cost, glory: q.gloryCost ?? 0 }, 'Equipment');

    const loose = uniqueByName(dataset.weapons ?? [], (x) => x.name, keys);
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
  data: TcWarbandData,
  round: number,
  unmatched: string[],
): { discoveries: string[]; effects: Warband['explorationEffects'] } {
  const known = dataset.campaign?.exploration?.skills ?? [];
  const effects: NonNullable<Warband['explorationEffects']> = [];

  for (const ref of data.exploration?.explorationskills ?? []) {
    const id = refId(ref);
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
  for (const loc of data.exploration?.locations ?? []) {
    const id = typeof loc === 'string' ? loc : refId(loc as TcRef);
    const name = isRecord(loc) && typeof loc.name === 'string' ? loc.name : '';
    const keys = namesFor(name, undefined, id);
    const hit = keys.length ? uniqueByName(rows, (r) => r.name, keys) : undefined;
    if (!hit) {
      unmatched.push(`Exploration Location '${name || id || 'unnamed'}'`);
      continue;
    }
    discoveries.push(hit.name);
  }

  return {
    discoveries,
    effects: effects.length ? effects : undefined,
  };
}

/**
 * The fields their record carries that this import does not read.
 *
 * Listed so a player can see what was skipped rather than find out later that
 * something did not arrive. The three per-model ones are always listed (see
 * `UNMAPPED_MODEL`); the Warband-level ones only when they hold something,
 * because "fireteams: none" is not news.
 */
function reportUnmapped(data: TcWarbandData, unmapped: string[]): void {
  const models = (data.models ?? []).map((l) => l.model).filter(Boolean) as TcModelInner[];

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

  if ((data.fireteams ?? []).length) {
    unmapped.push(`fireteams: ${(data.fireteams ?? []).length} recorded, and not mapped. `
      + 'A Fireteam is a name on a model here; their grouping has not been measured.');
  }
  if ((data.modifiers ?? []).length) {
    unmapped.push(`modifiers: ${(data.modifiers ?? []).length} recorded, and not mapped.`);
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
    warnings.push(
      `Their own numbers do not add up: ${allowance.ducats} Ducats and ${allowance.glory} Glory `
      + `banked, less a Strongbox of ${spare.ducats} and ${spare.glory}, means `
      + `${spent.ducats} and ${spent.glory} was spent — but their roster and stash are valued at `
      + `${accounted.ducats} and ${accounted.glory}. The Strongbox here is their own `
      + 'Strongbox figure, which is what their page shows; the quartermaster entry above is the '
      + 'difference, so the two agree here whatever their totals say.',
    );
  }

  return debited;
}
