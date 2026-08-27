'use client';

import React, { useState } from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono">
      <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-xl rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh] bevel-container">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#323846] bg-[#0C0E12]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-[#8B0000]/30 border border-[#8B0000] flex items-center justify-center">
              <Crosshair className="w-4 h-4 text-[#E53935]" />
            </div>
            <div>
              <h3 className="font-gothic font-bold text-base text-[#ECEFF4] tracking-wide">
                TACTICAL ASSAULT & COMBAT CALCULATOR
              </h3>
              <p className="text-xs text-[#8E95A5]">
                Attacker: <strong className="text-[#ECEFF4]">{attacker.customName}</strong> ({attacker.profileSnapshot.name})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[#8E95A5] hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          
          {/* Weapon Selector */}
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-[#D4AF37]">
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
                        ? 'bg-[#20242E] text-[#D4AF37] border-[#D4AF37] ring-1 ring-[#D4AF37]/40 shadow'
                        : 'bg-[#0C0E12] text-[#8E95A5] hover:text-[#ECEFF4] border-[#323846]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="font-bold text-xs">{w.name}</strong>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#161920] border border-[#323846]">
                        {w.type}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#8E95A5] flex items-center justify-between pt-1">
                      <span>Range: {w.range}</span>
                      <span>Mod: {typeof w.modifiers === 'string' ? w.modifiers : '-'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tactical Modifiers */}
          <div className="space-y-2 pt-2 border-t border-[#323846]">
            <label className="block text-[10px] uppercase font-bold text-[#8E95A5]">
              2. Tactical Battlefield Modifiers:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Target Cover */}
              <div className="space-y-1">
                <span className="text-[10px] text-[#8E95A5] block">Target Cover:</span>
                <div className="grid grid-cols-3 gap-1">
                  {(['None', 'Light', 'Heavy'] as const).map((cov) => (
                    <button
                      key={cov}
                      onClick={() => setTargetCover(cov)}
                      className={`py-1 text-center rounded text-[10px] font-bold border transition-all ${
                        targetCover === cov
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                          : 'bg-[#0C0E12] text-[#8E95A5] border-[#323846]'
                      }`}
                    >
                      {cov}
                    </button>
                  ))}
                </div>
              </div>

              {/* Defender Armour */}
              <div className="space-y-1">
                <span className="text-[10px] text-[#8E95A5] block">Defender Armour Mod:</span>
                <select
                  value={targetArmourMod}
                  onChange={(e) => setTargetArmourMod(parseInt(e.target.value, 10))}
                  className="w-full bg-[#0C0E12] border border-[#323846] rounded p-1.5 text-xs text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value={0}>Standard (No Extra Armour)</option>
                  <option value={1}>Light / Standard Armour (-1 Injury)</option>
                  <option value={2}>Heavy Reinforced Armour (-2 Injury)</option>
                  <option value={3}>Infernal / Relic Carapace (-3 Injury)</option>
                </select>
              </div>

              {/* Situational Toggles */}
              <div className="space-y-1">
                <span className="text-[10px] text-[#8E95A5] block">Situational Bonuses:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsCharging(!isCharging)}
                    className={`flex-1 py-1 text-center rounded text-[10px] font-bold border transition-all ${
                      isCharging
                        ? 'bg-[#8B0000] text-white border-[#8B0000]'
                        : 'bg-[#0C0E12] text-[#8E95A5] border-[#323846]'
                    }`}
                  >
                    Charge (+1)
                  </button>
                  <button
                    onClick={() => setHasElevation(!hasElevation)}
                    className={`flex-1 py-1 text-center rounded text-[10px] font-bold border transition-all ${
                      hasElevation
                        ? 'bg-[#8B0000] text-white border-[#8B0000]'
                        : 'bg-[#0C0E12] text-[#8E95A5] border-[#323846]'
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
            className="w-full py-3 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded text-sm shadow-xl shadow-[#D4AF37]/20 flex items-center justify-center space-x-2 transition-transform active:scale-98"
          >
            <Dices className="w-4 h-4 fill-black" />
            <span>⚔️ RESOLVE 2D6 ATTACK & INJURY</span>
          </button>

          {/* Resolution Results Card */}
          {rollResult && (
            <div className="p-4 bg-[#0C0E12] rounded-md border-2 border-[#D4AF37] space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#323846] pb-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <strong className="font-gothic font-bold text-sm text-white">
                    COMBAT RESOLUTION RESULT
                  </strong>
                </div>

                <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                  rollResult.injuryOutcome === 'Out of Action'
                    ? 'bg-[#E53935] text-white'
                    : rollResult.injuryOutcome === 'Downed'
                    ? 'bg-[#FFB300] text-black'
                    : rollResult.attackSuccess
                    ? 'bg-[#4E9A6E] text-white'
                    : 'bg-[#323846] text-[#8E95A5]'
                }`}>
                  {rollResult.isFumble 
                    ? 'CRITICAL FAILURE' 
                    : rollResult.injuryOutcome 
                    ? rollResult.injuryOutcome 
                    : 'MISSED'}
                </span>
              </div>

              {/* Step by Step Breakdown Log */}
              <div className="space-y-1 text-xs text-[#ECEFF4] font-mono bg-[#161920] p-3 rounded border border-[#323846]">
                {rollResult.logLines.map((line, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {line}
                  </div>
                ))}
              </div>

              {/* Damage Summary */}
              {rollResult.attackSuccess && (
                <div className="flex items-center justify-between text-xs bg-[#20242E] p-2.5 rounded border border-[#D4AF37]/50">
                  <span className="text-[#8E95A5]">Damage Applied to Target:</span>
                  <div className="flex items-center space-x-3 font-bold">
                    <span className="text-[#E53935] flex items-center space-x-1">
                      <Heart className="w-3.5 h-3.5" />
                      <span>{rollResult.woundsInflicted} Wound{rollResult.woundsInflicted !== 1 ? 's' : ''}</span>
                    </span>
                    <span className="text-[#E53935] flex items-center space-x-1">
                      <Droplet className="w-3.5 h-3.5 fill-[#E53935]" />
                      <span>+{rollResult.bloodInflicted} Blood</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0C0E12] border-t border-[#323846] flex items-center justify-between">
          <span className="text-[10px] text-[#8E95A5]">
            Attacker Blood Penalty: -{attacker.bloodMarkers}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] rounded uppercase font-bold text-xs border border-[#323846]"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
