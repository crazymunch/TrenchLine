/**
 * What a BattleScribe roster calls each of these things.
 *
 * A `.ros` selection is not identified by a catalogue entry id. It is
 * identified by the chain of `entryLink` ids traversed from the force root,
 * with the target entry's own id appended:
 *
 *   7c17-5f75-6fd9-73cf
 *     Jabirean Alchemist — a `selectionEntry` written in the catalogue
 *
 *   85cf-…::246b-…::c39d-…::fed6-…::46cb-…
 *     that Alchemist's Automatic Rifle — four `entryLink` ids then the shared
 *     entry, which lives in `Ranged Weapons.cat` and not in the Sultanate
 *     catalogue at all
 *
 * So one weapon has many identities, and which one it has depends on the model
 * carrying it. The dataset's flat `weapons` list cannot express that, which is
 * why this layer exists — see `docs/NEWRECRUIT-SPIKE.md` for the measurement
 * and `docs/ROSTER-PATHS.md` for the shape.
 *
 * Loaded on demand, never imported statically: the layer is ~1.2 MB per
 * ruleset and only an exporter or an importer reads it.
 */

/** A path, stored as indices into `segments`. */
export type EncodedPath = number[];

export interface PathParent {
  path: EncodedPath;
  name: string;
  type: string;
}

export interface Placement {
  catalogueId: string;
  path: EncodedPath;
  /**
   * The selections a roster nests this one inside, outermost first.
   *
   * `Mamluk Faris` is a `unit` entry whose only child is a link to the `model`
   * carrying the profile, and a real export writes both. A generator that
   * emits only the model produces a file no importer reads back the same way.
   */
  parents: PathParent[];
  /** Item name -> every path it is reachable by under THIS placement. */
  carries: Record<string, EncodedPath[]>;
}

export interface UnitPaths {
  entryId: string;
  name: string;
  factionId: string;
  placements: Placement[];
}

export interface ContainerPaths {
  name: string;
  type: string;
  catalogueId: string;
  path: EncodedPath;
  carries: Record<string, EncodedPath[]>;
}

export interface VariantPath {
  id: string;
  entryId: string;
  name: string;
  catalogueId: string;
  path: EncodedPath;
}

export interface UnmappedEntry {
  kind: 'unit' | 'variant';
  entryId: string;
  name: string;
  factionId?: string;
  why: string;
}

export interface RosterPathLayer {
  version: number;
  base: string;
  system: { id: string; name: string; revision: number; battleScribeVersion: string };
  catalogues: {
    id: string; name: string; revision: number;
    gameSystemId: string; gameSystemRevision: number;
  }[];
  segments: string[];
  units: UnitPaths[];
  containers: ContainerPaths[];
  variants: VariantPath[];
  unmapped: UnmappedEntry[];
}

/** Loaded once per ruleset per process. */
const cache = new Map<string, RosterPathLayer>();

/**
 * The layer for one ruleset, or `null` if that ruleset has none.
 *
 * The switch is deliberate, for the same reason as `app/api/dataset/route.ts`:
 * a template literal would let a caller's string reach the module resolver.
 */
export async function loadRosterPaths(rulesetId: string): Promise<RosterPathLayer | null> {
  const hit = cache.get(rulesetId);
  if (hit) return hit;

  const mod =
    rulesetId === 'trenchline' ? await import('@/data/generated/trenchline.rosterpaths.json')
    : rulesetId === 'github-latest' ? await import('@/data/generated/github-latest.rosterpaths.json')
    : null;
  if (!mod) return null;

  const layer = ((mod as { default?: unknown }).default ?? mod) as RosterPathLayer;
  cache.set(rulesetId, layer);
  return layer;
}

/** `[85, 246, 39]` -> `85cf-…::246b-…::c39d-…`. Throws on an index the layer has no segment for. */
export function decodePath(layer: RosterPathLayer, path: EncodedPath): string {
  return path.map((i) => {
    const seg = layer.segments[i];
    if (seg === undefined) {
      // A path that cannot be decoded is a corrupt layer, not a missing item.
      throw new Error(
        `rosterPaths: segment ${i} is not in this layer (${layer.segments.length} segments). `
        + 'The generated file and the code reading it have come apart — rerun `npm run rules:build`.'
      );
    }
    return seg;
  }).join('::');
}

export function unitPaths(layer: RosterPathLayer, entryId: string): UnitPaths | undefined {
  return layer.units.find((u) => u.entryId === entryId);
}

export function variantPath(layer: RosterPathLayer, variantId: string): VariantPath | undefined {
  return layer.variants.find((v) => v.id === variantId);
}

/**
 * Every path the named item is reachable by under one placement.
 *
 * More than one is normal and is the finding, not a fault: the same Trench
 * Knife can be taken from two different groups under the same model, and those
 * are two different roster identities. TrenchLine does not record which group
 * a player took an item from, so a caller has to decide — and it should decide
 * visibly, which is why this hands back the whole list rather than the first.
 */
export function itemPaths(
  layer: RosterPathLayer, placement: Placement, itemName: string
): string[] {
  return (placement.carries[itemName] ?? []).map((p) => decodePath(layer, p));
}

/** One model as a roster would record it, and whatever could not be resolved. */
export interface ModelIdentity {
  /** The model's own selection path. */
  path: string;
  /** The selections it is nested inside, outermost first. */
  parents: { path: string; name: string; type: string }[];
  catalogueId: string;
  items: { name: string; paths: string[] }[];
  /** Items this placement has no identity for. Never guessed at. */
  missing: string[];
}

/**
 * Resolve one model and its gear against the layer.
 *
 * Returns `null` when the model itself has no identity — a Carcass Front model,
 * or a catalogue that moved under it. A caller must treat that as fatal rather
 * than writing a roster with a hole in it: `docs/EXPORT-CODEX-REVIEW.md` E4
 * makes an unmapped model a fatal error, not a warning.
 *
 * Where a model has several placements — six Warband Variants place the
 * Scripture Guardian — the one resolving the most of the model's own gear is
 * chosen, and ties keep the first. That is a choice about which of several
 * true identities to write, not a guess at an unknown one.
 */
export function modelIdentity(
  layer: RosterPathLayer, entryId: string, itemNames: string[]
): ModelIdentity | null {
  const unit = unitPaths(layer, entryId);
  if (!unit || !unit.placements.length) return null;

  const scored = unit.placements.map((placement) => {
    const items = itemNames.map((name) => ({ name, paths: itemPaths(layer, placement, name) }));
    return {
      placement,
      items,
      resolved: items.filter((i) => i.paths.length).length,
    };
  });
  const best = scored.reduce((a, b) => (b.resolved > a.resolved ? b : a));

  return {
    path: decodePath(layer, best.placement.path),
    parents: best.placement.parents.map((p) => ({
      path: decodePath(layer, p.path), name: p.name, type: p.type,
    })),
    catalogueId: best.placement.catalogueId,
    items: best.items.filter((i) => i.paths.length),
    missing: best.items.filter((i) => !i.paths.length).map((i) => i.name),
  };
}

export interface ExportGap {
  kind: 'model' | 'item';
  /** The model the gap is on, by the name the roster shows. */
  model: string;
  name: string;
  why: string;
}

/**
 * What would stop this warband being written as a `.ros`, before anything is
 * written.
 *
 * The front half of E4's compatibility report. Every gap here is fatal by that
 * rule — a roster missing a model, a weapon or an upgrade is not a roster of
 * this warband — so a caller should show them and offer the TrenchLine file
 * instead, never write a partial file.
 */
export function exportGaps(
  layer: RosterPathLayer,
  models: { name: string; entryId: string; items: string[] }[]
): ExportGap[] {
  const gaps: ExportGap[] = [];
  for (const m of models) {
    const id = modelIdentity(layer, m.entryId, m.items);
    if (!id) {
      const why = layer.unmapped.find((u) => u.entryId === m.entryId)?.why
        ?? 'no BattleScribe identity in this ruleset';
      gaps.push({ kind: 'model', model: m.name, name: m.name, why });
      continue;
    }
    for (const name of id.missing) {
      gaps.push({
        kind: 'item', model: m.name, name,
        why: 'no path under this model — the catalogues do not offer it here',
      });
    }
  }
  return gaps;
}
