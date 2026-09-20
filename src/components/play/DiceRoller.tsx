'use client';

import React, { useState } from 'react';
import { soundEffects } from '../../services/soundEffects';
import {
  rollSuccess, rollInjury, describePool, formatSigned, capInjuryModifier,
  SUCCESS_LABEL, INJURY_LABEL, INJURY_EFFECT,
  type SuccessRoll, type InjuryRoll,
} from '../../rules/dice';
import {
  Dices,
  Skull,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';

/**
 * The dice console, rebuilt on `rules/dice.ts`.
 *
 * What it replaced kept the single highest die on an Injury Roll and threw the
 * rest away, so a Bloodbath of 6, 5, 4 against -3 Armour read as 3 — a Minor
 * Hit — where the book gives 12 and the model is Out of Action. It also
 * invented both result tables, added a fumble band the game does not have, and
 * offered a "3D6 (Bloodbath / +1 Inj)" button that conflated two unrelated
 * rules: +1 INJURY DICE rolls three dice and keeps the two highest, while a
 * Bloodbath rolls three and adds all three.
 *
 * So the arithmetic lives in `rules/dice.ts`, tested against the rulebook's own
 * worked examples, and this file is the console around it. The controls now say
 * what the book says — INJURY DICE and INJURY MODIFIER are two separate things
 * and are two separate controls.
 */

type DiceMode = 'success' | 'injury' | 'pool';

type PoolRoll = { kind: 'pool'; rolled: number[]; total: number; sixes: number; ones: number };
type AnyRoll = SuccessRoll | InjuryRoll | PoolRoll;

/** One line of the roll history. Built from the result, never from the inputs. */
function describe(r: AnyRoll): string {
  if (r.kind === 'pool') {
    return `Pool ${r.rolled.length}D6: [${r.rolled.join(', ')}] = ${r.total}`;
  }
  const dice = r.kept.join(' + ');
  const mod = r.modifier !== 0 ? ` ${formatSigned(r.modifier)}` : '';
  if (r.kind === 'success') {
    return `Success Roll: [${dice}] = ${r.total} — ${SUCCESS_LABEL[r.outcome]}`
      + (r.risky && r.outcome === 'failure' ? ' (Activation ends)' : '');
  }
  const label = r.bloodbath ? (r.deadly ? 'Bloodbath (DEADLY)' : 'Bloodbath') : 'Injury Roll';
  return `${label}: [${dice}]${mod} = ${r.total} — ${INJURY_LABEL[r.outcome]}`;
}

const SUCCESS_TONE: Record<SuccessRoll['outcome'], string> = {
  failure: 'text-status-error',
  success: 'text-status-legal',
  critical: 'text-theme-primary',
};

const INJURY_TONE: Record<InjuryRoll['outcome'], string> = {
  'no-effect': 'text-status-legal',
  'minor-hit': 'text-status-warning',
  down: 'text-status-warning',
  'out-of-action': 'text-status-error',
};

export const DiceRoller: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeMode, setActiveMode] = useState<DiceMode>('success');

  // Success Roll: one signed number, because the book cancels +DICE against
  // -DICE before rolling anything.
  const [successDice, setSuccessDice] = useState(0);
  const [isRisky, setIsRisky] = useState(false);

  // Injury Roll: INJURY DICE and INJURY MODIFIER are different rules and get
  // different controls. The console this replaced had one for both.
  const [injuryDice, setInjuryDice] = useState(0);
  const [injuryModifier, setInjuryModifier] = useState(0);
  const [isBloodbath, setIsBloodbath] = useState(false);
  const [isDeadly, setIsDeadly] = useState(false);

  const [poolCount, setPoolCount] = useState(4);

  const [history, setHistory] = useState<string[]>([]);
  const [last, setLast] = useState<AnyRoll | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const handleToggleMute = () => setIsMuted(soundEffects.toggleMute());

  const record = (r: AnyRoll) => {
    setLast(r);
    setHistory((prev) => [describe(r), ...prev.slice(0, 7)]);
  };

  const handleSuccess = () => {
    soundEffects.playDiceRoll();
    const r = rollSuccess({ dice: successDice, risky: isRisky });
    if (r.outcome === 'critical') soundEffects.playCathedralBell();
    record(r);
  };

  const handleInjury = () => {
    soundEffects.playDiceRoll();
    const r = rollInjury({
      injuryDice, modifier: injuryModifier, bloodbath: isBloodbath, deadly: isDeadly,
    });
    if (r.outcome === 'out-of-action') soundEffects.playGunfire();
    record(r);
  };

  const handlePool = () => {
    soundEffects.playDiceRoll();
    const rolled = Array.from({ length: poolCount }, () => Math.floor(Math.random() * 6) + 1);
    record({
      kind: 'pool',
      rolled,
      total: rolled.reduce((a, b) => a + b, 0),
      sixes: rolled.filter((d) => d === 6).length,
      ones: rolled.filter((d) => d === 1).length,
    });
  };

  // The two Injury controls together decide the pool, so the button has to be
  // built from both. `keep` mirrors rules/dice.ts.
  const injuryKeep = isBloodbath ? (isDeadly ? 4 : 3) : 2;
  const cappedModifier = capInjuryModifier(injuryModifier);

  const tabClass = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-2 rounded uppercase font-bold transition-all min-h-[44px] lg:min-h-0 ${
      active
        ? 'bg-theme-primary text-theme-base shadow'
        : 'bg-theme-surface text-theme-muted hover:text-theme-text border border-theme-border'
    }`;

  const chipClass = (active: boolean) =>
    `px-2.5 py-1.5 rounded font-bold transition-all min-h-[44px] lg:min-h-0 ${
      active
        ? 'bg-theme-primary text-theme-base font-extrabold shadow'
        : 'bg-theme-elevated text-theme-muted hover:text-theme-text border border-theme-border'
    }`;

  return (
    <div className="bg-theme-surface border-2 border-theme-border rounded-md overflow-hidden shadow-xl bevel-container">

      <div
        className="px-4 py-3 bg-theme-elevated flex items-center justify-between cursor-pointer select-none border-b border-theme-border"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-2 min-w-0">
          <Dices className="w-5 h-5 text-theme-primary flex-shrink-0" />
          <h3 className="font-gothic font-bold text-sm text-theme-text uppercase tracking-wider">
            Tabletop Combat Dice Engine
          </h3>
          {last && !isOpen && (
            <span className="hidden sm:inline-block text-xs font-mono px-2 py-0.5 rounded bg-theme-base text-theme-primary border border-theme-border truncate max-w-xs">
              {describe(last)}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleMute(); }}
            className="p-1 text-theme-muted hover:text-theme-primary rounded"
            title={isMuted ? 'Unmute sound' : 'Mute sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-status-error" /> : <Volume2 className="w-4 h-4 text-status-legal" />}
          </button>
          <button className="text-theme-muted hover:text-theme-text" aria-label={isOpen ? 'Collapse' : 'Expand'}>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-3 sm:p-4 space-y-4 bg-theme-base animate-fade-in font-mono text-xs">

          {/* Mode tabs. Wrap rather than overflow — three of these do not fit a 375px phone. */}
          <div className="flex flex-wrap items-center gap-2 border-b border-theme-border pb-3">
            <button onClick={() => setActiveMode('success')} className={tabClass(activeMode === 'success')}>
              <Zap className="w-3.5 h-3.5" /><span>Success Roll</span>
            </button>
            <button onClick={() => setActiveMode('injury')} className={tabClass(activeMode === 'injury')}>
              <Skull className="w-3.5 h-3.5" /><span>Injury Roll</span>
            </button>
            <button onClick={() => setActiveMode('pool')} className={tabClass(activeMode === 'pool')}>
              <Dices className="w-3.5 h-3.5" /><span>Dice Pool</span>
            </button>
          </div>

          {/* ---------------------------------------------------- Success Roll */}
          {activeMode === 'success' && (
            <div className="space-y-3 p-3 bg-theme-surface border border-theme-border rounded-md">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-theme-muted uppercase font-bold">+/- Dice:</span>
                  {[-3, -2, -1, 0, 1, 2, 3].map((mod) => (
                    <button key={mod} onClick={() => setSuccessDice(mod)} className={chipClass(successDice === mod)}>
                      {mod === 0 ? 'None' : `${formatSigned(mod)} DICE`}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-theme-elevated px-3 py-2 rounded border border-theme-border min-h-[44px] lg:min-h-0">
                  <input
                    type="checkbox"
                    checked={isRisky}
                    onChange={(e) => setIsRisky(e.target.checked)}
                    className="rounded border-theme-border text-theme-primary focus:ring-0"
                  />
                  <span className={`font-bold uppercase ${isRisky ? 'text-status-error' : 'text-theme-muted'}`}>
                    Risky
                  </span>
                </label>
              </div>

              <p className="text-theme-muted leading-relaxed">
                {successDice === 0
                  ? 'Roll 2D6 and add them together.'
                  : `Roll ${describePool(2, successDice)} and add them together.`}
                {' '}2-6 Failure · 7-11 Success · 12+ Critical Success.
              </p>

              <button
                onClick={handleSuccess}
                className="w-full py-3 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded flex items-center justify-center gap-2 shadow-lg shadow-theme-primary/20 tracking-wider"
              >
                <Zap className="w-4 h-4" />
                <span>Roll {describePool(2, successDice)}</span>
              </button>
            </div>
          )}

          {/* ----------------------------------------------------- Injury Roll */}
          {activeMode === 'injury' && (
            <div className="space-y-3 p-3 bg-theme-surface border border-theme-border rounded-md">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-1.5">
                  <span className="text-theme-muted uppercase font-bold block">
                    +/- Injury Dice
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[-2, -1, 0, 1, 2].map((mod) => (
                      <button key={mod} onClick={() => setInjuryDice(mod)} className={chipClass(injuryDice === mod)}>
                        {mod === 0 ? 'None' : formatSigned(mod)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-theme-muted uppercase font-bold block">
                    Injury Modifier (Armour, AP)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[-3, -2, -1, 0, 1, 2, 3].map((mod) => (
                      <button key={mod} onClick={() => setInjuryModifier(mod)} className={chipClass(injuryModifier === mod)}>
                        {mod === 0 ? '0' : formatSigned(mod)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer bg-theme-elevated px-3 py-2 rounded border border-theme-border min-h-[44px] lg:min-h-0">
                  <input
                    type="checkbox"
                    checked={isBloodbath}
                    onChange={(e) => { setIsBloodbath(e.target.checked); if (!e.target.checked) setIsDeadly(false); }}
                    className="rounded border-theme-border text-theme-primary focus:ring-0"
                  />
                  <span className={`font-bold uppercase ${isBloodbath ? 'text-status-error' : 'text-theme-muted'}`}>
                    Bloodbath
                  </span>
                </label>

                {/* DEADLY sits inside the book's Bloodbath paragraph, so it is
                    only offered once a Bloodbath is declared. */}
                <label className={`flex items-center gap-2 px-3 py-2 rounded border border-theme-border min-h-[44px] lg:min-h-0 ${
                  isBloodbath ? 'cursor-pointer bg-theme-elevated' : 'opacity-40 cursor-not-allowed bg-theme-base'
                }`}>
                  <input
                    type="checkbox"
                    checked={isDeadly}
                    disabled={!isBloodbath}
                    onChange={(e) => setIsDeadly(e.target.checked)}
                    className="rounded border-theme-border text-theme-primary focus:ring-0"
                  />
                  <span className={`font-bold uppercase ${isDeadly ? 'text-status-error' : 'text-theme-muted'}`}>
                    Deadly
                  </span>
                </label>
              </div>

              <p className="text-theme-muted leading-relaxed">
                {isBloodbath
                  ? `Roll ${describePool(injuryKeep, injuryDice)} and add ${isDeadly ? 'all 4' : 'all 3'} together.`
                  : `Roll ${describePool(2, injuryDice)} and add them together.`}
                {cappedModifier !== 0 && ` Then ${formatSigned(cappedModifier)}.`}
                {' '}1 or less No Effect · 2-6 Minor Hit · 7-8 Down · 9+ Out of Action.
                {injuryModifier < cappedModifier && (
                  <span className="text-status-warning">
                    {' '}The maximum -INJURY MODIFIER is -3 in total, so {injuryModifier} is applied as -3.
                  </span>
                )}
              </p>

              <button
                onClick={handleInjury}
                className="w-full py-3 bg-status-error hover:bg-status-error text-white font-bold uppercase rounded flex items-center justify-center gap-2 shadow-lg shadow-[#B22222]/30 tracking-wider"
              >
                <Skull className="w-4 h-4" />
                <span>
                  Roll {describePool(injuryKeep, injuryDice)}
                  {cappedModifier !== 0 ? ` ${formatSigned(cappedModifier)}` : ''}
                </span>
              </button>
            </div>
          )}

          {/* ------------------------------------------------------- Dice pool */}
          {activeMode === 'pool' && (
            <div className="space-y-3 p-3 bg-theme-surface border border-theme-border rounded-md">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-theme-muted uppercase font-bold">Dice:</span>
                {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <button key={n} onClick={() => setPoolCount(n)} className={chipClass(poolCount === n)}>
                    {n}D6
                  </button>
                ))}
              </div>
              <p className="text-theme-muted">
                A plain pool with no rule attached — for anything the book asks you to roll that is
                neither a Success Roll nor an Injury Roll.
              </p>
              <button
                onClick={handlePool}
                className="w-full py-3 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded flex items-center justify-center gap-2 shadow-lg tracking-wider"
              >
                <Dices className="w-4 h-4" />
                <span>Roll {poolCount}D6</span>
              </button>
            </div>
          )}

          {/* ---------------------------------------------------------- Result */}
          {last && (
            <div className="p-3 sm:p-4 bg-theme-surface border-2 border-theme-primary/60 rounded-md flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">

              <div className="space-y-2 min-w-0">
                <span className="text-theme-muted uppercase font-bold block">
                  {last.kind === 'pool'
                    ? `Dice Pool (${last.rolled.length}D6)`
                    : last.kind === 'success'
                      ? `Success Roll (${describePool(2, 0)}${last.rolled.length > 2 ? ` from ${last.rolled.length}, ${last.keptEnd}` : ''})`
                      : `${last.bloodbath ? (last.deadly ? 'Bloodbath, DEADLY' : 'Bloodbath') : 'Injury Roll'} (${last.rolled.length}D6, keep the ${last.keep} ${last.keptEnd})`}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {last.kind === 'pool' ? (
                    last.rolled.map((d, i) => (
                      <div
                        key={`p-${i}`}
                        className="w-11 h-11 rounded bg-theme-base border-2 border-theme-primary text-theme-primary flex items-center justify-center font-mono font-bold text-lg shadow"
                      >
                        {d}
                      </div>
                    ))
                  ) : (
                    <>
                      {last.kept.map((d, i) => (
                        <div
                          key={`k-${i}`}
                          className="w-11 h-11 rounded bg-theme-base border-2 border-theme-primary text-theme-primary flex items-center justify-center font-mono font-bold text-lg shadow-lg ring-1 ring-theme-primary/50"
                          title="Counted"
                        >
                          {d}
                        </div>
                      ))}
                      {last.dropped.map((d, i) => (
                        <div
                          key={`d-${i}`}
                          className="w-11 h-11 rounded bg-theme-base border border-theme-border text-theme-muted line-through flex items-center justify-center font-mono font-bold text-lg opacity-40"
                          title="Not counted"
                        >
                          {d}
                        </div>
                      ))}
                      {last.modifier !== 0 && (
                        <div className="px-2.5 py-1 rounded bg-theme-elevated text-theme-primary border border-theme-border font-bold text-sm">
                          {formatSigned(last.modifier)}
                        </div>
                      )}
                    </>
                  )}

                  <span className="text-sm font-bold text-theme-text px-1">=</span>
                  <div className="px-3 py-1 rounded bg-theme-primary text-theme-base font-extrabold text-base shadow">
                    {last.total}
                  </div>
                </div>
              </div>

              <div className="md:text-right md:max-w-xs">
                <span className="text-theme-muted uppercase block">Result</span>
                {last.kind === 'pool' ? (
                  <span className="font-gothic font-bold text-sm sm:text-base text-theme-primary block">
                    {last.sixes} × 6 · {last.ones} × 1 · total {last.total}
                  </span>
                ) : last.kind === 'success' ? (
                  <>
                    <span className={`font-gothic font-bold text-sm sm:text-base block ${SUCCESS_TONE[last.outcome]}`}>
                      {SUCCESS_LABEL[last.outcome]}
                    </span>
                    {last.risky && last.outcome === 'failure' && (
                      <span className="text-theme-muted block leading-relaxed">
                        A failed Risky Success Roll ends the model&apos;s Activation.
                      </span>
                    )}
                    {last.outcome === 'critical' && (
                      <span className="text-theme-muted block leading-relaxed">
                        The attack hits and you make an Injury Roll with +1 INJURY DICE.
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className={`font-gothic font-bold text-sm sm:text-base block ${INJURY_TONE[last.outcome]}`}>
                      {INJURY_LABEL[last.outcome]}
                    </span>
                    <span className="text-theme-muted block leading-relaxed">
                      {INJURY_EFFECT[last.outcome]}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="space-y-1 border-t border-theme-border pt-2">
              <span className="uppercase text-theme-muted block">Recent rolls</span>
              <div className="flex flex-wrap gap-1.5">
                {history.map((item, i) => (
                  <span
                    key={i}
                    className="bg-theme-surface px-2 py-0.5 rounded text-theme-muted border border-theme-border/60"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
