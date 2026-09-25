'use client';

/**
 * This warband was built under one ruleset; the app is reading another.
 *
 * RV-1's fourth point. The app's ruleset is a per-browser setting, so a
 * warband built on a laptop set to TrenchLine Rules and opened on a phone set
 * to Latest GitHub was simply read against the other one — a Brazen Bull 15
 * Ducats cheaper, an entry the target does not have shown at its old price,
 * and nothing said. `docs/RULESET-MODEL.md` §8 forbids exactly that for the
 * switcher; this is the same rule for the warband.
 *
 * Two ways out and no third, because there are only two honest ones: read the
 * warband under the ruleset it was built for, or move the warband and see what
 * that costs. Dismissing the bar is not offered — the mismatch does not go
 * away, and a bar a player can silence is a bar that stops being read.
 */
import React from 'react';
import { AlertTriangle, ArrowLeftRight, RefreshCcw } from 'lucide-react';

import { rulesetInfo } from '@/rules/rulesets';

interface Props {
  warbandRulesetId: string;
  appRulesetId: string;
  /** Read this warband under its own ruleset: switches the app's setting. */
  onSwitchApp: () => void;
  /** Move the warband to the app's ruleset, via the conversion report. */
  onConvert: () => void;
}

const named = (id: string) => rulesetInfo(id)?.name ?? id;

export const RulesetMismatchBar: React.FC<Props> = ({
  warbandRulesetId, appRulesetId, onSwitchApp, onConvert,
}) => (
  <div className="border-b border-status-warning/40 bg-status-warning/10 p-3 sm:p-4 space-y-2.5">
    <div className="flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-status-warning flex-shrink-0 mt-0.5" />
      <p className="text-xs sm:text-[11px] text-theme-text leading-relaxed">
        This warband was built under <strong>{named(warbandRulesetId)}</strong>, and this device is
        set to <strong>{named(appRulesetId)}</strong>. Its prices and statlines are being read from
        a ruleset it was not built against.
      </p>
    </div>
    {/*
      A column on a phone and a row from `sm:` up. Two 44px buttons side by
      side at 375px leaves about 160px each, which is not enough for either
      label — and a label that truncates is a choice a player cannot make.
    */}
    <div className="flex flex-col sm:flex-row gap-2">
      <button
        onClick={onSwitchApp}
        className="flex-1 min-h-[44px] px-3 rounded-sm border border-theme-border bg-theme-surface text-theme-text font-mono text-sm sm:text-xs font-bold uppercase tracking-wider hover:border-theme-primary/50 flex items-center justify-center gap-1.5"
      >
        <ArrowLeftRight className="w-4 h-4 flex-shrink-0" />
        Read it as {named(warbandRulesetId)}
      </button>
      <button
        onClick={onConvert}
        className="flex-1 min-h-[44px] px-3 rounded-sm bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-mono text-sm sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
      >
        <RefreshCcw className="w-4 h-4 flex-shrink-0" />
        Convert to {named(appRulesetId)}
      </button>
    </div>
  </div>
);

export default RulesetMismatchBar;
