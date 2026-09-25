'use client';

/**
 * Moving a warband to another ruleset, and seeing what it costs first.
 *
 * RV-1, and the same promise `RulesetSwitcher` makes one layer up: pick → see
 * exactly what changes, with what is LOST called out first → confirm. Nothing
 * is applied before that, and a player who cancels has not moved a Ducat.
 *
 * The difference between the two screens is worth naming, because they look
 * alike: `RulesetSwitcher` changes which ruleset this BROWSER reads, and
 * changes no warband. This changes one WARBAND, permanently, and books the
 * refunds for whatever the target does not carry.
 */
import React from 'react';
import { AlertTriangle, ArrowRight, Check, Loader2 } from 'lucide-react';

import type { Dataset } from '@/types/catalogue';
import type { Warband } from '@/types/warband';
import { planConversion, costLabel, type ConversionItem, type ConversionPlan } from '@/rules/convert';
import { rulesetInfo } from '@/rules/rulesets';
import { Sheet } from '@/components/ui';

interface Props {
  warband: Warband;
  /** The target ruleset's data. Loaded by the caller; absent means loading. */
  target: Dataset | null;
  /** Set when the target could not be loaded. Shown; never worked around. */
  error?: string | null;
  onConvert: (plan: ConversionPlan) => void;
  onClose: () => void;
}

const named = (id: string | null) => (id ? rulesetInfo(id)?.name ?? id : 'an unrecorded ruleset');

export const ConvertRulesetSheet: React.FC<Props> = ({
  warband, target, error, onConvert, onClose,
}) => {
  /*
    Computed while rendering, and cheap enough to: it is a pass over one
    warband's models against one dataset. Memoising it would mean holding a
    plan that could outlive the dataset it was computed from, which is the
    one thing that must not happen between "here is what will change" and
    "do it".
  */
  const plan = target ? planConversion(warband, target) : null;

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title="Convert this warband"
      /* While the target is still loading it is not named: a subtitle that
         says "to an unrecorded ruleset" for half a second is a sentence a
         player can read and be wrong about. */
      subtitle={plan?.to
        ? `From ${named(warband.rulesetId ?? null)} to ${named(plan.to)}.`
        : `This warband is recorded as ${named(warband.rulesetId ?? null)}.`}
      footer={plan && !plan.refusal ? (
        <>
          <button
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-sm border border-theme-border text-theme-muted font-mono text-sm sm:text-xs font-bold uppercase tracking-wider hover:text-theme-text"
          >
            Cancel
          </button>
          <button
            onClick={() => onConvert(plan)}
            className="flex-1 min-h-[44px] rounded-sm bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-mono text-sm sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Convert
          </button>
        </>
      ) : undefined}
    >
      <div className="space-y-3">
        {error && (
          <div className="p-3 rounded-sm bg-theme-accent/15 border border-theme-accent/50">
            <p className="text-xs sm:text-[11px] font-mono text-status-error leading-relaxed">
              Could not load the target ruleset: {error}
            </p>
            <p className="text-xs sm:text-[10px] font-mono text-theme-muted mt-1.5">
              Nothing has changed. A warband is never converted against a ruleset we failed to read.
            </p>
          </div>
        )}

        {!target && !error && (
          <div className="flex items-center gap-2 p-3 text-xs sm:text-[11px] font-mono text-theme-muted">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Working out what changes…
          </div>
        )}

        {plan?.refusal && (
          <div className="p-3 rounded-sm bg-status-warning/10 border border-status-warning/40">
            <p className="text-xs sm:text-[11px] font-mono text-status-warning leading-relaxed">
              {plan.refusal}
            </p>
          </div>
        )}

        {plan && !plan.refusal && (
          <>
            <div className="flex flex-wrap gap-2 text-xs sm:text-[11px] font-mono">
              <Stat label="kept" value={plan.kept.length} />
              <Stat label="changed" value={plan.changed.length} />
              <Stat label="lost" value={plan.lost.length} tone={plan.lost.length ? 'warn' : undefined} />
            </div>

            {plan.lost.length > 0 && (
              <section className="p-3 rounded-sm bg-status-warning/10 border border-status-warning/40 space-y-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-status-warning" />
                  <span className="text-xs sm:text-[11px] font-mono font-bold text-status-warning">
                    {plan.lost.length} {plan.lost.length === 1 ? 'entry' : 'entries'} not in {named(plan.to)}
                  </span>
                </div>
                <p className="text-xs text-theme-text leading-relaxed">
                  These come off the roster and are refunded at what this roster records they cost —
                  {' '}<strong>{costLabel(plan.refund)}</strong> into the Strongbox, as one
                  {' '}<span className="font-mono">conversion</span> entry each. A lost model&rsquo;s
                  Battlekit goes to the Arsenal rather than being refunded twice.
                </p>
                <ul className="space-y-1.5">
                  {plan.lost.map((l, i) => <Lost key={i} item={l} />)}
                </ul>
              </section>
            )}

            {plan.changed.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs sm:text-[10px] font-mono font-bold uppercase tracking-widest text-theme-muted">
                  Changed
                </h3>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Kept, and re-priced. A price change moves no money — the book does not re-charge a
                  warband for a reprint — so the Strongbox is untouched and only what the roster is
                  worth moves.
                </p>
                {plan.changed.map((c, i) => <Changed key={i} item={c} />)}
              </section>
            )}

            {plan.kept.length > 0 && (
              <p className="text-xs sm:text-[11px] font-mono text-theme-muted">
                {plan.kept.length} {plan.kept.length === 1 ? 'entry is' : 'entries are'} identical in
                both rulesets and {plan.kept.length === 1 ? 'is' : 'are'} carried across unchanged.
              </p>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
};

const Stat: React.FC<{ label: string; value: number; tone?: 'warn' }> = ({ label, value, tone }) => (
  <span
    className={`px-2 py-1 rounded-sm border ${
      tone === 'warn' && value > 0
        ? 'border-status-warning/50 text-status-warning'
        : 'border-theme-border text-theme-muted'
    }`}
  >
    <strong className="text-theme-text">{value}</strong> {label}
  </span>
);

const Lost: React.FC<{ item: ConversionItem }> = ({ item }) => (
  <li className="p-2.5 rounded-sm border border-theme-border bg-theme-surface">
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-gothic font-bold text-xs text-theme-text">{item.name}</span>
      <span className="text-xs sm:text-[9px] font-mono text-theme-muted uppercase">{item.kind}</span>
      {item.kind !== 'model' && (
        <span className="text-xs sm:text-[10px] font-mono text-theme-muted">on {item.where}</span>
      )}
    </div>
    {item.refund && (
      <div className="mt-1 text-xs sm:text-[10px] font-mono text-theme-primary">
        refund {costLabel(item.refund)}
      </div>
    )}
    {item.toStash && item.toStash.length > 0 && (
      <div className="mt-1 text-xs sm:text-[10px] font-mono text-theme-muted">
        to the Arsenal: {item.toStash.join(', ')}
      </div>
    )}
  </li>
);

const Changed: React.FC<{ item: ConversionItem }> = ({ item }) => (
  <div className="p-2.5 rounded-sm border border-theme-border bg-theme-base">
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-gothic font-bold text-xs text-theme-text">{item.name}</span>
      <span className="text-xs sm:text-[9px] font-mono text-theme-muted uppercase">{item.kind}</span>
      {item.kind !== 'model' && (
        <span className="text-xs sm:text-[10px] font-mono text-theme-muted">on {item.where}</span>
      )}
    </div>
    <div className="mt-1.5 space-y-1">
      {item.changes.map((c, i) => (
        <div key={i} className="flex items-baseline gap-2 text-xs sm:text-[10px] font-mono">
          <span className="text-theme-muted w-24 flex-shrink-0">{c.field}</span>
          <span className="text-theme-muted line-through truncate">{c.from}</span>
          <ArrowRight className="w-3 h-3 text-theme-muted flex-shrink-0" />
          <span className="text-theme-primary truncate">{c.to}</span>
        </div>
      ))}
    </div>
  </div>
);

export default ConvertRulesetSheet;
