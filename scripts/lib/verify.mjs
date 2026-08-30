/**
 * Cross-check the layered dataset against the official rulebook.
 *
 * Three outcomes per field (docs/RULESET-MODEL.md §6):
 *
 *   confirmed    the rulebook states the same value          -> build passes
 *   unconfirmed  the book has no comparable entry            -> build passes, counted
 *   conflict     the rulebook clearly states something else  -> BUILD FAILS
 *
 * A conflict is resolved by hand in data-sources/resolutions.json, with a
 * written reason. That file is the project's record of why the data says what
 * it says — the thing the original build never had.
 *
 * Normalisation matters as much as the comparison: the first run of this check
 * reported seven rulebook-vs-catalogue conflicts, of which five were formatting
 * (`-` vs `N/A`, `30 by 60mm` vs `30x60mm`, `+1 DICE` vs `1`). Those are the
 * tool's fault, not the sources'.
 */
import fs from 'node:fs';

/** Values that all mean "this model has no attack of this kind". */
const NO_VALUE = new Set(['-', '–', '—', 'n/a', 'na', '']);

export function normaliseStat(v) {
  let s = String(v ?? '').toLowerCase().trim();
  s = s.replace(/[”″]/g, '"').replace(/&quot;/g, '"');
  s = s.replace(/\bdice\b/g, '').replace(/\s+/g, '');
  if (NO_VALUE.has(s)) return '-';
  // "+1" and "1" are the same modifier — the book writes one, the catalogue
  // sometimes the other. Zero is exempt: "+0" and "0" both normalise to "0",
  // and prefixing it would undo that.
  if (/^\d+$/.test(s) && Number(s) !== 0) s = `+${s}`;
  s = s.replace(/^\+?0$/, '0');
  return s;
}

export function normaliseBase(v) {
  return String(v ?? '')
    .toLowerCase()
    .replace(/\s*by\s*/g, 'x')      // "30 by 60mm" -> "30x60mm"
    .replace(/\s+/g, '')
    .replace(/mm$/, '');
}

/** Book entries pluralise ("Sniper Priests"); catalogues use the singular. */
export function nameKey(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s*\/.*$/, '')
    .replace(/\b(captain|shrine)\b/g, '')
    .replace(/ies\b/g, 'y')
    .replace(/s\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Armour has no "no value" state — a dash means 0, unlike Ranged/Melee. */
const normaliseArmour = (v) => {
  const s = normaliseStat(v);
  return s === '-' ? '0' : s;
};

const FIELDS = [
  ['stats.ranged', (e) => e.stats?.ranged, (b) => b.stats?.ranged, normaliseStat],
  ['stats.melee', (e) => e.stats?.melee, (b) => b.stats?.melee, normaliseStat],
  ['stats.armour', (e) => e.stats?.armour, (b) => b.stats?.armour, normaliseArmour],
  ['stats.base', (e) => e.stats?.base, (b) => b.stats?.base, normaliseBase],
  ['cost.ducats', (e) => e.cost?.ducats, (b) => b.ducats, (v) => String(v ?? '')],
  ['cost.glory', (e) => e.cost?.glory, (b) => b.glory, (v) => String(v ?? '')],
];

/**
 * @param dataset   the layered dataset
 * @param bookEntries entries parsed from the Warbands PDF
 * @param provenance  to record `verified` on confirmed fields
 * @param resolutions data-sources/resolutions.json, if present
 */
export function verify(dataset, bookEntries, provenance, resolutions = {}) {
  const book = new Map();
  for (const e of bookEntries) if (e.stats) book.set(nameKey(e.name), e);

  // Names are not unique across catalogues — 'Combat Medic' exists as both a
  // New Antioch entry and a Mercenary one, while the book has a single entry.
  // Comparing both against it manufactures a conflict, so ambiguous names are
  // reported as unmatched instead.
  const nameCount = new Map();
  for (const u of dataset.units) {
    const k = nameKey(u.name);
    nameCount.set(k, (nameCount.get(k) ?? 0) + 1);
  }

  const out = {
    confirmed: 0, unconfirmed: 0, conflicts: [], resolved: [], compared: 0,
    ambiguous: [],
  };

  for (const unit of dataset.units) {
    const key = nameKey(unit.name);
    const b = book.get(key);
    if (!b) { out.unconfirmed += FIELDS.length; continue; }
    if (nameCount.get(key) > 1) {
      out.ambiguous.push(`${unit.name} (${unit.factionId})`);
      out.unconfirmed += FIELDS.length;
      continue;
    }
    out.compared++;

    for (const [field, fromUnit, fromBook, norm] of FIELDS) {
      const mine = fromUnit(unit);
      const theirs = fromBook(b);
      if (theirs === undefined || theirs === null || theirs === '') { out.unconfirmed++; continue; }

      if (norm(mine) === norm(theirs)) {
        out.confirmed++;
        const p = provenance.get('unit', unit.id, field);
        if (p) p.verified = 'rulebook:warbands-of-trench-crusade';
        continue;
      }

      const key = `${unit.name}.${field}`;
      if (resolutions[key]) { out.resolved.push({ key, ...resolutions[key] }); continue; }

      // A layer deliberately overriding the book is not a conflict: the
      // Dispatch supersedes the rulebook (docs/RULESET-MODEL.md §6 precedence).
      // Layers transcribed from a PDF address entities by name, so the same
      // field can carry a 'base' record under the id and a layer record under
      // the name. Take the layer one — `??` would stop at the truthy base.
      const byId = provenance.get('unit', unit.id, field);
      const byName = provenance.get('unit', unit.name, field);
      const prov = [byId, byName].find((p) => p && p.layer !== 'base') ?? byId ?? byName;
      if (prov && prov.layer !== 'base') {
        out.resolved.push({ key, chose: prov.layer, because: 'layer supersedes the rulebook by precedence' });
        continue;
      }

      out.conflicts.push({ key, unit: unit.name, field, ours: mine, book: theirs });
    }
  }
  return out;
}

/** Every field of every entity must know where it came from. */
export function findMissingProvenance(dataset, provenance) {
  const missing = [];
  const check = (kind, e, obj, prefix = '') => {
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'id' || k === 'sourceFile' || k.startsWith('_')) continue;
      const field = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) { check(kind, e, v, field); continue; }
      if (!provenance.get(kind, e.id, field)) missing.push(`${kind}:${e.name ?? e.id}.${field}`);
    }
  };
  for (const u of dataset.units) check('unit', u, u);
  for (const w of dataset.weapons) check('weapon', w, w);
  return missing;
}

export function loadResolutions(file = 'data-sources/resolutions.json') {
  if (!fs.existsSync(file)) return {};
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Keys beginning with _ are documentation, not resolutions.
  return Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith('_')));
}
