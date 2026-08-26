'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Warband } from '../../types/warband';
import { soundEffects } from '../../services/soundEffects';
import { 
  X, 
  Archive, 
  Plus, 
  Trash2, 
  Coins, 
  Swords, 
  Shield, 
  Package, 
  UserCheck,
  Sparkles,
  ArrowRight
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

  const handleSell = (itemId: string) => {
    sellFromStash(warband.id, itemId);
  };

  const handleAssign = (itemId: string) => {
    if (!selectedUnitId) return;
    assignStashToUnit(warband.id, itemId, selectedUnitId);
    soundEffects.playBladeClang();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-3xl max-h-[90vh] rounded-md flex flex-col shadow-2xl overflow-hidden bevel-container">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12]">
          <div className="flex items-center space-x-3">
            <Archive className="w-6 h-6 text-[#D4AF37]" />
            <div>
              <h2 className="font-gothic font-bold text-lg text-[#ECEFF4]">
                WARBAND ARMORY STASH & MUNITIONS DEPOT
              </h2>
              <p className="text-xs font-mono text-[#8E95A5]">
                {warband.name} | Treasury: <strong className="text-[#D4AF37]">{warband.treasuryDucats} Ducats</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[#8E95A5] hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-2 px-6 py-3 border-b border-[#323846] bg-[#161920]">
          <button
            onClick={() => setActiveTab('stash')}
            className={`px-4 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all ${
              activeTab === 'stash'
                ? 'bg-[#D4AF37] text-black shadow'
                : 'bg-[#20242E] text-[#8E95A5] hover:text-[#ECEFF4]'
            }`}
          >
            Stash Inventory ({warband.armoryStash.reduce((s, i) => s + i.quantity, 0)})
          </button>

          <button
            onClick={() => setActiveTab('buy')}
            className={`px-4 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all ${
              activeTab === 'buy'
                ? 'bg-[#D4AF37] text-black shadow'
                : 'bg-[#20242E] text-[#8E95A5] hover:text-[#ECEFF4]'
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
              <div className="p-3.5 bg-[#0C0E12] rounded border border-[#323846] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-mono uppercase text-[#8E95A5] font-bold">
                  Transfer Item to Warrior:
                </span>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="bg-[#161920] border border-[#323846] rounded px-3 py-1.5 text-xs text-[#ECEFF4] font-mono focus:outline-none focus:border-[#D4AF37]"
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
                <div className="p-8 text-center bg-[#0C0E12] rounded border border-dashed border-[#323846] space-y-2">
                  <Package className="w-8 h-8 text-[#8E95A5] mx-auto opacity-50" />
                  <p className="text-xs font-mono text-[#8E95A5]">The Warband Stash is currently empty.</p>
                  <button
                    onClick={() => setActiveTab('buy')}
                    className="px-3 py-1 bg-[#20242E] hover:bg-[#323846] text-[#D4AF37] font-mono text-xs font-bold uppercase rounded border border-[#323846]"
                  >
                    Purchase Gear from Depot
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {warband.armoryStash.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-[#20242E] border border-[#323846] rounded-md flex items-center justify-between gap-3 text-xs font-mono"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <span className="font-bold px-2 py-0.5 rounded bg-[#0C0E12] text-[#D4AF37]">
                          x{item.quantity}
                        </span>
                        <div>
                          <strong className="text-[#ECEFF4] font-gothic text-sm">{item.name}</strong>
                          <span className="text-[10px] text-[#8E95A5] block">Type: {item.type} | Value: {item.cost} D</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleAssign(item.id)}
                          className="px-3 py-1.5 bg-[#4E9A6E] hover:bg-[#5BAE7E] text-white rounded font-bold uppercase text-[10px] flex items-center space-x-1"
                          title="Equip to selected warrior"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Equip</span>
                        </button>

                        <button
                          onClick={() => handleSell(item.id)}
                          className="px-3 py-1.5 bg-[#161920] hover:bg-[#8B0000] text-[#ECEFF4] border border-[#323846] rounded font-bold uppercase text-[10px]"
                          title="Sell for 50% Ducats"
                        >
                          Sell (+{Math.floor(item.cost / 2)} D)
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
                        ? 'bg-[#D4AF37] text-black'
                        : 'bg-[#0C0E12] text-[#8E95A5] hover:text-white border border-[#323846]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Purchase Grid */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {buyCategory === 'weapons' && weapons.map((w) => (
                  <div key={w.id} className="p-2.5 bg-[#20242E] rounded border border-[#323846] flex items-center justify-between text-xs font-mono">
                    <div>
                      <strong className="text-[#ECEFF4]">{w.name}</strong>
                      <span className="text-[10px] text-[#8E95A5] block">{w.range} | {w.damage}</span>
                    </div>
                    <button
                      onClick={() => handleBuy({ id: w.id, name: w.name, type: 'Weapon', cost: w.cost })}
                      className="px-3 py-1 bg-[#0C0E12] hover:bg-[#D4AF37] hover:text-black text-[#D4AF37] border border-[#D4AF37]/50 rounded font-bold transition-colors"
                    >
                      Buy ({w.cost} D)
                    </button>
                  </div>
                ))}

                {buyCategory === 'armour' && armour.map((a) => (
                  <div key={a.id} className="p-2.5 bg-[#20242E] rounded border border-[#323846] flex items-center justify-between text-xs font-mono">
                    <div>
                      <strong className="text-[#ECEFF4]">{a.name}</strong>
                      <span className="text-[10px] text-[#8E95A5] block">{a.armourModifier}</span>
                    </div>
                    <button
                      onClick={() => handleBuy({ id: a.id, name: a.name, type: 'Armour', cost: a.cost })}
                      className="px-3 py-1 bg-[#0C0E12] hover:bg-[#D4AF37] hover:text-black text-[#D4AF37] border border-[#D4AF37]/50 rounded font-bold transition-colors"
                    >
                      Buy ({a.cost} D)
                    </button>
                  </div>
                ))}

                {buyCategory === 'equipment' && equipment.map((e) => (
                  <div key={e.id} className="p-2.5 bg-[#20242E] rounded border border-[#323846] flex items-center justify-between text-xs font-mono">
                    <div>
                      <strong className="text-[#ECEFF4]">{e.name}</strong>
                      <span className="text-[10px] text-[#8E95A5] block">{e.effect}</span>
                    </div>
                    <button
                      onClick={() => handleBuy({ id: e.id, name: e.name, type: 'Equipment', cost: e.cost })}
                      className="px-3 py-1 bg-[#0C0E12] hover:bg-[#D4AF37] hover:text-black text-[#D4AF37] border border-[#D4AF37]/50 rounded font-bold transition-colors"
                    >
                      Buy ({e.cost} D)
                    </button>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#323846] bg-[#0C0E12] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] font-mono text-xs font-bold uppercase rounded"
          >
            Close Stash
          </button>
        </div>

      </div>
    </div>
  );
};
