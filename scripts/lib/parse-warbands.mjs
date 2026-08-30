/**
 * Warband entries from the extracted "Warbands of Trench Crusade" text.
 *
 * The official PDF extracts to a tab-delimited structure with correct line
 * ordering, so this is a parser rather than a fuzzy matcher:
 *
 *     0-2 Sniper Priests - Cost: 50
 *     Movement \t Ranged \t Melee \t Armour \t Base
 *     6"/Infantry \t +2 DICE \t -1 DICE \t 0 \t 25mm
 *     Keywords \t NEW ANTIOCH, ELITE
 *
 * It supplies the two things the catalogues cannot be the sole source for: an
 * authoritative cross-check on every statline, and the recruitment limits
 * written into each entry header. It is also the path for a faction whose
 * catalogue does not exist yet — see docs/RULESET-MODEL.md.
 */
import fs from 'node:fs';

export const WARBANDS_TXT =
  'data-sources/rulebook/extracted/warbands-of-trench-crusade.txt';

/**
 * `0-2 Sniper Priests - Cost: 50 👑` / `0-1 Goetic Warlock - Cost: 4 ☼`
 *
 * The currency is a glyph, not a word: U+1F451 (crown) is Ducats and U+263C is
 * Glory Points. Ten entries — all Mercenaries — are priced in Glory, and
 * reading their cost as Ducats makes every one of them look like a conflict
 * against the catalogue.
 */
const HEADER = /^\s*(\d+)(?:\s*[-–]\s*(\d+))?\s+(.+?)\s+-\s+Cost:\s*(\d+)\s*(\S)?/;
const GLORY_GLYPH = '\u263C';
const STAT_HEADER = /Movement\s*\t\s*Ranged\s*\t\s*Melee\s*\t\s*Armour\s*\t\s*Base/;

const cell = (s) => s.split('\t').map((c) => c.trim()).filter(Boolean);

export function parseWarbandEntries(src = WARBANDS_TXT) {
  if (!fs.existsSync(src)) return [];
  const lines = fs.readFileSync(src, 'utf8').split('\n');
  const entries = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(HEADER);
    if (!m) continue;
    const [, lo, hi, rawName, cost, glyph] = m;
    const isGlory = glyph === GLORY_GLYPH;
    const entry = {
      name: rawName.replace(/[^\S ]/g, '').trim(),
      min: Number(lo),
      max: hi ? Number(hi) : Number(lo),
      ducats: isGlory ? 0 : Number(cost),
      glory: isGlory ? Number(cost) : 0,
      currency: isGlory ? 'glory' : 'ducats',
      line: i + 1,
    };

    for (let j = i + 1; j < Math.min(i + 90, lines.length); j++) {
      if (lines[j].match(HEADER)) break;
      if (STAT_HEADER.test(lines[j])) {
        const c = cell(lines[j + 1] ?? '');
        if (c.length >= 5) {
          entry.stats = {
            movement: c[0].replace(/[”″]/g, '"'),
            ranged: c[1], melee: c[2], armour: c[3], base: c[4],
          };
        }
        break;
      }
    }

    for (let j = i + 1; j < Math.min(i + 120, lines.length); j++) {
      if (lines[j].match(HEADER)) break;
      if (/^Keywords\s*\t/.test(lines[j])) {
        entry.keywords = lines[j].replace(/^Keywords\s*\t/, '')
          .split(/[,\t]/).map((k) => k.trim()).filter(Boolean);
        break;
      }
    }

    entries.push(entry);
  }
  return entries;
}

/** The 14 official Warband Variants and their special rules. */
export function parseVariants(src = WARBANDS_TXT) {
  if (!fs.existsSync(src)) return [];
  const text = fs.readFileSync(src, 'utf8');
  const lines = text.split('\n');
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Z][A-Z\u2019' \u2013-]{5,60}) SPECIAL RULES\s*$/);
    if (!m) continue;
    const name = m[1].trim();
    const rules = [];
    for (let j = i + 1; j < Math.min(i + 60, lines.length); j++) {
      if (/SPECIAL RULES\s*$/.test(lines[j])) break;
      const r = lines[j].match(/^\*\*\s*([^:]{3,60}):\s*(.+)$/);
      if (r) rules.push({ name: r[1].trim(), description: r[2].trim() });
    }
    out.push({ name, specialRules: rules, line: i + 1 });
  }
  return out;
}
