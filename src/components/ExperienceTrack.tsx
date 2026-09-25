'use client';

/**
 * The Experience track, drawn the way the book draws it (FD-12 item 1).
 *
 * > Record the Experience Points the ELITE models in your Warband have earned
 * > on your Roster Sheet, by checking off one Experience box per point, from
 * > left to right, starting with the top row; when you reach a box that is a
 * > circle, you can make an Advancement Roll for the model.
 * >                                    — Trench Crusade, the Promotion Step
 *
 * Eighteen boxes, a circle at each `advancementAt` value, filled to the model's
 * Experience, and the boxes past a LIMITED POTENTIAL model's cap greyed — so
 * the cap is visible on the model rather than stated in prose somewhere else.
 * All of that is decided by `experienceTrackFor`; this file is only the drawing.
 *
 * Used in three places, which is the point of it being a component: the unit
 * card in the builder, the post-battle wizard's Promotions step, and the Roster
 * Sheet.
 *
 * **Two exports, and the split matters.** `ExperienceTrackView` takes a track
 * that has already been computed; `ExperienceTrack` computes one from a dataset
 * and a model and renders it. SH-1's share page projects the whole sheet on the
 * SERVER (review round 1, finding A) and hands the client a model with no
 * warband in it, so the renderer cannot be the thing that needs a `Dataset` and
 * an `ActiveUnit`.
 *
 * **Mobile.** Display only, so 16px boxes are within the rules — the 44px floor
 * is for touch targets and nothing here is tappable (`docs/MOBILE.md` §3). And
 * the row must not wrap: eighteen boxes of `w-4` with a 1px gap is about 306px,
 * which fits a 375px phone inside the card's gutters, and a track that wrapped
 * would put the circles in the wrong places. `flex-nowrap` says so, and there
 * are no dynamic class names anywhere in here (rule 3).
 *
 * **Print.** The fills are `print-fill`, and `globals.css` gives that class
 * `print-color-adjust: exact` — without it the sheet's blanket `background:
 * transparent !important` wiped every filled box and the LIMITED POTENTIAL grey
 * off the paper, which is review round 1 finding I. The track is the one thing
 * on the sheet whose MEANING is its fill.
 */
import React from 'react';
import type { Dataset } from '@/types/catalogue';
import type { ActiveUnit } from '@/types/warband';
import { experienceTrackFor, type ExperienceTrackModel } from '@/rules/experienceTrack';

/** The drawing, from a track somebody else computed. */
export const ExperienceTrackView: React.FC<{
  track: ExperienceTrackModel | null;
  /** Hide the SCARS pair, for a caller that has its own. */
  showScars?: boolean;
}> = ({ track, showScars = true }) => {
  /*
    No track means the ruleset does not publish one. Say so; do not draw
    eighteen boxes on an assumption (rule 2).
  */
  if (!track) {
    return (
      <p className="font-mono text-xs sm:text-[10px] text-theme-muted">
        This ruleset publishes no Experience track.
      </p>
    );
  }

  const box = 'w-4 h-4 border border-theme-border flex-shrink-0 print-fill';
  const note = 'font-mono text-xs sm:text-[10px] text-theme-muted';

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="eyebrow">Experience</span>
        <span className={note}>
          {track.xp}
          {track.cap !== null && ` / ${track.cap} cap`}
        </span>
      </div>

      {/*
        `flex-nowrap` and no `overflow-x-auto`. A track that scrolls sideways
        hides the boxes past the edge, and the circles are the whole information
        — see `docs/MOBILE.md` on never hiding a layout problem.
      */}
      <div className="flex flex-nowrap items-center gap-px" role="img"
        aria-label={`${track.xp} Experience of ${track.boxes.length}`
          + (track.cap !== null ? `, capped at ${track.cap}` : '')}>
        {track.boxes.map((b) => (
          <span
            key={b.index}
            /* The circle is the box where an Advancement Roll is earned. */
            className={[
              box,
              b.advancement ? 'rounded-full' : 'rounded-none',
              /*
                Three fills, not two (review round 2 item 11). A box the model
                already held is the solid one; a box THIS submission awards is
                the accent, so the player can see what the battle earned against
                what the model brought; past the cap is the grey.

                Static class names, all three — `docs/MOBILE.md`: a
                `bg-${...}` never compiles.
              */
              b.gained
                ? 'bg-theme-accent'
                : b.filled
                  ? 'bg-theme-primary'
                  : b.beyondCap ? 'bg-theme-border/40' : 'bg-transparent',
            ].join(' ')}
            title={[
              `Box ${b.index}`,
              b.gained ? 'earned in this game' : '',
              b.advancement ? 'an Advancement Roll is earned here' : '',
            ].filter(Boolean).join(' — ')}
          />
        ))}
      </div>

      {showScars && track.scars.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="eyebrow">Scars</span>
          <span className="flex flex-nowrap items-center gap-px">
            {track.scars.map((s) => (
              <span
                key={s.index}
                className={[box, 'rounded-none', s.filled ? 'bg-theme-primary' : 'bg-transparent'].join(' ')}
                title={`Battle Scar ${s.index}`}
              />
            ))}
          </span>
          {track.unfitAt !== null && (
            <span className={note}>
              {/* The count that retires the model, from the dataset: "When a
                  model receives their third Battle Scar … Remove the model from
                  your Warband Roster". Two boxes, and the third is the end. */}
              retires at {track.unfitAt}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/** The track for one model, computed and drawn. */
export const ExperienceTrack: React.FC<{
  dataset: Dataset | null | undefined;
  unit: Pick<ActiveUnit, 'xp' | 'scars' | 'baseProfileId'>;
  showScars?: boolean;
  /**
   * What the model held before the Experience in `unit.xp`, where the caller is
   * showing a total it has not committed yet.
   *
   * The post-battle wizard passes it; the unit card and the Roster Sheet do not,
   * because there the track is a statement of what the model has.
   */
  heldBefore?: number;
}> = ({ dataset, unit, showScars = true, heldBefore }) => (
  <ExperienceTrackView
    track={experienceTrackFor(dataset, unit, { heldBefore })}
    showScars={showScars}
  />
);
