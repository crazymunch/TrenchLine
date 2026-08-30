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

const CAT_DIR = 'data-sources/battlescribe';

/* ---------- BattleScribe ---------- */
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
const walk = (n, fn) => {
  if (!n || typeof n !== 'object') return;
  if (Array.isArray(n)) return n.forEach((c) => walk(c, fn));
  fn(n);
  for (const k of Object.keys(n)) walk(n[k], fn);
};

const cat = new Map();
for (const f of fs.readdirSync(CAT_DIR).filter((f) => f.endsWith('.cat'))) {
  walk(parser.parse(fs.readFileSync(path.join(CAT_DIR, f), 'utf8')), (n) => {
    if (n['@_typeName'] !== 'Unit' || !n.characteristics?.characteristic) return;
    const cs = [].concat(n.characteristics.characteristic);
    const g = (name) => {
      const c = cs.find((c) => c['@_name'] === name);
      return c ? String(c['#text'] ?? '').trim() : '';
    };
    cat.set(n['@_name'], {
      movement: g('Movement'), ranged: g('Ranged'),
      melee: g('Melee'), armour: g('Armour'), base: g('Base'),
    });
  });
}

/* ---------- app ---------- */
const src = fs.readFileSync('src/data/defaultRules.ts', 'utf8');
const block = src.slice(src.indexOf('export const BASE_UNITS'));
const app = new Map();
for (const m of block.matchAll(
  /name: '([^']+)',\s*factionId: '([^']+)',\s*category: '([^']+)',\s*baseCost: (\d+),\s*stats: \{\s*movement: '([^']*)',\s*ranged: '([^']*)',\s*melee: '([^']*)',\s*armour: '([^']*)'/g
)) {
  app.set(m[1], { ducats: +m[4], movement: m[5], ranged: m[6], melee: m[7], armour: m[8] });
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

const index = (map) => {
  const out = new Map();
  for (const [k, v] of map) out.set(key(k), { name: k, ...v });
  return out;
};
const catIdx = index(cat);
const appIdx = index(app);
const bookIdx = new Map();
for (const e of bookEntries) if (e.stats) bookIdx.set(key(e.name), e);

/* ---------- compare ---------- */
const norm = (s) =>
  String(s ?? '').toLowerCase()
    .replace(/dice/g, '').replace(/[”"']/g, '')
    .replace(/\s+/g, '').replace(/^\+?0$/, '0').replace(/mm$/, '');
const eq = (a, b) => norm(a) === norm(b);

const FIELDS = ['ranged', 'melee', 'armour'];
let bookVsCat = 0, appVsBook = 0, compared = 0;
const sourceConflicts = [], appErrors = [];

for (const [k, book] of bookIdx) {
  const c = catIdx.get(k);
  if (c) {
    compared++;
    const diffs = FIELDS.filter((f) => !eq(book.stats[f], c[f]));
    if (!eq(book.stats.movement, c.movement)) diffs.push('movement');
    if (book.stats.base && c.base && !eq(book.stats.base, c.base)) diffs.push('base');
    if (diffs.length) {
      bookVsCat++;
      sourceConflicts.push({
        name: book.name,
        detail: diffs.map((f) => `${f}: book=${book.stats[f] ?? ''} cat=${c[f]}`).join('  |  '),
      });
    }
  }
  const a = appIdx.get(k);
  if (a) {
    const diffs = FIELDS.filter((f) => !eq(book.stats[f], a[f]));
    if (diffs.length) { appVsBook++; appErrors.push({ name: book.name, diffs }); }
    if (a.ducats !== book.ducats) {
      appErrors.push({ name: book.name, diffs: [`ducats app=${a.ducats} book=${book.ducats}`] });
    }
  }
}

console.log('\n=== THREE-WAY COMPARISON ===\n');
console.log(`rulebook entries with statlines   ${bookIdx.size}`);
console.log(`catalogue unit profiles           ${cat.size}`);
console.log(`app units                         ${app.size}\n`);

console.log(`rulebook vs catalogue  compared   ${compared}`);
console.log(`                       DISAGREE   ${bookVsCat}`);
console.log(`app vs rulebook        DISAGREE   ${appVsBook}\n`);

console.log('--- SOURCE CONFLICTS (rulebook vs catalogue) ---');
console.log('These need an explicit resolution in data-sources/resolutions.json.\n');
if (!sourceConflicts.length) console.log('  (none)');
for (const c of sourceConflicts) console.log(`  ${c.name.padEnd(26)} ${c.detail}`);

console.log('\n--- APP ERRORS vs the rulebook (first 15) ---');
for (const e of appErrors.slice(0, 15)) {
  console.log(`  ${e.name.padEnd(26)} ${e.diffs.join(', ')}`);
}
console.log();
