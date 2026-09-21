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
 * ## What this is NOT
 *
 * FD-13b asked for a **Re-creation** offer: a killed Takwin Homunculus
 * offering *"Re-create for 40 Ducats in the Quartermaster Step"* instead of
 * going to `fallen`. **That rule is not in any source this repository
 * carries.** Searched across all seven extracted books — the Digital Rulebook,
 * Warbands, the Commentaries, All Out War, the weather and changelog files —
 * the only occurrence of "re-create" in any form is the Hegemon at Warbands
 * L8047, and it says the opposite: *"Each Hegemon is unique, thus when slain it
 * can never be re-created."*
 *
 * The 40 Ducats appears to have come from the entry's purchase price (Warbands
 * L5309, *"Takwin Homunculus - Cost: 40 👑"*), which is what the model costs to
 * BUY, not evidence of a mechanic for rebuilding a dead one.
 *
 * So it is not built. CLAUDE.md's first two rules are that game data is
 * derived and cited, and that the app fails loudly rather than inventing a
 * plausible-looking answer; a post-battle step offering a player a rule the
 * book does not contain is the second failure exactly. The finding is in the
 * pull request for a ruling.
 *
 * What the book DOES say about a Takwin whose Alchemist has died is the
 * sentence above, and that is what this module derives. The design already
 * wanted half of it — FD-13a item 2 asks that *"a Takwin whose Alchemist has
 * died cannot buy"* — and the app implemented none of it.
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
