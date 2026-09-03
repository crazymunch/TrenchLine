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

/* ------------------------------------------------------- battlekit limits */

/**
 * How much Battlekit one model may carry, from the chapter's own statement.
 *
 * The rulebook prints this as six bullets under a heading, and the app enforced
 * none of them — a model could wear three suits of Armour, carry four 2-Handed
 * weapons and two Shields, and validate clean. It is the last legality
 * dimension in the Battlekit chapter that nothing read.
 *
 *     BATTLEKIT LIMITS
 *     Unless otherwise stated a model is limited to the following Battlekit:
 *     ** One 2-Handed Ranged Weapon or two 1-Handed Ranged Weapons.
 *     ** One 2-Handed Melee Weapon or two 1-Handed Melee Weapons.
 *     ** One type of Grenade.
 *     ** One suit of Armour.
 *     ** One Shield (▶ see additional restrictions below).
 *     ** Any number of pieces of Equipment or Special Battlekit. A Model
 *        cannot have two or more pieces of Equipment or Special Battlekit
 *        with the same Name.
 *
 * Derived rather than transcribed into a constant, for the ordinary reason:
 * a number typed into a TypeScript file is a number nobody re-checks against
 * the page it came from. Every rule keeps its `raw` sentence so the app can
 * show the player the wording rather than a paraphrase of it.
 *
 * "Unless otherwise stated" is the whole reason `raw` is kept and the whole
 * reason the caller — not this parser — decides what to do about a model whose
 * own entry states otherwise.
 */

/** Counting words, as the chapter writes them. English, not game data. */
const COUNT = { one: 1, two: 2, three: 3, four: 4 };
const countOf = (w) => COUNT[String(w).trim().toLowerCase()] ?? Number(w);

const LIMITS_HEADING = /^BATTLEKIT LIMITS$/;
const SHIELDS_HEADING = /^Shields$/;

/** `One 2-Handed Ranged Weapon or two 1-Handed Ranged Weapons.` */
const BY_HAND = /^(\w+)\s+(\d)-Handed\s+(Ranged|Melee)\s+Weapons?\s+or\s+(\w+)\s+(\d)-Handed\s+\3\s+Weapons?\.?$/i;
/** `One type of Grenade.` — a limit on KINDS, not on how many you carry. */
const BY_TYPE = /^(\w+)\s+types?\s+of\s+(\w+)\.?$/i;
/** `One suit of Armour.` */
const SUITS = /^(\w+)\s+suits?\s+of\s+(\w+)\.?$/i;
/** `One Shield (▶ see additional restrictions below).` */
const PLAIN = /^(\w+)\s+([A-Z]\w+)\b/;
/** `Any number of pieces of Equipment or Special Battlekit…` */
const ANY_NUMBER = /^Any number of pieces of ([^.]+)\./i;
const SAME_NAME = /cannot have two or more[^.]*with the same Name/i;

/** `It may carry a maximum of one 1-Handed Melee and Ranged Weapon each.` */
const SHIELD_ONE_HANDED =
  /maximum of (\w+)\s+(\d)-Handed\s+(Melee)\s+and\s+(Ranged)\s+Weapons?\s+each/i;
/** `It cannot carry a 2-Handed Weapon unless the Weapon and the Shield both
 *  have the Shield Combo stipulation` */
const SHIELD_TWO_HANDED =
  /cannot carry a (\d)-Handed Weapon unless[^.]*both\s+have\s+the\s+([\w\s]+?)\s+stipulation/i;

/**
 * The section a rule governs, named as the Armoury Tables name it.
 *
 * The chapter says "Grenade" and "Armour" in the singular and the tables head
 * their columns `Grenades` and `Armour`; matching the tables is what lets the
 * validator count a roster item against the right rule without a second lookup.
 */
const SECTION_OF = {
  ranged: 'Ranged Weapons', melee: 'Melee Weapons', grenade: 'Grenades',
  armour: 'Armour', shield: 'Shields', equipment: 'Equipment',
};
const sectionFor = (word) => SECTION_OF[String(word).trim().toLowerCase()];

/**
 * Read the limits.
 *
 * Returns `{ limits, withShield, unreadable }`. A bullet this cannot read goes
 * into `unreadable` and is reported by the build rather than dropped: a limit
 * silently missing is a limit silently unenforced.
 */
export function parseBattlekitLimits(src = RULEBOOK_TXT) {
  const lines = chapterLines(src);

  const at = lines.findIndex((l) => LIMITS_HEADING.test(l.trim()));
  if (at < 0) {
    throw new Error(
      `parse-battlekit: no BATTLEKIT LIMITS heading in ${src}. These are the ` +
      'per-model carrying limits — one suit of Armour, one Shield, the ' +
      'handedness rules — and nothing else in either source states them.');
  }

  /* The bulleted rules run from the heading to the `Shields` sub-heading that
     carries the extra restrictions the Shield bullet points at. */
  const shieldsAt = lines.findIndex((l, i) => i > at && SHIELDS_HEADING.test(l.trim()));
  const body = lines.slice(at + 1, shieldsAt < 0 ? lines.length : shieldsAt);

  /* Bullets wrap, so a line that does not start one continues the last. */
  const bullets = [];
  for (const line of body) {
    if (BULLET.test(line)) bullets.push(line.replace(BULLET, '').trim());
    else if (bullets.length) bullets[bullets.length - 1] += ` ${line.trim()}`;
  }

  const limits = [];
  const unreadable = [];

  for (const raw of bullets) {
    const hand = raw.match(BY_HAND);
    if (hand) {
      const [, aN, aH, kind, bN, bH] = hand;
      limits.push({
        section: sectionFor(kind), raw,
        // "One 2-Handed … or two 1-Handed …" is one allowance expressed twice,
        // so both bounds are kept rather than reduced to a single number.
        byHands: { [aH]: countOf(aN), [bH]: countOf(bN) },
      });
      continue;
    }

    const type = raw.match(BY_TYPE);
    if (type && sectionFor(type[2])) {
      // "One TYPE of Grenade" caps distinct kinds, not how many you carry.
      limits.push({ section: sectionFor(type[2]), raw, max: countOf(type[1]), per: 'name' });
      continue;
    }

    const suit = raw.match(SUITS);
    if (suit && sectionFor(suit[2])) {
      limits.push({ section: sectionFor(suit[2]), raw, max: countOf(suit[1]) });
      continue;
    }

    const any = raw.match(ANY_NUMBER);
    if (any) {
      limits.push({
        section: 'Equipment', raw, max: null,
        // The second sentence of the same bullet is the real rule.
        distinctByName: SAME_NAME.test(raw) || undefined,
      });
      continue;
    }

    const plain = raw.match(PLAIN);
    if (plain && sectionFor(plain[2])) {
      limits.push({ section: sectionFor(plain[2]), raw, max: countOf(plain[1]) });
      continue;
    }

    unreadable.push(raw);
  }

  /* The Shield sub-section: what carrying one costs you elsewhere.

     Bounded at the next heading rather than by a line count. `Dual-Purpose
     Battlekit` follows immediately, and swallowing it would attribute the
     Pistol's counts-as-one rule to the Shield restrictions. */
  /* The sub-section is a lead-in paragraph, then its bullets, then the next
     heading. `Battlekit it can carry:` ends the lead-in and is short and
     unfinished — indistinguishable from a heading on its own — so the end is
     the first heading-shaped line AFTER a bullet has been seen. */
  let seenBullet = false;
  const shieldEnd = shieldsAt < 0 ? -1 : lines.findIndex((l, i) => {
    if (i <= shieldsAt) return false;
    if (BULLET.test(l)) { seenBullet = true; return false; }
    return seenBullet && looksLikeName(l);
  });
  const shieldProse = shieldsAt < 0 ? ''
    : lines.slice(shieldsAt + 1, shieldEnd < 0 ? lines.length : shieldEnd).join(' ');
  const oneHanded = shieldProse.match(SHIELD_ONE_HANDED);
  const twoHanded = shieldProse.match(SHIELD_TWO_HANDED);

  const withShield = (oneHanded || twoHanded) ? {
    raw: shieldProse.replace(/\s+/g, ' ').trim(),
    ...(oneHanded ? {
      oneHandedEach: countOf(oneHanded[1]),
      hands: Number(oneHanded[2]),
    } : {}),
    ...(twoHanded ? {
      blocksHands: Number(twoHanded[1]),
      unlessBoth: twoHanded[2].trim(),
    } : {}),
  } : undefined;

  return { limits, withShield, unreadable };
}

/* --------------------------------------------- carrying rules by keyword */

/**
 * The carrying limits stated as KEYWORDS rather than as bullets.
 *
 * Three of the six things that decide what one model may carry are not on the
 * BATTLEKIT LIMITS page at all — they are in the Keyword Glossary, which the
 * pipeline has parsed since Phase 2 and which nothing read for this purpose:
 *
 *   STRONG      "…it can equip and use one 2-Handed Melee Weapon as if it
 *                were a 1-Handed Melee Weapon."
 *   CUMBERSOME  "Weapons with this Keyword require two hands to use, even if
 *                the model has the STRONG Keyword…"
 *   HEAVY       "A model cannot be equipped with more than one piece of
 *                Battlekit with this Keyword…"
 *
 * `AddEquipmentModal` had its own version of the first, detected with
 * `/strong|bulky|large|ogre/i` over ability NAMES and applied to *every*
 * 2-Handed melee weapon rather than to the one the rule allows — so a STRONG
 * model could carry two greatswords in two hands. CUMBERSOME, which exists
 * precisely to stop that conversion, was not read at all.
 *
 * Derived here for the same reason as the page's bullets: the numbers stay
 * attached to the sentences they came from.
 */

/** `can equip and use one 2-Handed Melee Weapon as if it were a 1-Handed` */
const CONVERTS =
  /can equip and use (\w+)\s+(\d)-Handed\s+(Melee|Ranged)\s+Weapons?\s+as if it were an?\s+(\d)-Handed/i;
/** `require two hands to use, even if the model has the STRONG Keyword` */
const FIXED_HANDS =
  /requires?\s+(\w+)\s+hands? to use,?\s+even if the model has the ([A-Z]+)\s+Keyword/i;
/** `cannot be equipped with more than one piece of Battlekit with this Keyword` */
const AT_MOST =
  /cannot be equipped with more than (\w+)\s+piece of Battlekit with this Keyword/i;

/*
  HELD, the compound one. Three constraints and an exemption in one entry:

    "A piece of Battlekit with this Keyword requires one hand to carry and
     cannot be put down. Because of this, a model that has this Keyword can
     only be equipped with or use either a 1-Handed Weapon or a Shield. It
     cannot be equipped with or use any 2-Handed Weapons, or both a Weapon and
     a Shield (even if the Shield has the Shield Combo rule). It may still
     carry Grenades."

  Each clause is read separately and all four must land, because a partial
  read of this one would enforce something the book does not say — "no
  2-Handed weapons" without "and not both a Weapon and a Shield" is a
  different, more permissive rule.
*/
const OCCUPIES = /requires? (\w+) hands? to carry and cannot be put down/i;
const ONLY_EITHER =
  /can only be equipped with or use either an? (\d)-Handed Weapon or an? (\w+)/i;
const NO_HANDED = /cannot be equipped with or use any (\d)-Handed Weapons/i;
const NOT_BOTH = /or both an? (Weapon) and an? (Shield)/i;
const STILL_CARRY = /may still carry (\w+)/i;

/**
 * Read them out of the parsed glossary.
 *
 * Takes the glossary rather than the rulebook path, so it reads exactly the
 * entries the dataset ships — a keyword the glossary parser missed cannot
 * silently grow a rule here.
 */
export function parseKeywordCarryRules(keywords) {
  const rules = [];
  const unreadable = [];

  for (const k of keywords) {
    const text = k.description ?? '';
    if (!text) continue;

    const converts = text.match(CONVERTS);
    if (converts) {
      rules.push({
        keyword: k.name, raw: text.trim(),
        converts: {
          count: countOf(converts[1]),
          section: sectionFor(converts[3]) ?? converts[3],
          from: Number(converts[2]),
          to: Number(converts[4]),
        },
      });
    }

    const fixed = text.match(FIXED_HANDS);
    if (fixed) {
      rules.push({
        keyword: k.name, raw: text.trim(),
        // The exception to the conversion above, named by the book itself.
        fixedHands: countOf(fixed[1]),
        overrides: fixed[2],
      });
    }

    const most = text.match(AT_MOST);
    if (most) {
      rules.push({ keyword: k.name, raw: text.trim(), maxPerModel: countOf(most[1]) });
    }

    const occupies = text.match(OCCUPIES);
    const either = text.match(ONLY_EITHER);
    const noHanded = text.match(NO_HANDED);
    const notBoth = text.match(NOT_BOTH);
    // All four clauses or none: see the note above.
    const held = occupies && either && noHanded && notBoth ? {
      keyword: k.name, raw: text.trim(),
      occupiesHands: countOf(occupies[1]),
      // "either a 1-Handed Weapon or a Shield" — one of the two, not both.
      alsoOneOf: [`${either[1]}-Handed Weapon`, sectionFor(either[2]) ?? either[2]],
      blocksHands: Number(noHanded[1]),
      blocksBoth: [notBoth[1], notBoth[2]],
      ...(text.match(STILL_CARRY)
        ? { exempt: sectionFor(text.match(STILL_CARRY)[1]) ?? text.match(STILL_CARRY)[1] }
        : {}),
    } : undefined;
    if (held) rules.push(held);

    /*
      A keyword whose text plainly talks about carrying but which none of the
      patterns read is reported rather than ignored. The glossary is prose and
      a new release can rephrase a rule; silence here would look identical to
      there being no rule.
    */
    if (!converts && !fixed && !most && !held
        && /\b(cannot be equipped|can equip and use|hands to use)\b/i.test(text)) {
      unreadable.push(`${k.name}: ${text.trim()}`);
    }
  }

  return { rules, unreadable };
}
