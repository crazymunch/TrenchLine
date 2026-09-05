'use client';

/**
 * Deleting your account, with the consequences on screen first.
 *
 * The API is deliberately two calls (`src/app/api/account/route.ts`), and this
 * is the reason: nobody can consent to a deletion whose effects they have not
 * been shown. So the sheet opens, asks the server what would be destroyed, and
 * renders that — the number of warbands, the campaigns this account RUNS and
 * how many other players are in each, the memberships that merely end.
 *
 * Until that summary has loaded there is nothing to confirm and the form is
 * not shown. A spinner is the honest state; a Delete button that is live
 * before the app knows what it deletes is not.
 *
 * `dismissible={false}`, like `ConfirmModal` and for the same reason: a
 * destructive confirm answered by a stray tap on a backdrop is not an answer.
 */
import React, { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Sheet } from '../ui/Sheet';

/** Mirrors `DeletionSummary` in the route. */
interface Summary {
  email: string | null;
  warbands: number;
  administeredCampaigns: { name: string; otherMembers: number }[];
  memberships: number;
  customRules: number;
  bugReportsKeptAnonymously: number;
}

/** The word the route requires. Kept in step by a test, not by memory. */
export const CONFIRMATION = 'DELETE';

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-baseline justify-between gap-3 border-b border-theme-border py-2 last:border-b-0">
    <span className="font-mono text-[11px] uppercase tracking-[0.10em] text-theme-muted">{label}</span>
    <span className="text-right text-sm font-bold text-theme-text">{value}</span>
  </div>
);

export const DeleteAccountModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen, onClose,
}) => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Reset on every open. A summary left over from last time would describe
    // an account state that may have changed since.
    setSummary(null); setTyped(''); setError(null); setBusy(false);

    let live = true;
    fetch('/api/account')
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? 'Could not read this account.');
        return body.summary as Summary;
      })
      .then((s) => { if (live) setSummary(s); })
      /*
        Shown, not swallowed. If the app cannot say what deletion would
        destroy, the answer is to say so — not to offer the button anyway.
      */
      .catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [isOpen]);

  const campaigns = summary?.administeredCampaigns ?? [];
  const ready = summary !== null && typed === CONFIRMATION && !busy;

  const submit = async () => {
    if (!summary) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: typed,
          // Read off the summary the person was shown, which is what makes it
          // an acknowledgement rather than a formality.
          acknowledgeCampaigns: campaigns.length,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? 'The account was not deleted.');
      // The account is gone; the token stops authenticating on its next use
      // regardless. Signing out clears the client so the app does not spend a
      // minute rendering as somebody who no longer exists.
      await signOut({ callbackUrl: '/' });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      dismissible={false}
      size="md"
      label="Delete account"
      title={
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-status-error bg-status-error/20">
            <AlertTriangle className="h-4 w-4 text-status-error" />
          </span>
          Delete account
        </span>
      }
      subtitle="This cannot be undone."
      footer={
        <>
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 min-h-[44px] rounded bg-theme-elevated px-4 font-mono text-xs font-bold uppercase text-theme-muted transition-all hover:bg-theme-border hover:text-theme-text disabled:opacity-50"
          >
            Keep my account
          </button>
          <button
            onClick={submit}
            disabled={!ready}
            className="flex-1 min-h-[44px] rounded bg-status-error px-4 font-mono text-xs font-bold uppercase text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Deleting…' : 'Delete permanently'}
          </button>
        </>
      }
    >
      {error && (
        <p role="alert" className="mb-4 border-l-2 border-status-error bg-status-error/10 px-3 py-2 text-sm text-theme-text">
          {error}
        </p>
      )}

      {!summary && !error && (
        <p className="flex items-center gap-2 py-6 text-sm text-theme-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Working out what this would delete…
        </p>
      )}

      {summary && (
        <>
          <p className="text-sm leading-[1.6] text-theme-text">
            Deleting <strong className="break-all">{summary.email ?? 'this account'}</strong> removes
            it and everything below from the server, permanently. Anything saved
            only in this browser stays where it is.
          </p>

          <div className="mt-5">
            <Row label="Warbands" value={summary.warbands} />
            <Row label="Campaigns you play in" value={summary.memberships} />
            <Row label="Custom rules" value={summary.customRules} />
            {summary.bugReportsKeptAnonymously > 0 && (
              <Row
                label="Bug reports"
                value={`${summary.bugReportsKeptAnonymously} kept, unlinked from you`}
              />
            )}
          </div>

          {/*
            The consequence that is not the account holder's alone.

            Campaign.adminId cascades, so deleting an organiser deletes the
            campaign and every player's record in it. Naming each campaign and
            the number of other people in it is the difference between a
            warning and an ambush.
          */}
          {campaigns.length > 0 && (
            <div className="mt-5 border-l-2 border-status-error bg-status-error/10 px-3 py-3">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.10em] text-status-error">
                This also deletes {campaigns.length} campaign{campaigns.length > 1 ? 's' : ''} you run
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {campaigns.map((c) => (
                  <li key={c.name} className="text-sm leading-[1.5] text-theme-text">
                    <strong>{c.name}</strong>
                    {c.otherMembers > 0 ? (
                      <span className="text-theme-muted">
                        {' '}— {c.otherMembers} other player{c.otherMembers > 1 ? 's' : ''} lose
                        their record of it
                      </span>
                    ) : (
                      <span className="text-theme-muted"> — no other players</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <label className="mt-6 block">
            <span className="font-mono text-[11px] uppercase tracking-[0.10em] text-theme-muted">
              Type {CONFIRMATION} to confirm
            </span>
            {/* 16px, or iOS zooms the page when this takes focus. */}
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="mt-1.5 w-full min-h-[44px] rounded border border-theme-border bg-theme-base px-3 text-base font-mono text-theme-text focus:border-status-error focus:outline-none"
            />
          </label>
        </>
      )}
    </Sheet>
  );
};
