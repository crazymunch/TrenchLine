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

/*
  The book has no faction column, but every entry carries its faction as a
  KEYWORD, and that is how a duplicate name is told apart. Mercenaries are the
  entries with no faction keyword at all — that is what makes them hireable.
*/
const FACTION_KEYWORD = {
  'NEW ANTIOCH': 'New Antioch',
  HERETIC: 'Heretic Legion',
  SULTANATE: 'Iron Sultanate',
  PILGRIM: 'Trench Pilgrims',
  'THE COURT': 'Court of the Seven-Headed Serpent',
  'BLACK GRAIL': 'Black Grail',
};

export function bookFaction(entry) {
  for (const k of entry.keywords ?? []) if (FACTION_KEYWORD[k]) return FACTION_KEYWORD[k];
  return 'Mercenaries';
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
export const normaliseArmour = (v) => {
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

  /*
    Names are not unique across catalogues — Combat Medic, Trench Dog, Guard
    Dog, Mercy Dog, Homunculus and Wretched each exist in two or more.

    This used to give up on them: every unit sharing a name was recorded as
    'ambiguous' and skipped, which is how the New Antioch Combat Medic's cost
    sat 25 Ducats under the book's for as long as the check has existed. The
    book names the faction in the entry's keywords, so match on it and only
    report ambiguity when that still does not single one out.
  */
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
    if (nameCount.get(key) > 1 && unit.factionId !== bookFaction(b)) {
      // Another faction's model that happens to share the name. Not the book's
      // entry, so not comparable — and not a fault either.
      out.unconfirmed += FIELDS.length;
      if (!dataset.units.some((o) => nameKey(o.name) === key && o.factionId === bookFaction(b))) {
        out.ambiguous.push(`${unit.name} (${unit.factionId}) — book says ${bookFaction(b)}`);
      }
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

      /*
        A layer deliberately overriding the book is not a conflict: the
        Dispatch supersedes the rulebook (docs/RULESET-MODEL.md §6 precedence).
        Layers transcribed from a PDF address entities by name, so the same
        field can carry a 'base' record under the id and a layer record under
        the name. Take the layer one — `??` would stop at the truthy base.

        Asked BEFORE the hand resolutions, not after. The other order let a
        stale entry outrank the real answer: resolutions.json still claimed the
        Scripture Guardian's Ranged was a maintainer's pick of the book's '-'
        long after the Dispatch had set it to +2 DICE, and the build reported
        that fiction every run.
      */
      const byId = provenance.get('unit', unit.id, field);
      const byName = provenance.get('unit', unit.name, field);
      const prov = [byId, byName].find((p) => p && p.layer !== 'base') ?? byId ?? byName;
      if (prov && prov.layer !== 'base' && prov.layer !== 'resolution') {
        out.resolved.push({ key, chose: prov.layer, because: 'layer supersedes the rulebook by precedence' });
        continue;
      }

      if (resolutions[key]) { out.resolved.push({ key, ...resolutions[key] }); continue; }

      out.conflicts.push({ key, unit: unit.name, field, ours: mine, book: theirs });
    }
  }
  return out;
}

/**
 * Write the maintainer's decision into the dataset.
 *
 * resolutions.json used to be inert: it silenced the conflict and nothing
 * more, so an entry reading `chose: "rulebook", value: "-"` sat next to a unit
 * still shipping the catalogue's `+1 Dice`. The file said one thing and the
 * app did another, which is the failure this whole pipeline exists to prevent.
 *
 * Now `chose: "rulebook"` applies the book's value and records provenance for
 * it; `chose: "battlescribe"` keeps the catalogue's. Either way the stated
 * `value` is checked against the source it names, so the file cannot drift
 * away from the page it cites.
 *
 * @returns {{applied: string[], errors: string[]}}
 */
export function applyResolutions(dataset, resolutions, provenance, bookEntries) {
  const book = new Map();
  for (const e of bookEntries) if (e.stats) book.set(nameKey(e.name), e);
  const field = new Map(FIELDS.map((f) => [f[0], f]));

  const applied = [], errors = [];
  for (const [key, r] of Object.entries(resolutions)) {
    const at = key.lastIndexOf('.', key.lastIndexOf('.') - 1);
    const unitName = key.slice(0, at);
    const path = key.slice(at + 1);
    const spec = field.get(path);
    if (!spec) { errors.push(`${key}: '${path}' is not a verified field`); continue; }

    const b = book.get(nameKey(unitName));
    const units = dataset.units.filter(
      (u) => nameKey(u.name) === nameKey(unitName) && (!b || u.factionId === bookFaction(b)));
    if (!units.length) { errors.push(`${key}: no such unit in the dataset`); continue; }
    if (!b) { errors.push(`${key}: the rulebook has no entry to resolve against`); continue; }

    const [, fromUnit, fromBook, norm] = spec;
    const want = String(r.value ?? '');

    /*
      A layer already superseded this field, so there is nothing left for a
      maintainer to choose: the Dispatch outranks the rulebook by precedence,
      and applying the resolution here would silently undo an official erratum.
      That is what the first version of this function did — it reverted the
      Dispatch's +2 DICE on the Scripture Guardian to the book's '-'.

      Skipped rather than rejected: the same file feeds every ruleset, and an
      entry superseded in the layered one is still doing real work in the
      unlayered base, where the Dispatch has not been applied.
    */
    const layered = units
      .map((u) => provenance.get('unit', u.id, path) ?? provenance.get('unit', u.name, path))
      .find((pr) => pr && pr.layer !== 'base' && pr.layer !== 'resolution');
    if (layered) {
      applied.push(`${key}  -- superseded by layer '${layered.layer}', not applied`);
      continue;
    }

    if (r.chose === 'rulebook') {
      if (norm(want) !== norm(fromBook(b))) {
        errors.push(`${key}: chose rulebook and states '${want}', but the book says `
                  + `'${fromBook(b)}'`);
        continue;
      }
      for (const u of units) {
        const [head, tail] = path.split('.');
        // The book prints Ducats and Glory as numbers; stats stay strings.
        u[head][tail] = head === 'cost' ? Number(want) : want;
        provenance.stamp('unit', u.id, path, {
          layer: 'resolution',
          source: `resolutions.json:${key} — rulebook:warbands-of-trench-crusade`,
        });
      }
      applied.push(`${key}  -> ${want}  (rulebook)`);
      continue;
    }

    if (r.chose === 'battlescribe') {
      const mine = fromUnit(units[0]);
      if (norm(want) !== norm(mine)) {
        errors.push(`${key}: chose battlescribe and states '${want}', but the dataset `
                  + `holds '${mine}'`);
        continue;
      }
      applied.push(`${key}  -> ${want}  (catalogue, kept)`);
      continue;
    }

    errors.push(`${key}: chose '${r.chose}' — expected 'rulebook' or 'battlescribe'`);
  }
  return { applied, errors };
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
