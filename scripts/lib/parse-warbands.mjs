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
import { toLines } from './lines.mjs';

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
  const lines = toLines(fs.readFileSync(src, 'utf8'));
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
  const lines = toLines(text);
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Z][A-Z\u2019' \u2013-]{5,60}) SPECIAL RULES\s*$/);
    if (!m) continue;
    const name = m[1].trim();
    const rules = [];
    let current = null;

    // A rule's text wraps across lines — "cannot include a Yüzbaşı," ends one
    // line and "Janissaries, or Sultanate Assassins." begins the next. Reading
    // only the first line truncates the rule mid-clause, which silently
    // defeats any downstream parsing of what it forbids.
    const flush = () => {
      if (current) rules.push({ name: current.name, description: current.parts.join(' ').replace(/\s+/g, ' ').trim() });
      current = null;
    };

    for (let j = i + 1; j < Math.min(i + 80, lines.length); j++) {
      const line = lines[j];
      if (/SPECIAL RULES\s*$/.test(line)) break;

      const r = line.match(/^\*\*\s*([^:]{3,60}):\s*(.*)$/);
      if (r) { flush(); current = { name: r[1].trim(), parts: [r[2].trim()] }; continue; }

      if (!current) continue;
      const t = line.trim();
      // Blank lines and the page's navigation furniture end a rule.
      if (!t || /^(Warband|Creation|Special|Rules|Armoury|Tables|Battlekit|Elite|Troops|Entries|Variants|Starting a|Keywords|Mercenaries|New Antioch|Trench Pilgrims|Iron Sultanate|Heretic Legions|Black Grail|The Court|-- \d+ of \d+ --)$/.test(t)) { flush(); continue; }
      if (/^[*•]/.test(t)) { current.parts.push(t.replace(/^[*•]\s*/, '')); continue; }
      current.parts.push(t);
    }
    flush();

    out.push({ name, specialRules: rules, line: i + 1 });
  }
  return out;
}

/**
 * The faction Armoury Tables.
 *
 * Rows are `Name \t [restrictions] \t cost glyph`, e.g.
 *
 *     Automatic Rifle \t Bayonet Lug, Limit: 1 \t 40 👑
 *     Sword/Axe \t 4 👑
 *
 * This is the authoritative list of what wargear legally exists, and the
 * restriction column ("ELITE only", "Limit: 2", "Combat Medic only") is the
 * wargear-legality data the roster validator needs.
 */
// Every section heading the Armoury Tables actually use. `Shields` was missing,
// so every shield in every faction's armoury was dropped — and once the armoury
// became the legality authority, that read as "this faction does not stock a
// Trench Shield", which is false. Derived by scanning the armoury blocks, not
// guessed.
const SECTIONS = new Set([
  'Ranged Weapons', 'Melee Weapons', 'Grenades', 'Shields', 'Armour', 'Equipment',
  'Battlekit', 'Glory Items', 'Relics',
]);

const nameKey = (n) => String(n ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * The faction Battlekit headings: `Name | 50 👑 | ELITE only, Limit: 1`.
 *
 * Each Armoury Table says what its bullet means:
 *
 *   "Battlekit with a bullet point [•] is unique to New Antioch Warbands, and
 *    its rules can be found in the New Antioch Battlekit section after the
 *    Armoury."   — Warbands L1283-L1286, and once per faction after it.
 *
 * So every bulleted armoury row is reprinted under a heading of this shape,
 * and the heading states the same three columns the row does — but delimited
 * by a pipe instead of by a tab. That is what makes a wrapped row recoverable
 * (see `repairWrappedRow`): the book itself says where the name ends.
 *
 * Only the NAME column is read from here. The restrictions and the price of
 * an armoury row are the Armoury Table's own — the heading's third column
 * wraps too (Heavy Ballistic Shield's runs onto L1405), and two sources for
 * one fact is how a reprint conflict gets decided by whichever parser ran
 * last. The exception is a heading that prints a CHOICE of price, which the
 * table folds into one cell and this is the only place that states cleanly.
 */
function battlekitHeadings(lines) {
  // `u`, because the currency is astral: without it `(\S)` captures half of
  // U+1F451 and the pipe that follows never matches. Every heading in the
  // book was dropped for exactly that reason on the first run of this.
  const HEADING = /^(.{2,60}?)\s*\|\s*(\d+)\s*(\S)\s*(?:or\s+(\d+)\s*(\S)\s*)?\|\s*(.+)$/u;
  const index = new Map();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.includes('|')) continue;
    const m = line.match(HEADING);
    if (!m) continue;
    const name = m[1].trim();
    if (!name || name.includes('\t')) continue;

    index.set(nameKey(name), {
      name,
      ducats: m[3] === GLORY_GLYPH ? 0 : Number(m[2]),
      glory: m[3] === GLORY_GLYPH ? Number(m[2]) : 0,
      // "15 👑 or 2 ☼" — a price that may be paid EITHER way. `{ducats,
      // glory}` means "and": `formatCost` renders it "15 Ducats + 2 Glory".
      // A row priced like this cannot be expressed by that shape, so it is
      // reported rather than guessed at.
      alternativePrice: m[4] ? `${m[4]} ${m[5]}` : null,
      line: i + 1,
    });
  }
  return index;
}

/** A cost at the end of a cell: `40 👑`, `2 ☼`. */
const COST_TAIL = /(\d+)\s*(\u{1F451}|☼)\s*$/u;

/**
 * Split a bulleted armoury row that extraction ran together into one string.
 *
 * Three rows in the book are long enough that the PDF wraps them, and the
 * wrap takes the tabs with it — the name and the restriction column arrive
 * fused, with no delimiter left to split on:
 *
 *     • Machine Armour ELITE & Mechanized Heavy Infantry only, Limit: 1
 *       excluding Mechanized Heavy Infantry 50 👑           (L1350-L1351)
 *     • Heavy Ballistic Shield Models wearing Machine Armour only,
 *       Shield Combo 15 👑                                  (L1345-L1346)
 *     • Compound Eyes Helmet ELITE & Heralds only, Headgear, Limit: 3 10 👑
 *                                                           (L7423-L7424)
 *
 * The name cannot be recovered from the row alone: "Models wearing Machine
 * Armour" is as plausible a name as "Heavy Ballistic Shield" is a restriction,
 * and a guess here writes wrong game data into the armoury that the legality
 * engine then enforces. The bullet is what makes it recoverable — it means
 * the item is reprinted under a Battlekit heading in the same book, and that
 * heading states the name in a column of its own.
 *
 * Returns null when no heading claims the row, and the caller throws: an
 * unrecognised row is a change in the book or in extraction, and silently
 * dropping it is how New Antioch lost its Armour table in the first place.
 */
function repairWrappedRow(text, headings) {
  const cost = text.match(COST_TAIL);
  if (!cost) return null;
  const body = text.slice(0, cost.index).trim();

  // Longest match wins, so a name that is a prefix of another cannot shadow
  // it. Nothing in the book relies on this today; it costs one sort.
  const candidates = [...headings.values()]
    .filter((h) => nameKey(body).startsWith(nameKey(h.name)))
    .sort((a, b) => b.name.length - a.name.length);
  if (!candidates.length) return null;

  const heading = candidates[0];
  return {
    name: heading.name,
    restrictions: body.slice(heading.name.length).replace(/^[\s,]+/, '').trim(),
    ducats: cost[2] === GLORY_GLYPH ? 0 : Number(cost[1]),
    glory: cost[2] === GLORY_GLYPH ? Number(cost[1]) : 0,
    heading,
  };
}

/**
 * Parse every faction's Armoury Table.
 *
 * Returns `{ rows, unreadable }`. `unreadable` carries the rows the book
 * prints that this shape cannot express, so the build can report them —
 * the same contract `carcassFrontMap.unreadable` already uses. A row that is
 * neither parsed nor reported is the failure this function had for three
 * factions: the table ended at the first wrapped row and everything below it
 * vanished without a word.
 */
export function parseArmouryTables(src = WARBANDS_TXT) {
  if (!fs.existsSync(src)) return { rows: [], unreadable: [] };
  const lines = toLines(fs.readFileSync(src, 'utf8'));
  const headings = battlekitHeadings(lines);
  const out = [];
  const unreadable = [];
  let section = null;
  let faction = null;
  /* A bulleted row whose tabs extraction lost, collected until its cost. */
  let wrapped = null;

  const emitWrapped = (endLine) => {
    if (!wrapped) return;
    const { text, line } = wrapped;
    wrapped = null;

    const row = repairWrappedRow(text, headings);
    if (!row) {
      throw new Error(
        `parseArmouryTables: ${src}:${line} is a bulleted ${faction} ${section} row `
        + `whose columns extraction ran together, and no Battlekit heading in the `
        + `book claims it:\n    ${text}\n`
        + `  The bullet means the item is reprinted under a "Name | cost | restrictions" `
        + `heading. Either the book changed or extraction did; splitting it by guess `
        + `would write invented game data into the armoury.`
      );
    }
    if (row.heading.alternativePrice) {
      unreadable.push({
        faction, section, name: row.name, line: endLine,
        reason: `priced "${row.ducats || row.glory} ${row.ducats ? '\u{1F451}' : GLORY_GLYPH}`
          + ` or ${row.heading.alternativePrice}" — an armoury row carries one price, not a choice`,
      });
      return;
    }
    out.push({
      name: row.name,
      faction,
      section,
      restrictions: row.restrictions,
      ducats: row.ducats,
      glory: row.glory,
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+$/, '');
    const bare = line.trim();

    // Each faction's Armoury Table announces itself. This is the only thing
    // that says which armoury a row belongs to, and it matters: pricing is per
    // faction — an Automatic Rifle is 40 Ducats in one armoury and 2 Glory in
    // another — so a row without its faction cannot be priced at all.
    const owner = bare.match(/^(.+?)\s+(?:Warbands\s+)?can have the following Battlekit/i);
    if (owner) { emitWrapped(i + 1); faction = owner[1].trim(); section = null; continue; }

    if (SECTIONS.has(bare)) { emitWrapped(i + 1); section = bare; continue; }
    if (!section) continue;

    if (!line.includes('\t')) {
      /*
        A line with no tab is either the start of a wrapped bulleted row, its
        continuation, or the prose that follows the table.

        Reading it as "the table has ended" is what truncated three tables.
        The continuation of a wrapped row looks exactly like ordinary prose —
        "Limit: 1 excluding Mechanized Heavy Infantry 50 👑" begins with no
        bullet and no capital — so the old rule cleared the section on it and
        skipped every properly-tabbed row below, including Standard Armour,
        which has no restrictions at all and wraps nothing.
      */
      if (/^[•·]/.test(bare)) {
        emitWrapped(i);
        wrapped = { text: bare.replace(/^[•·]\s*/, ''), line: i + 1 };
        continue;
      }
      if (wrapped) {
        wrapped.text = `${wrapped.text} ${bare}`.replace(/\s+/g, ' ').trim();
        if (COST_TAIL.test(wrapped.text)) emitWrapped(i + 1);
        continue;
      }
      // "or 2 ☼" (L7426) continues the row above with a second, alternative
      // price. It is not the end of the table, and the row it belongs to has
      // already been reported by `emitWrapped` or below.
      if (/^or\s+\d+\s*\S\s*$/.test(bare)) continue;
      if (bare) section = null;
      continue;
    }

    emitWrapped(i);

    const cells = line.split('\t').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;

    const costCell = cells.at(-1);
    const m = costCell.match(/^(\d+)\s*(\S)?/);
    const name = cells[0].replace(/^[•·]\s*/, '').trim();
    if (!name || /^\d/.test(name)) continue;

    if (!m) {
      /*
        A tabbed row whose cost extraction folded into the restriction cell:
        "• Grail Devotee \t ELITE only, Limit: 2 15 👑" with "or 2 ☼" beneath
        (L7425-L7426). The Battlekit heading states both prices (L7495), and
        `{ducats, glory}` reads as "and" — `formatCost` renders it "15 Ducats
        + 2 Glory" — so there is no honest way to record a choice between them
        in this shape. Reported, not guessed.
      */
      const tail = costCell.match(COST_TAIL);
      const heading = headings.get(nameKey(name));
      unreadable.push({
        faction, section, name, line: i + 1,
        reason: heading?.alternativePrice
          ? `priced "${heading.ducats || heading.glory} `
            + `${heading.ducats ? '\u{1F451}' : GLORY_GLYPH} or ${heading.alternativePrice}"`
            + ` — an armoury row carries one price, not a choice`
          : `no cost could be read from its last column: "${costCell}"`,
      });
      if (!tail && !heading) {
        throw new Error(
          `parseArmouryTables: ${src}:${i + 1} is a ${faction} ${section} row with no `
          + `readable cost and no Battlekit heading to price it:\n    ${bare}`
        );
      }
      continue;
    }

    out.push({
      name,
      faction,
      section,
      restrictions: cells.length > 2 ? cells.slice(1, -1).join(', ') : '',
      ducats: m[2] === GLORY_GLYPH ? 0 : Number(m[1]),
      glory: m[2] === GLORY_GLYPH ? Number(m[1]) : 0,
    });
  }

  emitWrapped(lines.length);
  return { rows: out, unreadable };
}

/**
 * Faction-level Warband Creation rules: the starting budget and the special
 * rules that apply to every warband of that faction, variants included.
 *
 * These are distinct from the variant rules `parseVariants` reads. The book
 * states them once per faction under a stable heading:
 *
 *     Warband Creation
 *     You have 700 👑  to recruit a New Antioch Warband for a campaign
 *     Special Rules
 *     The following special rules apply to New Antioch Warbands (including
 *     any New Antioch Variant Warbands):
 *     ** New Antioch Fireteams: A New Antioch Warband can include up to 2
 *     Fireteams. …
 *
 * They are the source for both the budget presets (2.5) and the faction
 * special rules the engine enforces (2.5a). The catalogues do not carry them:
 * they carry the *variant* overrides ("up to 3 Fireteams instead of only 2"),
 * which only make sense against a base this supplies.
 */
export function parseFactionRules(src = WARBANDS_TXT) {
  if (!fs.existsSync(src)) return [];
  const clean = (x) => String(x ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const lines = toLines(fs.readFileSync(src, 'utf8'));
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    if (clean(lines[i]) !== 'Warband Creation') continue;

    // The budget sentence names the faction, so both come from one match.
    let budget = null;
    let faction = null;
    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      const m = clean(lines[j]).match(/You have\s+([\d,]+)\s*👑?\s*to recruit an?\s+(.+?)\s+Warband/i);
      if (m) {
        budget = Number(m[1].replace(/,/g, ''));
        faction = clean(m[2]);
        break;
      }
    }
    if (!faction) continue;

    /*
      The faction's alignment, from the sentence that closes the paragraph.

      "New Antioch Warbands are Faithful." (L1241), "The Heretic Legions are
      Fallen." (L5994), and four more — one per Warband Creation block, always
      within a line or two of the budget sentence, and the Court's wraps
      across two lines (L8379-8380), so the window is joined before matching.

      Load-bearing rather than decorative: a Mercenary's hosts are stated by
      alignment ("any Faithful Mercenaries that can be taken by Trench Pilgrim
      Warbands"), and until now only the Carcass Front lists carried one.

      Read, never defaulted. A block that states no alignment throws, because
      the alternative is a filter that quietly matches the wrong Warbands —
      and `carcass-front-layer.mjs` already warns that inventing an alignment
      "is the failure this pipeline exists to prevent". All six blocks state
      one; if a future edition drops the sentence, that is worth stopping for.
    */
    const window = lines.slice(i + 1, Math.min(i + 10, lines.length))
      .map(clean).join(' ');
    const align = window.match(/\bare\s+(Faithful|Fallen)\s*\./i);
    if (!align) {
      throw new Error(
        `parse-warbands: the "${faction}" Warband Creation block states no `
        + 'alignment ("… are Faithful." / "… are Fallen."). Mercenary hosts are '
        + 'stated by alignment, so guessing one would offer models to the wrong '
        + 'Warbands. Check the extract around the budget sentence.',
      );
    }
    const alignment = align[1][0].toUpperCase() + align[1].slice(1).toLowerCase();

    // Then the special-rule bullets, up to the next major heading.
    const rules = [];
    let current = null;
    for (let j = i + 1; j < Math.min(i + 90, lines.length); j++) {
      const line = clean(lines[j]);
      if (/^(Armoury|Warband Entries|Elite Warband|Battlekit)$/i.test(line)) break;

      const bullet = line.match(/^\*\*\s*(.+?):\s*(.*)$/);
      if (bullet) {
        current = { name: clean(bullet[1]), description: clean(bullet[2]) };
        rules.push(current);
        continue;
      }
      // A sub-bullet ("* Concentrated Attack: …") and any wrapped line belong
      // to the rule above; the PDF wraps mid-sentence constantly.
      if (current && line && !/^-- \d+ of \d+ --$/.test(line)) {
        current.description = clean(`${current.description} ${line}`);
      }
    }

    // A faction with no special rules says so ("No special rules apply to a
    // standard Iron Sultanate Warband"). That is data, not a parse failure —
    // dropping it would lose the budget too and make the faction look missing.
    let explicitlyNone = false;
    for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
      if (/^No special rules apply/i.test(clean(lines[j]))) { explicitlyNone = true; break; }
    }
    out.push({ faction, budget, alignment, specialRules: rules, explicitlyNone });
  }

  // A faction is described once; later repeats are page furniture.
  const seen = new Set();
  return out.filter((f) => {
    const k = f.faction.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * The economy a Warband Variant states for itself, read out of its rule prose.
 *
 * Almost every warband musters on its faction's 700 👑 and no Glory. One does
 * not: the Papal States Intervention Force's "Specialist Force" rule (Warbands
 * p.35, as changed by the 1.0.2 errata) states a different starting purse, a
 * Threshold Value shifted against the standard table, and Glory paid out at
 * Reinforcements. A player was mustering Papal States on 700 👑 because none of
 * that was data — the app printed the rule and then ignored it.
 *
 * The numbers are read, not typed. Both sources are supported because they
 * spell the currencies differently and neither is authoritative alone:
 *
 *   Warbands PDF   "You have 500 👑  and 11 ☼ to recruit a … Warband"
 *   catalogue      "You have 500 Ducats and 11 Glory to recruit a … Warband"
 *
 * Returns `null` when a rule set states no economy at all, which is the case
 * for 26 of the 27 variants and is not a parse failure. A rule that states one
 * and cannot be read is a different thing entirely, and throws: a variant
 * silently mustering on the standard purse is the bug this exists to stop.
 */
const DUCATS = '(?:👑|Ducats?)';
const GLORY = '(?:☼|Glory(?:\\s+Points?)?)';

export function parseVariantEconomy(specialRules = []) {
  const economy = {};
  let statedIn = null;

  for (const rule of specialRules) {
    const text = String(rule?.description ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ');

    // "You have 500 👑 and 11 ☼ to recruit a … Warband for a campaign".
    // The Glory half is optional: a variant could state a purse in Ducats only.
    const purse = text.match(
      new RegExp(`You have\\s+([\\d,]+)\\s*${DUCATS}\\s*(?:and\\s+([\\d,]+)\\s*${GLORY}\\s*)?to recruit`, 'i'));
    if (purse) {
      economy.budget = {
        ducats: Number(purse[1].replace(/,/g, '')),
        glory: purse[2] ? Number(purse[2].replace(/,/g, '')) : 0,
      };
      statedIn = rule.name;
    }

    // "In a campaign, its Threshold Value is reduced by 200 👑". Stored as a
    // signed delta against the Warband Threshold Table rather than a replacement
    // value, because the table itself still governs — the rule shifts it.
    const threshold = text.match(
      new RegExp(`Threshold Value is (reduced|increased) by\\s+([\\d,]+)\\s*${DUCATS}`, 'i'));
    if (threshold) {
      const magnitude = Number(threshold[2].replace(/,/g, ''));
      economy.thresholdDelta = /reduced/i.test(threshold[1]) ? -magnitude : magnitude;
      statedIn = statedIn ?? rule.name;
    }

    // "gains 4 ☼ each time it calls for Reinforcements".
    const reinforcement = text.match(
      new RegExp(`gains?\\s+([\\d,]+)\\s*${GLORY}\\s*each time it calls for Reinforcements`, 'i'));
    if (reinforcement) {
      economy.reinforcementGlory = Number(reinforcement[1].replace(/,/g, ''));
      statedIn = statedIn ?? rule.name;
    }
  }

  if (!statedIn) {
    /*
      Nothing was read. Before concluding "this variant uses the standard
      economy", check that no rule was *trying* to state one — a wording the
      patterns above do not cover would otherwise pass as silence, and silence
      here means the app musters the warband on the wrong purse without a word.
    */
    const suspicious = specialRules.find((rule) => {
      const text = String(rule?.description ?? '').replace(/\s+/g, ' ');
      return new RegExp(`You have\\s+[\\d,]+\\s*${DUCATS}|Threshold Value is`, 'i').test(text);
    });
    if (suspicious) {
      throw new Error(
        `parseVariantEconomy: '${suspicious.name}' states a starting purse or a `
        + 'Threshold Value but no pattern here could read it. Read it or widen the '
        + `pattern — do not ship the variant on the standard 700: ${
          String(suspicious.description).replace(/\s+/g, ' ').slice(0, 200)}`);
    }
    return null;
  }

  return { ...economy, statedIn };
}
