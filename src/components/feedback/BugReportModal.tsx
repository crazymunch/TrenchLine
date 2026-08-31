'use client';

import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { useStore } from '../../store/useStore';
import { useSession } from 'next-auth/react';
import { soundEffects } from '../../services/soundEffects';
import { 
  Check, 
  Monitor, 
  Smartphone, 
  Tablet
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

  /*
    `e` is optional because this is now reachable two ways: submitting the form
    (Enter in a field) and the footer button, which sits outside the <form>
    element and so cannot be a `type="submit"`.
  */
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
    <Sheet
      open={isOpen}
      onClose={onClose}
      size="md"
      title="REPORT A BUG / FEEDBACK"
      subtitle="Generate an instant diagnostic dump or submit feedback directly to the AI agent"
      /*
        The bug reporter had no submit button.

        `handleSubmit` was reachable only by pressing Enter inside a text
        input — which does nothing from the textarea the description is
        actually typed in — so the form could be filled out completely and
        never sent. `handleCopyReport` was unwired too, which mattered more
        than it looks: it is the fallback when the API cannot be reached, and
        the app is meant to work with no signal.

        Both surfaced when the linter came on in 4.4.
      */
      footer={(
        <div className="flex items-center justify-end gap-2">
          {submittedSuccess && (
            <span className="eyebrow text-status-legal" role="status">Report sent</span>
          )}
          {copied && (
            <span className="eyebrow text-status-legal" role="status">Copied</span>
          )}
          <button
            type="button"
            onClick={handleCopyReport}
            className="px-3 py-2.5 bg-theme-base hover:bg-theme-elevated text-theme-text border border-theme-border font-mono text-xs font-bold uppercase transition-colors"
            title="Copy the report as Markdown — the fallback when the server cannot be reached"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting || !description.trim()}
            className="px-4 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-mono text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Sending…' : 'Send Report'}
          </button>
        </div>
      )}
    >
      {/* Content Body */}
      <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
  
        {submittedSuccess ? (
          <div className="p-8 text-center space-y-3 bg-theme-base rounded border border-status-legal/50">
            <div className="w-12 h-12 rounded-full bg-status-legal/20 border border-status-legal flex items-center justify-center mx-auto text-status-legal">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="font-gothic font-bold text-lg text-theme-text">BUG TICKET LOGGED</h4>
            <p className="text-xs text-theme-muted max-w-sm mx-auto">
              Your report and diagnostics have been saved. You can also copy the markdown dump to paste directly into chat with the AI assistant!
            </p>
          </div>
        ) : (
          <>
            {/* Category & Severity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted block">
                  Category:
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
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
                <label className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted block">
                  Severity:
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                >
                  <option value="Minor / Visual">Minor (Text wrapping, styling)</option>
                  <option value="Feature Inconvenience">Moderate (Workflow inconvenience)</option>
                  <option value="Critical / Blocking">Critical (Blocks gameplay / game-breaking)</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted block">
                What happened? (Description):
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue, what looked wrong, or what happened..."
                className="w-full bg-theme-base border border-theme-border rounded p-2.5 text-theme-text focus:outline-none focus:border-theme-primary placeholder:text-theme-muted/50"
              />
            </div>

            {/* Steps to Reproduce */}
            <div className="space-y-1">
              <label className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted block">
                Steps to Reproduce (Optional):
              </label>
              <textarea
                rows={2}
                value={stepsToReproduce}
                onChange={(e) => setStepsToReproduce(e.target.value)}
                placeholder="e.g. 1. Go to Codex -> Scenarios. 2. On iPad in portrait..."
                className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary placeholder:text-theme-muted/50"
              />
            </div>

            {/* Auto-Captured Environment Box */}
            <div className="p-3 bg-theme-base rounded border border-theme-border space-y-1.5 text-xs sm:text-[11px] text-theme-muted">
              <div className="flex items-center justify-between text-theme-primary font-bold pb-1 border-b border-theme-border/60">
                <span className="flex items-center space-x-1.5">
                  {deviceType === 'Mobile Phone' ? <Smartphone className="w-3.5 h-3.5" /> :
                   deviceType === 'Tablet / iPad' ? <Tablet className="w-3.5 h-3.5" /> :
                   <Monitor className="w-3.5 h-3.5" />}
                  <span>Auto-Captured Environment Context</span>
                </span>
                <span>{deviceType} ({width}x{height}px)</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                <div>View: <strong className="text-theme-text">{currentView}</strong></div>
                <div>Ruleset: <strong className="text-theme-text">v{rulesetVersion}</strong></div>
                <div>Theme: <strong className="text-theme-text">{currentTheme}</strong></div>
                <div>Warband: <strong className="text-theme-text truncate">{activeWarband?.name || 'None'}</strong></div>
              </div>
            </div>
          </>
        )}

      </form>
    </Sheet>
  );
};
