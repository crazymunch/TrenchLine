'use client';

/**
 * The Chronicle of Battles — every game this device has recorded.
 *
 * Until now a finished match left almost nothing behind: the campaign's
 * `MatchRecord` kept a date, a scenario, a narrative and exactly ONE
 * participant, the player's own warband. Everything the tracker collected
 * during the game — each side's Victory Points, which turn they were scored
 * on, who claimed each Glorious Deed, the weather — was discarded. In a
 * four-side game, three of them left no trace at all.
 *
 * A record is written when a match ENDS, never when it is aborted, and is not
 * editable afterwards. A chronicle you can revise is a chronicle nobody
 * trusts.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award, Cloud, CloudOff, RefreshCw, ScrollText, Shield, Swords, Trash2, Upload, Users,
} from 'lucide-react';

import { storage } from '@/services/storage';
import {
  deleteCloudBattle, fetchCloudBattles, mergeBattles, pushBattle,
  type BattleSyncFailure, type CloudBattle,
} from '@/services/battleSync';
import { victors, type BattleRecord } from '@/types/battle';
import { COALITION_NAME } from '@/rules/coalitions';

type Tab = 'battles' | 'deeds';

/**
 * What the cloud half is doing, as a value the header renders.
 *
 * `offline` and `signed-out` are separate states with separate sentences,
 * because they call for different things from the player: one is "try again
 * when you have signal", the other is "sign in and your mates' games appear".
 * Collapsing them into one grey icon is how a feature gets reported as broken.
 */
type CloudState =
  | { kind: 'loading' }
  | { kind: 'ready'; count: number }
  | { kind: 'failed'; failure: BattleSyncFailure };

const dateOf = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? 'Date unrecorded'
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
};

interface CardProps {
  battle: BattleRecord;
  /** Absent where this device did not record it — see `onForget` below. */
  onForget?: (id: string) => void;
  /** Who recorded it, where that was not this device. */
  recordedBy?: string;
  /** Recorded here and not yet in the cloud, with a way to try again. */
  onShare?: (id: string) => void;
  sharing?: boolean;
}

const BattleCard: React.FC<CardProps> =
  ({ battle, onForget, recordedBy, onShare, sharing }) => {
    const won = victors(battle);
    const wonIds = new Set(won.map((s) => s.id));
    const [confirming, setConfirming] = useState(false);

    return (
      <article className="space-y-3 rounded-md border border-theme-border bg-theme-surface p-4 bevel-container">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-gothic text-base font-bold text-theme-text">
              {battle.scenarioName}
            </h3>
            <span className="block text-xs sm:text-[10px] uppercase text-theme-muted">
              {dateOf(battle.endedAt)} · {battle.turns} turn{battle.turns === 1 ? '' : 's'}
              {battle.weather ? ` · ${battle.weather.name}` : ''}
            </span>
          </div>
          {/*
            No forget button on someone else's record.

            A battle you fought in but did not record is not yours to delete:
            it is the same game the other three players are looking at. The
            server refuses it too — this is so the control is never offered in
            the first place.
          */}
          {onForget && (confirming ? (
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => onForget(battle.id)}
                className="min-h-[44px] rounded border border-status-error px-2.5 text-xs font-bold uppercase text-status-error"
              >
                Forget
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="min-h-[44px] rounded border border-theme-border px-2.5 text-xs text-theme-muted"
              >
                Keep
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              aria-label={`Forget the battle at ${battle.scenarioName}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center text-theme-muted transition-colors hover:text-status-error"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ))}
        </header>

        {/* Where it came from, stated rather than assumed. */}
        {recordedBy && (
          <span className="flex items-center gap-1.5 text-xs sm:text-[10px] uppercase text-theme-muted">
            <Cloud className="h-3 w-3 shrink-0 text-theme-primary" />
            Recorded by {recordedBy}
          </span>
        )}
        {onShare && (
          <button
            onClick={() => onShare(battle.id)}
            disabled={sharing}
            className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded border border-theme-border text-xs font-bold uppercase text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {sharing ? 'Sharing\u2026' : 'On this device only \u2014 share it'}
          </button>
        )}

        {/* Coalition totals where it was fought as one, per side always. */}
        {battle.coalitionTotals && (
          <div className="flex gap-2">
            {(['A', 'B'] as const).map((c) => (
              <div key={c} className="flex-1 rounded border border-theme-border bg-theme-base px-2.5 py-1.5">
                <span className="block text-xs sm:text-[10px] uppercase text-theme-muted">
                  {COALITION_NAME[c]}
                </span>
                <span className="font-gothic text-lg font-bold text-theme-primary">
                  {battle.coalitionTotals![c]}
                </span>
              </div>
            ))}
          </div>
        )}

        <ul className="space-y-1">
          {battle.sides.map((s) => (
            <li
              key={s.id}
              className={`flex items-center justify-between gap-2 rounded border px-2.5 py-1.5 ${
                wonIds.has(s.id)
                  ? 'border-theme-primary/50 bg-theme-primary/10'
                  : 'border-theme-border bg-theme-base'
              }`}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {s.wasPlaceholder
                  ? <Users className="h-3.5 w-3.5 shrink-0 text-theme-muted" />
                  : <Shield className="h-3.5 w-3.5 shrink-0 text-theme-primary" />}
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-theme-text">{s.name}</span>
                  <span className="block truncate text-xs sm:text-[10px] uppercase text-theme-muted">
                    {s.factionId}
                    {s.coalition ? ` · ${COALITION_NAME[s.coalition]}` : ''}
                  </span>
                </span>
              </span>
              <span className="shrink-0 font-gothic text-base font-bold text-theme-primary">
                {s.vp} VP
              </span>
            </li>
          ))}
        </ul>

        {/* A draw says so rather than leaving the reader to compare numbers. */}
        {!won.length && (
          <span className="block text-center text-xs sm:text-[10px] uppercase text-theme-muted">
            No side took the field
          </span>
        )}

        {battle.deeds.length > 0 && (
          <div className="space-y-1 border-t border-theme-border pt-2">
            <span className="eyebrow text-theme-muted">
              Glorious Deeds ({battle.deeds.length})
            </span>
            {battle.deeds.map((d, i) => (
              <div key={`${d.title}-${i}`} className="text-xs">
                <span className="font-bold text-theme-text">{d.title}</span>
                <span className="text-theme-muted">
                  {' — '}{d.sideName}{d.unitName ? `, ${d.unitName}` : ''}{d.turn ? `, turn ${d.turn}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </article>
    );
  };

export const ChronicleView: React.FC = () => {
  const [local, setLocal] = useState<BattleRecord[]>([]);
  const [remote, setRemote] = useState<CloudBattle[]>([]);
  const [cloud, setCloud] = useState<CloudState>({ kind: 'loading' });
  const [sharing, setSharing] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('battles');

  /* Read once on mount, not at module scope: `localStorage` on the first
     render is the hydration mismatch `store/init.ts` exists to avoid. */
  useEffect(() => { setLocal(storage.getBattles()); }, []);

  const loadCloud = useCallback(async () => {
    setCloud({ kind: 'loading' });
    const res = await fetchCloudBattles();
    if (!res.ok) {
      /* The local list still renders. What does NOT happen is the cloud's
         absence passing for an answer — rule 2, and `githubSync.ts` is the
         shipped example of getting it wrong. */
      setCloud({ kind: 'failed', failure: res.failure });
      return;
    }
    setRemote(res.battles);
    setCloud({ kind: 'ready', count: res.battles.length });
  }, []);

  useEffect(() => { void loadCloud(); }, [loadCloud]);

  const localIds = useMemo(() => new Set(local.map((b) => b.id)), [local]);
  const remoteById = useMemo(
    () => new Map(remote.map((b) => [b.id, b])), [remote],
  );
  const ordered = useMemo(() => mergeBattles(local, remote), [local, remote]);

  /**
   * Share a battle the cloud does not have.
   *
   * Offered rather than retried silently. The push at the end of the match is
   * fire-and-forget, so a game recorded with no signal simply sits here until
   * someone says to send it — and saying so is one tap, which is better than a
   * background retry nobody can see succeed or fail.
   */
  const share = async (id: string) => {
    const battle = local.find((b) => b.id === id);
    if (!battle) return;
    setSharing(id);
    const res = await pushBattle(battle);
    setSharing(null);
    if (res.ok) await loadCloud();
    else setCloud({ kind: 'failed', failure: res.failure });
  };

  /**
   * Every Deed ever claimed, newest first.
   *
   * Flattened across battles rather than grouped by title: the same Deed
   * claimed in three games is three separate facts about three nights, and
   * collapsing them would lose who took it and when.
   */
  const allDeeds = useMemo(
    () => ordered.flatMap((b) => b.deeds.map((d) => ({ ...d, battle: b }))),
    [ordered],
  );

  /**
   * Forget a battle this device recorded.
   *
   * Both copies. Forgetting it locally while leaving it in the cloud would
   * bring it back on the next load, which reads as the app refusing to obey —
   * and the cloud delete is attempted whether or not one is expected there,
   * because a 404 for a battle that was never pushed is the right answer and
   * costs nothing.
   */
  const forget = async (id: string) => {
    setLocal(storage.deleteBattle(id));
    setRemote((prev) => prev.filter((b) => b.id !== id));
    await deleteCloudBattle(id);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-4 pb-24 font-mono text-xs sm:px-6 sm:py-6 lg:px-8">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 font-gothic text-xl font-bold text-theme-text">
          <ScrollText className="h-5 w-5 text-theme-primary" />
          Chronicle of Battles
        </h1>
        <p className="text-theme-muted">
          Every battle recorded by you or fought against you, as it stood when
          the match ended. Written when a match ends, never when it is aborted,
          and never edited after.
        </p>
      </header>

      {/*
        What the cloud half is doing, in a sentence.

        Four states and four sentences, because they ask different things of
        the player. The one thing this must never do is go quiet on a failure
        and let a short list pass for the whole Chronicle.
      */}
      <div
        role="status"
        className="flex flex-wrap items-center gap-2 rounded border border-theme-border bg-theme-surface px-3 py-2"
      >
        {cloud.kind === 'loading' && (
          <span className="flex items-center gap-1.5 text-theme-muted">
            <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" />
            Looking for shared battles&hellip;
          </span>
        )}
        {cloud.kind === 'ready' && (
          <span className="flex items-center gap-1.5 text-theme-muted">
            <Cloud className="h-3.5 w-3.5 shrink-0 text-theme-primary" />
            Shared with your campaigns and the warbands you fought.
          </span>
        )}
        {cloud.kind === 'failed' && (
          <span className="flex items-center gap-1.5 text-theme-muted">
            <CloudOff className="h-3.5 w-3.5 shrink-0 text-status-warning" />
            {cloud.failure.kind === 'signed-out'
              ? 'Signed out, so this is only what this device recorded. Sign in to see the games your opponents recorded.'
              : cloud.failure.kind === 'offline'
                ? 'The shared Chronicle could not be reached, so this is only what this device recorded. It is not the whole story.'
                : `The shared Chronicle refused: ${cloud.failure.detail} This is only what this device recorded.`}
          </span>
        )}
        {cloud.kind !== 'loading' && (
          <button
            onClick={() => { void loadCloud(); }}
            className="ml-auto flex min-h-[44px] items-center gap-1.5 rounded border border-theme-border px-3 text-xs font-bold uppercase text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        )}
      </div>

      <div className="flex gap-1.5">
        {([['battles', 'Battles', Swords], ['deeds', 'Glorious Deeds', Award]] as const)
          .map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded border px-3 text-xs font-bold uppercase transition-colors ${
                tab === id
                  ? 'border-theme-primary bg-theme-primary/15 text-theme-primary'
                  : 'border-theme-border text-theme-muted hover:text-theme-text'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              <span className="text-xs sm:text-[10px]">
                ({id === 'battles' ? ordered.length : allDeeds.length})
              </span>
            </button>
          ))}
      </div>

      {ordered.length === 0 && (
        <div className="rounded-md border border-dashed border-theme-border p-6 text-center">
          <span className="block font-bold uppercase text-theme-muted">
            No battles recorded yet
          </span>
          <span className="mt-1 block text-theme-muted">
            Finish a match in Play Mode with End Match and it will be written here,
            and shared with the other warbands that were on the table.
            A match you abort is not recorded.
          </span>
        </div>
      )}

      {tab === 'battles' && ordered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {ordered.map((b) => {
            const mine = localIds.has(b.id);
            const inCloud = remoteById.has(b.id);
            return (
              <BattleCard
                key={b.id}
                battle={b}
                onForget={mine ? (id) => { void forget(id); } : undefined}
                recordedBy={mine ? undefined : remoteById.get(b.id)?.cloud.ownerName}
                /* Offered only where the cloud ANSWERED and did not have it.
                   While the fetch is failing, nothing is known about what the
                   server holds, and "share it" would be a guess. */
                onShare={mine && cloud.kind === 'ready' && !inCloud
                  ? (id) => { void share(id); }
                  : undefined}
                sharing={sharing === b.id}
              />
            );
          })}
        </div>
      )}

      {tab === 'deeds' && ordered.length > 0 && (
        <div className="space-y-2">
          {allDeeds.length === 0 && (
            <span className="block text-theme-muted">
              No Glorious Deeds have been claimed in a recorded battle.
            </span>
          )}
          {allDeeds.map((d, i) => (
            <article
              key={`${d.battle.id}-${d.title}-${i}`}
              className="space-y-1 rounded-md border border-theme-border bg-theme-surface p-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-gothic text-sm font-bold text-theme-text">{d.title}</h3>
                <span className="shrink-0 text-xs sm:text-[10px] uppercase text-theme-muted">
                  {dateOf(d.battle.endedAt)}
                </span>
              </div>
              <span className="block text-xs text-theme-primary">
                {d.sideName}{d.unitName ? ` · ${d.unitName}` : ''}{d.turn ? ` · turn ${d.turn}` : ''}
              </span>
              {/* The text as it read on the night, copied into the record —
                  the dataset is rebuilt from upstream, and a Deed described
                  from today's wording would re-describe a past battle. */}
              {d.description
                ? <p className="text-theme-muted">{d.description}</p>
                : <p className="italic text-theme-muted">
                    The scenario no longer prints this Deed&rsquo;s text.
                  </p>}
              <span className="block text-xs sm:text-[10px] uppercase text-theme-muted">
                {d.battle.scenarioName}
              </span>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
