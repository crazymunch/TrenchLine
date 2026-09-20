'use client';

/**
 * Everything you need to play this model, without leaving the game.
 *
 * Reported after a live game: *"any unit when clicked during game mode should
 * be able to show all their rules and keywords and abilities, I had to
 * constantly go out to my roster page. And clicking keywords doesn't actually
 * do the rules popup."*
 *
 * Both were true, and they were one gap. `PlayModeView` never rendered a
 * model's keywords or abilities at all — it imported neither `KeywordChip` nor
 * `setActiveKeyword`, so there was nothing in the whole of Play Mode for a
 * keyword tap to land on. `KeywordPopover` was mounted and working the entire
 * time; nothing was asking it anything.
 *
 * So this is the model's card, as the tracker sees it: the statline **with its
 * injuries applied**, its keywords as tappable chips, its abilities, the
 * skills it earned, and what it is carrying with each weapon's own printed
 * range. Nothing here is new data — every field was already on
 * `profileSnapshot` or the unit, and Play Mode simply never showed it.
 *
 * Mobile-first per docs/MOBILE.md: this is read one-handed, at a table, with
 * the phone propped against terrain.
 */
import React from 'react';
import {
  Activity, Award, Backpack, HeartCrack, Shield, Sparkles, Swords,
} from 'lucide-react';

import { Sheet } from '../ui/Sheet';
import { KeywordChip, KeywordText } from '../ui/KeywordText';
import type { ActiveUnit } from '../../types/warband';
import type { Keyword } from '../../types/catalogue';
import { readRange } from '@/rules/weaponRange';
import { effectiveMovement, type TraumaRow } from '@/rules/effectiveStats';

interface Props {
  unit: ActiveUnit;
  keywords?: Keyword[];
  /** The Trauma table, so an injury's effect comes from the catalogue. */
  traumaTable?: TraumaRow[];
  onClose: () => void;
}

const Section: React.FC<{
  icon: React.ReactNode; title: string; children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <section className="space-y-1.5">
    <h3 className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase text-theme-muted">
      {icon}
      {title}
    </h3>
    {children}
  </section>
);

export const ModelReferenceSheet: React.FC<Props> = ({
  unit, keywords, traumaTable = [], onClose,
}) => {
  const p = unit.profileSnapshot;

  /*
    Movement with the model's injuries counted.

    The reported defect: a Leg Wound reduces Movement by 2" and the app showed
    the printed number all night. `effectiveMovement` takes the modifier out of
    the Trauma table's own text, and reports the injuries it could not express
    as a number instead of dropping them.
  */
  const mov = effectiveMovement(
    p.stats.movementInches ? `${p.stats.movementInches}"` : p.stats.movement,
    unit.injuries ?? [],
    traumaTable,
  );

  const stats: Array<[string, string, boolean]> = [
    ['MOV', mov.effective, mov.delta !== 0],
    ['RNG', p.stats.ranged, false],
    ['MELEE', p.stats.melee, false],
    ['ARMOUR', p.stats.armour, false],
  ];

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title={unit.customName}
      subtitle={p.name}
    >
      <div className="space-y-5 p-4 sm:p-6">

        {/* ------------------------------------------------------ statline */}
        <div className="grid grid-cols-4 divide-x divide-theme-border border border-theme-border bg-theme-base">
          {stats.map(([label, value, changed]) => (
            <div key={label} className="min-w-0 px-1 py-2 text-center">
              <span className="block font-mono text-xs tracking-[0.06em] text-theme-muted sm:text-[10px]">
                {label}
              </span>
              <span className={`mt-0.5 block truncate font-mono text-base tabular-nums sm:text-sm ${
                changed ? 'font-bold text-status-warning' : 'text-theme-text'
              }`}>
                {value}
              </span>
              {/* The printed value stays visible. A player checking the app
                  against a physical card needs to see both, not be told the
                  card is wrong. */}
              {changed && (
                <span className="block font-mono text-xs text-theme-muted line-through sm:text-[9px]">
                  {mov.base}
                </span>
              )}
            </div>
          ))}
        </div>

        {mov.delta !== 0 && (
          <p className="text-xs text-theme-muted">
            Movement is {mov.effective} after{' '}
            <strong className="text-theme-text">{mov.applied.join(', ')}</strong>
            {' '}— printed {mov.base}.
          </p>
        )}

        {/* ------------------------------------------------------ keywords */}
        {(p.stats.keywords?.length ?? 0) > 0 && (
          <Section icon={<Sparkles className="h-3.5 w-3.5 text-theme-primary" />} title="Keywords">
            {/*
              Tappable. This is the thing that was missing: Play Mode showed no
              keywords at all, so there was nothing for a tap to land on.
              `KeywordChip` resolves through the tested resolver and renders a
              plain chip where the glossary has no entry, rather than guessing.
            */}
            <div className="flex flex-wrap gap-1.5">
              {(p.stats.keywords ?? []).map((k: string) => (
                <KeywordChip
                  key={k}
                  name={k}
                  keywords={keywords}
                  className="tap rounded border border-theme-border bg-theme-elevated px-2 py-1 font-mono text-xs uppercase"
                />
              ))}
            </div>
          </Section>
        )}

        {/* ----------------------------------------------------- abilities */}
        {(p.innateAbilities?.length ?? 0) > 0 && (
          <Section icon={<Activity className="h-3.5 w-3.5 text-theme-primary" />} title="Abilities">
            <div className="space-y-2">
              {(p.innateAbilities ?? []).map((a, i) => (
                <div key={`${a.name}-${i}`} className="rounded border border-theme-border bg-theme-base p-2.5">
                  <span className="block text-xs font-bold text-theme-text">{a.name}</span>
                  {/* Keywords inside the prose link too, so a rule that cites
                      one is one tap from its text. */}
                  <KeywordText keywords={keywords} className="mt-0.5 text-xs text-theme-muted">
                    {a.description}
                  </KeywordText>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* -------------------------------------------------------- skills */}
        {/* Earned through XP and exploration, and previously visible only on
            the roster page — which is the trip out of the game the player was
            making. */}
        {unit.skills && unit.skills.length > 0 && (
          <Section icon={<Award className="h-3.5 w-3.5 text-theme-primary" />} title={`Skills (${unit.skills.length})`}>
            <div className="space-y-2">
              {unit.skills.map((s, i) => (
                <div key={`${s.name}-${i}`} className="rounded border border-theme-border bg-theme-base p-2.5">
                  <span className="block text-xs font-bold text-theme-text">
                    {s.name}
                    <span className="ml-1.5 font-normal text-theme-muted">
                      {s.category}{s.roll ? ` · ${s.roll}` : ''}
                    </span>
                  </span>
                  {s.effect && (
                    <KeywordText keywords={keywords} className="mt-0.5 text-xs text-theme-muted">
                      {s.effect}
                    </KeywordText>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* --------------------------------------------------- advancements */}
        {unit.advancements?.length > 0 && (
          <Section icon={<Award className="h-3.5 w-3.5 text-theme-muted" />} title="Advancements">
            <ul className="space-y-1 text-xs text-theme-muted">
              {unit.advancements.map((a, i) => <li key={`${a}-${i}`}>{a}</li>)}
            </ul>
          </Section>
        )}

        {/* ------------------------------------------------------- carrying */}
        <Section icon={<Swords className="h-3.5 w-3.5 text-theme-primary" />} title="Carrying">
          <div className="space-y-1.5">
            {unit.equippedWeapons.map((w) => {
              const r = readRange(w.range);
              return (
                <div key={w.instanceId} className="rounded border border-theme-border bg-theme-base p-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-theme-text">{w.name}</span>
                    {/* What the profile printed. A shield says "-", and is not
                        given a range (see rules/weaponRange.ts). */}
                    <span className="font-mono text-xs text-theme-muted sm:text-[10px]">
                      {r.kind === 'none' ? 'no range' : r.printed}
                    </span>
                  </div>
                  {w.keywords?.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {w.keywords.map((k) => (
                        <KeywordChip
                          key={k}
                          name={k}
                          keywords={keywords}
                          className="tap rounded border border-theme-border px-1.5 py-0.5 font-mono text-xs uppercase sm:text-[10px]"
                        />
                      ))}
                    </div>
                  )}
                  {w.description && (
                    <KeywordText keywords={keywords} className="mt-1 text-xs text-theme-muted">
                      {w.description}
                    </KeywordText>
                  )}
                </div>
              );
            })}

            {unit.equippedArmour.map((a) => (
              <div key={a.instanceId} className="flex items-center gap-2 rounded border border-theme-border bg-theme-base p-2.5">
                <Shield className="h-3.5 w-3.5 shrink-0 text-theme-primary" />
                <span className="text-xs font-bold text-theme-text">{a.name}</span>
              </div>
            ))}

            {/*
              Equipment: grenades, kits, tools.

              Missed when this sheet was first written — it rendered weapons
              and armour only, so a model's Equipment was invisible in the
              game, and "Carrying nothing" could show on a model carrying
              three grenades. Its `effect` is the rule the player needs, so it
              is rendered like an ability rather than as a bare name.
            */}
            {(unit.equippedEquipment ?? []).map((e) => (
              <div key={e.instanceId} className="rounded border border-theme-border bg-theme-base p-2.5">
                <div className="flex items-center gap-2">
                  <Backpack className="h-3.5 w-3.5 shrink-0 text-theme-primary" />
                  <span className="text-xs font-bold text-theme-text">{e.name}</span>
                </div>
                {e.effect && (
                  <KeywordText keywords={keywords} className="mt-1 text-xs text-theme-muted">
                    {e.effect}
                  </KeywordText>
                )}
              </div>
            ))}

            {unit.equippedWeapons.length === 0 && unit.equippedArmour.length === 0
              && (unit.equippedEquipment?.length ?? 0) === 0 && (
              <span className="text-xs text-theme-muted">Carrying nothing.</span>
            )}
          </div>
        </Section>

        {/* ------------------------------------------------------ injuries */}
        {(unit.injuries?.length > 0 || (unit.scars?.length ?? 0) > 0) && (
          <Section icon={<HeartCrack className="h-3.5 w-3.5 text-status-error" />} title="Injuries & Scars">
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                {(unit.scars ?? []).map((s, i) => (
                  <span key={`s-${i}`} className="rounded border border-theme-accent/40 bg-theme-accent/20 px-2 py-1 font-mono text-xs text-status-error">
                    {s.name}{s.roll ? ` [${s.roll}]` : ''}
                  </span>
                ))}
                {(unit.injuries ?? []).map((inj, i) => (
                  <span key={`i-${i}`} className="rounded border border-theme-accent/40 bg-theme-accent/20 px-2 py-1 font-mono text-xs text-status-error">
                    {inj}
                  </span>
                ))}
              </div>

              {/*
                The ones the statline cannot carry.

                Named rather than dropped: "-1 DICE for Melee Attacks with the
                injured hand" is a real effect that no number on this card can
                express, and a player who sees only an adjusted Movement would
                reasonably assume the app had the rest covered.
              */}
              {mov.unmodelled.length > 0 && (
                <p className="text-xs text-theme-muted">
                  <strong className="text-theme-text">Remember:</strong>{' '}
                  {mov.unmodelled.join(', ')} — {mov.unmodelled.length === 1 ? 'its effect is' : 'their effects are'}{' '}
                  not a change to the statline, so you apply {mov.unmodelled.length === 1 ? 'it' : 'them'} yourself.
                </p>
              )}
            </div>
          </Section>
        )}

      </div>
    </Sheet>
  );
};
