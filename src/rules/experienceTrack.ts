/**
 * The Experience track, the way the book draws it (FD-12 item 1).
 *
 * The official Warband Roster Sheet prints EXPERIENCE as eighteen boxes of
 * which six are circles, and SCARS as two. Both numbers are derived here
 * rather than copied off the picture, and the design says why:
 *
 * - eighteen is `campaign.experience.max`;
 * - the six circles sit at boxes 2, 4, 7, 10, 14 and 18, which is
 *   `campaign.experience.advancementAt` exactly — the circle is the box where
 *   an Advancement Roll is earned, which is the only thing that makes the
 *   shape mean anything;
 * - two SCARS boxes is `battleScars.unfitAt` minus one: the third scar retires
 *   the model ("they are sent back home. Remove the model from your Warband
 *   Roster"), so two is the number a model may carry and still serve. The
 *   printed sheet agrees, and `experienceTrack.test.ts` asserts that it does.
 *
 * A model with LIMITED POTENTIAL greys the boxes past `experienceCap`, so the
 * cap is visible on the model rather than stated in prose somewhere else.
 *
 * `null` where the ruleset carries no Experience track. Not a track of zero
 * boxes and not eighteen assumed: a dataset that cannot say is a dataset the
 * caller has to report, which is what every other rules module here does.
 */
import type { Dataset } from '@/types/catalogue';
import type { ActiveUnit } from '@/types/warband';
import { experienceCap } from './promotions';
import { traumaProcedure } from './trauma';

/** One box on the track. */
export interface ExperienceBox {
  /** 1-based, as the sheet numbers them. */
  index: number;
  /** True where the book draws a circle: an Advancement Roll is earned here. */
  advancement: boolean;
  /** True where the model has reached this box. */
  filled: boolean;
  /**
   * True where this box is Experience the caller is about to AWARD, not
   * Experience the model already had.
   *
   * Always false unless the caller says what the model held before (see
   * `heldBefore`). The post-battle wizard draws the track on Experience plus the
   * gain — it has to, because the Advancement Rolls it offers beside the track
   * are computed from that total — and round 1 left the player unable to see
   * which of the filled boxes the battle had just earned (review round 2
   * item 11).
   */
  gained: boolean;
  /**
   * True where LIMITED POTENTIAL puts this box out of the model's reach.
   *
   * Greyed rather than removed: the track is the same eighteen boxes for every
   * model, and a shorter row would say the model is on a different track
   * instead of saying it stops earlier.
   */
  beyondCap: boolean;
}

export interface ScarBox {
  index: number;
  filled: boolean;
}

export interface ExperienceTrackModel {
  boxes: ExperienceBox[];
  scars: ScarBox[];
  /** What the model holds, clamped to nothing below zero. */
  xp: number;
  /** The LIMITED POTENTIAL cap, or `null` where the model has none. */
  cap: number | null;
  /** The scar count that retires the model, from the dataset. */
  unfitAt: number | null;
}

const experienceRules = (dataset: Dataset | null | undefined) =>
  (dataset as { campaign?: { experience?: { max?: number; advancementAt?: number[] } } } | null)
    ?.campaign?.experience ?? null;

/**
 * The track for one model.
 *
 * Display only, and deliberately so: nothing here decides whether a roll is
 * due — `advancementRollsDue` in `rules/advancement.ts` does that, and two
 * modules answering it would be two answers. Named `…For` because that module
 * already exports `experienceTrack`, which is the dataset's track rather than
 * one model's row; one name for two different things is how a caller reaches
 * for the wrong one.
 */
export function experienceTrackFor(
  dataset: Dataset | null | undefined,
  unit: Pick<ActiveUnit, 'xp' | 'scars' | 'baseProfileId'>,
  opts: {
    /**
     * What the model held BEFORE whatever the caller is showing, so the boxes
     * between that and `unit.xp` come back as `gained`.
     *
     * Omitted everywhere the track is a statement of fact — the unit card, the
     * Roster Sheet — and passed by the post-battle wizard, which is showing a
     * total that includes an award not yet committed.
     */
    heldBefore?: number;
  } = {},
): ExperienceTrackModel | null {
  const rules = experienceRules(dataset);
  const max = rules?.max;
  if (typeof max !== 'number' || max < 1) return null;

  const at = new Set(rules?.advancementAt ?? []);
  const xp = Math.max(0, Number.isFinite(unit.xp) ? unit.xp : 0);
  const cap = experienceCap(dataset, unit as ActiveUnit);

  /*
    A model already over its cap keeps what it has — `cappedExperience` makes
    the same call, and for the same reason: deleting Experience a player
    recorded is not this module's decision. So the row grows to hold it rather
    than clipping the model's own record off the end.
  */
  const boxCount = Math.max(max, xp);
  /* Clamped into `[0, xp]`: a "before" above the total would mark negative
     ground, and one below zero would mark the whole row as a gain. */
  const before = opts.heldBefore === undefined
    ? xp
    : Math.min(xp, Math.max(0, Math.floor(opts.heldBefore)));
  const boxes: ExperienceBox[] = Array.from({ length: boxCount }, (_, i) => {
    const index = i + 1;
    return {
      index,
      advancement: at.has(index),
      filled: index <= xp,
      gained: index > before && index <= xp,
      beyondCap: cap !== null && index > cap,
    };
  });

  const procedure = traumaProcedure(dataset);
  const unfitAt = procedure?.battleScars.unfitAt ?? null;
  const held = unit.scars?.length ?? 0;
  /*
    The boxes a model may fill and still serve. `unfitAt - 1`, and the row grows
    for a model that somehow holds more, for the same reason the Experience row
    does: the record wins over the printed shape.
  */
  const scarBoxes = unfitAt === null ? held : Math.max(unfitAt - 1, held);
  const scars: ScarBox[] = Array.from({ length: scarBoxes }, (_, i) => ({
    index: i + 1, filled: i + 1 <= held,
  }));

  return { boxes, scars, xp, cap, unfitAt };
}
