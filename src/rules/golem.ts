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
