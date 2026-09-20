#!/usr/bin/env node
/**
 * Audit the catalogue weapon profiles against the rulebook's Battlekit chapter,
 * and the Armoury Table prices against the catalogue's own costs.
 *
 *   node scripts/rules-audit-battlekit.mjs
 *
 * `dataset.weapons` is the catalogues' per-faction copy of every Weapon and
 * Battlekit profile; `dataset.battlekit` is the rulebook chapter, parsed by
 * `scripts/lib/parse-battlekit.mjs`. The build joins them by name for the Codex
 * and never compares them, so a catalogue profile that drifted from the book
 * (a keyword missing, a range changed by 1.0.2) reaches the roster and the
 * attack calculator unchecked. This compares Type, Range, Keywords and the
 * special rules text for every name the two share.
 *
 * The armoury check is the other direction: the Armoury Tables (from the
 * Warbands book) price a row, and the catalogue prices the same entry. Where
 * the catalogue states a non-zero cost for the same faction, the two should
 * agree, and the ones that do not are worth a look before either is trusted.
 *
 * Reports only. Changes no data.
 */
import fs from 'node:fs';
import { nameKey } from './lib/verify.mjs';

const GENERATED = 'src/data/generated/trenchline.generated.ts';
const src = fs.readFileSync(GENERATED, 'utf8');
const head = 'export const DATASET: Dataset = ';
const DS = JSON.parse(src.slice(src.indexOf(head) + head.length, src.lastIndexOf('} as unknown as Dataset') + 1));

const clean = (s) => String(s ?? '').replace(/ /g, ' ').replace(/[”″’']/g, (c) => (c === "’" ? "'" : c === '”' || c === '″' ? '"' : c))
  .replace(/\s+/g, ' ').trim();
const normRange = (r) => clean(r).toLowerCase().replace(/[”″]/g, '"').replace(/''/g, '"').replace(/\s+/g, '');
const normType = (t) => clean(t).toLowerCase().replace(/-handed/, '-handed');
const normKw = (k) => clean(k).toUpperCase().replace(/[”″]/g, '"').replace(/\s+/g, ' ');
const normText = (s) => clean(s).toLowerCase().replace(/[^a-z0-9+ ]/g, '').replace(/\s+/g, ' ').trim();

const byKey = new Map();
for (const w of DS.weapons) {
  const k = nameKey(w.name);
  if (!byKey.has(k)) byKey.set(k, []);
  byKey.get(k).push(w);
}

let compared = 0;
const diffs = [];
const unmatchedBook = [];
for (const b of DS.battlekit) {
  const ws = byKey.get(nameKey(b.name));
  if (!ws) { unmatchedBook.push(b); continue; }
  for (const w of ws) {
    compared++;
    const d = [];
    if (b.type && w.type && normType(b.type) !== normType(w.type)) d.push(['type', w.type, b.type]);
    if (b.range && w.range && normRange(b.range) !== normRange(w.range)) d.push(['range', w.range, b.range]);
    const bk = new Set((b.keywords ?? []).map(normKw)), wk = new Set((w.keywords ?? []).map(normKw));
    const missing = [...bk].filter((k) => !wk.has(k)), extra = [...wk].filter((k) => !bk.has(k));
    if (missing.length || extra.length) d.push(['keywords', [...wk].join(', '), [...bk].join(', '),
      `${missing.length ? 'missing ' + missing.join(', ') : ''}${missing.length && extra.length ? '; ' : ''}${extra.length ? 'extra ' + extra.join(', ') : ''}`]);
    const bookRules = normText((b.rules ?? []).join(' '));
    const ourRules = normText(w.rules ?? '');
    if (bookRules !== ourRules && (bookRules || ourRules)) d.push(['rules', clean(w.rules ?? '').slice(0, 150), clean((b.rules ?? []).join(' ')).slice(0, 150)]);
    if (d.length) diffs.push({ w, b, d });
  }
}

console.log('WEAPONS vs BATTLEKIT CHAPTER');
console.log(`  chapter entries ${DS.battlekit.length}; catalogue profiles ${DS.weapons.length}; compared ${compared}`);
console.log(`  profiles with a difference: ${diffs.length}; chapter entries with no catalogue profile: ${unmatchedBook.length}\n`);
const byField = {};
for (const x of diffs) for (const [f] of x.d) byField[f] = (byField[f] ?? 0) + 1;
console.log('  by field:', JSON.stringify(byField));

/* Group by the difference so a shared profile drifting in six catalogues reads once. */
const seen = new Map();
for (const x of diffs) {
  for (const [f, ours, book, note] of x.d) {
    const k = `${x.w.name}|${f}|${ours}|${book}`;
    if (!seen.has(k)) seen.set(k, { name: x.w.name, f, ours, book, note, factions: [] });
    seen.get(k).factions.push(x.w.factionId);
  }
}
console.log('\n--- DIFFERENCES (distinct) ---');
for (const v of seen.values()) {
  console.log(`\n${v.name}  [${[...new Set(v.factions)].join(', ')}]  ${v.f}`);
  console.log(`  ours: ${JSON.stringify(v.ours)}`);
  console.log(`  book: ${JSON.stringify(v.book)}${v.note ? `   [${v.note}]` : ''}`);
}
console.log('\n--- CHAPTER ENTRIES WITH NO CATALOGUE PROFILE ---');
for (const b of unmatchedBook) console.log(`  ${b.name} (${b.section})`);

/* ------------------------------------------------- armoury vs catalogue cost */
console.log('\n\nARMOURY TABLE PRICES vs CATALOGUE COSTS');
const wById = new Map(DS.weapons.map((w) => [w.id, w]));
let priced = 0; const costDiffs = [];
for (const a of DS.armouries) {
  for (const row of a.rows) {
    const w = row.weaponId ? wById.get(row.weaponId) : null;
    if (!w) continue;
    const c = w.cost ?? { ducats: 0, glory: 0 };
    if (!c.ducats && !c.glory) continue;
    priced++;
    if (c.ducats !== row.cost.ducats || c.glory !== row.cost.glory) {
      costDiffs.push(`${a.factionId.padEnd(38)} ${row.name.padEnd(30)} book ${row.cost.ducats}D/${row.cost.glory}G  catalogue ${c.ducats}D/${c.glory}G  (${w.factionId})`);
    }
  }
}
console.log(`  rows with a catalogue price to compare: ${priced}; disagreeing: ${costDiffs.length}`);
for (const l of costDiffs) console.log('  ' + l);
