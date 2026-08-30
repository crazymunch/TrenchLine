'use client';

import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { ActiveUnit, UnitTitleRecord } from '../../types/warband';
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
  Edit3, 
  Flame, 
  Trophy, 
  CheckSquare, 
  Square,
  Eye,
  EyeOff
} from 'lucide-react';

interface UnitLoreModalProps {
  warbandId: string;
  unit: ActiveUnit;
  onClose: () => void;
}

export const UnitLoreModal: React.FC<UnitLoreModalProps> = ({ warbandId, unit, onClose }) => {
  const { 
    updateUnitLore, 
    updateUnitName, 
    addUnitTitleRecord, 
    toggleUnitTitleActive, 
    removeUnitTitleRecord,
    setUnitTitleRecords 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'titles' | 'deeds' | 'bio'>('titles');

  
  // Clean base name
  const [baseName, setBaseName] = useState<string>(unit.customName || unit.profileSnapshot.name);
  const [loreText, setLoreText] = useState(unit.lore || '');
  const [quoteText, setQuoteText] = useState(unit.quote || '');
  
  // Initialize title records from existing titleRecords or map from legacy titles string array
  const initialRecords: UnitTitleRecord[] = unit.titleRecords && unit.titleRecords.length > 0
    ? unit.titleRecords
    : (unit.titles || []).map(t => ({
        title: t,
        source: 'user',
        origin: 'User Custom Title',
        active: true
      }));

  const [titleRecords, setTitleRecords] = useState<UnitTitleRecord[]>(initialRecords);
  const [deeds, setDeeds] = useState<string[]>(unit.deeds || []);

  const [newTitleInput, setNewTitleInput] = useState('');
  const [newDeedInput, setNewDeedInput] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Sync active titles list
  const activeTitlesList = titleRecords.filter(r => r.active).map(r => r.title);

  const handleSaveNameAndDossier = (updatedRecords?: UnitTitleRecord[]) => {
    const recordsToSave = updatedRecords || titleRecords;
    const cleanName = baseName.trim() || unit.profileSnapshot.name;
    const activeTitles = recordsToSave.filter(r => r.active).map(r => r.title);

    updateUnitName(warbandId, unit.id, cleanName);
    setUnitTitleRecords(warbandId, unit.id, recordsToSave);
    updateUnitLore(warbandId, unit.id, loreText, quoteText, activeTitles, deeds);

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAddTitle = () => {
    if (!newTitleInput.trim()) return;
    const title = newTitleInput.trim();
    
    // Check if already exists in records
    const existingIdx = titleRecords.findIndex(r => r.title.toLowerCase() === title.toLowerCase());
    let updated: UnitTitleRecord[];
    if (existingIdx >= 0) {
      updated = titleRecords.map((r, idx) => idx === existingIdx ? { ...r, active: true } : r);
    } else {
      updated = [
        ...titleRecords,
        {
          title,
          source: 'user',
          origin: 'User Custom Title',
          active: true
        }
      ];
    }

    setTitleRecords(updated);
    handleSaveNameAndDossier(updated);
    setNewTitleInput('');
  };

  const handleToggleTitleActive = (idx: number) => {
    const updated = titleRecords.map((r, i) => i === idx ? { ...r, active: !r.active } : r);
    setTitleRecords(updated);
    handleSaveNameAndDossier(updated);
  };

  const handleRemoveTitleRecord = (idx: number) => {
    const updated = titleRecords.filter((_, i) => i !== idx);
    setTitleRecords(updated);
    handleSaveNameAndDossier(updated);
  };

  const handleAddDeed = () => {
    if (!newDeedInput.trim()) return;
    const updated = [...deeds, newDeedInput.trim()];
    setDeeds(updated);
    setNewDeedInput('');
    updateUnitLore(warbandId, unit.id, loreText, quoteText, activeTitlesList, updated);
  };

  const handleRemoveDeed = (idx: number) => {
    const updated = deeds.filter((_, i) => i !== idx);
    setDeeds(updated);
    updateUnitLore(warbandId, unit.id, loreText, quoteText, activeTitlesList, updated);
  };

  // Safe full name preview
  const safeBaseName = baseName.trim() || unit.profileSnapshot.name;
  const titlesToDisplay = activeTitlesList.filter(t => !safeBaseName.toLowerCase().includes(t.toLowerCase()));
  const fullPreviewName = titlesToDisplay.length > 0
    ? `${safeBaseName}, ${titlesToDisplay.join(', ')}`
    : safeBaseName;

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title={`${fullPreviewName}`}
      subtitle={`Base Profile: <strong className="text-theme-text">${unit.profileSnapshot.name}</strong> • Titles, Heroic Feats & Dossier`}
    >
      {/* Tab Navigation */}
      <div className="flex items-center space-x-1 px-4 pt-3 border-b border-theme-border bg-theme-surface overflow-x-auto">
        <button
          onClick={() => setActiveTab('titles')}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'titles' 
              ? 'border-theme-primary text-theme-primary bg-theme-elevated/80 rounded-t' 
              : 'border-transparent text-theme-muted hover:text-theme-text'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Title Repository ({titleRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('deeds')}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'deeds' 
              ? 'border-theme-primary text-theme-primary bg-theme-elevated/80 rounded-t' 
              : 'border-transparent text-theme-muted hover:text-theme-text'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Heroic Feats ({deeds.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bio')}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'bio' 
              ? 'border-theme-primary text-theme-primary bg-theme-elevated/80 rounded-t' 
              : 'border-transparent text-theme-muted hover:text-theme-text'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Biography & Battlefield Quote</span>
        </button>
      </div>
      {/* Tab Content */}
      <div className="p-5 overflow-y-auto space-y-4 flex-1">
  
        {/* TAB 1: NAME & TITLE MANAGEMENT */}
        {activeTab === 'titles' && (
          <div className="space-y-4">
      
            {/* Name Edit Card */}
            <div className="p-4 bg-theme-base rounded border border-theme-border space-y-3">
              <label className="text-xs sm:text-[11px] uppercase font-bold text-theme-primary block flex items-center space-x-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                <span>Warrior Base Name:</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={baseName}
                  onChange={(e) => setBaseName(e.target.value)}
                  placeholder="Enter base warrior name (e.g. Kasim bin Malik)..."
                  className="flex-1 bg-theme-surface border border-theme-border rounded p-2 text-xs text-theme-text font-gothic text-sm focus:outline-none focus:border-theme-primary"
                />
                <button
                  onClick={() => handleSaveNameAndDossier()}
                  className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded text-xs shadow flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Name</span>
                </button>
              </div>
              <div className="text-xs sm:text-[11px] text-theme-muted">
                Full Display Name Preview: <strong className="text-theme-text">{fullPreviewName}</strong>
              </div>
            </div>

            {/* Add Custom Title Input */}
            <div className="p-4 bg-theme-base rounded border border-theme-border space-y-3">
              <label className="text-xs sm:text-[11px] uppercase font-bold text-theme-primary block flex items-center space-x-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Title:</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type custom title to add (e.g. 'the Living Engineer', 'the Undying', 'the Unbroken')..."
                  value={newTitleInput}
                  onChange={(e) => setNewTitleInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTitle()}
                  className="flex-1 bg-theme-surface border border-theme-border rounded p-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary"
                />
                <button
                  onClick={handleAddTitle}
                  disabled={!newTitleInput.trim()}
                  className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded text-xs shadow flex items-center space-x-1 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Title</span>
                </button>
              </div>
            </div>

            {/* Title Repository List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted block">
                  Warrior Title Repository ({titleRecords.length}):
                </span>
                <span className="text-xs sm:text-[10px] text-theme-primary">
                  {titleRecords.filter(r => r.active).length} Active in Display Name
                </span>
              </div>

              {titleRecords.length === 0 ? (
                <div className="p-6 bg-theme-base rounded border border-theme-border text-center text-theme-muted italic">
                  No titles in repository. Add custom titles above or earn special titles through trauma injuries and legendary exploration!
                </div>
              ) : (
                <div className="space-y-2">
                  {titleRecords.map((rec, idx) => {
                    const isEarned = rec.source !== 'user';
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded border flex items-center justify-between gap-3 transition-all ${
                          rec.active
                            ? isEarned
                              ? 'bg-theme-elevated border-theme-primary ring-1 ring-theme-primary/40'
                              : 'bg-theme-surface border-theme-primary/60'
                            : 'bg-theme-base border-theme-border opacity-75 hover:opacity-100'
                        }`}
                      >
                        {/* Title Info & Icon */}
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            {isEarned ? (
                              <div className="w-7 h-7 rounded-full bg-theme-primary/20 border border-theme-primary flex items-center justify-center text-theme-primary" title={rec.origin || 'Special Earned Title'}>
                                <Trophy className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-theme-border flex items-center justify-center text-theme-muted" title="User Added Title">
                                <Sparkles className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <strong className="text-xs text-theme-text font-gothic text-sm block truncate">
                              {rec.title}
                            </strong>
                            <span className="text-xs sm:text-[10px] text-theme-muted font-mono block truncate">
                              {rec.origin || (isEarned ? 'Special Earned Title' : 'User Added Title')}
                            </span>
                          </div>
                        </div>

                        {/* Action Controls: Toggle on/off & Delete */}
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <button
                            onClick={() => handleToggleTitleActive(idx)}
                            className={`px-2.5 py-1 rounded text-xs sm:text-[10px] font-bold uppercase transition-all flex items-center space-x-1 ${
                              rec.active
                                ? 'bg-theme-primary text-theme-base shadow'
                                : 'bg-theme-elevated text-theme-muted border border-theme-border hover:text-theme-text'
                            }`}
                            title={rec.active ? 'Click to hide from display name' : 'Click to show in display name'}
                          >
                            {rec.active ? (
                              <>
                                <Eye className="w-3 h-3" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3" />
                                <span>Hidden</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleRemoveTitleRecord(idx)}
                            className="text-theme-muted hover:text-status-error p-1.5 rounded hover:bg-theme-accent/20 transition-colors"
                            title="Delete from repository"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: HEROIC FEATS & GLORIOUS DEEDS */}
        {activeTab === 'deeds' && (
          <div className="space-y-4">
      
            <div className="p-3.5 bg-theme-base rounded border border-theme-border space-y-1">
              <strong className="text-xs uppercase text-theme-primary font-bold block">
                Battlefield Feats & Glorious Deeds
              </strong>
              <p className="text-xs sm:text-[11px] text-theme-muted leading-relaxed">
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
                className="flex-1 bg-theme-base border border-theme-border rounded p-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary"
              />
              <button
                onClick={handleAddDeed}
                disabled={!newDeedInput.trim()}
                className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded text-xs shadow flex items-center space-x-1 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Feat</span>
              </button>
            </div>

            {/* Deeds List */}
            <div className="space-y-2">
              {deeds.length === 0 ? (
                <p className="text-xs text-theme-muted italic p-6 bg-theme-base rounded border border-theme-border text-center">
                  No heroic feats recorded yet. Accomplish Glorious Deeds in Tabletop Combat or add manual battle entries above.
                </p>
              ) : (
                deeds.map((deed, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-theme-base rounded border border-theme-border flex items-center justify-between gap-3 hover:border-theme-primary/50 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                      <Award className="w-4 h-4 text-theme-primary flex-shrink-0" />
                      <span className="text-xs text-theme-text">{deed}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveDeed(idx)}
                      className="text-theme-muted hover:text-status-error p-1"
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
              <label className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted flex items-center space-x-1">
                <Quote className="w-3.5 h-3.5 text-theme-primary" />
                <span>Battle Cry / Iconic Quote:</span>
              </label>
              <input
                type="text"
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="e.g. 'By fire and brimstone, the Sultan's domain shall endure!'"
                className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted flex items-center space-x-1">
                <BookOpen className="w-3.5 h-3.5 text-theme-primary" />
                <span>Warrior Biography & Narrative Lore:</span>
              </label>
              <textarea
                rows={6}
                value={loreText}
                onChange={(e) => setLoreText(e.target.value)}
                placeholder="Record this warrior's origin, background, faith, and deeds in the trenches..."
                className="w-full bg-theme-base border border-theme-border rounded p-3 text-xs text-theme-text focus:outline-none focus:border-theme-primary leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => handleSaveNameAndDossier()}
                className="px-5 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded text-xs shadow flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isSaved ? '✓ Biography Saved!' : 'Save Dossier'}</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </Sheet>
  );
};
