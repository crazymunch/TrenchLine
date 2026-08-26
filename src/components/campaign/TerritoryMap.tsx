'use client';

import React from 'react';
import { useStore } from '../../store/useStore';
import { TerritoryNode } from '../../types/campaign';
import { Flag, Shield, MapPin, CheckCircle, Crosshair, Award } from 'lucide-react';

export const TerritoryMap: React.FC = () => {
  const { campaign, claimTerritory, getActiveWarband } = useStore();
  const activeWb = getActiveWarband();

  return (
    <div className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#323846] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">SECTOR IV TRENCH MAP & STRATEGIC NODES</h3>
          </div>
          <p className="text-xs font-mono text-[#8E95A5]">
            Claim fortified strongholds, forward dugouts, and shrines to secure campaign bonuses
          </p>
        </div>
      </div>

      {/* Territory Grid / Tactical Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaign.territories.map((node) => {
          const isControlledByActive = activeWb && node.controlledByWarbandId === activeWb.id;
          const isContested = !node.controlledByWarbandId;

          return (
            <div
              key={node.id}
              className={`p-4 rounded-md border-2 transition-all space-y-3 ${
                isControlledByActive
                  ? 'bg-[#20242E] border-[#D4AF37] shadow-lg shadow-black/50'
                  : node.controlledByWarbandId
                  ? 'bg-[#161920] border-[#323846]'
                  : 'bg-[#0C0E12] border-dashed border-[#8E95A5]/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                    isContested
                      ? 'bg-[#20242E] text-[#8E95A5]'
                      : 'bg-[#8B0000] text-white'
                  }`}
                >
                  {node.type}
                </span>

                <div className="text-xs font-mono">
                  {node.controlledByPlayerName ? (
                    <span className="text-[#D4AF37] font-bold flex items-center space-x-1">
                      <Flag className="w-3 h-3" />
                      <span>Held by {node.controlledByPlayerName}</span>
                    </span>
                  ) : (
                    <span className="text-[#8E95A5] italic">Unclaimed / Contested</span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-gothic font-bold text-base text-[#ECEFF4]">{node.name}</h4>
                <p className="text-xs text-[#8E95A5] mt-0.5">{node.description}</p>
              </div>

              {/* Perk Box */}
              <div className="p-2 bg-[#0C0E12] rounded border border-[#323846] text-xs font-mono">
                <span className="text-[10px] text-[#D4AF37] uppercase font-bold block mb-0.5">
                  Sector Bonus / Perk:
                </span>
                <span className="text-[#ECEFF4]">{node.perk}</span>
              </div>

              {/* Claim Button */}
              {activeWb && !isControlledByActive && (
                <button
                  onClick={() => claimTerritory(node.id, activeWb.id, activeWb.name)}
                  className="w-full py-1.5 bg-[#20242E] hover:bg-[#D4AF37] hover:text-black text-[#D4AF37] font-mono text-xs font-bold uppercase rounded border border-[#D4AF37]/50 transition-colors"
                >
                  Claim Control for {activeWb.name}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
