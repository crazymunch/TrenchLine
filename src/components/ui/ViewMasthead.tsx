import React from 'react';

/**
 * The masthead every top-level view opens with.
 *
 * Four views had written this by hand and drifted apart: an icon and an
 * all-caps `<h1>` in a `flex items-center` row, a strapline under it, and an
 * action group on the right. Two problems, both of which showed up on a
 * phone.
 *
 * The icon was a flex sibling of the heading with `items-center`, so once the
 * heading wrapped to three lines — which every one of these titles does at
 * 375px — the icon floated in the vertical middle of the block, level with
 * nothing. Here it sits in the eyebrow, on one line, where it cannot drift.
 *
 * And the titles were shouted sentences ("GLOBAL WARBAND DIRECTORY & CRUSADE
 * ROSTER"). The Iron Ledger reads as a printed record: the eyebrow says which
 * section of the ledger you are in, the title names it in three or four words,
 * and the strapline is the sentence. Nothing is lost — the strapline still
 * carries everything the old title was trying to say.
 */
export const ViewMasthead: React.FC<{
  /** Section label — where in the app you are. */
  eyebrow: string;
  icon: React.ReactNode;
  title: string;
  strapline?: string;
  /** Buttons for the right-hand side. They never shrink; the title wraps. */
  actions?: React.ReactNode;
}> = ({ eyebrow, icon, title, strapline, actions }) => (
  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
    <div className="min-w-0 space-y-1.5">
      <span className="eyebrow accent font-bold flex items-center gap-1.5">
        <span className="flex-shrink-0" aria-hidden="true">{icon}</span>
        <span className="truncate">{eyebrow}</span>
      </span>

      <h1 className="font-gothic text-2xl sm:text-3xl lg:text-4xl leading-[1.08] tracking-tight text-theme-text">
        {title}
      </h1>

      {strapline && (
        <p className="text-sm text-theme-muted max-w-2xl leading-relaxed">{strapline}</p>
      )}
    </div>

    {actions && (
      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>
    )}
  </div>
);
