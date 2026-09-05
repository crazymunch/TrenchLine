'use client';

/**
 * Spending an invite code.
 *
 * SYNC-4: the code had a generator worth guessing at, a preview endpoint and
 * a rate limit, and nothing that consumed it. An organiser could publish a
 * campaign and hand out a code that did nothing — half a feature, and the half
 * that looks finished from the outside.
 *
 * ## Look before you leap
 *
 * The code is checked first and the campaign is NAMED before the join button
 * appears. An invite travels through channels nobody here controls — a group
 * chat, a photograph of a screen — so "you have the right campaign" is a
 * question worth answering before a warband is committed to it. The preview
 * the server gives is a name and a size and nothing else, for the same
 * reason: holding a code is not membership.
 *
 * ## The warband is chosen, not assumed
 *
 * Not the active one. Joining is the moment a player decides which roster they
 * are running for a whole campaign, and defaulting it to whatever was last
 * open is how somebody enters their half-built test warband. Only synced
 * warbands are offered, because the server can only enrol a roster it has.
 *
 * ## What joining does NOT do yet, and why this says so
 *
 * The membership is real: the warband is in the campaign on the server, and
 * the organiser's roll-up will show it. The campaign does not appear on THIS
 * device, because campaign sync is push-only today — `syncCampaignWithCloud`
 * sends an outbox and reads back a version, and there is no path that pulls a
 * campaign down onto a device that does not already have it (SYNC-5).
 *
 * The confirmation panel says that in as many words. A modal that closed with
 * a tick and left the player looking for a campaign that never arrives would
 * be the app implying a feature it does not have, which is the failure this
 * codebase has a rule about.
 */
import React, { useEffect, useState } from 'react';
import { Check, Loader2, Users } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { storage, type CampaignInvitePreview } from '../../services/storage';
import type { Warband } from '../../types/warband';

interface JoinCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The caller's rosters. Only ones the server holds can be enrolled. */
  warbands: Warband[];
}

export const JoinCampaignModal: React.FC<JoinCampaignModalProps> = ({
  isOpen, onClose, warbands,
}) => {
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<CampaignInvitePreview | null>(null);
  const [warbandId, setWarbandId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState<{ name: string; alreadyMember: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCode(''); setPreview(null); setWarbandId(''); setPlayerName('');
      setError(null); setBusy(false); setJoined(null);
    }
  }, [isOpen]);

  /*
    Only rosters the server holds.

    A warband that has never synced has no row to enrol, so offering it would
    produce a 404 the player cannot act on. Saying which warbands are eligible,
    and why the list is short, beats a failure after the fact.
  */
  const eligible = warbands.filter((w) => Boolean(w.id));

  const look = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setBusy(true); setError(null); setPreview(null);
    const res = await storage.previewCampaignInvite(trimmed);
    setBusy(false);
    if (!res.ok) {
      // The server's own sentence where it wrote one — "No campaign has that
      // invite code." is the answer, `HTTP 404` is not.
      setError(res.reason === 'unauthenticated'
        ? 'Sign in to join a campaign.'
        : res.detail);
      return;
    }
    setPreview(res.data);
    setCode(trimmed);
  };

  const join = async () => {
    if (!preview || !warbandId) return;
    setBusy(true); setError(null);
    const res = await storage.joinCampaignWithInvite(
      code.trim().toUpperCase(), warbandId, playerName.trim() || undefined);
    setBusy(false);
    if (!res.ok) {
      setError(res.reason === 'unauthenticated'
        ? 'Sign in to join a campaign.'
        : res.detail);
      return;
    }
    setJoined({ name: preview.name, alreadyMember: res.data.alreadyMember });
  };

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      size="md"
      title="Join a campaign"
      subtitle="With the invite code its organiser gave you."
      footer={
        joined ? (
          <button
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded bg-theme-primary px-4 font-mono text-xs font-bold uppercase text-theme-base transition-all hover:bg-theme-primary-hover"
          >
            Done
          </button>
        ) : preview ? (
          <>
            <button
              onClick={onClose}
              disabled={busy}
              className="flex-1 min-h-[44px] rounded bg-theme-elevated px-4 font-mono text-xs font-bold uppercase text-theme-muted transition-all hover:bg-theme-border hover:text-theme-text disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={join}
              disabled={busy || !warbandId}
              className="flex-1 min-h-[44px] rounded bg-theme-primary px-4 font-mono text-xs font-bold uppercase text-theme-base transition-all hover:bg-theme-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Joining…' : 'Join campaign'}
            </button>
          </>
        ) : (
          <button
            onClick={look}
            disabled={busy || !code.trim()}
            className="flex-1 min-h-[44px] rounded bg-theme-primary px-4 font-mono text-xs font-bold uppercase text-theme-base transition-all hover:bg-theme-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Checking…' : 'Look up code'}
          </button>
        )
      }
    >
      {error && (
        <p role="alert" className="mb-4 border-l-2 border-status-error bg-status-error/10 px-3 py-2 text-sm text-theme-text">
          {error}
        </p>
      )}

      {joined ? (
        <div>
          <p className="flex items-start gap-2 text-sm leading-[1.6] text-theme-text">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-legal" aria-hidden />
            <span>
              {joined.alreadyMember
                ? <>That warband was already in <strong>{joined.name}</strong>.</>
                : <>Your warband is now in <strong>{joined.name}</strong>.</>}
            </span>
          </p>
          {/*
            The honest half. See the note at the top of this file: the
            membership is real and the organiser will see it; the campaign
            itself does not arrive here, because nothing pulls one down yet.
          */}
          <p className="mt-4 border-l-2 border-theme-border pl-3 text-sm leading-[1.6] text-theme-muted">
            The organiser will see it in their campaign. The campaign will not
            appear on this device yet — pulling one down onto a device that
            does not already have it is not built. Ask the organiser for the
            standings until it is.
          </p>
        </div>
      ) : (
      <>
      <label className="block">
        <span className="font-mono text-[11px] uppercase tracking-[0.10em] text-theme-muted">
          Invite code
        </span>
        {/* 16px, or iOS zooms the page when this takes focus. */}
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value); setPreview(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !preview) { e.preventDefault(); look(); } }}
          placeholder="TRENCH-…"
          autoComplete="off"
          spellCheck={false}
          className="mt-1.5 w-full min-h-[44px] rounded border border-theme-border bg-theme-base px-3 text-base font-mono uppercase text-theme-text focus:border-theme-primary focus:outline-none"
        />
      </label>

      {busy && !preview && (
        <p className="mt-4 flex items-center gap-2 text-sm text-theme-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Looking it up…
        </p>
      )}

      {preview && (
        <>
          <div className="mt-5 border border-theme-border bg-theme-surface p-4">
            <p className="font-gothic text-lg font-bold text-theme-text">{preview.name}</p>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-[12px] text-theme-muted">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {preview.memberCount} warband{preview.memberCount === 1 ? '' : 's'}
              {preview.maxWarbandDucats > 0 && <> · {preview.maxWarbandDucats} Ducat limit</>}
            </p>
          </div>

          {eligible.length === 0 ? (
            /*
              Said plainly rather than shown as an empty select. The player has
              the right code and cannot use it, and the reason — nothing has
              synced — is one they can act on.
            */
            <p className="mt-5 border-l-2 border-status-error bg-status-error/10 px-3 py-2 text-sm leading-[1.6] text-theme-text">
              None of your warbands have been synced yet, so there is nothing
              for the campaign to enrol. Sync one and come back.
            </p>
          ) : (
            <>
              <label className="mt-5 block">
                <span className="font-mono text-[11px] uppercase tracking-[0.10em] text-theme-muted">
                  Warband to field
                </span>
                <select
                  value={warbandId}
                  onChange={(e) => setWarbandId(e.target.value)}
                  className="mt-1.5 w-full min-h-[44px] rounded border border-theme-border bg-theme-base px-2 text-base font-mono text-theme-text focus:border-theme-primary focus:outline-none"
                >
                  <option value="">Choose a warband…</option>
                  {eligible.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </label>

              <label className="mt-4 block">
                <span className="font-mono text-[11px] uppercase tracking-[0.10em] text-theme-muted">
                  Your name at the table <span className="normal-case">(optional)</span>
                </span>
                <input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your account name"
                  maxLength={60}
                  className="mt-1.5 w-full min-h-[44px] rounded border border-theme-border bg-theme-base px-3 text-base font-mono text-theme-text focus:border-theme-primary focus:outline-none"
                />
              </label>
            </>
          )}
        </>
      )}
      </>
      )}
    </Sheet>
  );
};
