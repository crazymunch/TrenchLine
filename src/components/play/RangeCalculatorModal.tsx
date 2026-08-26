'use client';

import React, { useState } from 'react';
import { ActiveUnit } from '../../types/warband';
import { 
  X, 
  Ruler, 
  Footprints, 
  Zap, 
  Crosshair, 
  ShieldAlert, 
  Compass, 
  Info,
  Flame,
  ArrowRight
} from 'lucide-react';

interface RangeCalculatorModalProps {
  unit: ActiveUnit;
  onClose: () => void;
}

export const RangeCalculatorModal: React.FC<RangeCalculatorModalProps> = ({ unit, onClose }) => {
  const baseMovInches = parseInt(unit.profileSnapshot.stats.movement.replace(/[^0-9]/g, '')) || 6;
  const [distanceToTarget, setDistanceToTarget] = useState<number>(12);
  const [isCharging, setIsCharging] = useState(false);
  const [hasBarbedWire, setHasBarbedWire] = useState(false);

  // Movement calculations
  const standardMove = baseMovInches;
  const dashMove = baseMovInches * 2;
  const crawlMove = 2; // For Downed models
  const chargeDistanceMax = baseMovInches + 6; // Standard movement + D6 charge bonus

  const isWithinCharge = distanceToTarget <= (isCharging ? chargeDistanceMax : standardMove);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-lg rounded-md shadow-2xl overflow-hidden bevel-container">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12]">
          <div className="flex items-center space-x-2">
            <Ruler className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">TACTICAL RULER & CHARGE CALCULATOR</h3>
              <p className="text-xs font-mono text-[#8E95A5]">Warrior: {unit.customName} (Base MOV: {unit.profileSnapshot.stats.movement})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[#8E95A5] hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          
          {/* Movement Distance Gauges */}
          <div className="grid grid-cols-3 gap-3 font-mono text-center text-xs">
            
            <div className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
              <span className="text-[10px] text-[#8E95A5] uppercase block flex items-center justify-center space-x-1">
                <Footprints className="w-3 h-3 text-[#4E9A6E]" />
                <span>Standard Move</span>
              </span>
              <span className="text-xl font-bold text-[#4E9A6E]">{standardMove}&quot;</span>
              <span className="text-[10px] text-[#8E95A5] block">1 Action (Shoot allowed)</span>
            </div>

            <div className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
              <span className="text-[10px] text-[#8E95A5] uppercase block flex items-center justify-center space-x-1">
                <Zap className="w-3 h-3 text-[#D4AF37]" />
                <span>Dash / Run</span>
              </span>
              <span className="text-xl font-bold text-[#D4AF37]">{dashMove}&quot;</span>
              <span className="text-[10px] text-[#8E95A5] block">2 Actions (Double Move)</span>
            </div>

            <div className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
              <span className="text-[10px] text-[#8E95A5] uppercase block flex items-center justify-center space-x-1">
                <Crosshair className="w-3 h-3 text-[#E53935]" />
                <span>Charge Range</span>
              </span>
              <span className="text-xl font-bold text-[#E53935]">{baseMovInches}&quot; + D6&quot;</span>
              <span className="text-[10px] text-[#8E95A5] block">Max {chargeDistanceMax}&quot;</span>
            </div>

          </div>

          {/* Target Distance Rangefinder */}
          <div className="p-4 bg-[#20242E] rounded border border-[#323846] space-y-3">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#8E95A5] uppercase font-bold">Target Rangefinder:</span>
              <span className="text-base font-bold text-[#D4AF37]">{distanceToTarget}&quot; away</span>
            </div>

            <input
              type="range"
              min="1"
              max="48"
              value={distanceToTarget}
              onChange={(e) => setDistanceToTarget(parseInt(e.target.value))}
              className="w-full accent-[#D4AF37] cursor-pointer"
            />

            <div className="flex justify-between text-[10px] font-mono text-[#8E95A5]">
              <span>Point Blank (6&quot;)</span>
              <span>Short Range (12&quot;)</span>
              <span>Medium (24&quot;)</span>
              <span>Extreme (48&quot;)</span>
            </div>
          </div>

          {/* Weapon Range Analysis against current distance */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-[#8E95A5] font-bold block">
              Equipped Weapons Range Viability ({distanceToTarget}&quot;):
            </span>

            <div className="space-y-1.5">
              {unit.equippedWeapons.map((wep) => {
                const maxRangeNum = parseInt(wep.range.replace(/[^0-9]/g, '')) || (wep.type === 'Melee' ? 1 : 24);
                const inRange = wep.type === 'Melee' ? distanceToTarget <= 2 : distanceToTarget <= maxRangeNum;
                const isPointBlank = distanceToTarget <= 6 && wep.type === 'Ranged';

                return (
                  <div
                    key={wep.instanceId}
                    className={`p-2.5 rounded border text-xs font-mono flex items-center justify-between ${
                      inRange
                        ? 'bg-[#161920] border-[#4E9A6E] text-[#ECEFF4]'
                        : 'bg-[#0C0E12] border-[#323846] opacity-50 text-[#8E95A5]'
                    }`}
                  >
                    <div>
                      <strong className="text-[#ECEFF4]">{wep.name}</strong>
                      <span className="text-[10px] text-[#8E95A5] ml-2">Max Range: {wep.range}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isPointBlank && (
                        <span className="text-[9px] bg-[#D4AF37] text-black px-1.5 py-0.2 rounded font-bold uppercase">
                          Point Blank (+1 Hit)
                        </span>
                      )}
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                        inRange ? 'bg-[#4E9A6E] text-white' : 'bg-[#8B0000] text-white'
                      }`}>
                        {inRange ? 'IN RANGE' : 'OUT OF RANGE'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Terrain & Barbed Wire Modifiers */}
          <div className="p-3 bg-[#0C0E12] rounded border border-[#323846] flex items-center justify-between text-xs font-mono">
            <span className="text-[#8E95A5] flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-[#FF9800]" />
              <span>Crossing Barbed Wire / Difficult Mud:</span>
            </span>
            <span className="text-[#E53935] font-bold">-2&quot; Movement penalty</span>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#323846] bg-[#0C0E12] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] font-mono text-xs font-bold uppercase rounded"
          >
            Close Calculator
          </button>
        </div>

      </div>
    </div>
  );
};
