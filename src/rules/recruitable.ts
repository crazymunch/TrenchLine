/**
 * The generated dataset, in the shape the recruit path consumes.
 *
 * This is the last of the migration Phase 2 left half-done. Legality was moved
 * onto the generated dataset; **recruitment was not**. `useStore` built its unit
 * list as `[...BASE_UNITS, ...customUnits]` from `defaultRules.ts` — the
 * hand-written data the audit measured as 97% wrong on statlines, with 38% of
 * its wargear invented — so a finished roster was checked against sourced data
 * but *assembled* from unsourced data. The check fired after the mistake instead
 * of preventing it.
 *
 * Two models are in play and both are real:
 *
 *   `types/catalogue.ts`  what the pipeline emits. Two currencies, recruitment
 *                         limits, base sizes, movement types, per-model options.
 *   `types/rules.ts`      what the UI and the saved roster format speak.
 *
 * The second cannot express the first, which is why the pipeline exists. But
 * rewriting every component and every saved warband to the richer model is not
 * this change: this converts, so the *data* becomes sourced today and the model
 * migration stays a separate, reversible step. What the legacy shape cannot
 * carry — Glory costs, min/max, options — is dropped **here**, in one place,
 * with a note, rather than silently per call site.
 *
 * Nothing is invented. A field the dataset does not carry becomes undefined,
 * never a plausible default.
 */
import type {
  Dataset, UnitProfile as CatalogueUnit, WeaponProfile as CatalogueWeapon, Armoury, ArmouryRow,
} from '@/types/catalogue';
import type {
  UnitProfile, WeaponProfile, ArmourProfile, EquipmentItem, UnitCategory, Ability,
} from '@/types/rules';
import { nameKey } from './names';
import { sameFaction, variantById } from './variants';
import { variantArmoury } from './variantArmoury';
import { thirdPartyGate, thirdPartyVariantIds } from './thirdParty';
import { unobtainable, variantLocks } from './variantLocks';
import { variantLimits, variantForbids, variantReveals } from './validate';
import { applyVariant, visibleAbilities, labelledAbilities } from './applyVariant';
import { isGloryItem, offerableRows, type GloryItemPermission } from './gloryItems';

/**
 * The catalogue's roles, mapped onto the four the roster format has.
 *
 * `Leader` is not a role the catalogues carry — it is a property of one model in
 * a warband — so a unit is never *categorised* as one here. The store sets it
 * when the player nominates a leader.
 */
function categoryOf(unit: CatalogueUnit): UnitCategory {
  const roles = unit.roles.map((r) => r.toLowerCase());
  if (roles.includes('mercenary')) return 'Mercenary';
  if (roles.includes('elite')) return 'Elite';
  return 'Trooper';
}

/** Glory-priced entries: the legacy shape has one currency and it is Ducats. */
export interface DroppedDetail {
  name: string;
  /** What the legacy model could not carry. Surfaced, not silently lost. */
  glory: number;
}

export interface Recruitable {
  units: UnitProfile[];
  weapons: WeaponProfile[];
  armour: ArmourProfile[];
  equipment: EquipmentItem[];
  /**
   * Entries whose cost includes Glory. The legacy roster format has a single
   * Ducat cost, so their Glory component is not represented in `units` — the
   * builder shows this rather than pricing a 2-Glory Mercenary at 0.
   */
  gloryPriced: DroppedDetail[];
}

const abilityOf = (
  a: { id: string; name: string; description: string; variantOnly?: string[] },
): Ability => ({
  id: a.id,
  name: a.name,
  description: a.description,
  /* Carried so the recruit sheet can name what reveals it. */
  ...(a.variantOnly?.length ? { variantOnly: a.variantOnly } : {}),
});

/** A weapon's type, from its range, exactly as the Battlekit chapter defines it. */
function weaponType(range: string): WeaponProfile['type'] {
  const r = range.toLowerCase();
  if (r.includes('/') && r.includes('melee')) return 'Both';
  if (r.includes('melee')) return 'Melee';
  return 'Ranged';
}

/**
 * Everything a player can recruit or buy, for one faction.
 *
 * `factionId` scopes the armoury: wargear is priced per faction, so a shared
 * price list is not a thing this game has. Passing no faction returns units
 * only — a caller that wants gear has to say whose gear.
 */
export function recruitable(
  dataset: Dataset | null | undefined,
  factionId?: string,
  /**
   * The faction ids the app uses. Required, because the three sources spell a
   * faction three ways — `iron-sultanate` in the app, `Iron Sultanate` in the
   * catalogues, `cult-of-the-black-grail` from the rulebook parser — and the
   * recruit list filters on the app's spelling. Emitting the catalogue's would
   * leave `AddUnitModal` matching nothing and showing an empty roster, which is
   * exactly what it did the first time this was wired up.
   */
  appFactionIds: string[] = [],
  /**
   * The Warband Variant this list is being built as, if one is declared.
   *
   * Without it the recruit sheet showed the faction's STANDARD list to every
   * Warband. A Variant that renames an entry — the House of Wisdom's Janissary
   * is a Fāris, a Knights of Saint Lazarus' Lazarist Castigator is a
   * Leper-Knight — offered the name the player is not playing with, and one
   * that raises a limit still offered the base one. The engine has known all
   * of this since Phase 2; only the recruit list was never told.
   */
  variantId?: string,
  /**
   * What this Warband may buy from its Glory Item Table (p.125, RR-14).
   *
   * `undefined` means no Warband is asking — the Codex, a reference sheet, a
   * price list — and the whole table is listed, because those views describe
   * what the game contains rather than what one roster may have today.
   *
   * A Warband IS asking whenever the builder hydrates the catalogs, and there
   * the permission decides: no Exploration discovery, no Glory Items on the
   * shelf. See `rules/gloryItems.ts`, and note that the gate keys on the row's
   * SECTION and never on its currency — a Troop Flag costs Glory and needs no
   * discovery.
   */
  gloryItems?: GloryItemPermission,
): Recruitable {
  const empty: Recruitable = { units: [], weapons: [], armour: [], equipment: [], gloryPriced: [] };
  if (!dataset) return empty;

  const gloryPriced: DroppedDetail[] = [];

  /** A catalogue faction name -> the app's id for it, or the name unchanged. */
  const appId = (id: string) =>
    appFactionIds.find((f) => sameFaction(f, id)) ?? id;

  /*
    The factions of one alignment, for a host rule the source states that way.

    The Sin Eater's hosts are "Fallen Warbands", not a list. Resolving it here
    rather than writing the Fallen factions into the layer means a Fallen
    Warband added later is included by the same sentence that included the
    others — which is the failure the hand-written lists had: the Heretic
    Naval Raiders arrived and no list knew about them.

    Each faction's `alignment` is read from the book's own "… are Faithful." /
    "… are Fallen." sentence; see `parseFactionRules`. `rules-build` refuses to
    emit a unit whose alignment matches no faction, so this cannot quietly
    resolve to nobody.
  */
  const alignedFactions = (want: string) =>
    (dataset.factions ?? [])
      .filter((f) => f.alignment === want)
      .map((f) => appId(f.id ?? f.name));

  /*
    The entry ids of the third-party Warband Variants, so a unit's own reveal
    condition can be joined to them. The gate is split across the data: the
    condition sits on the unit, the thing it names sits in a group elsewhere in
    the catalogue.
  */
  const tpVariants = thirdPartyVariantIds(dataset);

  /*
    Models that exist only inside one Warband Variant — the Technomancer in the
    Cadaver Corps, the Matagot Hag in The Great Hunger. Every one of them was
    offered to every Warband of the faction.
  */
  const variant = variantById(dataset, variantId);
  /*
    `hidden` decides whether an entry is on the list at all, which is a question
    about the LIST; everything a Variant says about the entry ITSELF — its name,
    its statline, its abilities — is applied by `applyVariant` further down.
  */
  const forbidden = variantForbids(variant);
  const revealed = variantReveals(variant);

  const locks = variantLocks(dataset);
  /*
    Entries the catalogue gates and that no choice a Warband can make reveals.
    Off the muster list entirely — see `unobtainable`. The rulebook says how
    each is really obtained: the `Book of Golems` Exploration result adds a
    Homunculus, a Trench Dog is a Glory Item bought for 1-3 ☼.
  */
  const offList = unobtainable(dataset);
  const variantsById = new Map(
    (dataset.variants ?? []).filter((v) => v.entryId).map((v) => [v.entryId as string, v]));

  /*
    Secondary profiles are not recruits. A Martyr Penitent is a Leper-Pilgrim
    resurrected for a stated cost, a Heretic Raider Legionnaire is an upgraded
    Raider — both are reached by paying for a model you already have, under a
    condition this model cannot express. Offering them here would let a player
    field a warband of Martyr Penitents at the Pilgrim's price. They stay in
    the dataset for the Codex; see `UnitProfile.secondaryProfile`.
  */
  const units: UnitProfile[] = dataset.units
    .filter((u) => !u.secondaryProfile)
    .filter((u) => !offList.has(u.entryId || u.id))
    /*
      An entry the Variant bans is not on this list. `Sacred Code` forbids the
      Lazarist Communicant; the Drowned Choir forbids its own faction's Heretic
      Captain. Revealed wins over forbidden, which is how a Variant re-opens an
      entry another one closes.
    */
    .filter((u) => !forbidden.has(u.entryId || u.id) || revealed.has(u.entryId || u.id))
    /*
      The entry as this Variant fields it: renamed, restatted, its abilities
      swapped. One applier for the whole op vocabulary, rather than a reader per
      field — see `applyVariant`. Everything below reads the Variant's profile.
    */
    .map((base) => applyVariant(base, variant))
    .map((u) => {
    if (u.cost.glory) gloryPriced.push({ name: u.name, glory: u.cost.glory });
    const gate = thirdPartyGate(u, tpVariants);
    return {
      id: u.entryId || u.id,
      /*
        Already the Variant's name, from `applyVariant` above.

        This is what "in its place" means: the Leper-Knight is not a new row
        beside the Lazarist Castigator, it IS that row, because the book says
        the Leper-Knights "use the Lazarist Castigator Warband entry". A player
        who cannot take a Castigator and must take 1-3 Leper-Knights sees one
        entry, named the thing they are allowed to have — with the +2 Melee and
        the Knightly Code that come with the name.
      */
      name: u.name,
      factionId: appId(u.factionId),
      category: categoryOf(u),
      baseCost: u.cost.ducats,
      gloryCost: u.cost.glory || undefined,
      stats: {
        movement: u.stats.movement,
        // Already split by the pipeline; carried through so the roster card
        // can show the distance and the movement type as two lines.
        movementInches: u.stats.movementInches ?? undefined,
        movementType: u.stats.movementType ?? undefined,
        ranged: u.stats.ranged,
        melee: u.stats.melee,
        armour: u.stats.armour,
        keywords: u.keywords,
        baseSize: u.stats.base,
      },
      // The catalogue's recruitment limit. `defaultRules.ts` had none at all —
      // 69 of the 89 units carry one, and none of them was enforced before.
      // The Variant's ceiling where it sets one — 1 Lazarist Castigator becomes
      // 3 Leper-Knights — and the entry's own otherwise.
      maxCount: variantLimits(u, variant).max ?? undefined,
      /*
        Who may lead. Two sources say it and both are the model's own entry.

        The catalogues state it as a `Leader` role — nine entries carry one, at
        least one per faction. The books state it as a LEADER Keyword, which is
        how the Carcass Front lists mark the Lazarist Prophet and the Heretic
        Captain; those entries have no role at all, so reading only the role
        left both new factions with nobody eligible to lead. Only the Yüzbaşı
        Captain carries both, which is what makes the two independent.

        Never derived from cost, rarity or a max of 1.
      */
      canLead: u.roles.some((r) => r.toLowerCase() === 'leader')
        || u.keywords.some((k) => k.trim().toUpperCase() === 'LEADER')
        || undefined,
      /*
        Whether the model is ELITE. Read the same way as `canLead`, and for the
        same reason: two sources say it and neither says it everywhere.

        `category` cannot answer this, and the difference is not cosmetic. The
        Trauma Step turns on this one word — "Troops are any models in your
        Warband that do not have the ELITE Keyword", who roll one D6 and die on
        a 1-2, against ELITE models who roll D66 on the Trauma Table. But
        `categoryOf` above tests Mercenary before Elite, so the Witchburner —
        filed `Mercenary/Elite`, and one of the eight entries that carries the
        literal keyword — categorises as `Mercenary`. Keying the Trauma Step on
        the category would have taken an ELITE model off the injury table and
        offered it a roll it can die on.

        Both sources are read because 35 entries carry the Elite role and only 8
        print the keyword; `rules-build.mjs` fails the build if the two ever
        disagree in the other direction.

        Carried into the roster snapshot deliberately, rather than looked up
        from the dataset at Trauma time: `baseProfileId` on a saved unit is not
        reliably a dataset id (it may be a hand-written slug, or a name-derived
        fallback the importer invented), so a lookup would fail silently on
        exactly the rosters that have been played the longest.
      */
      elite: u.roles.some((r) => r.toLowerCase() === 'elite')
        || u.keywords.some((k) => k.trim().toUpperCase() === 'ELITE')
        || undefined,
      /*
        The "Third Party" profile is a marker, not a rule the model has — its
        text is the catalogue's disclaimer about the entry, which the builder
        shows in its own right as `thirdPartyNotice`. Leaving it in the ability
        list rendered it as a special rule the model uses in play, and printed
        it twice.
      */
      battlekitNote: u.battlekitNote,
      /* What this Mercenary may buy despite the glossary's blanket refusal.
         See `UnitProfile.mercenaryMayBuy` and `equipGate.ts`. */
      mercenaryMayBuy: u.mercenaryMayBuy,
      /*
        The abilities this entry actually prints (DA-01).

        `u.abilities` is every Ability profile on the entry, hidden ones
        included, and copying all of them here is what put four Varangian Guard
        rules on a standard New Antioch Shocktrooper's recruit card. The recruit
        list shows an entry before anything has been chosen on it, so the model
        has no selections yet — but the Warband's Variant is declared, and a
        Variant is what reveals almost all of them.

        `rosterSelections: []` because the app records no Chosen Sin; see
        `VisibilityContext`. The Codex shows those with their label instead.
      */
      innateAbilities: visibleAbilities(u, { dataset, variant, selections: [], rosterSelections: [] })
        .filter((a) => a.name.trim().toLowerCase() !== 'third party')
        .map(abilityOf),
      /*
        And what this entry would gain under another Variant, labelled with
        which. Shown on the recruit sheet, under the abilities the model does
        have — a player picking a Shocktrooper is owed the fact that the
        Remnants of Byzantium turns it into a Varangian Guard with four more
        rules, and the old behaviour of simply printing all four as its own was
        not that fact, it was a wrong statline.
      */
      variantAbilities: (() => {
        const shown = new Set(
          visibleAbilities(u, { dataset, variant, selections: [], rosterSelections: [] })
            .map((a) => a.name.trim().toLowerCase()));
        const labelled = labelledAbilities(u, dataset)
          .filter((a) => a.variantOnly?.length)
          .filter((a) => !shown.has(a.name.trim().toLowerCase()))
          .map(abilityOf);
        return labelled.length ? labelled : undefined;
      })(),
      /*
        Which Warbands may hire this Mercenary.

        This used to hand every Mercenary the full faction list, on the
        reasoning that "the catalogues put them in their own faction rather
        than listing hosts, so the legality engine decides". Both halves were
        wrong. The catalogues DO carry hosts (in `modifiers`, as `hidden`
        conditions), and the legality engine runs *after* a unit is on the
        roster — it cannot stop the recruit list offering one. The result was a
        Court of the Seven-Headed Serpent Warband being offered the Mendelist
        Ammo Monk and the Observer, which are NEW ANTIOCH and PILGRIM only.

        `u.allowedFactions` comes from the Trench Dispatch's own recruitment
        sentences, quoted per op in `dispatch-01.layer.json`. Where it is
        absent the entry is unrestricted, which is a real answer for some —
        the Scripture Guardian is hired by any Warband — and where the source
        does not say, the old permissive behaviour stands rather than a
        guessed-at shorter list, because hiding a hire a Warband is entitled to
        is the worse error.
      */
      /*
        The catalogue's own gate is read first, because it is the more precise
        source: the Disciple of St. Roch's hosts are stated in the same
        `set hidden false` modifier that marks it third-party, and the Trench
        Dispatch — which is where every other Mercenary's hosts come from —
        never mentions it. Without this it fell through to the permissive
        default and was offered to all six Warbands.
      */
      allowedFactions: categoryOf(u) === 'Mercenary'
        ? (gate.hosts.length
            ? gate.hosts.map(appId)
            : u.allowedFactions ? u.allowedFactions.map(appId)
            /* Stated by alignment rather than by name — see `alignedFactions`. */
            : u.allowedAlignment ? alignedFactions(u.allowedAlignment)
            : appFactionIds)
        : undefined,
      thirdParty: gate.thirdParty || undefined,
      requiresVariant: locks.get(u.entryId || u.id)
        ? [...locks.get(u.entryId || u.id)!.variantIds]
            .map((vid) => variantsById.get(vid))
            .filter((v): v is NonNullable<typeof v> => !!v)
            .map((v) => ({ id: v.id, name: v.name }))
        : undefined,
      thirdPartyNotice: gate.notice,
      /*
        Gear the catalogue forces onto the model, carried through so the app
        stops selling a Combat Medic the Gas Mask it is already wearing.

        Not the same thing as a default loadout, which is still deliberately
        absent: `defaultRules.ts` invented starting loadouts, and that is where
        a chunk of its 38% invented wargear came from. This is 18 models whose
        entry carries a `min="1"` link the parser used to drop — kit the player
        can neither remove nor buy twice. See `rules/battlekit.ts`.
      */
      battlekit: u.battlekit?.length ? u.battlekit : undefined,
      defaultWeapons: undefined,
      defaultArmour: undefined,
    };
  });

  // Gear is priced by the faction's Armoury Table, so it is scoped to one.
  const armoury: Armoury | undefined = factionId
    ? (dataset.armouries ?? []).find((a) =>
        nameKey(a.factionId) === nameKey(factionId) || nameKey(a.faction) === nameKey(factionId))
    : undefined;

  if (!armoury) return { ...empty, units, gloryPriced };

  const profiles = new Map<string, CatalogueWeapon>();
  for (const w of dataset.weapons) {
    const k = nameKey(w.name);
    if (!profiles.has(k)) profiles.set(k, w);
  }
  const chapter = new Map(
    (dataset.battlekit ?? []).map((b) => [nameKey(b.name), b] as const));

  /*
    Which source describes an item, when more than one does.

    The catalogue's own `lore` wins over the books' chapters, because it is the
    more specific source: two factions print a `Holy Icon Armour` and they are
    not the same item — Warbands of Trench Crusade gives the Trench Pilgrims'
    as "scripture scrolls written with the blood of saints", the Carcass Front
    book gives the Procession's as "scripture text within decorative
    scrollwork". Keyed on name alone, the chapters would show a Procession
    player the other faction's armour.

    `||` rather than `??` on purpose: the catalogue stores an empty string for
    an item it does not describe, and empty is not "absent" to `??`. Core
    wargear has no catalogue lore, so the rulebook still wins for it — there is
    a test that keeps it that way.
  */

  const weapons: WeaponProfile[] = [];
  const armour: ArmourProfile[] = [];
  const equipment: EquipmentItem[] = [];

  /*
    The shelves this Warband may buy from: its own faction's table, and then
    any foreign Armoury a Variant rule opens to it.

    The House of Wisdom's *Weapon Collections* is the case the owner asked
    for — Warbands of Trench Crusade L5303-L5308:

      "When you create your starting Warband, you can purchase 1 piece of
       Battlekit from the New Antioch Armoury, and 1 piece of Battlekit from
       the Trench Pilgrims Armoury. Any stipulations that apply to it are
       followed … You can repurchase the Battlekit later during the campaign
       if it is lost for any reason."

    `variantArmoury` has read these grants since RULES-2 and `validate`'s
    `checkVariantGrants` has counted them since — but nothing ever OFFERED
    them. The rule was enforced against a purchase the builder gave the player
    no way to make: the equip sheet is built from one armoury, so a House of
    Wisdom player could be told they had exceeded an allowance they could not
    spend in the first place.

    "Battlekit", not "weapons". The book's own word for the whole table — its
    heading is "…can have the following Battlekit" and its sections are Ranged
    Weapons, Melee Weapons, Grenades, Shields, Armour and Equipment — so
    Machine Armour is as valid a pick as a Machine Gun. The BattleScribe
    catalogue models Weapon Collections as a hand-picked subset with no Armour
    group at all (Iron Sultanate.cat L5883-L6473), and no New Antioch melee
    weapons or shields either; precedence puts the rulebook above the
    catalogue, so the whole table is offered.

    A row the Warband's own faction already stocks is NOT repeated from a
    foreign shelf. It would be a second offer of the same item at a different
    price, and taking it would spend an allowance for nothing —
    `checkVariantGrants` makes the same exclusion ("stocked at home: not
    spending anybody's allowance"), so the offer and the count agree.
  */
  /* The Glory Item gate, applied to every shelf: a foreign Armoury opened by a
     Variant grant is still an Armoury, and its Glory Items are still Glory
     Items. `offerableRows` is a no-op on a table that holds none. */
  const offerable = (rows: readonly ArmouryRow[]) =>
    (gloryItems ? offerableRows(rows, gloryItems) : [...rows]);

  const shelves: { row: ArmouryRow; from: Armoury; grantedBy?: string }[] =
    offerable(armoury.rows).map((row) => ({ row, from: armoury }));

  const stockedAtHome = new Set(armoury.rows.map((r) => nameKey(r.name)));
  const known = (dataset.armouries ?? []).map((a) => a.factionId);
  for (const grant of variantArmoury(variant, factionId ?? '', known).grants) {
    const foreign = (dataset.armouries ?? []).find((a) =>
      nameKey(a.factionId) === nameKey(grant.factionId));
    if (!foreign) continue;
    for (const row of offerable(foreign.rows)) {
      if (stockedAtHome.has(nameKey(row.name))) continue;
      shelves.push({ row, from: foreign, grantedBy: grant.rule });
    }
  }

  for (const { row, from, grantedBy } of shelves) {
    const k = nameKey(row.name);
    const b = chapter.get(k);
    const p = profiles.get(k);
    if (row.cost.glory) gloryPriced.push({ name: row.name, glory: row.cost.glory });

    /*
      A granted offer is keyed by the Armoury it came from, because the same
      item can be on offer from two of them at different prices. The House of
      Wisdom can buy Martyrdom Pills from New Antioch for 1 Glory or from the
      Trench Pilgrims for 20 Ducats (Warbands L1357 and L2812), and four of
      the eight names both granted Armouries carry differ in price or
      stipulation. One row would make the app pick which, so there are two.

      Only granted rows are keyed this way. An item a Warband stocks in its
      own right keeps the id it has always had, so nothing already saved to a
      roster has to be migrated. Both forms are resolved by NAME everywhere
      that matters — `fromWarband` for the validator, `rosterRos` for the
      export — so the id is a handle for the builder, not an identity.
    */
    const gloryItem = isGloryItem(row);
    /*
      A Glory Item the catalogues cannot name needs an id of its own, because a
      faction can stock the same name on both of its tables and the book says so
      outright: the Court's footnote 3 reads "A Warband can have up to 3
      Restraining Muzzles purchased with ☼ **in addition to** up to 3
      Restraining Muzzles purchased with 👑". Two real offers at two prices, and
      without this they shared the `<faction>-<name>` id and one shadowed the
      other in the builder's lists.
    */
    const id = grantedBy
      ? `granted:${from.factionId}:${row.weaponId || k}`
      : (row.weaponId
        || `${from.factionId}-${gloryItem ? 'glory-' : ''}${k}`);
    /*
      What the item IS, which decides which list it joins.

      `Glory Items` is a TABLE, not a kind. Filing the row's section as the kind
      sent all 54 of them through to `weapons.push` — neither the Armour branch
      nor the Equipment branch matches — so Ducal Winged Armour and Damascus
      Armour landed in `equippedWeapons` and the armour slot never saw them.

      The gate does not need it: `offerableRows` above has already decided,
      against the row's own section, whether this row is on the shelf at all. So
      the kind is read the way every other row's is, and `gloryItem` below
      carries the label the equip sheet shows.

      Three sources, in order of how much they know:
        the Battlekit chapter's section  — the catalogue's own account
        the resolved profile's kind      — Armour, or a weapon with a Range
        Equipment                        — the row states no kind at all
    */
    const kindFromProfile = (() => {
      if (!p) return undefined;
      if (/^(armour|shield)/i.test(p.type ?? '')) return 'Armour';
      /* A weapon is what has somewhere to reach: a Range of `Melee` or a
         distance. The Battlekit chapter types these `1-handed`, `2-handed` and
         `GRENADE`, and an item with none of that is gear. */
      const range = (p.range ?? '').trim();
      if (range && range !== '-') return 'Ranged Weapons';
      if (/handed|grenade/i.test(p.type ?? '')) return 'Melee Weapons';
      return undefined;
    })();
    const section = gloryItem
      ? (b?.section ?? kindFromProfile ?? 'Equipment')
      : (b?.section ?? row.section);

    if (section === 'Armour' || section === 'Shields') {
      armour.push({
        id, name: row.name, cost: row.cost.ducats,
        gloryCost: row.cost.glory || undefined,
        // The published Injury Modifier, from the keyword line. Absent where
        // neither source states one — never defaulted to a plausible -1.
        modifier: (b?.keywords ?? p?.keywords ?? []).find((kw) => /INJURY MODIFIER/i.test(kw)),
        keywords: b?.keywords ?? p?.keywords ?? [],
        description: p?.lore || b?.description,
        category: section,
        factionId: appId(from.factionId),
        grantedBy,
        ...(gloryItem ? { gloryItem: true } : {}),
      });
      continue;
    }

    if (section === 'Equipment') {
      equipment.push({
        id, name: row.name, cost: row.cost.ducats,
        gloryCost: row.cost.glory || undefined,
        /*
          `effect` is required by the legacy shape. The rules text where there
          is one, the keyword line otherwise, and an empty string rather than
          an invented sentence when the sources carry neither.

          Both sources are consulted, and that second one is the fix. `b` is
          the rulebook's Battlekit chapter; an item published in a supplement
          has no entry there and carries its rules on the catalogue profile `p`
          instead. Reading only `b`, every piece of Carcass Front wargear
          rendered with its name, cost and keywords and a blank where the rule
          should be — the Bells of Warding lost "Gathering Call: Add +1 DICE to
          Risky Success Rolls for friendly models that are taking a Dash ACTION
          and are within 4” of one or more models with Bells of Warding or a
          Musical Instrument", which is the whole of what the item does.
        */
        effect: b?.rules.join(' ') || p?.rules || b?.note
          || (b?.keywords ?? p?.keywords ?? []).join(', ') || '',
        keywords: b?.keywords ?? p?.keywords ?? [],
        description: p?.lore || b?.description,
        category: section,
        factionId: appId(from.factionId),
        grantedBy,
        ...(gloryItem ? { gloryItem: true } : {}),
      });
      continue;
    }

    const range = b?.range ?? p?.range ?? '-';
    weapons.push({
      id, name: row.name, cost: row.cost.ducats,
      gloryCost: row.cost.glory || undefined,
      type: weaponType(range),
      range,
      // The legacy shape wants a single "modifiers" string. The keywords *are*
      // the modifiers in this game, so this is the dice-affecting subset rather
      // than a summary someone wrote.
      modifiers: (b?.keywords ?? p?.keywords ?? [])
        .filter((kw) => /DICE|INJURY|ARMOUR PIERCING/i.test(kw)).join(', ') || '-',
      keywords: b?.keywords ?? p?.keywords ?? [],
      description: p?.lore || b?.description,
      hands: b?.type === '2-Handed' ? 2 : b?.type === '1-Handed' ? 1 : undefined,
      category: section,
      factionId: appId(from.factionId),
      grantedBy,
      ...(gloryItem ? { gloryItem: true } : {}),
      // The armoury row's own restrictions — "ELITE only", "Limit: 2". These are
      // legality, and `wargear-not-stocked` reads them from the armoury directly.
    });
  }

  return { units, weapons, armour, equipment, gloryPriced };
}
