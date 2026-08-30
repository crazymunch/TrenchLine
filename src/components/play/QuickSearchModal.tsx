'use client';

import React, { useState } from 'react';
import { useOverlay } from '../ui/useOverlay';
import { useStore } from '../../store/useStore';
import { useDataset } from '../../rules/useDataset';
import { useScenarios } from '../../rules/useScenarios';
import { DEFAULT_RULESET_ID } from '../../rules/rulesets';
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
  // The derived twelve plus the All Out War pack.
  const { scenarios } = useScenarios();

  // Scroll lock, focus trap and Escape (docs/MOBILE.md §7).
  const overlayRef = useOverlay(true, onClose);
  const [searchTerm, setSearchTerm] = useState('');

  const term = searchTerm.toLowerCase().trim();

  // The Trauma Table and the Keyword Glossary, both derived. The hand-written
  // INJURY_TABLE_D66 this replaced was a re-export of the fabricated tables
  // (AUDIT §1.13), and the hand-written glossary invented two keywords.
  const searchRulesetId = typeof window !== 'undefined'
    ? window.localStorage.getItem('trenchline_ruleset') || DEFAULT_RULESET_ID
    : DEFAULT_RULESET_ID;
  const { dataset: searchDataset } = useDataset(searchRulesetId);

  const filteredKeywords = (searchDataset?.keywords ?? []).filter(
    (k) => k.name.toLowerCase().includes(term) || (k.description || '').toLowerCase().includes(term)
  );

  const filteredScenarios = scenarios.filter(
    (s) => s.name.toLowerCase().includes(term)
      || s.tagline.toLowerCase().includes(term)
      || (s.entry?.sections ?? []).some((sec) => sec.body.toLowerCase().includes(term))
  );

  const filteredInjuries = (searchDataset?.campaign.trauma ?? [])
    .map((t) => ({ roll: t.roll, title: t.name, name: t.name, effect: t.description, description: t.description }))
    .filter((i) =>
      i.title.toLowerCase().includes(term) ||
      i.effect.toLowerCase().includes(term) ||
      i.roll.includes(term));

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-theme-surface border-2 border-theme-primary w-full max-w-2xl max-h-[85dvh] rounded-md flex flex-col shadow-2xl overflow-hidden bevel-container">
        
        {/* Search Header */}
        <div className="p-4 border-b border-theme-border bg-theme-base flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-theme-primary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Quick search rules, keywords, scenarios, or D66 injury rolls..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-theme-surface border border-theme-border rounded pl-9 pr-3 py-2 text-xs font-mono text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary"
            />
          </div>
          <button onClick={onClose} className="p-1 text-theme-muted hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Keywords Section */}
          {filteredKeywords.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold text-theme-primary uppercase tracking-wider flex items-center space-x-1.5 border-b border-theme-border pb-1">
                <Tag className="w-3.5 h-3.5" />
                <span>Rule Keywords ({filteredKeywords.length})</span>
              </h3>
              <div className="space-y-2">
                {filteredKeywords.map((k) => (
                  <div key={k.name} className="p-3 bg-theme-base rounded border border-theme-border space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-gothic font-bold text-sm text-theme-text">{k.name}</span>
                      {k.type && (
                        <span className="text-[9px] font-mono uppercase bg-theme-elevated text-theme-primary px-1.5 py-0.2 rounded">
                          {k.type}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-theme-text font-mono bg-theme-surface p-2 rounded mt-1 border border-theme-border/60">
                      {k.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Injury Chart Results */}
          {filteredInjuries.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold text-status-error uppercase tracking-wider flex items-center space-x-1.5 border-b border-theme-border pb-1">
                <Skull className="w-3.5 h-3.5" />
                <span>D66 Injury Chart ({filteredInjuries.length})</span>
              </h3>
              <div className="space-y-2">
                {filteredInjuries.map((inj) => (
                  <div key={inj.roll} className="p-3 bg-theme-base rounded border border-theme-border flex items-start justify-between gap-3">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-theme-accent text-white">
                      Roll {inj.roll}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-gothic font-bold text-xs text-theme-text">{inj.title}</h4>
                      <p className="text-xs text-theme-muted mt-0.5">{inj.effect}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scenario Results */}
          {filteredScenarios.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold text-status-legal uppercase tracking-wider flex items-center space-x-1.5 border-b border-theme-border pb-1">
                <Compass className="w-3.5 h-3.5" />
                <span>Scenarios ({filteredScenarios.length})</span>
              </h3>
              <div className="space-y-2">
                {filteredScenarios.map((sc) => (
                  <div key={sc.id} className="p-3 bg-theme-base rounded border border-theme-border space-y-1.5">
                    <h4 className="font-gothic font-bold text-sm text-theme-text">{sc.name}</h4>
                    <p className="text-xs text-theme-muted italic">{sc.tagline}</p>
                    {/* The published victory conditions, or nothing. The
                        hand-written scenarios this replaced had them wrong. */}
                    {sc.entry?.sections
                      .filter((sec) => sec.heading === 'VICTORY CONDITIONS' || sec.heading === 'GAME LENGTH')
                      .map((sec) => (
                        <div key={sec.heading} className="text-xs font-mono text-theme-primary bg-theme-surface p-2 rounded">
                          <strong>{sec.heading}:</strong> {sec.body.replace(/\*\*/g, '').replace(/\n+/g, ' ')}
                        </div>
                      ))}
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
