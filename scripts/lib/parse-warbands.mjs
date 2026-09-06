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

export function parseArmouryTables(src = WARBANDS_TXT) {
  if (!fs.existsSync(src)) return [];
  const lines = fs.readFileSync(src, 'utf8').split('\n');
  const out = [];
  let section = null;
  let faction = null;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const bare = line.trim();

    // Each faction's Armoury Table announces itself. This is the only thing
    // that says which armoury a row belongs to, and it matters: pricing is per
    // faction — an Automatic Rifle is 40 Ducats in one armoury and 2 Glory in
    // another — so a row without its faction cannot be priced at all.
    const owner = bare.match(/^(.+?)\s+(?:Warbands\s+)?can have the following Battlekit/i);
    if (owner) { faction = owner[1].trim(); section = null; continue; }

    if (SECTIONS.has(bare)) { section = bare; continue; }
    if (!section) continue;
    if (!line.includes('\t')) {
      // A run of non-row lines means the table has ended.
      if (bare && !/^[•·]/.test(bare)) section = null;
      continue;
    }

    const cells = line.split('\t').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;

    const costCell = cells.at(-1);
    const m = costCell.match(/^(\d+)\s*(\S)?/);
    if (!m) continue;

    const name = cells[0].replace(/^[•·]\s*/, '').trim();
    if (!name || /^\d/.test(name)) continue;

    out.push({
      name,
      faction,
      section,
      restrictions: cells.length > 2 ? cells.slice(1, -1).join(', ') : '',
      ducats: m[2] === GLORY_GLYPH ? 0 : Number(m[1]),
      glory: m[2] === GLORY_GLYPH ? Number(m[1]) : 0,
    });
  }
  return out;
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
  const lines = fs.readFileSync(src, 'utf8').split('\n');
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
    out.push({ faction, budget, specialRules: rules, explicitlyNone });
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
