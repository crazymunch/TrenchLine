'use client';

import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { useStore } from '../../store/useStore';
import { Warband } from '../../types/warband';
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

  const handleBuy = (item: { id: string; name: string; type: 'Weapon' | 'Armour' | 'Equipment'; cost: number }) => {
    buyToStash(warband.id, item);
    soundEffects.playBladeClang();
  };

  /*
    One row, so the affordability rule is written once rather than three
    times. The store refuses a purchase over the balance; this is what stops
    the player reaching a refusal at all, and says why the button is dead
    instead of leaving them to guess.
  */
  const BuyRow: React.FC<{
    /* Optional, because not every catalogue row carries one — an Armour
       entry with no modifier is a real entry, not a missing field. */
    id: string; name: string; detail?: string;
    type: 'Weapon' | 'Armour' | 'Equipment'; cost: number;
  }> = ({ id, name, detail, type, cost }) => {
    const affordable = cost <= (warband.treasuryDucats ?? 0);
    return (
      <div className="p-2.5 bg-theme-elevated rounded border border-theme-border flex items-center justify-between text-xs font-mono">
        <div>
          <strong className="text-theme-text">{name}</strong>
          {detail && (
            <span className="text-xs sm:text-[10px] text-theme-muted block">{detail}</span>
          )}
        </div>
        <button
          onClick={() => handleBuy({ id, name, type, cost })}
          disabled={!affordable}
          title={affordable
            ? undefined
            : `The Strongbox holds ${warband.treasuryDucats ?? 0} Ducats, and this costs ${cost}.`}
          className={`px-3 py-1 rounded font-bold transition-colors border ${
            affordable
              ? 'bg-theme-base hover:bg-theme-primary hover:text-theme-base text-theme-primary border-theme-primary/50'
              : 'bg-theme-base/50 text-theme-muted border-theme-border cursor-not-allowed'
          }`}
        >
          {affordable ? `Buy (${cost} D)` : `${cost} D — short ${cost - (warband.treasuryDucats ?? 0)}`}
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
      subtitle={`${warband.name} | Treasury: <strong className="text-theme-primary">${warband.treasuryDucats} Ducats</strong>`}
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
                {warband.armoryStash.map((item) => (
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
                        <span className="text-xs sm:text-[10px] text-theme-muted block">Type: {item.type} | Value: {item.cost} D</span>
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
                        title="Sell for 50% Ducats"
                      >
                        Sell (+{Math.ceil(item.cost / 2)} D)
                      </button>
                    </div>
                  </div>
                ))}
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
                  cost={w.cost}
                />
              ))}

              {buyCategory === 'armour' && armour.map((a) => (
                <BuyRow
                  key={a.id}
                  id={a.id}
                  name={a.name}
                  detail={a.armourModifier}
                  type="Armour"
                  cost={a.cost}
                />
              ))}

              {buyCategory === 'equipment' && equipment.map((e) => (
                <BuyRow
                  key={e.id}
                  id={e.id}
                  name={e.name}
                  detail={e.effect}
                  type="Equipment"
                  cost={e.cost}
                />
              ))}
            </div>

          </div>
        )}

      </div>
    </Sheet>
  );
};
