'use client';

import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { useStore } from '../../store/useStore';
import { RuleDiffItem, RuleFieldValue } from '../../types/diff';
import { 
  GitCommit, 
  CheckCheck, 
  AlertCircle
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
  const [rejected, setRejected] = useState<string | null>(null);

  /*
    The apply path used to be typed `any` on both sides, which is how it read
    as correct while being wrong: `baseCost` is a NUMBER and `stats.melee` is a
    STRING like "+2", and `any` let either value land in either field. A cost
    of "+2" or a modifier of 40 would have been written to a saved unit and
    only surfaced later, in a statline, as a value nobody could account for.

    Typing `RuleFieldValue` made the compiler ask the question. These two
    helpers answer it, and the answer when a value is the wrong shape is to
    REFUSE THE WHOLE APPLY and say so — not to coerce, and not to skip the
    field quietly and save the rest. A half-applied upstream unit is the state
    that is hardest to notice and hardest to undo.
  */
  const asNumber = (v: RuleFieldValue, field: string): number => {
    if (typeof v !== 'number') throw new Error(`${field} is not a number`);
    return v;
  };
  const asString = (v: RuleFieldValue, field: string): string => {
    if (typeof v !== 'string') throw new Error(`${field} is not a stat value`);
    return v;
  };

  const handleAcceptUpstream = (diff: RuleDiffItem) => {
    const targetUnit = units.find((u) => u.id === diff.id);
    if (targetUnit) {
      const updated = { ...targetUnit, stats: { ...targetUnit.stats } };
      try {
        diff.diffFields.forEach((field) => {
          const v = field.upstreamValue;
          if (field.fieldName === 'Ducat Cost') {
            updated.baseCost = asNumber(v, field.fieldName);
          } else if (field.fieldName === 'Melee Modifier') {
            updated.stats.melee = asString(v, field.fieldName);
          } else if (field.fieldName === 'Ranged Modifier') {
            updated.stats.ranged = asString(v, field.fieldName);
          } else if (field.fieldName === 'Armour Stat') {
            updated.stats.armour = asString(v, field.fieldName);
          }
        });
      } catch (e) {
        setRejected(`${diff.name}: ${(e as Error).message}. Nothing was changed.`);
        return;
      }
      setRejected(null);
      saveCustomUnit(updated);
    }
    resolveDiff(diff.id, 'accept_upstream');
  };

  const handleKeepUser = (diff: RuleDiffItem) => {
    resolveDiff(diff.id, 'keep_user');
  };

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title="GITHUB RULE SYNC & 3-WAY DIFF RESOLVER"
      subtitle="Compare your custom in-app unit overrides against the latest upstream repository changes"
    >
      {/* Commit Details Banner */}
      <div className="p-4 bg-theme-elevated border-b border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center space-x-2">
          <GitCommit className="w-4 h-4 text-theme-primary" />
          <span className="text-theme-muted">Commit: <strong className="text-theme-text">{commitSha.slice(0, 8)}</strong></span>
          <span className="text-theme-text truncate max-w-md italic">"{commitMessage}"</span>
        </div>
        <div className="text-theme-primary font-bold">
          {diffs.length} Conflicting Profiles Found
        </div>
      </div>
      {rejected && (
        <p
          role="alert"
          className="mx-6 mt-4 border-l-2 border-status-error bg-status-error/10 px-3 py-2 font-mono text-xs text-theme-text"
        >
          {rejected}
        </p>
      )}

      {/* Diffs List */}
      <div className="p-6 overflow-y-auto flex-1 space-y-6">
        {diffs.length === 0 ? (
          <div className="p-8 text-center bg-theme-base rounded border border-theme-border space-y-2">
            <CheckCheck className="w-8 h-8 text-status-legal mx-auto" />
            <p className="text-sm font-gothic font-bold text-status-legal">ALL RULES FULLY SYNCHRONIZED</p>
            <p className="text-xs font-mono text-theme-muted">No unresolved conflicts between local edits and GitHub upstream.</p>
          </div>
        ) : (
          diffs.map((diff) => (
            <div
              key={diff.id}
              className="bg-theme-elevated border border-theme-border rounded-md p-5 space-y-4 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-theme-border pb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs sm:text-[10px] font-mono uppercase bg-theme-accent text-white px-2 py-0.5 rounded font-bold">
                    {diff.type}
                  </span>
                  <h3 className="font-gothic font-bold text-base text-theme-text">{diff.name}</h3>
                </div>
                <span className="text-xs font-mono text-status-error flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Rule Discrepancy</span>
                </span>
              </div>

              {/* Side by Side Diff Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
                {/* Left: Your Custom Overrides */}
                <div className="p-3 bg-theme-surface border border-theme-primary/50 rounded space-y-2">
                  <span className="text-xs sm:text-[10px] font-mono uppercase text-theme-primary font-bold block border-b border-theme-border pb-1">
                    Your In-App Custom Value
                  </span>
                  <div className="space-y-1 text-xs font-mono">
                    {diff.diffFields.map((field, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-theme-border/40">
                        <span className="text-theme-muted">{field.fieldName}:</span>
                        <strong className="text-theme-primary">{String(field.userValue)}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: GitHub Upstream */}
                <div className="p-3 bg-theme-base border border-theme-border rounded space-y-2">
                  <span className="text-xs sm:text-[10px] font-mono uppercase text-status-legal font-bold block border-b border-theme-border pb-1">
                    GitHub Upstream (Repo)
                  </span>
                  <div className="space-y-1 text-xs font-mono">
                    {diff.diffFields.map((field, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-theme-border/40">
                        <span className="text-theme-muted">{field.fieldName}:</span>
                        <strong className="text-status-legal">{String(field.upstreamValue)}</strong>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Resolution Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleKeepUser(diff)}
                  className="px-4 py-2 bg-theme-surface hover:bg-theme-border text-theme-primary border border-theme-primary/50 rounded font-mono text-xs font-bold uppercase transition-colors"
                >
                  Keep My Custom Values
                </button>
                <button
                  onClick={() => handleAcceptUpstream(diff)}
                  className="px-4 py-2 bg-status-legal hover:bg-status-legal text-white rounded font-mono text-xs font-bold uppercase transition-colors shadow"
                >
                  Accept Upstream Repo Patch
                </button>
              </div>

            </div>
          ))
        )}
      </div>
    </Sheet>
  );
};
