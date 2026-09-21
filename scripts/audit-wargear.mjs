#!/usr/bin/env node
/**
 * Audit every hand-written wargear entry and keyword against the real sources.
 *
 *   npm run rules:audit            # summary
 *   npm run rules:audit -- --full  # every row
 *
 * Sources of truth:
 *   - the BattleScribe catalogues (Weapon and Battlekit profiles)
 *   - the rulebook Armoury Tables (the authoritative list of legal wargear)
 *   - the rulebook and the 1.0.2 Changelog (keyword glossary)
 *
 * Each app entry is classified:
 *   real      an exact name match in a source
 *   renamed   matches after normalisation (punctuation, plurals, "X / Y")
 *   INVENTED  appears in no source under any spelling
 *
 * This reports only. It is the evidence behind docs/AUDIT.md, and it should be
 * re-run after the app migrates to the generated data — every INVENTED row
 * should then be gone.
 */
import fs from 'node:fs';

import { parseCatalogues } from './lib/parse-battlescribe.mjs';
import { parseArmouryTables } from './lib/parse-warbands.mjs';

const full = process.argv.includes('--full');

/* ------------------------------------------------------- the source of truth */

const cat = parseCatalogues('data-sources/battlescribe');
const { rows: armoury } = parseArmouryTables();

const rulebookText = ['warbands-of-trench-crusade', 'trench-crusade-digital-rulebook', 'changelog-1.0.2']
  .map((f) => `data-sources/rulebook/extracted/${f}.txt`)
  .filter((f) => fs.existsSync(f))
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n');

const dispatchText = fs.existsSync('data-sources/dispatch/trench-dispatch-01-april-2026.txt')
  ? fs.readFileSync('data-sources/dispatch/trench-dispatch-01-april-2026.txt', 'utf8')
  : '';

const allText = rulebookText + '\n' + dispatchText;

/** Loose key so "Sword/Axe", "Sword / Axe" and "Swords/Axes" collapse together. */
const key = (s) =>
  String(s ?? '').toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]/g, '');

/**
 * Spellings to try before calling a name invented.
 *
 * Each half of a "X / Y" name, the singular, the parenthetical stripped — and
 * the leading two words, because the app frequently decorates a real item
 * ("Holy Water of Lalibela" -> "Holy Water Phial"). Decoration is a renaming
 * problem; only a name with no real stem at all is an invention.
 */
const variants = (name) => {
  const out = new Set([name]);
  for (const part of String(name).split('/')) out.add(part.trim());
  for (const v of [...out]) {
    out.add(v.replace(/s\b/g, ''));
    out.add(v.replace(/\s*\([^)]*\)/g, '').trim());
    const words = v.split(/\s+/);
    if (words.length > 2) out.add(words.slice(0, 2).join(' '));
  }
  return [...out].filter((v) => v && v.length >= 4);
};

const sourceNames = new Set();
for (const w of cat.weapons) sourceNames.add(key(w.name));
for (const a of armoury) sourceNames.add(key(a.name));

const inSources = (name) => {
  for (const v of variants(name)) if (sourceNames.has(key(v))) return true;
  return false;
};

/** Fall back to a literal search of the source text for prose-only items. */
const inText = (name) => {
  for (const v of variants(name)) {
    if (v.length < 4) continue;
    if (allText.toLowerCase().includes(v.toLowerCase())) return true;
  }
  return false;
};

/* --------------------------------------------------- the hand-written data */

function extractArray(src, constName) {
  const start = src.indexOf(`export const ${constName}`);
  if (start === -1) return [];
  // Start from the '=' — the declaration's own type annotation contains a '[',
  // as in `export const BASE_WEAPONS: WeaponProfile[] = [`, and matching that
  // one yields an empty array.
  const eq = src.indexOf('=', start);
  const from = src.indexOf('[', eq);
  let depth = 0, i = from;
  for (; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') { depth--; if (!depth) break; }
  }
  const body = src.slice(from, i + 1);
  return [...body.matchAll(/(?:^|\n)\s*(?:name|"name"):\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);
}

const files = {
  'defaultRules.ts': 'src/data/defaultRules.ts',
  'officialRulesData.ts': 'src/data/officialRulesData.ts',
};

const groups = [];
for (const [label, path] of Object.entries(files)) {
  if (!fs.existsSync(path)) continue;
  const src = fs.readFileSync(path, 'utf8');
  for (const c of ['BASE_WEAPONS', 'BASE_ARMOUR', 'BASE_EQUIPMENT',
                   'OFFICIAL_WEAPONS', 'OFFICIAL_ARMOUR', 'OFFICIAL_EQUIPMENT']) {
    const names = extractArray(src, c);
    if (names.length) groups.push({ label, constName: c, names });
  }
}

/* ------------------------------------------------------------------ report */

console.log('WARGEAR AUDIT');
console.log(`sources: ${cat.weapons.length} catalogue profiles, ${armoury.length} armoury rows, ` +
            `${new Set([...sourceNames]).size} distinct names\n`);

let totals = { real: 0, renamed: 0, invented: 0 };
const invented = [];

for (const g of groups) {
  const rows = g.names.map((n) => {
    if (sourceNames.has(key(n))) return { n, verdict: 'real' };
    if (inSources(n)) return { n, verdict: 'renamed' };
    if (inText(n)) return { n, verdict: 'renamed' };
    return { n, verdict: 'INVENTED' };
  });

  const c = { real: 0, renamed: 0, INVENTED: 0 };
  for (const r of rows) c[r.verdict]++;
  totals.real += c.real; totals.renamed += c.renamed; totals.invented += c.INVENTED;
  invented.push(...rows.filter((r) => r.verdict === 'INVENTED').map((r) => `${g.constName}: ${r.n}`));

  const pct = rows.length ? Math.round((c.INVENTED / rows.length) * 100) : 0;
  console.log(`${g.constName.padEnd(20)} ${String(rows.length).padStart(4)} entries   ` +
              `real ${String(c.real).padStart(3)}   renamed ${String(c.renamed).padStart(3)}   ` +
              `INVENTED ${String(c.INVENTED).padStart(3)}  (${pct}%)`);

  if (full) for (const r of rows.filter((x) => x.verdict === 'INVENTED')) console.log(`      ${r.n}`);
}

const grand = totals.real + totals.renamed + totals.invented;
console.log(`\nTOTAL ${grand} entries — real ${totals.real}, renamed ${totals.renamed}, ` +
            `INVENTED ${totals.invented} (${grand ? Math.round(totals.invented / grand * 100) : 0}%)`);

if (invented.length && !full) {
  console.log('\n--- entries found in no source (first 30; --full for all) ---');
  invented.slice(0, 30).forEach((x) => console.log('  ' + x));
  if (invented.length > 30) console.log(`  …and ${invented.length - 30} more`);
}

/* ------------------------------------------------------------- keywords */

const KEYWORD_RE = /^([A-Z][A-Z0-9 '()X\-]{2,34}?)\s*\((?:Effect|Tag|Keyword)\)\s*:/gm;
const officialKeywords = new Set();
for (const m of allText.matchAll(KEYWORD_RE)) officialKeywords.add(m[1].trim().toUpperCase());
// Keywords also appear as bare capitalised tokens in unit Keywords rows.
for (const m of allText.matchAll(/^Keywords\s*\t(.+)$/gm)) {
  for (const k of m[1].split(/[,\t]/)) {
    const t = k.trim().toUpperCase();
    if (t.length > 2 && /^[A-Z0-9 '()X\-]+$/.test(t)) officialKeywords.add(t);
  }
}
for (const w of cat.weapons) for (const k of w.keywords) officialKeywords.add(k.trim().toUpperCase());

const appKeywords = (() => {
  const p = 'src/data/officialRulesData.ts';
  if (!fs.existsSync(p)) return [];
  return [...fs.readFileSync(p, 'utf8').matchAll(/"name":\s*"([^"]+)"/g)].map((m) => m[1]);
})();

const kBad = appKeywords.filter((k) => {
  const K = k.trim().toUpperCase();
  if (officialKeywords.has(K)) return false;
  // Tolerate the "(X)" parameter form and the "+1 DICE / -1 DICE" style entries.
  const stripped = K.replace(/\s*\([^)]*\)/g, '').trim();
  if (officialKeywords.has(stripped)) return false;
  if (/^[+-]\d/.test(K)) return false;
  return !allText.toUpperCase().includes(stripped);
});

console.log(`\nKEYWORDS`);
console.log(`  official keywords found in the sources: ${officialKeywords.size}`);
console.log(`  keywords in officialRulesData.ts:       ${appKeywords.length}`);
console.log(`  present in no source:                   ${kBad.length}`);
if (kBad.length) {
  (full ? kBad : kBad.slice(0, 30)).forEach((k) => console.log('    ' + k));
  if (!full && kBad.length > 30) console.log(`    …and ${kBad.length - 30} more`);
}

console.log('\nReports only — nothing was changed.');
