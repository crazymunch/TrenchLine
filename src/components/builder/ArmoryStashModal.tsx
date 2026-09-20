'use client';

import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { useStore } from '../../store/useStore';
import { Warband, stashPrice } from '../../types/warband';
import type { Cost } from '../../types/catalogue';
import { formatUnitCost } from '../../rules/savedGlory';
import { profileCost } from '../../rules/costs';
import { soundEffects } from '../../services/soundEffects';
import { 
  Package, 
  UserCheck
} from 'lucide-react';

interface ArmoryStashModalProps {
  warband: Warband;
  onClose: () => void;
}

export const ArmoryStashModal: React.FC<ArmoryStashModalProps> = ({ warband, onClose }) => {
  const { weapons, armour, equipment, buyToStash, sellFromStash, assignStashToUnit } = useStore();

  const [activeTab, setActiveTab] = useState<'stash' | 'buy'>('stash');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(warband.units[0]?.id || '');
  const [buyCategory, setBuyCategory] = useState<'weapons' | 'armour' | 'equipment'>('weapons');

  const held: Cost = {
    ducats: warband.treasuryDucats ?? 0,
    glory: warband.gloryPoints ?? 0,
  };

  /*
    The rows are the faction's Armoury Table: `recruitable` builds these three
    lists from `armouryFor(dataset, factionId)`, one entry per row, and keeps
    the row's Ducats in `cost` and its Glory in `gloryCost`.

    This modal read only the first. Every Glory-priced offer in the dataset is
    zero Ducats and some Glory — all 32 of them, across 8 factions — so each
    one printed "0 D", passed an affordability test against a Strongbox it was
    not spending from, and was bought for nothing. `profileCost` puts the row's
    Cost back together.
  */
  const handleBuy = (item: {
    id: string; name: string; type: 'Weapon' | 'Armour' | 'Equipment'; price: Cost;
  }) => {
    buyToStash(warband.id, { ...item, cost: item.price.ducats });
    soundEffects.playBladeClang();
  };

  /*
    One row, so the affordability rule is written once rather than three
    times. The store refuses a purchase either Strongbox cannot cover; this is
    what stops the player reaching a refusal at all, and says which Strongbox
    is short instead of leaving them to guess.
  */
  const BuyRow: React.FC<{
    /* Optional, because not every catalogue row carries one — an Armour
       entry with no modifier is a real entry, not a missing field. */
    id: string; name: string; detail?: string;
    type: 'Weapon' | 'Armour' | 'Equipment'; price: Cost;
  }> = ({ id, name, detail, type, price }) => {
    const short: Cost = {
      ducats: Math.max(0, price.ducats - held.ducats),
      glory: Math.max(0, price.glory - held.glory),
    };
    const affordable = !short.ducats && !short.glory;
    const label = formatUnitCost(price.ducats, price.glory);
    return (
      <div className="p-2.5 bg-theme-elevated rounded border border-theme-border flex items-center justify-between gap-2 text-xs font-mono">
        <div className="min-w-0">
          <strong className="text-theme-text">{name}</strong>
          {detail && (
            <span className="text-xs sm:text-[10px] text-theme-muted block">{detail}</span>
          )}
        </div>
        <button
          onClick={() => handleBuy({ id, name, type, price })}
          disabled={!affordable}
          title={affordable
            ? undefined
            : `The Strongbox holds ${formatUnitCost(held.ducats, held.glory)}, `
              + `and this costs ${label}.`}
          className={`px-3 py-1 rounded font-bold transition-colors border flex-shrink-0 ${
            affordable
              ? 'bg-theme-base hover:bg-theme-primary hover:text-theme-base text-theme-primary border-theme-primary/50'
              : 'bg-theme-base/50 text-theme-muted border-theme-border cursor-not-allowed'
          }`}
        >
          {affordable
            ? `Buy (${label})`
            : `${label} — short ${formatUnitCost(short.ducats, short.glory)}`}
        </button>
      </div>
    );
  };

  const handleSell = (itemId: string) => {
    sellFromStash(warband.id, itemId);
  };

  const handleAssign = (itemId: string) => {
    if (!selectedUnitId) return;
    assignStashToUnit(warband.id, itemId, selectedUnitId);
    soundEffects.playBladeClang();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title="WARBAND ARMORY STASH & MUNITIONS DEPOT"
      /* Plainly, and with the Glory. This read `Treasury: <strong
         className="text-theme-primary">700 Ducats</strong>` on screen — the
         markup was inside a template string, so the player was shown the
         tag. And the Arsenal spends Glory too, so a Strongbox line that
         names only one currency cannot say whether a purchase is affordable. */
      subtitle={`${warband.name} | Strongbox: ${held.ducats} Ducats, ${held.glory} Glory`}
    >
      {/* Tab Controls */}
      <div className="flex items-center space-x-2 px-6 py-3 border-b border-theme-border bg-theme-surface">
        <button
          onClick={() => setActiveTab('stash')}
          className={`px-4 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all ${
            activeTab === 'stash'
              ? 'bg-theme-primary text-theme-base shadow'
              : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
          }`}
        >
          Stash Inventory ({warband.armoryStash.reduce((s, i) => s + i.quantity, 0)})
        </button>

        <button
          onClick={() => setActiveTab('buy')}
          className={`px-4 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all ${
            activeTab === 'buy'
              ? 'bg-theme-primary text-theme-base shadow'
              : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
          }`}
        >
          Purchase Munitions to Stash
        </button>
      </div>
      {/* Content */}
      <div className="p-6 overflow-y-auto space-y-6 flex-1">
  
        {/* TAB 1: STASH INVENTORY */}
        {activeTab === 'stash' && (
          <div className="space-y-4">
      
            {/* Unit Assigner Picker */}
            <div className="p-3.5 bg-theme-base rounded border border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-mono uppercase text-theme-muted font-bold">
                Transfer Item to Warrior:
              </span>
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="bg-theme-surface border border-theme-border rounded px-3 py-1.5 text-xs text-theme-text font-mono focus:outline-none focus:border-theme-primary"
              >
                {warband.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.customName} ({u.profileSnapshot.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Items List */}
            {warband.armoryStash.length === 0 ? (
              <div className="p-8 text-center bg-theme-base rounded border border-dashed border-theme-border space-y-2">
                <Package className="w-8 h-8 text-theme-muted mx-auto opacity-50" />
                <p className="text-xs font-mono text-theme-muted">The Warband Stash is currently empty.</p>
                <button
                  onClick={() => setActiveTab('buy')}
                  className="px-3 py-1 bg-theme-elevated hover:bg-theme-border text-theme-primary font-mono text-xs font-bold uppercase rounded border border-theme-border"
                >
                  Purchase Gear from Depot
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {warband.armoryStash.map((item) => {
                  /* Whatever the price was written as: an item bought before
                     `price` existed carries one number and a label. */
                  const paid = stashPrice(item);
                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-theme-elevated border border-theme-border rounded-md flex items-center justify-between gap-3 text-xs font-mono"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <span className="font-bold px-2 py-0.5 rounded bg-theme-base text-theme-primary">
                          x{item.quantity}
                        </span>
                        <div>
                          <strong className="text-theme-text font-gothic text-sm">{item.name}</strong>
                          <span className="text-xs sm:text-[10px] text-theme-muted block">
                            Type: {item.type} | Value: {formatUnitCost(paid.ducats, paid.glory)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleAssign(item.id)}
                          className="px-3 py-1.5 bg-status-legal hover:bg-status-legal text-white rounded font-bold uppercase text-xs sm:text-[10px] flex items-center space-x-1"
                          title="Equip to selected warrior"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Equip</span>
                        </button>

                        <button
                          onClick={() => handleSell(item.id)}
                          className="px-3 py-1.5 bg-theme-surface hover:bg-theme-accent text-theme-text border border-theme-border rounded font-bold uppercase text-xs sm:text-[10px]"
                          title="Sell for half the Cost, rounding up"
                        >
                          Sell (+{formatUnitCost(
                            Math.ceil(paid.ducats / 2),
                            Math.ceil(paid.glory / 2),
                          )})
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* TAB 2: BUY GEAR TO STASH */}
        {activeTab === 'buy' && (
          <div className="space-y-4">
      
            {/* Category selector */}
            <div className="flex space-x-2">
              {(['weapons', 'armour', 'equipment'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setBuyCategory(cat)}
                  className={`px-3 py-1 rounded text-xs font-mono uppercase font-bold transition-all ${
                    buyCategory === cat
                      ? 'bg-theme-primary text-theme-base'
                      : 'bg-theme-base text-theme-muted hover:text-theme-text border border-theme-border'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Purchase Grid */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {buyCategory === 'weapons' && weapons.map((w) => (
                <BuyRow
                  key={w.id}
                  id={w.id}
                  name={w.name}
                  detail={`${w.range} | ${w.damage}`}
                  type="Weapon"
                  price={profileCost(w)}
                />
              ))}

              {buyCategory === 'armour' && armour.map((a) => (
                <BuyRow
                  key={a.id}
                  id={a.id}
                  name={a.name}
                  detail={a.armourModifier}
                  type="Armour"
                  price={profileCost(a)}
                />
              ))}

              {buyCategory === 'equipment' && equipment.map((e) => (
                <BuyRow
                  key={e.id}
                  id={e.id}
                  name={e.name}
                  detail={e.effect}
                  type="Equipment"
                  price={profileCost(e)}
                />
              ))}
            </div>

          </div>
        )}

      </div>
    </Sheet>
  );
};
