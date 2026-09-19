'use client';

/**
 * The tactical ruler: how far this model can go, and what its weapons reach.
 *
 * Rewritten against the Digital Rulebook after a live game found a **Fire
 * Shield listed with a range**. That was not one wrong number — five separate
 * pieces of this panel were hand-written game data that the book contradicts,
 * and the app was stating all of them to a player at a table:
 *
 *  1. **Weapons were classified by `type`.** Measured against the catalogue,
 *     `type === 'Ranged'` matches 0 of 658 entries and `type === 'Melee'`
 *     matches 1 — the catalogue types things by how they are carried and
 *     bought (`1-Handed`, `Shield`, `Battlekit`), not how they are used. So a
 *     Fire Shield was "not melee", therefore ranged.
 *  2. **A 24" range was invented** for anything without one — 553 of 658
 *     entries, including every shield and every melee weapon.
 *  3. **Fixed bands** were printed: Point Blank 6", Short 12", Medium 24",
 *     Extreme 48", plus a "Point Blank (+1 Hit)" bonus. None of that is in the
 *     book. Short and Long Range are *per weapon* — half its own range — and
 *     the only distance modifier is Long Range, -1 DICE.
 *  4. **"Dash / Run — 2 Actions (Double Move)"** at twice Movement. The book:
 *     "The Activated model can take the following ACTIONS **once each** ...
 *     Move or Charge or Retreat: You can use an ACTION to Move or Charge or
 *     Retreat with your model, **but not more than one**." A model cannot
 *     double-move. This panel was inventing a manoeuvre.
 *  5. **"Difficult Mud: -2" Movement penalty".** The book: "Difficult terrain
 *     is crossed at **half speed**."
 *
 * And the Charge entry showed `MOV + D6` while omitting the constraint that
 * actually decides charges at a table: the target must be **within 12"**.
 *
 * Everything below is quoted from the rulebook in the comment beside it. Where
 * a value is not in the data, this says so rather than supplying one (rule 2).
 */
import React, { useState } from 'react';
import { Footprints, Crosshair, ShieldAlert, Swords, Ban } from 'lucide-react';

import { Sheet } from '../ui/Sheet';
import { ActiveUnit } from '../../types/warband';
import {
  readRange, bandFor, longRangePenalty, canShoot, canFight,
  BAND_LABEL, ENGAGEMENT_INCHES, type Band,
} from '@/rules/weaponRange';

interface RangeCalculatorModalProps {
  unit: ActiveUnit;
  onClose: () => void;
}

/** The furthest a Charge target may be — "visible to your model and within 12\"". */
const CHARGE_TARGET_LIMIT = 12;

const BAND_STYLE: Record<Band, string> = {
  short: 'bg-status-legal text-white',
  long: 'bg-status-warning text-white',
  'out-of-range': 'bg-theme-accent text-white',
  melee: 'bg-status-legal text-white',
  'not-applicable': 'bg-theme-border text-theme-muted',
};

export const RangeCalculatorModal: React.FC<RangeCalculatorModalProps> = ({ unit, onClose }) => {
  const [distanceToTarget, setDistanceToTarget] = useState<number>(12);

  /*
    Movement, read rather than assumed.

    The old code was `parseInt(...) || 6`, which turns an unreadable statline
    into a confident 6". A model whose Movement cannot be read is a model this
    panel cannot advise about, and it says so below.
  */
  const printedMovement = unit.profileSnapshot.stats.movement;
  const movMatch = String(printedMovement ?? '').match(/\d+/);
  const mov = movMatch ? Number.parseInt(movMatch[0], 10) : null;

  const weapons = unit.equippedWeapons.map((w) => {
    const range = readRange(w.range);
    return { weapon: w, range, band: bandFor(range, distanceToTarget) };
  });

  /* Shown separately rather than given a range: these are the shields, armour
     and equipment that have no range at all. Listing them among the weapons,
     with a distance, is the reported bug. */
  const rangeless = weapons.filter((w) => w.range.kind === 'none');
  const armed = weapons.filter((w) => w.range.kind !== 'none');

  const engaged = distanceToTarget <= ENGAGEMENT_INCHES;

  return (
    <Sheet
      open
      onClose={onClose}
      size="md"
      title="TACTICAL RULER"
      subtitle={`${unit.customName} — Movement ${printedMovement ?? 'not recorded'}`}
    >
      <div className="space-y-5 p-4 sm:p-6">

        {/* ---------------------------------------------------- movement */}
        {mov === null ? (
          <div className="rounded border border-status-warning/50 bg-theme-base p-3 text-xs text-theme-muted">
            This model&rsquo;s Movement is recorded as{' '}
            <strong className="text-theme-text">{String(printedMovement || '(nothing)')}</strong>,
            which is not a distance. Distances are not shown rather than guessed.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 text-center font-mono text-xs sm:grid-cols-2">
            <div className="space-y-1 rounded border border-theme-border bg-theme-base p-3">
              <span className="flex items-center justify-center gap-1 text-xs uppercase text-theme-muted sm:text-[10px]">
                <Footprints className="h-3 w-3 text-status-legal" />
                <span>Move</span>
              </span>
              <span className="text-xl font-bold text-status-legal">{mov}&quot;</span>
              {/* "You can move your model a number of inches equal to its
                  Movement Characteristic in any direction (no roll is
                  required)." */}
              <span className="block text-xs text-theme-muted sm:text-[10px]">
                One ACTION. Shooting is a separate ACTION, so a model may do both.
              </span>
            </div>

            <div className="space-y-1 rounded border border-theme-border bg-theme-base p-3">
              <span className="flex items-center justify-center gap-1 text-xs uppercase text-theme-muted sm:text-[10px]">
                <Crosshair className="h-3 w-3 text-status-error" />
                <span>Charge</span>
              </span>
              <span className="text-xl font-bold text-status-error">{mov}&quot; + D6</span>
              {/* "Pick an enemy model that is visible to your model and within
                  12” of it as the target of the charge. Then roll a dice, add
                  the result to your model's Movement Characteristic..." */}
              <span className="block text-xs text-theme-muted sm:text-[10px]">
                Target must be visible and within {CHARGE_TARGET_LIMIT}&quot;.
                Reaches {mov + 1}&ndash;{mov + 6}&quot;.
              </span>
            </div>
          </div>
        )}

        {/*
          The manoeuvre that does not exist.

          This panel used to offer "Dash / Run — 2 Actions (Double Move)". It
          is stated here as a prohibition rather than simply deleted, because
          a player who used it last week needs to know it was wrong.
        */}
        <div className="flex items-start gap-2 rounded border border-theme-border bg-theme-base p-3 text-xs font-mono text-theme-muted">
          <Ban className="mt-0.5 h-4 w-4 shrink-0 text-status-error" />
          <span>
            <strong className="text-theme-text">No double move.</strong>{' '}
            A model may use an ACTION to Move <em>or</em> Charge <em>or</em> Retreat,
            &ldquo;but not more than one&rdquo;.
          </span>
        </div>

        {/* ------------------------------------------------ rangefinder */}
        <div className="space-y-3 rounded border border-theme-border bg-theme-elevated p-4">
          <div className="flex items-center justify-between font-mono text-xs">
            <label htmlFor="rangefinder" className="font-bold uppercase text-theme-muted">
              Distance to target
            </label>
            <span className="text-base font-bold text-theme-primary">{distanceToTarget}&quot;</span>
          </div>

          <input
            id="rangefinder"
            type="range"
            min="1"
            max="48"
            value={distanceToTarget}
            onChange={(e) => setDistanceToTarget(parseInt(e.target.value, 10))}
            className="h-11 w-full cursor-pointer accent-theme-primary"
          />

          {/* "Fight: You can make a Melee Attack with your model if it is
              within 1” of an enemy" / "Shoot: ... if it is more than 1” from
              an enemy". The old code used 2" for melee. */}
          {engaged && (
            <div className="flex items-center gap-2 rounded border border-status-warning/50 px-2.5 py-2 text-xs text-theme-text">
              <Swords className="h-3.5 w-3.5 shrink-0 text-status-warning" />
              <span>
                Within {ENGAGEMENT_INCHES}&quot; — this model may Fight, and may not Shoot.
              </span>
            </div>
          )}
        </div>

        {/* --------------------------------------------------- weapons */}
        <div className="space-y-2">
          <span className="block font-mono text-xs font-bold uppercase text-theme-muted">
            At {distanceToTarget}&quot;
          </span>

          {armed.length === 0 && (
            <span className="block text-xs text-theme-muted">
              This model carries nothing with a range.
            </span>
          )}

          <div className="space-y-1.5">
            {armed.map(({ weapon, range, band }) => {
              const penalty = longRangePenalty(band, weapon.keywords ?? []);
              const usable = band === 'short' || band === 'long'
                || (canFight(range) && engaged);
              return (
                <div
                  key={weapon.instanceId}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded border p-2.5 font-mono text-xs ${
                    usable
                      ? 'border-status-legal bg-theme-surface text-theme-text'
                      : 'border-theme-border bg-theme-base text-theme-muted'
                  }`}
                >
                  <span className="min-w-0">
                    <strong className="text-theme-text">{weapon.name}</strong>
                    {/* What the profile printed, not a derived number. */}
                    <span className="ml-2 text-xs text-theme-muted sm:text-[10px]">
                      {range.printed}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-1.5">
                    {/* A dual-profile weapon can still Fight while its shot is
                        out of range, so both facts are shown. */}
                    {canFight(range) && engaged && (
                      <span className="rounded bg-status-legal px-2 py-0.5 text-xs font-bold uppercase text-white sm:text-[10px]">
                        Can Fight
                      </span>
                    )}
                    {canShoot(range) && (
                      <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase sm:text-[10px] ${BAND_STYLE[band]}`}>
                        {BAND_LABEL[band]}
                      </span>
                    )}
                    {penalty !== 0 && (
                      <span className="text-xs text-status-warning sm:text-[10px]">
                        {penalty} DICE
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/*
            Everything carried that has no range.

            Named rather than hidden: the player needs to see that their Fire
            Shield is accounted for and simply is not a thing you measure to.
          */}
          {rangeless.length > 0 && (
            <div className="rounded border border-dashed border-theme-border p-2.5 text-xs text-theme-muted">
              <span className="font-bold uppercase">No range</span>
              {' — '}
              {rangeless.map((r) => r.weapon.name).join(', ')}.
              {' '}Shields, armour and equipment are not measured to a target.
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- terrain */}
        {/* "Difficult terrain is crossed at half speed." The old text said a
            flat -2" penalty, which is not a rule in this game. */}
        <div className="flex items-center justify-between gap-2 rounded border border-theme-border bg-theme-base p-3 font-mono text-xs">
          <span className="flex items-center gap-2 text-theme-muted">
            <ShieldAlert className="h-4 w-4 shrink-0 text-status-warning" />
            <span>Difficult terrain</span>
          </span>
          <span className="font-bold text-status-error">
            Half speed{mov !== null ? ` — ${mov / 2}"` : ''}
          </span>
        </div>

      </div>
    </Sheet>
  );
};
