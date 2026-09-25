'use client';

/**
 * The Warband Roster Sheet, under the warband it belongs to (FD-12 item 3).
 *
 * `/roster/<id>/sheet`. Reached from the builder's toolbar and from the campaign
 * Hub, and it renders exactly the component the public share page renders —
 * `WarbandRosterSheet` — from the store's copy of the warband rather than the
 * database's.
 *
 * The chrome here is the part the share page must not have: Print / PDF, and a
 * way back to the roster. Both carry `print-hide`, because they are controls.
 *
 * A roster the device does not hold says so rather than redirecting. The warband
 * may still be arriving from the cloud sync, and bouncing the reader to a
 * different roster mid-fetch is worse than a moment of "not on this device" —
 * the same call `/roster/[id]` already makes, for the same reason.
 */
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Crown, Plus, Printer } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useDataset } from '@/rules/useDataset';
import { DEFAULT_RULESET_ID } from '@/rules/rulesets';
import { WarbandRosterSheet } from '@/components/sheet/WarbandRosterSheet';
import { PreAppRewardModal } from '@/components/builder/PreAppRewardModal';
import { PatronPicker } from '@/components/builder/PatronPicker';
import { patronMissing } from '@/rules/patrons';

export default function RosterSheetPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? decodeURIComponent(params.id) : null;

  const warband = useStore((s) => s.warbands.find((w) => w.id === id));
  const campaign = useStore((s) => s.campaign);

  /*
    The ruleset this browser is set to, from the same key the builder reads. A
    sheet on a different edition from the roster screen beside it would be two
    answers to "what does this model cost".
  */
  const rulesetId = typeof window === 'undefined'
    ? DEFAULT_RULESET_ID
    : window.localStorage.getItem('trenchline_ruleset') || DEFAULT_RULESET_ID;
  const { dataset, loading, error } = useDataset(rulesetId);
  const [isRewardOpen, setIsRewardOpen] = useState(false);
  const [isPatronOpen, setIsPatronOpen] = useState(false);
  const updateWarbandLore = useStore((s) => s.updateWarbandLore);
  const factions = useStore((s) => s.factions);

  if (!id) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      <div className="print-hide flex flex-wrap items-center justify-between gap-3 border-b border-theme-border pb-4">
        <div className="min-w-0">
          <Link
            href={`/roster/${encodeURIComponent(id)}`}
            className="tap inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-theme-primary hover:text-theme-text"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to the roster</span>
          </Link>
          <h2 className="font-gothic text-2xl sm:text-3xl text-theme-text tracking-tight break-words">
            Warband Roster Sheet
          </h2>
        </div>

        {/* The two controls as one group, so they wrap together under the
            heading on a phone rather than one going to each edge. */}
        <div className="flex flex-wrap items-center gap-2">
          {/*
            FD-12 item 2: the sheet's own half of "recorded before the app". The
            Skill and injury halves are on the unit card, where hand entry
            already happened; the rewards are read here, so the entry for them
            is here.
          */}
          {/*
            The sheet's header names a missing Patron; this is how it is set
            (review round 1, finding H). Naming a gap and giving no way to close
            it from the page that names it is half a feature.
          */}
          {warband && patronMissing(warband) && (
            <button
              onClick={() => setIsPatronOpen(true)}
              className="flex items-center gap-2 min-h-[44px] lg:min-h-0 lg:py-2 px-4 bg-status-warning/15 hover:bg-status-warning/25 text-status-warning border border-status-warning/50 font-mono text-xs font-bold uppercase tracking-widest"
            >
              <Crown className="w-4 h-4" />
              <span>Set the Patron</span>
            </button>
          )}

          {warband && (
            <button
              onClick={() => setIsRewardOpen(true)}
              className="flex items-center gap-2 min-h-[44px] lg:min-h-0 lg:py-2 px-4 bg-theme-base hover:bg-theme-elevated text-theme-text border border-theme-border hover:border-theme-primary font-mono text-xs font-bold uppercase tracking-widest"
            >
              <Plus className="w-4 h-4 text-theme-primary" />
              <span>Rewards</span>
            </button>
          )}

          {/*
            The browser makes the PDF. `window.print()` and a print stylesheet
            is the whole of FD-12 item 4 — a bundled PDF writer would be a
            second renderer to keep in step with this one.
          */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 min-h-[44px] lg:min-h-0 lg:py-2 px-4 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-mono text-xs font-bold uppercase tracking-widest"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {!warband && (
        <p className="font-mono text-xs text-theme-muted leading-relaxed">
          No roster with that id on this device. If you have just signed in, the
          cloud sync may still be fetching it.
        </p>
      )}

      {warband && loading && (
        <p className="font-mono text-xs text-theme-muted">Loading the ruleset…</p>
      )}

      {warband && error && (
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

      {warband && dataset && (
        <WarbandRosterSheet
          warband={warband}
          dataset={dataset}
          campaign={campaign}
          /* The owner's own device: their lore, quotes and notes are theirs to
             see. The share page passes false. */
          includePrivate
        />
      )}

      {warband && (
        <PreAppRewardModal
          open={isRewardOpen}
          onClose={() => setIsRewardOpen(false)}
          warband={warband}
        />
      )}

      {warband && (
        <PatronPicker
          open={isPatronOpen}
          onClose={() => setIsPatronOpen(false)}
          dataset={dataset}
          factionId={warband.factionId}
          factionName={factions.find((f) => f.id === warband.factionId)?.name}
          current={warband.patron}
          onPick={(name) => {
            /* Through the lore action, the one writer of this field. */
            updateWarbandLore(warband.id, warband.lore ?? '', warband.motto ?? '', name);
            setIsPatronOpen(false);
          }}
        />
      )}
    </div>
  );
}
