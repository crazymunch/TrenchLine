/**
 * Audit the hand-written campaign tables against the sources.
 *
 * `npm run rules:audit` swept wargear and keywords and found 38% of the wargear
 * did not exist. The campaign tables — Trauma, the three Exploration Location
 * tables, the four Skills tables — were never swept, and they are about to
 * become the thing that drives a campaign's economy: an Exploration result adds
 * Ducats to a Strongbox that persists for the rest of the campaign.
 *
 * A wrong statline is visible on a card and someone notices. A wrong Exploration
 * reward silently puts the wrong number in a player's Strongbox, and every later
 * purchase compounds it. So these get checked before anything is wired to them.
 *
 * Two sources, and they are not equally good here:
 *
 *   - `Campaign Rules.cat` carries the Injuries as real entries with their D66
 *     roll in the name — `Lost an Eye [15]`. Machine-readable and exact, so it
 *     is the authority for the Trauma Table.
 *   - The rulebook PDF prints these as two-column tables, and the text
 *     extraction interleaves the columns with page furniture: rolls 12 to 22 of
 *     the Trauma Table come out as `2 2 M 2 2 3 3 T 3`. Usable as corroboration
 *     for names it does contain, useless as a list. Where the extraction cannot
 *     be read, this reports "cannot verify" rather than treating silence as
 *     agreement — the whole point of the exercise.
 *
 * Reports only. Changes no data.
 */
import { readFileSync } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';

const CAT = 'data-sources/battlescribe/Campaign Rules.cat';
const BOOK = 'data-sources/rulebook/extracted/trench-crusade-digital-rulebook.txt';
const APP = 'src/data/officialRulesData.ts';

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const key = (s) =>
  String(s ?? '')
    .replace(/[ıß]/g, (c) => ({ ı: 'i', ß: 'ss' }[c]))
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');

/* ------------------------------------------------------- the app's tables */

/** Pull one `export const NAME = [ ... ]` array out of the TypeScript source. */
function arrayLiteral(src, name) {
  const m = new RegExp(`export const ${name}[^=]*=\\s*\\[`).exec(src);
  if (!m) return null;
  const start = m.index + m[0].length - 1;   // the '[' itself
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']' && --depth === 0) return src.slice(start, i + 1);
  }
  return null;
}

/** Every `"roll"`/`"title"` pair, in order, without evaluating the source. */
function entriesOf(literal) {
  if (!literal) return [];
  const out = [];
  const re = /\{[^{}]*\}/gs;
  for (const m of literal.match(re) ?? []) {
    const roll = /["']?roll["']?\s*:\s*["']([^"']*)["']/.exec(m)?.[1];
    const title = /["']?(?:title|name)["']?\s*:\s*["']([^"']*)["']/.exec(m)?.[1];
    if (title) out.push({ roll: clean(roll), title: clean(title) });
  }
  return out;
}

/* --------------------------------------------- the catalogue's own injuries */

/**
 * `Lost an Eye [15]` -> { roll: '15', title: 'Lost an Eye' }.
 * Entries without a bracketed roll are the injuries' sub-options (a Source of
 * Fear names which faction), not table rows, so they are skipped.
 */
function catalogueInjuries() {
  const parser = new XMLParser({
    ignoreAttributes: false, attributeNamePrefix: '@_', trimValues: false,
    isArray: (n) => ['selectionEntry', 'selectionEntryGroup'].includes(n),
  });
  const doc = parser.parse(readFileSync(CAT, 'utf8'));

  const found = new Map();
  const walk = (node, inInjuries) => {
    if (!node || typeof node !== 'object') return;
    const name = clean(node['@_name']);
    const here = inInjuries || name === 'Injuries';
    if (here && name) {
      const m = /^(.*?)\s*\[(\d{2})\]$/.exec(name);
      if (m) found.set(m[2], clean(m[1]));
    }
    for (const v of Object.values(node)) {
      if (Array.isArray(v)) v.forEach((c) => walk(c, here));
      else if (v && typeof v === 'object') walk(v, here);
    }
  };
  walk(doc, false);
  return found;
}

/* ---------------------------------------------------------------- the book */

const book = readFileSync(BOOK, 'utf8');
const bookKey = key(book);
/** The extraction is unreliable for tables; this only ever corroborates a name. */
const bookMentions = (title) => bookKey.includes(key(title));

/* ---------------------------------------------------------------- the sweep */

const src = readFileSync(APP, 'utf8');
const injuries = catalogueInjuries();

console.log('=== TRAUMA TABLE ===');
console.log(`  catalogue carries ${injuries.size} injuries with a D66 roll`);

const app = entriesOf(arrayLiteral(src, 'OFFICIAL_TRAUMA_TABLE'));
console.log(`  app table has ${app.length} entries\n`);

const rows = [];
for (const e of app) {
  const cat = injuries.get(e.roll);
  let verdict, note;
  if (cat && key(cat) === key(e.title)) { verdict = 'MATCH'; note = ''; }
  else if (cat) { verdict = 'CONFLICT'; note = `catalogue says "${cat}"`; }
  else if (bookMentions(e.title)) { verdict = 'book only'; note = 'not in catalogue; name appears in the rulebook text'; }
  else { verdict = 'UNBACKED'; note = 'in neither source'; }
  rows.push({ ...e, verdict, note });
}

for (const r of rows) {
  const flag = r.verdict === 'MATCH' ? '  ' : r.verdict === 'book only' ? '? ' : '!!';
  console.log(`  ${flag} ${r.roll.padEnd(6)} ${r.title.padEnd(26)} ${r.verdict}${r.note ? '  — ' + r.note : ''}`);
}

const appRolls = new Set(app.map((e) => e.roll));
const missing = [...injuries].filter(([roll]) => !appRolls.has(roll));
if (missing.length) {
  console.log(`\n  MISSING from the app (${missing.length}) — in the catalogue, no row in the table:`);
  for (const [roll, title] of missing.sort()) console.log(`     ${roll}  ${title}`);
}

const tally = (v) => rows.filter((r) => r.verdict === v).length;
console.log(`\n  match ${tally('MATCH')}  book-only ${tally('book only')}  ` +
            `CONFLICT ${tally('CONFLICT')}  UNBACKED ${tally('UNBACKED')}  missing ${missing.length}`);

/* The exploration and skills tables have no catalogue equivalent with roll
   numbers, so the book is the only source — and its table extraction is the
   part that scrambled. Report what can and cannot be checked, and say which. */
console.log('\n=== EXPLORATION & SKILLS TABLES ===');
for (const name of ['OFFICIAL_COMMON_EXPLORATION', 'OFFICIAL_RARE_EXPLORATION',
                    'OFFICIAL_LEGENDARY_EXPLORATION', 'OFFICIAL_MELEE_SKILLS',
                    'OFFICIAL_RANGED_SKILLS', 'OFFICIAL_STEALTH_SKILLS',
                    'OFFICIAL_WILDCARD_SKILLS']) {
  const es = entriesOf(arrayLiteral(src, name));
  const seen = es.filter((e) => bookMentions(e.title));
  const unseen = es.filter((e) => !bookMentions(e.title));
  console.log(`\n  ${name}  (${es.length} entries)`);
  console.log(`    name found in rulebook text: ${seen.length}`);
  if (unseen.length) {
    console.log(`    NOT FOUND (${unseen.length}):`);
    for (const e of unseen) console.log(`       ${(e.roll || '—').padEnd(6)} ${e.title}`);
  }
}

console.log('\nNote: a name found in the rulebook text is not a verified table row.');
console.log('The PDF prints these as two-column tables and the extraction interleaves');
console.log('them with page furniture, so roll-to-result mapping cannot be read from it.');
console.log('Only the Trauma Table has a machine-readable source with roll numbers.');
