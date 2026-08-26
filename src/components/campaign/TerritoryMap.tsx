'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { TerritoryNode } from '../../types/campaign';
import { soundEffects } from '../../services/soundEffects';
import { 
  Flag, 
  Shield, 
  MapPin, 
  CheckCircle, 
  Crosshair, 
  Award,
  X,
  Swords,
  Sparkles,
  Info
} from 'lucide-react';

export const TerritoryMap: React.FC = () => {
  const { campaign, claimTerritory, getActiveWarband, setCurrentView, setIsPostBattleOpen } = useStore();
  const activeWb = getActiveWarband();
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryNode | null>(null);

  const handleClaim = (node: TerritoryNode) => {
    if (!activeWb) return;
    claimTerritory(node.id, activeWb.id, activeWb.name);
    soundEffects.playCathedralBell();
    setSelectedTerritory({
      ...node,
      controlledByWarbandId: activeWb.id,
      controlledByPlayerName: activeWb.name
    });
  };

  const handleChallenge = (node: TerritoryNode) => {
    soundEffects.playTrenchWhistle();
    setSelectedTerritory(null);
    setCurrentView('play');
  };

  return (
    <div className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 space-y-6 shadow-xl bevel-container">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#323846] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Flag className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">
              SECTOR IV TACTICAL BATTLEFIELD MAP
            </h3>
          </div>
          <p className="text-xs font-mono text-[#8E95A5]">
            Contested trench lines, shrines, and munitions bunkers. Click any sector node for tactical intel or to challenge control.
          </p>
        </div>

        {activeWb && (
          <div className="text-xs font-mono text-[#8E95A5] bg-[#0C0E12] px-3 py-1.5 rounded border border-[#323846]">
            Active Warband: <strong className="text-[#D4AF37]">{activeWb.name}</strong>
          </div>
        )}
      </div>

      {/* Interactive Tactical Map Grid Canvas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaign.territories.map((node) => {
          const isControlledByMe = activeWb && node.controlledByWarbandId === activeWb.id;
          const isContested = !node.controlledByWarbandId;

          return (
            <div
              key={node.id}
              onClick={() => setSelectedTerritory(node)}
              className={`p-4 rounded-md border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between bevel-container ${
                isControlledByMe
                  ? 'bg-[#161920] border-[#4E9A6E] ring-1 ring-[#4E9A6E]/40'
                  : isContested
                  ? 'bg-[#0C0E12] border-[#323846] hover:border-[#D4AF37]/60'
                  : 'bg-[#161920] border-[#8B0000]/80'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#20242E] text-[#8E95A5]">
                    {node.type}
                  </span>

                  {isControlledByMe ? (
                    <span className="text-[10px] font-mono font-bold text-[#4E9A6E] flex items-center space-x-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>CONTROLLED</span>
                    </span>
                  ) : isContested ? (
                    <span className="text-[10px] font-mono font-bold text-[#D4AF37] flex items-center space-x-1">
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>CONTESTED</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-[#E53935] flex items-center space-x-1">
                      <Shield className="w-3.5 h-3.5" />
                      <span>OCCUPIED</span>
                    </span>
                  )}
                </div>

                <h4 className="font-gothic font-bold text-base text-[#ECEFF4] flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-[#D4AF37]" />
                  <span>{node.name}</span>
                </h4>

                <p className="text-xs text-[#8E95A5] font-sans leading-relaxed">
                  {node.description}
                </p>
              </div>

              {/* Territory Perk & Controller */}
              <div className="mt-4 pt-3 border-t border-[#323846]/60 space-y-1 text-xs font-mono">
                <div className="text-[#D4AF37] flex items-center space-x-1 font-semibold">
                  <Award className="w-3.5 h-3.5" />
                  <span>Perk: {node.perk}</span>
                </div>
                <div className="text-[11px] text-[#8E95A5]">
                  Controller: <strong className="text-[#ECEFF4]">{node.controlledByPlayerName || 'None (Unclaimed)'}</strong>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Sector Tactical Intel Modal */}
      {selectedTerritory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-lg rounded-md shadow-2xl overflow-hidden bevel-container">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12]">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">SECTOR TACTICAL INTEL</h3>
              </div>
              <button
                onClick={() => setSelectedTerritory(null)}
                className="text-[#8E95A5] hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">{selectedTerritory.type}</span>
                <h2 className="font-gothic font-bold text-xl text-[#ECEFF4]">{selectedTerritory.name}</h2>
                <p className="text-xs text-[#8E95A5] mt-1 leading-relaxed">{selectedTerritory.description}</p>
              </div>

              <div className="p-3.5 bg-[#0C0E12] rounded border border-[#323846] space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#8E95A5]">Territory Bonus:</span>
                  <span className="text-[#D4AF37] font-bold">{selectedTerritory.perk}</span>
                </div>
                <div className="flex justify-between border-t border-[#323846] pt-1">
                  <span className="text-[#8E95A5]">Current Control:</span>
                  <span className="text-[#ECEFF4] font-bold">{selectedTerritory.controlledByPlayerName || 'Neutral'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleClaim(selectedTerritory)}
                  className="py-2.5 px-4 bg-[#4E9A6E] hover:bg-[#5BAE7E] text-white font-mono text-xs font-bold uppercase rounded shadow flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Claim Control</span>
                </button>

                <button
                  onClick={() => handleChallenge(selectedTerritory)}
                  className="py-2.5 px-4 bg-[#8B0000] hover:bg-[#A30000] text-white font-mono text-xs font-bold uppercase rounded shadow flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Swords className="w-4 h-4" />
                  <span>Deploy to Combat</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
