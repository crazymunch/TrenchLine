/**
 * The Carcass Front supplement: two Faction Lists, their Armoury Tables, their
 * unique Battlekit, their special rules and their Warband Variants.
 *
 * The book sets warband entries in the same shape as *Warbands of Trench
 * Crusade*, which is why this can be read structurally rather than fuzzily:
 *
 *     0-4 Stigmatic Nuns – Cost: 60 👑
 *     <flavour>
 *     Movement \t Ranged \t Melee \t Armour \t Base
 *     8”/Infantry \t +1 DICE \t +1 DICE \t 0 \t 25mm
 *     Battlekit \t <what it may take>
 *     Abilities \t <named abilities>
 *     Keywords \t PILGRIM, REGENERATE 1
 *
 * Three differences from the older book, each of which broke the first pass:
 *
 *   1. **An en dash before `Cost:`**, not a hyphen. `parse-warbands-pdf.mjs`
 *      requires a hyphen and finds nothing here.
 *   2. **Entries with no recruitment limit at all** — `Leper-Pilgrims – Cost:
 *      30 👑`, where the older book always prints `0-4` or `1`. Absent is a
 *      real answer (unlimited), and is recorded as null rather than as 0.
 *   3. **Entries with more than one profile.** A Leper-Pilgrim has a second
 *      statline for the Martyr Penitent it can be resurrected as, each under
 *      its own `<Name> Profile` heading. Reading the first and stopping would
 *      lose a statline the player needs; reading them into one entry would
 *      make a model with two Melee values.
 *
 * Nothing here is interpreted. Ability text, special rules and Battlekit
 * sentences are carried verbatim, because the entity model cannot express most
 * of what they say and a paraphrase is a rewrite.
 */
import fs from 'node:fs';
import { keepsHyphen } from './dehyphenate.mjs';
import { toLines } from './lines.mjs';

export const BOOK_TXT = 'data-sources/carcass-front/extracted/carcass-front-book.txt';

/* ------------------------------------------------------------------ shapes */

/** `0-4 Stigmatic Nuns – Cost: 60 👑`, `1 Heretic Captain – Cost: 80 👑` */
const ENTRY = /^\s*(?:(\d+)(?:\s*[-–—]\s*(\d+))?\s+)?([A-Z][^\t]*?)\s+[–—-]\s+Cost:\s*(\d+)\s*(👑|☼)?/u;

/** The statline table's header row. */
const STAT_HEADER = /^Movement\s*\t\s*Ranged\s*\t\s*Melee\s*\t\s*Armour\s*\t\s*Base/;

/** `Leper-Pilgrim Profile`, `Martyr Penitent Profile` */
const PROFILE_NAME = /^(.+?)\s+Profile\s*$/;

/** The tab-labelled cells that follow the statline. */
const CELL = /^(Battlekit|Abilities|Keywords|Powers|Special Rules)\s*\t\s*(.*)$/;

/** `ª– Elite Warband Entries: God's Chosen –≠` */
const BANNER = /^ª–\s*(.+?)\s*–≠\s*$/;

const PAGE_BREAK = /^-- \d+ of \d+ --$/;

/** `The Procession of the Sacred Affliction\t37` — the running head. */
const RUNNING_HEAD = /^(The Procession of the Sacred Affliction|Heretic Naval Raiders|Scenarios & Terrain|The Carcass Front Campaign|Faction Lists & Mercenaries|Campaigns on the Carcass Front|Carcass Front Exploration Tables|Introduction|Mercenary)\s*\t\s*\d{1,3}\s*$/i;

/** An artist's initials, set alone in the margin. */
const INITIALS = /^[A-Z]{2}$/;

/**
 * A chapter opener.
 *
 * The book sets them in small caps, which extracts as a distinctive mixed case
 * with the words tab-separated: `hereTiC \tnAvAl \trAiDers`, `merCenAry`,
 * `fACTion \tlisTs \t& \tmerCenAries`. The giveaway is a lower-case letter
 * followed by an upper-case one INSIDE a word, which ordinary rules text —
 * even shouting `INFILTRATOR Keyword at a cost of` — never does.
 *
 * They are the only reliable section boundary in the faction lists. Without
 * them the last Warband Variant of a faction runs on into the next chapter's
 * fiction, and read two sentences of it as rules.
 */
const CHAPTER = (line) =>
  !/[.!?;]/.test(line)
  && line.replace(/\t/g, ' ').length <= 60
  && /[a-z][A-Z]/.test(line)
  && /^[A-Za-z&'’\s\t]+$/.test(line);

/** `Blessed Millstone | 5 👑 | Leper-Pilgrims only | Limit: 2` */
const KIT = /^([A-Z][^|]{2,48}?)\s*\|\s*(\d+)\s*(👑|☼)\s*(?:\|\s*(.+))?$/u;

/** `Type \t Range \t Keywords` — the header of a Battlekit item's table. */
const KIT_HEADER = /^Type\s*\t\s*Range\s*\t\s*Keywords/;

/* ------------------------------------------------------------------ tidying */

/**
 * Rejoin a word the extractor hyphenated across a column break.
 *
 * The faction-list pages are one wide column and barely hit this; the special
 * rules and the Naval Raiders pages are two narrow ones and hit it constantly
 * ("Her-\netic Naval Raiders", "this bo-\nnus").
 *
 * Whether the hyphen survives the join is decided by `dehyphenate.mjs`, which
 * separates a typesetter's soft hyphen from one that belongs to the word. It
 * used to drop every hyphen before a lower-case letter, which is right for
 * "bo-nus" and wrong for "co-opted" and "roll-off" — and "roll-off" is a rules
 * term a player searches the Codex for.
 */
const dehyphenate = (s) => String(s ?? '').replace(
  /([A-Za-z]+-)\s+([A-Za-z])/g,
  (whole, left, right) => (keepsHyphen(left, right) ? left + right : left.slice(0, -1) + right));

const squash = (s) => dehyphenate(String(s ?? '')).replace(/\s+/g, ' ').trim();

const noise = (line) =>
  !line
  || PAGE_BREAK.test(line)
  || RUNNING_HEAD.test(line)
  || INITIALS.test(line)
  || /^\d{1,3}$/.test(line);

/** Cost, with the currency the glyph names. */
function cost(amount, glyph) {
  const n = Number(amount);
  return glyph === '☼' ? { ducats: 0, glory: n } : { ducats: n, glory: 0 };
}

/**
 * Split an `Abilities` cell into its named abilities.
 *
 * They are written `Name: text` or `Name ACTION: text`, and the name is Title
 * Case and short. Anchored on that rather than on the colon alone, because the
 * rules text is full of colons.
 */
function splitAbilities(text) {
  const body = squash(text);
  if (!body) return [];

  /*
    A name runs from a sentence boundary to a colon, and taking the whole span
    is the point. A lazy match anchored on the colon reads "Punishing
    Millstones:" as "Millstones" and "Fast as Lightning:" as "Lightning" —
    both of which are the wrong half of a rule a player will search for.

    A span is a name only if it is short, has no sentence-ending punctuation
    inside it, and is not the "The following special rules apply to a …:"
    preamble that opens every Special Rules block.
  */
  const starts = [];
  for (let i = body.indexOf(':'); i !== -1; i = body.indexOf(':', i + 1)) {
    /*
      Back to the end of the previous span: a full stop, or the previous
      colon. The colon matters — every Special Rules block opens with "The
      following special rules apply to a … Warband Variants:" and the first
      real rule follows it directly, so without it the first rule of every
      faction ("Punishing Millstones", "Fast as Lightning") ran on from the
      preamble, came out over 60 characters and was dropped.
    */
    // `i - 1`, not `i`: searching from the colon's own index finds the colon
    // itself, so every span came back empty.
    const prev = Math.max(
      body.lastIndexOf('. ', i - 1), body.lastIndexOf('! ', i - 1),
      body.lastIndexOf('? ', i - 1), body.lastIndexOf(': ', i - 1));
    const from = prev === -1 ? 0 : prev + 2;
    const name = body.slice(from, i).trim();

    if (!name || name.length > 60) continue;
    if (!/^[A-Z“"']/.test(name)) continue;
    if (/[.!?]/.test(name)) continue;
    // A colon inside running text: "the following things may cause…".
    if (/^(the following|note|for example|in addition|as follows)\b/i.test(name)) continue;

    starts.push({ name, from, textFrom: i + 1 });
  }
  // No named abilities — one unnamed block of rules, kept whole rather than
  // dropped. The Anchorite Shrine's is written that way.
  if (!starts.length) return [{ name: '', description: body }];

  const out = [];
  // Anything before the first name is a preamble to the whole cell.
  const preamble = body.slice(0, starts[0].from).trim();
  if (preamble) out.push({ name: '', description: preamble });

  for (let i = 0; i < starts.length; i++) {
    out.push({
      name: starts[i].name,
      description: squash(body.slice(starts[i].textFrom, starts[i + 1]?.from ?? body.length)),
    });
  }
  return out;
}

/* ------------------------------------------------------------------- units */

/**
 * Read the warband entries between two line numbers.
 *
 * Bounded by the caller because the two faction lists are separated by pages of
 * fiction and the Warband Variants sections, and an entry parser let loose on
 * the whole book reads the Mercenary section into whichever faction came last.
 */
function parseEntries(lines, from, to, factionName) {
  const units = [];
  // A statline block seen with no entry open, and an entry header seen with no
  // statline under it. See the repair after the loop.
  const orphan = {
    profiles: [], battlekit: '', keywords: [], flavour: [],
    _abilityText: '', _keywordText: '',
  };
  let lastHeader = null;
  let current = null;
  // Where the current page's entries begin in `units`, for the banner back-fill.
  let pageStart = 0;
  let group = '';
  let cell = null;          // the tab-labelled cell being accumulated
  let pendingProfile = '';  // a `<Name> Profile` heading seen but not yet used

  const flush = () => {
    if (!current) return;
    // An entry with no statline is either a heading that merely matched the
    // shape, or one whose body extracted above it. Held rather than emitted
    // half-built; the repair after the loop decides which.
    if (current.profiles.length) units.push(current);
    else lastHeader = current;
    current = null;
    cell = null;
  };

  for (let i = from; i < to; i++) {
    const raw = lines[i].replace(/\s+$/, '');
    if (PAGE_BREAK.test(raw)) { pageStart = units.length; continue; }
    if (noise(raw)) continue;

    const banner = raw.match(BANNER);
    if (banner) {
      flush();
      group = squash(banner[1]);
      /*
        A banner heads its own PAGE, and extracts somewhere in the middle of it
        — the Lazarist Prophet is 49 lines above its `Elite Warband Entries`
        banner, and the Heretic Raiders 22 lines above their `Troops Warband
        Entries` one. So it claims every entry on the page, before it as well
        as after, and then holds for the pages that follow.

        Only where the entry has none yet. Overwriting the whole page moves an
        entry across the boundary when a page carries the last Elite AND the
        Troops banner, which is what page 41 and page 56 both do — it made the
        Lazarist Castigator and the Drowned Chorister Troops.

        The label is informational anyway. `role` comes from the ELITE keyword,
        which is on the entry itself.
      */
      for (let u = pageStart; u < units.length; u++) {
        if (!units[u].group) units[u].group = group;
      }
      continue;
    }

    const entry = raw.match(ENTRY);
    if (entry && !CELL.test(raw)) {
      flush();
      const [, lo, hi, name, amount, glyph] = entry;
      current = {
        name: squash(name),
        factionName,
        group,
        // "0-4" -> 0 and 4; "1" -> 1 and 1; absent -> unlimited, recorded as
        // null on both, never as 0.
        min: lo === undefined ? null : Number(lo),
        max: lo === undefined ? null : Number(hi ?? lo),
        cost: cost(amount, glyph),
        flavour: [],
        profiles: [],
        battlekit: '',
        abilities: [],
        keywords: [],
        _line: i + 1,
      };
      pendingProfile = '';
      continue;
    }
    // With no entry open the block still has to go somewhere: an entry header
    // set as page furniture arrives after its own body.
    const target = current ?? orphan;

    if (STAT_HEADER.test(raw)) {
      const values = (lines[i + 1] ?? '').split('\t').map((c) => squash(c)).filter(Boolean);
      if (values.length >= 5) {
        target.profiles.push({
          // The heading above the table where an entry has more than one, and
          // the entry's own name where it has one.
          name: pendingProfile || target.name || '',
          movement: values[0],
          ranged: values[1],
          melee: values[2],
          armour: values[3],
          base: values[4],
        });
        i++;
      }
      pendingProfile = '';
      cell = null;
      continue;
    }

    const named = raw.match(PROFILE_NAME);
    if (named && !raw.includes('\t') && named[1].length < 40) {
      pendingProfile = squash(named[1]);
      continue;
    }

    const c = raw.match(CELL);
    if (c) {
      cell = c[1];
      const value = c[2];
      if (cell === 'Keywords') {
        // Kept open, not closed here: the cell wraps. The Lazarist Prophet's
        // reads `PILGRIM, ELITE,` with `LEADER` on the line below, and closing
        // on the first line dropped the keyword that decides who may lead the
        // Warband.
        target._keywordText = squash(value);
      } else if (cell === 'Battlekit') {
        target.battlekit = squash(value);
      } else {
        target._abilityText = squash(value);
      }
      continue;
    }

    // A continuation of whichever cell is open, or flavour before the statline.
    if (cell === 'Battlekit') target.battlekit = squash(`${target.battlekit} ${raw}`);
    else if (cell === 'Keywords') {
      /*
        Only an all-caps fragment continues the cell. `LEADER` on its own line
        is the rest of the Prophet's keywords; `Bonebreaker Mace` is the start
        of the Anchorite Shrine's built-in weapons, and letting the cell run on
        swallowed the whole rest of the entry into the keyword list.
      */
      if (/^[A-Z0-9][A-Z0-9 ,”"’-]*$/.test(raw.trim())) {
        target._keywordText = squash(`${target._keywordText ?? ''} ${raw}`);
      } else { cell = null; }
    }
    else if (cell) target._abilityText = squash(`${target._abilityText ?? ''} ${raw}`);
    else if (current && !current.profiles.length) current.flavour.push(raw.trim());
  }
  flush();

  /*
    An entry whose header is set as page furniture extracts BELOW its own body,
    so the statline arrives with no entry open and the header arrives with
    nothing left to attach. The Mercenary section is the one that does this:
    the Combat Biologist's `0-1 Combat Biologist – Cost: 3 👑` is the last line
    of its page.

    Repaired only where it is unambiguous — one orphaned body and one entry
    with no statline in the same range. Anything less certain is left alone,
    because pairing the wrong statline to a model is worse than dropping it.
  */
  const orphanBody = orphan.profiles.length ? orphan : null;
  const headerOnly = units.length === 0 && lastHeader ? lastHeader : null;
  if (orphanBody && headerOnly) {
    units.push({
      ...headerOnly,
      profiles: orphanBody.profiles,
      battlekit: orphanBody.battlekit,
      _abilityText: orphanBody._abilityText,
      keywords: orphanBody.keywords,
      _keywordText: orphanBody._keywordText,
      flavour: orphanBody.flavour,
    });
  }

  for (const u of units) {
    if (u._keywordText) {
      u.keywords = u._keywordText.split(',').map((k) => squash(k)).filter(Boolean);
    }
    /*
      The role, from the entry's own ELITE keyword.

      Not from the section banner: a banner extracts in the middle of the page
      it heads, and pages 41 and 56 each carry the last Elite entry AND the
      Troops banner, so attributing by page put the Lazarist Castigator and the
      Drowned Chorister — both ELITE — among the Troops.

      Not from cost either. The Anchorite Shrine is 140 Ducats with FEAR,
      STRONG and TOUGH, and is a Troops entry; the Heretic Raiders are 30.
      The keyword is the thing the rules key off, and it agrees with the
      banners everywhere the banners are unambiguous.
    */
    u.role = factionName === 'Mercenaries' ? 'Mercenary'
      : u.keywords.includes('ELITE') ? 'Elite' : 'Troop';
    u.abilities = splitAbilities(u._abilityText ?? '');
    delete u._abilityText;
    delete u._keywordText;
    u.flavour = squash(u.flavour.join(' '));
  }
  return units;
}

/* ---------------------------------------------------------------- armoury */

/**
 * An Armoury Table: sections of `Name \t [restrictions] \t Cost glyph`.
 *
 * The same tab-delimited shape the rulebook's tables use, with one addition —
 * a leading `•` marks Battlekit unique to this faction, whose rules are printed
 * after the table rather than in the core book. Carried through as a flag so
 * the app can say where the rules are.
 */
const ARMOURY_SECTIONS = new Set([
  'Ranged Weapons', 'Melee Weapons', 'Grenades', 'Shield', 'Shields',
  'Armour', 'Equipment',
]);

function parseArmoury(lines, from, to) {
  const rows = [];
  let section = '';

  for (let i = from; i < to; i++) {
    const raw = lines[i].replace(/\s+$/, '');
    if (noise(raw)) continue;

    const bare = squash(raw);
    if (!raw.includes('\t') && ARMOURY_SECTIONS.has(bare)) { section = bare; continue; }
    if (!section || !raw.includes('\t')) continue;

    const cells = raw.split('\t').map((c) => squash(c)).filter(Boolean);
    if (cells.length < 2) continue;

    const price = cells[cells.length - 1].match(/^(\d+)\s*(👑|☼)$/u);
    if (!price) continue;

    let name = cells[0];
    const unique = name.startsWith('•');
    if (unique) name = squash(name.slice(1));

    rows.push({
      section,
      name,
      unique,
      restrictions: cells.slice(1, -1).flatMap((r) => r.split(',').map((x) => squash(x))).filter(Boolean),
      cost: cost(price[1], price[2]),
    });
  }
  return rows;
}

/**
 * The faction's unique Battlekit, printed after its Armoury Table.
 *
 *     Punt Gun | 20 👑 | Limit: 1
 *     <flavour>
 *     Type \t Range \t Keywords
 *     2-Handed \t 18” \t +1 DICE, +1 INJURY DICE, HEAVY, SHOTGUN, SHRAPNEL
 *     Overcharge: <rule>
 */
function parseUniqueBattlekit(lines, from, to) {
  const items = [];
  let current = null;

  const flush = () => {
    if (current) {
      current.flavour = squash(current.flavour.join(' '));
      current.rules = splitAbilities(current._rules.join(' '));
      delete current._rules;
      items.push(current);
    }
    current = null;
  };

  for (let i = from; i < to; i++) {
    const raw = lines[i].replace(/\s+$/, '');
    if (noise(raw)) continue;

    const m = raw.match(KIT);
    if (m && !raw.startsWith('Type')) {
      flush();
      const [, name, amount, glyph, rest] = m;
      current = {
        name: squash(name),
        cost: cost(amount, glyph),
        restrictions: (rest ?? '').split('|').flatMap((r) => r.split(',')).map((r) => squash(r)).filter(Boolean),
        flavour: [],
        type: '', range: '', keywords: [],
        _rules: [],
        _line: i + 1,
      };
      continue;
    }
    if (!current) continue;

    if (KIT_HEADER.test(raw)) {
      const cells = (lines[i + 1] ?? '').split('\t').map((c) => squash(c));
      current.type = cells[0] ?? '';
      current.range = cells[1] ?? '';
      let keywordText = cells[2] ?? '';
      i++;

      /*
        The keyword column wraps, and it wraps MID-WORD: the Punt Gun's reads
        `… HEAVY, SHOT-` with `GUN, SHRAPNEL` on the line below. Folded back in
        here rather than after the fact — left alone, the fragment fuses into
        the first rule and produces a keyword `SHOT-` and a rule named
        `GUN, SHRAPNEL Overcharge`.

        Only an all-caps fragment with no colon continues the column; the rules
        that follow are sentences with names.
      */
      while (/^[A-Z0-9][A-Z0-9 ”"’,-]*$/.test((lines[i + 1] ?? '').trim())) {
        const tail = lines[++i].trim();
        keywordText = keywordText.endsWith('-')
          ? keywordText.slice(0, -1) + tail   // the word itself was split
          : `${keywordText}, ${tail}`;
      }

      current.keywords = keywordText.split(',').map((k) => squash(k)).filter((k) => k && k !== '-');
      current._afterTable = true;
      continue;
    }
    if (current._afterTable) current._rules.push(raw);
    else current.flavour.push(raw);
  }
  flush();

  return items;
}

/* --------------------------------------------------------- faction assembly */

/** `Punishing Millstones: Add +1 INJURY DICE …` under a `Special Rules` head. */
function parseSpecialRules(lines, from, to) {
  const text = [];
  for (let i = from; i < to; i++) {
    const raw = lines[i].replace(/\s+$/, '');
    if (noise(raw)) continue;
    text.push(raw);
  }
  return splitAbilities(text.join(' ')).filter((r) => r.name);
}

/** Find the line index of the first line matching `re` at or after `from`. */
const findLine = (lines, test, from = 0, to = lines.length) => {
  const match = typeof test === 'function' ? test : (l) => test.test(l);
  for (let i = from; i < to; i++) if (match(lines[i].replace(/\s+$/, ''))) return i;
  return -1;
};

/** The page break above `at` — the real top of the page `at` sits on. */
const lastPageBreakBefore = (lines, at) => {
  for (let i = at - 1; i >= 0; i--) if (PAGE_BREAK.test(lines[i].replace(/\s+$/, ''))) return i;
  return 0;
};

export function parseCarcassFront(file = BOOK_TXT) {
  if (!fs.existsSync(file)) {
    throw new Error(
      `${file} not found. Fetch and extract it first: `
      + 'npm run rules:pdfs && npm run rules:extract -- '
      + 'data-sources/carcass-front/carcass-front-book.pdf '
      + `${file}`);
  }
  const lines = toLines(fs.readFileSync(file, 'utf8'));

  /*
    The two faction lists, bounded by their own running heads.

    Bounded rather than scanned end to end: between them sit pages of fiction,
    the Warband Variants, and a Mercenary section, and an entry parser let loose
    on the whole book reads the Mercenary into whichever faction came last.
  */
  const factions = [];

  const bounds = [
    {
      name: 'Procession of the Sacred Affliction',
      alignment: 'Faithful',
      start: findLine(lines, /^Warband Creation$/),
      variantHead: /^THE KNIGHTS OF SAINT LAZARUS SPECIAL RULES$/,
    },
    {
      name: 'Heretic Naval Raiders',
      alignment: 'Fallen',
      start: -1,
      variantHead: /^THE DROWNED CHOIR SPECIAL RULES$/,
    },
  ];

  // The second Warband Creation heading opens the Naval Raiders.
  bounds[1].start = findLine(lines, /^Warband Creation$/, bounds[0].start + 1);

  // The chapter openers that bound them.
  const naval = findLine(lines, (l) => CHAPTER(l) && /nAvAl/.test(l));
  const mercAt = findLine(lines, /^merCenAry$/);
  if (bounds[0].start === -1 || bounds[1].start === -1 || naval === -1 || mercAt === -1) {
    throw new Error('parse-carcass-front: could not locate the faction list sections');
  }

  /*
    The Mercenary's own page.

    Its chapter opener and its entry header both extract at the BOTTOM of the
    page they head, so the section cannot be bounded by either: everything
    above them on that page is the entry. The page break above the opener is
    the real boundary, and it is also where the Naval Raiders end — otherwise
    their last Warband Variant swallows the Combat Biologist's abilities.
  */
  const mercFrom = lastPageBreakBefore(lines, mercAt);

  /*
    A chapter opener extracts at the bottom of its own page, so the page it
    opens sits ABOVE it — and the Naval Raiders' two pages of fiction were
    landing inside the Procession's last Warband Variant, which read two
    sentences of it as rules. The page break above the opener is the boundary.
  */
  const ends = [lastPageBreakBefore(lines, naval), mercFrom];

  for (let f = 0; f < bounds.length; f++) {
    const { name, alignment, start } = bounds[f];
    const end = ends[f];

    const rulesAt = findLine(lines, /^Special Rules$/, start, end);
    const armouryAt = findLine(lines, /^Armoury Tables$/, start, end);
    /*
      `<Faction> Battlekit`, the heading over the unique items. Matched as a
      short line with no sentence punctuation, because the Armoury's own intro
      paragraph wraps to "can have the following Battlekit. Battlekit" — which
      also ends in the word, and matching it collapsed the Armoury to nothing.
    */
    const kitAt = findLine(lines, /^[A-Z][A-Za-z' ]{4,48} Battlekit$/, armouryAt + 1, end);
    /*
      The entries start at the first one, not at the first section banner. The
      extraction puts a banner at the END of the page it sits on, so the
      Procession's `ª– Elite Warband Entries –≠` lands 49 lines BELOW the
      Lazarist Prophet it introduces — and starting at the banner dropped the
      Prophet, which is the faction's mandatory Leader.
    */
    /*
      From the first entry, or from the banner above it — whichever comes
      first. The Naval Raiders' `Elite Warband Entries` banner is the line
      directly above the Heretic Captain, so starting at the entry stepped
      over it and left the faction's two Elites with no role.
    */
    const firstEntry = findLine(lines, ENTRY, kitAt + 1, end);
    const firstBanner = findLine(lines, BANNER, kitAt + 1, end);
    const entriesAt = firstBanner === -1 ? firstEntry : Math.min(firstEntry, firstBanner);
    const variantsAt = findLine(lines, /^ª–\s*Warband Variants\s*–≠$/, entriesAt + 1, end);

    if ([rulesAt, armouryAt, kitAt, entriesAt, variantsAt].some((x) => x === -1)) {
      throw new Error(`parse-carcass-front: ${name} is missing an expected section`);
    }

    // The budget is printed as prose in Warband Creation: "You have 700 👑".
    const budget = (() => {
      for (let i = start; i < rulesAt; i++) {
        const m = lines[i].match(/You have\s+(\d+)\s*👑/u);
        if (m) return { ducats: Number(m[1]), glory: 0 };
      }
      return null;
    })();

    factions.push({
      name,
      alignment,
      budget,
      specialRules: parseSpecialRules(lines, rulesAt + 1, armouryAt),
      armoury: parseArmoury(lines, armouryAt, kitAt),
      uniqueBattlekit: parseUniqueBattlekit(lines, kitAt, entriesAt),
      units: parseEntries(lines, entriesAt, variantsAt, name),
      variants: parseVariants(lines, variantsAt, end, name),
    });
  }

  /*
    The Mercenary section. Its heading extracts BELOW the entry it introduces —
    the same page-furniture ordering that moves the section banners — so the
    scan starts before the heading rather than after it.
  */
  const scenariosAt = findLine(lines, /^Carcass Front Terrain Pieces$/, mercAt);
  const mercenaries = parseEntries(
    lines, mercFrom, scenariosAt === -1 ? mercAt + 200 : scenariosAt, 'Mercenaries');

  return { factions, mercenaries };
}

/**
 * The Warband Variants after each faction's entries.
 *
 * Each is a name over some fiction, then `THE <NAME> SPECIAL RULES` and the
 * rules themselves. The heading is the anchor: the fiction above it is not
 * reliably distinguishable from the entry flavour around it.
 */
function parseVariants(lines, from, to, factionName) {
  const heads = [];
  for (let i = from; i < to; i++) {
    const m = lines[i].replace(/\s+$/, '').match(/^THE\s+(.+?)\s+SPECIAL RULES$|^([A-Z][A-Z '’]+)\s+SPECIAL RULES$/);
    if (m) heads.push({ name: titleCase(m[1] ?? m[2]), at: i });
  }
  /*
    A variant's rules end at the next variant, or at the first statline or
    Battlekit table below it — the last variant of a faction otherwise runs to
    the end of the section and swallows whatever the book prints next. It read
    the Combat Biologist's abilities as rules of the Leviathan Shoal.
  */
  const stop = (at, next) => {
    const limit = next ?? to;
    for (let i = at; i < limit; i++) {
      const raw = lines[i].replace(/\s+$/, '');
      if (STAT_HEADER.test(raw) || KIT_HEADER.test(raw) || CHAPTER(raw)) return i;
    }
    return limit;
  };

  return heads.map((h, i) => ({
    name: h.name,
    factionName,
    specialRules: parseSpecialRules(lines, h.at + 1, stop(h.at + 1, heads[i + 1]?.at)),
    _line: h.at + 1,
  }));
}

/** `THE KNIGHTS OF SAINT LAZARUS` -> `The Knights of Saint Lazarus`. */
function titleCase(s) {
  const small = new Set(['of', 'the', 'and', 'in', 'on', 'to', 'a']);
  return squash(s).toLowerCase().split(' ')
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}
