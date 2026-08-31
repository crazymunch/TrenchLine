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
/*
  The generated dataset, which is what the app actually ships.

  This read `src/data/defaultRules.ts` and its `BASE_UNITS` export — deleted
  when the app moved onto the pipeline. The regex then matched nothing, the
  script reported "app units parsed 0", and every run since has passed while
  comparing an empty list against 79 catalogue profiles. A check that cannot
  fail is worse than no check: it is a green light with nothing behind it.
*/
const APP_DATA = 'src/data/generated/trenchline.generated.ts';
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

/*
  Keyed by faction AND name, because the name alone is not unique.

  "Combat Medic", "Trench Dog", "Guard Dog" and "Mercy Dog" each exist in both
  Mercenaries.cat and New Antioch.cat with *different* statlines — the
  Mercenaries Guard Dog has no ranged attack ("N/A"), the New Antioch one reads
  "0". Keyed by name, the second file silently overwrote the first and the check
  then compared the app's Mercenaries entry against New Antioch's profile,
  reporting four mismatches that were its own bookkeeping.
*/
const catKey = (faction, name) => `${faction}::${name}`;

// `.gst` too, not only `.cat`: the game-system file carries shared entries —
// the Takwin Homunculus among them — and skipping it reported a unit the
// catalogues do carry as having no entry at all.
for (const file of fs.readdirSync(CAT_DIR).filter((f) => /\.(cat|gst)$/.test(f))) {
  const faction = path.basename(file).replace(/\.(cat|gst)$/, '');
  const doc = parser.parse(fs.readFileSync(path.join(CAT_DIR, file), 'utf8'));
  walk(doc, (node) => {
    if (node['@_typeName'] !== 'Unit' || !node.characteristics?.characteristic) return;
    const chars = [].concat(node.characteristics.characteristic);
    const get = (name) => {
      const c = chars.find((c) => c['@_name'] === name);
      return c ? String(c['#text'] ?? '').trim() : '';
    };
    source.set(catKey(faction, node['@_name']), {
      file,
      movement: get('Movement'),
      ranged: get('Ranged'),
      melee: get('Melee'),
      armour: get('Armour'),
      base: get('Base'),
    });
  });
}

/* ---------- 2. read what the app ships ------------------------------------ */

const src = fs.readFileSync(APP_DATA, 'utf8');
// The file is `export const DATASET: Dataset = { ... };` — one JSON literal.
const dataset = JSON.parse(src.slice(src.indexOf('{\n  "units"'), src.lastIndexOf('}') + 1));

/*
  Per-field provenance, so a deliberate erratum is not reported as drift.

  The app's data is the catalogues PLUS the layers, so a field the Trench
  Dispatch corrected is *supposed* to differ from the base catalogue — the
  Witchburner's +2 DICE melee is the whole point of the layer. Reporting those
  beside genuine drift trains the reader to ignore the output.
*/
const provenance = JSON.parse(
  fs.readFileSync('src/data/generated/trenchline.provenance.json', 'utf8'));
const layerOf = (unitId, field) =>
  provenance[`unit:${unitId}`]?.[field]?.layer ?? 'base';

const appUnits = dataset.units.map((u) => ({
  id: u.id,
  name: u.name,
  faction: u.factionId,
  cost: u.cost.ducats,
  movement: u.stats.movement,
  ranged: u.stats.ranged,
  melee: u.stats.melee,
  armour: u.stats.armour,
}));

/*
  Refuse to report a pass on nothing. This is the failure mode that hid a dead
  check for weeks, and it costs one line to make it impossible.
*/
if (!appUnits.length) {
  console.error(`error: parsed 0 units from ${APP_DATA}. Refusing to report a ` +
                'comparison against an empty list. Has the file moved or its ' +
                'shape changed?');
  process.exit(1);
}

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

const results = { ok: 0, mismatched: 0, unmatched: 0, explained: 0 };
const rows = [];

for (const unit of appUnits) {
  const name = ALIASES[unit.name] ?? unit.name;
  // The dataset's factionId is the catalogue's file name for these.
  const truth = source.get(catKey(unit.faction, name))
    // A unit the app files under one faction that the catalogues keep in
    // another still deserves a comparison; fall back to a unique name match.
    ?? [...source.entries()]
        .filter(([k]) => k.endsWith(`::${name}`))
        .map(([, v]) => v)
        .find((_, i, all) => all.length === 1);

  if (!truth) {
    results.unmatched++;
    rows.push({ name: unit.name, status: 'unmatched', detail: 'no catalogue entry of this name' });
    continue;
  }

  const diffs = [];
  const explained = [];
  const note = (field, statField, label, appVal, catVal) => {
    const layer = layerOf(unit.id, statField);
    const line = `${label} ${appVal} != ${catVal}`;
    if (layer === 'base') diffs.push(line);
    else explained.push(`${line}  [${layer}]`);
  };

  if (norm(unit.ranged) !== norm(truth.ranged))
    note('ranged', 'stats.ranged', 'Ranged', unit.ranged, truth.ranged);
  if (norm(unit.melee) !== norm(truth.melee))
    note('melee', 'stats.melee', 'Melee', unit.melee, truth.melee);
  if (norm(unit.armour) !== norm(truth.armour))
    note('armour', 'stats.armour', 'Armour', unit.armour, truth.armour);
  if (!norm(truth.movement).startsWith(norm(unit.movement)))
    note('movement', 'stats.movement', 'Movement', unit.movement, truth.movement);

  if (explained.length) {
    results.explained += explained.length;
    rows.push({ name: unit.name, status: 'layered', detail: explained.join(' | ') });
  }

  if (diffs.length) {
    results.mismatched++;
    rows.push({ name: unit.name, status: 'mismatch', detail: diffs.join(' | ') });
  } else if (!explained.length) {
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
// Fields a layer changed on purpose. Listed apart so an intentional erratum
// never has to be re-investigated as if it were drift.
console.log(`    explained by a layer  ${results.explained}`);
console.log(`  unmatched               ${results.unmatched}`);

const shown = rows.filter((r) => r.status !== 'ok');
console.log(`\n--- discrepancies ${full ? '' : `(first 25 of ${shown.length}; --full for all)`} ---`);
for (const r of full ? shown : shown.slice(0, 25)) {
  console.log(`  ${r.name.padEnd(28)} ${r.detail}`);
}
console.log();

// Reports only — exit 0 regardless. Once Phase 1 lands, `rules:verify` is the
// gate that fails the build.
