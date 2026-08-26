'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { X, Shield, Swords, Package, Plus, Coins, Tag } from 'lucide-react';

interface AddEquipmentModalProps {
  warbandId: string;
  unitId: string;
  unitName: string;
  onClose: () => void;
}

export const AddEquipmentModal: React.FC<AddEquipmentModalProps> = ({
  warbandId,
  unitId,
  unitName,
  onClose
}) => {
  const { weapons, armour, equipment, equipWeapon, equipArmour, equipEquipment } = useStore();
  const [tab, setTab] = useState<'weapons' | 'armour' | 'equipment'>('weapons');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161920] border-2 border-[#323846] w-full max-w-2xl max-h-[85vh] rounded-md flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12]">
          <div>
            <h2 className="font-gothic font-bold text-lg text-[#ECEFF4] tracking-wide">
              EQUIP WARRIOR: <span className="text-[#D4AF37]">{unitName}</span>
            </h2>
            <p className="text-xs font-mono text-[#8E95A5]">Select armaments, protection, or gear to equip</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8E95A5] hover:text-[#ECEFF4] rounded hover:bg-[#20242E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-3 border-b border-[#323846] bg-[#161920]">
          <button
            onClick={() => setTab('weapons')}
            className={`py-2.5 flex items-center justify-center space-x-2 font-mono text-xs font-bold uppercase transition-colors ${
              tab === 'weapons' ? 'bg-[#20242E] text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-[#8E95A5] hover:text-white'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Weapons</span>
          </button>
          <button
            onClick={() => setTab('armour')}
            className={`py-2.5 flex items-center justify-center space-x-2 font-mono text-xs font-bold uppercase transition-colors ${
              tab === 'armour' ? 'bg-[#20242E] text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-[#8E95A5] hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Armour</span>
          </button>
          <button
            onClick={() => setTab('equipment')}
            className={`py-2.5 flex items-center justify-center space-x-2 font-mono text-xs font-bold uppercase transition-colors ${
              tab === 'equipment' ? 'bg-[#20242E] text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-[#8E95A5] hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Gear & Relics</span>
          </button>
        </div>

        {/* Content List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {tab === 'weapons' && (
            <>
              {weapons.map((wep) => (
                <div
                  key={wep.id}
                  className="p-3 bg-[#20242E] border border-[#323846] rounded hover:border-[#D4AF37]/50 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-gothic font-bold text-sm text-[#ECEFF4]">{wep.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161920] text-[#8E95A5] border border-[#323846]">
                        {wep.type} ({wep.range})
                      </span>
                      {wep.hands === 2 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#8B0000]/20 text-[#E53935] border border-[#8B0000]/40">
                          2-Handed
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-[#8E95A5] flex items-center space-x-3">
                      <span>Mod: <strong className="text-[#ECEFF4]">{wep.modifiers}</strong></span>
                      <span>Dmg: <strong className="text-[#ECEFF4]">{wep.damage}</strong></span>
                    </div>
                    {wep.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {wep.keywords.map((kw) => (
                          <span key={kw} className="text-[9px] font-mono bg-[#161920] px-1.5 py-0.2 rounded text-[#D4AF37]">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-xs font-mono font-bold text-[#D4AF37] whitespace-nowrap">
                      {wep.cost} D
                    </div>
                    <button
                      onClick={() => {
                        equipWeapon(warbandId, unitId, wep.id);
                        onClose();
                      }}
                      className="p-2 bg-[#8B0000] hover:bg-[#A30000] text-white rounded transition-colors"
                      title="Equip Weapon"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'armour' && (
            <>
              {armour.map((arm) => (
                <div
                  key={arm.id}
                  className="p-3 bg-[#20242E] border border-[#323846] rounded hover:border-[#D4AF37]/50 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <h3 className="font-gothic font-bold text-sm text-[#ECEFF4]">{arm.name}</h3>
                    <p className="text-xs font-mono text-[#D4AF37]">
                      Protection: <strong>{arm.armourModifier}</strong>
                    </p>
                    {arm.description && <p className="text-xs text-[#8E95A5]">{arm.description}</p>}
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-xs font-mono font-bold text-[#D4AF37] whitespace-nowrap">
                      {arm.cost} D
                    </div>
                    <button
                      onClick={() => {
                        equipArmour(warbandId, unitId, arm.id);
                        onClose();
                      }}
                      className="p-2 bg-[#8B0000] hover:bg-[#A30000] text-white rounded transition-colors"
                      title="Equip Armour"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'equipment' && (
            <>
              {equipment.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-[#20242E] border border-[#323846] rounded hover:border-[#D4AF37]/50 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <h3 className="font-gothic font-bold text-sm text-[#ECEFF4]">{item.name}</h3>
                    <p className="text-xs text-[#8E95A5]">{item.effect}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-xs font-mono font-bold text-[#D4AF37] whitespace-nowrap">
                      {item.cost} D
                    </div>
                    <button
                      onClick={() => {
                        equipEquipment(warbandId, unitId, item.id);
                        onClose();
                      }}
                      className="p-2 bg-[#8B0000] hover:bg-[#A30000] text-white rounded transition-colors"
                      title="Equip Item"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

      </div>
    </div>
  );
};
