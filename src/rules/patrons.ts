/**
 * Patrons: whose list a Warband may pick from, and whether it has picked
 * (FD-15).
 *
 * Rulebook lines 4753 to 4755: *"Once they have recruited their Warband, they
 * must pick a Patron for it."* Lines 4757 to 4759: the Patron *"determines
 * which skill you may select if you roll a Patron Skill result on any of the
 * Skill Tables"*. Line 6042: *"If a Patron Skill is rolled, use one of the
 * Patron Skills for the Patron you picked for your Warband."*
 *
 * So a campaign Warband with no Patron recorded is a **gap in the record**, not
 * a case the rules leave open. `patronSkillsFor` in `rules/advancement.ts`
 * already reports that gap honestly — it offers nothing rather than falling
 * back to the table — and this module is the other half: which Patrons the
 * Warband may choose from, so the gap can be closed on the spot.
 *
 * **Eligibility is read from the Patron's own printed restriction**, never from
 * a list of faction-to-Patron pairs written here. The eleven Patrons are
 * derived into `dataset.patrons` with the sentence the book prints beside each
 * one — "Iron Sultanate only.", "Faithful Warbands only." — and this matches
 * the Warband's faction and alignment against that sentence.
 *
 * A restriction this cannot read comes back `'unknown'`, and the caller shows
 * the Patron with its sentence rather than hiding it. That is the safe side to
 * fail on in both directions: hiding a Patron the book allows would stop a
 * player recording what their Warband actually has, and silently allowing one
 * it forbids would put a wrong Patron on the sheet. `'unknown'` says the app
 * cannot tell and prints the rule so the player can.
 */
import type { Dataset, Patron } from '@/types/catalogue';
import type { Warband } from '@/types/warband';
import { factionKey, factionOf } from './variants';
import { nameKey } from './names';

/** Whether the Warband's faction may take this Patron, as far as the page says. */
export type PatronEligibility = 'yes' | 'no' | 'unknown';

export interface PatronOffer {
  patron: Patron;
  eligible: PatronEligibility;
  /** The restriction exactly as the book prints it. Always shown. */
  restriction: string;
}

/**
 * Every spelling of this faction that a restriction sentence might use.
 *
 * Both the normalised name and `factionKey`'s canonical token, because the two
 * differ in the two places it matters: the rulebook writes "Black Grail" where
 * the dataset's faction is "Cult of the Black Grail", and it writes "The Court
 * of the Seven-Headed Serpent" where the app's id is `court-seven-serpents`.
 * Taking both spellings is how one comparison covers both directions.
 */
function spellings(dataset: Dataset, factionId: string): string[] {
  const faction = factionOf(dataset, factionId);
  const raw = [factionId, faction?.id, faction?.name].filter(Boolean) as string[];
  const out = new Set<string>();
  for (const r of raw) {
    const k = nameKey(r);
    if (k) out.add(k);
    const c = factionKey(r);
    if (c) out.add(c);
  }
  return [...out];
}

const ALIGNMENT = /(faithful|fallen)warband/g;

/**
 * The faction a parenthesised qualifier attaches to, if the sentence has one.
 *
 * MAMMON is *"Heretic Legions or Court of the Seven-Headed Serpent (Greed
 * Warband) only."* — the bracket restricts the COURT half to a Greed Warband,
 * and the app records no Court warband's Sin. A plain substring match on the
 * faction name ignored the bracket and offered Mammon to every Court warband
 * (review round 1, finding G).
 *
 * The bracket is read structurally, never by its contents: a parenthesis
 * qualifies the thing it FOLLOWS, so the subject is the text from the last
 * conjunction before it up to the bracket. That keeps the reading to one rule
 * of English punctuation rather than a list of Sins this module would then own.
 *
 * It attaches to one side only, which is the point: the Heretic Legions half of
 * that same sentence carries no qualifier and stays a plain `yes`.
 *
 * Empty where the sentence has no bracket, which is ten of the eleven.
 */
function qualifiedSubject(restriction: string): string {
  const open = restriction.indexOf('(');
  if (open < 0) return '';
  const before = restriction.slice(0, open);
  const parts = before.split(/\bor\b|\band\b|&|,|\//i);
  return nameKey(parts[parts.length - 1] ?? '');
}

/**
 * Read one Patron's restriction against one faction.
 *
 * Two things a restriction can say, and the page says only these two: a
 * faction by name, or an alignment ("Faithful Warbands only."). Anything else
 * is `'unknown'`.
 */
export function patronEligibility(
  dataset: Dataset,
  factionId: string,
  patron: Pick<Patron, 'restriction'>,
): PatronEligibility {
  const text = nameKey(patron.restriction ?? '');
  if (!text) return 'unknown';

  const mine = spellings(dataset, factionId);
  /*
    Substring, and it has to be: the sentence joins factions with "and", "&"
    and "or", and parenthesises a Variant — "Heretic Legions or Court of the
    Seven-Headed Serpent (Greed Warband) only." — so there is no token list to
    split on that every one of the eleven sentences obeys.
  */
  const namesMine = mine.some((m) => m.length > 3 && text.includes(m));

  const alignments = [...text.matchAll(ALIGNMENT)].map((m) => m[1]);
  const myAlignment = nameKey(factionOf(dataset, factionId)?.alignment ?? '');
  const alignsMine = alignments.length > 0 && !!myAlignment
    && alignments.includes(myAlignment);

  /*
    A qualifier on MY side of the sentence is a condition this app cannot
    evaluate, so the verdict is `unknown` rather than `yes` — offered, with the
    sentence printed, for the player to decide. A qualifier on somebody else's
    side says nothing about this faction.
  */
  const qualified = qualifiedSubject(patron.restriction ?? '');
  if (namesMine && qualified && mine.some((m) => m.length > 3 && qualified.includes(m))) {
    return 'unknown';
  }
  if (namesMine || alignsMine) return 'yes';

  /*
    The sentence named SOMEBODY — another faction, or the other alignment — so
    it is a restriction this app read and this faction failed. That is a
    'no' the player can be shown a reason for, rather than a shrug.
  */
  const namesAnyone = (dataset.factions ?? []).some((f) => {
    const k = nameKey(f.name);
    const c = factionKey(f.name);
    return (k.length > 3 && text.includes(k)) || (c.length > 3 && text.includes(c));
  });
  if (namesAnyone || alignments.length > 0) return 'no';

  return 'unknown';
}

/**
 * The Patrons on offer to this Warband, eligible ones first.
 *
 * Every Patron the ruleset carries is returned, each with its verdict, so a
 * caller can print the eligible list and still account for the rest. Returning
 * only the eligible ones would make an empty list mean two different things —
 * no Patron applies, or no Patron data shipped.
 */
export function patronsFor(
  dataset: Dataset | null | undefined,
  factionId: string,
): PatronOffer[] {
  if (!dataset) return [];
  const order: Record<PatronEligibility, number> = { yes: 0, unknown: 1, no: 2 };
  return (dataset.patrons ?? [])
    .map((patron) => ({
      patron,
      eligible: patronEligibility(dataset, factionId, patron),
      restriction: patron.restriction ?? '',
    }))
    .sort((a, b) => order[a.eligible] - order[b.eligible]);
}

/** The Patron this Warband has recorded, matched by name, or undefined. */
export function patronNamed(
  dataset: Dataset | null | undefined,
  name: string | null | undefined,
): Patron | undefined {
  const want = String(name ?? '').trim().toLowerCase();
  if (!want) return undefined;
  return (dataset?.patrons ?? []).find((p) => p.name.trim().toLowerCase() === want);
}

/**
 * Whether this Warband is one the book requires a Patron of, and has none.
 *
 * *"Once they have recruited their Warband, they must pick a Patron for it"* is
 * in the campaign chapter, and only a campaign Warband has a Skill Table to
 * roll a Patron Skill on — an `unrestricted` list is a one-off game. So this is
 * a gap in a CAMPAIGN record and nothing at all for a list somebody is trying
 * out, which is the difference between a prompt that helps and one that nags.
 *
 * A Warband with no `forceMode` recorded is treated as a campaign Warband:
 * every Warband saved before the field existed was on the published economy,
 * which is what `forceBudget` assumes for the same reason.
 */
export function patronMissing(
  warband: Pick<Warband, 'patron' | 'forceMode'> | null | undefined,
): boolean {
  if (!warband) return false;
  if (warband.forceMode === 'unrestricted') return false;
  return !String(warband.patron ?? '').trim();
}
