'use client';

/**
 * Choosing a ruleset, and seeing what that does first.
 *
 * The rule from docs/RULESET-MODEL.md §8: switching shows a diff rather than
 * mutating saved data. A player who moves to Latest GitHub and finds their
 * Brazen Bull quietly 15 Ducats cheaper has been handed a wrong roster, not
 * given a choice.
 *
 * So the flow is: pick → see exactly what changes, with the entries in *your*
 * warband called out first → confirm. Nothing is applied before that.
 */
import React, { useState } from 'react';
import { Check, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';

import type { Dataset } from '@/types/catalogue';
import { RULESETS } from '@/rules/rulesets';
import { fetchDataset } from '@/rules/useDataset';
import { diffDatasets, diffAffecting, type DatasetDiff, type EntityDiff } from '@/rules/diff';
import { Sheet } from '@/components/ui';

interface Props {
  current: string;
  currentDataset: Dataset;
  /** Names of the models in the open warband, so the diff can lead with them. */
  rosterUnitNames: string[];
  onApply: (rulesetId: string) => void;
  onClose: () => void;
}

export const RulesetSwitcher: React.FC<Props> = ({
  current, currentDataset, rosterUnitNames, onApply, onClose,
}) => {
  const [target, setTarget] = useState<string | null>(null);
  const [diff, setDiff] = useState<DatasetDiff | null>(null);
  const [affecting, setAffecting] = useState<EntityDiff[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = async (id: string) => {
    setTarget(id);
    setBusy(true);
    setError(null);
    setDiff(null);
    try {
      const next = await fetchDataset(id);
      const d = diffDatasets(currentDataset, next);
      setDiff(d);
      setAffecting(diffAffecting(d, rosterUnitNames));
    } catch (e) {
      // Say the switch could not be previewed. Never apply a ruleset whose
      // consequences we failed to compute.
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Ruleset"
      subtitle="Which rules this warband is built and checked against."
      size="lg"
      footer={diff && !busy && target ? (
        <>
          <button
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-sm border border-[#323846] text-[#8E95A5] font-mono text-sm sm:text-xs font-bold uppercase tracking-wider hover:text-[#ECEFF4]"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(target)}
            className="flex-1 min-h-[44px] rounded-sm bg-[#D4AF37] hover:bg-[#E5C158] text-black font-mono text-sm sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Switch &amp; re-check
          </button>
        </>
      ) : undefined}
    >
      <div className="space-y-3">
          {RULESETS.map((r) => {
            const active = r.id === current;
            const chosen = r.id === target;
            return (
              <button
                key={r.id}
                onClick={() => !active && preview(r.id)}
                disabled={active}
                className={`w-full text-left p-3 rounded-sm border transition-colors ${
                  active
                    ? 'border-[#D4AF37] bg-[#20242E] cursor-default'
                    : chosen
                    ? 'border-[#D4AF37]/60 bg-[#20242E]'
                    : 'border-[#323846] hover:border-[#D4AF37]/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-gothic font-bold text-sm text-[#ECEFF4]">{r.name}</span>
                  {active && (
                    <span className="text-xs sm:text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm bg-[#D4AF37] text-black">
                      IN USE
                    </span>
                  )}
                  {r.isDefault && !active && (
                    <span className="text-xs sm:text-[9px] font-mono text-[#8E95A5]">default</span>
                  )}
                </div>
                <p className="text-xs sm:text-[11px] text-[#8E95A5] mt-1.5 leading-relaxed">{r.description}</p>
              </button>
            );
          })}

          {busy && (
            <div className="flex items-center gap-2 p-3 text-xs sm:text-[11px] font-mono text-[#8E95A5]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Working out what changes…
            </div>
          )}

          {error && (
            <div className="p-3 rounded-sm bg-[#8B0000]/15 border border-[#8B0000]/50">
              <p className="text-xs sm:text-[11px] font-mono text-[#E53935] leading-relaxed">
                Could not preview the switch: {error}
              </p>
              <p className="text-xs sm:text-[10px] font-mono text-[#8E95A5] mt-1.5">
                Nothing has changed. A ruleset is never applied without showing its effect first.
              </p>
            </div>
          )}

          {diff && !busy && (
            <section className="space-y-3 pt-1">
              <h3 className="text-xs sm:text-[10px] font-mono font-bold uppercase tracking-widest text-[#8E95A5]">
                Switching would change
              </h3>

              <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                <Stat label="changed" value={diff.changed.length} />
                <Stat label="added" value={diff.added.length} />
                <Stat label="removed" value={diff.removed.length} tone={diff.removed.length ? 'warn' : undefined} />
              </div>

              {affecting.length > 0 && (
                <div className="p-3 rounded-sm bg-[#FFB300]/10 border border-[#FFB300]/40 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#FFB300]" />
                    <span className="text-xs sm:text-[11px] font-mono font-bold text-[#FFB300]">
                      {affecting.length} in this warband
                    </span>
                  </div>
                  {affecting.map((e) => (
                    <Entry key={e.id} entry={e} />
                  ))}
                </div>
              )}

              {diff.changed.filter((c) => !affecting.includes(c)).slice(0, 8).map((e) => (
                <Entry key={e.id} entry={e} muted />
              ))}

              {diff.changed.length > affecting.length + 8 && (
                <p className="text-[10px] font-mono text-[#8E95A5]">
                  …and {diff.changed.length - affecting.length - 8} more elsewhere in the ruleset.
                </p>
              )}
            </section>
          )}
      </div>
    </Sheet>
  );
};

const Stat: React.FC<{ label: string; value: number; tone?: 'warn' }> = ({ label, value, tone }) => (
  <span
    className={`px-2 py-1 rounded-sm border ${
      tone === 'warn' && value > 0
        ? 'border-[#FFB300]/50 text-[#FFB300]'
        : 'border-[#323846] text-[#8E95A5]'
    }`}
  >
    <strong className="text-[#ECEFF4]">{value}</strong> {label}
  </span>
);

const Entry: React.FC<{ entry: EntityDiff; muted?: boolean }> = ({ entry, muted }) => (
  <div className={`p-2.5 rounded-sm border ${muted ? 'border-[#323846] bg-[#0C0E12]' : 'border-[#323846] bg-[#161920]'}`}>
    <div className="flex items-center gap-2">
      <span className="font-gothic font-bold text-xs text-[#ECEFF4]">{entry.name}</span>
      <span className="text-xs sm:text-[9px] font-mono text-[#8E95A5] uppercase">{entry.kind}</span>
    </div>
    <div className="mt-1.5 space-y-1">
      {entry.changes.map((c, i) => (
        <div key={i} className="flex items-baseline gap-2 text-[10px] font-mono">
          <span className="text-[#8E95A5] w-24 flex-shrink-0">{c.field}</span>
          <span className="text-[#8E95A5] line-through truncate">{c.from}</span>
          <ArrowRight className="w-3 h-3 text-[#8E95A5] flex-shrink-0" />
          <span className="text-[#D4AF37] truncate">{c.to}</span>
        </div>
      ))}
    </div>
  </div>
);

export default RulesetSwitcher;
