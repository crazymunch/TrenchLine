#!/usr/bin/env node
/**
 * Cross-check the hand-written game data in src/data/defaultRules.ts against
 * the BattleScribe catalogues in data-sources/battlescribe/.
 *
 *   node scripts/rules-fetch.mjs
 *   node scripts/rules-crosscheck.mjs [--full]
 *
 * This is the audit tool that produced the figures in docs/AUDIT.md §1.1. It is
 * deliberately kept after the data pipeline lands (docs/RESTRUCTURE-PLAN.md
 * Phase 1) so the improvement is measurable rather than asserted: run it before
 * and after and the mismatch count should go to zero.
 *
 * It reports only. It never edits data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';

const CAT_DIR = 'data-sources/battlescribe';
const APP_DATA = 'src/data/defaultRules.ts';
const full = process.argv.includes('--full');

if (!fs.existsSync(CAT_DIR)) {
  console.error(`error: ${CAT_DIR} not found — run: node scripts/rules-fetch.mjs`);
  process.exit(1);
}

/* ---------- 1. read the source of truth ---------------------------------- */

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

function walk(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach((c) => walk(c, fn));
  fn(node);
  for (const key of Object.keys(node)) walk(node[key], fn);
}

const source = new Map();

for (const file of fs.readdirSync(CAT_DIR).filter((f) => f.endsWith('.cat'))) {
  const doc = parser.parse(fs.readFileSync(path.join(CAT_DIR, file), 'utf8'));
  walk(doc, (node) => {
    if (node['@_typeName'] !== 'Unit' || !node.characteristics?.characteristic) return;
    const chars = [].concat(node.characteristics.characteristic);
    const get = (name) => {
      const c = chars.find((c) => c['@_name'] === name);
      return c ? String(c['#text'] ?? '').trim() : '';
    };
    source.set(node['@_name'], {
      file,
      movement: get('Movement'),
      ranged: get('Ranged'),
      melee: get('Melee'),
      armour: get('Armour'),
      base: get('Base'),
    });
  });
}

/* ---------- 2. read the hand-written app data ---------------------------- */

const src = fs.readFileSync(APP_DATA, 'utf8');
const block = src.slice(src.indexOf('export const BASE_UNITS'));

const appUnits = [
  ...block.matchAll(
    /name: '([^']+)',\s*factionId: '([^']+)',\s*category: '([^']+)',\s*baseCost: (\d+),\s*stats: \{\s*movement: '([^']*)',\s*ranged: '([^']*)',\s*melee: '([^']*)',\s*armour: '([^']*)'/g
  ),
].map((m) => ({
  name: m[1],
  faction: m[2],
  cost: Number(m[4]),
  movement: m[5],
  ranged: m[6],
  melee: m[7],
  armour: m[8],
}));

/* ---------- 3. compare ---------------------------------------------------- */

// Naming drift between the app's hand-written names and the catalogues.
// Extend as more are confirmed; see docs/AUDIT.md §1.1.
const ALIASES = {
  'Trench Dog / War Hound': 'Trench Dog',
  'Anchorite Shrine': 'Anchorite',
  'Yüzbaşı': 'Yüzbaşı Captain',
};

const norm = (s) =>
  String(s).toLowerCase().replace(/dice/g, '').replace(/[”"']/g, '').replace(/\s+/g, '');

const results = { ok: 0, mismatched: 0, unmatched: 0 };
const rows = [];

for (const unit of appUnits) {
  const key = ALIASES[unit.name] ?? unit.name;
  const truth = source.get(key);

  if (!truth) {
    results.unmatched++;
    rows.push({ name: unit.name, status: 'unmatched', detail: 'no catalogue entry of this name' });
    continue;
  }

  const diffs = [];
  if (norm(unit.ranged) !== norm(truth.ranged)) diffs.push(`Ranged ${unit.ranged} != ${truth.ranged}`);
  if (norm(unit.melee) !== norm(truth.melee)) diffs.push(`Melee ${unit.melee} != ${truth.melee}`);
  if (norm(unit.armour) !== norm(truth.armour)) diffs.push(`Armour ${unit.armour} != ${truth.armour}`);
  if (!norm(truth.movement).startsWith(norm(unit.movement)))
    diffs.push(`Movement ${unit.movement} != ${truth.movement}`);

  if (diffs.length) {
    results.mismatched++;
    rows.push({ name: unit.name, status: 'mismatch', detail: diffs.join(' | ') });
  } else {
    results.ok++;
    rows.push({ name: unit.name, status: 'ok', detail: '' });
  }
}

/* ---------- 4. report ----------------------------------------------------- */

const matched = results.ok + results.mismatched;
const pct = matched ? Math.round((results.mismatched / matched) * 100) : 0;

console.log(`\nCross-check: ${APP_DATA} vs ${CAT_DIR}\n`);
console.log(`  app units parsed        ${appUnits.length}`);
console.log(`  catalogue unit profiles ${source.size}`);
console.log(`  matched by name         ${matched}`);
console.log(`    correct               ${results.ok}`);
console.log(`    MISMATCHED            ${results.mismatched}  (${pct}%)`);
console.log(`  unmatched               ${results.unmatched}`);

const shown = rows.filter((r) => r.status !== 'ok');
console.log(`\n--- discrepancies ${full ? '' : `(first 25 of ${shown.length}; --full for all)`} ---`);
for (const r of full ? shown : shown.slice(0, 25)) {
  console.log(`  ${r.name.padEnd(28)} ${r.detail}`);
}
console.log();

// Reports only — exit 0 regardless. Once Phase 1 lands, `rules:verify` is the
// gate that fails the build.
