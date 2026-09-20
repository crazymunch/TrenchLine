/**
 * Advancement Rolls: when a model earns a Skill, and which Skills it is offered.
 *
 * The app offered every model the same eight buttons — `+1 Melee`, `+1
 * Ranged`, `+1 Armour`, `+1" Move`, and four named Skills — and wrote the
 * chosen string onto `unit.advancements`. Trench Crusade has no characteristic
 * advances at all, and three of those four Skills do not exist. A second
 * screen stated a "5 XP unlocks a Skill" rule the book does not contain, and
 * the Codex rolled its Skills tables uniformly rather than on 2D6 (RR-03,
 * RR-04).
 *
 * What the book actually says, page 105:
 *
 * > Record the Experience Points the ELITE models in your Warband have earned
 * > on your Roster Sheet, by checking off one Experience box per point, from
 * > left to right, starting with the top row; when you reach a box that is a
 * > circle, you can make an Advancement Roll for the model.
 *
 * > **Advancement Rolls.** 1. Pick two of the Skill Tables to roll on. 2. Roll
 * > 2D6 for each of the tables… a. If you roll a Skill that the model already
 * > has, use the next lowest Skill from the table that the model does not have
 * > instead. If the model has all of the lower Skills from the table, use the
 * > next highest one. b. If a Patron Skill is rolled, use one of the Patron
 * > Skills for the Patron you picked for your Warband. 3. Pick one of the two
 * > Skills for the model to learn.
 *
 * Where the circles are is `dataset.campaign.experience.advancementAt`, read
 * out of the catalogue because the Roster Sheet page does not extract — see
 * `parseExperienceTrack`.
 */
import type { Dataset, SkillRow, SkillsTableName } from '../types/catalogue';
import type { ActiveUnit } from '../types/warband';

/** The Experience track, or `null` for a ruleset built before it was derived. */
export const experienceTrack = (dataset: Dataset | null | undefined) =>
  dataset?.campaign?.experience ?? null;

/**
 * How many Advancement Rolls this model is owed.
 *
 * Counted from Experience against the track, minus the rolls already taken.
 *
 * `advancementRolls` is its own field rather than `skills.length`, because a
 * model can gain a Skill without an Advancement Roll: a Patron grants them, so
 * do some Glory Items and the `65 Bitter Lessons` Trauma result's Experience.
 * Counting Skills would quietly cancel a roll the model had earned.
 *
 * Returns 0 where there is no track, rather than guessing a threshold — a
 * ruleset that cannot say when a roll is due must not invent one.
 */
export function advancementRollsDue(
  dataset: Dataset | null | undefined,
  unit: Pick<ActiveUnit, 'xp'> & { advancementRolls?: number },
): number {
  const track = experienceTrack(dataset);
  if (!track) return 0;

  const xp = Number.isFinite(unit.xp) ? unit.xp : 0;
  const earned = track.advancementAt.filter((at) => at <= xp).length;
  const taken = Number.isFinite(unit.advancementRolls) ? unit.advancementRolls! : 0;
  return Math.max(0, earned - taken);
}

/** The next total at which this model earns a roll, or `null` past the end. */
export function nextAdvancementAt(
  dataset: Dataset | null | undefined,
  xp: number,
): number | null {
  const track = experienceTrack(dataset);
  if (!track) return null;
  return track.advancementAt.find((at) => at > (Number.isFinite(xp) ? xp : 0)) ?? null;
}

/** The book's roll-2 result, which sends the player to their Patron's list. */
const PATRON_ROW = /^patron skill$/i;

export type Substitution =
  | 'none'
  /** Already held; took the next lowest the model lacks. */
  | 'next-lowest'
  /** Already held, and it holds every lower Skill; took the next highest. */
  | 'next-highest'
  /** Rolled the Patron Skill row; the Patron's own list is offered. */
  | 'patron';

export interface SkillOffer {
  table: SkillsTableName;
  /** The 2D6 total. */
  rolled: number;
  /** The row the dice actually landed on, or `null` if the table has none. */
  landedOn: SkillRow | null;
  /**
   * What the model may actually learn.
   *
   * One Skill in the ordinary case. The Patron result offers the Patron's
   * whole list, because the book says "use one of the Patron Skills" and the
   * choice is the player's. Empty where nothing is left to offer, which is
   * reported rather than filled in.
   */
  offered: SkillRow[];
  /** Why `offered` differs from `landedOn`. */
  substitution: Substitution;
}

/**
 * Resolve one table's 2D6 roll into the Skills the model may learn.
 *
 * `held` is the Skill names the model already has, matched case-insensitively
 * on the name alone: a Skill is the same Skill whichever table or Patron it
 * came from, and the book's "a Skill that the model already has" does not ask
 * where it came from.
 */
export function offerFor(
  dataset: Dataset | null | undefined,
  table: SkillsTableName,
  rolled: number,
  held: readonly string[] = [],
  patronSkills: readonly SkillRow[] = [],
): SkillOffer {
  const rows = dataset?.campaign?.skills?.[table] ?? [];
  const has = (r: SkillRow) =>
    held.some((h) => h.trim().toLowerCase() === r.name.trim().toLowerCase());

  /* Rows in roll order, so "next lowest" and "next highest" mean what the
     book means by them rather than whatever order the source listed. */
  const byRoll = [...rows].sort((a, b) => a.roll - b.roll);
  const landedOn = byRoll.find((r) => r.roll === rolled) ?? null;

  if (!landedOn) return { table, rolled, landedOn: null, offered: [], substitution: 'none' };

  if (PATRON_ROW.test(landedOn.name)) {
    /* The player's Patron decides, and the caller supplies the list. An empty
       list is reported as an empty offer rather than silently falling back to
       the table, which would hand out a Skill the Patron does not grant. */
    return {
      table,
      rolled,
      landedOn,
      offered: patronSkills.filter((p) => !has(p)),
      substitution: 'patron',
    };
  }

  if (!has(landedOn)) return { table, rolled, landedOn, offered: [landedOn], substitution: 'none' };

  /*
    "use the next lowest Skill from the table that the model does not have
    instead" — lowest by roll, searching downwards from where the dice landed.
  */
  const lower = byRoll.filter((r) => r.roll < landedOn.roll && !has(r) && !PATRON_ROW.test(r.name));
  if (lower.length) {
    return { table, rolled, landedOn, offered: [lower[lower.length - 1]], substitution: 'next-lowest' };
  }

  /* "If the model has all of the lower Skills from the table, use the next
     highest one." */
  const higher = byRoll.find((r) => r.roll > landedOn.roll && !has(r) && !PATRON_ROW.test(r.name));
  if (higher) return { table, rolled, landedOn, offered: [higher], substitution: 'next-highest' };

  /* Every Skill on the table. The book does not say what happens, so neither
     does this: an empty offer, reported, and the player picks the other
     table's Skill. */
  return { table, rolled, landedOn, offered: [], substitution: 'next-highest' };
}

/**
 * A whole Advancement Roll: two tables, two 2D6 rolls, two offers.
 *
 * Returns both; the player picks one, which is step 3 and is a decision, not a
 * derivation. Two of the same table is the caller's business — the book says
 * "pick two of the Skill Tables" and an app that silently corrected the choice
 * would be making it.
 */
export function advancementRoll(
  dataset: Dataset | null | undefined,
  tables: readonly [SkillsTableName, SkillsTableName],
  rolls: readonly [number, number],
  held: readonly string[] = [],
  patronSkills: readonly SkillRow[] = [],
): [SkillOffer, SkillOffer] {
  return [
    offerFor(dataset, tables[0], rolls[0], held, patronSkills),
    offerFor(dataset, tables[1], rolls[1], held, patronSkills),
  ];
}
