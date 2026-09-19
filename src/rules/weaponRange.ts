/**
 * What a Weapon Profile's `range` actually says, and what follows from it.
 *
 * Play Mode's range calculator used to read `type` to decide whether something
 * was a melee or a ranged weapon. Measured against the dataset, that test is
 * almost never true: of 658 weapon entries, `type === 'Ranged'` matches **0**
 * and `type === 'Melee'` matches **1**. The catalogue types things by how they
 * are carried and bought — `1-Handed`, `2-Handed`, `Shield`, `Battlekit`,
 * `Equipment`, `Spell (Cost 2)` — not by how they are used.
 *
 * The consequence was reported from a live game: a **Fire Shield** was shown
 * with a range. It is typed `Shield`, so it was not `Melee`, so it was treated
 * as a ranged weapon; it has no range, so it took an invented 24" default; and
 * the calculator's hand-written band labels then described it at "Short Range
 * (12")". Three separate inventions stacked into one confident wrong answer.
 * 553 of the 658 entries — 84% — were taking that 24" default.
 *
 * So classification comes from `range`, which is the field that carries the
 * information:
 *
 *   - `"Melee"`            — a melee weapon (78 entries)
 *   - `"24\""`             — a ranged weapon, maximum range 24" (105 entries)
 *   - `"12\"/Melee"`       — usable either way (6 entries)
 *   - `""` or `"-"`        — **not a weapon with a range** (475 entries):
 *                            shields, armour, equipment, abilities, battlekit
 *
 * The last bucket is the important one. It is not "a weapon whose range we do
 * not know"; it is a thing that does not have a range, and the honest answer
 * is to say so and leave it out of a range calculation (rule 2 in CLAUDE.md —
 * the alternative is exactly the invented 24" this replaces).
 *
 * ## The rules, from the book
 *
 * Short and Long Range are **per weapon**, not fixed bands. Digital Rulebook,
 * "Short Range & Long Range":
 *
 * > If the distance between an attacking model and the target is less than or
 * > equal to half of the Weapon's range, then the attack is being made at
 * > Short Range. If the distance ... is greater than half of the Weapon's
 * > range, then the attack is being made at Long Range. Add -1 DICE to the
 * > roll for a Ranged Attack that is being made at Long Range.
 *
 * The calculator previously printed fixed bands — Point Blank 6", Short 12",
 * Medium 24", Extreme 48" — and a "Point Blank (+1 Hit)" bonus. None of that
 * is in the rulebook. The only distance-derived modifier on a Ranged Attack is
 * Long Range, -1 DICE, and `IGNORE LONG RANGE` cancels it.
 *
 * Engagement distances, same source:
 *
 * > Fight: You can make a Melee Attack with your model if it is within 1" of
 * > an enemy
 *
 * > Shoot: You can make a Ranged Attack with your model if it is more than 1"
 * > from an enemy
 *
 * The old code used 2" for melee, which is not a number that appears in either
 * rule.
 */

/** Within this many inches of an enemy, a model may Fight and may not Shoot. */
export const ENGAGEMENT_INCHES = 1;

export type RangeKind =
  /** A melee weapon. */
  | 'melee'
  /** A ranged weapon with a maximum range. */
  | 'ranged'
  /** Usable both ways — `12"/Melee`. */
  | 'both'
  /**
   * Carries no range at all: a shield, armour, a piece of equipment, an
   * ability. NOT a weapon whose range is unknown.
   */
  | 'none';

export interface WeaponRange {
  kind: RangeKind;
  /** Maximum range in inches, where there is one. */
  inches?: number;
  /** What the profile printed, for showing the player the source text. */
  printed: string;
}

/**
 * Read a Weapon Profile's `range` field.
 *
 * The catalogue's punctuation is not consistent — `24"`, `6''`, `12”`,
 * `Melee/16”` all occur — so the number is taken as the first run of digits
 * and the quote style is ignored. A value that names Melee and a distance is
 * `both`, in either order, because both spellings occur.
 */
export function readRange(raw: unknown): WeaponRange {
  const printed = typeof raw === 'string' ? raw.trim() : '';

  // "" and "-" both mean the profile has no range. Neither is a distance.
  if (!printed || printed === '-') return { kind: 'none', printed };

  const isMelee = /melee/i.test(printed);
  const digits = printed.match(/\d+/);
  const inches = digits ? Number.parseInt(digits[0], 10) : undefined;

  /* A number that did not parse to something positive is not a range. Falling
     back to a default here is the bug this module exists to remove. */
  const hasDistance = typeof inches === 'number' && Number.isFinite(inches) && inches > 0;

  if (isMelee && hasDistance) return { kind: 'both', inches, printed };
  if (isMelee) return { kind: 'melee', printed };
  if (hasDistance) return { kind: 'ranged', inches, printed };
  return { kind: 'none', printed };
}

/** True where this profile can make a Ranged Attack at all. */
export const canShoot = (r: WeaponRange) => r.kind === 'ranged' || r.kind === 'both';

/** True where this profile can make a Melee Attack. */
export const canFight = (r: WeaponRange) => r.kind === 'melee' || r.kind === 'both';

export type Band =
  /** At or inside half the weapon's range. */
  | 'short'
  /** Beyond half, within maximum: -1 DICE. */
  | 'long'
  /** Beyond the weapon's maximum range. */
  | 'out-of-range'
  /** Close enough to Fight rather than Shoot. */
  | 'melee'
  /** The profile has no range, so there is no band to report. */
  | 'not-applicable';

/**
 * Which band a shot at `distance` falls in, for this weapon.
 *
 * "less than or equal to half" is the book's wording, so exactly half is
 * Short Range — the boundary belongs to the shooter. Half of an odd range is
 * not rounded: at a 9" weapon, 4.5" is Short and 4.6" is Long, which is what
 * the sentence says and what a tape measure does.
 */
export function bandFor(r: WeaponRange, distance: number): Band {
  if (!canShoot(r) || typeof r.inches !== 'number') return 'not-applicable';
  if (distance > r.inches) return 'out-of-range';
  return distance <= r.inches / 2 ? 'short' : 'long';
}

/**
 * The Success Roll modifier the distance itself imposes, in DICE.
 *
 * Only Long Range, and only -1. `IGNORE LONG RANGE` cancels it — the keyword
 * is carried on the weapon, so the caller passes the weapon's keywords rather
 * than this module reaching for them.
 *
 * Deliberately NOT included: Cover (-1) and Elevated position (+1). Both are
 * real modifiers from the same list, but neither is a function of range, and
 * neither is something the app can know without being told about the board.
 */
export function longRangePenalty(band: Band, keywords: readonly string[] = []): number {
  if (band !== 'long') return 0;
  const ignores = keywords.some((k) => /ignore\s+long\s+range/i.test(k));
  return ignores ? 0 : -1;
}

/** A short label for a band, for the UI. */
export const BAND_LABEL: Record<Band, string> = {
  short: 'Short Range',
  long: 'Long Range (-1 DICE)',
  'out-of-range': 'Out of range',
  melee: 'Melee',
  'not-applicable': 'No range',
};
