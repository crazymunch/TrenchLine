import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Warband } from '../../types/warband';
import { Faction } from '../../types/rules';
import { Printer, Copy, Download, Check, Share2 } from 'lucide-react';
import { unitGlory, formatUnitCost } from '@/rules/savedGlory';
import { encodeRosterFile } from '@/services/rosterFile';
import { useDataset } from '@/rules/useDataset';
import { DEFAULT_RULESET_ID } from '@/rules/rulesets';
import { APP_VERSION } from '@/services/appVersion';

interface ExportModalProps {
  warband: Warband;
  faction?: Faction;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ warband, faction, onClose }) => {
  const [copiedType, setCopiedType] = useState<'plain' | 'discord' | null>(null);

  /*
    The ruleset this roster is being exported under, for the file's manifest.
    Read here rather than threaded in, so the export cannot end up describing a
    different ruleset from the one the builder is using.
  */
  const { dataset } = useDataset(
    (typeof window !== 'undefined'
      && window.localStorage.getItem('trenchline_ruleset')) || DEFAULT_RULESET_ID);

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
      text += `    Base: ${u.profileSnapshot.name} | Total Cost: ${formatUnitCost(u.totalCost, unitGlory(u))}\n`;
      text += `    Stats: MOV ${u.profileSnapshot.stats.movement} | RNG ${u.profileSnapshot.stats.ranged} | MELEE ${u.profileSnapshot.stats.melee} | SAVE ${u.profileSnapshot.stats.armour}\n`;
      
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
      text += `• **${u.customName}** (*${u.profileSnapshot.category}*) — \`${formatUnitCost(u.totalCost, unitGlory(u))}\`\n`;
      text += `  └ *Stats:* MOV \`${u.profileSnapshot.stats.movement}\` | RNG \`${u.profileSnapshot.stats.ranged}\` | MELEE \`${u.profileSnapshot.stats.melee}\` | SAVE \`${u.profileSnapshot.stats.armour}\`\n`;
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

  /**
   * The TrenchLine roster file.
   *
   * This used to be `JSON.stringify(warband)` — the internal type, with no
   * version and no record of the ruleset, carrying mid-battle wounds and the
   * exporter's own account id. Those files are already in users' hands and the
   * new reader still opens them; what is WRITTEN from here on is the versioned
   * envelope. See `services/rosterFile.ts`.
   */
  const handleDownloadJson = () => {
    const file = encodeRosterFile(warband, dataset, { exporterVersion: APP_VERSION });
    const dataStr = 'data:application/json;charset=utf-8,'
      + encodeURIComponent(JSON.stringify(file, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    /* Sanitised: a warband name is user text and this becomes a filename. */
    const safe = warband.name.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '')
      || 'warband';
    downloadAnchor.setAttribute('download', `${safe}.trenchline.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      size="xl"
      title="EXPORT & PRINT DOSSIERS"
      subtitle="Printable physical tactical cards, Discord markdown, or a TrenchLine roster file"
    >
      {/* Action Bar (Hidden during print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-theme-border bg-theme-surface print:hidden">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-theme-primary hover:bg-theme-primary-hover text-theme-base rounded font-mono text-xs font-bold uppercase transition-colors shadow"
          >
            <Printer className="w-4 h-4" />
            <span>Print Tactical Dossiers</span>
          </button>

          <button
            onClick={() => handleCopy('plain')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-theme-elevated hover:bg-theme-border text-theme-text border border-theme-border rounded font-mono text-xs font-bold uppercase transition-colors"
          >
            {copiedType === 'plain' ? <Check className="w-4 h-4 text-status-legal" /> : <Copy className="w-4 h-4" />}
            <span>{copiedType === 'plain' ? 'Copied Plaintext!' : 'Copy Plaintext'}</span>
          </button>

          <button
            onClick={() => handleCopy('discord')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-theme-elevated hover:bg-theme-border text-theme-primary border border-theme-primary/50 rounded font-mono text-xs font-bold uppercase transition-colors"
          >
            {copiedType === 'discord' ? <Check className="w-4 h-4 text-status-legal" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedType === 'discord' ? 'Copied Discord!' : 'Copy for Discord'}</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-theme-elevated hover:bg-theme-border text-theme-text border border-theme-border rounded font-mono text-xs font-bold uppercase transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Save TrenchLine file</span>
          </button>
        </div>
      </div>
    </Sheet>
  );
};
