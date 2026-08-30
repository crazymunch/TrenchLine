/**
 * The Battlekit chapter of the digital rulebook: descriptions and profiles.
 *
 * The Codex's arsenal was the last hand-written game data in the app — 34
 * entries with typed Ducat costs, typed keywords and typed rules text. The
 * costs were the worst of it, because wargear is priced **per faction**: an
 * Automatic Rifle is 40 Ducats in one Armoury and 2 Glory in another, and a
 * single `cost: 50` on one shared record cannot be right for more than one
 * faction at a time.
 *
 * Pricing already has an authority — `src/rules/armoury.ts`, 213 rows across
 * six factions. What the armoury does not carry is the prose: the description
 * of what a weapon *is*, and the per-item special rules printed under its
 * profile. Both are published, in this chapter, so both are derived here.
 *
 * The chapter is regular in a way most of the rulebook is not. Every entry is:
 *
 *     Anti-Materiel Rifle                     <- name, on its own line
 *     Enormous long rifles designed to …      <- description, wrapped
 *     Type \t Range \t Keywords               <- the profile header, verbatim
 *     2-Handed \t 36'' +1 INJURY DICE, …      <- the row, wrapping on keywords
 *     ** Focused Fire: When this Weapon …     <- zero or more special rules
 *
 * All 56 profiles in the chapter use that one header, Equipment and Armour
 * included, which is what makes a single parser sufficient.
 *
 * Nothing here invents a cost. The profile row carries Type, Range and
 * Keywords and no price at all — the rulebook prints prices only in the
 * Armoury Tables — so a caller wanting a price must ask the armoury.
 */
import fs from 'node:fs';

export const RULEBOOK_TXT =
  'data-sources/rulebook/extracted/trench-crusade-digital-rulebook.txt';

/** The running header stamped on every page of the chapter, misextracted and all. */
const PAGE_HEADER = /BaThlekit-/;
const PAGE_BREAK = /^-- \d+ of \d+ --$/;

/** `Type \t Range \t Keywords`, the one profile header the chapter uses. */
const PROFILE_HEADER = /^Type\s+Range\s+Keywords\s*$/;

/** A special rule printed under a profile. */
const BULLET = /^\*\*\s*/;
/** A `* ` sub-bullet nested under a special rule. */
const SUB_BULLET = /^\*\s+/;

/**
 * The chapter-navigation strip the PDF prints down the edge of every page.
 *
 * It extracts as a run of bare words at the foot of the page, and every one of
 * them — `Armour`, `Equipment`, `Grenades` — is also a real word in the body.
 * They are only furniture at the very end of a page, so they are stripped from
 * the end backwards and never by a global filter.
 */
const SIDEBAR = new Set([
  'Introduction', 'The World', 'in Flames', 'Core Rules', 'Comprehensive',
  'Rules', 'Keywords', 'Terrain', 'Battlekit', 'Campaign', 'Scenarios',
  'Ranged', 'Weapons', 'Melee', 'Grenades', 'Shields', 'Armour', 'Equipment',
]);

/** A keyword continuation line: keywords are set in caps, prose is not. */
const isKeywordRun = (l) => !/[a-z]/.test(l) && /[A-Z0-9]/.test(l);

/**
 * The six section headings the chapter is divided into.
 *
 * They matter for two reasons. They give each entry its section without having
 * to infer one from the Armoury Table, and — the reason they are load-bearing —
 * each is followed by a paragraph of section-wide prose. Without cutting the
 * tail at a heading, that prose lands on the *previous* entry: the Armour
 * section's note about not double-counting Injury Modifiers was being attributed
 * to the Trench Shield, and the Equipment section's duplicate rule to Standard
 * Armour. Both read as plausible per-item rules, which is exactly the kind of
 * wrong that never gets noticed.
 */
const SECTIONS = new Set([
  'Ranged Weapons', 'Melee Weapons', 'Grenades', 'Shields', 'Armour', 'Equipment',
]);

/** A wrapped prose line ends mid-sentence; a finished one does not. */
const endsSentence = (l) => /[.!?]["'”’)]?\s*$/.test(l);

/**
 * A name line is short and does not finish a sentence.
 *
 * Description lines are set justified and run to about 80 characters, so the
 * only short ones are the last line of a paragraph — and those end in a full
 * stop. That is the whole distinction, and it is checked rather than trusted:
 * `parseBattlekit` reports every entry it read so a caller can assert the
 * count, and `rules:build` fails if the chapter stops yielding profiles.
 */
const NAME_MAX = 55;
const looksLikeName = (l) => l.length <= NAME_MAX && !endsSentence(l);

/** Split the chapter into pages and strip the furniture from each. */
function chapterLines(src) {
  const all = fs.readFileSync(src, 'utf8').split('\n');

  const headers = [];
  all.forEach((l, i) => { if (PAGE_HEADER.test(l)) headers.push(i); });
  if (!headers.length) {
    throw new Error(
      `parse-battlekit: no Battlekit page headers in ${src}. The chapter is ` +
      'the only source for wargear descriptions and per-item special rules; ' +
      'without it the Codex would have to fall back to hand-written copies, ' +
      'which is the failure this parser exists to end.');
  }

  // The chapter ends at the page break after its last stamped page.
  let end = all.length;
  for (let i = headers[headers.length - 1] + 1; i < all.length; i++) {
    if (PAGE_BREAK.test(all[i])) { end = i; break; }
  }

  const out = [];
  for (const start of headers) {
    let pageEnd = end;
    for (let i = start + 1; i <= end; i++) {
      if (PAGE_BREAK.test(all[i])) { pageEnd = i; break; }
    }
    const page = all.slice(start + 1, pageEnd);
    while (page.length) {
      const last = page[page.length - 1].trim();
      if (last !== '' && !SIDEBAR.has(last)) break;
      page.pop();
    }
    for (const l of page) if (l.trim() !== '') out.push(l);
  }
  return out;
}

/**
 * Split a profile row into Type, Range and Keywords.
 *
 * The three columns are tab-separated when the PDF's columns line up and
 * space-separated when they do not, so the split is by content: Type is one of
 * six published values, Range is a distance, `Melee`, a dual-purpose
 * `12"/Melee`, or `-`.
 */
const TYPE = /^(1-Handed|2-Handed|Grenade|Armour|Shield|Equipment|Special)\b/;
const RANGE = /^(?:Melee|-|\d+\s*(?:["”''‘’]{1,2})(?:\s*\/\s*Melee)?)/;

function splitRow(row) {
  const typeMatch = TYPE.exec(row.trim());
  if (!typeMatch) return null;
  const type = typeMatch[1];
  let rest = row.trim().slice(type.length).replace(/^[\s\t]+/, '');

  const rangeMatch = RANGE.exec(rest);
  if (!rangeMatch) return null;
  const range = rangeMatch[0].replace(/\s+/g, '');
  rest = rest.slice(rangeMatch[0].length).replace(/^[\s\t]+/, '');

  const keywords = rest === '-' || rest === ''
    ? []
    : rest.split(',').map((k) => k.trim()).filter(Boolean);

  return { type, range, keywords };
}

/**
 * Every Battlekit entry the chapter prints.
 *
 * Returns `[{ name, description, type, range, keywords, rules }]` in
 * publication order. `rules` holds the special rules printed under the profile,
 * each already unwrapped onto one line.
 */
/**
 * Every Battlekit entry the chapter prints.
 *
 * Returns `[{ name, section, description, type, range, keywords, note, rules }]`
 * in publication order.
 *
 * Entries are cut apart **backwards**, from each profile header to the name
 * above it, rather than forwards from one entry to the next. Forwards needs a
 * rule for where an entry stops, and there is no reliable one: what follows a
 * profile may be nothing, an unbulleted note (Field Shrine's terrain rules), a
 * `**` special rule wrapped over five lines, or a `**` rule with `*`
 * sub-bullets under it (the Medi-kit's Treat ACTION). Backwards needs only a
 * rule for where an entry *starts*, and the name line gives one. Everything
 * between one profile row and the next entry's name therefore belongs to the
 * earlier entry by construction, whatever shape it takes — which is how the
 * Field Shrine's note and the Medi-kit's sub-bullets survive instead of being
 * silently dropped by a forward scan that stopped too early.
 */
export function parseBattlekit(src = RULEBOOK_TXT) {
  const lines = chapterLines(src);

  const headers = [];
  lines.forEach((l, i) => { if (PROFILE_HEADER.test(l)) headers.push(i); });

  /** The profile row, plus however many lines its keywords wrapped onto. */
  const readRow = (h) => {
    const parts = [lines[h + 1]];
    let j = h + 2;
    while (j < lines.length && isKeywordRun(lines[j])) { parts.push(lines[j]); j++; }
    return { parts, end: j };
  };

  /** The name line above a profile header: the last short line that is not a
   *  finished sentence. Description lines are justified to about 80 columns,
   *  so the only short ones are paragraph endings — and those end in a stop. */
  const nameIndex = (h, floor) => {
    for (let k = h - 1; k >= floor; k--) if (looksLikeName(lines[k])) return k;
    return -1;
  };

  /** Which section each line falls in, so an entry can name its own. */
  const sectionAt = [];
  let section = '';
  for (const l of lines) { if (SECTIONS.has(l.trim())) section = l.trim(); sectionAt.push(section); }

  const entries = [];
  const unreadable = [];

  for (let k = 0; k < headers.length; k++) {
    const h = headers[k];
    const { parts, end } = readRow(h);
    const row = splitRow(parts.join(' ').replace(/\s+/g, ' '));

    const prevEnd = k === 0 ? 0 : readRow(headers[k - 1]).end;
    const nameAt = nameIndex(h, prevEnd);

    // Everything from this row's end to the next entry's name belongs here.
    const nextName = k + 1 < headers.length
      ? nameIndex(headers[k + 1], end)
      : lines.length;
    let tail = lines.slice(end, nextName < 0 ? end : nextName);
    // Stop at the next section heading: what follows it is the section's own
    // prose, not this entry's.
    const heading = tail.findIndex((l) => SECTIONS.has(l.trim()));
    if (heading >= 0) tail = tail.slice(0, heading);

    if (nameAt < 0 || !row) {
      unreadable.push({ row: parts.join(' '), above: lines.slice(Math.max(0, h - 2), h) });
      continue;
    }

    entries.push({
      name: lines[nameAt].trim(),
      section: sectionAt[h],
      description: lines.slice(nameAt + 1, h).join(' ').replace(/\s+/g, ' ').trim(),
      type: row.type,
      range: row.range,
      keywords: row.keywords,
      ...splitTail(tail),
    });
  }

  if (!entries.length) {
    throw new Error(
      'parse-battlekit: read the Battlekit chapter but found no profiles. The ' +
      '"Type / Range / Keywords" header has changed shape, or the extraction ' +
      'has. Failing rather than emitting an empty arsenal, which the Codex ' +
      'would render as "this ruleset has no wargear".');
  }

  return { entries, unreadable };
}

/**
 * Split what is printed under a profile into the unbulleted note and the
 * `**` special rules.
 *
 * A `*` sub-bullet is folded into the rule above it, marked, rather than
 * promoted to a rule of its own: the Medi-kit's two are alternatives *within*
 * Treat ACTION, and listing them alongside it would read as three separate
 * rules a model has.
 */
function splitTail(tail) {
  const note = [];
  const rules = [];
  for (const raw of tail) {
    const line = raw.trim();
    if (BULLET.test(line)) { rules.push(line.replace(BULLET, '')); continue; }
    if (SUB_BULLET.test(line) && rules.length) {
      rules[rules.length - 1] += ' \u2022 ' + line.replace(SUB_BULLET, '');
      continue;
    }
    if (rules.length) rules[rules.length - 1] += ' ' + line;
    else note.push(line);
  }
  return {
    note: note.join(' ').replace(/\s+/g, ' ').trim(),
    rules: rules.map((r) => r.replace(/\s+/g, ' ').trim()),
  };
}
