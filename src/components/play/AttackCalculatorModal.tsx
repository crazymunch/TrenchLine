import React, { useState } from 'react';
import { ActiveUnit, EquippedWeapon } from '../../types/warband';
import { 
  X, 
  Crosshair, 
  Shield, 
  Dices, 
  Skull, 
  Check, 
  AlertTriangle,
  Flame
} from 'lucide-react';

interface AttackCalculatorModalProps {
  attacker: ActiveUnit;
  onClose: () => void;
}

export const AttackCalculatorModal: React.FC<AttackCalculatorModalProps> = ({ attacker, onClose }) => {
  const [selectedWeapon, setSelectedWeapon] = useState<EquippedWeapon | null>(
    attacker.equippedWeapons[0] || null
  );
  const [targetCover, setTargetCover] = useState<'None' | 'Light' | 'Heavy'>('None');
  const [targetArmour, setTargetArmour] = useState<number>(1);
  const [rollResult, setRollResult] = useState<{
    d1: number;
    d2: number;
    total: number;
    isHit: boolean;
    isCrit: boolean;
    woundsInflicted: number;
    log: string;
  } | null>(null);

  const handleRollAttack = () => {
    if (!selectedWeapon) return;

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;
    const isCrit = d1 === 6 && d2 === 6;
    const isFumble = d1 === 1 && d2 === 1;

    // Calculate modifier
    const modNum = parseInt(selectedWeapon.modifiers.replace(/[^0-9-]/g, '')) || 0;
    const coverPenalty = targetCover === 'Heavy' ? 2 : targetCover === 'Light' ? 1 : 0;
    const bloodPenalty = attacker.bloodMarkers;

    const finalRoll = total + modNum - coverPenalty - bloodPenalty;
    const targetTN = 7 + Math.max(0, targetArmour - 1);

    const isHit = !isFumble && (isCrit || finalRoll >= targetTN);
    const woundsInflicted = isHit ? (isCrit ? 2 : 1) : 0;

    let log = `Rolled [ ${d1} + ${d2} = ${total} ]`;
    if (modNum !== 0) log += ` + Weapon Mod (${modNum > 0 ? '+' + modNum : modNum})`;
    if (coverPenalty > 0) log += ` - Cover (${coverPenalty})`;
    if (bloodPenalty > 0) log += ` - Blood (${bloodPenalty})`;
    log += ` = Final: ${finalRoll} vs TN ${targetTN}`;

    if (isCrit) log += ` — CRITICAL STRIKE!`;
    else if (isFumble) log += ` — FUMBLE / MISFIRE!`;
    else if (isHit) log += ` — DIRECT HIT!`;
    else log += ` — DEFLECTED / MISSED!`;

    setRollResult({
      d1,
      d2,
      total: finalRoll,
      isHit,
      isCrit,
      woundsInflicted,
      log
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161920] border-2 border-[#8B0000] w-full max-w-lg rounded-md shadow-2xl overflow-hidden bevel-container">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12]">
          <div className="flex items-center space-x-2">
            <Crosshair className="w-5 h-5 text-[#E53935]" />
            <div>
              <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">TACTICAL ATTACK CALCULATOR</h3>
              <p className="text-xs font-mono text-[#8E95A5]">Attacker: {attacker.customName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[#8E95A5] hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          
          {/* Weapon Selector */}
          <div>
            <label className="block text-xs font-mono uppercase text-[#8E95A5] mb-1">
              Select Attacking Weapon:
            </label>
            <div className="space-y-1.5">
              {attacker.equippedWeapons.map((w) => (
                <button
                  key={w.instanceId}
                  onClick={() => setSelectedWeapon(w)}
                  className={`w-full p-2.5 rounded text-left text-xs font-mono transition-all flex justify-between items-center ${
                    selectedWeapon?.instanceId === w.instanceId
                      ? 'bg-[#20242E] text-[#D4AF37] border border-[#D4AF37] font-bold shadow'
                      : 'bg-[#0C0E12] text-[#8E95A5] hover:text-[#ECEFF4] border border-[#323846]'
                  }`}
                >
                  <span>{w.name} ({w.type})</span>
                  <span>Mod: {w.modifiers} | {w.damage}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Defense & Cover Modifiers */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-mono uppercase text-[#8E95A5] mb-1">
                Target Cover:
              </label>
              <select
                value={targetCover}
                onChange={(e) => setTargetCover(e.target.value as any)}
                className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-xs text-[#ECEFF4] focus:outline-none"
              >
                <option value="None">Open Ground (0)</option>
                <option value="Light">Light Cover (-1 to hit)</option>
                <option value="Heavy">Heavy Trench (-2 to hit)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-[#8E95A5] mb-1">
                Target Base Armour:
              </label>
              <input
                type="number"
                min="0"
                max="4"
                value={targetArmour}
                onChange={(e) => setTargetArmour(parseInt(e.target.value) || 0)}
                className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-xs text-[#ECEFF4] font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Roll Button */}
          <button
            onClick={handleRollAttack}
            className="w-full py-3 bg-[#8B0000] hover:bg-[#A30000] text-white font-mono text-xs font-bold uppercase rounded shadow-lg shadow-[#8B0000]/40 flex items-center justify-center space-x-2 transition-colors"
          >
            <Dices className="w-4 h-4" />
            <span>Roll Attack & Resolve Wound</span>
          </button>

          {/* Result Box */}
          {rollResult && (
            <div className={`p-4 rounded-md border-2 text-center space-y-1.5 ${
              rollResult.isHit
                ? 'bg-[#4E9A6E]/15 border-[#4E9A6E] text-[#4E9A6E]'
                : 'bg-[#8B0000]/15 border-[#8B0000] text-[#E53935]'
            }`}>
              <div className="font-gothic font-bold text-lg">
                {rollResult.isHit ? 'HIT CONFIRMED!' : 'ATTACK MISSED / DEFLECTED'}
              </div>
              <p className="text-xs font-mono text-[#ECEFF4]">{rollResult.log}</p>
              {rollResult.woundsInflicted > 0 && (
                <span className="inline-block text-xs font-mono font-bold bg-[#D4AF37] text-black px-2 py-0.5 rounded mt-1">
                  Dealt {rollResult.woundsInflicted} Wound(s)!
                </span>
              )}
            </div>
          )}

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
