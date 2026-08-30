/**
 * BattleScribe .cat/.gst -> normalised entities.
 *
 * The catalogues are the base layer of every ruleset (docs/RULESET-MODEL.md §2).
 * They are the only machine-readable source, and they carry the three things
 * the hand-written data could not express: Glory Points as a separate cost,
 * recruitment limits as constraints, and base sizes.
 *
 * Shape notes, from surveying the files:
 *   - profile typeName is one of Unit | Weapon | Battlekit | Ability
 *   - Unit profiles carry Movement / Ranged / Melee / Armour / Base
 *   - Weapon and Battlekit carry Type / Range / Keywords / Rules
 *   - entryLink@targetId points into sharedSelectionEntries, so entries must be
 *     resolved through an id index rather than read positionally
 *   - categoryLink gives both keywords (HEAVY, FEAR) and roles (Elite, Troop)
 *   - constraint gives min/max scoped to roster or parent
 */
import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // Keep single children as arrays where we always want to iterate.
  isArray: (name) =>
    ['selectionEntry', 'selectionEntryGroup', 'entryLink', 'categoryLink',
     'constraint', 'cost', 'profile', 'characteristic', 'categoryEntry',
     'infoLink', 'costType'].includes(name),
});

const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const attr = (n, k) => (n ? n[`@_${k}`] : undefined);

/** Depth-first walk over every object node. */
function walk(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((c) => walk(c, fn)); return; }
  fn(node);
  for (const k of Object.keys(node)) walk(node[k], fn);
}

const clean = (s) =>
  String(s ?? '')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** `6"/Infantry` -> { inches: 6, type: 'Infantry' } */
export function splitMovement(raw) {
  const s = clean(raw).replace(/&quot;/g, '"').replace(/[”″]/g, '"');
  const m = s.match(/^([\d.]+)\s*"?\s*(?:\/\s*(.+))?$/);
  if (!m) return { movement: s, movementInches: null, movementType: null };
  return {
    movement: s,
    movementInches: Number(m[1]),
    movementType: m[2] ? clean(m[2]) : null,
  };
}

const charMap = (profile) => {
  const out = {};
  for (const c of arr(profile?.characteristics?.characteristic)) {
    out[attr(c, 'name')] = clean(c['#text']);
  }
  return out;
};

function costsOf(node) {
  const cost = { ducats: 0, glory: 0 };
  for (const c of arr(node?.costs?.cost)) {
    const name = attr(c, 'name');
    const value = Number(attr(c, 'value') ?? 0);
    if (name === 'Ducats') cost.ducats += value;
    else if (name === 'Glory Points') cost.glory += value;
  }
  return cost;
}

function constraintsOf(node) {
  return arr(node?.constraints?.constraint).map((c) => ({
    type: attr(c, 'type'),
    value: Number(attr(c, 'value')),
    scope: attr(c, 'scope'),
    includeChildSelections: attr(c, 'includeChildSelections') === 'true',
  }));
}

/**
 * min/max for a unit entry. BattleScribe expresses "0-2 Sniper Priests" as a
 * roster-scoped max of 2 (and a min of 1 for required entries like the
 * Lieutenant), so read them off the constraints rather than the name.
 */
function recruitLimits(constraints) {
  const roster = constraints.filter((c) => c.scope === 'roster');
  const min = roster.find((c) => c.type === 'min');
  const max = roster.find((c) => c.type === 'max');
  return { min: min ? min.value : null, max: max ? max.value : null };
}

export function parseCatalogues(dir) {
  const files = fs.readdirSync(dir).filter((f) => /\.(cat|gst)$/.test(f));

  /** id -> node, so entryLink@targetId can be resolved. */
  const byId = new Map();
  const docs = [];

  for (const file of files) {
    const doc = parser.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    docs.push({ file, doc });
    walk(doc, (n) => {
      const id = attr(n, 'id');
      if (id && !byId.has(id)) byId.set(id, n);
    });
  }

  // Category id -> name, so categoryLinks resolve to readable keywords/roles.
  const categoryNames = new Map();
  for (const { doc } of docs) {
    walk(doc, (n) => {
      if (n.categoryEntries) {
        for (const c of arr(n.categoryEntries.categoryEntry)) {
          categoryNames.set(attr(c, 'id'), attr(c, 'name'));
        }
      }
    });
  }

  const ROLE_NAMES = new Set(['Elite', 'Troop', 'Mercenary', 'Leader', 'Configuration']);

  const factionOf = (file) => path.basename(file, path.extname(file));

  const units = [];
  const weapons = [];
  const abilitiesSeen = new Map();

  for (const { file, doc } of docs) {
    const faction = factionOf(file);

    walk(doc, (node) => {
      const profiles = arr(node?.profiles?.profile);
      if (!profiles.length) return;

      const unitProfile = profiles.find((p) => attr(p, 'typeName') === 'Unit');
      const gearProfiles = profiles.filter((p) =>
        ['Weapon', 'Battlekit'].includes(attr(p, 'typeName')));

      // categoryLinks give both keywords and the Elite/Troop role.
      const cats = arr(node?.categoryLinks?.categoryLink)
        .map((c) => attr(c, 'name') ?? categoryNames.get(attr(c, 'targetId')))
        .filter(Boolean)
        .map(clean);

      const abilities = profiles
        .filter((p) => attr(p, 'typeName') === 'Ability')
        .map((p) => {
          const a = {
            id: attr(p, 'id'),
            name: clean(attr(p, 'name')),
            description: clean(charMap(p).Description),
          };
          abilitiesSeen.set(a.id, a);
          return a;
        });

      const constraints = constraintsOf(node);
      const cost = costsOf(node);

      if (unitProfile) {
        const c = charMap(unitProfile);
        const mv = splitMovement(c.Movement);
        const { min, max } = recruitLimits(constraints);
        units.push({
          id: attr(unitProfile, 'id'),
          name: clean(attr(unitProfile, 'name')),
          factionId: faction,
          roles: cats.filter((x) => ROLE_NAMES.has(x)),
          keywords: cats.filter((x) => !ROLE_NAMES.has(x)).map((k) => k.toUpperCase()),
          stats: {
            movement: mv.movement,
            movementInches: mv.movementInches,
            movementType: mv.movementType,
            ranged: clean(c.Ranged) || '-',
            melee: clean(c.Melee) || '-',
            armour: clean(c.Armour) || '0',
            base: clean(c.Base) || '',
          },
          cost,
          min,
          max,
          abilities,
          options: [],
          constraints,
          sourceFile: file,
        });
        return;
      }

      for (const g of gearProfiles) {
        const c = charMap(g);
        weapons.push({
          id: attr(g, 'id'),
          name: clean(attr(g, 'name')),
          type: clean(c.Type) || attr(g, 'typeName'),
          range: clean(c.Range) || '',
          keywords: clean(c.Keywords)
            .split(',')
            .map((k) => clean(k))
            .filter((k) => k && k !== '-'),
          rules: clean(c.Rules) || undefined,
          cost,
          constraints,
          restrictions: [],
          factionId: faction,
          sourceFile: file,
        });
      }
    });
  }

  // Entries are reachable both inline and through sharedSelectionEntries, so the
  // same profile can be visited twice. Keep the first, which carries the
  // constraints from its real container.
  const dedupe = (xs) => {
    const seen = new Map();
    for (const x of xs) if (!seen.has(x.id)) seen.set(x.id, x);
    return [...seen.values()];
  };

  return {
    units: dedupe(units),
    weapons: dedupe(weapons),
    abilities: [...abilitiesSeen.values()],
    files,
  };
}
