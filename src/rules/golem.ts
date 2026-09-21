/**
 * The Book of Golems, read from the Exploration result that grants it.
 *
 * FD-13b. Exploration 17 (Digital Rulebook L6902 to L6912):
 *
 * > **Book of Golems:** You find a Rabbinic manual on creating Golems.
 * > Studying it allows you to create a Golem. Add a Takwin Homunculus from The
 * > House of Wisdom Variant Warband in the Iron Sultanate Faction List to your
 * > Warband. It has the Human Hands Alchemical Formula, plus Alchemical
 * > Formulas worth a total of up to 50 👑 for free (you do not have to pay for
 * > the Formulas that you choose). The Golem has the GOLEM Keyword, and
 * > replaces the SULTANATE Keyword with your Faction's Keyword. You can
 * > purchase Battlekit for it in the Quartermaster Step, using your own
 * > Armoury Tables instead of the ones in the Iron Sultanate Faction List. The
 * > model is treated as an Ally that can never be Promoted or receive
 * > additional Alchemical Formulas.
 *
 * **The rulebook, not the catalogue.** The community catalogue's Book of
 * Golems entry says "a Homunculus of up to 100 ducats of value (40 ducats base
 * cost)", which is a different rule reached by a different route: the book
 * grants Human Hands plus fifty Ducats of Formulas, and prices the model at
 * nothing. Both land near 100 Ducats of value, which is presumably why the
 * catalogue phrased it that way, but only one of them is the rule. Precedence
 * is rulebook over catalogue, so this reads the rulebook — and reads it from
 * the shipped Exploration table rather than retyping it, so the build's own
 * cross-check governs the text.
 *
 * **On the model's price.** The book states none: *"Add a Takwin Homunculus …
 * to your Warband"*, with no cost in the sentence, exactly as the other
 * Exploration results that add a model are phrased. So the Golem is added
 * free. That is a reading rather than a quotation, and it is the one the
 * design states; it is recorded here, at the code that acts on it, because
 * `data-sources/resolutions.json` cannot hold it — that file is a typed table
 * of field-level conflicts (`<Entry>.<verified field>`), applied to the
 * dataset by `applyResolutions`, and a rules reading keyed to no field would
 * be rejected by the build rather than recorded.
 */
import type { Dataset } from '../types/catalogue';

export interface GolemGrant {
  /** The Exploration roll that grants it, as the table states it. */
  roll: string;
  name: string;
  /** The row's own words, for the panel that offers it. */
  text: string;
  /** Formulas up to this many Ducats are free. */
  freeFormulaDucats: number;
  /** The Formula the model is created holding. */
  startsWith: string;
  /** The Keyword the Golem gains. */
  addsKeyword: string;
  /** The Keyword the host Warband's own replaces. */
  replacesKeyword: string;
  /** *"can never be Promoted"* */
  neverPromoted: boolean;
  /** *"or receive additional Alchemical Formulas"* */
  noFurtherFormulas: boolean;
  /** Battlekit comes from the host's Armoury, not the Sultanate's. */
  hostArmoury: boolean;
}

/** *"Alchemical Formulas worth a total of up to 50 👑 for free"* */
const FREE_BUDGET = /Formulas worth a total of up to\s+(\d+)/i;
/** *"It has the Human Hands Alchemical Formula"* */
const STARTS_WITH = /It has the ([A-Za-z][A-Za-z '-]*?) Alchemical Formula/i;
/** *"The Golem has the GOLEM Keyword"* */
const ADDS = /has the ([A-Z][A-Z ]+) Keyword/;
/** *"replaces the SULTANATE Keyword with your Faction's Keyword"* */
const REPLACES = /replaces the ([A-Z][A-Z ]+) Keyword with your Faction/;

const asGrant = (row: {
  roll?: unknown; name?: string; description?: string;
}): GolemGrant | null => {
  const text = row.description ?? '';
  const budget = FREE_BUDGET.exec(text);
  const starts = STARTS_WITH.exec(text);
  const adds = ADDS.exec(text);
  if (!budget || !starts || !adds) return null;

  const replaces = REPLACES.exec(text);
  const r = row.roll as { from?: number; to?: number } | string | undefined;
  const roll = typeof r === 'string'
    ? r
    : r && r.from != null
      ? (r.to != null && r.to !== r.from ? `${r.from}-${r.to}` : String(r.from))
      : '';

  return {
    roll,
    name: row.name ?? '',
    text,
    freeFormulaDucats: Number(budget[1]),
    startsWith: starts[1].trim(),
    addsKeyword: adds[1].trim(),
    replacesKeyword: replaces ? replaces[1].trim() : '',
    neverPromoted: /never be Promoted/i.test(text),
    noFurtherFormulas: /receive additional Alchemical Formulas/i.test(text),
    hostArmoury: /using your own Armoury Tables/i.test(text),
  };
};

/**
 * The grant, found by what the row SAYS.
 *
 * Every Exploration band is searched and the row is matched on its own
 * sentences, not on the roll 17 or the name "Book of Golems" — the rule
 * `capture.ts` follows for Trauma 12 and `extraExperience.ts` for Trauma 65.
 * A Dispatch that renumbers or renames needs no edit here, and a build whose
 * table loses the sentence stops finding the grant rather than quietly
 * applying a remembered version of it.
 */
export function golemGrant(dataset: Dataset | null | undefined): GolemGrant | null {
  const bands = (dataset as unknown as {
    campaign?: { exploration?: { locations?: Record<string, unknown[]> } };
  })?.campaign?.exploration?.locations;
  for (const rows of Object.values(bands ?? {})) {
    for (const row of (rows ?? []) as { name?: string; description?: string }[]) {
      const grant = asGrant(row);
      if (grant) return grant;
    }
  }
  return null;
}

/** What a model created by the grant carries, before anything is bought. */
export const GOLEM_GRANTED_BY = 'Book of Golems';

/** Whether this model was created by the grant, however it reached the roster. */
export const isGolem = (unit: { grantedBy?: string } | null | undefined): boolean =>
  unit?.grantedBy === GOLEM_GRANTED_BY;

/**
 * The Keywords a Golem's card shows, with the host Warband's in place.
 *
 * Derived rather than written onto the model at creation, for the reason
 * FD-07 settled for Exploration Skills: a stored copy is a second source of
 * truth that stops agreeing with the entry the moment a layer changes it.
 */
export function golemKeywords(
  grant: GolemGrant | null,
  entryKeywords: readonly string[] = [],
  hostFactionKeyword?: string,
): string[] {
  if (!grant) return [...entryKeywords];
  const out = entryKeywords.filter(
    (k) => k.trim().toUpperCase() !== grant.replacesKeyword.toUpperCase());
  if (hostFactionKeyword && grant.replacesKeyword) out.push(hostFactionKeyword);
  if (!out.some((k) => k.trim().toUpperCase() === grant.addsKeyword.toUpperCase())) {
    out.push(grant.addsKeyword);
  }
  return out;
}

/** What is left of the free-Formula budget, in Ducats. */
export const freeFormulaBudgetLeft = (
  grant: GolemGrant | null,
  spent: number,
): number => Math.max(0, (grant?.freeFormulaDucats ?? 0) - (Number.isFinite(spent) ? spent : 0));

/* ------------------------------------------------------------------ *
 * Finding the Golem on an imported roster
 * ------------------------------------------------------------------ */

export interface GolemCandidate {
  /** Index into the list handed in, so the caller marks its own object. */
  index: number;
  name: string;
  /** Ducats of Formulas held beyond the one the grant supplies. */
  formulaDucats: number;
}

/**
 * Which imported model the Book of Golems created, where that can be KNOWN.
 *
 * The design identifies it as "the Homunculus that has no Alchemist
 * association". The export records no association anywhere — searched, it is
 * absent from both Homunculi — so that test cannot be applied to a real file.
 * What CAN be applied is the grant's own rule:
 *
 *   - **"can never be Promoted"**, so a Homunculus carrying a promotion is not
 *     the Golem. This is the discriminator, and it is a rule rather than a
 *     guess.
 *   - **"Alchemical Formulas worth a total of up to 50 👑 for free"**, so one
 *     holding more than the budget beyond the granted Formula is not it
 *     either.
 *
 * Returns every model that passes both. The caller marks one only when there
 * is exactly one — with two, the roster cannot say which, and the honest
 * answer is to mark neither and let the player use the manual action rather
 * than pick by coin-toss (rule 2: fail loudly, never invent a plausible
 * answer).
 *
 * On the owner's August export this returns exactly one: Al-Mudawwan, the
 * Inscribed, holding Enslaved Mind, Inhuman Strength, Additional Arm and Hawk
 * Eyes — 10 + 15 + 15 + 10 = **50 Ducats**, the budget to the Ducat. Its
 * companion Al-Masyukh is excluded by its Elite Promotion.
 */
export function golemCandidates(
  grant: GolemGrant | null,
  models: readonly {
    name?: string;
    promoted?: boolean;
    /** Every Formula the model holds, with the Ducats the catalogue prices it at. */
    formulas?: readonly { name: string; ducats: number }[];
  }[] = [],
): GolemCandidate[] {
  if (!grant) return [];
  const out: GolemCandidate[] = [];
  models.forEach((m, index) => {
    if (grant.neverPromoted && m.promoted) return;
    const held = m.formulas ?? [];
    /* The granted Formula is supplied by the grant, so it is not spent. */
    const beyond = held
      .filter((f) => f.name.trim().toLowerCase() !== grant.startsWith.toLowerCase())
      .reduce((sum, f) => sum + (Number.isFinite(f.ducats) ? f.ducats : 0), 0);
    if (beyond > grant.freeFormulaDucats) return;
    if (!held.some((f) => f.name.trim().toLowerCase() === grant.startsWith.toLowerCase())) return;
    out.push({ index, name: m.name ?? '', formulaDucats: beyond });
  });
  return out;
}

/** The one model to mark, or `null` where the roster cannot say. */
export const soleGolem = (candidates: readonly GolemCandidate[]): GolemCandidate | null =>
  candidates.length === 1 ? candidates[0] : null;

/**
 * What the catalogue charges for each Alchemical Formula, by name.
 *
 * Read from the dataset rather than listed here, so the budget arithmetic is
 * the catalogue's and not this file's (rule 1). Names are kept in the
 * catalogue's own spelling and matched case-insensitively by the caller.
 */
export function formulaPrices(dataset: Dataset | null | undefined): Map<string, number> {
  const out = new Map<string, number>();
  const walk = (n: unknown) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    const node = n as { name?: unknown; cost?: unknown; baseCost?: unknown };
    if (typeof node.name === 'string') {
      const c = node.cost;
      const ducats = typeof c === 'number'
        ? c
        : (c && typeof c === 'object' && typeof (c as { ducats?: unknown }).ducats === 'number')
          ? (c as { ducats: number }).ducats
          : typeof node.baseCost === 'number' ? node.baseCost : undefined;
      const key = node.name.trim().toLowerCase();
      if (ducats !== undefined && !out.has(key)) out.set(key, ducats);
    }
    for (const v of Object.values(n as object)) if (typeof v === 'object') walk(v);
  };
  walk(dataset);
  return out;
}

/**
 * Mark the Golem on a freshly imported roster, where the roster can say which.
 *
 * Kept here rather than in the importer: the importer's job is to turn a file
 * into models and report what the `Campaign Rules > Enabled` subtree NAMES,
 * and deciding what "Book of Golems" means — which model it created, and by
 * which of the grant's clauses — is a rules question.
 *
 * Mutates nothing. Returns the index to mark and the reason, or `null` with
 * the reason it could not say, so a caller can put that in front of the player
 * instead of silently doing nothing.
 */
export function golemOnImport(
  dataset: Dataset | null | undefined,
  campaignRules: readonly string[],
  units: readonly {
    customName?: string;
    profileSnapshot?: { name?: string; elite?: boolean; category?: string };
    equippedEquipment?: readonly { name: string }[];
    specialUpgrades?: readonly { name: string }[];
    skills?: readonly { name: string }[];
  }[],
): { index: number; name: string; reason: string } | { index: null; reason: string } {
  const grant = golemGrant(dataset);
  if (!grant) return { index: null, reason: 'This ruleset carries no Book of Golems.' };

  const held = campaignRules.some(
    (r) => r.trim().toLowerCase() === grant.name.trim().toLowerCase());
  if (!held) {
    return { index: null, reason: `This roster does not hold the ${grant.name}.` };
  }

  const prices = formulaPrices(dataset);
  const models = units.map((u) => {
    const names = [
      ...(u.equippedEquipment ?? []), ...(u.specialUpgrades ?? []), ...(u.skills ?? []),
    ].map((x) => x.name).filter(Boolean);
    return {
      name: u.customName ?? u.profileSnapshot?.name ?? '',
      promoted: u.profileSnapshot?.elite === true || u.profileSnapshot?.category === 'Elite',
      formulas: names.map((n) => ({ name: n, ducats: prices.get(n.trim().toLowerCase()) ?? 0 })),
    };
  });

  const found = golemCandidates(grant, models);
  const one = soleGolem(found);
  if (one) {
    return {
      index: one.index,
      name: one.name,
      reason: `${grant.name}: ${one.name} holds ${grant.startsWith} and `
        + `${one.formulaDucats} Ducats of Formulas, within the grant's `
        + `${grant.freeFormulaDucats}, and has not been Promoted.`,
    };
  }
  return {
    index: null,
    reason: found.length === 0
      ? `No model on this roster fits the ${grant.name}: the grant creates one holding `
        + `${grant.startsWith}, never Promoted, with at most `
        + `${grant.freeFormulaDucats} Ducats of Formulas.`
      : `${found.length} models fit the ${grant.name} (${found.map((c) => c.name).join(', ')}), `
        + 'so the roster cannot say which it created. Mark it by hand.',
  };
}
