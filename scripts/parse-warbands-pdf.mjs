#!/usr/bin/env node
/**
 * Parse warband entries out of the extracted "Warbands of Trench Crusade" text.
 *
 *   npm run rules:extract -- data-sources/rulebook/warbands-of-trench-crusade.pdf \
 *                            data-sources/rulebook/extracted/warbands-of-trench-crusade.txt
 *   node scripts/parse-warbands-pdf.mjs [--json out.json]
 *
 * The official PDF extracts to a tab-delimited structure that is genuinely
 * parseable, not merely searchable:
 *
 *     0-2 Sniper Priests - Cost: 50
 *     Movement \t Ranged \t Melee \t Armour \t Base
 *     6"/Infantry \t +2 DICE \t -1 DICE \t 0 \t 25mm
 *     Keywords \t NEW ANTIOCH, ELITE
 *
 * That gives us the two things the BattleScribe catalogues cannot be the sole
 * source for: an authoritative cross-check on every statline, and the min/max
 * recruitment limits written directly into each entry header.
 *
 * It is also the path for a brand-new faction whose catalogue does not exist
 * yet — see docs/RULESET-MODEL.md § "Adding a brand-new faction".
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = 'data-sources/rulebook/extracted/warbands-of-trench-crusade.txt';

if (!fs.existsSync(SRC)) {
  console.error(`error: ${SRC} not found. Run rules:extract on the Warbands PDF first.`);
  process.exit(1);
}

const lines = fs.readFileSync(SRC, 'utf8').split('\n');

/** `0-2 Sniper Priests - Cost: 50` / `1 Lieutenant - Cost: 70` */
const HEADER = /^\s*(\d+)(?:\s*[-–]\s*(\d+))?\s+(.+?)\s+-\s+Cost:\s*(\d+)/;
const STAT_HEADER = /Movement\s*\t\s*Ranged\s*\t\s*Melee\s*\t\s*Armour\s*\t\s*Base/;

const cell = (s) => s.split('\t').map((c) => c.trim()).filter(Boolean);

const entries = [];

for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(HEADER);
  if (!m) continue;

  const [, lo, hi, rawName, cost] = m;
  const entry = {
    name: rawName.replace(/[^\S ]/g, '').trim(),
    min: hi ? Number(lo) : Number(lo),
    max: hi ? Number(hi) : Number(lo),
    ducats: Number(cost),
    line: i + 1,
  };
  // "1 Lieutenant" means exactly 1 required; "0-2" means optional up to 2.
  if (!hi) { entry.min = Number(lo); entry.max = Number(lo); }

  // Statline: the row immediately after the Movement/Ranged/... header,
  // searched within the entry's own block (before the next entry header).
  for (let j = i + 1; j < Math.min(i + 90, lines.length); j++) {
    if (lines[j].match(HEADER)) break;
    if (STAT_HEADER.test(lines[j])) {
      const c = cell(lines[j + 1] ?? '');
      if (c.length >= 5) {
        entry.stats = {
          movement: c[0].replace(/”/g, '"'),
          ranged: c[1],
          melee: c[2],
          armour: c[3],
          base: c[4],
        };
      }
      break;
    }
  }

  // Keywords row
  for (let j = i + 1; j < Math.min(i + 120, lines.length); j++) {
    if (lines[j].match(HEADER)) break;
    if (/^Keywords\s*\t/.test(lines[j])) {
      entry.keywords = lines[j]
        .replace(/^Keywords\s*\t/, '')
        .split(/[,\t]/)
        .map((k) => k.trim())
        .filter(Boolean);
      break;
    }
  }

  entries.push(entry);
}

const withStats = entries.filter((e) => e.stats);

/*
  Report only when run directly. This file is also imported as a module by
  rules-threeway.mjs, and printing a summary table on import put twelve lines
  of unrelated output above that script's own findings.
*/
const main = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (main) {
  const jsonArg = process.argv.indexOf('--json');
  if (jsonArg !== -1) {
    const out = process.argv[jsonArg + 1] ?? 'warband-entries.json';
    fs.writeFileSync(out, JSON.stringify(entries, null, 2) + '\n');
    console.log(`wrote ${out}`);
  }

  console.log(`entries found:          ${entries.length}`);
  console.log(`with a parsed statline: ${withStats.length}`);
  console.log(`with keywords:          ${entries.filter((e) => e.keywords).length}`);
  console.log();
  console.log('name                          limit   ducats  M/R/Me/A/Base');
  for (const e of entries) {
    const s = e.stats
      ? `${e.stats.movement} ${e.stats.ranged} ${e.stats.melee} ${e.stats.armour} ${e.stats.base}`
      : '(no statline parsed)';
    const limit = e.min === e.max ? `${e.min}` : `${e.min}-${e.max}`;
    console.log(`${e.name.padEnd(30)}${limit.padEnd(8)}${String(e.ducats).padEnd(8)}${s}`);
  }
}

export { entries };
