'use client';

import React, { useState } from 'react';
import { hasExtraLimb } from '../../rules/formulae';
import { Sheet } from '../ui/Sheet';
import { useStore } from '../../store/useStore';
import { carriesAsBattlekit, forcedBattlekit } from '../../rules/battlekit';
import { canEquip } from '../../rules/equipGate';
import { armouryFor } from '../../rules/armoury';
import { gloryItemPermission, gloryItemNotice } from '../../rules/gloryItems';
import { traitsOf, chosenBy } from '../../rules/formulae';
import { formulaShelf } from '../../rules/formulaShelf';
import { catalogueUnitFor } from '../../rules/catalogueUnit';
import { isGolem } from '../../rules/golem';
import { alchemistAliveFor, takwinEntries } from '../../rules/takwin';
import { formatCost } from '../../rules/costs';
import { battlekitBreaches } from '../../rules/battlekitLimits';
import { useDataset } from '../../rules/useDataset';
import { DEFAULT_RULESET_ID } from '../../rules/rulesets';
import { WeaponProfile, ArmourProfile, EquipmentItem } from '../../types/rules';
import { 
  Shield, 
  Swords, 
  Package, 
  Plus, 
  Search,
  Minus,
  AlertTriangle,
  FlaskConical,
  Sparkles
} from 'lucide-react';

interface AddEquipmentModalProps {
  warbandId: string;
  unitId: string;
  unitName: string;
  onClose: () => void;
}

/**
 * Equip, or adjust how many.
 *
 * The recruit screen has had a stepper for unit counts since Phase 3 and the
 * equip sheet did not: every extra Grenade meant hunting for the row again,
 * and removing one meant leaving the sheet for the model's card. This is the
 * same control, in the place the player is already looking.
 *
 * The `+` is gated by the rules — see `canEquip` — so the ceiling is the one
 * the book states, whether that is a per-model `Limit: 3 (1 per model)` from
 * the Armoury Table or a carrying limit from the Battlekit chapter. The `-`
 * is never gated: a player must always be able to undo, and a model already
 * over a limit needs that more than anyone.
 *
 * Both buttons hold the 44px touch floor up to `lg:`, not `sm:`. The project's
 * own definition of done applies that floor to the TABLET as well as the phone
 * — see mobile.spec, which exempts only desktop — and the tablet viewport is
 * exactly 768px, which is where `md:` STARTS applying. `lg:` is the first
 * breakpoint above it, and a tablet is still a device held at a table.
 */
const EquipControl: React.FC<{
  gate: { allowed: boolean; reason?: string; caveat?: string };
  owned: number;
  onAdd: () => void;
  onRemove: () => void;
  addLabel?: string;
  addClassName?: string;
}> = ({ gate, owned, onAdd, onRemove, addLabel = 'Equip', addClassName }) => {
  if (owned > 0) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={onRemove}
          aria-label={`Remove one — ${owned} carried`}
          className="min-h-[44px] min-w-[44px] lg:min-h-[32px] lg:min-w-[32px] flex items-center justify-center rounded border border-theme-border bg-theme-elevated text-theme-text hover:bg-status-error hover:text-white transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="min-w-[2ch] text-center font-bold text-sm text-theme-text tabular-nums">
          {owned}
        </span>
        <button
          onClick={onAdd}
          disabled={!gate.allowed}
          title={gate.reason ?? gate.caveat}
          aria-label={gate.allowed
            ? (gate.caveat ? `Add one more — ${gate.caveat}` : 'Add one more')
            : gate.reason}
          className={`min-h-[44px] min-w-[44px] lg:min-h-[32px] lg:min-w-[32px] flex items-center justify-center rounded border transition-colors ${
            gate.allowed
              ? 'border-theme-border bg-theme-elevated text-theme-text hover:bg-theme-primary hover:text-theme-base'
              // Clearly spent, not merely quiet: at a glance the disabled `+`
              // sat beside an enabled `-` looking much the same, and a control
              // that might be pressable is worse than one that plainly is not.
              : 'border-theme-border/40 bg-transparent text-theme-muted opacity-40 cursor-not-allowed'
          }`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onAdd}
      disabled={!gate.allowed}
      title={gate.reason ?? gate.caveat}
      aria-label={gate.allowed && gate.caveat ? `${addLabel} — ${gate.caveat}` : undefined}
      className={addClassName ?? `px-3 py-1 border rounded text-xs sm:text-[11px] font-bold uppercase transition-colors flex items-center space-x-1 ${
        gate.allowed
          ? 'bg-theme-elevated hover:bg-theme-primary hover:text-theme-base text-theme-text border-theme-border'
          : 'bg-transparent text-theme-muted border-theme-border/50 cursor-not-allowed'
      }`}
    >
      <Plus className="w-3.5 h-3.5" />
      <span>{gate.allowed ? addLabel : 'Not allowed'}</span>
    </button>
  );
};

/**
 * What the rules say about this entry for this model, in the book's own words.
 *
 * Two things, and the second is the whole of RC-06. A REFUSAL quotes the
 * sentence that forbids it — this used to appear on the armour list alone, and
 * as a hand-written "Homunculus restriction: Shields only. Body armour
 * prohibited." that appears in no book. A CAVEAT is the other half: a
 * restriction whose identity clause the model satisfies and whose condition
 * the roster cannot answer — "Janissaries & Yüzbaşı with Janissary Veteran
 * only" against a roster that does not record who is a Veteran.
 *
 * The caveat is shown rather than enforced. Refusing on a condition we cannot
 * read would make the entry unbuyable by anyone; permitting it silently is
 * what let a Sultanate Azeb pick up the Regimental Kaşık. So the button stays
 * live and the player is told what they are being trusted with.
 *
 * On screen, not in a `title`: a tooltip does not exist on the phone this app
 * is used on.
 */
/**
 * Where an offer comes from, when it is not this Warband's own Armoury.
 *
 * A House of Wisdom player opening the equip sheet now sees New Antioch's and
 * Trench Pilgrims' Battlekit mixed in with the Sultanate's, and nothing on the
 * row would otherwise say which is which — or that taking one spends a
 * once-per-campaign allowance rather than just Ducats. The rule is named
 * rather than described, because it is the sentence the player can look up.
 */
const GrantNote: React.FC<{ rule?: string; armoury?: string }> = ({ rule, armoury }) => {
  if (!rule) return null;
  return (
    <p className="text-xs sm:text-[10px] text-theme-accent pt-0.5">
      {armoury ? `${armoury} Armoury` : 'Another Armoury'} — via {rule}
    </p>
  );
};

const GateNote: React.FC<{ gate: { allowed: boolean; reason?: string; caveat?: string } }> =
  ({ gate }) => {
    if (!gate.allowed) {
      return (
        <span className="text-xs sm:text-[10px] text-status-error block font-bold">
          ⚠️ {gate.reason ?? 'Not available to this model.'}
        </span>
      );
    }
    if (!gate.caveat) return null;
    return (
      <span className="text-xs sm:text-[10px] text-theme-accent block font-bold">
        ⚠️ {gate.caveat}
      </span>
    );
  };

/**
 * The label that says an offer came from a Glory Item Table rather than the
 * faction's Armoury Table (p.125, RR-14).
 *
 * Worth saying on the row itself: the two are priced in the same currency and a
 * player who has just opened the tables with a Trench Merchant is looking at a
 * list where some rows needed that discovery and most did not.
 */
const GloryItemChip: React.FC = () => (
  <span className="ml-1.5 align-middle rounded border border-theme-accent/50 bg-theme-accent/10 px-1 py-0.5 font-mono text-xs sm:text-[9px] uppercase tracking-wider text-theme-accent">
    Glory Item
  </span>
);

export const AddEquipmentModal: React.FC<AddEquipmentModalProps> = ({
  warbandId,
  unitId,
  unitName,
  onClose
}) => {
  const { 
    weapons, 
    armour, 
    equipment, 
    equipWeapon, 
    equipArmour, 
    equipEquipment, 
    toggleUnitSpecialUpgrade,
    removeWeapon,
    removeArmour,
    removeEquipment,
    getActiveWarband 
  } = useStore();

  const [tab, setTab] = useState<'weapons' | 'armour' | 'equipment' | 'formulas'>('weapons');

  const [weaponSubCategory, setWeaponSubCategory] = useState<'all' | 'melee' | 'ranged' | 'shield' | 'grenade'>('all');
  /*
    `formulae` is gone from this list, and it is a deletion rather than a
    rename.

    The chip filtered `equipment` — the Armoury offer — for things whose name
    matched `/formula|elixir|salve|phial|alkahest|vitriol|brimstone|cinnabar/i`
    or whose category was `Formula`. Measured on the shipped dataset, it
    matched NOTHING and always had: `recruitable` builds `equipment` from
    Armoury Table rows, and an Alchemical Formula is never an Armoury row —
    it is an option on a model's own catalogue entry. So the chip was a
    filter over a list that cannot contain the thing it filtered for, and it
    showed an empty panel every time it was pressed.

    The name regex is the same habit `formulae.ts` was written to document:
    not one of the fifteen real Formulae matches it.
  */
  const [equipmentSubCategory, setEquipmentSubCategory] = useState<'all' | 'headgear' | 'relic' | 'gear'>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const activeWarband = getActiveWarband();
  const unit = activeWarband?.units.find(u => u.id === unitId);
  const factionId = activeWarband?.factionId || 'universal';
  const unitProfileName = unit?.profileSnapshot.name || unitName;


  // Equipment arrays
  const currentWeapons = unit?.equippedWeapons || [];
  const currentArmour = unit?.equippedArmour || [];
  const currentEquipment = unit?.equippedEquipment || [];

  /*
    The hand arithmetic is the ENGINE's, not this file's (FD-13a).

    What stood here was a second carrying-rules engine, and it got the book
    wrong in three ways at once:

      const isStrong = /strong|bulky|large|ogre/i.test(a.name) || ...
      const effectiveHands = (isStrong && rawHands >= 2) ? 1 : rawHands;

    STRONG is a **Keyword** — the dataset carries it as one — and this found
    it by a regex over ability names and descriptions, the same
    name-pattern habit the rest of this file was purged of. Then it applied
    the conversion to **every** 2-Handed Melee Weapon, where the book grants
    exactly one: *"it can equip and use ONE 2-Handed Melee Weapon as if it
    were a 1-Handed Melee Weapon"* (Digital Rulebook L3247 to L3249). So a
    STRONG model could be given three greatswords and shown three hands
    used out of three. And CUMBERSOME — *"require two hands to use, EVEN IF
    the model has the STRONG Keyword"* — was read not at all.

    `battlekitLimits.ts` had all three right already, including the entry's
    own stated allowance and the shield clause, and said so in a comment
    naming this file's version as the broken one. Two engines, one book;
    this one goes.
  */
  const isOverArmourLimit = currentArmour.length > 1;


  /*
    The three name-pattern predicates that stood here are gone.

    `isWeaponLegal`, `isArmourLegal` and `isEquipmentLegal` decided what a model
    could take from regexes over NAMES — a second, hand-written rules engine
    beside the derived one, and the exact pattern the audit was about:

        isBeast = /lion|dog|hound|beast/i.test(unitProfileName)  -> equips nothing
        isHeavyConstruct = /brazen|golem|mamluk|mechanized/i.test(unitProfileName)
        isHeavySpecialWeapon = /titan|cannon|autocannon/i.test(w.name)
        if (isHeavySpecialWeapon && !isHeavyConstruct) return false;

    Those last two hid the Titan Zulfiqar from a Takwin Homunculus — including
    one with Gargantuan Size, which the catalogue explicitly reveals it to —
    and the filter was permanently on, so nothing on screen said why.

    `gateFor` below asks the validator's own question of the same data instead,
    which is also what stops a greyed-out button and a legality error from ever
    disagreeing.
  */

  /*
    Gear the model already has.

    The catalogue forces Standard Armour, a Gas Mask and a Medi-kit onto a
    Combat Medic and then hides those Armoury rows from it, because a model
    cannot buy what it is already wearing. The app carried neither half of
    that, so it would sell a Medic a second 5-Ducat Gas Mask.

    Hidden rather than greyed out: the list is what a player can spend on, and
    a row they can never take is noise at a table. The kit itself is shown on
    the model's own card, where it belongs.
  */
  /*
    Whether an item may be taken, asked of the SAME data the validator uses.

    This replaces a hand-written engine of regexes over names — `isBeast`,
    `isHomunculus`, `isHeavyConstruct`, `isHeavySpecialWeapon` — two of which
    hid the Titan Zulfiqar from a Takwin Homunculus with Gargantuan Size: the
    weapon matches /titan/, the model does not match /brazen|golem|mamluk/,
    and the filter was permanently on. So the model could not be offered a
    weapon the catalogue explicitly reveals to it.

    Items that fail are now shown DISABLED with the published sentence that
    forbids them, rather than silently removed: a player looking for a weapon
    that is not in the list cannot tell whether the app is enforcing a rule or
    has lost the entry.
  */
  const { dataset } = useDataset(
    (typeof window !== 'undefined'
      && window.localStorage.getItem('trenchline_ruleset')) || DEFAULT_RULESET_ID);

  /*
    What this Warband may buy from its Glory Item Table, so the sheet can say
    why the table is shut. The FILTERING is `recruitable`'s — the shelf this
    screen is handed no longer carries the rows — and this is only the sentence
    that explains it.
  */
  const gloryGate = React.useMemo(
    () => gloryItemPermission(dataset, activeWarband?.explorationEffects),
    [dataset, activeWarband]);

  const carriedNow = React.useMemo(() => ([
    ...(unit?.equippedWeapons ?? []),
    ...(unit?.equippedArmour ?? []),
    ...(unit?.equippedEquipment ?? []),
  ] as { id?: string; name: string }[]).map((g) => ({ name: g.name, weaponId: g.id })),
  [unit]);

  /*
    The armoury whose stipulations apply to this item.

    Usually the Warband's own. Where a Variant rule opens a foreign Armoury —
    the House of Wisdom's *Weapon Collections*, the Knights of Avarice's
    *Corrupt Merchants* — the offer comes from that table and carries its
    conditions, not ours: "Any stipulations that apply to it are followed"
    (Warbands L5305). Reading our own table for a foreign item finds no row
    at all, which returns no restrictions, which is an item silently exempt
    from the sentence the book prints beside it. `recruitable` stamps each
    offer with the faction whose table priced it, so this is a lookup rather
    than a guess.
  */
  const armouryOf = React.useCallback((item: { factionId?: string }) =>
    (dataset ? armouryFor(dataset, item.factionId || factionId) : undefined),
  [dataset, factionId]);

  const gateFor = React.useCallback((item: { id?: string; name: string; factionId?: string }) => {
    if (!dataset) return { allowed: true };
    return canEquip(item, {
      dataset,
      armoury: armouryOf(item),
      carried: carriedNow,
      unit: {
        name: unitProfileName,
        keywords: unit?.profileSnapshot?.stats?.keywords,
        roles: unit?.profileSnapshot?.category ? [unit.profileSnapshot.category] : [],
        /* A Mercenary may have no Battlekit but its own — see
           `mercenaryRefusal`. Both of these decide that: the kit is what
           "other" is measured against, and the permission is the Scripture
           Guardian's stated exception. */
        battlekit: forcedBattlekit(unit?.profileSnapshot),
        mercenaryMayBuy: unit?.profileSnapshot?.mercenaryMayBuy,
      },
      traits: traitsOf(unit),
      taken: chosenBy(unit),
      extraLimb: hasExtraLimb(unit),
    });
  }, [dataset, armouryOf, carriedNow, unitProfileName, unit]);

  /*
    How many of a thing the model already carries, and which instance to drop.

    The store removes by `instanceId`, so decrementing takes the LAST one
    added — the same one the player just added with `+`, which is what makes
    the pair read as one control rather than two unrelated buttons.
  */
  /*
    What the model is carrying breaks, in the book's own sentences.

    The same call the roster validator makes, so the sheet and the validator
    cannot disagree about a loadout: a model offered a third weapon here and
    then refused at the roster door is the worst of both answers.
  */
  const breachesNow = React.useMemo(() => {
    if (!dataset) return [];
    return battlekitBreaches(carriedNow, {
      dataset,
      armoury: armouryFor(dataset, factionId),
      keywords: unit?.profileSnapshot?.stats?.keywords,
      modelName: unit?.profileSnapshot?.name,
      traits: traitsOf(unit),
      extraLimb: hasExtraLimb(unit),
    });
  }, [dataset, factionId, carriedNow, unit]);

  /*
    FD-13a item 2. The Alchemical Formulae a model may buy.

    The whole of the rules half is `formulaShelf`: which of this ENTRY's
    options are Formulae, what each one's own sentence requires and refuses,
    the Book of Golems' free 50-Ducat allowance, and the House of Wisdom's
    dead-Alchemist rule. Here we only supply the two facts about the roster
    that a rules module has no business going looking for.
  */
  const takwinNames = React.useMemo(() => takwinEntries(dataset), [dataset]);
  /* Id first, faction second, name last — six entries are called
     `Homunculus` and a bare name lookup answered with the Court's (ID-1). */
  const catalogueUnit = React.useMemo(
    () => catalogueUnitFor(dataset, unit, factionId),
    [dataset, unit, factionId]);

  /*
    Whether this model is one the association rule governs, and whether its
    Alchemist is still alive.

    The rule is one-to-one — "An Alchemist can only have a single Takwin
    Homunculus associated with it and vice versa" — and the app has never
    recorded WHICH. So the counts are what there is, and `alchemistAliveFor`
    turns them into the three answers the rule can honestly give. A Golem is
    excluded from both counts: the Book of Golems creates it with no
    Alchemist at all, and `formulaShelf` reads the grant for it instead.
  */
  const nameIs = (u: { profileSnapshot?: { name?: string } }, name?: string) =>
    Boolean(name) && u.profileSnapshot?.name === name;
  const isTakwin = Boolean(unit && nameIs(unit, takwinNames?.homunculus));
  const rosterUnits = activeWarband?.units;
  const alchemistAlive = React.useMemo(() => {
    const roster = rosterUnits ?? [];
    return alchemistAliveFor({
      alchemists: roster.filter((u) => nameIs(u, takwinNames?.alchemist) && !u.isDead).length,
      homunculi: roster.filter(
        (u) => nameIs(u, takwinNames?.homunculus) && !u.isDead && !isGolem(u)).length,
    });
  }, [rosterUnits, takwinNames]);

  const shelf = React.useMemo(() => formulaShelf(dataset, {
    unit,
    catalogueUnit,
    alchemistAlive,
    isTakwin,
    strongbox: {
      ducats: activeWarband?.treasuryDucats ?? 0,
      glory: activeWarband?.gloryPoints ?? 0,
    },
  }), [dataset, unit, catalogueUnit, alchemistAlive, isTakwin,
    activeWarband?.treasuryDucats, activeWarband?.gloryPoints]);

  const sameItem = (a: { id?: string; name: string }, b: { id?: string; name: string }) =>
    (b.id != null && a.id === b.id) || a.name === b.name;
  const ownedIn = (
    list: { instanceId?: string; id?: string; name: string }[],
    item: { id?: string; name: string },
  ) => list.filter((x) => sameItem(x, item)).length;
  const lastInstanceIn = (
    list: { instanceId?: string; id?: string; name: string }[],
    item: { id?: string; name: string },
  ) => [...list].reverse().find((x) => sameItem(x, item))?.instanceId;

  const kit = forcedBattlekit(unit?.profileSnapshot);
  const alreadyCarried = <T extends { id?: string; name: string }>(item: T) =>
    carriesAsBattlekit(unit?.profileSnapshot, item);

  /*
    Every entry the faction stocks, DISABLED where a rule forbids it rather
    than removed.

    `filterLegalOnly` dropped them silently, and a player looking for a weapon
    that is not in the list cannot tell whether the app is enforcing a rule or
    has lost the entry. The Titan Zulfiqar was the case that proved it: hidden
    from a Homunculus by a regex, with nothing on screen to say why.
  */
  let displayedWeapons = weapons.filter((w) => !alreadyCarried(w));
  if (weaponSubCategory === 'ranged') {
    displayedWeapons = displayedWeapons.filter(w => w.type === 'Ranged' || (w.range && w.range !== 'Melee' && !w.range.startsWith('Melee') && !/shield/i.test(w.name)));
  } else if (weaponSubCategory === 'melee') {
    displayedWeapons = displayedWeapons.filter(w => w.type === 'Melee' || w.range === 'Melee' || w.range?.startsWith('Melee'));
  } else if (weaponSubCategory === 'shield') {
    displayedWeapons = displayedWeapons.filter(w => /shield|mantlet|instrument|flag/i.test(w.name) || w.keywords?.includes('SHIELD'));
  } else if (weaponSubCategory === 'grenade') {
    displayedWeapons = displayedWeapons.filter(w => /grenade|bomb|molotov|dynamite|flask|pot/i.test(w.name) || w.keywords?.includes('GRENADE'));
  }

  let displayedArmour = armour.filter((a) => !alreadyCarried(a));

  let displayedEquipment = equipment.filter((e) => !alreadyCarried(e));
  if (equipmentSubCategory === 'headgear') {
    displayedEquipment = displayedEquipment.filter(e => /helmet|gas mask|mask|goggles|hood|crown/i.test(e.name));
  } else if (equipmentSubCategory === 'relic') {
    displayedEquipment = displayedEquipment.filter(e => /relic|amulet|icon|tome|scripture|chalice|shrine|cross/i.test(e.name));
  } else if (equipmentSubCategory === 'gear') {
    displayedEquipment = displayedEquipment.filter(e => !/helmet|gas mask|formula|elixir|salve|phial/i.test(e.name));
  }

  // Search filter
  const sQuery = searchFilter.toLowerCase().trim();
  if (sQuery) {
    displayedWeapons = displayedWeapons.filter(w => w.name.toLowerCase().includes(sQuery) || (w.description || '').toLowerCase().includes(sQuery));
    // Was `displayedArmour.filter(...)` with the result thrown away, so typing
    // in the search box filtered weapons and equipment but never armour.
    displayedArmour = displayedArmour.filter(a => a.name.toLowerCase().includes(sQuery) || (a.description || '').toLowerCase().includes(sQuery));
    displayedEquipment = displayedEquipment.filter(e => e.name.toLowerCase().includes(sQuery) || (e.effect || '').toLowerCase().includes(sQuery));
  }

  const handleEquipWeapon = (w: WeaponProfile) => {
    equipWeapon(warbandId, unitId, w.id);
  };

  const handleEquipArmour = (a: ArmourProfile) => {
    equipArmour(warbandId, unitId, a.id);
  };

  const handleEquipEquipment = (e: EquipmentItem) => {
    equipEquipment(warbandId, unitId, e.id);
  };

  return (
    <Sheet
      open
      onClose={onClose}
      size="xl"
      title={<>EQUIP WARRIOR: <span className="text-theme-primary">{unitName}</span></>}
      label="Equip warrior"
      footer={<div className="flex items-center justify-between w-full gap-3">
            <span>
              {tab === 'weapons' ? `${displayedWeapons.length} weapons available`
                : tab === 'armour' ? `${displayedArmour.length} armour/shields available`
                : tab === 'formulas' ? `${shelf.offers.length} Alchemical Formulae on this entry`
                : `${displayedEquipment.length} gear items available`}
            </span>
            <button
              onClick={onClose}
              className="px-5 py-1.5 bg-theme-elevated hover:bg-theme-border text-theme-text rounded uppercase font-bold text-xs border border-theme-border"
            >
              Done
            </button>
      </div>}
    >

        {/*
          What the model is already wearing.

          Shown because the rows for these are deliberately absent from the
          lists below, and a player looking for the Gas Mask they know the
          Armoury stocks needs to be told why it is not there.
        */}
        {kit.length > 0 && (
          <div className="px-4 py-2 bg-theme-base border-b border-theme-border flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs flex-shrink-0">
            <span className="font-bold uppercase text-theme-muted tracking-wide">Battlekit:</span>
            <span className="text-theme-text">
              a {unitProfileName} always has{' '}
              {kit.map((b) => b.name).join(', ')}.
            </span>
            <span className="text-theme-muted">Already carried, so not listed below.</span>
          </div>
        )}

        {/* What the loadout breaks, quoted rather than counted */}
        <div className="px-4 py-2 bg-theme-elevated border-b border-theme-border flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-theme-muted">
              Armour Slots: <strong className={`font-bold ${isOverArmourLimit ? 'text-status-error' : 'text-theme-text'}`}>{currentArmour.length} / 1</strong>
            </span>
          </div>

          {/*
            The sentence, not a tally. `x / y hands` was a number this file
            worked out for itself and got wrong; the engine returns the
            published rule that a loadout breaks, and that is what a player
            needs in order to check the app against the page.
          */}
          {breachesNow.length > 0 && (
            <span className="text-xs sm:text-[11px] text-status-error flex items-start gap-1 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{breachesNow[0].message}</span>
            </span>
          )}
        </div>

        {/*
          Fixed Main Category Tabs.

          `overflow-x-auto` with `shrink-0` tabs, because four of them do not
          fit across a 375px phone and the fourth was rendering with its label
          cut off at the edge. Scrolling the row is the mobile answer; the
          alternative — letting the bar clip — is the thing docs/MOBILE.md
          forbids, and shrinking the labels would put them under the 44px
          touch floor.
        */}
        <div className="flex overflow-x-auto border-b border-theme-border bg-theme-base px-4 pt-2.5 gap-2 flex-shrink-0">
          <button
            onClick={() => setTab('weapons')}
            className={`px-4 sm:px-5 py-2.5 shrink-0 whitespace-nowrap font-bold uppercase flex items-center space-x-2 transition-all text-xs rounded-t ${
              tab === 'weapons'
                ? 'bg-theme-elevated text-theme-primary border-t-2 border-x border-theme-border border-t-theme-primary'
                : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface'
            }`}
          >
            <Swords className="w-4 h-4 text-theme-primary" />
            <span>WEAPONS ({displayedWeapons.length})</span>
          </button>

          <button
            onClick={() => setTab('armour')}
            className={`px-4 sm:px-5 py-2.5 shrink-0 whitespace-nowrap font-bold uppercase flex items-center space-x-2 transition-all text-xs rounded-t ${
              tab === 'armour'
                ? 'bg-theme-elevated text-theme-primary border-t-2 border-x border-theme-border border-t-theme-primary'
                : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface'
            }`}
          >
            <Shield className="w-4 h-4 text-theme-primary" />
            <span>ARMOUR & SHIELDS ({displayedArmour.length})</span>
          </button>

          <button
            onClick={() => setTab('equipment')}
            className={`px-4 sm:px-5 py-2.5 shrink-0 whitespace-nowrap font-bold uppercase flex items-center space-x-2 transition-all text-xs rounded-t ${
              tab === 'equipment'
                ? 'bg-theme-elevated text-theme-primary border-t-2 border-x border-theme-border border-t-theme-primary'
                : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface'
            }`}
          >
            <Package className="w-4 h-4 text-theme-primary" />
            <span>GEAR ({displayedEquipment.length})</span>
          </button>

          {/*
            FD-13a item 2. Shown only where the model's catalogue entry
            carries Formulae, or where a rule refuses them — six entries in
            the shipped ruleset, all of them Homunculi. A tab that appeared
            empty on every other model would be the old chip again.

            Its own tab rather than a chip under GEAR because a Formula is
            not Battlekit: it is bought from the model's entry, not from an
            Armoury Table, it is charged as an option rather than as gear,
            and the rules that govern it are its own sentences.
          */}
          {(shelf.open || shelf.refusal) && (
            <button
              onClick={() => setTab('formulas')}
              className={`px-4 sm:px-5 py-2.5 shrink-0 whitespace-nowrap font-bold uppercase flex items-center space-x-2 transition-all text-xs rounded-t ${
                tab === 'formulas'
                  ? 'bg-theme-elevated text-theme-primary border-t-2 border-x border-theme-border border-t-theme-primary'
                  : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface'
              }`}
            >
              <FlaskConical className="w-4 h-4 text-theme-primary" />
              <span>FORMULAE ({shelf.offers.length})</span>
            </button>
          )}
        </div>

        {/* Fixed Sub-Category Filter & Search Toolbar */}
        <div className="p-3 bg-theme-surface border-b border-theme-border flex flex-col sm:flex-row items-center justify-between gap-2 flex-shrink-0">
          
          {/* Sub-Category Pills for Weapons */}
          {tab === 'weapons' && (
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setWeaponSubCategory('all')}
                className={`px-2.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors ${
                  weaponSubCategory === 'all' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setWeaponSubCategory('melee')}
                className={`px-2.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors ${
                  weaponSubCategory === 'melee' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                }`}
              >
                ⚔️ Melee
              </button>
              <button
                onClick={() => setWeaponSubCategory('ranged')}
                className={`px-2.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors ${
                  weaponSubCategory === 'ranged' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                }`}
              >
                🎯 Ranged
              </button>
              <button
                onClick={() => setWeaponSubCategory('shield')}
                className={`px-2.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors ${
                  weaponSubCategory === 'shield' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                }`}
              >
                🛡️ Utility / Shields
              </button>
              <button
                onClick={() => setWeaponSubCategory('grenade')}
                className={`px-2.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors ${
                  weaponSubCategory === 'grenade' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                }`}
              >
                💣 Grenades
              </button>
            </div>
          )}

          {/* Sub-Category Pills for Equipment */}
          {tab === 'equipment' && (
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setEquipmentSubCategory('all')}
                className={`px-2.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors ${
                  equipmentSubCategory === 'all' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setEquipmentSubCategory('headgear')}
                className={`px-2.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors ${
                  equipmentSubCategory === 'headgear' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                }`}
              >
                🪖 Headgear
              </button>
              <button
                onClick={() => setEquipmentSubCategory('relic')}
                className={`px-2.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors ${
                  equipmentSubCategory === 'relic' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                }`}
              >
                ✨ Relics & Icons
              </button>
              <button
                onClick={() => setEquipmentSubCategory('gear')}
                className={`px-2.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors ${
                  equipmentSubCategory === 'gear' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                }`}
              >
                🎒 Gear & Ammo
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-theme-muted" />
            <input
              type="text"
              placeholder="Search by name or keyword..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded pl-8 pr-2.5 py-1.5 text-xs text-theme-text focus:outline-none focus:border-theme-primary"
            />
          </div>
        </div>

        {/*
          Why the Glory Items are, or are not, on these lists (p.125, RR-14).

          The shelf is filtered by `recruitable` before it reaches this screen,
          so without this line a player looking for a Knighthood finds a list
          that simply does not have one and no reason why. The rule is quoted
          from the dataset rather than paraphrased here, because the whole point
          of the sentence is that it names what to go and do about it.
        */}
        <div className="px-1 pb-2">
          <p className="flex items-start gap-1.5 text-xs sm:text-[11px] font-mono leading-relaxed text-theme-muted">
            <Sparkles className="mt-0.5 h-3 w-3 flex-shrink-0 text-theme-accent" />
            <span>{gloryItemNotice(gloryGate, dataset)}</span>
          </p>
        </div>

        {/* Scrollable List Body */}
          
          {/* WEAPONS LIST */}
          {tab === 'weapons' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayedWeapons.map((w) => {
                const gate = gateFor(w);
                const legal = gate.allowed;
                return (
                  <div
                    key={w.id}
                    className={`p-3 rounded border flex flex-col justify-between space-y-2 transition-all ${
                      legal
                        ? 'bg-theme-base border-theme-border hover:border-theme-primary'
                        : 'bg-theme-base/50 border-theme-accent/40 opacity-70'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-xs text-theme-text block">
                            {w.name}{w.gloryItem && <GloryItemChip />}
                          </strong>
                          <span className="text-xs sm:text-[10px] text-theme-muted block">
                            {w.type} • {w.hands || 1}H • Range: {w.range}
                          </span>
                        </div>
                        <span className="font-bold text-xs text-theme-primary px-2 py-0.5 rounded bg-theme-surface border border-theme-border flex-shrink-0">
                          {w.cost > 0 || !w.gloryCost ? `${w.cost} D` : ''}
                          {w.gloryCost ? `${w.cost > 0 ? ' + ' : ''}${w.gloryCost} Glory` : ''}
                        </span>
                      </div>

                      {w.description && (
                        <p className="text-xs sm:text-[11px] text-theme-muted italic leading-relaxed pt-0.5">
                          {w.description}
                        </p>
                      )}

                      {w.keywords && w.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {w.keywords.map((kw, kwIdx) => (
                            <span key={kwIdx} className="text-xs sm:text-[9px] px-1.5 py-0.2 rounded bg-theme-elevated text-theme-text border border-theme-border">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}

                      <GateNote gate={gate} />
                      <GrantNote rule={w.grantedBy} armoury={armouryOf(w)?.faction} />
                    </div>

                    <div className="pt-2 border-t border-theme-border/60 flex items-center justify-between">
                      <span className="text-xs sm:text-[10px] text-theme-muted">
                        Mod: <strong className="text-theme-text">{typeof w.modifiers === 'string' ? w.modifiers : '-'}</strong>
                      </span>
                      <EquipControl
                        gate={gate}
                        owned={ownedIn(currentWeapons as never, w)}
                        onAdd={() => handleEquipWeapon(w)}
                        onRemove={() => {
                          const id = lastInstanceIn(currentWeapons as never, w);
                          if (id) removeWeapon(warbandId, unitId, id);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ARMOUR LIST */}
          {tab === 'armour' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayedArmour.map((a) => {
                const gate = gateFor(a);
                const legal = gate.allowed;
                const isShield = a.category === 'Shield' || /shield|pavise|mantlet/i.test(a.name) || Boolean(a.keywords?.includes('SHIELD'));

                return (
                  <div
                    key={a.id}
                    className={`p-3 rounded border flex flex-col justify-between space-y-2 transition-all ${
                      legal
                        ? 'bg-theme-base border-theme-border hover:border-theme-primary'
                        : 'bg-theme-base/50 border-theme-accent/40 opacity-70'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <strong className="text-xs text-theme-text block">
                              {a.name}{a.gloryItem && <GloryItemChip />}
                            </strong>
                            {isShield && (
                              <span className="text-xs sm:text-[9px] px-1.5 py-0.2 rounded bg-status-legal text-white font-bold uppercase">
                                Shield
                              </span>
                            )}
                          </div>
                          <span className="text-xs sm:text-[10px] text-theme-muted block">
                            Type: {a.category || 'Standard'} • Mod: {a.armourModifier || a.modifier || '-'}
                          </span>
                        </div>
                        <span className="font-bold text-xs text-theme-primary px-2 py-0.5 rounded bg-theme-surface border border-theme-border flex-shrink-0">
                          {a.cost > 0 || !a.gloryCost ? `${a.cost} D` : ''}
                          {a.gloryCost ? `${a.cost > 0 ? ' + ' : ''}${a.gloryCost} Glory` : ''}
                        </span>
                      </div>

                      {a.description && (
                        <p className="text-xs sm:text-[11px] text-theme-muted italic leading-relaxed pt-0.5">
                          {a.description}
                        </p>
                      )}

                      {/*
                        The rule that forbids it, quoted. This was a
                        hand-written sentence — "Homunculus restriction:
                        Shields only. Body armour prohibited." — that appears
                        in no book and was shown whenever a name regex fired.
                      */}
                      <GateNote gate={gate} />
                      <GrantNote rule={a.grantedBy} armoury={armouryOf(a)?.faction} />
                    </div>

                    <div className="pt-2 border-t border-theme-border/60 flex items-center justify-between">
                      <span className="text-xs sm:text-[10px] text-theme-muted">
                        Save Mod: <strong className="text-theme-primary">{a.armourModifier || a.modifier || '-'}</strong>
                      </span>
                      <EquipControl
                        gate={gate}
                        owned={ownedIn(currentArmour as never, a)}
                        onAdd={() => handleEquipArmour(a)}
                        onRemove={() => {
                          const id = lastInstanceIn(currentArmour as never, a);
                          if (id) removeArmour(warbandId, unitId, id);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/*
            EQUIPMENT & RELICS — the Armoury's gear.

            The `isFormula` predicate that styled a row here is gone with the
            chip above it, and for the same reason: an Alchemical Formula is
            never an Armoury row, so no row in this list was ever one. What
            it did instead was tint whatever matched
            `/formula|elixir|salve|phial|.../` — a name pattern deciding game
            data, which is the habit `rules/formulae.ts` exists to document.
            Formulae have their own tab, fed from the model's entry.
          */}
          {tab === 'equipment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayedEquipment.map((e) => {
                const gate = gateFor(e);
                const legal = gate.allowed;

                return (
                  <div
                    key={e.id}
                    className={`p-3 rounded border flex flex-col justify-between space-y-2 transition-all ${
                      legal
                        ? 'bg-theme-base border-theme-border hover:border-theme-primary'
                        : 'bg-theme-base/50 border-theme-accent/40 opacity-70'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <strong className="text-xs block text-theme-text">
                              {e.name}{e.gloryItem && <GloryItemChip />}
                            </strong>
                          </div>
                          <span className="text-xs sm:text-[10px] text-theme-muted block">
                            Faction: {e.factionId || 'Universal'}
                          </span>
                        </div>
                        <span className="font-bold text-xs text-theme-primary px-2 py-0.5 rounded bg-theme-surface border border-theme-border flex-shrink-0">
                          {e.cost > 0 || !e.gloryCost ? `${e.cost} D` : ''}
                          {e.gloryCost ? `${e.cost > 0 ? ' + ' : ''}${e.gloryCost} Glory` : ''}
                        </span>
                      </div>

                      {e.effect && (
                        <p className="text-xs sm:text-[11px] text-theme-text leading-relaxed pt-0.5">
                          {e.effect}
                        </p>
                      )}

                      {e.keywords && e.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {e.keywords.map((kw, kwIdx) => (
                            <span key={kwIdx} className="text-xs sm:text-[9px] px-1.5 py-0.2 rounded bg-theme-elevated text-theme-text border border-theme-border">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}

                      <GateNote gate={gate} />
                      <GrantNote rule={e.grantedBy} armoury={armouryOf(e)?.faction} />
                    </div>

                    <div className="pt-2 border-t border-theme-border/60 flex items-center justify-between">
                      <span className="text-xs sm:text-[10px] text-theme-muted">
                        Gear / Relic
                      </span>
                      <EquipControl
                        gate={gate}
                        owned={ownedIn(currentEquipment as never, e)}
                        onAdd={() => handleEquipEquipment(e)}
                        onRemove={() => {
                          const id = lastInstanceIn(currentEquipment as never, e);
                          if (id) removeEquipment(warbandId, unitId, id);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/*
            ALCHEMICAL FORMULAE — FD-13a item 2.

            Every decision here is `formulaShelf`'s; this renders its answers.
            A refused Formula is SHOWN with the sentence that refuses it,
            never hidden: a player looking for Gargantuan Size and not finding
            it cannot tell whether the app is enforcing a rule or has lost the
            entry, which is the same reasoning as the gear lists above.

            Mobile first: one column at 375px, two from `md:`, and the buy
            control keeps the 44px floor until `lg:`.
          */}
          {tab === 'formulas' && (
            <div className="space-y-3">
              {shelf.refusal && (
                <p className="p-3 rounded border border-status-error/50 bg-theme-surface text-xs sm:text-[11px] text-status-error font-bold leading-relaxed">
                  ⚠️ {shelf.refusal}
                </p>
              )}
              {shelf.caveat && (
                <p className="p-3 rounded border border-theme-accent/50 bg-theme-surface text-xs sm:text-[11px] text-theme-accent font-bold leading-relaxed">
                  ⚠️ {shelf.caveat}
                </p>
              )}

              {/* What the Book of Golems is paying for, while it lasts. */}
              {shelf.freeBudgetLeft !== null && (
                <p className="p-3 rounded border border-theme-primary/50 bg-theme-surface text-xs sm:text-[11px] text-theme-text leading-relaxed">
                  <strong className="text-theme-primary">Book of Golems:</strong>{' '}
                  {shelf.freeBudgetLeft} Ducats of free Formulae left. Anything
                  within that is taken at no cost to the Strongbox.
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {shelf.offers.map((offer) => {
                  const { option, verdict } = offer;
                  const short = offer.short.ducats || offer.short.glory;
                  /* A held Formula can always be given back, whatever the
                     gate says about buying it again and whatever the
                     Strongbox holds — a refund puts money IN. */
                  const actionable = offer.held || (verdict.allowed && !short);
                  return (
                    <div
                      key={option.id}
                      className={`p-3 rounded border flex flex-col justify-between gap-2 transition-all ${
                        offer.held
                          ? 'bg-theme-elevated border-theme-primary ring-1 ring-theme-primary/40'
                          : verdict.allowed
                            ? 'bg-theme-base border-theme-border hover:border-theme-primary'
                            : 'bg-theme-base/50 border-theme-accent/40 opacity-70'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <strong className={`text-xs ${offer.held ? 'text-theme-primary' : 'text-theme-text'}`}>
                            {option.name}
                          </strong>
                          <span className="font-bold text-xs text-theme-primary px-2 py-0.5 rounded bg-theme-surface border border-theme-border flex-shrink-0">
                            {offer.free
                              ? `Free (${formatCost(offer.listPrice)})`
                              : formatCost(offer.listPrice)}
                          </span>
                        </div>
                        {/* The group as the catalogue files it — `Eye Options`
                            reads as itself, not as its parent. */}
                        <span className="text-xs sm:text-[10px] text-theme-muted block">
                          {option.group}
                        </span>
                        <p className="text-xs sm:text-[11px] text-theme-text leading-relaxed pt-0.5">
                          {option.description}
                        </p>
                        <GateNote gate={verdict} />
                        {/*
                          Short of money is not the same as forbidden, and it
                          is not rendered as one: the sentence on the entry
                          still permits this, and the next Quartermaster Step
                          may pay for it. Refused rather than clamped, with
                          the number, which is RR-12's rule and the one
                          `RecreationPanel` follows.
                        */}
                        {!offer.held && verdict.allowed && short > 0 && (
                          <span className="text-xs sm:text-[10px] text-theme-accent block font-bold">
                            The Strongbox holds {formatCost({
                              ducats: activeWarband?.treasuryDucats ?? 0,
                              glory: activeWarband?.gloryPoints ?? 0,
                            })} — short {formatCost(offer.short)}.
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-theme-border/60 flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-[10px] text-theme-muted">
                          Alchemical Formula
                        </span>
                        <button
                          disabled={!actionable}
                          onClick={() => toggleUnitSpecialUpgrade(warbandId, unitId, {
                            id: option.id,
                            name: option.name,
                            cost: offer.price.ducats,
                            price: offer.price,
                            /* The PATH, so `formulaeOf` still reads an Eye
                               Option as a Formula — FORM-1's reason. */
                            category: option.groupPath ?? option.group,
                          })}
                          className={`px-3 min-h-[44px] lg:min-h-0 lg:py-1 rounded text-xs sm:text-[11px] font-bold uppercase transition-colors ${
                            offer.held
                              ? 'bg-theme-elevated text-theme-text border border-theme-border hover:border-status-error'
                              : actionable
                                ? 'bg-theme-primary hover:bg-theme-primary-hover text-theme-base'
                                : 'bg-theme-elevated text-theme-muted cursor-not-allowed'
                          }`}
                        >
                          {offer.held ? 'Remove' : 'Infuse'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

    </Sheet>
  );
};
