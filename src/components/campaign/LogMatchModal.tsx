'use client';

import React, { useState } from 'react';
import { useOverlay } from '../ui/useOverlay';
import { useStore } from '../../store/useStore';
import { useScenarios } from '../../rules/useScenarios';
import { soundEffects } from '../../services/soundEffects';
import { 
  X, 
  Swords, 
  Trophy, 
  Sparkles, 
  Coins, 
  FileText, 
  CheckCircle,
  Skull
} from 'lucide-react';

interface LogMatchModalProps {
  onClose: () => void;
}

export const LogMatchModal: React.FC<LogMatchModalProps> = ({ onClose }) => {
  const { campaign, logCampaignMatch } = useStore();
  // The derived twelve plus the All Out War pack. The hand-written scenarios
  // this replaced had the wrong game length for all twelve.
  const { scenarios } = useScenarios();

  // Scroll lock, focus trap and Escape (docs/MOBILE.md §7).
  const overlayRef = useOverlay(true, onClose);

  const members = campaign.members;
  const [p1WbId, setP1WbId] = useState<string>(members[0]?.warbandId || '');
  const [p2WbId, setP2WbId] = useState<string>(members[1]?.warbandId || members[0]?.warbandId || '');
  // Empty until the dataset loads, so the default is applied once it has.
  const [scenarioName, setScenarioName] = useState<string>('');
  const [outcome, setOutcome] = useState<'p1' | 'p2' | 'draw'>('p1');
  const [p1Glory, setP1Glory] = useState<number>(3);
  const [p1Ducats, setP1Ducats] = useState<number>(30);
  const [p2Glory, setP2Glory] = useState<number>(1);
  const [p2Ducats, setP2Ducats] = useState<number>(15);
  const [narrative, setNarrative] = useState<string>('');

  const p1Member = members.find((m) => m.warbandId === p1WbId) || members[0];
  const p2Member = members.find((m) => m.warbandId === p2WbId) || members[1];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!p1WbId || !p2WbId) return;

    logCampaignMatch(
      p1WbId,
      p2WbId,
      // The select shows the first scenario until one is picked, so the logged
      // name has to resolve the same way rather than recording an empty string.
      scenarioName || scenarios[0]?.name || '',
      outcome,
      p1Glory,
      p1Ducats,
      p2Glory,
      p2Ducats,
      narrative.trim()
    );

    soundEffects.playCathedralBell();
    onClose();
  };

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-theme-surface border-2 border-theme-primary w-full max-w-2xl max-h-[90dvh] rounded-md flex flex-col shadow-2xl overflow-hidden bevel-container">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border bg-theme-base">
          <div className="flex items-center space-x-3">
            <Swords className="w-6 h-6 text-theme-primary" />
            <div>
              <h2 className="font-gothic font-bold text-lg text-theme-text">
                LOG CAMPAIGN BATTLE REPORT
              </h2>
              <p className="text-xs font-mono text-theme-muted">
                Record the outcome of a match between two crusade warbands
              </p>
            </div>
          </div>
          <button onClick={onClose} className="tap p-1 text-theme-muted hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Participants */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Player 1 */}
            <div className="p-4 bg-theme-elevated rounded border border-theme-border space-y-2">
              <label className="block text-xs font-mono uppercase text-theme-primary font-bold">
                Combatant 1:
              </label>
              <select
                value={p1WbId}
                onChange={(e) => setP1WbId(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs font-mono text-theme-text focus:outline-none"
              >
                {members.map((m) => (
                  <option key={m.warbandId} value={m.warbandId}>
                    {m.warbandName} ({m.playerName})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                <div>
                  <span className="text-xs sm:text-[10px] text-theme-muted block">Glory Won</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={p1Glory}
                    onChange={(e) => setP1Glory(parseInt(e.target.value) || 0)}
                    className="w-full bg-theme-base border border-theme-border rounded p-1.5 text-xs text-theme-text"
                  />
                </div>
                <div>
                  <span className="text-xs sm:text-[10px] text-theme-muted block">Ducats Looted</span>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    step="5"
                    value={p1Ducats}
                    onChange={(e) => setP1Ducats(parseInt(e.target.value) || 0)}
                    className="w-full bg-theme-base border border-theme-border rounded p-1.5 text-xs text-theme-text"
                  />
                </div>
              </div>
            </div>

            {/* Player 2 */}
            <div className="p-4 bg-theme-elevated rounded border border-theme-border space-y-2">
              <label className="block text-xs font-mono uppercase text-status-error font-bold">
                Combatant 2:
              </label>
              <select
                value={p2WbId}
                onChange={(e) => setP2WbId(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs font-mono text-theme-text focus:outline-none"
              >
                {members.map((m) => (
                  <option key={m.warbandId} value={m.warbandId}>
                    {m.warbandName} ({m.playerName})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                <div>
                  <span className="text-xs sm:text-[10px] text-theme-muted block">Glory Won</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={p2Glory}
                    onChange={(e) => setP2Glory(parseInt(e.target.value) || 0)}
                    className="w-full bg-theme-base border border-theme-border rounded p-1.5 text-xs text-theme-text"
                  />
                </div>
                <div>
                  <span className="text-xs sm:text-[10px] text-theme-muted block">Ducats Looted</span>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    step="5"
                    value={p2Ducats}
                    onChange={(e) => setP2Ducats(parseInt(e.target.value) || 0)}
                    className="w-full bg-theme-base border border-theme-border rounded p-1.5 text-xs text-theme-text"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Scenario & Match Outcome */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div>
              <label className="block text-xs font-mono uppercase text-theme-muted mb-1 font-bold">
                Scenario Played:
              </label>
              <select
                value={scenarioName || scenarios[0]?.name || ''}
                onChange={(e) => setScenarioName(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs font-mono text-theme-text focus:outline-none"
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
                <option value="Custom Scenario">Custom Scenario / Sector Assault</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-theme-muted mb-1 font-bold">
                Match Result:
              </label>
              <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setOutcome('p1')}
                  className={`py-2 rounded font-bold uppercase ${
                    outcome === 'p1' ? 'bg-theme-primary text-black shadow' : 'bg-theme-base text-theme-muted border border-theme-border'
                  }`}
                >
                  P1 Won
                </button>
                <button
                  type="button"
                  onClick={() => setOutcome('p2')}
                  className={`py-2 rounded font-bold uppercase ${
                    outcome === 'p2' ? 'bg-status-error text-white shadow' : 'bg-theme-base text-theme-muted border border-theme-border'
                  }`}
                >
                  P2 Won
                </button>
                <button
                  type="button"
                  onClick={() => setOutcome('draw')}
                  className={`py-2 rounded font-bold uppercase ${
                    outcome === 'draw' ? 'bg-status-legal text-white shadow' : 'bg-theme-base text-theme-muted border border-theme-border'
                  }`}
                >
                  Draw
                </button>
              </div>
            </div>

          </div>

          {/* Narrative Log */}
          <div>
            <label className="block text-xs font-mono uppercase text-theme-muted mb-1 font-bold">
              Battle Chronicle Summary:
            </label>
            <textarea
              rows={3}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="e.g. A ferocious assault across the barbed wire. Lieutenant Valerius secured the central bunker despite heavy sniper fire."
              className="w-full bg-theme-base border border-theme-border rounded p-2.5 text-xs font-mono text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-theme-border flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-theme-elevated hover:bg-theme-border text-theme-text font-mono text-xs font-bold uppercase rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-theme-primary hover:bg-theme-primary-hover text-black font-mono text-xs font-bold uppercase rounded shadow flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Record to Chronicle</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
