/**
 * A Takwin Homunculus, and the Alchemist that made it.
 *
 * Warbands of Trench Crusade, L5294 to L5302:
 *
 * > **Takwin Homunculus:** A House of Wisdom Warband can include one Takwin
 * > Homunculus for each Jabirean Alchemist in the Warband. Each Takwin
 * > Homunculus must be associated with a Jabirean Alchemist when it is added to
 * > the Warband. An Alchemist can only have a single Takwin Homunculus
 * > associated with it and vice versa. **If a Takwin Homunculus associated
 * > Alchemist is killed during the campaign, it cannot be deployed during a
 * > game, its Battlekit cannot be changed, and no Alchemical Formulas can be
 * > applied to it.** If you add a new Jabirean Alchemist to your Warband and it
 * > has any unassociated Takwin Homunculi, you must associate one of them with
 * > the new Alchemist.
 *
 * ## Re-creation is a separate rule, and it IS in the book
 *
 * This comment used to say that FD-13b's **Re-creation** offer — a killed
 * Takwin Homunculus offering *"Re-create for 40 Ducats in the Quartermaster
 * Step"* — "is not in any source this repository carries", and the item was
 * declined on that basis. **That was wrong.**
 *
 * It is at Warbands L5324 to L5327, in this entry's own Abilities:
 *
 * > **Re-creation:** If a Takwin Homunculus is killed in the post-battle
 * > sequence, you do not have to remove it from your roster. Instead, you can
 * > spend 40 👑 in the following Quartermaster Step to leave it on the Roster.
 *
 * The search that missed it looked for the phrase "post-battle sequence" in
 * the extracted PDF, which breaks the word across a line as `post-` /
 * `battle`. The catalogue carries the same ability (`Iron Sultanate.cat`
 * L3362) and the shipped dataset prints it six times. The 40 Ducats is this
 * rule's own price and coincides with the entry's purchase price (L5309); the
 * coincidence was read as the explanation.
 *
 * It lives in `rules/recreation.ts`, which reads it from the model's ability
 * text rather than from a phrase search over PDF output — the dataset is the
 * pipeline's own reconciled output and does not hyphenate across lines.
 *
 * This module is the OTHER Takwin rule, and the two are independent: an
 * Alchemist's death restricts a Takwin that is alive, and Re-creation decides
 * whether a killed one stays on the roster at all.
 */
import type { Dataset } from '../types/catalogue';

/** What a Takwin may no longer do once its Alchemist is dead. */
export interface TakwinRestrictions {
  /** *"it cannot be deployed during a game"* */
  cannotDeploy: boolean;
  /** *"its Battlekit cannot be changed"* */
  battlekitLocked: boolean;
  /** *"no Alchemical Formulas can be applied to it"* */
  noFormulas: boolean;
  /** The sentence, for the screen that has to justify refusing. */
  reason: string;
}

const NONE: TakwinRestrictions = {
  cannotDeploy: false, battlekitLocked: false, noFormulas: false, reason: '',
};

/**
 * The rule's own sentence, from the Variant's stated text where it ships.
 *
 * Matched on what the text SAYS rather than on the Variant's name, the rule
 * `capture.ts` and `golem.ts` follow. Falls back to the book's words where the
 * dataset does not carry the Variant's prose, so the reason a player is shown
 * is always a quotation rather than a paraphrase — but `found` records which,
 * so a caller can tell the difference and the tests can assert it.
 */
const BOOK_SENTENCE =
  'If a Takwin Homunculus associated Alchemist is killed during the campaign, '
  + 'it cannot be deployed during a game, its Battlekit cannot be changed, and '
  + 'no Alchemical Formulas can be applied to it.';

const RULE = /associated Alchemist is killed during the campaign[^.]*\./i;

export function takwinRuleText(
  dataset: Dataset | null | undefined,
): { text: string; found: boolean } {
  const hay = JSON.stringify(
    (dataset as unknown as { variants?: unknown })?.variants ?? null);
  const m = hay ? RULE.exec(hay) : null;
  return m
    ? { text: m[0].replace(/\\"/g, '"'), found: true }
    : { text: BOOK_SENTENCE, found: false };
}

/**
 * What this Takwin may no longer do.
 *
 * `alchemistAlive` is passed in rather than looked up: the association is a
 * fact about the roster, and a rules module that went looking for it would
 * have to guess at how a given roster records one. `null` — no association
 * recorded at all — is NOT treated as a dead Alchemist: an unassociated
 * Homunculus is what the book's last sentence is about, and a model the
 * importer could not match should not be silently benched.
 */
export function takwinRestrictions(
  dataset: Dataset | null | undefined,
  opts: { isTakwin: boolean; alchemistAlive: boolean | null },
): TakwinRestrictions {
  if (!opts.isTakwin || opts.alchemistAlive !== false) return NONE;
  return {
    cannotDeploy: true,
    battlekitLocked: true,
    noFormulas: true,
    reason: takwinRuleText(dataset).text,
  };
}

/**
 * How many Takwin Homunculi a Warband may field.
 *
 * *"one Takwin Homunculus for each Jabirean Alchemist in the Warband"* — a
 * cap the roster validator can check, counted from the roster rather than
 * stored.
 */
export const takwinAllowance = (alchemists: number): number =>
  Math.max(0, Number.isFinite(alchemists) ? Math.floor(alchemists) : 0);

/**
 * The two entries the association rule names, read from its own sentence.
 *
 * *"A House of Wisdom Warband can include one **Takwin Homunculus** for each
 * **Jabirean Alchemist** in the Warband."*
 *
 * Parsed rather than typed here, for rule 1: a Dispatch that renames either
 * entry renames it in this sentence too, and a build whose text loses the
 * sentence returns `null` — the rule stops being applied — rather than going
 * on matching two remembered names.
 */
const ASSOCIATION =
  /can include one ([A-Z][A-Za-zÀ-ɏ'’ -]*?) for each ([A-Z][A-Za-zÀ-ɏ'’ -]*?) in the Warband/i;

export function takwinEntries(
  dataset: Dataset | null | undefined,
): { homunculus: string; alchemist: string } | null {
  const hay = JSON.stringify(
    (dataset as unknown as { variants?: unknown })?.variants ?? null);
  const m = hay ? ASSOCIATION.exec(hay) : null;
  return m ? { homunculus: m[1].trim(), alchemist: m[2].trim() } : null;
}

/**
 * Whether THIS Homunculus still has its Alchemist, from the roster's counts.
 *
 * The association is real and one-to-one — *"Each Takwin Homunculus must be
 * associated with a Jabirean Alchemist when it is added to the Warband. An
 * Alchemist can only have a single Takwin Homunculus associated with it and
 * vice versa"* — and the app has never recorded WHICH Alchemist. So the
 * counts are all there is, and they answer the question exactly twice:
 *
 * - **No living Alchemist at all, and a Homunculus on the roster.** Every
 *   Homunculus has lost the one it was bound to. `false`, and the rule bites.
 * - **At least as many living Alchemists as Homunculi.** One-to-one and
 *   enough to go round, so none of them has lost anything. `true`.
 *
 * Between those, some have and some have not, and nothing on the roster says
 * which. That is `null` — *unknown* — and `takwinRestrictions` deliberately
 * does not treat `null` as a dead Alchemist. Refusing all of them would
 * bench models whose Alchemist is alive, which is the one direction of error
 * that costs a player a model they still own; the caller shows the sentence
 * as a caveat instead and the player applies it.
 *
 * A Golem is not counted here by any caller: it is created by the Book of
 * Golems with no Alchemist at all, and the grant governs it instead.
 */
export function alchemistAliveFor(
  counts: { alchemists: number; homunculi: number },
): boolean | null {
  if (counts.homunculi <= 0) return null;
  if (counts.alchemists <= 0) return false;
  return counts.homunculi <= counts.alchemists ? true : null;
}
