/**
 * Experience beyond the point for surviving and the point for a Deed.
 *
 * Two rules in the book grant more, and the wizard applied neither (RR-05).
 * They are opposites in almost every respect, which is why they are worth
 * reading together rather than as two unrelated additions:
 *
 * **War Stories**, Wildcard Skill 11 (p.110):
 *
 * > When you are recording the Experience Points earned by the models in your
 * > Warband in the Campaign Phase, you can give each model with the ELITE
 * > Keyword that does not also have this Skill +1 extra Experience Point. You
 * > can't pick the model with the Skill itself. A Warband can only have one
 * > model with this Skill.
 *
 * **Bitter Lessons**, Trauma 65 (p.107):
 *
 * > This model gains D3 extra Experience Points. It does not receive an Injury
 * > or a Battle Scar.
 *
 * One is *"you **can** give"* — an offer across the roster, the player's to
 * take or leave, the same optional construction that made FD-07 mark the
 * Exploration Skill modifiers `byHand`. The other is flat: a model rolled it,
 * a die is owed, and the number lands on that one model whether anybody likes
 * it or not.
 *
 * Both are matched on **what the row says**, not on the roll 65 or the name
 * "War Stories" — the same rule `capture.ts` follows, and for the same reason:
 * a Dispatch that renumbers or renames should need no edit here, and a build
 * whose tables lose the sentence should stop finding the rule rather than
 * quietly stop applying it.
 *
 * Neither is capped here. `cappedExperience` is the one place that knows about
 * LIMITED POTENTIAL, and an award that trimmed itself on the way past would
 * hide from the player which part of it the cap refused.
 */
import type { Dataset, SkillRow, SkillsTableName, TraumaRow } from '../types/catalogue';

/* ------------------------------------------------------------------ *
 * Bitter Lessons: a Trauma result that hands out Experience
 * ------------------------------------------------------------------ */

/**
 * A Trauma row that awards Experience of its own.
 *
 * `die` and `fixed` are exclusive: the shipped row rolls D3, but a ruleset
 * that states a flat number is a sentence away and reading only one shape
 * would drop it silently.
 */
export interface ExtraExperienceRule {
  roll: string;
  name: string;
  /** The row's own words, for the panel that asks for the roll. */
  text: string;
  /** Sides of the die the row calls for — 3 for `D3` — or `null`. */
  die: number | null;
  /** A flat award, where the row states one instead. */
  fixed: number | null;
}

/**
 * *"gains D3 extra Experience Points"*, or a flat count in the same shape.
 *
 * Anchored on "extra Experience Point" because the plain Experience a model
 * earns for surviving is never written on a Trauma row: a row that mentions
 * extra Experience is granting some.
 */
const GRANTS_XP = /gains?\s+(?:(D(\d+))|(\d+))\s+extra\s+Experience\s+Point/i;

const asExtraRule = (row: TraumaRow): ExtraExperienceRule | null => {
  const m = GRANTS_XP.exec(row.description ?? '');
  if (!m) return null;
  return {
    roll: row.roll,
    name: row.name,
    text: row.description,
    die: m[2] ? Number(m[2]) : null,
    fixed: m[3] ? Number(m[3]) : null,
  };
};

/** Every Trauma row that grants Experience. Empty where the table says none. */
export const extraExperienceRules = (
  dataset: Dataset | null | undefined,
): ExtraExperienceRule[] =>
  (dataset?.campaign?.trauma ?? [])
    .map(asExtraRule)
    .filter((r): r is ExtraExperienceRule => r !== null);

/**
 * The rule a recorded Trauma outcome triggered, or `null`.
 *
 * Matched against the outcome text the wizard holds, which is the row's own
 * description — and which a capture settlement appends to, so the test is
 * `includes` rather than equality.
 */
export function extraExperienceFor(
  dataset: Dataset | null | undefined,
  outcome: string | null | undefined,
): ExtraExperienceRule | null {
  const text = (outcome ?? '').trim();
  if (!text) return null;
  return extraExperienceRules(dataset)
    .find((r) => text.includes(r.text) || r.text.includes(text)) ?? null;
}

/** `D3` is 1-3: the smallest and largest a roll may legitimately be. */
export const dieRange = (rule: ExtraExperienceRule): [number, number] =>
  rule.die ? [1, rule.die] : [rule.fixed ?? 0, rule.fixed ?? 0];

/** Whether `n` is a roll this rule could have produced. */
export const isValidRoll = (rule: ExtraExperienceRule, n: number): boolean => {
  const [lo, hi] = dieRange(rule);
  return Number.isInteger(n) && n >= lo && n <= hi;
};

/* ------------------------------------------------------------------ *
 * War Stories: a Skill that pays every OTHER ELITE model
 * ------------------------------------------------------------------ */

export interface WarStoriesRule {
  name: string;
  /** The Skill's own words, for the panel that offers it. */
  text: string;
  /** How many points it grants each eligible model. */
  points: number;
  /** The rule names the ELITE Keyword, so Troops are not paid. */
  eliteOnly: boolean;
  /** *"You can't pick the model with the Skill itself."* */
  excludesHolder: boolean;
  /**
   * *"you **can** give"* — an offer, never applied on the player's behalf.
   *
   * Read from the text rather than assumed, the same way FD-07 decided an
   * Exploration Skill is by hand: the difference between "can" and "gains" is
   * the difference between a screen that asks and one that helps itself.
   */
  optional: boolean;
}

const GRANTS_EXTRA_XP_TO_OTHERS = /\+(\d+)\s+extra\s+Experience\s+Point/i;

const asWarStories = (row: SkillRow): WarStoriesRule | null => {
  const text = row.description ?? '';
  const m = GRANTS_EXTRA_XP_TO_OTHERS.exec(text);
  if (!m) return null;
  return {
    name: row.name,
    text,
    points: Number(m[1]),
    eliteOnly: /ELITE\s+Keyword/i.test(text),
    /* `can't` ships with a typographic apostrophe; `.?` takes either. */
    excludesHolder: /can.?t pick the model with the Skill itself/i.test(text),
    optional: /you\s+can\s+give/i.test(text),
  };
};

const TABLES: SkillsTableName[] = ['melee', 'ranged', 'stealth', 'wildcard'];

/**
 * The Skill that pays the rest of the Warband, or `null`.
 *
 * Every Skills table is searched, not just the Wildcard one that ships it: a
 * Patron's list is Skills too, and a rule that only ever looked in one table
 * would miss the same Skill arriving by another route.
 */
export function warStoriesRule(
  dataset: Dataset | null | undefined,
): WarStoriesRule | null {
  for (const table of TABLES) {
    for (const row of dataset?.campaign?.skills?.[table] ?? []) {
      const rule = asWarStories(row);
      if (rule) return rule;
    }
  }
  return null;
}

export interface WarStoriesOffer {
  rule: WarStoriesRule;
  /**
   * The models carrying the Skill.
   *
   * A set, although *"a Warband can only have one model with this Skill"*:
   * the roster is not validated against that, and excluding only the first of
   * two would pay a holder its own Skill. The award itself is still granted
   * once per eligible model, not once per holder — two holders is a roster the
   * book does not describe, and doubling the payout would be inventing a
   * reading of it.
   */
  holderIds: Set<string>;
}

/**
 * Whether this Warband can offer War Stories at all, and who holds it.
 *
 * Derived from the roster every time, never stored — the rule FD-07 settled
 * for Scavenger and Friends In High Places. A holder killed in the game it
 * was holding the Skill is no longer in the Warband, and a stored flag would
 * keep paying the roster on its behalf.
 */
export function warStoriesOffer(
  dataset: Dataset | null | undefined,
  units: readonly { id: string; isDead?: boolean; skills?: readonly { name?: string }[] }[] = [],
): WarStoriesOffer | null {
  const rule = warStoriesRule(dataset);
  if (!rule) return null;

  const wanted = rule.name.trim().toLowerCase();
  const holderIds = new Set(
    units
      .filter((u) => !u.isDead
        && (u.skills ?? []).some((s) => s.name?.trim().toLowerCase() === wanted))
      .map((u) => u.id),
  );
  return holderIds.size ? { rule, holderIds } : null;
}

/**
 * Whether one model may take the War Stories point.
 *
 * `isElite` is passed in rather than read off the model, because the wizard
 * already resolves ELITE through `eliteVerdict` and the player's own override
 * of it — and a second, quieter answer to the same question is how a model
 * ends up ELITE for the Promotion step and not for this one.
 */
export function warStoriesEligible(
  offer: WarStoriesOffer | null,
  unitId: string,
  isElite: boolean,
): boolean {
  if (!offer) return false;
  if (offer.rule.excludesHolder && offer.holderIds.has(unitId)) return false;
  if (offer.rule.eliteOnly && !isElite) return false;
  return true;
}
