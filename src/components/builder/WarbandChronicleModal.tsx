'use client';

import React, { useState } from 'react';
import { Warband } from '../../types/warband';
import { useStore } from '../../store/useStore';
import { 
  Scroll, 
  X, 
  BookOpen, 
  Quote, 
  Landmark, 
  Clock, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';

interface WarbandChronicleModalProps {
  warband: Warband;
  onClose: () => void;
}

export const WarbandChronicleModal: React.FC<WarbandChronicleModalProps> = ({ warband, onClose }) => {
  const { updateWarbandLore, addWarbandChronicleEntry } = useStore();

  const [loreText, setLoreText] = useState(warband.lore || '');
  const [mottoText, setMottoText] = useState(warband.motto || '');
  const [patronText, setPatronText] = useState(warband.patron || '');
  const [newLogEntry, setNewLogEntry] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    updateWarbandLore(warband.id, loreText, mottoText, patronText);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAddMilestone = () => {
    if (!newLogEntry.trim()) return;
    addWarbandChronicleEntry(warband.id, newLogEntry.trim());
    setNewLogEntry('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#161920] border border-[#D4AF37]/50 rounded-lg max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 bg-[#20242E] border-b border-[#323846] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center">
              <Scroll className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-gothic font-bold text-lg text-white">
                  {warband.name}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#8B0000] text-white font-bold uppercase">
                  House Chronicle
                </span>
              </div>
              <p className="text-xs text-[#8E95A5] font-mono">
                Grand Warband Dossier, House Lineage, Oaths & Historical Timeline
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#8E95A5] hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 font-mono text-xs">
          
          {/* Top Grid: Motto & Patron */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Motto */}
            <div className="bg-[#0C0E12] border border-[#323846] rounded-md p-3.5 space-y-1.5">
              <label className="text-[11px] uppercase font-bold text-[#8E95A5] flex items-center space-x-1.5">
                <Quote className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>House Motto / Sacred Battle Cry:</span>
              </label>
              <input
                type="text"
                value={mottoText}
                onChange={(e) => setMottoText(e.target.value)}
                placeholder="e.g. The Wall may forget, but the Copper remembers!"
                className="w-full bg-[#161920] border border-[#323846] rounded px-3 py-2 text-xs text-white placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {/* Patron / Sect */}
            <div className="bg-[#0C0E12] border border-[#323846] rounded-md p-3.5 space-y-1.5">
              <label className="text-[11px] uppercase font-bold text-[#8E95A5] flex items-center space-x-1.5">
                <Landmark className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Patronage, Sub-Sect & Lineage:</span>
              </label>
              <input
                type="text"
                value={patronText}
                onChange={(e) => setPatronText(e.target.value)}
                placeholder="e.g. House of Wisdom • Bayt al-Nahas al-Hamra (House of the Red Copper)"
                className="w-full bg-[#161920] border border-[#323846] rounded px-3 py-2 text-xs text-white placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

          </div>

          {/* Warband Lore & Narrative Overview */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-bold text-[#8E95A5] flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Warband Narrative Lore, Origins & Expedition Purpose (Markdown):</span>
            </label>
            <textarea
              value={loreText}
              onChange={(e) => setLoreText(e.target.value)}
              placeholder="Record the origins of this warband, the circumstances of their expedition, lost ancestral claims in the salt wastes, and ideological doctrine..."
              rows={12}
              className="w-full bg-[#0C0E12] border border-[#323846] rounded-md p-3.5 text-xs text-[#ECEFF4] placeholder-[#8E95A5] leading-relaxed focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {/* Timeline of Milestones & Campaign Discoveries */}
          <div className="bg-[#0C0E12] border border-[#323846] rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-[#8E95A5] flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Expedition Milestones & Campaign Chronicle Timeline</span>
              </span>
            </div>

            {/* Add Milestone */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newLogEntry}
                onChange={(e) => setNewLogEntry(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddMilestone(); }}
                placeholder="e.g. Turn 2: Discovered the ancient leather-bound Book of Golems in the salt wastes"
                className="flex-1 bg-[#161920] border border-[#323846] rounded px-3 py-2 text-xs text-white placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
              />
              <button
                onClick={handleAddMilestone}
                className="px-3 py-2 bg-[#D4AF37] hover:bg-[#C49F27] text-black font-bold uppercase rounded flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Event</span>
              </button>
            </div>

            {/* Timeline List */}
            {(!warband.chronicleLog || warband.chronicleLog.length === 0) ? (
              <p className="text-[11px] text-[#8E95A5] italic py-2">
                No expedition milestones recorded yet. Add major campaign discoveries, treaty signatures, or historic victories above.
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                {warband.chronicleLog.map((log, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start space-x-2.5 p-2.5 bg-[#161920] border border-[#323846] rounded text-[11px] leading-relaxed"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                    <span className="text-[#ECEFF4] flex-1">{log}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-[#20242E] border-t border-[#323846] flex items-center justify-between">
          <span className="text-xs font-mono text-[#4E9A6E] flex items-center space-x-1">
            {isSaved && (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Warband chronicle updated successfully</span>
              </>
            )}
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-[#161920] hover:bg-[#323846] border border-[#323846] text-[#8E95A5] hover:text-white rounded text-xs font-mono uppercase"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-[#D4AF37] hover:bg-[#C49F27] text-black font-mono font-bold text-xs uppercase rounded flex items-center space-x-1 shadow"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Chronicle</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
