#!/usr/bin/env node
/**
 * Three-way comparison: app data vs BattleScribe catalogues vs the official
 * Warbands rulebook.
 *
 *   node scripts/rules-threeway.mjs
 *
 * This is the evidence behind the layered ruleset design in
 * docs/RULESET-MODEL.md. It answers two separate questions:
 *
 *   1. How wrong is the current hand-written app data?  (vs both sources)
 *   2. Where do the two SOURCES disagree with each other?
 *
 * (2) is the important one: every such row is a case the pipeline must resolve
 * explicitly rather than silently pick a winner, and is why "just import the
 * catalogues" is not sufficient.
 */
import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { entries as bookEntries } from './parse-warbands-pdf.mjs';
import { normaliseStat, normaliseArmour, normaliseBase, loadResolutions } from './lib/verify.mjs';

const CAT_DIR = 'data-sources/battlescribe';

/* ---------- BattleScribe ---------- */
/*
  Keyed by faction as well as name. Six names exist twice — Combat Medic,
  Trench Dog, Guard Dog, Mercy Dog, Homunculus, Wretched — with different costs
  and statlines in each catalogue. A Map keyed by name alone silently kept
  whichever file was read last, so the book's New Antioch Combat Medic was
  compared against the Mercenaries hireling.
*/
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
const walk = (n, fn) => {
  if (!n || typeof n !== 'object') return;
  if (Array.isArray(n)) return n.forEach((c) => walk(c, fn));
  fn(n);
  for (const k of Object.keys(n)) walk(n[k], fn);
};

// The catalogue file IS the faction; nothing inside the XML states it plainly.
const factionOf = (file) => path.basename(file, '.cat');

const cat = [];
for (const f of fs.readdirSync(CAT_DIR).filter((f) => f.endsWith('.cat'))) {
  const faction = factionOf(f);
  const costs = new Map();
  const root = parser.parse(fs.readFileSync(path.join(CAT_DIR, f), 'utf8'));

  // Costs live on the selectionEntry, statlines on the Unit profile inside it.
  walk(root, (n) => {
    if (n['@_type'] !== 'model' && n['@_type'] !== 'unit') return;
    const c = n.costs?.cost;
    if (!c) return;
    const arr = [].concat(c);
    const num = (name) => Number(arr.find((x) => x['@_name'] === name)?.['@_value'] ?? 0);
    costs.set(n['@_name'], { ducats: num('Ducats'), glory: num('Glory Points') });
  });

  walk(root, (n) => {
    if (n['@_typeName'] !== 'Unit' || !n.characteristics?.characteristic) return;
    const cs = [].concat(n.characteristics.characteristic);
    const g = (name) => {
      const c = cs.find((c) => c['@_name'] === name);
      return c ? String(c['#text'] ?? '').trim() : '';
    };
    cat.push({
      name: n['@_name'], faction,
      movement: g('Movement'), ranged: g('Ranged'),
      melee: g('Melee'), armour: g('Armour'), base: g('Base'),
      ...(costs.get(n['@_name']) ?? {}),
    });
  });
}

/* ---------- app ---------- */
/*
  The generated dataset, which is what the app ships.

  This read `BASE_UNITS` from `src/data/defaultRules.ts`, deleted when the app
  moved onto the pipeline. The regex matched nothing, so "app units 0" was
  printed and "app vs rulebook DISAGREE 0" was reported for weeks — a perfect
  score against an empty list.
*/
const APP_DATA = 'src/data/generated/trenchline.generated.ts';
const src = fs.readFileSync(APP_DATA, 'utf8');
const dataset = JSON.parse(src.slice(src.indexOf('{\n  "units"'), src.lastIndexOf('}') + 1));
const app = dataset.units.map((u) => ({
  id: u.id,
  name: u.name,
  faction: u.factionId,
  ducats: u.cost.ducats,
  glory: u.cost.glory,
  movement: u.stats.movement,
  ranged: u.stats.ranged,
  melee: u.stats.melee,
  armour: u.stats.armour,
}));
if (!app.length) {
  console.error(`error: parsed 0 units from ${APP_DATA}. Refusing to report a ` +
                'three-way comparison against an empty list.');
  process.exit(1);
}

/* ---------- name reconciliation ---------- */
// The book pluralises multi-model entries ("Sniper Priests"); the catalogues and
// the app use the singular. Normalise rather than maintain a hand alias list.
const key = (s) =>
  s.toLowerCase()
    .replace(/’/g, "'")
    .replace(/\s*\/.*$/, '')          // "Trench Dog / War Hound" -> "trench dog"
    .replace(/\b(captain|shrine)\b/g, '')
    .replace(/ies$/, 'y').replace(/s$/, '')
    .replace(/[^a-z0-9]/g, '');

/*
  The book has no faction column, but every entry carries its faction as a
  KEYWORD, which is how a duplicate name is told apart. Mercenaries are the
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
const bookFaction = (e) => {
  for (const k of e.keywords ?? []) if (FACTION_KEYWORD[k]) return FACTION_KEYWORD[k];
  return 'Mercenaries';
};

// name key -> every entry with that name, so a lookup can pick by faction.
const bucket = (rows) => {
  const out = new Map();
  for (const r of rows) {
    const k = key(r.name);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(r);
  }
  return out;
};
const catIdx = bucket(cat);
const appIdx = bucket(app);

/*
  Faction first, then a unique name. Never "whichever was read last": that is
  the bug this replaced, and it silently compared the book's 65-Ducat New
  Antioch Combat Medic against the Mercenaries hireling.

  A name that exists in several factions and matches none of them is left
  unmatched and counted, rather than guessed at.
*/
let ambiguous = 0;
const pick = (idx, k, faction) => {
  const rows = idx.get(k);
  if (!rows) return undefined;
  const hit = rows.find((r) => r.faction === faction);
  if (hit) return hit;
  if (rows.length === 1) return rows[0];
  ambiguous++;
  return undefined;
};

const bookIdx = [];
for (const e of bookEntries) {
  if (e.stats) bookIdx.push({ ...e, key: key(e.name), faction: bookFaction(e) });
}

/* ---------- provenance ---------- */
// Which layer last wrote each field, so a deliberate erratum is not reported
// as an app error against the book it came from.
const provenance = JSON.parse(
  fs.readFileSync('src/data/generated/trenchline.provenance.json', 'utf8'));
const layerOf = (unitId, field) =>
  provenance[`unit:${unitId}`]?.[field]?.layer ?? 'base';

/* ---------- compare ---------- */
/*
  Normalisation is imported, not repeated.

  Both this script and the build's verify step had their own copy, and they had
  already drifted: this one reported "30 by 60mm" vs "30x60mm" and "+1 DICE"
  vs "1" as source conflicts that the build had long since decided were
  spelling. One definition, in scripts/lib/verify.mjs, with the reasoning for
  each rule written there.
*/
const eq = (a, b) => normaliseStat(a) === normaliseStat(b);
const eqArmour = (a, b) => normaliseArmour(a) === normaliseArmour(b);
const eqBase = (a, b) => normaliseBase(a) === normaliseBase(b);
const cmp = { ranged: eq, melee: eq, armour: eqArmour };

const FIELDS = ['ranged', 'melee', 'armour'];
let bookVsCat = 0, appVsBook = 0, compared = 0;
const sourceConflicts = [], appErrors = [];

for (const book of bookIdx) {
  const c = pick(catIdx, book.key, book.faction);
  if (c) {
    compared++;
    const diffs = FIELDS.filter((f) => !cmp[f](book.stats[f], c[f]));
    if (!eq(book.stats.movement, c.movement)) diffs.push('movement');
    if (book.stats.base && c.base && !eqBase(book.stats.base, c.base)) diffs.push('base');
    /*
      Cost is a source conflict too, and belongs here rather than under app
      errors: when the book and the catalogue print different numbers the app
      can only be wrong against one of them, and the decision is a resolution.

      The book prints one glyph for both currencies — "Combat Biologist 3" is
      3 Glory — so match the figure against either.
    */
    const costDiffers = book.ducats != null && c.ducats != null
      && book.ducats !== c.ducats && book.ducats !== c.glory;
    if (costDiffers) diffs.push('cost');
    if (diffs.length) {
      bookVsCat++;
      sourceConflicts.push({
        unit: book.name,
        fields: diffs,
        name: `${book.name} (${book.faction})`,
        detail: diffs.map((f) => (f === 'cost'
          ? `cost: book=${book.ducats} cat=${c.ducats}D/${c.glory}G`
          : `${f}: book=${book.stats[f] ?? ''} cat=${c[f]}`)).join('  |  '),
      });
    }
  }

  const a = pick(appIdx, book.key, book.faction);
  if (a) {
    /*
      Fields a layer changed on purpose are not app errors. The Trench Dispatch
      exists to correct the catalogues, so the Witchburner's +2 DICE melee
      differing from the base profile is the layer working, not a fault.

      Neither is a field the sources themselves disagree on: the app follows
      whichever resolutions.json chose, and reporting that as an app error
      double-counts a conflict already listed above.
    */
    const conflicted = new Set(
      c ? FIELDS.filter((f) => !cmp[f](book.stats[f], c[f])) : []);
    const diffs = FIELDS
      .filter((f) => !cmp[f](book.stats[f], a[f]))
      .filter((f) => !conflicted.has(f))
      .filter((f) => layerOf(a.id, `stats.${f}`) === 'base');
    if (diffs.length) { appVsBook++; appErrors.push({ name: book.name, diffs }); }

    // Provenance records the two currencies separately, so ask about both.
    const costIsLayered = layerOf(a.id, 'cost.ducats') !== 'base'
                       || layerOf(a.id, 'cost.glory') !== 'base';
    const costConflicted = c && book.ducats != null && c.ducats != null
      && book.ducats !== c.ducats && book.ducats !== c.glory;
    if (book.ducats != null && !costIsLayered && !costConflicted
        && book.ducats !== a.ducats && book.ducats !== a.glory) {
      appErrors.push({
        name: book.name,
        diffs: [`cost app=${a.ducats}D/${a.glory}G book=${book.ducats}`],
      });
    }
  }
}

console.log('\n=== THREE-WAY COMPARISON ===\n');
console.log(`rulebook entries with statlines   ${bookIdx.length}`);
console.log(`catalogue unit profiles           ${cat.length}`);
console.log(`app units                         ${app.length}\n`);

console.log(`rulebook vs catalogue  compared   ${compared}`);
console.log(`                       DISAGREE   ${bookVsCat}`);
console.log(`app vs rulebook        DISAGREE   ${appVsBook}`);
if (ambiguous) console.log(`ambiguous name, not compared      ${ambiguous}`);
console.log();

/*
  Each conflict is either answered in resolutions.json or it is outstanding.
  Saying which is the whole point of the list: an unannotated report reads the
  same on the day a conflict is found and on the day it is settled.
*/
const resolutions = loadResolutions();
const resolvedKey = (c, f) => `${c.unit}.${f === 'cost' ? 'cost.ducats' : `stats.${f}`}`;
const outstanding = sourceConflicts.filter(
  (c) => !c.fields.every((f) => resolutions[resolvedKey(c, f)]));

console.log('--- SOURCE CONFLICTS (rulebook vs catalogue) ---');
console.log('Each needs an explicit resolution in data-sources/resolutions.json.\n');
if (!sourceConflicts.length) console.log('  (none)');
for (const c of sourceConflicts) {
  const open = c.fields.filter((f) => !resolutions[resolvedKey(c, f)]);
  const mark = open.length ? 'OPEN    ' : 'resolved';
  console.log(`  ${mark} ${c.name.padEnd(34)} ${c.detail}`);
}

console.log('\n--- APP ERRORS vs the rulebook ---');
if (!appErrors.length) console.log('  (none)');
for (const e of appErrors) {
  console.log(`  ${e.name.padEnd(34)} ${e.diffs.join(', ')}`);
}
console.log();

/*
  Exit non-zero on anything actionable. A report that always succeeds is a
  report nobody reads — this script spent weeks printing "DISAGREE 0" against a
  list it had failed to parse, and nothing said so.
*/
if (outstanding.length || appErrors.length) {
  console.error(`${outstanding.length} unresolved source conflict(s), `
              + `${appErrors.length} app error(s).`);
  process.exit(1);
}
