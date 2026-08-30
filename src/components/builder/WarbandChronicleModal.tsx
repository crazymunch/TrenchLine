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
  Edit2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface WarbandChronicleModalProps {
  warband: Warband;
  onClose: () => void;
}

export const WarbandChronicleModal: React.FC<WarbandChronicleModalProps> = ({ warband, onClose }) => {
  const { updateWarbandLore, updateWarbandChronicleLog } = useStore();

  const [loreText, setLoreText] = useState(warband.lore || '');
  const [mottoText, setMottoText] = useState(warband.motto || '');
  const [patronText, setPatronText] = useState(warband.patron || '');
  const [chronicleItems, setChronicleItems] = useState<string[]>(warband.chronicleLog || []);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [newLogEntry, setNewLogEntry] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    updateWarbandLore(warband.id, loreText, mottoText, patronText);
    updateWarbandChronicleLog(warband.id, chronicleItems);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAddMilestone = () => {
    if (!newLogEntry.trim()) return;
    const updated = [newLogEntry.trim(), ...chronicleItems];
    setChronicleItems(updated);
    setNewLogEntry('');
  };

  const handleDeleteMilestone = (idx: number) => {
    const updated = chronicleItems.filter((_, i) => i !== idx);
    setChronicleItems(updated);
    if (editingIdx === idx) {
      setEditingIdx(null);
    }
  };

  const startEditMilestone = (idx: number) => {
    setEditingIdx(idx);
    setEditText(chronicleItems[idx]);
  };

  const saveEditMilestone = (idx: number) => {
    if (!editText.trim()) return;
    const updated = [...chronicleItems];
    updated[idx] = editText.trim();
    setChronicleItems(updated);
    setEditingIdx(null);
  };

  const moveMilestone = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= chronicleItems.length) return;
    const updated = [...chronicleItems];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setChronicleItems(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#161920] border border-[#D4AF37]/50 rounded-lg max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        
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
              <span className="text-[10px] text-[#8E95A5]">
                {chronicleItems.length} Events Logged (Click pencil to edit wording)
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
                className="px-3 py-2 bg-[#D4AF37] hover:bg-[#C49F27] text-black font-bold uppercase rounded flex items-center space-x-1 flex-shrink-0 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Event</span>
              </button>
            </div>

            {/* Timeline List */}
            {chronicleItems.length === 0 ? (
              <p className="text-[11px] text-[#8E95A5] italic py-2">
                No expedition milestones recorded yet. Add major campaign discoveries, treaty signatures, or historic victories above.
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                {chronicleItems.map((log, idx) => (
                  <div 
                    key={idx}
                    className="p-3 bg-[#161920] border border-[#323846] rounded text-[11px] leading-relaxed transition-all hover:border-[#8E95A5]"
                  >
                    {editingIdx === idx ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={2}
                          className="w-full bg-[#0C0E12] border border-[#D4AF37] rounded p-2 text-xs text-white focus:outline-none"
                        />
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setEditingIdx(null)}
                            className="px-2 py-1 rounded bg-[#20242E] hover:bg-[#323846] text-[#8E95A5]"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveEditMilestone(idx)}
                            className="px-2.5 py-1 rounded bg-[#D4AF37] hover:bg-[#C49F27] text-black font-bold flex items-center space-x-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Save Event</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-2.5 flex-1">
                          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                          <span className="text-[#ECEFF4] whitespace-pre-wrap">{log}</span>
                        </div>
                        <div className="flex items-center space-x-1 opacity-80 hover:opacity-100 flex-shrink-0">
                          <button
                            onClick={() => moveMilestone(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-[#8E95A5] hover:text-white disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveMilestone(idx, 'down')}
                            disabled={idx === chronicleItems.length - 1}
                            className="p-1 text-[#8E95A5] hover:text-white disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => startEditMilestone(idx)}
                            className="p-1 text-[#D4AF37] hover:text-white"
                            title="Edit Milestone Wording"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteMilestone(idx)}
                            className="p-1 text-[#E53935] hover:text-red-400"
                            title="Delete Milestone"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#20242E] border-t border-[#323846] flex items-center justify-between">
          <span className="text-xs text-[#8E95A5] font-mono">
            {isSaved ? (
              <span className="text-[#4CAF50] font-bold flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>House chronicle and lineage successfully preserved in the archives!</span>
              </span>
            ) : (
              <span>All changes will be updated across your warband dossier.</span>
            )}
          </span>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-[#161920] hover:bg-[#323846] text-[#8E95A5] hover:text-white font-mono text-xs font-bold uppercase transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded bg-[#4CAF50] hover:bg-[#43A047] text-black font-mono text-xs font-bold uppercase flex items-center space-x-1.5 transition-colors shadow"
            >
              <Check className="w-4 h-4" />
              <span>Save Chronicle</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
