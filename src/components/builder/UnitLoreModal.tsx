'use client';

import React, { useState } from 'react';
import { ActiveUnit } from '../../types/warband';
import { useStore } from '../../store/useStore';
import { soundEffects } from '../../services/soundEffects';
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
  Edit3,
  Flame,
  CheckSquare,
  Square
} from 'lucide-react';

interface UnitLoreModalProps {
  warbandId: string;
  unit: ActiveUnit;
  onClose: () => void;
}

const COMMON_TITLES_POOL = [
  'the Living Engineer',
  'the Crippled',
  'the Undying',
  'Scourge of New Antioch',
  'Bearer of the Black Chalice',
  'Iron Champion',
  'the Merciful',
  'the Unbroken',
  'the Ironclad',
  'the Pious',
  'the Martyr',
  'the Heretic-Hunter',
  'the Blessed',
  'of the Red Sand',
  'the Unforgiven',
  'the Exalted Alchemist',
  'the Grim',
  'the Relentless'
];

export const UnitLoreModal: React.FC<UnitLoreModalProps> = ({ warbandId, unit, onClose }) => {
  const { updateUnitLore } = useStore();

  const [activeTab, setActiveTab] = useState<'titles' | 'deeds' | 'bio'>('titles');
  const [loreText, setLoreText] = useState(unit.lore || '');
  const [quoteText, setQuoteText] = useState(unit.quote || '');
  const [activeTitles, setActiveTitles] = useState<string[]>(unit.titles || []);
  const [customTitlesPool, setCustomTitlesPool] = useState<string[]>(COMMON_TITLES_POOL);
  const [deeds, setDeeds] = useState<string[]>(unit.deeds || []);

  const [newTitleInput, setNewTitleInput] = useState('');
  const [newDeedInput, setNewDeedInput] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleToggleTitle = (title: string) => {
    let updated: string[] = [];
    if (activeTitles.includes(title)) {
      updated = activeTitles.filter(t => t !== title);
    } else {
      updated = [...activeTitles, title];
    }
    setActiveTitles(updated);
    updateUnitLore(warbandId, unit.id, loreText, quoteText, updated, deeds);
    soundEffects.playCathedralBell();
  };

  const handleAddCustomTitle = () => {
    if (!newTitleInput.trim()) return;
    const title = newTitleInput.trim();
    if (!customTitlesPool.includes(title)) {
      setCustomTitlesPool(prev => [...prev, title]);
    }
    if (!activeTitles.includes(title)) {
      const updated = [...activeTitles, title];
      setActiveTitles(updated);
      updateUnitLore(warbandId, unit.id, loreText, quoteText, updated, deeds);
    }
    setNewTitleInput('');
    soundEffects.playCathedralBell();
  };

  const handleAddDeed = () => {
    if (!newDeedInput.trim()) return;
    const updated = [...deeds, newDeedInput.trim()];
    setDeeds(updated);
    setNewDeedInput('');
    updateUnitLore(warbandId, unit.id, loreText, quoteText, activeTitles, updated);
    soundEffects.playGunfire();
  };

  const handleRemoveDeed = (idx: number) => {
    const updated = deeds.filter((_, i) => i !== idx);
    setDeeds(updated);
    updateUnitLore(warbandId, unit.id, loreText, quoteText, activeTitles, updated);
  };

  const handleSaveBio = () => {
    updateUnitLore(warbandId, unit.id, loreText, quoteText, activeTitles, deeds);
    setIsSaved(true);
    soundEffects.playCathedralBell();
    setTimeout(() => setIsSaved(false), 2000);
  };

  const fullPreviewName = activeTitles.length > 0
    ? `${unit.customName}, ${activeTitles.join(', ')}`
    : unit.customName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto font-mono text-xs animate-fade-in">
      <div className="bg-[#161920] border-2 border-[#D4AF37] rounded-lg max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] bevel-container">
        
        {/* Modal Header */}
        <div className="p-4 bg-[#0C0E12] border-b border-[#323846] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center">
              <Scroll className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-gothic font-bold text-base sm:text-lg text-white">
                  {fullPreviewName}
                </h2>
              </div>
              <p className="text-xs text-[#8E95A5] font-mono">
                Base Profile: <strong className="text-[#ECEFF4]">{unit.profileSnapshot.name}</strong> • Titles, Heroic Feats & Dossier
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

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-4 pt-3 border-b border-[#323846] bg-[#161920] overflow-x-auto">
          <button
            onClick={() => setActiveTab('titles')}
            className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'titles' 
                ? 'border-[#D4AF37] text-[#D4AF37] bg-[#20242E]/80 rounded-t' 
                : 'border-transparent text-[#8E95A5] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Title Management ({activeTitles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('deeds')}
            className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'deeds' 
                ? 'border-[#D4AF37] text-[#D4AF37] bg-[#20242E]/80 rounded-t' 
                : 'border-transparent text-[#8E95A5] hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Heroic Feats ({deeds.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bio')}
            className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'bio' 
                ? 'border-[#D4AF37] text-[#D4AF37] bg-[#20242E]/80 rounded-t' 
                : 'border-transparent text-[#8E95A5] hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Biography & Battlefield Quote</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: TITLE MANAGEMENT */}
          {activeTab === 'titles' && (
            <div className="space-y-4">
              
              {/* Title Management Banner */}
              <div className="p-3.5 bg-[#0C0E12] rounded border border-[#323846] space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-[#8E95A5] block">
                  Active Display Name:
                </span>
                <strong className="text-base font-gothic text-[#D4AF37] block">
                  {fullPreviewName}
                </strong>
                <p className="text-[11px] text-[#8E95A5] leading-relaxed">
                  Select one or more honorific titles from the pool below, or type a custom title to affix to this warrior's name.
                </p>
              </div>

              {/* Add Custom Title */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter custom title (e.g. 'the Unforgiven', 'of the Iron Wall')..."
                  value={newTitleInput}
                  onChange={(e) => setNewTitleInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTitle()}
                  className="flex-1 bg-[#0C0E12] border border-[#323846] rounded p-2 text-xs text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  onClick={handleAddCustomTitle}
                  disabled={!newTitleInput.trim()}
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded text-xs shadow flex items-center space-x-1 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Title</span>
                </button>
              </div>

              {/* Title Selection Pool */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#8E95A5] block">
                  Available Honorific Titles Pool:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {customTitlesPool.map((title) => {
                    const isSelected = activeTitles.includes(title);
                    return (
                      <div
                        key={title}
                        onClick={() => handleToggleTitle(title)}
                        className={`p-2.5 rounded border cursor-pointer flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-[#20242E] border-[#D4AF37] text-[#D4AF37] ring-1 ring-[#D4AF37]/40 font-bold'
                            : 'bg-[#0C0E12] border-[#323846] text-[#ECEFF4] hover:border-[#8E95A5]'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-[#8E95A5] flex-shrink-0" />
                          )}
                          <span className="truncate">{title}</span>
                        </div>
                        {isSelected && (
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#D4AF37] text-black font-bold">
                            Active
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: HEROIC FEATS & GLORIOUS DEEDS */}
          {activeTab === 'deeds' && (
            <div className="space-y-4">
              
              <div className="p-3.5 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
                <strong className="text-xs uppercase text-[#D4AF37] font-bold block">
                  Battlefield Feats & Glorious Deeds
                </strong>
                <p className="text-[11px] text-[#8E95A5] leading-relaxed">
                  Record permanent heroic achievements, critical match milestones, and post-battle Glorious Deeds awarded to this warrior.
                </p>
              </div>

              {/* Add Custom Deed Form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Record new feat (e.g. 'Slew the Sorcerer Zortan in Sector 4', 'Heroic Trench Stand')..."
                  value={newDeedInput}
                  onChange={(e) => setNewDeedInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDeed()}
                  className="flex-1 bg-[#0C0E12] border border-[#323846] rounded p-2 text-xs text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  onClick={handleAddDeed}
                  disabled={!newDeedInput.trim()}
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded text-xs shadow flex items-center space-x-1 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Feat</span>
                </button>
              </div>

              {/* Deeds List */}
              <div className="space-y-2">
                {deeds.length === 0 ? (
                  <p className="text-xs text-[#8E95A5] italic p-6 bg-[#0C0E12] rounded border border-[#323846] text-center">
                    No heroic feats recorded yet. Accomplish Glorious Deeds in Tabletop Combat or add manual battle entries above.
                  </p>
                ) : (
                  deeds.map((deed, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#0C0E12] rounded border border-[#323846] flex items-center justify-between gap-3 hover:border-[#D4AF37]/50 transition-colors"
                    >
                      <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                        <Award className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                        <span className="text-xs text-[#ECEFF4]">{deed}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveDeed(idx)}
                        className="text-[#8E95A5] hover:text-[#E53935] p-1"
                        title="Delete Feat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 3: BIOGRAPHY & QUOTE */}
          {activeTab === 'bio' && (
            <div className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#8E95A5] flex items-center space-x-1">
                  <Quote className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Battle Cry / Iconic Quote:</span>
                </label>
                <input
                  type="text"
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  placeholder="e.g. 'By fire and brimstone, the Sultan's domain shall endure!'"
                  className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-xs text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#8E95A5] flex items-center space-x-1">
                  <BookOpen className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Warrior Biography & Narrative Lore:</span>
                </label>
                <textarea
                  rows={6}
                  value={loreText}
                  onChange={(e) => setLoreText(e.target.value)}
                  placeholder="Record this warrior's origin, background, faith, and deeds in the trenches..."
                  className="w-full bg-[#0C0E12] border border-[#323846] rounded p-3 text-xs text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37] leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={handleSaveBio}
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded text-xs shadow flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaved ? '✓ Biography Saved!' : 'Save Dossier'}</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0C0E12] border-t border-[#323846] flex items-center justify-between">
          <span className="text-[10px] text-[#8E95A5]">
            Name: <strong className="text-[#D4AF37]">{fullPreviewName}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded text-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
