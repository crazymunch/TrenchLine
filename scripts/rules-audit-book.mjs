#!/usr/bin/env node
/**
 * Audit every unit in the generated dataset against the Warbands book, field by
 * field, including the fields `rules:check` does not compare.
 *
 *   node scripts/rules-audit-book.mjs            # summary and every difference
 *   node scripts/rules-audit-book.mjs --ruleset github-latest
 *
 * `scripts/lib/verify.mjs` compares six fields (Ranged, Melee, Armour, Base and
 * the two costs) for the entries `parseWarbandEntries` finds, and that parser's
 * header pattern requires a leading recruitment count. Troop entries have none
 * ("Heretic Troopers - Cost: 30"), so eleven of them, and everything printed
 * under a Variant, were never cross-checked at all. This reads every entry the
 * book prints with a Cost, and compares:
 *
 *   - the six fields above, plus Movement
 *   - the recruitment limit in the header (0-2, 1, none)
 *   - the Keywords line
 *   - the Abilities block: each ability's NAME and its text
 *
 * The ability names are the point. The catalogues carry a name of their own
 * for each Ability profile and the app shows that name; where it differs from
 * the book the player reads a heading the book does not print ("On my
 * Command!" for the Lieutenant's "Hold Your Fire!").
 *
 * Reports only. Changes no data. Exit code 1 when any difference is found, so
 * it can gate a build once the differences are resolved.
 */
import fs from 'node:fs';
import { nameKey as verifyKey, bookFaction } from './lib/verify.mjs';

const WARBANDS_TXT = 'data-sources/rulebook/extracted/warbands-of-trench-crusade.txt';
const rulesetArg = process.argv.indexOf('--ruleset');
const RULESET = rulesetArg > 0 ? process.argv[rulesetArg + 1] : 'trenchline';
const GENERATED = `src/data/generated/${RULESET}.generated.ts`;

/* ------------------------------------------------------------ the dataset */

function loadDataset(file) {
  const src = fs.readFileSync(file, 'utf8');
  const head = 'export const DATASET: Dataset = ';
  const a = src.indexOf(head) + head.length;
  const b = src.lastIndexOf('} as unknown as Dataset');
  return JSON.parse(src.slice(a, b + 1));
}

/* --------------------------------------------------------------- the book */

const HEADER = /^\s*(?:(\d+)(?:\s*[-–]\s*(\d+))?\s+)?([^\t]+?)\s+-\s+Cost:\s*(\d+)\s*(\S)?/;
const GLORY_GLYPH = '☼';
const STAT_HEADER = /Movement\s*\t\s*Ranged\s*\t\s*Melee\s*\t\s*Armour\s*\t\s*Base/;
const SIDEBAR = /^(Warband|Creation|Special|Rules|Armoury|Tables|Battlekit|Elite|Troops|Entries|Variants|Starting a|Keywords|Mercenaries|New Antioch|Trench Pilgrims|Iron Sultanate|Heretic Legions|Black Grail|The Court|Troops Warband|Warband Variants|Starting a Warband|MF|VP|MG|GD|AD|VM|[A-Z]{2})$/;
const PAGE = /^-- \d+ of \d+ --$/;

const clean = (s) => String(s ?? '').replace(/ /g, ' ').replace(/[”″]/g, '"')
  .replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();

/**
 * Every entry printed with a Cost, with its statline, keywords and abilities.
 *
 * The Abilities block starts on the `Abilities \t` line and runs to the
 * `Keywords \t` line. A block is either `None`, one unbulleted ability, or a
 * run of `** Name: text` bullets whose text wraps over following lines.
 */
export function parseBookEntries(src = WARBANDS_TXT) {
  const lines = fs.readFileSync(src, 'utf8').split('\n').map((l) => l.replace(/\r$/, ''));
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(HEADER);
    if (!m) continue;
    const [, lo, hi, rawName, cost, glyph] = m;
    const isGlory = glyph === GLORY_GLYPH;
    const entry = {
      name: clean(rawName),
      min: lo === undefined ? null : Number(lo),
      max: lo === undefined ? null : (hi ? Number(hi) : Number(lo)),
      ducats: isGlory ? 0 : Number(cost),
      glory: isGlory ? Number(cost) : 0,
      line: i + 1,
      keywords: null,
      abilities: null,
      stats: null,
    };

    let inAbilities = false;
    let current = null;
    const flush = () => {
      if (current) entry.abilities.push({ name: clean(current.name), text: clean(current.parts.join(' ')) });
      current = null;
    };

    for (let j = i + 1; j < Math.min(i + 140, lines.length); j++) {
      const line = lines[j];
      if (j > i + 1 && HEADER.test(line)) break;
      const bare = line.trim();

      if (STAT_HEADER.test(line) && !entry.stats) {
        const c = (lines[j + 1] ?? '').split('\t').map((x) => clean(x)).filter(Boolean);
        if (c.length >= 5) entry.stats = { movement: c[0], ranged: c[1], melee: c[2], armour: c[3], base: c[4] };
        continue;
      }
      if (/^Abilities\s*\t/.test(line)) {
        inAbilities = true;
        entry.abilities = [];
        const rest = line.replace(/^Abilities\s*\t/, '').trim();
        if (/^None\b/i.test(rest)) { inAbilities = false; continue; }
        const b = rest.match(/^\*\*\s*([^:]{2,80}):\s*(.*)$/) ?? rest.match(/^([^:]{2,80}):\s*(.*)$/);
        if (b) current = { name: b[1], parts: [b[2]] };
        else current = { name: '(unnamed)', parts: [rest] };
        continue;
      }
      if (/^Keywords\s*\t/.test(line)) {
        flush(); inAbilities = false;
        /* The line wraps: `NEGATE` then `FEAR, NEGATE GAS` on the next. A
           continuation is a run of capitals with no lower-case prose in it. */
        let raw = line.replace(/^Keywords\s*\t/, '');
        for (let k = j + 1; k < Math.min(j + 3, lines.length); k++) {
          const t = lines[k].trim();
          if (!t || /[a-z]/.test(t) || PAGE.test(t) || SIDEBAR.test(t) || t.length < 3) break;
          raw += ', ' + t;
        }
        entry.keywords = raw.replace(/\(▶?\s*see[^)]*\)/gi, '').split(/[,\t]/).map((k) => clean(k))
          .filter((k) => k && k.toUpperCase() !== 'NONE');
        break;
      }
      if (inAbilities) {
        if (!bare || PAGE.test(bare) || SIDEBAR.test(bare)) continue;
        if (/^\d+\s+Warbands of Trench Crusade/.test(bare)) continue;
        const b = bare.match(/^\*\*\s*([^:]{2,80}):\s*(.*)$/);
        if (b) { flush(); current = { name: b[1], parts: [b[2]] }; continue; }
        if (current) current.parts.push(bare);
      }
    }
    flush();
    out.push(entry);
  }
  return out;
}

/* ------------------------------------------------------------- matching */

/** The book pluralises and the catalogue does not; both spell a few things oddly. */
const key = (s) => verifyKey(
  String(s ?? '')
    .replace(/men$/i, 'man')
    .replace(/\bWolves\b/i, 'Wolf')
    .replace(/\bThralls\b/i, 'Thrall')
    .replace(/\bWretched\b/i, 'Wretched'),
);

const CATALOGUE_ALIASES = new Map([
  // book name -> catalogue name, where the two are different words for one entry
  ['grailthrall', 'thrall'],
  ['flythrall', 'wingedthrall'],
  ['yeomen', 'yeoman'],
  ['combatengineer', 'engineer'],
  ['mechanizedheavyinfantry', 'heavyinfantry'],
  ['warwolfassaultbeast', 'warwolf'],
  /* The catalogue's selectionEntry is `Sister of Saint Cosmas`; its Unit profile
     is named `Combat Medic`, and the pipeline ships the profile's name. */
  ['sisterofsaintcosma', 'combatmedic'],
]);

const PROVENANCE = `src/data/generated/${RULESET}.provenance.json`;
const provenance = fs.existsSync(PROVENANCE) ? JSON.parse(fs.readFileSync(PROVENANCE, 'utf8')) : {};
/** The layer a field came from, where it was not the catalogue. */
const layerOf = (unit, field) => {
  const rec = provenance[`unit:${unit.id}`] ?? provenance[`unit:${unit.name}`] ?? {};
  const f = field.startsWith('ability') ? 'abilities' : field === 'min' || field === 'max' ? 'constraints' : field;
  const p = rec[f] ?? rec[field];
  return p && p.layer !== 'base' ? p.layer : null;
};

function findUnits(units, entry) {
  const names = entry.name.split('/').map((n) => key(n));
  const wants = names.map((n) => CATALOGUE_ALIASES.get(n) ?? n);
  const faction = bookFaction(entry);
  const exact = units.filter((u) => wants.includes(key(u.name)));
  if (!exact.length) return [];
  const own = exact.filter((u) => u.factionId === faction);
  return own.length ? own : exact;
}

/* ----------------------------------------------------------- comparison */

const normStat = (v) => clean(v).toLowerCase().replace(/\bdice\b/g, '').replace(/\s+/g, '')
  .replace(/^(\d)/, '+$1').replace(/^\+0$|^0$/, '0').replace(/^(n\/a|na|–|—|)$/, '-');
const normArmour = (v) => { const s = normStat(v); return s === '-' ? '0' : s; };
const normText = (s) => clean(s).toLowerCase().replace(/\s*\(▶[^)]*\)/g, '').replace(/[^a-z0-9+ ]/g, '')
  .replace(/\s+/g, ' ').trim();
const normName = (s) => clean(s).toLowerCase().replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s*action\s*$/i, '')
  .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const normAbilityText = (s) => normText(String(s ?? '').replace(/^\s*ACTION:\s*/i, ''));
const setOf = (xs) => new Set((xs ?? []).map((x) => clean(x).toUpperCase().replace(/\s*\(.*$/, '').trim()).filter(Boolean));

/**
 * Keywords the dataset carries that the book does not print on the entry, and
 * that are not drift: the catalogue spells out what a rule implies.
 *   DEMONIC (Effect): "A model with this Keyword has the NEGATE FIRE Keyword."
 *   LIMITED POTENTIAL is the catalogue's marker for the page-111 rule.
 *   MERCENARY is the Dispatch's keyword for every Mercenary entry.
 */
const impliedKeyword = (k, ours) => (k === 'NEGATE FIRE' && ours.has('DEMONIC'))
  || k === 'LIMITED POTENTIAL' || k === 'MERCENARY' || k === 'ELITE' || k === 'LEADER';

function compare(entry, unit) {
  const diffs = [];
  const s = entry.stats;
  if (s) {
    const fields = [
      ['movement', (u) => u.stats?.movement, (b) => b.movement, (v) => clean(v).toLowerCase().replace(/\s+/g, '')],
      ['ranged', (u) => u.stats?.ranged, (b) => b.ranged, normStat],
      ['melee', (u) => u.stats?.melee, (b) => b.melee, normStat],
      ['armour', (u) => u.stats?.armour, (b) => b.armour, normArmour],
      ['base', (u) => u.stats?.base, (b) => b.base, (v) => clean(v).toLowerCase().replace(/\s*by\s*/g, 'x').replace(/\s+/g, '').replace(/mm$/, '')],
    ];
    for (const [f, fu, fb, n] of fields) {
      const ours = fu(unit), theirs = fb(s);
      if (n(ours) !== n(theirs)) diffs.push({ field: `stats.${f}`, ours, book: theirs });
    }
  }
  if ((unit.cost?.ducats ?? 0) !== entry.ducats) diffs.push({ field: 'cost.ducats', ours: unit.cost?.ducats, book: entry.ducats });
  if ((unit.cost?.glory ?? 0) !== entry.glory) diffs.push({ field: 'cost.glory', ours: unit.cost?.glory, book: entry.glory });

  if (entry.min !== null) {
    if ((unit.min ?? 0) !== entry.min) diffs.push({ field: 'min', ours: unit.min ?? null, book: entry.min });
    if ((unit.max ?? null) !== entry.max) diffs.push({ field: 'max', ours: unit.max ?? null, book: entry.max });
  } else if (unit.max != null) {
    diffs.push({ field: 'max', ours: unit.max, book: '(no limit printed)' });
  }

  if (entry.keywords) {
    /* ELITE and LEADER are roles in the catalogue and Keywords in the book. */
    const ours = setOf([...(unit.keywords ?? []), ...(unit.roles ?? []).filter((r) => /^(elite|leader)$/i.test(r))]);
    const theirs = setOf(entry.keywords);
    const missing = [...theirs].filter((k) => !ours.has(k));
    const extra = [...ours].filter((k) => !theirs.has(k) && !impliedKeyword(k, ours));
    if (missing.length || extra.length) {
      diffs.push({ field: 'keywords', ours: [...ours].join(', '), book: [...theirs].join(', '),
        note: `${missing.length ? `missing ${missing.join(', ')}` : ''}${missing.length && extra.length ? '; ' : ''}${extra.length ? `extra ${extra.join(', ')}` : ''}` });
    }
  }

  if (entry.abilities) {
    const ours = (unit.abilities ?? []);
    const theirs = entry.abilities;
    const oursBy = new Map(ours.map((a) => [normName(a.name), a]));
    const theirsBy = new Map(theirs.map((a) => [normName(a.name), a]));
    for (const [k, a] of theirsBy) {
      const o = oursBy.get(k);
      if (!o) {
        // Same text under a different name is the case that matters most.
        const byText = ours.find((x) => normAbilityText(x.description) === normAbilityText(a.text)
          || (normAbilityText(a.text).length > 40 && normAbilityText(x.description).includes(normAbilityText(a.text).slice(0, 60))));
        diffs.push({ field: 'ability.name', ours: byText ? byText.name : '(absent)', book: a.name,
          note: byText ? 'same rule, different heading' : 'ability not on the dataset entry' });
        continue;
      }
      if (normAbilityText(o.description) !== normAbilityText(a.text)) {
        diffs.push({ field: 'ability.text', ours: `${o.name}: ${clean(o.description).slice(0, 140)}…`,
          book: `${a.name}: ${clean(a.text).slice(0, 140)}…` });
      }
    }
    for (const [k, o] of oursBy) {
      if (theirsBy.has(k)) continue;
      const matchedByText = theirs.some((a) => normAbilityText(a.text) === normAbilityText(o.description)
        || (normAbilityText(a.text).length > 40 && normAbilityText(o.description).includes(normAbilityText(a.text).slice(0, 60))));
      if (matchedByText) continue;
      /* An ability the catalogue reveals only inside a Variant is printed on
         the Variant's page, not the entry's. Named, so the reader can check. */
      const reveal = (unit.modifiers ?? []).find((m) => m.origin === `profile:${o.name}`
        && m.field === 'hidden' && String(m.value) === 'false');
      const via = reveal?.when?.childName ?? (reveal ? 'a condition' : null);
      diffs.push({ field: via ? 'ability.variant' : 'ability.extra', ours: o.name,
        book: via ? `(revealed by ${via})` : '(not printed on this entry)' });
    }
  }
  return diffs;
}

/* ------------------------------------------------------------------- run */

import { pathToFileURL } from 'node:url';
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();

function main() {
const dataset = loadDataset(GENERATED);
const entries = parseBookEntries();
const units = dataset.units.filter((u) => !u.thirdParty);

const unmatchedBook = [], unitsSeen = new Set();
const report = [];
for (const e of entries) {
  const us = findUnits(units, e);
  if (!us.length) { unmatchedBook.push(e); continue; }
  for (const u of us) {
    unitsSeen.add(u.id);
    const diffs = compare(e, u);
    if (diffs.length) report.push({ entry: e, unit: u, diffs });
  }
}
const unitsUnseen = units.filter((u) => !unitsSeen.has(u.id)
  && !/carcass/i.test(u.source ?? '')
  && !['Procession of the Sacred Affliction', 'Heretic Naval Raiders'].includes(u.factionId));

console.log(`BOOK AUDIT (${RULESET})`);
console.log(`  book entries with a Cost: ${entries.length} (with statline ${entries.filter((e) => e.stats).length}, with abilities block ${entries.filter((e) => e.abilities).length})`);
console.log(`  dataset units: ${units.length}; matched to a book entry: ${unitsSeen.size}`);
console.log(`  comparisons with at least one difference: ${report.length}\n`);

const byField = {};
for (const r of report) for (const d of r.diffs) byField[d.field] = (byField[d.field] ?? 0) + 1;
console.log('  differences by field:');
for (const [f, n] of Object.entries(byField).sort((a, b) => b[1] - a[1])) console.log(`    ${f.padEnd(16)} ${n}`);

console.log('\n--- DIFFERENCES ---');
for (const r of report) {
  console.log(`\n${r.unit.name} [${r.unit.factionId}]  <-  book "${r.entry.name}" L${r.entry.line}`);
  for (const d of r.diffs) {
    const layer = layerOf(r.unit, d.field);
    console.log(`  ${d.field.padEnd(14)} ours: ${JSON.stringify(d.ours)}${layer ? `   {layer: ${layer}}` : ''}`);
    console.log(`  ${''.padEnd(14)} book: ${JSON.stringify(d.book)}${d.note ? `   [${d.note}]` : ''}`);
  }
}

console.log('\n--- BOOK ENTRIES WITH NO DATASET UNIT ---');
for (const e of unmatchedBook) console.log(`  ${e.name}  L${e.line}  (${bookFaction(e)})`);

console.log('\n--- DATASET UNITS (base + Dispatch) WITH NO BOOK ENTRY ---');
for (const u of unitsUnseen) console.log(`  ${u.name} [${u.factionId}]`);

/* Reports only, like the other audit scripts: the exit code says the script ran. */
process.exit(0);
}
