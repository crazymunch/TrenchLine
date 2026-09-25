'use client';

/**
 * The client half of the share page (SH-1).
 *
 * The page itself is a server component — it has to be, because it reads the
 * database — and the sheet needs the ruleset, which is served rather than
 * bundled and so is fetched in the browser (`useDataset`). This is the seam
 * between the two, and it does nothing else: the sheet is
 * `WarbandRosterSheet`, the same component the builder's route renders, which
 * is what "no second rendering path" means.
 *
 * **No store.** `useStore` is never touched here. The warband arrives as a prop
 * from the server, so nothing on this page can write, and a reader with the link
 * is not quietly given a roster on their own device.
 *
 * A failed dataset load says so and renders nothing (rule 2). The sheet without
 * a ruleset would have no Threshold table, no Experience track and no faction
 * name, and filling those in from anywhere else is exactly the fabrication the
 * project deleted `githubSync.ts` over.
 */
import React from 'react';
import Link from 'next/link';
import type { Warband } from '@/types/warband';
import { useDataset } from '@/rules/useDataset';
import { DEFAULT_RULESET_ID } from '@/rules/rulesets';
import { WarbandRosterSheet } from '@/components/sheet/WarbandRosterSheet';

export const SharedRosterSheet: React.FC<{ warband: Warband }> = ({ warband }) => {
  /*
    The default ruleset, not the reader's own choice.

    A shared roster is the OWNER's roster, and whichever ruleset the reader's
    browser happens to have selected is not a fact about it. RV-1 will put the
    ruleset on the warband and this should read it then; until it does, the
    published default is the one honest answer and the footer says which it is.
  */
  const { dataset, loading, error } = useDataset(DEFAULT_RULESET_ID);

  return (
    /* `dvh`, never `vh` — docs/MOBILE.md. This is read at a table on a phone. */
    <main className="min-h-dvh bg-theme-base text-theme-text">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/*
          The one piece of chrome, and it is not a control: it says what this
          page is and that it is read-only. `print-hide` keeps it off paper.
        */}
        <header className="print-hide border-b border-theme-border pb-4 space-y-1">
          <span className="eyebrow accent">Shared Warband Roster Sheet · read only</span>
          <h1 className="font-gothic text-2xl sm:text-3xl tracking-tight break-words">
            {warband.name}
          </h1>
          <p className="font-mono text-xs text-theme-muted leading-relaxed">
            Somebody shared this roster with a link. Nothing on this page can be
            changed, and the link stops working when they stop sharing it.
          </p>
        </header>

        {loading && (
          <p className="font-mono text-xs text-theme-muted">Loading the ruleset…</p>
        )}

        {error && (
          <div className="border border-status-error/50 bg-status-error/10 p-4 space-y-1">
            <p className="font-mono text-xs font-bold text-status-error uppercase">
              The ruleset could not be loaded
            </p>
            <p className="font-mono text-xs text-theme-muted leading-relaxed">{error}</p>
            <p className="font-mono text-xs text-theme-muted leading-relaxed">
              The sheet is not shown rather than shown with invented numbers.
            </p>
          </div>
        )}

        {dataset && (
          <WarbandRosterSheet
            warband={warband}
            dataset={dataset}
            /* No campaign: this reader has none, and the sheet leaves CAMPAIGN
               BATTLE blank rather than naming one it cannot verify. */
            campaign={null}
            /* The player's private notes are not shared. The Warband's own lore
               and motto are — that is what a roster is shared for. */
            includePrivate={false}
          />
        )}

        <footer className="print-hide border-t border-theme-border pt-4">
          <p className="font-mono text-xs text-theme-muted">
            Read under the published default ruleset.{' '}
            <Link href="/" className="text-theme-primary hover:underline">TrenchLine</Link>
          </p>
        </footer>
      </div>
    </main>
  );
};
