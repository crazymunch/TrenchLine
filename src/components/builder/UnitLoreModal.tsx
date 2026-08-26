'use client';

import React, { useState } from 'react';
import { ActiveUnit } from '../../types/warband';
import { useStore } from '../../store/useStore';
import { 
  Scroll, 
  X, 
  Sparkles, 
  Award, 
  Quote, 
  Plus, 
  Trash2, 
  Check, 
  BookOpen, 
  Skull,
  Shield,
  Edit3
} from 'lucide-react';

interface UnitLoreModalProps {
  warbandId: string;
  unit: ActiveUnit;
  onClose: () => void;
}

export const UnitLoreModal: React.FC<UnitLoreModalProps> = ({ warbandId, unit, onClose }) => {
  const { updateUnitLore } = useStore();

  const [activeTab, setActiveTab] = useState<'bio' | 'deeds' | 'titles'>('bio');
  const [loreText, setLoreText] = useState(unit.lore || '');
  const [quoteText, setQuoteText] = useState(unit.quote || '');
  const [titles, setTitles] = useState<string[]>(unit.titles || []);
  const [deeds, setDeeds] = useState<string[]>(unit.deeds || []);

  const [newTitle, setNewTitle] = useState('');
  const [newDeed, setNewDeed] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    updateUnitLore(warbandId, unit.id, loreText, quoteText, titles, deeds);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAddTitle = () => {
    if (!newTitle.trim()) return;
    const updated = [...titles, newTitle.trim()];
    setTitles(updated);
    setNewTitle('');
    updateUnitLore(warbandId, unit.id, loreText, quoteText, updated, deeds);
  };

  const handleRemoveTitle = (idx: number) => {
    const updated = titles.filter((_, i) => i !== idx);
    setTitles(updated);
    updateUnitLore(warbandId, unit.id, loreText, quoteText, updated, deeds);
  };

  const handleAddDeed = () => {
    if (!newDeed.trim()) return;
    const updated = [...deeds, newDeed.trim()];
    setDeeds(updated);
    setNewDeed('');
    updateUnitLore(warbandId, unit.id, loreText, quoteText, titles, updated);
  };

  const handleRemoveDeed = (idx: number) => {
    const updated = deeds.filter((_, i) => i !== idx);
    setDeeds(updated);
    updateUnitLore(warbandId, unit.id, loreText, quoteText, titles, updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#161920] border border-[#D4AF37]/50 rounded-lg max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 bg-[#20242E] border-b border-[#323846] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center">
              <Scroll className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-gothic font-bold text-base sm:text-lg text-white">
                  {unit.customName}
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#323846] text-[#D4AF37] uppercase font-bold">
                  {unit.profileSnapshot.name}
                </span>
              </div>
              <p className="text-xs text-[#8E95A5] font-mono">
                Warrior Dossier, Narrative Chronicle & Battle Accolades
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

        {/* Modal Sub-Header Tabs */}
        <div className="flex items-center space-x-1 px-4 pt-3 border-b border-[#323846] bg-[#161920]">
          <button
            onClick={() => setActiveTab('bio')}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'bio' 
                ? 'border-[#D4AF37] text-[#D4AF37]' 
                : 'border-transparent text-[#8E95A5] hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Biography & Lore</span>
          </button>

          <button
            onClick={() => setActiveTab('deeds')}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'deeds' 
                ? 'border-[#D4AF37] text-[#D4AF37]' 
                : 'border-transparent text-[#8E95A5] hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Heroic Deeds ({deeds.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('titles')}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'titles' 
                ? 'border-[#D4AF37] text-[#D4AF37]' 
                : 'border-transparent text-[#8E95A5] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Honorific Titles ({titles.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: Biography & Lore */}
          {activeTab === 'bio' && (
            <div className="space-y-4">
              
              {/* Quote Block */}
              <div className="bg-[#0C0E12] border border-[#323846] rounded-md p-3 space-y-1.5">
                <label className="text-[11px] font-mono uppercase font-bold text-[#8E95A5] flex items-center space-x-1">
                  <Quote className="w-3 h-3 text-[#D4AF37]" />
                  <span>Iconic Battlefield Quote / Oath:</span>
                </label>
                <input
                  type="text"
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  placeholder="e.g. In these wastes, we use the tools we have. The Sultanate gave us a Wall; I gave us a monster."
                  className="w-full bg-[#161920] border border-[#323846] rounded px-2.5 py-1.5 text-xs text-white placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Biography TextArea */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase font-bold text-[#8E95A5] flex items-center space-x-1">
                  <BookOpen className="w-3 h-3 text-[#D4AF37]" />
                  <span>Personal History, Role & Chronicle (Markdown Supported):</span>
                </label>
                <textarea
                  value={loreText}
                  onChange={(e) => setLoreText(e.target.value)}
                  placeholder="Record this warrior's origins, tactical duties, unique modifications, equipment provenance, or personal motivations..."
                  rows={10}
                  className="w-full bg-[#0C0E12] border border-[#323846] rounded-md p-3 text-xs font-mono text-[#ECEFF4] placeholder-[#8E95A5] leading-relaxed focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Combat Stats & Injuries Quick Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-2.5 bg-[#0C0E12] border border-[#323846] rounded text-xs space-y-1 font-mono">
                  <span className="text-[#8E95A5] block font-bold uppercase text-[10px]">Combat Progression:</span>
                  <div className="text-white flex items-center space-x-2">
                    <span>XP: <strong className="text-[#D4AF37]">{unit.xp}</strong></span>
                    <span>•</span>
                    <span>Status: <strong className="text-[#4E9A6E]">{unit.status}</strong></span>
                    <span>•</span>
                    <span>Cost: <strong className="text-[#D4AF37]">{unit.totalCost} D</strong></span>
                  </div>
                </div>

                <div className="p-2.5 bg-[#0C0E12] border border-[#323846] rounded text-xs space-y-1 font-mono">
                  <span className="text-[#8E95A5] block font-bold uppercase text-[10px]">Battle Scars & Injuries:</span>
                  {unit.injuries.length === 0 ? (
                    <span className="text-[#4E9A6E] italic text-[11px]">Unscathed in battle</span>
                  ) : (
                    <ul className="text-[#E53935] list-disc list-inside text-[11px]">
                      {unit.injuries.map((inj, i) => (
                        <li key={i}>{inj}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Heroic Deeds & Feats */}
          {activeTab === 'deeds' && (
            <div className="space-y-4">
              <p className="text-xs text-[#8E95A5] font-mono">
                Record momentous campaign feats, critical snipes, duel victories, clutch objective captures, and battlefield heroics.
              </p>

              {/* Add New Deed Input */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newDeed}
                  onChange={(e) => setNewDeed(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddDeed(); }}
                  placeholder="e.g. Slew Hell Knight Mephistolon at extreme range with gas bullets in Turn 1"
                  className="flex-1 bg-[#0C0E12] border border-[#323846] rounded px-3 py-2 text-xs text-white placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  onClick={handleAddDeed}
                  className="px-3 py-2 bg-[#D4AF37] hover:bg-[#C49F27] text-black font-mono font-bold text-xs rounded uppercase flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Deed</span>
                </button>
              </div>

              {/* Deeds List */}
              {deeds.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-[#323846] rounded-md font-mono text-xs text-[#8E95A5]">
                  No heroic deeds recorded yet. Enter a deed above or record battle achievements in the Post-Battle Wizard.
                </div>
              ) : (
                <div className="space-y-2">
                  {deeds.map((deed, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between p-3 bg-[#0C0E12] border border-[#323846] rounded-md text-xs font-mono hover:border-[#D4AF37]/40 transition-colors"
                    >
                      <div className="flex items-start space-x-2.5">
                        <Award className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                        <span className="text-[#ECEFF4] leading-relaxed">{deed}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveDeed(idx)}
                        className="text-[#8E95A5] hover:text-[#E53935] p-1 rounded transition-colors ml-2"
                        title="Remove Deed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Honorific Titles & Epithets */}
          {activeTab === 'titles' && (
            <div className="space-y-4">
              <p className="text-xs text-[#8E95A5] font-mono">
                Award campaign epithets, military rank titles, and alchemical honorifics earned across matches.
              </p>

              {/* Add New Title Input */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddTitle(); }}
                  placeholder="e.g. The Relic Hound, Master of Construction, The Inaccurate"
                  className="flex-1 bg-[#0C0E12] border border-[#323846] rounded px-3 py-2 text-xs text-white placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  onClick={handleAddTitle}
                  className="px-3 py-2 bg-[#D4AF37] hover:bg-[#C49F27] text-black font-mono font-bold text-xs rounded uppercase flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Award Title</span>
                </button>
              </div>

              {/* Titles List */}
              {titles.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-[#323846] rounded-md font-mono text-xs text-[#8E95A5]">
                  No honorific titles bestowed yet.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {titles.map((title, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center space-x-2 px-3 py-1.5 bg-[#20242E] border border-[#D4AF37]/40 rounded-full text-xs font-mono text-[#D4AF37]"
                    >
                      <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                      <span className="font-bold">{title}</span>
                      <button
                        onClick={() => handleRemoveTitle(idx)}
                        className="text-[#8E95A5] hover:text-[#E53935]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-[#20242E] border-t border-[#323846] flex items-center justify-between">
          <span className="text-xs font-mono text-[#4E9A6E] flex items-center space-x-1">
            {isSaved && (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Dossier saved to warband chronicle</span>
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
