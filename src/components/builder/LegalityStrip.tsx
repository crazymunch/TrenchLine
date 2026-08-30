'use client';

/**
 * Roster legality, on screen.
 *
 * The engine has been able to answer this for a while; nothing showed it. This
 * is the strip from the design — a verdict, the rules that passed inline, and a
 * REVIEW affordance opening the full breakdown.
 *
 * Two rules it keeps:
 *
 *   - **Every violation names the rule that produced it.** A player who is told
 *     "illegal" and not why cannot fix it, and cannot tell whether we are right.
 *   - **What we cannot check, we say we cannot check.** Restrictions the parser
 *     could not read, models that did not join the dataset, and conditions the
 *     evaluator could not decide are all shown as open questions rather than
 *     folded into a pass.
 */
import React, { useMemo, useState } from 'react';
import { ShieldCheck, AlertTriangle, X, ChevronRight, HelpCircle } from 'lucide-react';

import type { Dataset } from '@/types/catalogue';
import type { Warband } from '@/types/warband';
import { toRoster } from '@/rules/fromWarband';
import { validateRoster, type Violation } from '@/rules/validate';
import { variantById } from '@/rules/variants';
import { ProvenanceTag } from './ProvenanceTag';

interface Props {
  warband: Warband;
  dataset: Dataset;
  rulesetId: string;
}

export const LegalityStrip: React.FC<Props> = ({ warband, dataset, rulesetId }) => {
  const [open, setOpen] = useState(false);

  const { result, unmatched, variant, joined } = useMemo(() => {
    const { roster, unmatched } = toRoster(warband, dataset);
    const byId = new Map(dataset.units.map((u) => [u.id, u]));
    // One row per distinct profile actually in the roster — asking twice about
    // two Kavasses would be noise.
    const seen = new Set<string>();
    const joined = roster.units.flatMap((u) => {
      if (seen.has(u.profileId)) return [];
      seen.add(u.profileId);
      return [{ id: u.id, name: u.name, profileId: u.profileId,
                profileName: byId.get(u.profileId)?.name ?? u.profileId }];
    });
    return {
      result: validateRoster(roster, dataset),
      unmatched,
      // By id or by name, so a warband saved with either spelling resolves.
      variant: variantById(dataset, warband.variantId),
      joined,
    };
  }, [warband, dataset]);

  const errors = result.errors;
  const warnings = result.warnings;
  // A model we could not join is not a pass. It is an unknown, and it makes the
  // whole verdict provisional — say so rather than showing a confident LEGAL.
  const provisional = unmatched.length > 0;
  const legal = errors.length === 0 && !provisional;

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#20242E] border-y border-[#323846] text-xs font-mono">
        <span
          className={`flex items-center gap-1.5 px-2 py-1 rounded-sm border font-bold tracking-wider flex-shrink-0 ${
            legal
              ? 'text-[#4E9A6E] border-[#4E9A6E]'
              : errors.length
              ? 'text-[#E53935] border-[#E53935]'
              : 'text-[#FFB300] border-[#FFB300]'
          }`}
        >
          {legal ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {legal ? 'LEGAL' : errors.length ? 'NOT LEGAL' : 'UNVERIFIED'}
        </span>

        <span className="text-[#8E95A5] truncate hidden sm:block flex-1">
          {errors.length > 0
            ? `${errors.length} error${errors.length === 1 ? '' : 's'}`
            : provisional
            ? `${unmatched.length} entr${unmatched.length === 1 ? 'y' : 'ies'} not in this ruleset`
            : variant
            ? `${variant.name} · ${variant.specialRules?.length ?? 0} rules checked`
            : 'All checks passed'}
          {warnings.length > 0 && ` · ${warnings.length} to check by hand`}
        </span>

        <button
          onClick={() => setOpen(true)}
          className="ml-auto flex items-center gap-1 min-h-[44px] px-2 -my-2 text-[#D4AF37] font-bold tracking-wider hover:text-[#E5C158] transition-colors"
        >
          REVIEW <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full sm:max-w-2xl max-h-[85dvh] bg-[#161920] border border-[#323846] sm:rounded-md flex flex-col overflow-hidden">
            <header className="flex items-start justify-between gap-3 px-4 py-3 bg-[#20242E] border-b border-[#323846]">
              <div>
                <h2 className="font-gothic font-bold text-base text-[#ECEFF4]">Legality</h2>
                <p className="text-[11px] font-mono text-[#8E95A5] mt-0.5">
                  {warband.factionId}
                  {variant && ` · ${variant.name}`}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center text-[#8E95A5] hover:text-[#ECEFF4]"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="overflow-y-auto p-4 space-y-5">
              <Group title="Errors" empty="Nothing blocking." items={errors} tone="error" />
              <Group
                title="Check by hand"
                empty="Nothing outstanding."
                items={warnings}
                tone="warn"
              />

              {provisional && (
                <section>
                  <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8E95A5] mb-2">
                    Not in this ruleset
                  </h3>
                  <div className="p-3 rounded-sm bg-[#8B0000]/10 border border-[#8B0000]/40 space-y-2">
                    <p className="text-[11px] font-mono text-[#8E95A5] leading-relaxed">
                      These are in the warband but matched no entry, so they are not counted in
                      any check above. The verdict is provisional until they resolve.
                    </p>
                    <ul className="space-y-1">
                      {unmatched.map((u, i) => (
                        <li key={i} className="text-[11px] font-mono text-[#E53935]">
                          {u.kind === 'unit' ? '◆' : '·'} {u.name}
                          {u.on && <span className="text-[#8E95A5]"> on {u.on}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              {joined.length > 0 && (
                <section>
                  <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8E95A5] mb-2">
                    Where these profiles come from
                  </h3>
                  <div className="space-y-1.5">
                    {joined.map((j) => (
                      <div
                        key={j.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-sm bg-[#0C0E12] border border-[#323846]"
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-mono text-[#ECEFF4] truncate">{j.name}</div>
                          <div className="text-[10px] font-mono text-[#8E95A5] truncate">{j.profileName}</div>
                        </div>
                        <ProvenanceTag
                          entity={`unit:${j.profileId}`}
                          rulesetId={rulesetId}
                          fields={['cost.ducats', 'stats.movement', 'stats.ranged', 'stats.melee',
                                   'stats.armour', 'stats.base', 'keywords']}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {variant?.specialRules?.length ? (
                <section>
                  <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8E95A5] mb-2">
                    {variant.name} — rules in force
                  </h3>
                  <div className="space-y-1.5">
                    {variant.specialRules.map((r, i) => (
                      <div key={i} className="p-2.5 rounded-sm bg-[#0C0E12] border border-[#323846]">
                        <div className="text-[11px] font-mono font-bold text-[#D4AF37]">{r.name}</div>
                        <p className="text-[11px] text-[#8E95A5] mt-1 leading-relaxed">{r.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const Group: React.FC<{
  title: string;
  empty: string;
  items: Violation[];
  tone: 'error' | 'warn';
}> = ({ title, empty, items, tone }) => (
  <section>
    <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8E95A5] mb-2">
      {title} {items.length > 0 && `(${items.length})`}
    </h3>

    {items.length === 0 ? (
      <p className="text-[11px] font-mono text-[#4E9A6E]">{empty}</p>
    ) : (
      <div className="space-y-1.5">
        {items.map((v, i) => (
          <article
            key={i}
            className={`p-3 rounded-sm border-l-2 bg-[#20242E] border border-[#323846] ${
              tone === 'error' ? 'border-l-[#E53935]' : 'border-l-[#FFB300]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm border ${
                  tone === 'error'
                    ? 'text-[#E53935] border-[#8B0000]/60 bg-[#8B0000]/20'
                    : 'text-[#FFB300] border-[#FFB300]/40 bg-[#FFB300]/10'
                }`}
              >
                {v.code}
              </span>
            </div>
            <p className="text-xs text-[#ECEFF4] leading-snug">{v.message}</p>
            {/* The rule, always. "Illegal" without a citation is not actionable. */}
            {v.rule && (
              <div className="mt-2 flex gap-1.5 p-2 rounded-sm bg-[#0C0E12] border border-[#323846]">
                <HelpCircle className="w-3 h-3 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                <p className="text-[10px] font-mono text-[#8E95A5] leading-relaxed">{v.rule}</p>
              </div>
            )}
          </article>
        ))}
      </div>
    )}
  </section>
);

export default LegalityStrip;
