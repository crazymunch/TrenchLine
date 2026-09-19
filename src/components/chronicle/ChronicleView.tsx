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
import React, { useEffect, useMemo, useState } from 'react';
import { Award, ScrollText, Shield, Swords, Trash2, Users } from 'lucide-react';

import { storage } from '@/services/storage';
import { victors, type BattleRecord } from '@/types/battle';
import { COALITION_NAME } from '@/rules/coalitions';

type Tab = 'battles' | 'deeds';

const dateOf = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? 'Date unrecorded'
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
};

const BattleCard: React.FC<{ battle: BattleRecord; onForget: (id: string) => void }> =
  ({ battle, onForget }) => {
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
          {confirming ? (
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
          )}
        </header>

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
                  {' — '}{d.sideName}{d.turn ? `, turn ${d.turn}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </article>
    );
  };

export const ChronicleView: React.FC = () => {
  const [battles, setBattles] = useState<BattleRecord[]>([]);
  const [tab, setTab] = useState<Tab>('battles');

  /* Read once on mount, not at module scope: `localStorage` on the first
     render is the hydration mismatch `store/init.ts` exists to avoid. */
  useEffect(() => { setBattles(storage.getBattles()); }, []);

  const ordered = useMemo(
    () => [...battles].sort((a, b) => b.endedAt.localeCompare(a.endedAt)),
    [battles],
  );

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

  const forget = (id: string) => setBattles(storage.deleteBattle(id));

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-4 pb-24 font-mono text-xs sm:px-6 sm:py-6 lg:px-8">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 font-gothic text-xl font-bold text-theme-text">
          <ScrollText className="h-5 w-5 text-theme-primary" />
          Chronicle of Battles
        </h1>
        <p className="text-theme-muted">
          Every battle this device has recorded, as it stood when the match ended.
          Written when a match ends, never when it is aborted, and never edited after.
        </p>
      </header>

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
            Finish a match in Play Mode with End Match and it will be written here.
            A match you abort is not recorded.
          </span>
        </div>
      )}

      {tab === 'battles' && ordered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {ordered.map((b) => <BattleCard key={b.id} battle={b} onForget={forget} />)}
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
                {d.sideName}{d.turn ? ` · turn ${d.turn}` : ''}
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
