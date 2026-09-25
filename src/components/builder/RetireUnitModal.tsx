'use client';

/**
 * Retire Injured Models — the Quartermaster Step, p.123 (RR-14).
 *
 * > You can retire any model in your Warband that has 2 Battle Scars. If you
 * > decide to do so, remove the model from your Warband Roster. You can sell or
 * > reallocate their Battlekit or Glory Items before you retire them if you
 * > wish, or allow them to retire with their Battlekit in honour of the service
 * > they have performed.
 *
 * Three dispositions, because the sentence names three, and the third is not a
 * rounding of the other two: a player who lets a veteran go home with its kit
 * is choosing to lose the Ducats, and an app that quietly banked them would be
 * making that call for them.
 *
 * The rule's own words are shown rather than paraphrased. This screen removes a
 * model from a roster, and the reason it is allowed to should be readable
 * beside the button that does it.
 *
 * Mobile-first: the dispositions are a column of full-width 44px rows on a
 * phone and stay a column at every width, because each carries a sentence
 * rather than a label and three sentences side by side at 375px is three
 * columns of two words.
 */
import React from 'react';
import { LogOut, Coins, Archive, Heart } from 'lucide-react';

import { Sheet } from '../ui/Sheet';
import { useStore } from '../../store/useStore';
import { formatCost, profileCost } from '../../rules/costs';
import { mayRetire, salePrice, type RetirementDisposition } from '../../rules/retire';
import { DATASET } from '../../data/generated/trenchline.generated';
import type { Dataset, Cost } from '../../types/catalogue';
import type { ActiveUnit } from '../../types/warband';

const dataset = DATASET as unknown as Dataset;

interface Props {
  warbandId: string;
  unit: ActiveUnit;
  onClose: () => void;
}

export const RetireUnitModal: React.FC<Props> = ({ warbandId, unit, onClose }) => {
  const { retireUnit } = useStore();
  const verdict = mayRetire(dataset, unit);

  /* What the model is carrying, and what half of it would fetch. Computed here
     only to show the player the number before they commit to it; the store
     recomputes it from the same helper when the choice is made. */
  const carried = [
    ...unit.equippedWeapons,
    ...unit.equippedArmour,
    ...unit.equippedEquipment,
  ];
  const proceeds: Cost = carried.reduce(
    (acc, item) => {
      const back = salePrice(profileCost(item));
      return { ducats: acc.ducats + back.ducats, glory: acc.glory + back.glory };
    },
    { ducats: 0, glory: 0 } as Cost);

  const choose = (disposition: RetirementDisposition) => {
    retireUnit(warbandId, unit.id, disposition, dataset);
    onClose();
  };

  const options: {
    key: RetirementDisposition;
    icon: React.ReactNode;
    label: string;
    detail: string;
  }[] = [
    {
      key: 'sell',
      icon: <Coins className="h-4 w-4 flex-shrink-0" />,
      label: 'Sell their kit',
      detail: carried.length
        ? `${carried.length} item${carried.length === 1 ? '' : 's'} sold for half, fractions up — ${formatCost(proceeds)} to the Strongbox.`
        : 'This model carries nothing to sell.',
    },
    {
      key: 'arsenal',
      icon: <Archive className="h-4 w-4 flex-shrink-0" />,
      label: 'Keep their kit in the Arsenal',
      detail: carried.length
        ? `${carried.length} item${carried.length === 1 ? '' : 's'} to the Arsenal, to be reallocated.`
        : 'This model carries nothing to reallocate.',
    },
    {
      key: 'keep',
      icon: <Heart className="h-4 w-4 flex-shrink-0" />,
      label: 'Let them keep it',
      detail: 'They retire with their Battlekit, in honour of the service they have performed.',
    },
  ];

  return (
    <Sheet
      open
      onClose={onClose}
      size="sm"
      label={`Retire ${unit.customName}`}
      title={
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-theme-accent bg-theme-accent/20">
            <LogOut className="h-4 w-4 text-theme-accent" />
          </span>
          Retire {unit.customName}
        </span>
      }
      footer={
        <button
          onClick={onClose}
          className="flex-1 min-h-[44px] rounded bg-theme-elevated px-4 py-2 font-mono text-xs font-bold uppercase text-theme-muted transition-all hover:bg-theme-border hover:text-theme-text"
        >
          Keep them on the Roster
        </button>
      }
    >
      <div className="space-y-3 font-mono text-xs text-theme-text">
        <p className="leading-relaxed text-theme-muted">
          {verdict.scars} Battle Scar{verdict.scars === 1 ? '' : 's'}
          {verdict.at !== null && ` — the Quartermaster Step allows retirement at ${verdict.at}.`}
        </p>

        {/* The rule, in the book's own words. */}
        {verdict.text && (
          <blockquote className="rounded border border-theme-border bg-theme-base p-2.5 leading-relaxed text-theme-muted">
            {verdict.text}
          </blockquote>
        )}

        <div className="flex flex-col gap-2">
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => choose(o.key)}
              className="flex min-h-[44px] w-full items-start gap-2 rounded border border-theme-border bg-theme-surface p-2.5 text-left transition-colors hover:border-theme-primary/60 hover:bg-theme-elevated"
            >
              <span className="mt-0.5 text-theme-primary">{o.icon}</span>
              <span className="min-w-0">
                <strong className="block uppercase tracking-wider text-theme-text">{o.label}</strong>
                <span className="block leading-relaxed text-theme-muted">{o.detail}</span>
              </span>
            </button>
          ))}
        </div>

        <p className="leading-relaxed text-theme-muted">
          The model moves to the Fallen, marked as retired rather than killed. Nothing is deleted.
        </p>
      </div>
    </Sheet>
  );
};
