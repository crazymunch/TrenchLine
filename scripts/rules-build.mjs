#!/usr/bin/env node
/**
 * Build the game data from data-sources/ and emit it to src/data/.
 *
 *   npm run rules:build              # build every ruleset
 *   npm run rules:build -- --ruleset trenchline
 *   npm run rules:build -- --check   # verify only, write nothing
 *
 * Pipeline (docs/RULESET-MODEL.md §5):
 *   1. parse   BattleScribe catalogues -> normalised entities
 *   2. layer   apply the ruleset's layers in order, stamping provenance
 *   3. verify  cross-check against the rulebook; fail on unresolved conflicts
 *   4. emit    src/data/*.generated.ts + provenance.json
 *
 * The build fails, loudly, on an unresolved source conflict or a field with no
 * provenance. Data that cannot say where it came from does not ship.
 */
import fs from 'node:fs';
import path from 'node:path';

import { parseCatalogues } from './lib/parse-battlescribe.mjs';
import { parseWarbandEntries, parseVariants, parseArmouryTables } from './lib/parse-warbands.mjs';
import { createProvenance, applyLayers, stampBase } from './lib/layers.mjs';
import { verify, findMissingProvenance, loadResolutions } from './lib/verify.mjs';
import { RULESETS } from './lib/rulesets.mjs';

const CAT_DIR = 'data-sources/battlescribe';
const OUT_DIR = 'src/data/generated';
const REPORT_DIR = 'reports';

const argv = process.argv.slice(2);
const checkOnly = argv.includes('--check');
const onlyRuleset = argv.includes('--ruleset') ? argv[argv.indexOf('--ruleset') + 1] : null;

if (!fs.existsSync(path.join(CAT_DIR, 'MANIFEST.json'))) {
  console.error(`error: ${CAT_DIR}/MANIFEST.json missing. Run: npm run rules:fetch`);
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(path.join(CAT_DIR, 'MANIFEST.json'), 'utf8'));

/** Load every layer file a ruleset names. */
function loadLayer(id) {
  const candidates = [
    `data-sources/dispatch/${id}.layer.json`,
    `data-sources/layers/${id}.layer.json`,
  ];
  const found = candidates.find((f) => fs.existsSync(f));
  if (!found) {
    console.error(`error: layer '${id}' not found. Looked in:\n  ${candidates.join('\n  ')}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(found, 'utf8'));
}

const bookEntries = parseWarbandEntries();
const variants = parseVariants();
const armoury = parseArmouryTables();
const resolutions = loadResolutions();

if (!bookEntries.length) {
  console.warn(
    'warning: the Warbands rulebook extraction is missing, so nothing can be\n' +
      '         cross-checked. Run: npm run rules:pdfs && npm run rules:extract'
  );
}

fs.mkdirSync(REPORT_DIR, { recursive: true });

let failed = false;
const summaries = [];

for (const ruleset of RULESETS) {
  if (onlyRuleset && ruleset.id !== onlyRuleset) continue;

  // 1. parse — a fresh copy per ruleset, since layers mutate it
  const base = parseCatalogues(CAT_DIR);
  const dataset = {
    units: base.units,
    weapons: base.weapons,
    factions: [],
    keywords: [],
    meta: {
      rulesetId: ruleset.id,
      // Deliberately no build timestamp: the output must be reproducible so CI
      // can prove the committed data still matches data-sources/. The base
      // commit and the layer list already identify the dataset exactly.
      baseCommit: manifest.commit,
      layers: ruleset.layers,
    },
  };

  const provenance = createProvenance();
  stampBase(dataset, provenance, { commit: manifest.commit, fileOf: (e) => e.sourceFile });

  // 2. layer
  const layers = ruleset.layers.map(loadLayer);
  const layerReport = applyLayers(dataset, layers, provenance, {
    includeBeta: ruleset.includeBeta,
  });

  // Attach the Armoury Table restrictions ("ELITE only", "Limit: 2") to the
  // weapons they govern. The catalogues carry the profiles; the rulebook
  // carries the legality rules, and the roster validator needs both.
  const armouryByName = new Map();
  for (const row of armoury) {
    const k = row.name.toLowerCase();
    if (!armouryByName.has(k)) armouryByName.set(k, new Set());
    if (row.restrictions) armouryByName.get(k).add(row.restrictions);
  }
  let restricted = 0;
  for (const w of dataset.weapons) {
    const hit = armouryByName.get(w.name.toLowerCase());
    if (!hit || !hit.size) continue;
    w.restrictions = [...hit];
    restricted++;
    provenance.stamp('weapon', w.id, 'restrictions', {
      layer: 'base',
      source: 'rulebook:warbands-of-trench-crusade#armoury',
      verified: 'rulebook:warbands-of-trench-crusade',
    });
  }

  // Variants ride along as data; their ops apply per-roster, not here.
  dataset.variants = variants.map((v) => ({
    id: v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name: v.name,
    factionId: '',
    specialRules: v.specialRules,
    ops: [],
  }));

  // 3. verify
  const v = verify(dataset, bookEntries, provenance, resolutions);
  const missingProv = findMissingProvenance(dataset, provenance);

  const unresolvedOps = layerReport.flatMap((r) => r.unresolved ?? []);
  const layerNotes = layerReport.flatMap((r) => r.notes ?? []);

  summaries.push({ ruleset, v, missingProv, unresolvedOps, layerNotes, layerReport, dataset });

  console.log(`\n=== ${ruleset.name} (${ruleset.id}) ===`);
  console.log(`  units ${dataset.units.length}  weapons ${dataset.weapons.length}  variants ${variants.length}`);
  console.log(`  weapons carrying armoury restrictions: ${restricted}`);
  const mods = [...dataset.units, ...dataset.weapons]
    .reduce((n, e) => n + (e.modifiers?.length ?? 0), 0);
  const unmapped = [...dataset.units, ...dataset.weapons]
    .flatMap((e) => e.modifiers ?? []).filter((m) => m.rawField).length;
  console.log(`  conditional modifiers read: ${mods}` +
              (unmapped ? `  (${unmapped} with an unmapped field)` : ''));
  const opts = dataset.units.reduce((n, u) => n + (u.options?.length ?? 0), 0);
  const optUnits = dataset.units.filter((u) => u.options?.length).length;
  const optGroups = new Set(dataset.units.flatMap((u) => (u.options ?? []).map((o) => o.group)));
  console.log(`  unit options: ${opts} across ${optUnits} units, ${optGroups.size} groups`);
  console.log(`  layers applied: ${layers.map((l) => l.id).join(', ') || '(none)'}`);
  console.log(`  verified against the rulebook: ${v.compared} units`);
  console.log(`    confirmed   ${v.confirmed}`);
  console.log(`    unconfirmed ${v.unconfirmed}`);
  console.log(`    resolved    ${v.resolved.length}`);
  console.log(`    CONFLICTS   ${v.conflicts.length}`);
  if (unresolvedOps.length) console.log(`  unresolved layer ops: ${unresolvedOps.length}`);
  if (layerNotes.length) console.log(`  layer ops superseded upstream: ${layerNotes.length}`);
  if (missingProv.length) console.log(`  fields with NO provenance: ${missingProv.length}`);

  if (v.conflicts.length) {
    failed = true;
    console.log('\n  Unresolved source conflicts — resolve each in data-sources/resolutions.json:');
    for (const c of v.conflicts.slice(0, 20)) {
      console.log(`    ${c.key.padEnd(38)} ours=${c.ours}  book=${c.book}`);
    }
    if (v.conflicts.length > 20) console.log(`    …and ${v.conflicts.length - 20} more`);
  }
  if (missingProv.length) {
    failed = true;
    console.log('\n  Fields with no provenance (first 10):');
    missingProv.slice(0, 10).forEach((m) => console.log(`    ${m}`));
  }

  // 4. emit
  if (!checkOnly && !v.conflicts.length && !missingProv.length) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const banner =
      `// GENERATED FILE — DO NOT EDIT.\n` +
      `// Produced by \`npm run rules:build\` from data-sources/.\n` +
      `// Ruleset: ${ruleset.id}\n` +
      `// Base:    ${manifest.repo}@${manifest.commit}\n` +
      `// Layers:  ${ruleset.layers.join(', ') || '(none)'}\n` +
      `// See docs/RULESET-MODEL.md.\n\n`;

    const file = path.join(OUT_DIR, `${ruleset.id}.generated.ts`);
    fs.writeFileSync(file,
      banner +
      `import type { Dataset } from '../../types/catalogue';\n\n` +
      `export const DATASET: Dataset = ${JSON.stringify(dataset, null, 2)} as unknown as Dataset;\n\n` +
      `export default DATASET;\n`);

    fs.writeFileSync(path.join(OUT_DIR, `${ruleset.id}.provenance.json`),
      JSON.stringify(provenance.map, null, 2) + '\n');

    console.log(`  wrote ${file}`);
  }

  // A human-readable report, always.
  const lines = [
    `# Cross-check — ${ruleset.name}`, '',
    `Base \`${manifest.repo}@${manifest.commit}\``, '',
    `| | |`, `|---|---|`,
    `| units | ${dataset.units.length} |`,
    `| weapons | ${dataset.weapons.length} |`,
    `| units compared to the rulebook | ${v.compared} |`,
    `| fields confirmed | ${v.confirmed} |`,
    `| fields unconfirmed | ${v.unconfirmed} |`,
    `| resolved by precedence or by hand | ${v.resolved.length} |`,
    `| **unresolved conflicts** | **${v.conflicts.length}** |`, '',
  ];
  if (unresolvedOps.length) {
    lines.push('## Layer ops that could not be applied', '',
      'Usually the catalogues lag the source the layer was transcribed from.', '');
    for (const u of unresolvedOps) lines.push(`- ${u.why}`);
    lines.push('');
  }
  if (layerNotes.length) {
    lines.push('## Layer ops the catalogues have caught up with', '',
      'These applied, but the base data already carried the change. Each is a',
      'candidate for retirement from the layer once the base is confirmed current.', '');
    for (const n of layerNotes) lines.push(`- ${n.why}`);
    lines.push('');
  }
  if (v.conflicts.length) {
    lines.push('## Unresolved conflicts', '', '| field | ours | rulebook |', '|---|---|---|');
    for (const c of v.conflicts) lines.push(`| ${c.key} | ${c.ours} | ${c.book} |`);
  }
  fs.writeFileSync(path.join(REPORT_DIR, `crosscheck-${ruleset.id}.md`), lines.join('\n') + '\n');
}

console.log(`\nreports written to ${REPORT_DIR}/`);

if (failed) {
  console.error(
    '\nBUILD FAILED. A source conflict or a field without provenance means the\n' +
      'dataset cannot say where one of its values came from. Resolve it in\n' +
      'data-sources/resolutions.json with a written reason, then rebuild.'
  );
  process.exit(1);
}
console.log('\nOK');
