'use client';

/**
 * The client half of the share page (SH-1).
 *
 * It renders a sheet the SERVER projected, and it is deliberately incapable of
 * doing anything else. Review round 1, finding A: the first version took a
 * `Warband` prop, and a client component's props are serialised into the page —
 * so the owner's private notes, every model's lore and quote, the
 * `chronicleLog`, the `snapshots` naming opponents, the `ledger` with other
 * users' names on its admin entries, `campaignMembers` and `creatorId` were all
 * in the HTML of a page that said the player's private notes are not shared.
 *
 * What crosses the boundary now is a `RosterSheetModel` and four strings. There
 * is no warband here to leak, and `rosterSheet.test.ts` holds that line rather
 * than a comment doing it.
 *
 * **No store.** `useStore` is never touched, so nothing on this page can write
 * and a reader with the link is not quietly given a roster on their own device.
 *
 * **No dataset fetch either.** The projection is done, so this page does not
 * pull 1.6 MB it has no use for — and the ruleset it was read under is the
 * WARBAND's own (RV-1), which a browser could not have known.
 */
import React from 'react';
import Link from 'next/link';
import type { RosterSheetModel } from '@/rules/rosterSheet';
import { RosterSheetView } from '@/components/sheet/WarbandRosterSheet';

export interface SharedRosterSheetProps {
  /** The warband's name, for the masthead. */
  name: string;
  /** `null` where the ruleset could not be loaded — reported, not substituted. */
  sheet: RosterSheetModel | null;
  rulesetName: string;
  /** False where the warband records no ruleset and the default was used. */
  rulesetRecorded: boolean;
}

export const SharedRosterSheet: React.FC<SharedRosterSheetProps> = ({
  name, sheet, rulesetName, rulesetRecorded,
}) => (
  /* `dvh`, never `vh` — docs/MOBILE.md. This is read at a table on a phone. */
  <main className="min-h-dvh bg-theme-base text-theme-text">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/*
        The one piece of chrome, and it is not a control: it says what this page
        is and that it is read-only. `print-hide` keeps it off paper.
      */}
      <header className="print-hide border-b border-theme-border pb-4 space-y-1">
        <span className="eyebrow accent">Shared Warband Roster Sheet · read only</span>
        <h1 className="font-gothic text-2xl sm:text-3xl tracking-tight break-words">
          {name}
        </h1>
        <p className="font-mono text-xs text-theme-muted leading-relaxed">
          Somebody shared this roster with a link. Nothing on this page can be
          changed, and the link stops working when they stop sharing it.
        </p>
      </header>

      {sheet
        ? <RosterSheetView sheet={sheet} />
        : (
          <div className="border border-status-error/50 bg-status-error/10 p-4 space-y-1">
            <p className="font-mono text-xs font-bold text-status-error uppercase">
              The ruleset could not be loaded
            </p>
            <p className="font-mono text-xs text-theme-muted leading-relaxed">
              This roster was built under <strong>{rulesetName}</strong>, and this
              build cannot read it. The sheet is not shown rather than shown with
              invented numbers.
            </p>
          </div>
        )}

      <footer className="print-hide border-t border-theme-border pt-4">
        <p className="font-mono text-xs text-theme-muted">
          {/*
            Which ruleset it was read under, and whether that was the warband's
            own. Absent on a warband means *not recorded*, never *the default*,
            so the two cases read differently.
          */}
          {rulesetRecorded
            ? <>Read under <strong className="text-theme-text">{rulesetName}</strong>, the ruleset this warband records.</>
            : <>This warband records no ruleset, so it is read under <strong className="text-theme-text">{rulesetName}</strong>, the published default.</>}
          {' '}
          <Link href="/" className="text-theme-primary hover:underline">TrenchLine</Link>
        </p>
      </footer>
    </div>
  </main>
);
