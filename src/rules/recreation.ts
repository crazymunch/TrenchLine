/**
 * Re-creation: paying to keep a model the post-battle sequence killed.
 *
 * Two entries carry it, and they are not the same rule.
 *
 * **The Takwin Homunculus**, Warbands of Trench Crusade L5324 to L5327:
 *
 * > **Re-creation:** If a Takwin Homunculus is killed in the post-battle
 * > sequence, you do not have to remove it from your roster. Instead, you can
 * > spend 40 👑 **in the following Quartermaster Step** to leave it on the
 * > Roster.
 *
 * **The Golem**, from the Book of Golems exploration find:
 *
 * > **Re-creation:** If the Homunculus is taken Out of Action during battle,
 * > and is deemed to have been killed in the post-battle sequence, you do not
 * > have to remove it from your roster. Instead, you can spend 40 ducats **at
 * > any time between battles** to bring it back to life with all of its
 * > weapons and abilities.
 *
 * Same price, same trigger, different deadline — and the app has to honour the
 * difference, because one expires and the other does not.
 *
 * ## A correction
 *
 * `takwin.ts` used to carry a long note saying this rule "is not in any source
 * this repository carries", and FD-13b's first item was declined on that
 * basis. **That was wrong.** The search that produced it looked for the phrase
 * "post-battle sequence", and the extracted PDF breaks the word across a line
 * as `post-` / `battle`, so the phrase never matched even though the sentence
 * was there. The catalogue has it too (`Iron Sultanate.cat` L3362), and the
 * shipped dataset prints it six times.
 *
 * The lesson is in where this reads from. A rule is derived from
 * `dataset.units[].abilities`, not from a phrase search over extracted PDF
 * text: the dataset is the pipeline's own output, already reconciled across
 * both sources, and it does not hyphenate across lines.
 *
 * ## Derived from what the ability SAYS
 *
 * The same pattern as `capture.ts`, `extraExperience.ts` and `golem.ts`:
 * matched on the sentence, never on the model's name or the ability's
 * position. A Dispatch that renames the ability or moves it to another entry
 * needs no edit here, and a Dispatch that removes the sentence stops finding
 * the rule rather than silently applying a remembered version.
 */
import type { Cost, Dataset } from '../types/catalogue';
import type { ActiveUnit } from '../types/warband';

/**
 * When the payment may be made.
 *
 * `quartermaster` expires: the book says *the following* Quartermaster Step,
 * so an offer not taken in that step is gone. `between-battles` does not.
 * Read from the sentence, never defaulted — an offer whose deadline could not
 * be read is not offered at all, because guessing it wrong either takes a
 * player's model away early or keeps it forever.
 */
export type RecreationDeadline = 'quartermaster' | 'between-battles';

export interface RecreationOffer {
  /** The ability, as printed. */
  ability: string;
  /** What it costs to take. */
  cost: Cost;
  deadline: RecreationDeadline;
  /** The sentence, for the screen that has to justify the offer. */
  text: string;
}

/**
 * The trigger, the price and nothing else.
 *
 * `[\s\S]*?` rather than `.*?` because the description may carry a newline —
 * the Golem's runs to two clauses — and a dot that does not match one would
 * find the trigger and miss the price.
 */
const OFFER = /killed in the post-?\s*battle sequence[\s\S]*?you do not have to remove it from your roster[\s\S]*?spend\s+(\d+)\s*(ducats?|👑|glory|☼)/i;

const DEADLINES: readonly [RegExp, RecreationDeadline][] = [
  [/in the following Quartermaster Step/i, 'quartermaster'],
  [/at any time between battles/i, 'between-battles'],
];

const GLORY = /glory|☼/i;

/** Read one ability. `null` where it is not a Re-creation offer at all. */
export function recreationFromText(
  ability: { name?: string; description?: string } | null | undefined,
): RecreationOffer | null {
  const text = (ability?.description ?? '').trim();
  if (!text) return null;

  const m = OFFER.exec(text);
  if (!m) return null;

  const deadline = DEADLINES.find(([re]) => re.test(text))?.[1];
  /*
    A sentence that offers the payment and does not say by when. Not offered,
    because both answers are wrong in a way the player would not see: treated
    as `quartermaster` it silently discards a model a Golem's owner could
    still have saved, and as `between-battles` it keeps a Takwin on the roster
    a campaign after the book took it away.
  */
  if (!deadline) return null;

  const amount = Number(m[1]);
  const glory = GLORY.test(m[2]);
  return {
    ability: (ability?.name ?? '').trim() || 'Re-creation',
    cost: { ducats: glory ? 0 : amount, glory: glory ? amount : 0 },
    deadline,
    text,
  };
}

/**
 * The offer this model carries, if any.
 *
 * Read from the model's OWN profile snapshot rather than from the dataset,
 * so a roster built under one ruleset keeps the rule it was built with — the
 * same reason every other post-battle rule reads the snapshot.
 */
export function recreationOffer(
  unit: Pick<ActiveUnit, 'profileSnapshot'> | null | undefined,
): RecreationOffer | null {
  for (const a of unit?.profileSnapshot?.innateAbilities ?? []) {
    const offer = recreationFromText(a);
    if (offer) return offer;
  }
  return null;
}

/**
 * Every entry in the ruleset that carries one, for the survey a test pins.
 *
 * Not used by the app: the app asks a model, not the ruleset. This exists so
 * a change in how many entries carry the rule is visible in a test rather
 * than discovered by a player.
 */
export function recreationEntries(
  dataset: Dataset | null | undefined,
): { unit: string; offer: RecreationOffer }[] {
  const out: { unit: string; offer: RecreationOffer }[] = [];
  for (const u of dataset?.units ?? []) {
    for (const a of u.abilities ?? []) {
      const offer = recreationFromText(a);
      if (offer) { out.push({ unit: u.name, offer }); break; }
    }
  }
  return out;
}
