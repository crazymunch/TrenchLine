/**
 * Success Rolls, Injury Rolls and Bloodbath Rolls, as the rulebook writes them.
 *
 * The dice console this replaced was wrong in every mode, and wrong in the way
 * that matters most: it looked authoritative at a table where nobody has the
 * book open.
 *
 *   - **An Injury Roll kept the single highest die** and threw the rest away.
 *     A Bloodbath of 6, 5, 4 against -3 Armour read as 6 - 3 = 3, a Minor Hit,
 *     where the book gives 15 - 3 = 12 and the model is Out of Action.
 *   - **The result bands were invented.** Injury read `>=9` Out of Action,
 *     `>=7` "Serious Injury", `>=4` "Downed", else "Flesh Wound". The book's
 *     table is `1 or less` No Effect, `2-6` Minor Hit, `7-8` Down, `9+` Out of
 *     Action. Two of those four names are not in the game.
 *   - **The Success Roll had a fumble band.** Double 1 was reported as a
 *     "FUMBLE / DISASTER"; there is no such result. `2-6` is a Failure however
 *     it was rolled.
 *   - **The dice pool conflated two different rules.** "3D6 (Bloodbath / +1
 *     Inj)" is two unrelated things: +1 INJURY DICE rolls three dice and keeps
 *     the two highest, while a Bloodbath rolls three and adds all three.
 *
 * The book, verbatim (`trench-crusade-digital-rulebook`, Comprehensive Rules):
 *
 *   Success Roll — "1. Take 2 D6. 2. Add any +DICE or -DICE. 3. Roll all of
 *   the dice. 4. Pick the 2 highest dice if any +DICE were added to the roll,
 *   or the 2 lowest if any -DICE were added. 5. Add the 2 dice together and
 *   then look up the roll on the Success Roll Table."
 *
 *   Combining — "If both +DICE and -DICE are added to the same Success Roll,
 *   remove pairs of +DICE and -DICE until only one type is remaining."
 *
 *   Injury Roll — the same five steps, then "6. Add any +/- INJURY MODIFIERS
 *   to the roll." and "The maximum -INJURY MODIFIER cannot be more than -3 in
 *   total."
 *
 *   Bloodbath Roll — "To make a Bloodbath Roll, roll 3D6 and add all 3 dice
 *   together. Add +/- INJURY DICE and +/- INJURY MODIFIERS in the same way
 *   that you would to an Injury Roll, except that you pick the 3 highest or 3
 *   lowest dice in the roll instead of the 2 highest or lowest. If the Injury
 *   Roll has the DEADLY Keyword, instead roll 4D6 and add all 4 dice together."
 *
 * Pure and injectable: `roll()` takes its randomness as an argument so the
 * tests assert on the arithmetic rather than on luck.
 */

/** The dice bands, from the book's Success Roll Table. */
export type SuccessOutcome = 'failure' | 'success' | 'critical';

/** The dice bands, from the book's Injury Roll Table. */
export type InjuryOutcome = 'no-effect' | 'minor-hit' | 'down' | 'out-of-action';

export type Rng = () => number;

export interface RollBreakdown {
  /** Every die rolled, in the order they came up. */
  rolled: number[];
  /** The dice that counted, per step 4. */
  kept: number[];
  /** The rest, shown struck through rather than hidden. */
  dropped: number[];
  /** Whether step 4 kept the highest or the lowest. */
  keptEnd: 'highest' | 'lowest';
  /** The kept dice added together, before any flat modifier. */
  diceTotal: number;
  /** The flat INJURY MODIFIER applied after the dice. Zero on a Success Roll. */
  modifier: number;
  /** What goes on the table. */
  total: number;
}

const d6 = (rng: Rng) => Math.floor(rng() * 6) + 1;

/**
 * "remove pairs of +DICE and -DICE until only one type is remaining" — which is
 * just the sum, since a +1 and a -1 cancel. Callers pass one signed number.
 */
export const combineDice = (plus: number, minus: number) => plus - minus;

/**
 * The book caps only the negative side: "The maximum -INJURY MODIFIER cannot be
 * more than -3 in total." Nothing caps a positive one.
 */
export const INJURY_MODIFIER_FLOOR = -3;
export const capInjuryModifier = (m: number) => Math.max(m, INJURY_MODIFIER_FLOOR);

/**
 * Roll `keep + |dice|` dice and keep `keep` of them, from the high end when
 * `dice` is positive and the low end when it is negative.
 *
 * `keep` is 2 for a Success Roll and an Injury Roll, 3 for a Bloodbath, and 4
 * for a Bloodbath with DEADLY.
 */
export function rollKeeping(keep: number, dice: number, modifier: number, rng: Rng): RollBreakdown {
  const count = keep + Math.abs(dice);
  const rolled = Array.from({ length: count }, () => d6(rng));

  // Sorted for the pick only; `rolled` keeps the order they came up in so the
  // UI can show the dice as they landed.
  const sorted = [...rolled].sort((a, b) => b - a);
  const keptEnd = dice < 0 ? 'lowest' : 'highest';
  const kept = keptEnd === 'lowest' ? sorted.slice(sorted.length - keep) : sorted.slice(0, keep);

  // Removing the kept dice by value, not by identity: two dice can show the
  // same number and only one of them was kept.
  const dropped = [...sorted];
  for (const k of kept) dropped.splice(dropped.indexOf(k), 1);

  const diceTotal = kept.reduce((a, b) => a + b, 0);
  return { rolled, kept, dropped, keptEnd, diceTotal, modifier, total: diceTotal + modifier };
}

/* ------------------------------------------------------------ Success Roll */

/**
 * Success Roll Table, verbatim:
 *
 *     2-6    Failure
 *     7-11   Success
 *     12+    Critical Success
 */
export function successOutcome(total: number): SuccessOutcome {
  if (total >= 12) return 'critical';
  if (total >= 7) return 'success';
  return 'failure';
}

export const SUCCESS_LABEL: Record<SuccessOutcome, string> = {
  failure: 'Failure',
  success: 'Success',
  critical: 'Critical Success',
};

export interface SuccessRoll extends RollBreakdown {
  kind: 'success';
  outcome: SuccessOutcome;
  /** A failed Risky Success Roll ends the model's Activation. */
  risky: boolean;
}

export function rollSuccess(
  { dice = 0, risky = false }: { dice?: number; risky?: boolean },
  rng: Rng = Math.random,
): SuccessRoll {
  const b = rollKeeping(2, dice, 0, rng);
  return { ...b, kind: 'success', outcome: successOutcome(b.total), risky };
}

/* ------------------------------------------------------------- Injury Roll */

/**
 * Injury Roll Table, verbatim:
 *
 *     1 or less   No Effect
 *     2-6         Minor Hit    (1 BLOOD MARKER)
 *     7-8         Down         (1 BLOOD MARKER, 2 if already Down)
 *     9+          Out of Action
 */
export function injuryOutcome(total: number): InjuryOutcome {
  if (total >= 9) return 'out-of-action';
  if (total >= 7) return 'down';
  if (total >= 2) return 'minor-hit';
  return 'no-effect';
}

export const INJURY_LABEL: Record<InjuryOutcome, string> = {
  'no-effect': 'No Effect',
  'minor-hit': 'Minor Hit',
  down: 'Down',
  'out-of-action': 'Out of Action',
};

/** What the table says happens, so the console does not paraphrase the book. */
export const INJURY_EFFECT: Record<InjuryOutcome, string> = {
  'no-effect': 'The model is unharmed and the injury has no effect.',
  'minor-hit': 'Place 1 BLOOD MARKER next to the model.',
  down: 'Place 1 BLOOD MARKER next to the model and mark them as being Down. '
      + 'If the model is already Down, place 2 BLOOD MARKERS next to it instead of 1.',
  'out-of-action': 'The model has been seriously injured or killed and is removed from the battlefield.',
};

export interface InjuryRoll extends RollBreakdown {
  kind: 'injury';
  outcome: InjuryOutcome;
  bloodbath: boolean;
  deadly: boolean;
  /** How many dice counted: 2 normally, 3 on a Bloodbath, 4 with DEADLY. */
  keep: number;
}

/**
 * @param injuryDice   +/- INJURY DICE, already combined into one signed number.
 * @param modifier     +/- INJURY MODIFIERS. Negatives are capped at -3.
 * @param bloodbath    Converted by spending BLOOD MARKERS: keep 3, not 2.
 * @param deadly       DEADLY on a Bloodbath: keep 4.
 */
export function rollInjury(
  {
    injuryDice = 0,
    modifier = 0,
    bloodbath = false,
    deadly = false,
  }: { injuryDice?: number; modifier?: number; bloodbath?: boolean; deadly?: boolean },
  rng: Rng = Math.random,
): InjuryRoll {
  // DEADLY only enlarges a Bloodbath — "If the Injury Roll has the DEADLY
  // Keyword, instead roll 4D6" sits inside the Bloodbath paragraph.
  const keep = bloodbath ? (deadly ? 4 : 3) : 2;
  const b = rollKeeping(keep, injuryDice, capInjuryModifier(modifier), rng);
  return { ...b, kind: 'injury', outcome: injuryOutcome(b.total), bloodbath, deadly, keep };
}

/* --------------------------------------------------------------- describing */

/** "3 dice, keep the 2 highest" — what the console prints on the button. */
export function describePool(keep: number, dice: number): string {
  const count = keep + Math.abs(dice);
  if (dice === 0) return `${count}D6`;
  return `${count}D6, keep the ${keep} ${dice < 0 ? 'lowest' : 'highest'}`;
}

export const formatSigned = (n: number) => (n > 0 ? `+${n}` : String(n));

/* ------------------------------------------------------------------- odds */

/**
 * The exact distribution of a Success Roll at a given +/- DICE.
 *
 * Enumerated rather than approximated: `2 + |dice|` dice is at most seven faces
 * in practice, so every outcome can simply be counted.
 *
 * This exists because the probability view in the Codex modelled a modifier as
 * a number added to the 2D6 sum and offered target numbers of 6, 8 and 9. Both
 * are wrong about the game. A modifier is dice, which changes the SHAPE of the
 * distribution rather than sliding it — +1 DICE and "+1 to the roll" are not
 * the same bet, and the difference is the whole reason the game rolls the way
 * it does. And there is one target number: 7.
 */
export function successOdds(dice: number): {
  /** total -> probability, as a fraction of 1. */
  byTotal: Map<number, number>;
  failure: number;
  success: number;
  critical: number;
  /** Success or better — what a player actually wants to know. */
  hit: number;
  mean: number;
} {
  const count = 2 + Math.abs(dice);
  const keepLowest = dice < 0;
  const totals = new Map<number, number>();
  let outcomes = 0;

  const faces = new Array(count).fill(1);
  const step = (i: number): void => {
    if (i === count) {
      const sorted = [...faces].sort((a, b) => b - a);
      const kept = keepLowest ? sorted.slice(count - 2) : sorted.slice(0, 2);
      const total = kept[0] + kept[1];
      totals.set(total, (totals.get(total) ?? 0) + 1);
      outcomes++;
      return;
    }
    for (let f = 1; f <= 6; f++) { faces[i] = f; step(i + 1); }
  };
  step(0);

  const byTotal = new Map<number, number>();
  let failure = 0, success = 0, critical = 0, mean = 0;
  for (const [total, ways] of [...totals].sort((a, b) => a[0] - b[0])) {
    const p = ways / outcomes;
    byTotal.set(total, p);
    mean += total * p;
    const o = successOutcome(total);
    if (o === 'failure') failure += p;
    else if (o === 'success') success += p;
    else critical += p;
  }
  return { byTotal, failure, success, critical, hit: success + critical, mean };
}
