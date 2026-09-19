'use client';

/**
 * Export a warband as a BattleScribe / NewRecruit `.ros`, behind its report.
 *
 * `docs/EXPORT-CODEX-REVIEW.md` E4: fatal disables the download and offers the
 * TrenchLine file instead, warnings and informational notes are shown but do
 * not block. The report is `services/rosterRos.ts`; nothing here decides what
 * counts as a fault.
 *
 * **The layer is loaded on demand, and that is the reason this is a button and
 * not a panel.** `rosterpaths.json` is ~3 MB per ruleset, and the app is used
 * at a table on a phone. Nobody pays for it until they ask for a `.ros`.
 *
 * The format is a candidate: no file this exporter wrote has been opened in
 * NewRecruit, and the acceptance gate is a person with the app checking every
 * model, loadout and cost. That is said here rather than only in the docs,
 * because the player about to hand the file to somebody else is the one who
 * needs to know.
 */
import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Download, Info, Loader2 } from 'lucide-react';

import { loadRosterPaths } from '@/services/rosterPaths';
import { toRos, rosReport, type CatalogueUnit, type RosIssue, type RosReport }
  from '@/services/rosterRos';
import type { Warband } from '../../types/warband';

interface Props {
  warband: Warband;
  units: CatalogueUnit[];
  rulesetId: string;
  onDownload: (contents: string, extension: string, mime: string) => void;
}

type State =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'ready'; report: RosReport; xml?: string }
  | { phase: 'error'; why: string };

const ISSUE_ICON = {
  fatal: AlertCircle,
  warning: AlertTriangle,
  informational: Info,
} as const;

/*
  Static classes per level: a template literal here would not compile —
  docs/MOBILE.md §5. The `status-*` tokens are the ones that exist and are
  fixed across every theme, which is right for a fault that has to read the
  same on every one.
*/
const ISSUE_CLASS = {
  fatal: 'text-status-error',
  warning: 'text-status-warning',
  informational: 'text-theme-muted',
} as const;

const IssueList: React.FC<{ title: string; issues: RosIssue[] }> = ({ title, issues }) => {
  if (!issues.length) return null;
  const level = issues[0].level;
  const Icon = ISSUE_ICON[level];
  return (
    <div className="space-y-1">
      <span className="eyebrow text-theme-muted">{title}</span>
      <ul className="space-y-1">
        {issues.map((issue, i) => (
          <li key={`${issue.model ?? ''}${issue.subject ?? ''}${i}`} className="flex gap-1.5">
            <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${ISSUE_CLASS[level]}`} />
            <span className="text-xs text-theme-text">
              {issue.model && <strong className="font-bold">{issue.model}</strong>}
              {issue.model && issue.subject && ' — '}
              {issue.subject && <span className="italic">{issue.subject}</span>}
              {(issue.model || issue.subject) && ': '}
              <span className="text-theme-muted">{issue.why}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const NewRecruitExport: React.FC<Props> = ({
  warband, units, rulesetId, onDownload,
}) => {
  const [state, setState] = useState<State>({ phase: 'idle' });

  const check = async () => {
    setState({ phase: 'loading' });
    try {
      const layer = await loadRosterPaths(rulesetId);
      if (!layer) {
        /* Never a silent fallback to another ruleset's identities: a `.ros`
           written against the wrong catalogue revision is a roster of a
           different warband. */
        setState({
          phase: 'error',
          why: `This ruleset (${rulesetId}) has no BattleScribe identities built. `
             + 'Run `npm run rules:build`.',
        });
        return;
      }
      const report = rosReport(layer, warband, units);
      setState({
        phase: 'ready',
        report,
        xml: report.exportable ? toRos(layer, warband, units).xml : undefined,
      });
    } catch (e) {
      setState({ phase: 'error', why: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="space-y-2 border-t border-theme-border pt-4 print:hidden">
      <span className="eyebrow text-theme-muted">NewRecruit / BattleScribe</span>

      {state.phase === 'idle' && (
        <>
          <p className="text-xs text-theme-muted">
            A <code>.ros</code> other Trench Crusade apps can open. Checked against the
            catalogues first — a warband with anything they cannot name is reported rather
            than exported short.
          </p>
          <button
            onClick={check}
            className="min-h-[44px] w-full rounded border border-theme-border bg-theme-elevated px-3 text-xs font-bold uppercase text-theme-text transition-colors hover:bg-theme-border"
          >
            Check compatibility
          </button>
        </>
      )}

      {state.phase === 'loading' && (
        <p className="flex min-h-[44px] items-center gap-2 text-xs text-theme-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading the catalogue identities…
        </p>
      )}

      {state.phase === 'error' && (
        <p className="flex gap-1.5 text-xs text-status-error">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{state.why}</span>
        </p>
      )}

      {state.phase === 'ready' && (
        <div className="space-y-3">
          {!state.report.exportable && (
            <p className="text-xs font-bold text-status-error">
              This warband cannot be written as a <code>.ros</code>. Use the TrenchLine
              file instead — it keeps everything below.
            </p>
          )}
          <IssueList title="Cannot be exported" issues={state.report.fatal} />
          <IssueList title="Differences worth knowing" issues={state.report.warnings} />
          <IssueList title="For the record" issues={state.report.informational} />

          {state.xml && (
            <button
              onClick={() => onDownload(state.xml!, 'ros', 'application/xml')}
              className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded border border-theme-primary/50 bg-theme-elevated px-3 text-xs font-bold uppercase text-theme-primary transition-colors hover:bg-theme-border"
            >
              <Download className="h-4 w-4" />
              <span>Save .ros</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
