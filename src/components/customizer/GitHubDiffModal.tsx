import React from 'react';
import { useStore } from '../../store/useStore';
import { RuleDiffItem } from '../../types/diff';
import { 
  X, 
  GitBranch, 
  GitCommit, 
  Check, 
  CheckCheck, 
  AlertCircle, 
  ArrowRight,
  Shield,
  Coins,
  Sparkles
} from 'lucide-react';

interface GitHubDiffModalProps {
  diffs: RuleDiffItem[];
  commitSha: string;
  commitMessage: string;
  onClose: () => void;
}

export const GitHubDiffModal: React.FC<GitHubDiffModalProps> = ({
  diffs,
  commitSha,
  commitMessage,
  onClose
}) => {
  const { resolveDiff, units, saveCustomUnit } = useStore();

  const handleAcceptUpstream = (diff: RuleDiffItem) => {
    // Apply upstream changes to the unit
    const targetUnit = units.find((u) => u.id === diff.id);
    if (targetUnit) {
      const updated = { ...targetUnit };
      diff.diffFields.forEach((field) => {
        if (field.fieldName === 'Ducat Cost') {
          updated.baseCost = field.upstreamValue;
        } else if (field.fieldName === 'Melee Modifier') {
          updated.stats.melee = field.upstreamValue;
        } else if (field.fieldName === 'Ranged Modifier') {
          updated.stats.ranged = field.upstreamValue;
        } else if (field.fieldName === 'Armour Stat') {
          updated.stats.armour = field.upstreamValue;
        }
      });
      saveCustomUnit(updated);
    }
    resolveDiff(diff.id, 'accept_upstream');
  };

  const handleKeepUser = (diff: RuleDiffItem) => {
    resolveDiff(diff.id, 'keep_user');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-4xl max-h-[90vh] rounded-md flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12]">
          <div className="flex items-center space-x-3">
            <GitBranch className="w-6 h-6 text-[#D4AF37]" />
            <div>
              <h2 className="font-gothic font-bold text-lg text-[#ECEFF4] tracking-wide">
                GITHUB RULE SYNC & 3-WAY DIFF RESOLVER
              </h2>
              <p className="text-xs font-mono text-[#8E95A5]">
                Compare your custom in-app unit overrides against the latest upstream repository changes
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[#8E95A5] hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Commit Details Banner */}
        <div className="p-4 bg-[#20242E] border-b border-[#323846] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <GitCommit className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[#8E95A5]">Commit: <strong className="text-[#ECEFF4]">{commitSha.slice(0, 8)}</strong></span>
            <span className="text-[#ECEFF4] truncate max-w-md italic">"{commitMessage}"</span>
          </div>
          <div className="text-[#D4AF37] font-bold">
            {diffs.length} Conflicting Profiles Found
          </div>
        </div>

        {/* Diffs List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {diffs.length === 0 ? (
            <div className="p-8 text-center bg-[#0C0E12] rounded border border-[#323846] space-y-2">
              <CheckCheck className="w-8 h-8 text-[#4E9A6E] mx-auto" />
              <p className="text-sm font-gothic font-bold text-[#4E9A6E]">ALL RULES FULLY SYNCHRONIZED</p>
              <p className="text-xs font-mono text-[#8E95A5]">No unresolved conflicts between local edits and GitHub upstream.</p>
            </div>
          ) : (
            diffs.map((diff) => (
              <div
                key={diff.id}
                className="bg-[#20242E] border border-[#323846] rounded-md p-5 space-y-4 shadow-lg"
              >
                <div className="flex items-center justify-between border-b border-[#323846] pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono uppercase bg-[#8B0000] text-white px-2 py-0.5 rounded font-bold">
                      {diff.type}
                    </span>
                    <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">{diff.name}</h3>
                  </div>
                  <span className="text-xs font-mono text-[#E53935] flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Rule Discrepancy</span>
                  </span>
                </div>

                {/* Side by Side Diff Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Left: Your Custom Overrides */}
                  <div className="p-3 bg-[#161920] border border-[#D4AF37]/50 rounded space-y-2">
                    <span className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold block border-b border-[#323846] pb-1">
                      Your In-App Custom Value
                    </span>
                    <div className="space-y-1 text-xs font-mono">
                      {diff.diffFields.map((field, idx) => (
                        <div key={idx} className="flex justify-between py-1 border-b border-[#323846]/40">
                          <span className="text-[#8E95A5]">{field.fieldName}:</span>
                          <strong className="text-[#D4AF37]">{String(field.userValue)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: GitHub Upstream */}
                  <div className="p-3 bg-[#0C0E12] border border-[#323846] rounded space-y-2">
                    <span className="text-[10px] font-mono uppercase text-[#4E9A6E] font-bold block border-b border-[#323846] pb-1">
                      GitHub Upstream (Repo)
                    </span>
                    <div className="space-y-1 text-xs font-mono">
                      {diff.diffFields.map((field, idx) => (
                        <div key={idx} className="flex justify-between py-1 border-b border-[#323846]/40">
                          <span className="text-[#8E95A5]">{field.fieldName}:</span>
                          <strong className="text-[#4E9A6E]">{String(field.upstreamValue)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Resolution Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => handleKeepUser(diff)}
                    className="px-4 py-2 bg-[#161920] hover:bg-[#323846] text-[#D4AF37] border border-[#D4AF37]/50 rounded font-mono text-xs font-bold uppercase transition-colors"
                  >
                    Keep My Custom Values
                  </button>
                  <button
                    onClick={() => handleAcceptUpstream(diff)}
                    className="px-4 py-2 bg-[#4E9A6E] hover:bg-[#3B7A57] text-white rounded font-mono text-xs font-bold uppercase transition-colors shadow"
                  >
                    Accept Upstream Repo Patch
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#323846] bg-[#0C0E12] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] font-mono text-xs font-bold uppercase rounded"
          >
            Close Diff Viewer
          </button>
        </div>

      </div>
    </div>
  );
};
