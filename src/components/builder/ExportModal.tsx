import React, { useState } from 'react';
import { Warband } from '../../types/warband';
import { Faction } from '../../types/rules';
import { X, Printer, Copy, Download, Check, Skull, Shield, FileText, Share2 } from 'lucide-react';

interface ExportModalProps {
  warband: Warband;
  faction?: Faction;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ warband, faction, onClose }) => {
  const [copiedType, setCopiedType] = useState<'plain' | 'discord' | null>(null);
  const [activeTab, setActiveTab] = useState<'cards' | 'text'>('cards');
  const totalCost = warband.units.reduce((sum, u) => sum + u.totalCost, 0);

  const generatePlainText = () => {
    let text = `========================================\n`;
    text += `TRENCHLINE: TRENCH CRUSADE ROSTER\n`;
    text += `Warband: ${warband.name}\n`;
    text += `Faction: ${faction?.name || warband.factionId}\n`;
    text += `Points: ${totalCost} / ${warband.ducatLimit} Ducats | Glory: ${warband.gloryPoints}\n`;
    text += `========================================\n\n`;

    warband.units.forEach((u, i) => {
      text += `[${i + 1}] ${u.customName} (${u.profileSnapshot.category})\n`;
      text += `    Base: ${u.profileSnapshot.name} | Total Cost: ${u.totalCost} D\n`;
      text += `    Stats: MOV ${u.profileSnapshot.stats.movement} | RNG ${u.profileSnapshot.stats.ranged} | MELEE ${u.profileSnapshot.stats.melee} | ARMOUR ${u.profileSnapshot.stats.armour}\n`;
      
      if (u.equippedWeapons.length > 0) {
        text += `    Weapons: ${u.equippedWeapons.map(w => `${w.name} (${w.range}, Mod: ${w.modifiers}, ${w.damage})`).join(', ')}\n`;
      }
      if (u.equippedArmour.length > 0) {
        text += `    Armour: ${u.equippedArmour.map(a => `${a.name} (${a.armourModifier})`).join(', ')}\n`;
      }
      if (u.equippedEquipment.length > 0) {
        text += `    Gear: ${u.equippedEquipment.map(e => e.name).join(', ')}\n`;
      }
      if (u.injuries.length > 0) {
        text += `    Injuries: ${u.injuries.join(', ')}\n`;
      }
      text += `\n`;
    });

    return text;
  };

  const generateDiscordMarkdown = () => {
    let text = `**⚔️ ${warband.name.toUpperCase()} (${faction?.name || warband.factionId}) ⚔️**\n`;
    text += `> **Ducats:** \`${totalCost} / ${warband.ducatLimit} D\` | **Glory:** \`${warband.gloryPoints}\`\n\n`;

    warband.units.forEach((u) => {
      text += `• **${u.customName}** (*${u.profileSnapshot.category}*) — \`${u.totalCost} D\`\n`;
      text += `  └ *Stats:* MOV \`${u.profileSnapshot.stats.movement}\` | RNG \`${u.profileSnapshot.stats.ranged}\` | MELEE \`${u.profileSnapshot.stats.melee}\` | ARMOUR \`${u.profileSnapshot.stats.armour}\`\n`;
      if (u.equippedWeapons.length > 0) {
        text += `  └ *Weapons:* ${u.equippedWeapons.map(w => `**${w.name}** (\`${w.range}\`, \`${w.damage}\`)`).join(', ')}\n`;
      }
    });

    return text;
  };

  const handleCopy = (type: 'plain' | 'discord') => {
    const content = type === 'plain' ? generatePlainText() : generateDiscordMarkdown();
    navigator.clipboard.writeText(content);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(warband, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${warband.name.replace(/\s+/g, '_')}_trenchline.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-4xl max-h-[90dvh] rounded-md flex flex-col shadow-2xl overflow-hidden print:border-none print:max-h-full print:bg-white print:text-black bevel-container">
        
        {/* Modal Header (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12] print:hidden">
          <div className="flex items-center space-x-3">
            <Printer className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <h2 className="font-gothic font-bold text-lg text-[#ECEFF4] tracking-wide">
                EXPORT & PRINT DOSSIERS
              </h2>
              <p className="text-xs font-mono text-[#8E95A5]">
                Printable physical tactical cards, Discord markdown, or JSON backup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8E95A5] hover:text-[#ECEFF4] rounded hover:bg-[#20242E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar (Hidden during print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-[#323846] bg-[#161920] print:hidden">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black rounded font-mono text-xs font-bold uppercase transition-colors shadow"
            >
              <Printer className="w-4 h-4" />
              <span>Print Tactical Dossiers</span>
            </button>

            <button
              onClick={() => handleCopy('plain')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] rounded font-mono text-xs font-bold uppercase transition-colors"
            >
              {copiedType === 'plain' ? <Check className="w-4 h-4 text-[#4E9A6E]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedType === 'plain' ? 'Copied Plaintext!' : 'Copy Plaintext'}</span>
            </button>

            <button
              onClick={() => handleCopy('discord')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#20242E] hover:bg-[#323846] text-[#D4AF37] border border-[#D4AF37]/50 rounded font-mono text-xs font-bold uppercase transition-colors"
            >
              {copiedType === 'discord' ? <Check className="w-4 h-4 text-[#4E9A6E]" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedType === 'discord' ? 'Copied Discord!' : 'Copy for Discord'}</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] rounded font-mono text-xs font-bold uppercase transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Save JSON</span>
            </button>
          </div>
        </div>

        {/* Printable Content Dossier */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 print:p-0 print:overflow-visible">
          
          {/* Header Banner */}
          <div className="border-b-2 border-[#D4AF37] pb-4 flex items-center justify-between print:border-black">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#D4AF37] print:text-black">
                Official TrenchLine Dossier
              </span>
              <h1 className="font-gothic font-bold text-2xl text-[#ECEFF4] print:text-black">{warband.name}</h1>
              <p className="text-sm font-mono text-[#8E95A5] print:text-gray-700">Faction: {faction?.name || warband.factionId}</p>
            </div>
            <div className="text-right font-mono">
              <div className="text-lg font-bold text-[#D4AF37] print:text-black">{totalCost} / {warband.ducatLimit} Ducats</div>
              <div className="text-xs text-[#8E95A5] print:text-gray-700">{warband.gloryPoints} Glory Points</div>
            </div>
          </div>

          {/* Unit Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warband.units.map((unit) => (
              <div
                key={unit.id}
                className="p-4 bg-[#20242E] border-2 border-[#323846] rounded-md space-y-3 print:bg-white print:border-black print:text-black"
              >
                <div className="flex items-center justify-between border-b border-[#323846] pb-2 print:border-gray-400">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-[#0C0E12] text-[#D4AF37] print:bg-gray-200 print:text-black">
                      {unit.profileSnapshot.category}
                    </span>
                    <h3 className="font-gothic font-bold text-base text-[#ECEFF4] print:text-black mt-1">
                      {unit.customName}
                    </h3>
                  </div>
                  <div className="text-xs font-mono font-bold text-[#D4AF37] print:text-black">
                    {unit.totalCost} D
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-1 text-center font-mono text-xs bg-[#161920] p-1.5 rounded border border-[#323846] print:bg-gray-100 print:border-gray-400">
                  <div><span className="text-[9px] text-gray-400 block">MOV</span><strong>{unit.profileSnapshot.stats.movement}</strong></div>
                  <div><span className="text-[9px] text-gray-400 block">RNG</span><strong>{unit.profileSnapshot.stats.ranged}</strong></div>
                  <div><span className="text-[9px] text-gray-400 block">MELEE</span><strong>{unit.profileSnapshot.stats.melee}</strong></div>
                  <div><span className="text-[9px] text-gray-400 block">ARMOUR</span><strong>{unit.profileSnapshot.stats.armour}</strong></div>
                </div>

                {/* Weapons */}
                {unit.equippedWeapons.length > 0 && (
                  <div className="text-xs space-y-1">
                    <span className="text-[10px] font-mono text-gray-400 uppercase font-bold">Armament:</span>
                    {unit.equippedWeapons.map((w) => (
                      <div key={w.instanceId} className="flex justify-between font-mono text-[11px]">
                        <span>{w.name}</span>
                        <span className="text-gray-400">{w.range} | Mod: {w.modifiers} | {w.damage}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Armour & Gear */}
                {(unit.equippedArmour.length > 0 || unit.equippedEquipment.length > 0) && (
                  <div className="text-xs font-mono text-[11px] text-gray-300 print:text-gray-700">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Protection & Gear:</span>
                    {[...unit.equippedArmour.map(a => a.name), ...unit.equippedEquipment.map(e => e.name)].join(', ')}
                  </div>
                )}

                {/* Injuries */}
                {unit.injuries.length > 0 && (
                  <div className="text-[10px] font-mono text-[#E53935] print:text-red-700 border-t border-[#323846] pt-1">
                    Scars: {unit.injuries.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
};
