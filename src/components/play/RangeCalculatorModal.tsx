'use client';

import React, { useState } from 'react';
import { useOverlay } from '../ui/useOverlay';
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

  // Scroll lock, focus trap and Escape (docs/MOBILE.md §7).
  const overlayRef = useOverlay(true, onClose);
  const [isCharging, setIsCharging] = useState(false);
  const [hasBarbedWire, setHasBarbedWire] = useState(false);

  // Movement calculations
  const standardMove = baseMovInches;
  const dashMove = baseMovInches * 2;
  const crawlMove = 2; // For Downed models
  const chargeDistanceMax = baseMovInches + 6; // Standard movement + D6 charge bonus

  const isWithinCharge = distanceToTarget <= (isCharging ? chargeDistanceMax : standardMove);

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-theme-surface border-2 border-theme-primary w-full max-w-lg rounded-md shadow-2xl overflow-hidden bevel-container">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border bg-theme-base">
          <div className="flex items-center space-x-2">
            <Ruler className="w-5 h-5 text-theme-primary" />
            <div>
              <h3 className="font-gothic font-bold text-lg text-theme-text">TACTICAL RULER & CHARGE CALCULATOR</h3>
              <p className="text-xs font-mono text-theme-muted">Warrior: {unit.customName} (Base MOV: {unit.profileSnapshot.stats.movement})</p>
            </div>
          </div>
          <button onClick={onClose} className="tap p-1 text-theme-muted hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          
          {/* Movement Distance Gauges */}
          <div className="grid grid-cols-3 gap-3 font-mono text-center text-xs">
            
            <div className="p-3 bg-theme-base rounded border border-theme-border space-y-1">
              <span className="text-xs sm:text-[10px] text-theme-muted uppercase block flex items-center justify-center space-x-1">
                <Footprints className="w-3 h-3 text-status-legal" />
                <span>Standard Move</span>
              </span>
              <span className="text-xl font-bold text-status-legal">{standardMove}&quot;</span>
              <span className="text-xs sm:text-[10px] text-theme-muted block">1 Action (Shoot allowed)</span>
            </div>

            <div className="p-3 bg-theme-base rounded border border-theme-border space-y-1">
              <span className="text-xs sm:text-[10px] text-theme-muted uppercase block flex items-center justify-center space-x-1">
                <Zap className="w-3 h-3 text-theme-primary" />
                <span>Dash / Run</span>
              </span>
              <span className="text-xl font-bold text-theme-primary">{dashMove}&quot;</span>
              <span className="text-xs sm:text-[10px] text-theme-muted block">2 Actions (Double Move)</span>
            </div>

            <div className="p-3 bg-theme-base rounded border border-theme-border space-y-1">
              <span className="text-xs sm:text-[10px] text-theme-muted uppercase block flex items-center justify-center space-x-1">
                <Crosshair className="w-3 h-3 text-status-error" />
                <span>Charge Range</span>
              </span>
              <span className="text-xl font-bold text-status-error">{baseMovInches}&quot; + D6&quot;</span>
              <span className="text-xs sm:text-[10px] text-theme-muted block">Max {chargeDistanceMax}&quot;</span>
            </div>

          </div>

          {/* Target Distance Rangefinder */}
          <div className="p-4 bg-theme-elevated rounded border border-theme-border space-y-3">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-theme-muted uppercase font-bold">Target Rangefinder:</span>
              <span className="text-base font-bold text-theme-primary">{distanceToTarget}&quot; away</span>
            </div>

            <input
              type="range"
              min="1"
              max="48"
              value={distanceToTarget}
              onChange={(e) => setDistanceToTarget(parseInt(e.target.value))}
              className="w-full accent-theme-primary cursor-pointer"
            />

            <div className="flex justify-between text-xs sm:text-[10px] font-mono text-theme-muted">
              <span>Point Blank (6&quot;)</span>
              <span>Short Range (12&quot;)</span>
              <span>Medium (24&quot;)</span>
              <span>Extreme (48&quot;)</span>
            </div>
          </div>

          {/* Weapon Range Analysis against current distance */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-theme-muted font-bold block">
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
                        ? 'bg-theme-surface border-status-legal text-theme-text'
                        : 'bg-theme-base border-theme-border opacity-50 text-theme-muted'
                    }`}
                  >
                    <div>
                      <strong className="text-theme-text">{wep.name}</strong>
                      <span className="text-xs sm:text-[10px] text-theme-muted ml-2">Max Range: {wep.range}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isPointBlank && (
                        <span className="text-xs sm:text-[9px] bg-theme-primary text-black px-1.5 py-0.2 rounded font-bold uppercase">
                          Point Blank (+1 Hit)
                        </span>
                      )}
                      <span className={`font-bold px-2 py-0.5 rounded text-xs sm:text-[10px] uppercase ${
                        inRange ? 'bg-status-legal text-white' : 'bg-theme-accent text-white'
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
          <div className="p-3 bg-theme-base rounded border border-theme-border flex items-center justify-between text-xs font-mono">
            <span className="text-theme-muted flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-[#FF9800]" />
              <span>Crossing Barbed Wire / Difficult Mud:</span>
            </span>
            <span className="text-status-error font-bold">-2&quot; Movement penalty</span>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-theme-border bg-theme-base flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-theme-elevated hover:bg-theme-border text-theme-text font-mono text-xs font-bold uppercase rounded"
          >
            Close Calculator
          </button>
        </div>

      </div>
    </div>
  );
};
