/**
 * A model's statline as it actually is, once its injuries are counted.
 *
 * Reported from a live game: a model with a **Leg Wound** was still showing
 * its printed Movement. The injury was recorded on the model, displayed under
 * its name, and applied to nothing. `injuries` is a `string[]` and no part of
 * the app ever read it back into a Characteristic, so the number the player
 * was measuring with was wrong for the whole campaign.
 *
 * ## The modifier comes from the catalogue, not from here
 *
 * Rule 1: game data is derived, never typed. The Trauma table already carries
 * the effect in its own words —
 *
 * > **[31] Leg Wound** — The model's Movement Characteristic is reduced by 2"
 * > and it suffers -1 DICE to Dash.
 *
 * — so the "2" is read out of that sentence rather than written down here. If
 * the upstream catalogue revises the number, this follows it. What is written
 * here is only the *shape* of the sentence: which words mean "a Characteristic
 * changed, by this much, in this direction".
 *
 * ## What it refuses to do
 *
 * Of the 22 rows in the Trauma table, exactly one changes a Characteristic.
 * The rest are conditional or dice modifiers — "-1 DICE for all of its Melee
 * Attack ACTIONS that use the injured hand", "all ACTIONS ... are now classed
 * as RISKY" — which depend on what the model is doing and cannot be folded
 * into a statline.
 *
 * Those are **reported, not silently dropped**: `unmodelled` names every
 * injury carrying an effect this function does not apply, so the UI can say
 * "this model has three injuries, one of which changes its Movement and two of
 * which you must remember". Quietly ignoring them would repeat the defect at a
 * smaller scale — the player would again think the app had it covered.
 */

/** One row of the Trauma table, as the generated dataset carries it. */
export interface TraumaRow {
  roll: string;
  name: string;
  description: string;
}

/** The statline fields an injury could change. */
export interface StatDelta {
  movement?: number;
}

export interface EffectiveStats {
  /** What the profile prints. */
  base: string;
  /** What to measure with, after injuries. */
  effective: string;
  /** The net change, or 0. */
  delta: number;
  /** Injuries whose effect is applied above. */
  applied: string[];
  /**
   * Injuries that do something this cannot express as a number — the player
   * has to remember these. Never empty just because nothing was applied.
   */
  unmodelled: string[];
}

/**
 * Pull a Characteristic change out of a Trauma row's printed description.
 *
 * Matches the book's phrasing — "Movement Characteristic is reduced by 2”" —
 * and nothing else. A row that does not say this in these terms returns
 * nothing, which is what puts it in `unmodelled` rather than having it
 * silently contribute 0.
 */
export function deltaFromDescription(description: string): StatDelta | null {
  const text = String(description ?? '');

  /* "Movement Characteristic is reduced by 2”" — the quote character varies
     between the PDF extraction and the catalogue, so it is not required. */
  const reduced = text.match(
    /Movement\s+Characteristic\s+is\s+(reduced|increased)\s+by\s+(\d+)/i,
  );
  if (reduced) {
    const n = Number.parseInt(reduced[2], 10);
    if (Number.isFinite(n) && n !== 0) {
      return { movement: reduced[1].toLowerCase() === 'reduced' ? -n : n };
    }
  }

  return null;
}

/** True where a row says something the player must apply themselves. */
function hasUnmodelledEffect(row: TraumaRow): boolean {
  const d = String(row.description ?? '');
  /* A dice modifier, a RISKY reclassification, a FEARS condition: all real
     effects, none of them a statline change. "Full Recovery" and the like say
     nothing to remember, so they are not flagged. */
  return /-\s*\d+\s*DICE|\+\s*\d+\s*DICE|RISKY|FEARS|cannot|no longer|must begin/i.test(d);
}

/**
 * The Movement to measure with, and what could not be folded in.
 *
 * `injuries` are the strings stored on the model. They are matched to the
 * Trauma table by name, case-insensitively, because that is how they were
 * written there — an injury the table does not know is passed through to
 * `unmodelled` rather than dropped, since it is still something the player
 * wrote down about this model.
 */
export function effectiveMovement(
  printedMovement: string,
  injuries: readonly string[],
  traumaTable: readonly TraumaRow[],
): EffectiveStats {
  const base = String(printedMovement ?? '');
  const digits = base.match(/\d+/);
  const baseNum = digits ? Number.parseInt(digits[0], 10) : null;

  const applied: string[] = [];
  const unmodelled: string[] = [];
  let delta = 0;

  for (const injury of injuries ?? []) {
    const name = String(injury ?? '').trim();
    if (!name) continue;

    /* The stored string may be the bare name or carry the roll with it, so
       the table row is found by containment either way. */
    const row = traumaTable.find((r) =>
      name.toLowerCase().includes(r.name.toLowerCase()));

    if (!row) {
      // Not in the table: a house rule, or a name from another edition. It is
      // still written on the model, so the player is reminded of it.
      unmodelled.push(name);
      continue;
    }

    const d = deltaFromDescription(row.description);
    if (d?.movement) {
      delta += d.movement;
      applied.push(row.name);
      /* A row can do both — Leg Wound also carries "-1 DICE to Dash" — so it
         is reported as well as applied. */
      if (hasUnmodelledEffect(row)) unmodelled.push(row.name);
    } else if (hasUnmodelledEffect(row)) {
      unmodelled.push(row.name);
    }
  }

  /*
    An unreadable Movement is left exactly as printed.

    Not 6, not 0: if the statline does not carry a number, this function has
    nothing to add to and says so by returning the base unchanged with a zero
    delta. The caller can see `base === effective` and that `applied` is empty.
  */
  if (baseNum === null || delta === 0) {
    return { base, effective: base, delta: 0, applied, unmodelled };
  }

  /* Movement cannot go below zero. The book gives no rule for a negative
     Characteristic because it does not arise; clamping is the only sane
     reading and it is stated here rather than left to a subtraction. */
  const next = Math.max(0, baseNum + delta);
  return {
    base,
    effective: base.replace(/\d+/, String(next)),
    delta,
    applied,
    unmodelled,
  };
}
