'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Warband } from '../../types/warband';
import { 
  X, 
  Scale, 
  Swords, 
  Crosshair, 
  Shield, 
  Heart, 
  Flame, 
  Sparkles,
  Zap
} from 'lucide-react';

interface WarbandComparatorModalProps {
  onClose: () => void;
}

export const WarbandComparatorModal: React.FC<WarbandComparatorModalProps> = ({ onClose }) => {
  const { warbands, activeWarbandId, factions } = useStore();

  const [wb1Id, setWb1Id] = useState<string>(activeWarbandId || warbands[0]?.id || '');
  const [wb2Id, setWb2Id] = useState<string>(
    warbands.find((w) => w.id !== wb1Id)?.id || warbands[0]?.id || ''
  );

  const wb1 = warbands.find((w) => w.id === wb1Id) || warbands[0];
  const wb2 = warbands.find((w) => w.id === wb2Id) || warbands[1] || warbands[0];

  const faction1 = factions.find((f) => f.id === wb1?.factionId);
  const faction2 = factions.find((f) => f.id === wb2?.factionId);

  const calculateStats = (wb: Warband | undefined) => {
    if (!wb) return { totalCost: 0, warriorCount: 0, toughCount: 0, rangedWeapons: 0, meleeWeapons: 0, fireWeapons: 0 };

    const totalCost = wb.units.reduce((s, u) => s + u.totalCost, 0);
    const warriorCount = wb.units.length;
    const toughCount = wb.units.filter((u) => u.profileSnapshot.stats.keywords.some(k => k.toLowerCase().includes('tough'))).length;
    
    let rangedWeapons = 0;
    let meleeWeapons = 0;
    let fireWeapons = 0;

    wb.units.forEach((u) => {
      u.equippedWeapons.forEach((w) => {
        if (w.type === 'Ranged') rangedWeapons++;
        if (w.type === 'Melee') meleeWeapons++;
        if (w.keywords.some(k => k.toLowerCase().includes('fire'))) fireWeapons++;
      });
    });

    return { totalCost, warriorCount, toughCount, rangedWeapons, meleeWeapons, fireWeapons };
  };

  const s1 = calculateStats(wb1);
  const s2 = calculateStats(wb2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-4xl max-h-[90vh] rounded-md flex flex-col shadow-2xl overflow-hidden bevel-container">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12]">
          <div className="flex items-center space-x-3">
            <Scale className="w-6 h-6 text-[#D4AF37]" />
            <div>
              <h2 className="font-gothic font-bold text-lg text-[#ECEFF4]">
                WARBAND TACTICAL MATCHUP COMPARATOR
              </h2>
              <p className="text-xs font-mono text-[#8E95A5]">
                Side-by-side roster balance, firepower, and faction doctrine comparison
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[#8E95A5] hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Warband 1 Selector */}
            <div className="p-4 bg-[#20242E] rounded border border-[#323846] space-y-2">
              <label className="block text-xs font-mono uppercase text-[#D4AF37] font-bold">
                Warband A (Home Force):
              </label>
              <select
                value={wb1Id}
                onChange={(e) => setWb1Id(e.target.value)}
                className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-xs font-gothic text-[#ECEFF4] focus:outline-none"
              >
                {warbands.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({factions.find(f => f.id === w.factionId)?.name || w.factionId})</option>
                ))}
              </select>
            </div>

            {/* Warband 2 Selector */}
            <div className="p-4 bg-[#20242E] rounded border border-[#323846] space-y-2">
              <label className="block text-xs font-mono uppercase text-[#E53935] font-bold">
                Warband B (Opposing Force):
              </label>
              <select
                value={wb2Id}
                onChange={(e) => setWb2Id(e.target.value)}
                className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-xs font-gothic text-[#ECEFF4] focus:outline-none"
              >
                {warbands.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({factions.find(f => f.id === w.factionId)?.name || w.factionId})</option>
                ))}
              </select>
            </div>

          </div>

          {/* Metric Comparison Table */}
          <div className="bg-[#0C0E12] border border-[#323846] rounded-md overflow-hidden">
            <table className="w-full text-center text-xs font-mono">
              <thead className="bg-[#161920] text-[#8E95A5] uppercase text-[10px] border-b border-[#323846]">
                <tr>
                  <th className="p-3 text-left w-1/3 font-gothic text-sm text-[#D4AF37]">{wb1?.name}</th>
                  <th className="p-3 w-1/3">Tactical Metric</th>
                  <th className="p-3 text-right w-1/3 font-gothic text-sm text-[#E53935]">{wb2?.name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#323846]/60">
                
                {/* Total Cost */}
                <tr className="hover:bg-[#161920]/40">
                  <td className="p-3 text-left font-bold text-sm text-[#ECEFF4]">{s1.totalCost} / {wb1?.ducatLimit} D</td>
                  <td className="p-3 text-[#8E95A5] flex items-center justify-center space-x-1">
                    <span>Points (Ducats)</span>
                  </td>
                  <td className="p-3 text-right font-bold text-sm text-[#ECEFF4]">{s2.totalCost} / {wb2?.ducatLimit} D</td>
                </tr>

                {/* Warriors */}
                <tr className="hover:bg-[#161920]/40">
                  <td className="p-3 text-left font-bold text-[#ECEFF4]">{s1.warriorCount} Warriors</td>
                  <td className="p-3 text-[#8E95A5]">Warband Size</td>
                  <td className="p-3 text-right font-bold text-[#ECEFF4]">{s2.warriorCount} Warriors</td>
                </tr>

                {/* Tough & Multi-Wound */}
                <tr className="hover:bg-[#161920]/40">
                  <td className="p-3 text-left font-bold text-[#4E9A6E]">{s1.toughCount} Elite/Tough</td>
                  <td className="p-3 text-[#8E95A5] flex items-center justify-center space-x-1">
                    <Heart className="w-3 h-3 text-[#E53935]" />
                    <span>Multi-Wound Models</span>
                  </td>
                  <td className="p-3 text-right font-bold text-[#4E9A6E]">{s2.toughCount} Elite/Tough</td>
                </tr>

                {/* Ranged Armaments */}
                <tr className="hover:bg-[#161920]/40">
                  <td className="p-3 text-left font-bold text-[#ECEFF4]">{s1.rangedWeapons} Guns/Rifles</td>
                  <td className="p-3 text-[#8E95A5] flex items-center justify-center space-x-1">
                    <Crosshair className="w-3 h-3 text-[#D4AF37]" />
                    <span>Ranged Firepower</span>
                  </td>
                  <td className="p-3 text-right font-bold text-[#ECEFF4]">{s2.rangedWeapons} Guns/Rifles</td>
                </tr>

                {/* Melee Armaments */}
                <tr className="hover:bg-[#161920]/40">
                  <td className="p-3 text-left font-bold text-[#ECEFF4]">{s1.meleeWeapons} Blades/Maces</td>
                  <td className="p-3 text-[#8E95A5] flex items-center justify-center space-x-1">
                    <Swords className="w-3 h-3 text-[#E53935]" />
                    <span>Close Combat Gear</span>
                  </td>
                  <td className="p-3 text-right font-bold text-[#ECEFF4]">{s2.meleeWeapons} Blades/Maces</td>
                </tr>

                {/* Fire / Flame Weapons */}
                <tr className="hover:bg-[#161920]/40">
                  <td className="p-3 text-left font-bold text-[#FF9800]">{s1.fireWeapons} Fire Weapons</td>
                  <td className="p-3 text-[#8E95A5] flex items-center justify-center space-x-1">
                    <Flame className="w-3 h-3 text-[#FF9800]" />
                    <span>Incendiary Munitions</span>
                  </td>
                  <td className="p-3 text-right font-bold text-[#FF9800]">{s2.fireWeapons} Fire Weapons</td>
                </tr>

              </tbody>
            </table>
          </div>

          {/* Faction Doctrines Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#20242E] rounded border border-[#323846] space-y-2">
              <span className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold block">
                {faction1?.name} Special Rules:
              </span>
              <div className="space-y-1.5">
                {(faction1?.specialRules || faction1?.rules || []).map((r, i) => (
                  <div key={i} className="text-xs bg-[#161920] p-2 rounded border border-[#323846]">
                    <strong className="text-[#D4AF37] block">{r.name}</strong>
                    <span className="text-[#8E95A5] text-[11px]">{r.description}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#20242E] rounded border border-[#323846] space-y-2">
              <span className="text-[10px] font-mono uppercase text-[#E53935] font-bold block">
                {faction2?.name} Special Rules:
              </span>
              <div className="space-y-1.5">
                {(faction2?.specialRules || faction2?.rules || []).map((r, i) => (
                  <div key={i} className="text-xs bg-[#161920] p-2 rounded border border-[#323846]">
                    <strong className="text-[#E53935] block">{r.name}</strong>
                    <span className="text-[#8E95A5] text-[11px]">{r.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#323846] bg-[#0C0E12] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] font-mono text-xs font-bold uppercase rounded"
          >
            Close Comparator
          </button>
        </div>

      </div>
    </div>
  );
};
