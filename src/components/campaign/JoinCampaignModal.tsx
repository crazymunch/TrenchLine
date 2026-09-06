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
 * ## Downloading it is a second, asked-for step
 *
 * Joining and adopting are separate because adopting is DESTRUCTIVE: the store
 * holds one campaign, so pulling this one down replaces whatever is here. The
 * confirmation panel says which campaign would be replaced and whether it has
 * unpushed edits, and the player presses the button. A modal that quietly
 * downloaded over somebody's evening of play would be the worst kind of
 * helpful.
 *
 * Where there is nothing to lose — no campaign, or the same one — the wording
 * says so and the button is the obvious next thing rather than a warning.
 */
import React, { useEffect, useState } from 'react';
import { Check, Loader2, Users } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { useStore } from '../../store/useStore';
import { campaignOutbox } from '../../services/campaignSync';
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
  const [joined, setJoined] = useState<{ id: string; name: string; alreadyMember: boolean } | null>(null);
  const [adopted, setAdopted] = useState(false);

  const localCampaign = useStore((s) => s.campaign);
  const adoptCampaign = useStore((s) => s.adoptCampaignFromCloud);

  useEffect(() => {
    if (isOpen) {
      setCode(''); setPreview(null); setWarbandId(''); setPlayerName('');
      setError(null); setBusy(false); setJoined(null); setAdopted(false);
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
    setJoined({ id: res.data.id, name: preview.name, alreadyMember: res.data.alreadyMember });
  };

  /*
    What adopting would cost, named rather than implied.

    `cloudId` matching means this device already holds the campaign being
    joined, so there is nothing to lose. Otherwise the local campaign is
    replaced — and its queued operations go with it, which is the part a
    player cannot see for themselves.
  */
  const replacing = joined && localCampaign.cloudId !== joined.id
    ? {
        name: localCampaign.name,
        pending: localCampaign.cloudId
          ? campaignOutbox.forCampaign(localCampaign.cloudId).length
          : 0,
      }
    : null;

  const adopt = async () => {
    if (!joined) return;
    setBusy(true); setError(null);
    const ok = await adoptCampaign(joined.id);
    setBusy(false);
    if (!ok) {
      // The store recorded the reason on `campaignSync`; say the plain thing
      // here rather than leaving the sheet looking as though it worked.
      setError('The campaign could not be downloaded. Nothing on this device was changed.');
      return;
    }
    setAdopted(true);
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
          adopted ? (
            <button
              onClick={onClose}
              className="flex-1 min-h-[44px] rounded bg-theme-primary px-4 font-mono text-xs font-bold uppercase text-theme-base transition-all hover:bg-theme-primary-hover"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={busy}
                className="flex-1 min-h-[44px] rounded bg-theme-elevated px-4 font-mono text-xs font-bold uppercase text-theme-muted transition-all hover:bg-theme-border hover:text-theme-text disabled:opacity-50"
              >
                Not now
              </button>
              <button
                onClick={adopt}
                disabled={busy}
                className={`flex-1 min-h-[44px] rounded px-4 font-mono text-xs font-bold uppercase transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                  replacing
                    ? 'bg-status-error text-white hover:brightness-110'
                    : 'bg-theme-primary text-theme-base hover:bg-theme-primary-hover'
                }`}
              >
                {busy ? 'Downloading…' : replacing ? 'Replace and download' : 'Download it'}
              </button>
            </>
          )
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
          {adopted ? (
            <p className="mt-4 border-l-2 border-status-legal pl-3 text-sm leading-[1.6] text-theme-muted">
              It is on this device now — the map, the standings and the match
              history. Everything you do in it syncs back the way your warband
              already does.
            </p>
          ) : (
            <>
              {/*
                Adopting is destructive: the store holds ONE campaign. So the
                cost is named here rather than discovered afterwards, and the
                player presses the button. Where there is nothing to lose the
                wording says so instead of manufacturing a warning.
              */}
              {replacing ? (
                <div className="mt-4 border-l-2 border-status-error bg-status-error/10 px-3 py-3">
                  <p className="text-sm leading-[1.6] text-theme-text">
                    Downloading it <strong>replaces</strong> the campaign on this
                    device, <strong>{replacing.name}</strong>. This app holds one
                    campaign at a time.
                  </p>
                  {replacing.pending > 0 && (
                    <p className="mt-2 text-sm leading-[1.6] text-theme-text">
                      {replacing.pending} unsynced change
                      {replacing.pending === 1 ? '' : 's'} to it would be lost. Sync
                      that campaign first if you want to keep them.
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-4 border-l-2 border-theme-border pl-3 text-sm leading-[1.6] text-theme-muted">
                  Download it to play it on this device — the map, the standings
                  and the match history. Nothing here would be lost.
                </p>
              )}
            </>
          )}
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
