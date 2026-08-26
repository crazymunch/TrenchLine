'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { INJURY_TABLE_D66, EXPLORATION_TABLE_D66 } from '../../data/defaultRules';
import { 
  X, 
  Search, 
  BookOpen, 
  Tag, 
  Skull, 
  Compass, 
  Swords, 
  Shield 
} from 'lucide-react';

interface QuickSearchModalProps {
  onClose: () => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({ onClose }) => {
  const { keywords, scenarios, weapons, armour } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  const term = searchTerm.toLowerCase().trim();

  const filteredKeywords = keywords.filter(
    (k) => k.name.toLowerCase().includes(term) || k.summary.toLowerCase().includes(term) || k.fullText.toLowerCase().includes(term)
  );

  const filteredScenarios = scenarios.filter(
    (s) => s.name.toLowerCase().includes(term) || s.flavor.toLowerCase().includes(term)
  );

  const filteredInjuries = INJURY_TABLE_D66.filter(
    (i) => i.title.toLowerCase().includes(term) || i.effect.toLowerCase().includes(term) || i.roll.includes(term)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-2xl max-h-[85vh] rounded-md flex flex-col shadow-2xl overflow-hidden bevel-container">
        
        {/* Search Header */}
        <div className="p-4 border-b border-[#323846] bg-[#0C0E12] flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Quick search rules, keywords, scenarios, or D66 injury rolls..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#161920] border border-[#323846] rounded pl-9 pr-3 py-2 text-xs font-mono text-[#ECEFF4] placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          <button onClick={onClose} className="p-1 text-[#8E95A5] hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Keywords Section */}
          {filteredKeywords.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-wider flex items-center space-x-1.5 border-b border-[#323846] pb-1">
                <Tag className="w-3.5 h-3.5" />
                <span>Rule Keywords ({filteredKeywords.length})</span>
              </h3>
              <div className="space-y-2">
                {filteredKeywords.map((k) => (
                  <div key={k.name} className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-gothic font-bold text-sm text-[#ECEFF4]">{k.name}</span>
                      <span className="text-[9px] font-mono uppercase bg-[#20242E] text-[#D4AF37] px-1.5 py-0.2 rounded">
                        {k.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#8E95A5]">{k.summary}</p>
                    <p className="text-xs text-[#ECEFF4] font-mono bg-[#161920] p-2 rounded mt-1 border border-[#323846]/60">
                      {k.fullText}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Injury Chart Results */}
          {filteredInjuries.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold text-[#E53935] uppercase tracking-wider flex items-center space-x-1.5 border-b border-[#323846] pb-1">
                <Skull className="w-3.5 h-3.5" />
                <span>D66 Injury Chart ({filteredInjuries.length})</span>
              </h3>
              <div className="space-y-2">
                {filteredInjuries.map((inj) => (
                  <div key={inj.roll} className="p-3 bg-[#0C0E12] rounded border border-[#323846] flex items-start justify-between gap-3">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#8B0000] text-white">
                      Roll {inj.roll}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-gothic font-bold text-xs text-[#ECEFF4]">{inj.title}</h4>
                      <p className="text-xs text-[#8E95A5] mt-0.5">{inj.effect}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scenario Results */}
          {filteredScenarios.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold text-[#4E9A6E] uppercase tracking-wider flex items-center space-x-1.5 border-b border-[#323846] pb-1">
                <Compass className="w-3.5 h-3.5" />
                <span>Scenarios ({filteredScenarios.length})</span>
              </h3>
              <div className="space-y-2">
                {filteredScenarios.map((sc) => (
                  <div key={sc.id} className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1.5">
                    <h4 className="font-gothic font-bold text-sm text-[#ECEFF4]">{sc.name}</h4>
                    <p className="text-xs text-[#8E95A5] italic">{sc.flavor}</p>
                    <div className="text-xs font-mono text-[#D4AF37] bg-[#161920] p-2 rounded">
                      <strong>Victory:</strong> {sc.victoryConditions}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
