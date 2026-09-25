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
 * Eighteen boxes, a circle at each `advancementAt` value, filled to `unit.xp`,
 * and the boxes past a LIMITED POTENTIAL model's cap greyed — so the cap is
 * visible on the model rather than stated in prose somewhere else. All of that
 * is decided by `experienceTrackFor`; this file is only the drawing.
 *
 * Used in three places, which is the point of it being a component: the unit
 * card in the builder, the post-battle wizard's Promotions step, and the Roster
 * Sheet.
 *
 * **Mobile.** Display only, so 16px boxes are within the rules — the 44px floor
 * is for touch targets and nothing here is tappable (`docs/MOBILE.md` §3). And
 * the row must not wrap: eighteen boxes of `w-4` with a 1px gap is about 306px,
 * which fits a 375px phone inside the card's gutters, and a track that wrapped
 * would put the circles in the wrong places. `flex-nowrap` says so, and there
 * are no dynamic class names anywhere in here (rule 3).
 */
import React from 'react';
import type { Dataset } from '@/types/catalogue';
import type { ActiveUnit } from '@/types/warband';
import { experienceTrackFor } from '@/rules/experienceTrack';

interface Props {
  dataset: Dataset | null | undefined;
  unit: Pick<ActiveUnit, 'xp' | 'scars' | 'baseProfileId'>;
  /**
   * `sheet` is the printed sheet's own ink: black on white, larger boxes, no
   * theme tokens. `screen` is the app. Two variants rather than two components,
   * because the geometry and the rules are the same and only the colour is not.
   */
  variant?: 'screen' | 'sheet';
  /** Hide the SCARS pair, for a caller that has its own. */
  showScars?: boolean;
}

export const ExperienceTrack: React.FC<Props> = ({
  dataset, unit, variant = 'screen', showScars = true,
}) => {
  const track = experienceTrackFor(dataset, unit);

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

  const sheet = variant === 'sheet';
  const box = sheet
    ? 'w-4 h-4 border border-black flex-shrink-0'
    : 'w-4 h-4 border border-theme-border flex-shrink-0';
  const filled = sheet ? 'bg-black' : 'bg-theme-primary';
  const capped = sheet ? 'bg-neutral-300' : 'bg-theme-border/40';
  const label = sheet
    ? 'font-mono text-[7pt] uppercase tracking-widest text-black'
    : 'eyebrow';

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className={label}>Experience</span>
        <span className={sheet ? 'font-mono text-[7pt] text-black' : 'font-mono text-xs sm:text-[10px] text-theme-muted'}>
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
              b.filled ? filled : b.beyondCap ? capped : 'bg-transparent',
            ].join(' ')}
            title={b.advancement
              ? `Box ${b.index} — an Advancement Roll is earned here`
              : `Box ${b.index}`}
          />
        ))}
      </div>

      {showScars && track.scars.length > 0 && (
        <div className="flex items-center gap-2">
          <span className={label}>Scars</span>
          <span className="flex flex-nowrap items-center gap-px">
            {track.scars.map((s) => (
              <span
                key={s.index}
                className={[box, 'rounded-none', s.filled ? filled : 'bg-transparent'].join(' ')}
                title={`Battle Scar ${s.index}`}
              />
            ))}
          </span>
          {track.unfitAt !== null && (
            <span className={sheet ? 'font-mono text-[7pt] text-black' : 'font-mono text-xs sm:text-[10px] text-theme-muted'}>
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
