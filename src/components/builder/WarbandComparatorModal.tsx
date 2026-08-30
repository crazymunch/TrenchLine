'use client';

import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
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
    const toughCount = wb.units.filter((u) => u.profileSnapshot.stats.keywords?.some(k => k.toLowerCase().includes('tough'))).length;
    
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
    <Sheet
      open
      onClose={onClose}
      size="xl"
      title="WARBAND TACTICAL MATCHUP COMPARATOR"
      subtitle="Side-by-side roster balance, firepower, and faction doctrine comparison"
    >
      {/* Body */}
      <div className="p-6 overflow-y-auto space-y-6 flex-1">
  
        {/* Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    
          {/* Warband 1 Selector */}
          <div className="p-4 bg-theme-elevated rounded border border-theme-border space-y-2">
            <label className="block text-xs font-mono uppercase text-theme-primary font-bold">
              Warband A (Home Force):
            </label>
            <select
              value={wb1Id}
              onChange={(e) => setWb1Id(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs font-gothic text-theme-text focus:outline-none"
            >
              {warbands.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({factions.find(f => f.id === w.factionId)?.name || w.factionId})</option>
              ))}
            </select>
          </div>

          {/* Warband 2 Selector */}
          <div className="p-4 bg-theme-elevated rounded border border-theme-border space-y-2">
            <label className="block text-xs font-mono uppercase text-status-error font-bold">
              Warband B (Opposing Force):
            </label>
            <select
              value={wb2Id}
              onChange={(e) => setWb2Id(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs font-gothic text-theme-text focus:outline-none"
            >
              {warbands.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({factions.find(f => f.id === w.factionId)?.name || w.factionId})</option>
              ))}
            </select>
          </div>

        </div>

        {/* Metric Comparison Table */}
        <div className="bg-theme-base border border-theme-border rounded-md overflow-hidden">
          <table className="w-full text-center text-xs font-mono">
            <thead className="bg-theme-surface text-theme-muted uppercase text-xs sm:text-[10px] border-b border-theme-border">
              <tr>
                <th className="p-3 text-left w-1/3 font-gothic text-sm text-theme-primary">{wb1?.name}</th>
                <th className="p-3 w-1/3">Tactical Metric</th>
                <th className="p-3 text-right w-1/3 font-gothic text-sm text-status-error">{wb2?.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/60">
        
              {/* Total Cost */}
              <tr className="hover:bg-theme-surface/40">
                <td className="p-3 text-left font-bold text-sm text-theme-text">{s1.totalCost} / {wb1?.ducatLimit} D</td>
                <td className="p-3 text-theme-muted flex items-center justify-center space-x-1">
                  <span>Points (Ducats)</span>
                </td>
                <td className="p-3 text-right font-bold text-sm text-theme-text">{s2.totalCost} / {wb2?.ducatLimit} D</td>
              </tr>

              {/* Warriors */}
              <tr className="hover:bg-theme-surface/40">
                <td className="p-3 text-left font-bold text-theme-text">{s1.warriorCount} Warriors</td>
                <td className="p-3 text-theme-muted">Warband Size</td>
                <td className="p-3 text-right font-bold text-theme-text">{s2.warriorCount} Warriors</td>
              </tr>

              {/* Tough & Multi-Wound */}
              <tr className="hover:bg-theme-surface/40">
                <td className="p-3 text-left font-bold text-status-legal">{s1.toughCount} Elite/Tough</td>
                <td className="p-3 text-theme-muted flex items-center justify-center space-x-1">
                  <Heart className="w-3 h-3 text-status-error" />
                  <span>Multi-Wound Models</span>
                </td>
                <td className="p-3 text-right font-bold text-status-legal">{s2.toughCount} Elite/Tough</td>
              </tr>

              {/* Ranged Armaments */}
              <tr className="hover:bg-theme-surface/40">
                <td className="p-3 text-left font-bold text-theme-text">{s1.rangedWeapons} Guns/Rifles</td>
                <td className="p-3 text-theme-muted flex items-center justify-center space-x-1">
                  <Crosshair className="w-3 h-3 text-theme-primary" />
                  <span>Ranged Firepower</span>
                </td>
                <td className="p-3 text-right font-bold text-theme-text">{s2.rangedWeapons} Guns/Rifles</td>
              </tr>

              {/* Melee Armaments */}
              <tr className="hover:bg-theme-surface/40">
                <td className="p-3 text-left font-bold text-theme-text">{s1.meleeWeapons} Blades/Maces</td>
                <td className="p-3 text-theme-muted flex items-center justify-center space-x-1">
                  <Swords className="w-3 h-3 text-status-error" />
                  <span>Close Combat Gear</span>
                </td>
                <td className="p-3 text-right font-bold text-theme-text">{s2.meleeWeapons} Blades/Maces</td>
              </tr>

              {/* Fire / Flame Weapons */}
              <tr className="hover:bg-theme-surface/40">
                <td className="p-3 text-left font-bold text-[#FF9800]">{s1.fireWeapons} Fire Weapons</td>
                <td className="p-3 text-theme-muted flex items-center justify-center space-x-1">
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
          <div className="p-4 bg-theme-elevated rounded border border-theme-border space-y-2">
            <span className="text-xs sm:text-[10px] font-mono uppercase text-theme-primary font-bold block">
              {faction1?.name} Special Rules:
            </span>
            <div className="space-y-1.5">
              {(faction1?.specialRules || faction1?.rules || []).map((r, i) => (
                <div key={i} className="text-xs bg-theme-surface p-2 rounded border border-theme-border">
                  <strong className="text-theme-primary block">{r.name}</strong>
                  <span className="text-theme-muted text-xs sm:text-[11px]">{r.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-theme-elevated rounded border border-theme-border space-y-2">
            <span className="text-xs sm:text-[10px] font-mono uppercase text-status-error font-bold block">
              {faction2?.name} Special Rules:
            </span>
            <div className="space-y-1.5">
              {(faction2?.specialRules || faction2?.rules || []).map((r, i) => (
                <div key={i} className="text-xs bg-theme-surface p-2 rounded border border-theme-border">
                  <strong className="text-status-error block">{r.name}</strong>
                  <span className="text-theme-muted text-xs sm:text-[11px]">{r.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </Sheet>
  );
};
