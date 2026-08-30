'use client';

import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { ActiveUnit, EquippedWeapon } from '../../types/warband';
import { soundEffects } from '../../services/soundEffects';
import { 
  X, 
  Crosshair, 
  Shield, 
  Dices, 
  Skull, 
  Check, 
  AlertTriangle,
  Flame,
  Swords,
  Heart,
  Droplet,
  Sparkles
} from 'lucide-react';

interface AttackCalculatorModalProps {
  attacker: ActiveUnit;
  onClose: () => void;
  onApplyDamage?: (wounds: number, bloodMarkers: number, isDowned: boolean, isOOA: boolean) => void;
}

export const AttackCalculatorModal: React.FC<AttackCalculatorModalProps> = ({ 
  attacker, 
  onClose,
  onApplyDamage 
}) => {
  const [selectedWeapon, setSelectedWeapon] = useState<EquippedWeapon | null>(
    attacker.equippedWeapons[0] || null
  );
  
  // Tactical Modifiers
  const [targetCover, setTargetCover] = useState<'None' | 'Light' | 'Heavy'>('None');
  const [targetArmourMod, setTargetArmourMod] = useState<number>(0); // e.g. Heavy Armour gives -1 to injury
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [hasElevation, setHasElevation] = useState<boolean>(false);

  const [customDiceMod, setCustomDiceMod] = useState<number>(0); // e.g. +1 DICE or -1 DICE

  const [rollResult, setRollResult] = useState<{
    attackD1: number;
    attackD2: number;
    attackTotal: number;
    attackSuccess: boolean;
    isCrit: boolean;
    isFumble: boolean;
    injuryD1?: number;
    injuryD2?: number;
    injuryTotal?: number;
    injuryOutcome?: 'No Effect' | 'Downed' | 'Out of Action';
    woundsInflicted: number;
    bloodInflicted: number;
    logLines: string[];
  } | null>(null);

  // Extract numerical modifier from weapon safely
  const parseWeaponMod = (weapon: EquippedWeapon | null): number => {
    if (!weapon) return 0;
    if (typeof weapon.modifiers === 'number') return weapon.modifiers;
    if (typeof weapon.modifiers === 'string') {
      const match = weapon.modifiers.match(/[+-]?\d+/);
      return match ? parseInt(match[0], 10) : 0;
    }
    return 0;
  };

  const handleRollAttack = () => {
    soundEffects.playDiceRoll();

    // 1. Roll 2D6 for Attack Success Roll (Target Number = 7+)
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const baseTotal = d1 + d2;
    const isCrit = d1 === 6 && d2 === 6;
    const isFumble = d1 === 1 && d2 === 1;

    const weaponMod = parseWeaponMod(selectedWeapon);
    const coverPenalty = targetCover === 'Heavy' ? 2 : targetCover === 'Light' ? 1 : 0;
    const bloodPenalty = attacker.bloodMarkers || 0;
    const chargeBonus = isCharging ? 1 : 0;
    const elevationBonus = hasElevation ? 1 : 0;

    const netModifier = weaponMod + chargeBonus + elevationBonus + customDiceMod - coverPenalty - bloodPenalty;
    const finalAttackRoll = baseTotal + netModifier;
    const targetTN = 7;

    const attackSuccess = !isFumble && (isCrit || finalAttackRoll >= targetTN);

    const logLines: string[] = [
      `⚔️ Attack Roll: [ ${d1} + ${d2} = ${baseTotal} ]`
    ];

    if (weaponMod !== 0) logLines.push(`• Weapon Mod: ${weaponMod > 0 ? '+' : ''}${weaponMod}`);
    if (isCharging) logLines.push(`• Charge Momentum: +1`);
    if (hasElevation) logLines.push(`• High Ground: +1`);
    if (customDiceMod !== 0) logLines.push(`• Bonus / Penalty Dice: ${customDiceMod > 0 ? '+' : ''}${customDiceMod}`);
    if (coverPenalty > 0) logLines.push(`• Target in Cover: -${coverPenalty}`);
    if (bloodPenalty > 0) logLines.push(`• Attacker Blood Markers: -${bloodPenalty}`);

    logLines.push(`👉 Final Attack Score: ${finalAttackRoll} vs TN ${targetTN}`);

    let injuryD1: number | undefined;
    let injuryD2: number | undefined;
    let injuryTotal: number | undefined;
    let injuryOutcome: 'No Effect' | 'Downed' | 'Out of Action' | undefined;
    let woundsInflicted = 0;
    let bloodInflicted = 0;

    if (isFumble) {
      logLines.push(`💥 CRITICAL FAILURE (Double 1s)! Weapon misfires or attacker slips.`);
    } else if (!attackSuccess) {
      logLines.push(`🛡️ DEFLECTED / MISSED! The attack failed to penetrate defenses.`);
    } else {
      // Direct Hit or Critical Strike!
      if (isCrit) {
        logLines.push(`🌟 CRITICAL STRIKE (Double 6s)! Direct hit with devastating precision.`);
      } else {
        logLines.push(`🎯 DIRECT HIT! Penetrated armor.`);
      }

      // 2. Roll 2D6 for Injury Table (Page 38: 2-6 No Effect, 7-8 Down, 9+ Out of Action)
      injuryD1 = Math.floor(Math.random() * 6) + 1;
      injuryD2 = Math.floor(Math.random() * 6) + 1;
      const injuryBase = injuryD1 + injuryD2;
      const critInjuryBonus = isCrit ? 2 : 0;
      const netInjury = injuryBase + critInjuryBonus - targetArmourMod;
      injuryTotal = netInjury;

      logLines.push(`🩸 Injury Roll: [ ${injuryD1} + ${injuryD2} = ${injuryBase} ]${isCrit ? ' +2 (Crit Bonus)' : ''}${targetArmourMod ? ` - ${targetArmourMod} (Armour)` : ''} = ${netInjury}`);

      bloodInflicted = 1;

      if (netInjury >= 9) {
        injuryOutcome = 'Out of Action';
        woundsInflicted = 1;
        logLines.push(`💀 OUT OF ACTION! Target is taken casualty and removed from combat.`);
      } else if (netInjury >= 7) {
        injuryOutcome = 'Downed';
        woundsInflicted = 1;
        logLines.push(`⚠️ DOWNED! Target is knocked down and suffers 1 Wound & 1 Blood Marker.`);
      } else {
        injuryOutcome = 'No Effect';
        logLines.push(`🛡️ GLANCING BLOW! Target withstands the damage, gaining +1 Blood Marker.`);
      }
    }

    setRollResult({
      attackD1: d1,
      attackD2: d2,
      attackTotal: finalAttackRoll,
      attackSuccess,
      isCrit,
      isFumble,
      injuryD1,
      injuryD2,
      injuryTotal,
      injuryOutcome,
      woundsInflicted,
      bloodInflicted,
      logLines
    });
  };

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title="TACTICAL ASSAULT & COMBAT CALCULATOR"
      subtitle={`Attacker: <strong className="text-theme-text">${attacker.customName}</strong> (${attacker.profileSnapshot.name})`}
    >
      {/* Body */}
      <div className="p-5 overflow-y-auto space-y-4 text-xs">
  
        {/* Weapon Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs sm:text-[10px] uppercase font-bold text-theme-primary">
            1. Select Attacking Weapon:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attacker.equippedWeapons.map((w) => {
              const isSelected = selectedWeapon?.instanceId === w.instanceId;
              return (
                <button
                  key={w.instanceId}
                  onClick={() => setSelectedWeapon(w)}
                  className={`p-2.5 rounded text-left transition-all flex flex-col justify-between border ${
                    isSelected
                      ? 'bg-theme-elevated text-theme-primary border-theme-primary ring-1 ring-theme-primary/40 shadow'
                      : 'bg-theme-base text-theme-muted hover:text-theme-text border-theme-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong className="font-bold text-xs">{w.name}</strong>
                    <span className="text-xs sm:text-[10px] px-1.5 py-0.2 rounded bg-theme-surface border border-theme-border">
                      {w.type}
                    </span>
                  </div>
                  <div className="text-xs sm:text-[10px] text-theme-muted flex items-center justify-between pt-1">
                    <span>Range: {w.range}</span>
                    <span>Mod: {typeof w.modifiers === 'string' ? w.modifiers : '-'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tactical Modifiers */}
        <div className="space-y-2 pt-2 border-t border-theme-border">
          <label className="block text-xs sm:text-[10px] uppercase font-bold text-theme-muted">
            2. Tactical Battlefield Modifiers:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Target Cover */}
            <div className="space-y-1">
              <span className="text-xs sm:text-[10px] text-theme-muted block">Target Cover:</span>
              <div className="grid grid-cols-3 gap-1">
                {(['None', 'Light', 'Heavy'] as const).map((cov) => (
                  <button
                    key={cov}
                    onClick={() => setTargetCover(cov)}
                    className={`py-1 text-center rounded text-xs sm:text-[10px] font-bold border transition-all ${
                      targetCover === cov
                        ? 'bg-theme-primary text-black border-theme-primary'
                        : 'bg-theme-base text-theme-muted border-theme-border'
                    }`}
                  >
                    {cov}
                  </button>
                ))}
              </div>
            </div>

            {/* Defender Armour */}
            <div className="space-y-1">
              <span className="text-xs sm:text-[10px] text-theme-muted block">Defender Armour Mod:</span>
              <select
                value={targetArmourMod}
                onChange={(e) => setTargetArmourMod(parseInt(e.target.value, 10))}
                className="w-full bg-theme-base border border-theme-border rounded p-1.5 text-xs text-theme-text focus:outline-none focus:border-theme-primary"
              >
                <option value={0}>Standard (No Extra Armour)</option>
                <option value={1}>Light / Standard Armour (-1 Injury)</option>
                <option value={2}>Heavy Reinforced Armour (-2 Injury)</option>
                <option value={3}>Infernal / Relic Carapace (-3 Injury)</option>
              </select>
            </div>

            {/* Situational Toggles */}
            <div className="space-y-1">
              <span className="text-xs sm:text-[10px] text-theme-muted block">Situational Bonuses:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCharging(!isCharging)}
                  className={`flex-1 py-1 text-center rounded text-xs sm:text-[10px] font-bold border transition-all ${
                    isCharging
                      ? 'bg-theme-accent text-white border-theme-accent'
                      : 'bg-theme-base text-theme-muted border-theme-border'
                  }`}
                >
                  Charge (+1)
                </button>
                <button
                  onClick={() => setHasElevation(!hasElevation)}
                  className={`flex-1 py-1 text-center rounded text-xs sm:text-[10px] font-bold border transition-all ${
                    hasElevation
                      ? 'bg-theme-accent text-white border-theme-accent'
                      : 'bg-theme-base text-theme-muted border-theme-border'
                  }`}
                >
                  High Ground
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Roll CTA */}
        <button
          onClick={handleRollAttack}
          className="w-full py-3 bg-theme-primary hover:bg-theme-primary-hover text-black font-bold uppercase rounded text-sm shadow-xl shadow-theme-primary/20 flex items-center justify-center space-x-2 transition-transform active:scale-98"
        >
          <Dices className="w-4 h-4 fill-black" />
          <span>⚔️ RESOLVE 2D6 ATTACK & INJURY</span>
        </button>

        {/* Resolution Results Card */}
        {rollResult && (
          <div className="p-4 bg-theme-base rounded-md border-2 border-theme-primary space-y-3 animate-fade-in">
            <div className="flex items-center justify-between border-b border-theme-border pb-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-theme-primary" />
                <strong className="font-gothic font-bold text-sm text-white">
                  COMBAT RESOLUTION RESULT
                </strong>
              </div>

              <span className={`px-2 py-0.5 rounded text-xs sm:text-[11px] font-bold uppercase ${
                rollResult.injuryOutcome === 'Out of Action'
                  ? 'bg-status-error text-white'
                  : rollResult.injuryOutcome === 'Downed'
                  ? 'bg-status-warning text-black'
                  : rollResult.attackSuccess
                  ? 'bg-status-legal text-white'
                  : 'bg-theme-border text-theme-muted'
              }`}>
                {rollResult.isFumble 
                  ? 'CRITICAL FAILURE' 
                  : rollResult.injuryOutcome 
                  ? rollResult.injuryOutcome 
                  : 'MISSED'}
              </span>
            </div>

            {/* Step by Step Breakdown Log */}
            <div className="space-y-1 text-xs text-theme-text font-mono bg-theme-surface p-3 rounded border border-theme-border">
              {rollResult.logLines.map((line, idx) => (
                <div key={idx} className="leading-relaxed">
                  {line}
                </div>
              ))}
            </div>

            {/* Damage Summary */}
            {rollResult.attackSuccess && (
              <div className="flex items-center justify-between text-xs bg-theme-elevated p-2.5 rounded border border-theme-primary/50">
                <span className="text-theme-muted">Damage Applied to Target:</span>
                <div className="flex items-center space-x-3 font-bold">
                  <span className="text-status-error flex items-center space-x-1">
                    <Heart className="w-3.5 h-3.5" />
                    <span>{rollResult.woundsInflicted} Wound{rollResult.woundsInflicted !== 1 ? 's' : ''}</span>
                  </span>
                  <span className="text-status-error flex items-center space-x-1">
                    <Droplet className="w-3.5 h-3.5 fill-status-error" />
                    <span>+{rollResult.bloodInflicted} Blood</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </Sheet>
  );
};
