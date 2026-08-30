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
import { ShieldCheck, AlertTriangle, ChevronRight, HelpCircle } from 'lucide-react';

import type { Dataset } from '@/types/catalogue';
import type { Warband } from '@/types/warband';
import { toRoster } from '@/rules/fromWarband';
import { validateRoster, type Violation } from '@/rules/validate';
import { variantById } from '@/rules/variants';
import { ProvenanceTag } from './ProvenanceTag';
import { Sheet } from '@/components/ui';

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
      <div className="flex items-center gap-3 px-4 py-2.5 bg-theme-elevated border-y border-theme-border text-xs font-mono">
        <span
          className={`flex items-center gap-1.5 px-2 py-1 rounded-sm border font-bold tracking-wider flex-shrink-0 ${
            legal
              ? 'text-status-legal border-status-legal'
              : errors.length
              ? 'text-status-error border-status-error'
              : 'text-status-warning border-status-warning'
          }`}
        >
          {legal ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {legal ? 'LEGAL' : errors.length ? 'NOT LEGAL' : 'UNVERIFIED'}
        </span>

        <span className="text-theme-muted truncate hidden sm:block flex-1">
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
          className="ml-auto flex items-center gap-1 min-h-[44px] px-2 -my-2 text-theme-primary font-bold tracking-wider hover:text-theme-primary-hover transition-colors"
        >
          REVIEW <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Legality"
        subtitle={`${warband.factionId}${variant ? ` · ${variant.name}` : ''}`}
        size="lg"
      >
        <div className="space-y-5">
              <Group title="Errors" empty="Nothing blocking." items={errors} tone="error" />
              <Group
                title="Check by hand"
                empty="Nothing outstanding."
                items={warnings}
                tone="warn"
              />

              {provisional && (
                <section>
                  <h3 className="text-xs sm:text-[10px] font-mono font-bold uppercase tracking-widest text-theme-muted mb-2">
                    Not in this ruleset
                  </h3>
                  <div className="p-3 rounded-sm bg-theme-accent/10 border border-theme-accent/40 space-y-2">
                    <p className="text-xs sm:text-[11px] font-mono text-theme-muted leading-relaxed">
                      These are in the warband but matched no entry, so they are not counted in
                      any check above. The verdict is provisional until they resolve.
                    </p>
                    <ul className="space-y-1">
                      {unmatched.map((u, i) => (
                        <li key={i} className="text-xs sm:text-[11px] font-mono text-status-error">
                          {u.kind === 'unit' ? '◆' : '·'} {u.name}
                          {u.on && <span className="text-theme-muted"> on {u.on}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              {joined.length > 0 && (
                <section>
                  <h3 className="text-xs sm:text-[10px] font-mono font-bold uppercase tracking-widest text-theme-muted mb-2">
                    Where these profiles come from
                  </h3>
                  <div className="space-y-1.5">
                    {joined.map((j) => (
                      <div
                        key={j.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-sm bg-theme-base border border-theme-border"
                      >
                        <div className="min-w-0">
                          <div className="text-xs sm:text-[11px] font-mono text-theme-text truncate">{j.name}</div>
                          <div className="text-xs sm:text-[10px] font-mono text-theme-muted truncate">{j.profileName}</div>
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
                  <h3 className="text-xs sm:text-[10px] font-mono font-bold uppercase tracking-widest text-theme-muted mb-2">
                    {variant.name} — rules in force
                  </h3>
                  <div className="space-y-1.5">
                    {variant.specialRules.map((r, i) => (
                      <div key={i} className="p-2.5 rounded-sm bg-theme-base border border-theme-border">
                        <div className="text-xs sm:text-[11px] font-mono font-bold text-theme-primary">{r.name}</div>
                        <p className="text-xs sm:text-[11px] text-theme-muted mt-1 leading-relaxed">{r.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
        </div>
      </Sheet>
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
    <h3 className="text-xs sm:text-[10px] font-mono font-bold uppercase tracking-widest text-theme-muted mb-2">
      {title} {items.length > 0 && `(${items.length})`}
    </h3>

    {items.length === 0 ? (
      <p className="text-xs sm:text-[11px] font-mono text-status-legal">{empty}</p>
    ) : (
      <div className="space-y-1.5">
        {items.map((v, i) => (
          <article
            key={i}
            className={`p-3 rounded-sm border-l-2 bg-theme-elevated border border-theme-border ${
              tone === 'error' ? 'border-l-status-error' : 'border-l-status-warning'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`text-xs sm:text-[9px] font-mono px-1.5 py-0.5 rounded-sm border ${
                  tone === 'error'
                    ? 'text-status-error border-theme-accent/60 bg-theme-accent/20'
                    : 'text-status-warning border-status-warning/40 bg-status-warning/10'
                }`}
              >
                {v.code}
              </span>
            </div>
            <p className="text-xs text-theme-text leading-snug">{v.message}</p>
            {/* The rule, always. "Illegal" without a citation is not actionable. */}
            {v.rule && (
              <div className="mt-2 flex gap-1.5 p-2 rounded-sm bg-theme-base border border-theme-border">
                <HelpCircle className="w-3 h-3 text-theme-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-[10px] font-mono text-theme-muted leading-relaxed">{v.rule}</p>
              </div>
            )}
          </article>
        ))}
      </div>
    )}
  </section>
);

export default LegalityStrip;
