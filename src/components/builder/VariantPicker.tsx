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
import { Check, ShieldQuestion } from 'lucide-react';

import type { Dataset } from '@/types/catalogue';
import { variantsForFaction } from '@/rules/variants';
import { Sheet } from '@/components/ui';

interface Props {
  dataset: Dataset;
  /**
   * Whether this Warband allows third-party content. Six of the catalogues'
   * Variants are unofficial, and each one unlocks its own units — so hiding
   * the units but still offering the Variant that reveals them would be half
   * a switch.
   */
  allowThirdParty?: boolean;
  /** The app's faction id, e.g. `iron-sultanate`. */
  factionId: string;
  factionName?: string;
  current?: string;
  onPick: (variantId: string | undefined) => void;
  onClose: () => void;
}

export const VariantPicker: React.FC<Props> = ({
  dataset, factionId, factionName, current, onPick, onClose, allowThirdParty,
}) => {
  const variants = variantsForFaction(dataset, factionId)
    // A Variant already chosen stays visible even if the switch is since off,
    // so the roster never shows "Standard list" for a Warband that is not one.
    .filter((v) => allowThirdParty || !v.thirdParty || v.id === current);

  return (
    <Sheet
      open
      onClose={onClose}
      title="Warband Variant"
      subtitle={`${factionName || factionId} · changes what you may recruit`}
      size="lg"
    >
      <div className="space-y-3">
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
            thirdParty={v.thirdParty}
            selected={current === v.id}
            onSelect={() => onPick(v.id)}
          />
        ))}

        {variants.length === 0 && (
          /* Not an error and not a silent empty list — say which it is. */
          <div className="flex gap-2 p-3 rounded-sm bg-theme-elevated border border-theme-border">
            <ShieldQuestion className="w-4 h-4 text-theme-muted flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-[11px] font-mono text-theme-muted leading-relaxed">
              No Warband Variants are published for this faction in the current ruleset.
              The standard list is the only option.
            </p>
          </div>
        )}
      </div>
    </Sheet>
  );
};

const Choice: React.FC<{
  name: string;
  description?: string;
  rules?: { name: string; description: string }[];
  opCount?: number;
  thirdParty?: boolean;
  selected: boolean;
  onSelect: () => void;
}> = ({ name, description, rules, opCount = 0, thirdParty, selected, onSelect }) => (
  <button
    onClick={onSelect}
    className={`w-full text-left p-3 rounded-sm border transition-colors min-h-[44px] ${
      selected
        ? 'border-theme-primary bg-theme-elevated'
        : 'border-theme-border hover:border-theme-primary/50'
    }`}
  >
    <div className="flex items-center gap-2">
      {selected && <Check className="w-4 h-4 text-theme-primary flex-shrink-0" />}
      <span className="font-gothic font-bold text-sm text-theme-text">{name}</span>
      {thirdParty && (
        <span className="eyebrow px-1.5 py-0.5 rounded font-bold bg-status-warning/15 text-status-warning border border-status-warning/40">
          Third party
        </span>
      )}
      {opCount > 0 && (
        <span className="ml-auto text-xs sm:text-[9px] font-mono text-theme-muted flex-shrink-0">
          {opCount} rule{opCount === 1 ? '' : 's'} enforced
        </span>
      )}
    </div>

    {description && (
      <p className="text-xs sm:text-[11px] text-theme-muted mt-1.5 leading-relaxed">{description}</p>
    )}

    {rules && rules.length > 0 && (
      <div className="mt-2 space-y-1.5">
        {rules.map((r, i) => (
          <div key={i} className="p-2 rounded-sm bg-theme-base border border-theme-border">
            <div className="text-xs sm:text-[10px] font-mono font-bold text-theme-primary">{r.name}</div>
            <p className="text-xs sm:text-[10px] text-theme-muted mt-0.5 leading-relaxed">{r.description}</p>
          </div>
        ))}
      </div>
    )}
  </button>
);

export default VariantPicker;
