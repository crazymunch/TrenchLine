/**
 * What changes between two rulesets.
 *
 * Switching ruleset must show a diff rather than silently mutating a saved
 * warband (docs/RULESET-MODEL.md §8). A player who moves from TrenchLine to
 * Latest GitHub and finds their Brazen Bull 15 Ducats cheaper with no
 * explanation has been given a wrong roster, not a choice.
 *
 * Pure functions over two datasets, so the reconciliation screen renders a diff
 * that was computed, not described.
 */
import type { Dataset, UnitProfile, WeaponProfile, Cost } from '@/types/catalogue';
import { nameKey } from './names';

export interface FieldChange {
  field: string;
  from: string;
  to: string;
}

export interface EntityDiff {
  kind: 'unit' | 'weapon';
  id: string;
  name: string;
  changes: FieldChange[];
}

export interface DatasetDiff {
  /** Entities present in both, with at least one differing field. */
  changed: EntityDiff[];
  /** Present in `to` but not `from`. */
  added: { kind: 'unit' | 'weapon'; name: string }[];
  /** Present in `from` but not `to` — the ones that lose a profile. */
  removed: { kind: 'unit' | 'weapon'; name: string }[];
}

const fmtCost = (c?: Cost) =>
  !c ? '—'
  : [c.ducats ? `${c.ducats} Ducats` : null, c.glory ? `${c.glory} Glory` : null]
      .filter(Boolean).join(' + ') || 'Free';

const fmtList = (xs?: string[]) => (xs?.length ? [...xs].sort().join(', ') : '—');

/**
 * Fields worth showing a player. Deliberately not a deep object diff: ids,
 * source files and provenance differ for reasons that are not rules changes,
 * and listing them would bury the four that matter.
 */
function unitFields(u: UnitProfile): Record<string, string> {
  return {
    Cost: fmtCost(u.cost),
    Movement: u.stats?.movement ?? '—',
    Ranged: u.stats?.ranged ?? '—',
    Melee: u.stats?.melee ?? '—',
    Armour: u.stats?.armour ?? '—',
    Base: u.stats?.base ?? '—',
    Keywords: fmtList(u.keywords),
    Abilities: fmtList(u.abilities?.map((a) => a.name)),
    'Recruitment limit': `${u.min ?? 0}–${u.max ?? '∞'}`,
  };
}

function weaponFields(w: WeaponProfile): Record<string, string> {
  return {
    Cost: fmtCost(w.cost),
    Range: w.range || '—',
    Type: w.type || '—',
    Keywords: fmtList(w.keywords),
  };
}

function compare<T>(
  kind: 'unit' | 'weapon',
  from: T[],
  to: T[],
  fields: (x: T) => Record<string, string>,
  idOf: (x: T) => string,
  nameOf: (x: T) => string
): DatasetDiff {
  const byId = (xs: T[]) => new Map(xs.map((x) => [idOf(x), x]));
  const a = byId(from);
  const b = byId(to);

  const changed: EntityDiff[] = [];
  for (const [id, before] of a) {
    const after = b.get(id);
    if (!after) continue;
    const fa = fields(before);
    const fb = fields(after);
    const changes = Object.keys(fa)
      .filter((k) => fa[k] !== fb[k])
      .map((k) => ({ field: k, from: fa[k], to: fb[k] }));
    if (changes.length) changed.push({ kind, id, name: nameOf(before), changes });
  }

  return {
    changed,
    added: [...b.keys()].filter((id) => !a.has(id))
      .map((id) => ({ kind, name: nameOf(b.get(id)!) })),
    removed: [...a.keys()].filter((id) => !b.has(id))
      .map((id) => ({ kind, name: nameOf(a.get(id)!) })),
  };
}

export function diffDatasets(from: Dataset, to: Dataset): DatasetDiff {
  const units = compare<UnitProfile>(
    'unit', from.units, to.units, unitFields, (u) => u.id, (u) => u.name);
  const weapons = compare<WeaponProfile>(
    'weapon', from.weapons, to.weapons, weaponFields, (w) => w.id, (w) => w.name);

  return {
    changed: [...units.changed, ...weapons.changed],
    added: [...units.added, ...weapons.added],
    removed: [...units.removed, ...weapons.removed],
  };
}

/**
 * The subset of a diff that actually touches one warband.
 *
 * The global diff is 15 entries; what a player needs first is the two that are
 * in *their* roster. Matched by name, as everywhere the saved model meets the
 * generated one.
 */
export function diffAffecting(diff: DatasetDiff, unitNames: string[]): EntityDiff[] {
  const key = nameKey;
  const wanted = new Set(unitNames.map(key));
  return diff.changed.filter((d) => {
    const k = key(d.name);
    return wanted.has(k) || [...wanted].some((w) => w.includes(k) || k.includes(w));
  });
}
