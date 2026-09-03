'use client';

import React, { useMemo, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { ActiveUnit, EquippedWeapon } from '../../types/warband';
import { soundEffects } from '../../services/soundEffects';
import {
  rollSuccess, rollInjury, describePool, formatSigned, capInjuryModifier,
  SUCCESS_LABEL, INJURY_LABEL, INJURY_EFFECT,
  type SuccessRoll, type InjuryRoll,
} from '../../rules/dice';
import { coverDice, SMOG_STORM } from '../../rules/weather';
import type { WeatherEvent } from '../../types/catalogue';
import { Dices, Droplet, Sparkles } from 'lucide-react';

/**
 * Resolve one attack, following the book's own sequence.
 *
 * What this replaced applied every modifier as a flat number added to the 2D6
 * total. Trench Crusade has no flat modifiers on a Success Roll: every one of
 * them is +/- DICE, which changes how many dice you roll and which end you keep
 * (▶ `rules/dice.ts`). Cover as "-2" and a Cover as "-1 DICE" are different
 * distributions, and the second is the game.
 *
 * The modifiers themselves were part invented:
 *
 *   - **Light and Heavy Cover at -1 and -2.** Cover is one thing and it is
 *     -1 DICE. The two tiers were made up, the same pair the keyword sweep
 *     found invented in the glossary.
 *   - **A "Charge Momentum +1" bonus.** There is no charge bonus. A melee
 *     attack gets +1 DICE for a Diving Charge specifically.
 *   - **Long Range was missing**, and it is -1 DICE — probably the modifier
 *     that comes up most often in a real game.
 *   - **The attacker's own Blood Markers were deducted automatically.** Blood
 *     Markers are spent by the OPPONENT, and either way round they are dice,
 *     not a flat penalty: spend them against a model's Success Roll for -1
 *     DICE each, or against an Injury Roll on that model for +1 INJURY DICE
 *     each. Both are offered here, and neither is automatic, because spending
 *     one is a decision a player makes.
 *   - **A Critical Success added +2 to the Injury Roll.** It adds +1 INJURY
 *     DICE.
 *   - **A "fumble" on double 1.** No such result: 2-6 is a Failure.
 */

interface AttackCalculatorModalProps {
  attacker: ActiveUnit;
  onClose: () => void;
  /**
   * The Weather Event in effect, if the players generated one.
   *
   * Only Smog Storm reaches this far — "The Cover/Defended Obstacle Modifiers
   * is -2 DICE instead of -1 DICE" — so the cover chips change value rather
   * than the player having to remember and hand-apply it.
   */
  weather?: WeatherEvent | null;
  onApplyDamage?: (wounds: number, bloodMarkers: number, isDowned: boolean, isOOA: boolean) => void;
}

/** One +/- DICE modifier the player can switch on, as the book states it. */
type Modifier = {
  id: string;
  label: string;
  dice: number;
  /** Which attack it applies to, since the two lists differ. */
  on: 'ranged' | 'melee';
  note: string;
};

/*
  `cover` takes the value Hell on Earth's Smog Storm sets, which is why the two
  cover rows are built from a function rather than written as constants.
*/
const modifiers = (cover: -1 | -2): Modifier[] => [
  // Ranged Attack Modifiers, verbatim from the Comprehensive Rules.
  { id: 'elevated', on: 'ranged', dice: +1, label: 'Elevated position',
    note: 'The attacker is at least 3" higher than the target.' },
  { id: 'cover-r', on: 'ranged', dice: cover, label: 'Target in cover',
    note: 'One tier. There is no light and heavy cover.' },
  { id: 'long-range', on: 'ranged', dice: -1, label: 'Long Range',
    note: 'The target is further than half the weapon’s range.' },
  // Melee Attack Modifiers.
  { id: 'diving-charge', on: 'melee', dice: +1, label: 'Diving Charge',
    note: 'A Diving Charge specifically — an ordinary charge adds nothing.' },
  { id: 'defended', on: 'melee', dice: cover, label: 'Defended obstacle',
    note: 'The target is in cover and the terrain lies between you.' },
  { id: 'off-hand', on: 'melee', dice: -1, label: 'Off-Hand Weapon',
    note: 'The second of two Melee Attacks from one Fight ACTION.' },
];

export const AttackCalculatorModal: React.FC<AttackCalculatorModalProps> = ({
  attacker,
  onClose,
  weather,
}) => {
  const [weapon, setWeapon] = useState<EquippedWeapon | null>(attacker.equippedWeapons[0] ?? null);

  const [active, setActive] = useState<Record<string, boolean>>({});
  const [extraDice, setExtraDice] = useState(0);

  /*
    Blood Markers, both ways round, and neither automatic.

    `attackerBlood` is markers on the ATTACKER that the defender spends for
    -1 DICE each on this Success Roll. `targetBlood` is markers on the TARGET
    that the attacker spends for +1 INJURY DICE each. The old calculator
    deducted the attacker's own markers from its own roll with no choice
    involved, which is neither of these rules.
  */
  const [attackerBlood, setAttackerBlood] = useState(0);
  const [targetBlood, setTargetBlood] = useState(0);

  /** The target's Armour Characteristic, which is an INJURY MODIFIER. */
  const [targetArmour, setTargetArmour] = useState(0);

  const [result, setResult] = useState<{
    attack: SuccessRoll;
    injury?: InjuryRoll;
    lines: string[];
  } | null>(null);

  const isMelee = weapon?.type === 'Melee' || weapon?.range === 'Melee'
    || Boolean(weapon?.range?.startsWith('Melee'));
  const kind: 'ranged' | 'melee' = isMelee ? 'melee' : 'ranged';
  const cover = coverDice(weather);
  const available = useMemo(
    () => modifiers(cover).filter((m) => m.on === kind), [cover, kind]);

  /*
    The weapon's own modifier is +/- DICE too, and the roster stores it as text
    ("+1 DICE", "-1"). Read the number; a weapon whose modifier we cannot read
    contributes nothing rather than a guess.
  */
  const weaponDice = useMemo(() => {
    const raw = weapon?.modifiers;
    if (typeof raw === 'number') return raw;
    const m = typeof raw === 'string' ? raw.match(/[+-]?\d+/) : null;
    return m ? parseInt(m[0], 10) : 0;
  }, [weapon]);

  // "remove pairs of +DICE and -DICE until only one type is remaining" — the sum.
  const successDice = available.reduce((sum, m) => sum + (active[m.id] ? m.dice : 0), 0)
    + weaponDice + extraDice - attackerBlood;

  const injuryDice = targetBlood;
  const armourModifier = capInjuryModifier(-Math.abs(targetArmour));

  const handleRoll = () => {
    soundEffects.playDiceRoll();

    const attack = rollSuccess({ dice: successDice });
    const lines: string[] = [
      `Success Roll: ${describePool(2, successDice)} → [${attack.kept.join(' + ')}] = ${attack.total}`,
    ];
    for (const m of available) if (active[m.id]) lines.push(`${formatSigned(m.dice)} DICE ${m.label}`);
    if (weaponDice) lines.push(`${formatSigned(weaponDice)} DICE ${weapon?.name}`);
    if (attackerBlood) lines.push(`-${attackerBlood} DICE from ${attackerBlood} BLOOD MARKER${attackerBlood > 1 ? 'S' : ''} spent against the attacker`);
    if (extraDice) lines.push(`${formatSigned(extraDice)} DICE other`);
    lines.push(`→ ${SUCCESS_LABEL[attack.outcome]}`);

    if (attack.outcome === 'failure') {
      soundEffects.playGunfire();
      setResult({ attack, lines: [...lines, 'The attack misses and nothing further happens.'] });
      return;
    }

    // "If the roll is a Critical Success, the target is hit and +1 DICE is
    // added to the Injury Roll." One die, not two points.
    const critBonus = attack.outcome === 'critical' ? 1 : 0;
    const injury = rollInjury({
      injuryDice: injuryDice + critBonus,
      modifier: armourModifier,
    });

    lines.push(`Injury Roll: ${describePool(2, injuryDice + critBonus)} → [${injury.kept.join(' + ')}]`
      + `${injury.modifier ? ` ${formatSigned(injury.modifier)}` : ''} = ${injury.total}`);
    if (critBonus) lines.push('+1 INJURY DICE from the Critical Success');
    if (targetBlood) lines.push(`+${targetBlood} INJURY DICE from ${targetBlood} BLOOD MARKER${targetBlood > 1 ? 'S' : ''} spent on the target`);
    if (injury.modifier) lines.push(`${formatSigned(injury.modifier)} INJURY MODIFIER from the target’s Armour`);
    lines.push(`→ ${INJURY_LABEL[injury.outcome]}. ${INJURY_EFFECT[injury.outcome]}`);

    if (injury.outcome === 'out-of-action') soundEffects.playGunfire();
    setResult({ attack, injury, lines });
  };

  const chip = (on: boolean) =>
    `px-2.5 py-2 rounded font-bold border transition-all min-h-[44px] sm:min-h-0 ${
      on
        ? 'bg-theme-primary text-theme-base border-theme-primary shadow'
        : 'bg-theme-base text-theme-muted border-theme-border hover:text-theme-text'
    }`;

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title="Attack Calculator"
      subtitle={`${attacker.customName} (${attacker.profileSnapshot.name})`}
      label="Attack calculator"
    >
      <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs font-mono">

        <div className="space-y-1.5">
          <label className="block uppercase font-bold text-theme-primary">1. Weapon</label>
          {attacker.equippedWeapons.length === 0 ? (
            <p className="text-theme-muted italic">
              This model is unarmed, so it has no attack to resolve.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {attacker.equippedWeapons.map((w) => (
                <button
                  key={w.instanceId}
                  onClick={() => { setWeapon(w); setActive({}); }}
                  className={`p-2.5 rounded text-left border transition-all ${
                    weapon?.instanceId === w.instanceId
                      ? 'bg-theme-elevated text-theme-primary border-theme-primary ring-1 ring-theme-primary/40'
                      : 'bg-theme-base text-theme-muted hover:text-theme-text border-theme-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="font-bold truncate">{w.name}</strong>
                    <span className="px-1.5 rounded bg-theme-surface border border-theme-border flex-shrink-0">
                      {w.type}
                    </span>
                  </div>
                  <div className="text-theme-muted flex items-center justify-between gap-2 pt-1">
                    <span className="truncate">Range: {w.range}</span>
                    <span className="flex-shrink-0">
                      {weaponDice && weapon?.instanceId === w.instanceId
                        ? `${formatSigned(weaponDice)} DICE`
                        : typeof w.modifiers === 'string' ? w.modifiers : '—'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2 border-t border-theme-border">
          <label className="block uppercase font-bold text-theme-muted">
            2. {kind === 'melee' ? 'Melee' : 'Ranged'} Attack Modifiers
          </label>
          <p className="text-theme-muted leading-relaxed">
            Every modifier is +/- DICE. Opposite ones cancel before anything is rolled.
            {weather?.name === SMOG_STORM && (
              <span className="text-theme-primary">
                {' '}Smog Storm is in effect: Cover and Defended Obstacle are -2 DICE.
              </span>
            )}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {available.map((m) => (
              <button
                key={m.id}
                onClick={() => setActive((p) => ({ ...p, [m.id]: !p[m.id] }))}
                className={`${chip(Boolean(active[m.id]))} text-left`}
                title={m.note}
              >
                <span className="block">{formatSigned(m.dice)} DICE</span>
                <span className="block font-normal opacity-80">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-theme-border">
          <div className="space-y-1.5">
            <span className="uppercase font-bold text-theme-muted block">
              3. Target&apos;s Armour
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[0, -1, -2, -3].map((a) => (
                <button key={a} onClick={() => setTargetArmour(a)} className={chip(targetArmour === a)}>
                  {a === 0 ? 'None' : a}
                </button>
              ))}
            </div>
            <p className="text-theme-muted leading-relaxed">
              The target&apos;s Armour Characteristic, applied to the Injury Roll after the dice.
              Capped at -3 in total.
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="uppercase font-bold text-theme-muted block">4. Blood Markers</span>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-theme-muted w-full sm:w-auto">Spent on the target:</span>
                {[0, 1, 2, 3].map((n) => (
                  <button key={n} onClick={() => setTargetBlood(n)} className={chip(targetBlood === n)}>
                    {n === 0 ? '—' : `+${n} INJ`}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-theme-muted w-full sm:w-auto">Spent on the attacker:</span>
                {[0, 1, 2, 3].map((n) => (
                  <button key={n} onClick={() => setAttackerBlood(n)} className={chip(attackerBlood === n)}>
                    {n === 0 ? '—' : `-${n} DICE`}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-theme-muted leading-relaxed">
              Markers are spent by the opponent, never automatically:
              on the target for +1 INJURY DICE each, on the attacker for -1 DICE each.
              {attacker.bloodMarkers > 0 && ` This model has ${attacker.bloodMarkers}.`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-theme-border">
          <span className="uppercase font-bold text-theme-muted">5. Anything else:</span>
          {[-2, -1, 0, 1, 2].map((n) => (
            <button key={n} onClick={() => setExtraDice(n)} className={chip(extraDice === n)}>
              {n === 0 ? 'None' : `${formatSigned(n)} DICE`}
            </button>
          ))}
        </div>

        <button
          onClick={handleRoll}
          disabled={!weapon}
          className="w-full py-3 bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-40 text-theme-base font-bold uppercase rounded text-sm shadow-xl shadow-theme-primary/20 flex items-center justify-center gap-2 transition-transform active:scale-98"
        >
          <Dices className="w-4 h-4" />
          <span>Roll {describePool(2, successDice)}</span>
        </button>

        {result && (
          <div className="p-3 sm:p-4 bg-theme-base rounded-md border-2 border-theme-primary space-y-3 animate-fade-in">
            <div className="flex items-center justify-between gap-2 border-b border-theme-border pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-theme-primary flex-shrink-0" />
                <strong className="font-gothic font-bold text-sm text-theme-text truncate">
                  Resolution
                </strong>
              </div>
              <span className={`px-2 py-0.5 rounded font-bold uppercase flex-shrink-0 ${
                result.injury?.outcome === 'out-of-action' ? 'bg-status-error text-white'
                  : result.injury?.outcome === 'down' ? 'bg-status-warning text-theme-base'
                  : result.injury ? 'bg-status-legal text-white'
                  : 'bg-theme-border text-theme-muted'
              }`}>
                {result.injury ? INJURY_LABEL[result.injury.outcome] : SUCCESS_LABEL[result.attack.outcome]}
              </span>
            </div>

            <div className="space-y-1 text-theme-text bg-theme-surface p-3 rounded border border-theme-border">
              {result.lines.map((line, i) => (
                <div key={i} className="leading-relaxed">{line}</div>
              ))}
            </div>

            {/*
              The book's own effect, not a damage tally. Trench Crusade has no
              wound track: an Injury Roll places BLOOD MARKERS, or takes a model
              Down, or Out of Action. The old summary reported "1 Wound" on
              every hit, which is not a thing that happens.
            */}
            {result.injury && result.injury.outcome !== 'no-effect' && (
              <div className="flex items-start gap-2 text-theme-muted bg-theme-elevated p-2.5 rounded border border-theme-primary/50">
                <Droplet className="w-3.5 h-3.5 mt-0.5 text-status-error flex-shrink-0" />
                <span className="leading-relaxed">{INJURY_EFFECT[result.injury.outcome]}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
};
