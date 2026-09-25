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
  /**
   * The ruleset the warband records where this build does not ship it.
   *
   * Absent when the warband records one that IS shipped, and when it records
   * none. Present only for the third case, which is the one the footer used to
   * misreport (review round 2 item 5).
   */
  rulesetUnavailable?: string;
}

export const SharedRosterSheet: React.FC<SharedRosterSheetProps> = ({
  name, sheet, rulesetName, rulesetRecorded, rulesetUnavailable,
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
            Which ruleset it was read under, and why. THREE readings, not two
            (review round 2 item 5): its own; the default because it records
            none; or the default because it records one this build does not
            carry — which round 1 reported as "records no ruleset", a statement
            about the roster that was simply untrue. A fallback is allowed; a
            silent one is not.
          */}
          {rulesetRecorded && (
            <>Read under <strong className="text-theme-text">{rulesetName}</strong>, the ruleset this warband records.</>
          )}
          {!rulesetRecorded && rulesetUnavailable && (
            <>
              Read under <strong className="text-theme-text">{rulesetName}</strong>,
              the published default, because this warband records{' '}
              <strong className="text-theme-text">{rulesetUnavailable}</strong>,
              which this build does not carry.
            </>
          )}
          {!rulesetRecorded && !rulesetUnavailable && (
            <>This warband records no ruleset, so it is read under <strong className="text-theme-text">{rulesetName}</strong>, the published default.</>
          )}
        </p>
        {/*
          Its own 44px target, out of the sentence (review round 2 item 12).
          Inline in running text it was whatever the line-height gave it — about
          16px — and this page is read on a phone at a table by somebody who was
          handed the link. `inline-flex` with the floor is what makes the hit
          area the standard rather than the font size (docs/MOBILE.md §3).
        */}
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center font-mono text-xs text-theme-primary hover:underline"
        >
          TrenchLine
        </Link>
      </footer>
    </div>
  </main>
);
