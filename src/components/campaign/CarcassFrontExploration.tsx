'use client';

/**
 * The Carcass Front Exploration Step (RR-09, FD-10).
 *
 * `rules/campaign.ts` has carried `resolveCarcassFrontExploration`,
 * `hasThreeOfAKind` and `carcassFrontResources` since the supplement landed,
 * and **nothing called any of them**. A Carcass Front campaign ran the
 * rulebook's Exploration Step instead, which is a different step in four ways,
 * and every one of them pays the wrong amount:
 *
 *   1. The pool is 3D6 and does not grow with games played — *"you must use
 *      the Carcass Front Exploration Tables at the end of this book, instead of
 *      the ones in the Trench Crusade Rulebook"*. The rulebook's pool grows to
 *      6D6, so a late-campaign Warband rolled twice the dice it is entitled to.
 *   2. Loot is the roll times FIVE, not ten.
 *   3. The table is chosen by RESOURCE — what the zone the game was played in
 *      offers — not by a rarity band.
 *   4. Only the Aggressor consults a table at all. The other player rolls,
 *      takes the loot, and checks their dice for three of a kind.
 *
 * Together those paid a Carcass Front Warband roughly four times what the book
 * pays it, which is the sort of error nobody notices until the season is over.
 *
 * Mobile-first: one column at 375px, the dice are 44px targets, and the
 * Resource picker is a full-width select rather than a row of chips, because
 * the Resource names are words and there are four of them.
 */
import React, { useMemo, useState } from 'react';
import { Dices } from 'lucide-react';

import {
  resolveCarcassFrontExploration,
  carcassFrontResources,
  carcassFrontLootPerPoint,
  carcassFrontStartingDice,
  type CarcassFrontExplorationOutcome,
} from '../../rules/campaign';
import type { Dataset } from '../../types/catalogue';

interface Props {
  dataset: Dataset;
  /** Locations this Warband has already found, so a repeat can be reported. */
  alreadyDiscovered: string[];
  /** Called with the loot, which both players collect whoever was Aggressor. */
  onLoot: (ducats: number) => void;
  /** Called with the Location's name when one is discovered, else undefined. */
  onDiscovered: (name: string | undefined) => void;
}

const d6 = () => Math.floor(Math.random() * 6) + 1;

export const CarcassFrontExploration: React.FC<Props> = ({
  dataset, alreadyDiscovered, onLoot, onDiscovered,
}) => {
  const resources = useMemo(() => carcassFrontResources(dataset), [dataset]);
  /* Both read from the supplement's own sentences (finding I). */
  const startingDice = carcassFrontStartingDice(dataset);
  const lootPerPoint = carcassFrontLootPerPoint(dataset);

  /*
    Whether this Warband was the Aggressor. It decides whether a table is
    consulted at all, and the app cannot know it — the book decides it in the
    game that was just played — so it is asked rather than assumed. Defaulting
    it either way would hand a player a Location they are not entitled to, or
    take one they are.
  */
  const [wasAggressor, setWasAggressor] = useState(false);
  const [resource, setResource] = useState<string>(resources[0] ?? '');
  const [dice, setDice] = useState<number[] | null>(null);
  /*
    A total rolled on the table rather than in the app, which the rulebook's own
    branch has offered since FD-07 and this one did not — and needs more, since
    the pool grows with Campaign Tracker rewards and Camp buildings that the app
    does not track, so a player past their first reward is rolling more dice
    than the panel can.
  */
  const [typedTotal, setTypedTotal] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<CarcassFrontExplorationOutcome | null>(null);

  /**
   * Resolve, from whatever the panel currently holds.
   *
   * Takes the answers as arguments rather than reading the state, because it is
   * called from the handlers that CHANGE them and React's state is still the
   * old value at that point. That was finding I: `settle` ran only on Roll, so
   * ticking Aggressor or changing the Resource after rolling left the result
   * reading "No table consulted" — the player had answered and the panel had
   * not noticed.
   */
  const settle = (
    total: number,
    rolled: number[] | null,
    aggressor: boolean,
    res: string,
  ) => {
    if (!(total > 0)) return;
    const result = resolveCarcassFrontExploration(dataset, {
      roll: total,
      dice: rolled ?? undefined,
      resource: aggressor ? (res || null) : null,
      alreadyDiscovered,
    });
    if (!result) return;
    setOutcome(result);
    onLoot(result.loot);
    /* Only a Location actually found is recorded. Carcass Front does not
       restate the rulebook's once-per-campaign rule, so a repeat is reported
       and still recorded — see `CarcassFrontExplorationOutcome`. */
    onDiscovered(result.location?.name);
  };

  /** The total on the panel now: the dice it rolled, or the one typed in. */
  const currentTotal = () =>
    (dice ? dice.reduce((a, b) => a + b, 0) : (typedTotal ?? 0));

  const roll = () => {
    const rolled = Array.from({ length: startingDice }, d6);
    setDice(rolled);
    setTypedTotal(null);
    settle(rolled.reduce((a, b) => a + b, 0), rolled, wasAggressor, resource);
  };

  const setAggressor = (next: boolean) => {
    setWasAggressor(next);
    settle(currentTotal(), dice, next, resource);
  };

  const setResourceAnd = (next: string) => {
    setResource(next);
    settle(currentTotal(), dice, wasAggressor, next);
  };

  if (!resources.length) {
    /* Rule 2. A ruleset without the supplement has no Carcass Front tables,
       and this says so rather than falling back to the rulebook's — which is
       the very substitution this whole panel exists to stop. */
    return (
      <div className="p-4 bg-theme-elevated border border-status-warning rounded space-y-2 text-xs leading-relaxed">
        <p className="font-gothic font-bold text-sm text-status-warning">
          EXPLORATION — NO CARCASS FRONT TABLES
        </p>
        <p className="text-theme-text">
          This campaign is a Carcass Front campaign, and the ruleset you have
          selected does not carry the Carcass Front Exploration Tables. The app
          will not roll on the rulebook&rsquo;s tables instead — they are a
          different step, at a different rate.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-theme-elevated border border-theme-border rounded space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="font-gothic font-bold text-sm text-theme-primary">
          EXPLORATION — {startingDice}D6, CARCASS FRONT
        </span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={roll}
            className="flex items-center justify-center space-x-1.5 px-3 min-h-[44px] lg:min-h-0 lg:py-1 bg-theme-primary hover:bg-theme-primary-hover text-theme-base rounded text-xs font-bold uppercase transition-colors"
          >
            <Dices className="w-3.5 h-3.5" />
            <span>Roll Scavenge</span>
          </button>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="Or the total you rolled"
            aria-label="Carcass Front Exploration Roll total"
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!(n > 0)) return;
              /* A typed total is the one from the table, with every Tracker and
                 Camp die already in it. The panel's own dice are cleared so the
                 two cannot disagree — the same rule the rulebook branch uses. */
              setDice(null);
              setTypedTotal(n);
              settle(n, null, wasAggressor, resource);
            }}
            className="w-full sm:w-40 min-h-[44px] rounded border border-theme-border bg-theme-base px-2 text-base sm:text-sm text-theme-primary focus:border-theme-primary focus:outline-none"
          />
        </div>
      </div>

      <p className="text-xs sm:text-[11px] text-theme-muted leading-relaxed">
        {startingDice} dice, and the loot is the roll &times; {lootPerPoint}. The
        pool does not grow with games played — it grows with Campaign Tracker
        rewards and Camp buildings, so enter the total from the table when yours
        has.
      </p>

      {/* Whose step this is. The Aggressor consults a table; the other player
          rolls, takes the loot and checks for three of a kind. */}
      <label className="flex items-start gap-2 min-h-[44px] lg:min-h-0 cursor-pointer text-xs text-theme-text">
        <input
          type="checkbox"
          checked={wasAggressor}
          /* Through `setAggressor`, which re-settles: a step already rolled
             must answer for what is ticked NOW, not for what was ticked when
             the dice went down. */
          onChange={(e) => setAggressor(e.target.checked)}
          className="mt-0.5 w-5 h-5 accent-current text-theme-primary"
        />
        <span>
          This Warband was the Aggressor
          <span className="block text-theme-muted leading-relaxed">
            Only the Aggressor consults a Resource table. The other player still
            rolls, still takes the loot, and still checks their dice for three of
            a kind.
          </span>
        </span>
      </label>

      {/* Shown either way, disabled for a player who was not the Aggressor.
          A picker that appears and disappears with a checkbox hides the fact
          that the Resource is what decides the table at all, and a player
          reading the panel is owed the list whether or not it is theirs to
          consult this time. */}
      <label className="block text-xs">
        <span className="block uppercase font-bold text-theme-text mb-1">
          Resource, from the zone the game was played in
        </span>
        <select
          value={resource}
          onChange={(e) => setResourceAnd(e.target.value)}
          disabled={!wasAggressor}
          className="w-full min-h-[44px] lg:min-h-0 lg:py-1 bg-theme-base border border-theme-border text-theme-primary rounded px-2 text-base sm:text-sm disabled:opacity-60"
        >
          {resources.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>

      {dice && (
        <div className="flex flex-wrap items-center gap-2">
          {dice.map((value, i) => (
            <span
              key={i}
              className="flex min-w-[44px] min-h-[44px] items-center justify-center rounded border border-theme-primary bg-theme-base font-gothic text-lg font-bold text-theme-primary"
            >
              {value}
            </span>
          ))}
          <span className="text-xs sm:text-[11px] font-mono text-theme-muted">
            = {dice.reduce((a, b) => a + b, 0)}
          </span>
        </div>
      )}

      {outcome && (
        <div className="p-3 bg-theme-base border border-theme-primary rounded space-y-1">
          <span className="text-xs font-bold text-theme-primary block">
            Roll {outcome.roll} — {outcome.location?.name
              ?? (outcome.resource
                ? 'Nothing on this table matches the roll'
                : 'No table consulted')} ({outcome.loot} Ducats)
          </span>
          {outcome.location?.description && (
            <p className="text-xs text-theme-text leading-relaxed">
              {outcome.location.description}
            </p>
          )}
          {outcome.previouslyDiscovered && (
            <p className="text-xs text-status-warning leading-relaxed">
              This Warband has found this Location before. Carcass Front does not
              restate the rulebook&rsquo;s once-per-campaign rule for its own
              tables, so the result stands — settle it with your opponent.
            </p>
          )}
          {/* Three of a kind, which is how a player who was NOT the Aggressor
              comes across agents for Rudolf's Folly. */}
          {outcome.rudolfsFolly && (
            <p className="text-xs text-theme-primary leading-relaxed">
              Three or more dice share a value: you come across agents for
              Rudolf&rsquo;s Folly.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
