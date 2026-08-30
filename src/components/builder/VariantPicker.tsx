'use client';

/**
 * Choosing a Warband Variant.
 *
 * Seventeen variants exist in the ruleset and the app had no way to say which
 * one a warband was, so every variant rule went unenforced — and worse than
 * unenforced, misapplied: a House of Wisdom warband was checked against the
 * standard Iron Sultanate list and told it must include a Yüzbaşı, which that
 * variant specifically forbids. A correct rule, applied to a warband that had
 * never been asked what it was.
 *
 * The variant's rules are shown before the choice is made, not after. A player
 * picking "The House of Wisdom" is agreeing to lose the Yüzbaşı and gain the
 * Alchemist requirement, and they should be able to see that first.
 */
import React from 'react';
import { Check, X, ShieldQuestion } from 'lucide-react';

import type { Dataset, WarbandVariant } from '@/types/catalogue';
import { variantsForFaction } from '@/rules/variants';

interface Props {
  dataset: Dataset;
  /** The app's faction id, e.g. `iron-sultanate`. */
  factionId: string;
  factionName?: string;
  current?: string;
  onPick: (variantId: string | undefined) => void;
  onClose: () => void;
}

export const VariantPicker: React.FC<Props> = ({
  dataset, factionId, factionName, current, onPick, onClose,
}) => {
  const variants = variantsForFaction(dataset, factionId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-2xl max-h-[85dvh] bg-[#161920] border border-[#323846] sm:rounded-md flex flex-col overflow-hidden">
        <header className="flex items-start justify-between gap-3 px-4 py-3 bg-[#20242E] border-b border-[#323846]">
          <div className="min-w-0">
            <h2 className="font-gothic font-bold text-base text-[#ECEFF4]">Warband Variant</h2>
            <p className="text-[11px] font-mono text-[#8E95A5] mt-0.5 truncate">
              {factionName || factionId} · changes what you may recruit
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center text-[#8E95A5] hover:text-[#ECEFF4]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="overflow-y-auto p-4 space-y-3">
          {/* The standard list is a real choice, not the absence of one. */}
          <Choice
            name="Standard list"
            description="No variant. The faction's published list, unmodified."
            selected={!current}
            onSelect={() => onPick(undefined)}
          />

          {variants.map((v) => (
            <Choice
              key={v.id}
              name={v.name}
              description={v.lore}
              rules={v.specialRules}
              opCount={v.ops?.length ?? 0}
              selected={current === v.id}
              onSelect={() => onPick(v.id)}
            />
          ))}

          {variants.length === 0 && (
            /* Not an error and not a silent empty list — say which it is. */
            <div className="flex gap-2 p-3 rounded-sm bg-[#20242E] border border-[#323846]">
              <ShieldQuestion className="w-4 h-4 text-[#8E95A5] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] font-mono text-[#8E95A5] leading-relaxed">
                No Warband Variants are published for this faction in the current ruleset.
                The standard list is the only option.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Choice: React.FC<{
  name: string;
  description?: string;
  rules?: { name: string; description: string }[];
  opCount?: number;
  selected: boolean;
  onSelect: () => void;
}> = ({ name, description, rules, opCount = 0, selected, onSelect }) => (
  <button
    onClick={onSelect}
    className={`w-full text-left p-3 rounded-sm border transition-colors min-h-[44px] ${
      selected
        ? 'border-[#D4AF37] bg-[#20242E]'
        : 'border-[#323846] hover:border-[#D4AF37]/50'
    }`}
  >
    <div className="flex items-center gap-2">
      {selected && <Check className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />}
      <span className="font-gothic font-bold text-sm text-[#ECEFF4]">{name}</span>
      {opCount > 0 && (
        <span className="ml-auto text-[9px] font-mono text-[#8E95A5] flex-shrink-0">
          {opCount} rule{opCount === 1 ? '' : 's'} enforced
        </span>
      )}
    </div>

    {description && (
      <p className="text-[11px] text-[#8E95A5] mt-1.5 leading-relaxed">{description}</p>
    )}

    {rules && rules.length > 0 && (
      <div className="mt-2 space-y-1.5">
        {rules.map((r, i) => (
          <div key={i} className="p-2 rounded-sm bg-[#0C0E12] border border-[#323846]">
            <div className="text-[10px] font-mono font-bold text-[#D4AF37]">{r.name}</div>
            <p className="text-[10px] text-[#8E95A5] mt-0.5 leading-relaxed">{r.description}</p>
          </div>
        ))}
      </div>
    )}
  </button>
);

export default VariantPicker;
