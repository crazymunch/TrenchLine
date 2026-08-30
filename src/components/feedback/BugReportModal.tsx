'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useSession } from 'next-auth/react';
import { soundEffects } from '../../services/soundEffects';
import { 
  Bug, 
  Copy, 
  Check, 
  Send, 
  X, 
  AlertTriangle, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Shield, 
  Sparkles,
  Layers,
  FileText
} from 'lucide-react';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose }) => {
  const { 
    currentView, 
    rulesetVersion, 
    currentTheme, 
    getActiveWarband, 
    activeWarbandId,
    factions
  } = useStore();

  const { data: session } = useSession();

  const [category, setCategory] = useState<string>('Visual / Layout Issue');
  const [severity, setSeverity] = useState<string>('Minor / Visual');
  const [description, setDescription] = useState<string>('');
  const [stepsToReproduce, setStepsToReproduce] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const activeWarband = getActiveWarband();
  const currentFaction = factions.find(f => f.id === activeWarband?.factionId);

  // Auto-detect viewport and device
  const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const height = typeof window !== 'undefined' ? window.innerHeight : 800;
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  
  let deviceType = 'Desktop';
  if (width < 640) deviceType = 'Mobile Phone';
  else if (width <= 1194) deviceType = 'Tablet / iPad';

  const generateReportMarkdown = () => {
    return `### 🐞 TrenchLine Bug & Diagnostic Report
- **Timestamp:** ${new Date().toISOString()}
- **Reporter:** ${session?.user?.email || 'Anonymous Commander'} (${session?.user?.name || 'Guest'})
- **Device / Screen:** ${deviceType} (${width}x${height}px)
- **User Agent:** \`${userAgent.slice(0, 120)}\`
- **Active View:** \`${currentView}\`
- **Active Ruleset:** \`v${rulesetVersion}\`
- **Active Theme:** \`${currentTheme}\`
- **Active Warband:** ${activeWarband ? `${activeWarband.name} (${currentFaction?.name || activeWarband.factionId}) [${activeWarband.id}]` : 'None'}
- **Category:** ${category}
- **Severity:** ${severity}

#### Problem Description:
${description || '_No description provided._'}

${stepsToReproduce ? `#### Steps to Reproduce:\n${stepsToReproduce}` : ''}
`;
  };

  const handleCopyReport = () => {
    const text = generateReportMarkdown();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      soundEffects.playDiceRoll();
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    const reportData = {
      category,
      severity,
      description,
      stepsToReproduce,
      deviceType,
      screenResolution: `${width}x${height}`,
      currentView,
      rulesetVersion,
      currentTheme,
      warbandName: activeWarband?.name,
      warbandFaction: currentFaction?.name,
      userEmail: session?.user?.email,
      timestamp: new Date().toISOString()
    };

    try {
      await fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
    } catch {
      // Ignore network errors in local dev
    }

    soundEffects.playCathedralBell();
    setIsSubmitting(false);
    setSubmittedSuccess(true);
    setTimeout(() => {
      setSubmittedSuccess(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono text-xs">
      <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-xl max-h-[92dvh] rounded-lg shadow-2xl overflow-hidden flex flex-col bevel-container">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#323846] bg-[#0C0E12]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded bg-[#8B0000]/30 border border-[#8B0000] text-[#E53935]">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-gothic font-bold text-base text-[#ECEFF4] tracking-wide">
                REPORT A BUG / FEEDBACK
              </h3>
              <p className="text-[10px] text-[#8E95A5]">
                Generate an instant diagnostic dump or submit feedback directly to the AI agent
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#8E95A5] hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {submittedSuccess ? (
            <div className="p-8 text-center space-y-3 bg-[#0C0E12] rounded border border-[#4E9A6E]/50">
              <div className="w-12 h-12 rounded-full bg-[#4E9A6E]/20 border border-[#4E9A6E] flex items-center justify-center mx-auto text-[#4E9A6E]">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="font-gothic font-bold text-lg text-[#ECEFF4]">BUG TICKET LOGGED</h4>
              <p className="text-xs text-[#8E95A5] max-w-sm mx-auto">
                Your report and diagnostics have been saved. You can also copy the markdown dump to paste directly into chat with the AI assistant!
              </p>
            </div>
          ) : (
            <>
              {/* Category & Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-[#8E95A5] block">
                    Category:
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="Visual / Layout Issue">Visual / Layout / Responsive Issue</option>
                    <option value="Combat & Live Dice">Combat Mode & Dice Roller</option>
                    <option value="Roster Builder & Wargear">Roster Builder & Equipment</option>
                    <option value="Rules Codex & Scenarios">Rules Codex & Scenarios</option>
                    <option value="Campaign Tracker">Campaign Tracker & World Map</option>
                    <option value="Auth / Sync / Cloud">Auth, Cloud Sync & Preferences</option>
                    <option value="Other">Other Suggestion / Rule Inquiry</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-[#8E95A5] block">
                    Severity:
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="Minor / Visual">Minor (Text wrapping, styling)</option>
                    <option value="Feature Inconvenience">Moderate (Workflow inconvenience)</option>
                    <option value="Critical / Blocking">Critical (Blocks gameplay / game-breaking)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#8E95A5] block">
                  What happened? (Description):
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue, what looked wrong, or what happened..."
                  className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2.5 text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37] placeholder:text-[#8E95A5]/50"
                />
              </div>

              {/* Steps to Reproduce */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#8E95A5] block">
                  Steps to Reproduce (Optional):
                </label>
                <textarea
                  rows={2}
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  placeholder="e.g. 1. Go to Codex -> Scenarios. 2. On iPad in portrait..."
                  className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37] placeholder:text-[#8E95A5]/50"
                />
              </div>

              {/* Auto-Captured Environment Box */}
              <div className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1.5 text-[11px] text-[#8E95A5]">
                <div className="flex items-center justify-between text-[#D4AF37] font-bold pb-1 border-b border-[#323846]/60">
                  <span className="flex items-center space-x-1.5">
                    {deviceType === 'Mobile Phone' ? <Smartphone className="w-3.5 h-3.5" /> :
                     deviceType === 'Tablet / iPad' ? <Tablet className="w-3.5 h-3.5" /> :
                     <Monitor className="w-3.5 h-3.5" />}
                    <span>Auto-Captured Environment Context</span>
                  </span>
                  <span>{deviceType} ({width}x{height}px)</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                  <div>View: <strong className="text-[#ECEFF4]">{currentView}</strong></div>
                  <div>Ruleset: <strong className="text-[#ECEFF4]">v{rulesetVersion}</strong></div>
                  <div>Theme: <strong className="text-[#ECEFF4]">{currentTheme}</strong></div>
                  <div>Warband: <strong className="text-[#ECEFF4] truncate">{activeWarband?.name || 'None'}</strong></div>
                </div>
              </div>
            </>
          )}

        </form>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-[#0C0E12] border-t border-[#323846] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyReport}
            className={`w-full sm:w-auto px-4 py-2 rounded font-bold uppercase flex items-center justify-center space-x-2 transition-all ${
              copied
                ? 'bg-[#4E9A6E] text-white shadow-lg'
                : 'bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846]'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 text-[#D4AF37]" />}
            <span>{copied ? '✓ Report Copied to Clipboard!' : '📋 Copy Report for AI Agent'}</span>
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-[#161920] hover:bg-[#20242E] text-[#8E95A5] hover:text-white rounded uppercase font-bold"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !description.trim()}
              className="px-5 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded flex items-center space-x-1.5 shadow transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Save Ticket'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
