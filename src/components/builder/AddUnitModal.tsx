'use client';

/**
 * Recruiting, reworked.
 *
 * What it was: every entry rendered at whatever height its rules text happened
 * to need — a Trooper with no abilities was three lines, a Praetor with four
 * was twenty — so the list read as inconsistent rather than dense. Adding one
 * model closed the sheet, so building a Warband of eight meant opening the
 * sheet eight times and re-finding your place in it each time. And nothing
 * showed what you had left to spend, so the budget was only discovered
 * afterwards, back on the roster.
 *
 * What it is: one uniform row per entry with an expand toggle for the rules; a
 * quantity stepper capped at the entry's own recruitment limit; and the Ducats
 * remaining, live, in the header.
 */

import React, { useMemo, useRef, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { useStore } from '../../store/useStore';
import { nameKey } from '../../rules/names';
import { UnitProfile } from '../../types/rules';
import { ActiveUnit } from '../../types/warband';
import { soundEffects } from '../../services/soundEffects';
import {
  ChevronDown,
  Crown,
  Minus,
  Plus,
  Star,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { unitGlory, formatUnitCost } from '@/rules/savedGlory';

interface AddUnitModalProps {
  warbandId: string;
  factionId: string;
  onClose: () => void;
}

/**
 * The order the list is read in.
 *
 * 'Leader' is deliberately absent, and so is its filter tab: a profile is never
 * categorised as Leader — the store sets that on a *model* when one is
 * nominated — so the tab matched nothing and always would. Whether an entry
 * *may* lead is `canLead`, which sorts it to the top of Elite instead.
 */
const CATEGORY_ORDER = ['Elite', 'Trooper', 'Mercenary'] as const;

const rank = (u: UnitProfile) => {
  const i = (CATEGORY_ORDER as readonly string[]).indexOf(u.category);
  return i === -1 ? CATEGORY_ORDER.length : i;
};

export const AddUnitModal: React.FC<AddUnitModalProps> = ({ warbandId, factionId, onClose }) => {
  const {
    units,
    warbands,
    addUnitToWarband,
    removeUnitFromWarband,
    favouriteUnits,
    addUnitFromFavourite,
    removeUnitFromFavourites,
    catalogsLoaded,
    catalogsError,
  } = useStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [customNameInput, setCustomNameInput] = useState<Record<string, string>>({});

  const warband = warbands.find((w) => w.id === warbandId);

  /*
    How many of each profile the Warband already had when the sheet opened.

    The stepper's minus removes a model, and it must only ever remove one this
    session put there. A veteran of six games with a bought sword and two
    advancements shares a `baseProfileId` with the recruit added ten seconds
    ago; without a floor, decrementing past zero-added would delete them.
  */
  const baseline = useRef<Record<string, number>>(
    (warband?.units ?? []).reduce<Record<string, number>>((acc, u) => {
      acc[u.baseProfileId] = (acc[u.baseProfileId] ?? 0) + 1;
      return acc;
    }, {}),
  );

  /*
    Third-party content is hidden unless this Warband has opted in, which is the
    catalogues' own default: those entries are `hidden="true"` until the roster
    takes the "Allow Third-Party Mercenaries?" option. Filtered here rather than
    greyed out — an entry a Warband cannot hire is noise in a list of what it
    can, and the toggle that reveals them says plainly where they went.
  */
  const allowThirdParty = !!warband?.allowThirdParty;

  /*
    A model locked to a Warband Variant is offered only to a Warband on that
    Variant. The Technomancer belongs to the Cadaver Corps, the Matagot Hag to
    The Great Hunger; every one of them used to be offered to the whole faction,
    so a standard Black Grail list could recruit a Leader it is not entitled to.

    Matched on the normalised name as well as the id: a Warband saved before the
    picker existed may carry either.
  */
  const wbVariant = warband?.variantId ? nameKey(warband.variantId) : undefined;
  const onVariant = (u: UnitProfile) =>
    !u.requiresVariant
    || u.requiresVariant.some((v) => nameKey(v.id) === wbVariant || nameKey(v.name) === wbVariant);

  // Filter units belonging to this faction, or mercenaries specifically allowed for this faction
  const availableUnits = useMemo(() => units.filter((u) => {
    if (u.thirdParty && !allowThirdParty) return false;
    if (!onVariant(u)) return false;
    if (u.factionId === factionId) return true;
    if (u.category === 'Mercenary' || u.factionId === 'mercenaries') {
      return Array.isArray(u.allowedFactions) && u.allowedFactions.includes(factionId);
    }
    return false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [units, factionId, allowThirdParty, wbVariant]);

  const categories = ['All', ...CATEGORY_ORDER, `⭐ Favourites (${favouriteUnits.length})`];

  const isFavouritesTab = selectedCategory.startsWith('⭐');

  /*
    'All' is sorted Elite -> Trooper -> Mercenary, which is the order a Warband
    is actually built in and the order the rulebook lists them. Within Elite,
    the Leader-eligible entry comes first: it is the one model a Warband must
    have, and it is nominated automatically when recruited.
  */
  const filtered = useMemo(() => {
    const list = availableUnits.filter((u) =>
      selectedCategory === 'All' ? true : u.category === selectedCategory);
    return [...list].sort((a, b) =>
      rank(a) - rank(b)
      || Number(!!b.canLead) - Number(!!a.canLead)
      || a.name.localeCompare(b.name));
  }, [availableUnits, selectedCategory]);

  const countOf = (unitId: string) =>
    warband?.units.filter((u) => u.baseProfileId === unitId).length ?? 0;

  const spentDucats = warband?.units.reduce((sum, u) => sum + u.totalCost, 0) ?? 0;
  const remainingDucats = (warband?.ducatLimit ?? 0) - spentDucats;

  const handleAdd = (unit: UnitProfile) => {
    const customName = customNameInput[unit.id] || unit.name;
    addUnitToWarband(warbandId, unit.id, customName);
    soundEffects.playGunfire();
    // Deliberately no onClose(): a Warband is eight to twelve models, and
    // closing after each one is what made building a list from scratch tedious.
  };

  /*
    Remove the most recently recruited model of this profile — never below the
    count the sheet opened on, so the minus can only undo this session's adds.
    Models are appended, so the last match is the newest.
  */
  const handleRemove = (unit: UnitProfile) => {
    if (!warband) return;
    if (countOf(unit.id) <= (baseline.current[unit.id] ?? 0)) return;
    const newest = [...warband.units].reverse().find((u) => u.baseProfileId === unit.id);
    if (newest) removeUnitFromWarband(warbandId, newest.id);
  };

  const handleInductFavourite = (favUnit: ActiveUnit) => {
    addUnitFromFavourite(warbandId, favUnit);
    soundEffects.playCathedralBell();
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      size="xl"
      title="RECRUIT WARRIOR"
      subtitle="Add as many as you need — the sheet stays open"
      label="Recruit a warrior"
      headerAside={warband ? (
        <div className="text-right leading-tight" aria-live="polite">
          <span className="eyebrow block text-theme-muted">Ducats left</span>
          <span
            className={`font-mono font-bold tabular-nums text-base ${
              remainingDucats < 0 ? 'text-status-error' : 'text-theme-primary'
            }`}
          >
            {remainingDucats} D
          </span>
        </div>
      ) : undefined}
    >
      {/* The filter row stays with the content rather than the header:
          Sheet's header is sticky, and a second sticky bar costs a
          quarter of a phone screen before a single result is shown. */}
    {/* Filter Tabs */}
    <div className="flex flex-wrap items-center gap-2 pb-3 mb-3 border-b border-theme-border">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => setSelectedCategory(cat)}
          className={`px-3 py-2 text-xs font-mono rounded font-semibold uppercase transition-colors whitespace-nowrap min-h-[44px] ${
            selectedCategory === cat
              ? 'bg-theme-primary text-theme-base shadow-md'
              : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>

          {/* TAB: FAVOURITES HALL */}
          {isFavouritesTab ? (
            <div className="space-y-3">
              {favouriteUnits.length === 0 ? (
                <div className="p-12 text-center bg-theme-base rounded border border-theme-border space-y-3">
                  <Star className="w-8 h-8 text-theme-muted mx-auto opacity-40" />
                  <h3 className="font-gothic font-bold text-base text-theme-text">NO SAVED FAVOURITES YET</h3>
                  <p className="text-xs text-theme-muted max-w-md mx-auto leading-relaxed">
                    Save your seasoned veterans, custom champions, and customized warriors to Favourites via the 3-dots menu on any warrior card!
                  </p>
                </div>
              ) : (
                favouriteUnits.map((fav) => {
                  const titlesStr = fav.titles && fav.titles.length > 0 ? `, ${fav.titles.join(', ')}` : '';
                  return (
                    <div
                      key={fav.id}
                      className="p-4 bg-theme-elevated border border-theme-primary/50 rounded hover:border-theme-primary transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs sm:text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-theme-primary text-theme-base">
                            {fav.profileSnapshot.category}
                          </span>
                          <h3 className="font-gothic font-bold text-base text-theme-text">
                            {fav.customName}{titlesStr}
                          </h3>
                        </div>

                        <div className="text-xs text-theme-muted space-x-3">
                          <span>Base: <strong className="text-theme-text">{fav.profileSnapshot.name}</strong></span>
                          <span>•</span>
                          <span>XP: <strong className="text-theme-primary">{fav.xp || 0} XP</strong></span>
                          <span>•</span>
                          <span>Rating: <strong className="text-theme-primary whitespace-nowrap">{formatUnitCost(fav.totalCost, unitGlory(fav))}</strong></span>
                        </div>

                        {/* Wargear Summary */}
                        <div className="flex flex-wrap gap-1 text-xs sm:text-[10px]">
                          {fav.equippedWeapons?.map((w, idx) => (
                            <span key={idx} className="px-1.5 py-0.2 rounded bg-theme-base text-theme-text border border-theme-border">
                              ⚔️ {w.name}
                            </span>
                          ))}
                          {fav.equippedArmour?.map((a, idx) => (
                            <span key={idx} className="px-1.5 py-0.2 rounded bg-theme-base text-theme-text border border-theme-border">
                              🛡️ {a.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => removeUnitFromFavourites(fav.id)}
                          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-theme-muted hover:text-status-error rounded border border-theme-border hover:bg-theme-accent/20"
                          title="Remove from Favourites"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleInductFavourite(fav)}
                          className="px-4 py-2 min-h-[44px] bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded shadow flex items-center space-x-1.5"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Induct Veteran</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : !catalogsLoaded ? (
            /*
              The recruitable list comes from the generated dataset, which is
              fetched. Until it arrives there is nothing to show — and saying so
              is the point. This modal used to be backed by `defaultRules.ts`,
              whose statlines the audit measured as 97% wrong, so it was always
              instantly full and always partly wrong. An empty list that says
              why beats a full one that lies.
            */
            <div className="p-8 text-center text-theme-muted">
              {catalogsError ? (
                <>
                  <p className="font-bold text-status-error">The ruleset could not be loaded.</p>
                  <p className="mt-1">{catalogsError}</p>
                  <p className="mt-2">
                    Nothing is shown rather than falling back to older data —
                    recruiting from the wrong ruleset is worse than not
                    recruiting yet.
                  </p>
                </>
              ) : (
                <p>Loading the roster from the ruleset…</p>
              )}
            </div>
          ) : (
            /* TAB: STANDARD PROFILES */
            <div className="divide-y divide-theme-border border border-theme-border rounded overflow-hidden">
            {filtered.map((unit, i) => {
              /*
                A heading wherever the role changes.

                The list was already sorted Elite -> Trooper -> Mercenary but
                ran as one unbroken column, so a Mercenary priced in Glory sat
                indistinguishably beside a Trooper priced in Ducats. Derived
                from the sort rather than from a second grouping pass, so the
                headings cannot disagree with the order beneath them.
              */
              const startsGroup = i === 0 || filtered[i - 1].category !== unit.category;
              const isMercenary = unit.category === 'Mercenary' || unit.factionId === 'mercenaries';
              const count = countOf(unit.id);
              const floor = baseline.current[unit.id] ?? 0;
              // The catalogue's own recruitment limit. Absent means unlimited —
              // 20 of the 89 entries genuinely have none.
              const atLimit = unit.maxCount !== undefined && count >= unit.maxCount;
              const isOpen = !!expanded[unit.id];
              const hasDetail = (unit.innateAbilities?.length ?? 0) > 0
                || (unit.stats.keywords?.length ?? 0) > 0
                || !!unit.battlekitNote;

              return (
                <React.Fragment key={unit.id}>
                {startsGroup && (
                  <div
                    className="px-2 sm:px-3 py-1.5 bg-theme-base flex items-baseline gap-2"
                    data-recruit-heading={unit.category}
                  >
                    <span className="text-xs sm:text-[10px] font-mono font-bold uppercase tracking-wider text-theme-primary">
                      {unit.category}
                    </span>
                    <span className="text-xs sm:text-[10px] font-mono text-theme-muted">
                      {filtered.filter((u) => u.category === unit.category).length}
                    </span>
                  </div>
                )}
                <div
                  className="bg-theme-elevated"
                  data-recruit-row={unit.name}
                  data-category={unit.category}
                  data-ducats={unit.baseCost}
                >
                  {/* ---------------------------------------- the summary row */}
                  <div className="flex items-center gap-2 p-2 sm:p-3">
                    <button
                      onClick={() => setExpanded((e) => ({ ...e, [unit.id]: !isOpen }))}
                      className="flex-1 min-w-0 text-left flex flex-col gap-1 py-1.5"
                      aria-expanded={isOpen}
                      aria-label={`${unit.name} details`}
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        {unit.canLead && (
                          <Crown className="w-3.5 h-3.5 text-theme-primary flex-shrink-0" aria-label="May lead the Warband" />
                        )}
                        <span className="font-gothic font-bold text-sm text-theme-text truncate">
                          {unit.name}
                        </span>
                        {hasDetail && (
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-theme-muted flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          />
                        )}
                      </span>
                      {/* The statline, on one line and always present. This is
                          what made the old list ragged: it was shown, then the
                          abilities under it were shown only sometimes.

                          Set on its own tinted ground rather than only in a
                          lighter grey. As plain muted text it read as a second
                          sentence of the name above it; a faint panel says
                          "this is a profile, not prose" without competing with
                          the name for attention. `inline-block` with `w-fit`
                          so the tint stops at the text instead of ruling a bar
                          across the row. */}
                      <span className="font-mono text-xs text-theme-muted tabular-nums truncate
                                       inline-block w-fit max-w-full rounded-sm
                                       bg-theme-base/70 border border-theme-border/60 px-1.5 py-0.5">
                        {unit.stats.movement} · R {unit.stats.ranged} · M {unit.stats.melee} · S {unit.stats.armour}
                        {isMercenary && <span className="text-status-legal"> · Merc</span>}
                        {/* On the collapsed row, not only in the expanded panel:
                            an entry that is not official has to be readable as
                            such without opening it. */}
                        {unit.thirdParty && (
                          <span className="text-status-warning"> · Third party</span>
                        )}
                      </span>
                    </button>

                    {/* -------------------------------------- cost + stepper */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-mono text-xs font-bold text-theme-text tabular-nums text-right leading-tight">
                        {/* Both currencies. This read "0 D" for every Mercenary
                            the catalogues price in Glory — free, and hireable
                            without limit. */}
                        {unit.baseCost > 0 || !unit.gloryCost ? `${unit.baseCost} D` : ''}
                        {unit.gloryCost ? (
                          <span className="block text-theme-primary">{unit.gloryCost} Glory</span>
                        ) : null}
                      </span>

                      {count > 0 ? (
                        <div className="flex items-center border border-theme-border rounded overflow-hidden">
                          <button
                            onClick={() => handleRemove(unit)}
                            disabled={count <= floor}
                            className="w-11 h-11 flex items-center justify-center text-theme-muted hover:text-status-error hover:bg-theme-base disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label={`Remove one ${unit.name}`}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-mono text-sm font-bold text-theme-text tabular-nums">
                            {count}
                          </span>
                          <button
                            onClick={() => handleAdd(unit)}
                            disabled={atLimit}
                            className="w-11 h-11 flex items-center justify-center text-theme-primary hover:bg-theme-base disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label={`Recruit another ${unit.name}`}
                            title={atLimit ? `Limit ${unit.maxCount} per Warband` : undefined}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAdd(unit)}
                          className="w-11 h-11 flex items-center justify-center bg-theme-primary hover:bg-theme-primary-hover text-theme-base rounded transition-colors"
                          aria-label={`Recruit ${unit.name}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ------------------------------------------- the details */}
                  {isOpen && (
                    <div className="px-3 pb-3 space-y-2 bg-theme-base border-t border-theme-border">
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <span
                          className={`eyebrow px-2 py-0.5 rounded font-bold ${
                            unit.category === 'Elite'
                              ? 'bg-theme-primary text-theme-base'
                              : unit.category === 'Mercenary'
                              ? 'bg-status-legal text-white'
                              : 'bg-theme-border text-theme-text'
                          }`}
                        >
                          {unit.category}
                        </span>
                        {unit.canLead && (
                          <span className="eyebrow px-2 py-0.5 rounded font-bold bg-theme-primary/15 text-theme-primary border border-theme-primary/40">
                            May lead
                          </span>
                        )}
                        {unit.thirdParty && (
                          <span className="eyebrow px-2 py-0.5 rounded font-bold bg-status-warning/15 text-status-warning border border-status-warning/40">
                            Third party
                          </span>
                        )}
                        {unit.requiresVariant && (
                          <span className="eyebrow px-2 py-0.5 rounded font-bold bg-theme-primary/15 text-theme-primary border border-theme-primary/40">
                            {unit.requiresVariant.map((v) => v.name).join(' / ')} only
                          </span>
                        )}
                        {unit.maxCount !== undefined && (
                          <span className="eyebrow text-theme-muted">Limit {unit.maxCount}</span>
                        )}
                        {unit.stats.baseSize && (
                          <span className="eyebrow text-theme-muted">{unit.stats.baseSize} base</span>
                        )}
                      </div>

                      {unit.stats.keywords && unit.stats.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {unit.stats.keywords.map((k) => (
                            <span key={k} className="eyebrow px-1.5 py-0.5 rounded bg-theme-surface text-theme-text border border-theme-border">
                              {k}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* The source's own disclaimer, not a paraphrase of it. */}
                      {unit.thirdParty && unit.thirdPartyNotice && (
                        <p className="text-xs text-status-warning/90 leading-relaxed border-l-2 border-status-warning/40 pl-2">
                          {unit.thirdPartyNotice}
                        </p>
                      )}

                      {/*
                        What this entry may take, in the book's own words.

                        The Armoury Table says what the FACTION stocks; several
                        entries then narrow it — "The only Ranged Weapons they
                        can have are Automatic Pistols and Pistols" — and
                        nothing in the model can carry that. Shown here, beside
                        the recruit button, because that is the moment it
                        decides something.
                      */}
                      {unit.battlekitNote && (
                        <p className="text-xs text-theme-muted leading-relaxed border-l-2 border-theme-accent/40 pl-2">
                          <strong className="text-theme-primary">Battlekit:</strong>{' '}
                          {unit.battlekitNote}
                        </p>
                      )}

                      {unit.innateAbilities && unit.innateAbilities.length > 0 && (
                        <div className="text-xs text-theme-muted space-y-1 leading-relaxed">
                          {unit.innateAbilities.map((ab) => (
                            <p key={ab.id}>
                              <strong className="text-theme-primary">{ab.name}:</strong> {ab.description}
                            </p>
                          ))}
                        </div>
                      )}

                      <label className="block">
                        <span className="eyebrow text-theme-muted block mb-1">
                          Name the next one (optional)
                        </span>
                        <input
                          type="text"
                          placeholder={unit.name}
                          value={customNameInput[unit.id] || ''}
                          onChange={(e) =>
                            setCustomNameInput({ ...customNameInput, [unit.id]: e.target.value })
                          }
                          /*
                            16px at every width, not `text-base sm:text-sm`.
                            The zoom rule is about phones, but this sheet is
                            also the tablet's main building surface and a 14px
                            field there is just harder to hit for nothing
                            (MOBILE.md §3).
                          */
                          className="bg-theme-surface border border-theme-border rounded px-3 py-2 min-h-[44px] text-base text-theme-text focus:outline-none focus:border-theme-primary w-full sm:w-64"
                        />
                      </label>
                    </div>
                  )}
                </div>
                </React.Fragment>
              );
            })}
            </div>
          )}
    </Sheet>
  );
};
