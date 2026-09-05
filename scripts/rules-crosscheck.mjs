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
import { byNameAlone, classifyUnmatched, norm } from './lib/crosscheck-match.mjs';

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
  /*
    Which document this unit was derived FROM.

    The pipeline reads two kinds of source, and only one of them is the
    catalogue: `New Antioch.cat` and its siblings, against which a statline can
    be checked, and `carcass-front-book.pdf`, which prints warbands BattleScribe
    does not carry at all. Without this the two are one bucket, and fifteen
    Carcass Front models sit under "no catalogue entry of this name" as if the
    app had invented them — while a genuine naming error would be the sixteenth
    line in that list and nobody would look twice.
  */
  source: u.sourceFile,
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

  /*
    The Carcass Front book reprints five models the catalogues already carry,
    under its own warband's names — a `Lazarist Castigator` in a Procession of
    the Sacred Affliction is the Trench Pilgrims `Castigator`. Their statlines
    were identical at the four fields this compares when these were added,
    which is what makes the pairing safe to assert; if the book ever restates
    one differently, this reports a mismatch, which is the signal wanted.

    Without these five they fall into "outside the catalogue" with the twenty-one
    models BattleScribe genuinely does not carry, and five checkable statlines
    go unchecked.
  */
  'Lazarist Castigator': 'Castigator',
  'Lazarist Communicant': 'Communicant',
  'Stigmatic Nuns': 'Stigmatic Nun',
  'Ecclesiastic Prisoners': 'Ecclesiastic Prisoner',
  'Drowned Chorister': 'Chorister',
};



const results = { matched: 0, ok: 0, mismatched: 0, unmatched: 0, explained: 0, uncovered: 0, sourceless: 0 };
const rows = [];
/** Units outside the catalogue's coverage, by the document they came from. */
const uncovered = new Map();

for (const unit of appUnits) {
  const name = ALIASES[unit.name] ?? unit.name;
  // The dataset's factionId is the catalogue's file name for these.
  const truth = source.get(catKey(unit.faction, name)) ?? byNameAlone(source, name);

  if (!truth) {
    /*
      A unit the app says came from a `.cat` and the catalogue does not have is
      a real problem — the name is wrong, or the entry is gone. A unit from a
      book the catalogues do not carry is a fact about coverage, and saying so
      is not the same as excusing it: it is counted, grouped by source, and a
      catalogue that grows to cover one will move it back into this check
      without anybody editing a list.
    */
    const why = classifyUnmatched(unit);
    if (why === 'unmatched') {
      results.unmatched++;
      rows.push({ name: unit.name, status: 'unmatched', detail: `no entry of this name in ${unit.source}` });
    } else if (why === 'uncovered') {
      results.uncovered++;
      if (!uncovered.has(unit.source)) uncovered.set(unit.source, []);
      uncovered.get(unit.source).push(unit.name);
    } else {
      results.sourceless++;
      rows.push({ name: unit.name, status: 'sourceless', detail: 'no source recorded, and no catalogue entry' });
    }
    continue;
  }

  results.matched++;
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

/* Every unit that found a catalogue row, including one whose only differences
   a layer explains. Counting `ok + mismatched` left those out of the total
   they were compared in, so the headline undercounted the work done. */
const matched = results.matched;
const compared = results.ok + results.mismatched;
const pct = compared ? Math.round((results.mismatched / compared) * 100) : 0;

console.log(`\nCross-check: ${APP_DATA} vs ${CAT_DIR}\n`);
console.log(`  app units parsed        ${appUnits.length}`);
console.log(`  catalogue unit profiles ${source.size}`);
console.log(`  matched by name         ${matched}`);
console.log(`    correct               ${results.ok}`);
console.log(`    MISMATCHED            ${results.mismatched}  (${pct}%)`);
// Fields a layer changed on purpose. Listed apart so an intentional erratum
// never has to be re-investigated as if it were drift.
console.log(`    explained by a layer  ${results.explained}  (on ${matched - compared} unit${matched - compared === 1 ? '' : 's'} with no other difference)`);
console.log(`  unmatched               ${results.unmatched}  (in a .cat the app names)`);
if (results.sourceless) console.log(`  no source recorded      ${results.sourceless}`);
console.log(`  outside the catalogue   ${results.uncovered}`);
for (const [src, names] of [...uncovered].sort()) {
  console.log(`    ${src.padEnd(24)} ${names.length}`);
  /* Named, not just counted. A count says "ten models the catalogue does not
     carry"; the names are what let a reader notice one that it does. */
  for (const n of names.sort()) console.log(`      ${n}`);
}

const shown = rows.filter((r) => r.status !== 'ok');
console.log(`\n--- discrepancies ${full ? '' : `(first 25 of ${shown.length}; --full for all)`} ---`);
for (const r of full ? shown : shown.slice(0, 25)) {
  console.log(`  ${r.name.padEnd(28)} ${r.detail}`);
}
console.log();

/*
  A statline disagreement is a REPORT: deciding it needs the book, and the gate
  for that is `rules:verify`, per the restructure plan. Exit 0 for those.

  `unmatched` and `no source recorded` are different in kind. Neither is a
  question about the game: one says a unit names a catalogue file that has no
  such entry, the other that nothing records where a unit came from at all.
  Both are the app's own bookkeeping, both are answerable without opening a
  rulebook, and both are currently zero — so a non-zero exit says something
  regressed rather than describing the state of the world.

  Deliberately not wired into CI here. Which checks gate the build is a policy
  decision the restructure plan assigns to `rules:verify`; this only makes the
  answer available to whoever, or whatever, runs the script.
*/
const defects = results.unmatched + results.sourceless;
if (defects) {
  console.error(
    `error: ${defects} unit${defects === 1 ? '' : 's'} could not be reconciled with the ` +
    'source the app names for them. This is not a disagreement about a statline — ' +
    'it is a unit pointing at a catalogue entry that is not there, or at nothing at all.');
  process.exit(1);
}
