'use client';

import React from 'react';
import { useStore } from '../../store/useStore';
import { Cloud, CloudOff, RefreshCw, Check, HardDrive, AlertTriangle } from 'lucide-react';
import { serverCampaign, serverTerritory } from '../../services/campaignSync';

/**
 * Whether the campaign's cloud copy has what this device did.
 *
 * The warband indicator (`layout/SyncStatus`) is the model, down to the
 * wording, because a player should not have to learn two vocabularies for the
 * same idea. It has five states; this has six.
 *
 * The extra one is `conflict`, and it exists because a campaign is pushed as
 * OPERATIONS against a version rather than as a whole object. A warband push
 * cannot conflict — the last writer wins by design — but two people editing
 * one campaign can, and `docs/CAMPAIGN-SYNC.md` says the app shows that rather
 * than merging silently: a wrong answer nobody sees is worse than a visible
 * question.
 *
 * `pending` is deliberately not styled as a failure. Editing a campaign at a
 * table with no signal is the normal case, and colouring it red teaches people
 * to ignore the indicator.
 */
export const CampaignSyncStatus: React.FC = () => {
  const sync = useStore((s) => s.campaignSync);
  const syncNow = useStore((s) => s.syncCampaignWithCloud);
  const discard = useStore((s) => s.discardCampaignConflicts);

  const view = (() => {
    switch (sync.kind) {
      case 'local-only':
        return {
          icon: <HardDrive className="w-3.5 h-3.5" />,
          label: 'On this device',
          title: 'This campaign is saved in this browser only. It has no cloud copy yet.',
          tone: 'text-theme-muted',
          retry: false,
        };
      case 'syncing':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
          label: 'Syncing',
          title: 'Reconciling this device with the campaign’s cloud copy.',
          tone: 'text-theme-muted',
          retry: false,
        };
      case 'synced':
        return {
          icon: <Check className="w-3.5 h-3.5" />,
          label: 'Backed up',
          title: `Every change queued on this device is in the campaign’s cloud copy. Last checked ${new Date(sync.at).toLocaleTimeString()}.`,
          tone: 'text-status-legal',
          retry: false,
        };
      case 'pending':
        return {
          icon: <Cloud className="w-3.5 h-3.5" />,
          label: `${sync.count} to upload`,
          title: `${sync.count} change${sync.count === 1 ? '' : 's'} made here and not yet in the campaign’s cloud copy. They are saved on this device and will upload when it can reach the server.`,
          tone: 'text-theme-primary',
          retry: true,
        };
      case 'conflict':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          label: `${sync.conflicts.length} need${sync.conflicts.length === 1 ? 's' : ''} a decision`,
          title: 'Somebody else changed the same thing first. Your change was not applied, and the app will not merge the two for you.',
          tone: 'text-status-warning',
          retry: false,
        };
      case 'error':
        return {
          icon: <CloudOff className="w-3.5 h-3.5" />,
          label: sync.reason === 'offline' ? 'Offline'
            : sync.reason === 'unauthenticated' ? 'Sign in to sync'
            : 'Sync failed',
          title: sync.reason === 'offline'
            ? `Cannot reach the server (${sync.detail}). Your work is saved on this device${sync.pending ? ` — ${sync.pending} waiting to upload` : ''}.`
            : sync.reason === 'unauthenticated'
            ? 'The server did not accept the session. Sign in again to sync this campaign.'
            : `The server returned an error (${sync.detail}). Your work is saved on this device${sync.pending ? ` — ${sync.pending} waiting to upload` : ''}.`,
          tone: sync.reason === 'server' ? 'text-status-error' : 'text-status-warning',
          retry: sync.reason !== 'unauthenticated',
        };
    }
  })();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={`flex items-center gap-1.5 font-mono text-xs whitespace-nowrap ${view.tone}`}
          title={view.title}
          /* The title carries the detail, the label is the glance, and both
             are read out — so a screen reader gets the same distinction a
             sighted user does. */
          role="status"
        >
          {view.icon}
          <span>{view.label}</span>
        </span>

        {view.retry && (
          /* 44px, because this is pressed at a table one-handed. */
          <button
            type="button"
            onClick={() => { void syncNow(); }}
            className="min-h-[44px] px-3 font-mono text-xs uppercase tracking-wide border border-theme-border rounded-md text-theme-text hover:bg-theme-surface active:bg-theme-surface"
          >
            Sync now
          </button>
        )}
      </div>

      {sync.kind === 'conflict' && (
        <div className="border border-status-warning/60 rounded-md p-3 space-y-3 bg-theme-base">
          <p className="text-xs font-mono text-theme-text">
            Somebody else changed the same thing before your change reached the server.
            The campaign still has <strong>their</strong> version. Yours was not applied
            and has not been thrown away — it is listed below.
          </p>

          <ul className="space-y-2">
            {sync.conflicts.map((c) => {
              /* Read through a guard. A payload this version cannot parse says
                 so instead of rendering `undefined` as the campaign's value. */
              const territory = serverTerritory(c.server);
              const settings = serverCampaign(c.server);
              return (
                <li key={c.opId} className="text-xs font-mono text-theme-muted">
                  {territory ? (
                    <>
                      The campaign’s copy:{' '}
                      <span className="text-theme-text">
                        {territory.perk || 'no house rule'}
                      </span>
                      {territory.controlledByPlayerName && (
                        <> — held by <span className="text-theme-text">{territory.controlledByPlayerName}</span></>
                      )}
                    </>
                  ) : settings ? (
                    <>
                      The campaign’s copy:{' '}
                      <span className="text-theme-text">{settings.name}</span>, turn {settings.currentTurn}
                      {settings.houseRules?.reinforcementsKeepExploration
                        && <> — Reinforcements keep Exploration</>}
                    </>
                  ) : (
                    <>The server sent a copy this version of the app cannot read.</>
                  )}
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={discard}
            className="min-h-[44px] w-full sm:w-auto px-3 font-mono text-xs uppercase tracking-wide border border-theme-border rounded-md text-theme-text hover:bg-theme-surface active:bg-theme-surface"
          >
            Take the campaign’s copy
          </button>
          <p className="text-[11px] font-mono text-theme-muted">
            This device adopts what the campaign has, and your change is dropped.
            There is no “keep mine” yet: it would overwrite somebody else’s edit,
            and that needs a screen that says whose.
          </p>
        </div>
      )}
    </div>
  );
};
