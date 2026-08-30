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
  Dataset, UnitProfile as CatalogueUnit, WeaponProfile as CatalogueWeapon, Armoury,
} from '@/types/catalogue';
import type {
  UnitProfile, WeaponProfile, ArmourProfile, EquipmentItem, UnitCategory, Ability,
} from '@/types/rules';
import { nameKey } from './names';
import { sameFaction } from './variants';

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

const abilityOf = (a: { id: string; name: string; description: string }): Ability => ({
  id: a.id, name: a.name, description: a.description,
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
  appFactionIds: string[] = []
): Recruitable {
  const empty: Recruitable = { units: [], weapons: [], armour: [], equipment: [], gloryPriced: [] };
  if (!dataset) return empty;

  const gloryPriced: DroppedDetail[] = [];

  /** A catalogue faction name -> the app's id for it, or the name unchanged. */
  const appId = (id: string) =>
    appFactionIds.find((f) => sameFaction(f, id)) ?? id;

  const units: UnitProfile[] = dataset.units.map((u) => {
    if (u.cost.glory) gloryPriced.push({ name: u.name, glory: u.cost.glory });
    return {
      id: u.entryId || u.id,
      name: u.name,
      factionId: appId(u.factionId),
      category: categoryOf(u),
      baseCost: u.cost.ducats,
      gloryCost: u.cost.glory || undefined,
      stats: {
        movement: u.stats.movement,
        ranged: u.stats.ranged,
        melee: u.stats.melee,
        armour: u.stats.armour,
        keywords: u.keywords,
        baseSize: u.stats.base,
      },
      // The catalogue's recruitment limit. `defaultRules.ts` had none at all —
      // 69 of the 89 units carry one, and none of them was enforced before.
      maxCount: u.max ?? undefined,
      innateAbilities: u.abilities.map(abilityOf),
      // Mercenaries are hired by anyone, and the roster filter asks an entry
      // which factions may take it. The catalogues put them in their own
      // faction rather than listing hosts, so every faction is allowed and the
      // *legality* engine decides — inventing a shorter list here would silently
      // hide hires a warband is entitled to.
      allowedFactions: categoryOf(u) === 'Mercenary' ? appFactionIds : undefined,
      // Deliberately absent: the catalogues do not give models default gear.
      // `defaultRules.ts` invented starting loadouts, which is where a chunk of
      // its 38% invented wargear came from.
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

  const weapons: WeaponProfile[] = [];
  const armour: ArmourProfile[] = [];
  const equipment: EquipmentItem[] = [];

  for (const row of armoury.rows) {
    const k = nameKey(row.name);
    const b = chapter.get(k);
    const p = profiles.get(k);
    if (row.cost.glory) gloryPriced.push({ name: row.name, glory: row.cost.glory });

    const id = row.weaponId || `${armoury.factionId}-${k}`;
    const section = b?.section ?? row.section;

    if (section === 'Armour' || section === 'Shields') {
      armour.push({
        id, name: row.name, cost: row.cost.ducats,
        gloryCost: row.cost.glory || undefined,
        // The published Injury Modifier, from the keyword line. Absent where
        // neither source states one — never defaulted to a plausible -1.
        modifier: (b?.keywords ?? p?.keywords ?? []).find((kw) => /INJURY MODIFIER/i.test(kw)),
        keywords: b?.keywords ?? p?.keywords ?? [],
        description: b?.description,
        category: section,
        factionId: appId(armoury.factionId),
      });
      continue;
    }

    if (section === 'Equipment') {
      equipment.push({
        id, name: row.name, cost: row.cost.ducats,
        gloryCost: row.cost.glory || undefined,
        // `effect` is required by the legacy shape. The rules text where there
        // is one, the keyword line otherwise, and an empty string rather than
        // an invented sentence when the sources carry neither.
        effect: b?.rules.join(' ') || b?.note || (b?.keywords ?? []).join(', ') || '',
        keywords: b?.keywords ?? p?.keywords ?? [],
        description: b?.description,
        category: section,
        factionId: appId(armoury.factionId),
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
      description: b?.description,
      hands: b?.type === '2-Handed' ? 2 : b?.type === '1-Handed' ? 1 : undefined,
      category: section,
      factionId: appId(armoury.factionId),
      // The armoury row's own restrictions — "ELITE only", "Limit: 2". These are
      // legality, and `wargear-not-stocked` reads them from the armoury directly.
    });
  }

  return { units, weapons, armour, equipment, gloryPriced };
}
