'use client';

/**
 * The live match mirror, in the Play Mode lobby.
 *
 * LIVE-1, replacing the panel that used to sit here: a roadmap describing a
 * Match PIN, a QR code, alliance timers and a host who deals card decks, under
 * an "In Development" badge. None of that was built, and a screen that
 * describes a feature in the present tense is the same defect as a checklist
 * that lags the code — worse, because a player reads it as an offer.
 *
 * What is built is narrower and real: **one device is the table, and everyone
 * else in the campaign can watch it.** See `docs/LIVE-MODE.md` for why that
 * shape first, and why two-way editing is a separate, later question.
 */
import React, { useMemo, useState } from 'react';
import { Crown, Eye, Loader2, Radio, Users } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { boardFrom } from '../../services/liveMatch';
import { useLiveHost, useLiveMatches, useLiveWatch } from './useLiveMirror';
import type { Warband } from '../../types/warband';

/** How stale the board on screen is, in words a player can act on. */
const staleness = (at: string | null): string => {
  if (!at) return 'not yet';
  const seconds = Math.round((Date.now() - new Date(at).getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
};

const StatusDot: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${
      status === 'Out of Action' ? 'bg-status-error'
        : status === 'Downed' ? 'bg-theme-accent'
          : 'bg-status-legal'
    }`}
    aria-hidden
  />
);

export const LiveMirrorPanel: React.FC<{ warband: Warband | null; turn: number }> = ({
  warband, turn,
}) => {
  const campaign = useStore((s) => s.campaign);
  const [hosting, setHosting] = useState(false);
  const [watchingId, setWatchingId] = useState<string | null>(null);

  /*
    Rebuilt every render, which is cheap and is the point: the host hook
    compares it against what it last sent and pushes only when something a
    watcher could see has moved. Deciding that here would mean this component
    knowing which fields matter, which is exactly what `boardChanged` is for.
  */
  const board = useMemo(
    () => (warband ? boardFrom(turn, warband.name, warband.units) : null),
    [warband, turn],
  );

  const host = useLiveHost(hosting, campaign.cloudId, board);
  const matches = useLiveMatches(campaign.cloudId);
  const watched = useLiveWatch(watchingId);

  /*
    A campaign with no cloud identity cannot have a mirror, and saying why
    beats a disabled button with no explanation. Publishing is one press in the
    campaign hub — this names it rather than describing the concept.
  */
  if (!campaign.cloudId) {
    return (
      <div className="bevel-container space-y-3 rounded-md border-2 border-theme-border bg-theme-surface p-6">
        <h2 className="font-gothic text-lg font-bold text-theme-text">Live match mirror</h2>
        <p className="text-sm leading-[1.6] text-theme-muted">
          This campaign is only on this device, so there is nobody to mirror it
          to. Publish it from the Crusade Campaign hub and this becomes
          available to everyone in it.
        </p>
      </div>
    );
  }

  const others = matches.filter((m) => m.id !== host.matchId);

  return (
    <div className="bevel-container space-y-6 rounded-md border-2 border-theme-accent bg-theme-surface p-6">
      <div className="flex items-start gap-3 border-b border-theme-border pb-4">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded border border-theme-accent bg-theme-accent/20">
          <Users className="h-5 w-5 text-status-error" />
        </span>
        <div>
          <h2 className="font-gothic text-lg font-bold text-theme-text sm:text-xl">
            Live match mirror
          </h2>
          <p className="text-xs leading-[1.5] text-theme-muted">
            One device runs the game; everyone else in the campaign can watch
            the board. Watching is read-only — the host owns the table.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------ host */}
      <div className="space-y-3 border-l-2 border-theme-primary bg-theme-base p-4">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-theme-primary" />
          <strong className="font-gothic text-sm font-bold uppercase text-theme-text">
            Share this board
          </strong>
        </div>

        {hosting ? (
          <>
            <p className="flex items-center gap-2 text-sm text-theme-text">
              <Radio className="h-4 w-4 animate-pulse text-status-legal" aria-hidden />
              Sharing <strong>{warband?.name ?? 'this board'}</strong>
              <span className="font-mono text-xs text-theme-muted">
                {host.pushing ? 'sending…' : `revision ${host.revision}`}
              </span>
            </p>
            {host.error && (
              <p role="alert" className="border-l-2 border-status-error bg-status-error/10 px-3 py-2 text-sm text-theme-text">
                {host.error} It will keep trying.
              </p>
            )}
            <button
              onClick={() => { setHosting(false); void host.stop(); }}
              className="min-h-[44px] rounded bg-theme-elevated px-4 font-mono text-xs font-bold uppercase text-theme-muted transition-colors hover:bg-theme-border hover:text-theme-text"
            >
              Stop sharing
            </button>
          </>
        ) : (
          <>
            <p className="text-sm leading-[1.6] text-theme-muted">
              Sends wounds, status, markers and whose turn it is — about every
              two seconds, and only when something changes. Your roster, your
              wargear and your notes stay on this device.
            </p>
            <button
              onClick={() => setHosting(true)}
              disabled={!warband}
              className="min-h-[44px] rounded bg-theme-primary px-4 font-mono text-xs font-bold uppercase text-theme-base transition-colors hover:bg-theme-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start sharing
            </button>
          </>
        )}
      </div>

      {/* --------------------------------------------------------- watcher */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-theme-primary" />
          <strong className="font-gothic text-sm font-bold uppercase text-theme-text">
            Watch a game
          </strong>
        </div>

        {others.length === 0 ? (
          <p className="text-sm text-theme-muted">
            Nobody else in this campaign is sharing a board right now.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {others.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => setWatchingId(watchingId === m.id ? null : m.id)}
                  className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded border px-3 text-left transition-colors ${
                    watchingId === m.id
                      ? 'border-theme-primary bg-theme-elevated'
                      : 'border-theme-border bg-theme-base hover:border-theme-primary'
                  }`}
                >
                  <span className="truncate text-sm font-bold text-theme-text">
                    {m.hostName ?? 'A commander'}
                  </span>
                  <span className="flex-shrink-0 font-mono text-[11px] uppercase tracking-[0.10em] text-theme-muted">
                    {watchingId === m.id ? 'watching' : 'watch'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {watchingId && (
          <div className="border border-theme-border bg-theme-base p-4">
            {watched.error && (
              <p role="alert" className="mb-3 border-l-2 border-status-error bg-status-error/10 px-3 py-2 text-sm text-theme-text">
                {watched.error}
              </p>
            )}

            {!watched.board && !watched.error && (
              <p className="flex items-center gap-2 text-sm text-theme-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Waiting for the first board…
              </p>
            )}

            {watched.board && (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-theme-border pb-2">
                  <strong className="font-gothic text-base text-theme-text">
                    {watched.board.warbandName}
                  </strong>
                  <span className="font-mono text-[11px] uppercase tracking-[0.10em] text-theme-muted">
                    Turn {watched.board.turn} · updated {staleness(watched.at)}
                  </span>
                </div>

                <ul className="mt-2 flex flex-col">
                  {watched.board.units.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center gap-2 border-b border-theme-border py-2 text-sm last:border-b-0"
                    >
                      <StatusDot status={u.status} />
                      <span className={`flex-1 truncate ${u.acted ? 'text-theme-muted line-through' : 'text-theme-text'}`}>
                        {u.name}
                      </span>
                      <span className="flex-shrink-0 font-mono text-xs text-theme-muted">
                        {u.wounds}/{u.maxWounds}
                        {u.blood > 0 && <span className="ml-2 text-status-error">✚{u.blood}</span>}
                        {u.blessing > 0 && <span className="ml-2 text-brand-gold">✦{u.blessing}</span>}
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="mt-3 text-xs leading-[1.5] text-theme-muted">
                  Read-only. The host owns this board — nothing you do here
                  reaches their device.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
