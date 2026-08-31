'use client';

import React from 'react';
import { useStore } from '../../store/useStore';
import { Cloud, CloudOff, RefreshCw, Check, AlertTriangle, HardDrive } from 'lucide-react';

/**
 * Whether the roster is backed up, in one glance.
 *
 * The app kept warbands in two places and told you nothing about either. Every
 * cloud call caught its own error, logged a console warning and carried on, so
 * "your roster is in the cloud" and "the request never left the building"
 * looked identical — and a player at a table with no signal had no way to ask.
 *
 * Five states, each of which means something different to a person:
 *
 *   local-only   not signed in. Saved on this device, and that is fine.
 *   syncing      in flight.
 *   synced       the cloud has everything this device has.
 *   pending      edits are held here and will go up. Not an error.
 *   error        something is wrong, and it says which thing.
 *
 * `pending` is deliberately not styled as a failure. Editing a roster on the
 * train is the normal case, not a fault, and colouring it red teaches people
 * to ignore the indicator.
 */
export const SyncStatus: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const sync = useStore((s) => s.sync);

  const view = (() => {
    switch (sync.kind) {
      case 'local-only':
        return {
          icon: <HardDrive className="w-3.5 h-3.5" />,
          label: 'On this device',
          title: 'Not signed in. Your rosters are saved in this browser only — sign in to back them up.',
          tone: 'text-theme-muted',
        };
      case 'syncing':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
          label: 'Syncing',
          title: 'Reconciling this device with the cloud.',
          tone: 'text-theme-muted',
        };
      case 'synced':
        return {
          icon: <Check className="w-3.5 h-3.5" />,
          label: 'Backed up',
          title: `Everything on this device is in the cloud. Last checked ${new Date(sync.at).toLocaleTimeString()}.`,
          tone: 'text-status-legal',
        };
      case 'pending':
        return {
          icon: <Cloud className="w-3.5 h-3.5" />,
          label: `${sync.count} to upload`,
          title: `${sync.count} warband${sync.count === 1 ? '' : 's'} edited here and not yet in the cloud. They are saved on this device and will upload when it can reach the server.`,
          tone: 'text-theme-primary',
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
            ? 'The server did not accept the session. Sign in again to back up your rosters.'
            : `The server returned an error (${sync.detail}). Your work is saved on this device${sync.pending ? ` — ${sync.pending} waiting to upload` : ''}.`,
          tone: sync.reason === 'server' ? 'text-status-error' : 'text-status-warning',
        };
    }
  })();

  return (
    <span
      className={`flex items-center gap-1.5 font-mono text-xs whitespace-nowrap ${view.tone}`}
      title={view.title}
      /* The title carries the detail; the label is the glance. Both are read
         out, so a screen reader gets the same distinction a sighted user does. */
      role="status"
    >
      {view.icon}
      {!compact && <span>{view.label}</span>}
      {compact && <span className="sr-only">{view.label}</span>}
    </span>
  );
};
