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

/**
 * One variant, collapsed.
 *
 * Every card used to render its lore and its full special-rules list at once.
 * The Iron Sultanate has seventeen variants and some carry four rules apiece,
 * so choosing between them meant scrolling a wall of prose in which the names
 * — the only thing you are actually choosing between — were the smallest part.
 *
 * So the closed card is the name, its badges and how many rules it enforces,
 * which is enough to pick from; the lore and the rules are one press away. The
 * count stays on the closed card deliberately: "4 rules enforced" is a fact
 * about the choice, and hiding it would leave the card saying nothing about
 * what taking this variant costs.
 *
 * Two buttons rather than one, because the outer element used to be a
 * `<button>` and a toggle nested inside one is invalid HTML that browsers
 * resolve by dropping the inner control. The card is a `<div>`; selecting and
 * expanding are separate presses that do separate things.
 */
const Choice: React.FC<{
  name: string;
  description?: string;
  rules?: { name: string; description: string }[];
  opCount?: number;
  thirdParty?: boolean;
  selected: boolean;
  onSelect: () => void;
}> = ({ name, description, rules, opCount = 0, thirdParty, selected, onSelect }) => {
  const [open, setOpen] = React.useState(false);
  const detailId = React.useId();
  const hasDetail = Boolean(description) || (rules?.length ?? 0) > 0;

  return (
    <div
      className={`rounded-sm border transition-colors ${
        selected
          ? 'border-theme-primary bg-theme-elevated'
          : 'border-theme-border hover:border-theme-primary/50'
      }`}
    >
      <button
        onClick={onSelect}
        aria-pressed={selected}
        className="w-full text-left p-3 min-h-[44px] flex items-center gap-2"
      >
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
      </button>

      {hasDetail && (
        <>
          {/*
            The same words the muster screen uses for the same act, so the two
            places a variant is chosen do not describe themselves differently.
          */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={detailId}
            className="w-full min-h-[44px] flex items-center justify-between gap-2 px-3 pb-2 text-left text-xs font-mono font-bold text-theme-primary"
          >
            <span>
              {rules?.length
                ? `${rules.length} special rule${rules.length === 1 ? '' : 's'}`
                : 'Details'}
            </span>
            <span aria-hidden="true" className="text-theme-muted">{open ? 'Hide' : 'Show'}</span>
          </button>

          {/*
            `hidden`, not a conditional render: the panel keeps its identity
            across toggles, so `aria-controls` always points at an element that
            exists. Bounded in `dvh` and scrolled in place — a phone's toolbars
            change the viewport height, and `vh` would size this to a window
            that is not there.
          */}
          <div
            id={detailId}
            hidden={!open}
            className="max-h-[40dvh] overflow-y-auto px-3 pb-3 space-y-1.5"
          >
            {description && (
              <p className="text-xs sm:text-[11px] text-theme-muted leading-relaxed">{description}</p>
            )}
            {rules?.map((r, i) => (
              <div key={i} className="p-2 rounded-sm bg-theme-base border border-theme-border">
                <div className="text-xs sm:text-[10px] font-mono font-bold text-theme-primary">{r.name}</div>
                <p className="text-xs sm:text-[10px] text-theme-muted mt-0.5 leading-relaxed">{r.description}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default VariantPicker;
