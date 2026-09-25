'use client';

/**
 * Share a warband, and stop (SH-1).
 *
 * > Trench Companion's share link is the thing people paste into the group
 * > chat. Ours has nothing to paste.
 *
 * The token lives on the server and nowhere else. It is deliberately NOT on the
 * client `Warband` type: it is a capability granted by the owner's account, not
 * part of the roster, so it must never travel in a roster file or be merged by
 * the sync — and keeping it off the type is how that is guaranteed by
 * construction rather than by remembering. See `docs/ROSTER-FILE.md`.
 *
 * So this asks the server what the state is, every time it opens. Three answers:
 *
 *   `shared`      here is the link.
 *   `not shared`  here is the Share button.
 *   `404`         this roster is not in the cloud, so it cannot be shared — and
 *                 the server is what says so. The refusal is not guessed here
 *                 from a local flag, which is the version that tells a player
 *                 their synced roster cannot be shared.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Copy, Link2, Loader2, ShieldOff } from 'lucide-react';
import { Sheet } from '../ui/Sheet';

interface Props {
  open: boolean;
  onClose: () => void;
  warbandId: string;
  warbandName: string;
}

type State =
  | { kind: 'loading' }
  | { kind: 'shared'; path: string }
  | { kind: 'private' }
  /** In the cloud, but this device is not signed in as its owner. */
  | { kind: 'local-only'; detail: string }
  | { kind: 'error'; detail: string };

export const ShareWarbandModal: React.FC<Props> = ({
  open, onClose, warbandId, warbandName,
}) => {
  const { data: session } = useSession();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  /*
    `idle` until the player taps Copy, then what actually happened.

    It used to be a boolean set before the write resolved, so "Copied" appeared
    whether or not the clipboard took it (review round 1, finding N) — and a
    clipboard write is refused often: an insecure origin, a browser that wants
    a fresh gesture, a denied permission. The input above is already selectable,
    so a failure has somewhere to point.
  */
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const endpoint = `/api/warbands/${encodeURIComponent(warbandId)}/share`;

  const read = useCallback(async (method: 'GET' | 'POST' | 'DELETE') => {
    setBusy(method !== 'GET');
    try {
      const res = await fetch(endpoint, { method });
      if (res.status === 401) {
        setState({
          kind: 'local-only',
          detail: 'Sharing needs the warband in the cloud, and the cloud needs '
            + 'you signed in. This roster is on this device only.',
        });
        return;
      }
      if (res.status === 404) {
        setState({
          kind: 'local-only',
          detail: 'This roster has not reached the cloud yet, so there is nothing '
            + 'to share. Sync it and try again.',
        });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setState({ kind: 'error', detail: body?.error ?? `HTTP ${res.status}.` });
        return;
      }
      const body = await res.json() as { shared: boolean; path: string | null };
      setState(body.shared && body.path
        ? { kind: 'shared', path: body.path }
        : { kind: 'private' });
    } catch (e) {
      /* Reported, never smoothed over: a failed call must not read as "not
         shared", which would offer a Share button for a link that already
         exists. */
      setState({
        kind: 'error',
        detail: e instanceof Error ? e.message : 'The request did not complete.',
      });
    } finally {
      setBusy(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (!open) return;
    setCopyState('idle');
    setState({ kind: 'loading' });
    if (!session?.user) {
      setState({
        kind: 'local-only',
        detail: 'Sharing needs the warband in the cloud, and the cloud needs you '
          + 'signed in. This roster is on this device only.',
      });
      return;
    }
    void read('GET');
  }, [open, session?.user, read]);

  /*
    The absolute link is assembled in the BROWSER, from the origin actually
    serving the page. The server returns a path for that reason: a preview
    deployment, a local run and the site are three different origins, and a
    server-side guess is how a share link ends up pointing at the wrong host.
  */
  const absolute = state.kind === 'shared' && typeof window !== 'undefined'
    ? `${window.location.origin}${state.path}`
    : '';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Share this roster"
      subtitle={warbandName}
      size="md"
    >
      <div className="p-4 space-y-4">

        {state.kind === 'loading' && (
          <p className="font-mono text-xs text-theme-muted flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Asking the server whether this roster is shared…
          </p>
        )}

        {state.kind === 'local-only' && (
          <div className="border border-status-warning/50 bg-status-warning/10 p-3 space-y-1">
            <p className="font-mono text-xs font-bold text-status-warning uppercase flex items-center gap-1.5">
              <ShieldOff className="w-4 h-4" />
              Not shareable
            </p>
            <p className="font-mono text-xs text-theme-muted leading-relaxed">
              {state.detail}
            </p>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="border border-status-error/50 bg-status-error/10 p-3 space-y-1">
            <p className="font-mono text-xs font-bold text-status-error uppercase">
              That did not work
            </p>
            <p className="font-mono text-xs text-theme-muted leading-relaxed">{state.detail}</p>
          </div>
        )}

        {state.kind === 'private' && (
          <>
            <p className="font-mono text-xs text-theme-muted leading-relaxed">
              Sharing puts this warband&rsquo;s Roster Sheet at a link anybody can
              open — no account needed. It is read only, it is not indexed by
              search engines, and it stops working the moment you stop sharing.
            </p>
            <button
              onClick={() => void read('POST')}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-mono text-xs font-bold uppercase tracking-widest disabled:opacity-50"
            >
              <Link2 className="w-4 h-4" />
              <span>{busy ? 'Sharing…' : 'Share'}</span>
            </button>
          </>
        )}

        {state.kind === 'shared' && (
          <>
            <div className="space-y-1.5">
              <span className="eyebrow accent block">The link</span>
              {/*
                16px minimum on a form input (docs/MOBILE.md §3): anything
                smaller makes iOS zoom the page the moment it is focused.
              */}
              <input
                readOnly
                value={absolute}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full min-h-[44px] px-3 bg-theme-base border border-theme-border text-theme-text font-mono text-base"
                aria-label="The share link for this roster"
              />
              <button
                onClick={() => {
                  const write = navigator.clipboard?.writeText(absolute);
                  if (!write) { setCopyState('failed'); return; }
                  write.then(
                    () => {
                      setCopyState('copied');
                      window.setTimeout(() => setCopyState('idle'), 1500);
                    },
                    /* Reported, not swallowed. A "Copied" the clipboard refused
                       sends the player off to paste nothing. */
                    () => setCopyState('failed'),
                  );
                }}
                className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 bg-theme-elevated hover:bg-theme-border text-theme-text border border-theme-border font-mono text-xs font-bold uppercase tracking-widest"
              >
                <Copy className="w-4 h-4" />
                <span>{copyState === 'copied' ? 'Copied' : 'Copy the link'}</span>
              </button>

              {copyState === 'failed' && (
                <p className="font-mono text-xs text-status-warning leading-relaxed">
                  This browser would not let the page write to the clipboard.
                  The link is in the box above — select it and copy it by hand.
                </p>
              )}
            </div>

            <p className="font-mono text-xs text-theme-muted leading-relaxed">
              Anybody with this link can read the sheet. Stopping sharing breaks
              it for good — sharing again mints a different link.
            </p>

            <button
              onClick={() => void read('DELETE')}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 bg-status-error/15 hover:bg-status-error/25 text-status-error border border-status-error/50 font-mono text-xs font-bold uppercase tracking-widest disabled:opacity-50"
            >
              <ShieldOff className="w-4 h-4" />
              <span>{busy ? 'Stopping…' : 'Stop sharing'}</span>
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
};
