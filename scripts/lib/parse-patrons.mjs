/**
 * Patrons, from the digital rulebook and from Carcass Front.
 *
 * A Patron is the choice a warband makes once, at the start of a campaign, and
 * it decides one thing: which Skill you may take when a Skill Table rolls a
 * `Patron Skill` result. Both ends of every 2D6 Skill Table are a Patron
 * Skill, so a campaign warband reaches this list often.
 *
 * The app had no Patron data at all. `warband.patron` was a free-text string a
 * player typed, and `warbandLore.ts` mentioned one Patron in a prose blurb.
 * Nothing anywhere could say what a Patron's six Skills were, which is the
 * only part of a Patron that has rules attached to it.
 *
 * ## Why both books are read here
 *
 * Carcass Front's three new Patrons are explicit that they are not a Carcass
 * Front feature — *"The following new Patrons can be taken by eligible
 * Warbands in any Campaign (not just a Carcass Front Campaign)"* — so they
 * belong beside the rulebook's eight rather than behind the supplement. Eleven
 * Patrons read the same way, from the two books that print them.
 *
 * ## Six Skills, and what that invariant catches
 *
 * Every Patron in both books has **exactly six** Skills, listed
 * alphabetically. That is not a guess held loosely: it is 11 out of 11, and it
 * is the check that matters, because the failure mode here is the one this
 * codebase keeps meeting — a parse that reads *plausibly* rather than
 * obviously wrongly.
 *
 * It earned itself immediately. The rulebook's last Patron, the Antipope of
 * Avignon, is the last thing in its chapter, and reading to the end of the
 * file gave it **twelve** Skills: its own six, and then the six bulleted
 * Campaign Phase steps printed on the following page — `Trauma Step`,
 * `Exploration Step`, `Quartermaster Step`. Every one of those has the shape
 * of a Skill and not one of them is one. Nothing else about the output looked
 * wrong.
 */
import fs from 'node:fs';
import { chapterLines } from './cf-prose.mjs';
import { joinWrapped } from './dehyphenate.mjs';
import { toLines } from './lines.mjs';

export const RULEBOOK_TXT =
  'data-sources/rulebook/extracted/trench-crusade-digital-rulebook.txt';

/** Every Patron in both books has this many Skills. See the note above. */
export const SKILLS_PER_PATRON = 6;

/** `TEMPORAL LORD`, `THE ORDER OF THE FLY`, `HOUSE OF WISDOM`. */
const PATRON_NAME = /^[A-Z][A-Z’' &-]{3,40}$/;

/**
 * `New Antioch only.`, `Black Grail only.` — who may take this Patron.
 *
 * Printed under the name in every entry in both books, and it is what makes a
 * name a Patron: `PATRONS` and `THE PATH TO LEVIATHAN` are ALL-CAPS lines in
 * the same chapter and neither is followed by one of these.
 */
const RESTRICTION = /only\.$/;

/**
 * `Having a Temporal Lord as your Patron allows you to take the following Skills:`
 *
 * Two patterns because the sentence wraps, and it wraps in both books: the
 * Antipope of Avignon's breaks after `allows you to take`, the House of
 * Wisdom's after `allows you to take the`. Matching only the half that ends in
 * `Skills:` left the other half on the end of those Patrons' lore paragraphs.
 *
 * The wording itself varies too — five entries say `take the following
 * Skills`, four say `take following Skills` — so the match stops at `take`.
 */
const SKILLS_ANCHOR_OPENS = /allows you to take\b/;
const SKILLS_ANCHOR_ENDS = /[Ss]kills:$/;

/** `** Armour & Equipment Procurement: The cost of any Armour…` — a rulebook Skill. */
const RULEBOOK_SKILL = /^\*\*\s+(.+?):\s+(.*)$/;

/** `Elemental Savant: When a model gains this Skill…` — a Carcass Front Skill. */
const CF_SKILL = /^([A-Z][A-Za-z0-9’'īĀ-ſ/ -]{1,44}):\s+(\S.*)$/;

/**
 * A quotation, which is how a Carcass Front Patron entry ends.
 *
 * The House of Wisdom is followed by a letter from Sutayta Al Shahda set in
 * quotation marks. Its lines are prose, but `“May the Blessings of Allah the
 * Most Merciful illuminate you.` is not, and neither is the `-Sutayta Al
 * Shahda, Jabirean Alchemagi` attribution under it.
 */
const QUOTATION = /^[“"]|^-[A-Z]/;

const clean = (parts) => parts.reduce((a, b) => joinWrapped(a, b), '').replace(/\s+/g, ' ').trim();

const slug = (name) => name
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/['’]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ------------------------------------------------------------ the rulebook */

/**
 * The rulebook's Patrons chapter, page furniture removed.
 *
 * Every page of the book carries the same navigation sidebar down its edge,
 * and the extraction drops it into the text between the last line of the page
 * and the page break. It is a run of 25-odd short lines — `Campaign`, `Games`,
 * `Trauma Step`, `Keywords`, `Battlekit` — that starts, on every page of this
 * chapter and the ones either side of it, with `Campaign` followed by `Games`.
 *
 * Dropped from there to the page break rather than by matching the labels
 * themselves: `Scenarios` and `Terrain` are words this chapter's prose uses,
 * and a filter that removed them wherever they appeared would quietly eat a
 * line of a rule.
 */
function rulebookChapter(src) {
  const all = toLines(fs.readFileSync(src, 'utf8')).map((l) => l.replace(/\s+$/, ''));

  const from = all.findIndex((l, i) =>
    /^Patrons$/.test(l) && /^Select a Patron for your Warband/.test(all[i + 1] ?? ''));
  if (from < 0) {
    throw new Error(
      'parse-patrons: no "Patrons" section heading in the rulebook text. The '
      + 'chapter cannot be read without it, and a warband with no Patron list '
      + 'cannot resolve a Patron Skill result on any Skill Table.');
  }

  /*
    The chapter ends where `Campaign Games` begins on page 95. Bounded rather
    than read to the end of the file: without this the Antipope of Avignon
    collects the six bulleted Campaign Phase steps printed after it and comes
    out with twelve Skills.
  */
  const to = all.findIndex((l, i) =>
    i > from && /^Campaign Games$/.test(l)
    && /^Once you have picked your Warband’s Patron/.test(all[i + 1] ?? ''));
  if (to < 0) {
    throw new Error(
      'parse-patrons: could not find the end of the Patrons chapter ("Campaign '
      + 'Games" on page 95). Reading to the end of the file gives the last '
      + 'Patron six Skills it does not have.');
  }

  const lines = [];
  let sidebars = 0;
  for (let i = from; i < to; i++) {
    const l = all[i];
    if (l.trim() === '') continue;
    if (/^-- \d+ of \d+ --$/.test(l)) continue;
    // `88\tCampaign Rules-\tTrench Crusade` — the running head.
    if (/^\d{1,3}\t.*\tTrench Crusade$/.test(l)) continue;
    // The navigation sidebar, from `Campaign` + `Games` to the page break.
    if (l === 'Campaign' && all[i + 1] === 'Games') {
      sidebars++;
      while (i < to && !/^-- \d+ of \d+ --$/.test(all[i])) i++;
      continue;
    }
    lines.push(l);
  }

  if (!sidebars) {
    throw new Error(
      'parse-patrons: read the Patrons chapter without finding a single '
      + 'navigation sidebar. The sidebar is on every page, so finding none '
      + 'means the page furniture now has a shape this does not recognise and '
      + 'is being read as rules text.');
  }
  return lines;
}

/* ------------------------------------------------------------ both sources */

/**
 * Split a chapter's lines into one block per Patron.
 *
 * A Patron opens on an ALL-CAPS name whose next line or two end on `only.`.
 * Requiring the restriction is what separates a Patron from the other ALL-CAPS
 * headings in the same chapters — `PATRONS`, `THE PATH TO LEVIATHAN`,
 * `THE CARCASS FRONT CAMPAIGN`.
 */
function patronBlocks(lines) {
  const starts = [];
  lines.forEach((l, i) => {
    if (!PATRON_NAME.test(l)) return;
    // The restriction is one line, or two where it wraps: Mammon's runs
    // `Heretic Legions or Court of the Seven-Headed Serpent` /
    // `(Greed Warband) only.`
    for (let j = i + 1; j <= i + 2 && j < lines.length; j++) {
      if (PATRON_NAME.test(lines[j])) break;
      if (RESTRICTION.test(lines[j])) {
        starts.push({ name: l, at: i, restrictionEnd: j });
        return;
      }
    }
  });
  return starts.map((s, i) => ({
    ...s,
    body: lines.slice(s.restrictionEnd + 1, starts[i + 1]?.at ?? lines.length),
    restriction: clean(lines.slice(s.at + 1, s.restrictionEnd + 1)),
  }));
}

/**
 * One Patron's lore and Skills.
 *
 * `skillOf` differs between the books and nothing else does: the rulebook
 * bullets each Skill with `** `, and Carcass Front prints the name and a colon
 * with no marker at all.
 */
function readPatron(block, skillOf, source) {
  const opens = block.body.findIndex((l) => SKILLS_ANCHOR_OPENS.test(l));
  const anchor = block.body.findIndex((l, i) => i >= opens && SKILLS_ANCHOR_ENDS.test(l));
  if (opens < 0 || anchor < 0) {
    throw new Error(
      `parse-patrons: ${block.name} has no "allows you to take the following `
      + 'Skills:" line. That line is what separates the entry\'s lore from its '
      + 'Skills, and without it the two would ship as one blob of prose.');
  }

  const lore = clean(block.body.slice(0, opens).filter((l) => !QUOTATION.test(l)));

  /* ---- the Skills, each running to the next one ---- */
  const found = [];
  for (let i = anchor + 1; i < block.body.length; i++) {
    const line = block.body[i];
    if (QUOTATION.test(line)) break;
    const m = skillOf(line);
    if (m) { found.push({ name: m[1].trim(), parts: [m[2]] }); continue; }
    if (found.length) found[found.length - 1].parts.push(line);
  }

  const skills = found.map((s) => ({ name: s.name, description: clean(s.parts) }));
  return { name: block.name, restriction: block.restriction, lore, skills, source };
}

/**
 * Separate a purchasable item's rules from a seventh Skill.
 *
 * The House of Wisdom's `Whispering Zīj` Skill lets a Takwin Homunculus buy a
 * **Zīj Seal Alchemical Formulae for 20 👑**, and the book prints that
 * Formula's rules directly underneath, in the same `Name: text` shape as a
 * Skill. Read as one it gives the House of Wisdom seven Skills.
 *
 * It is not a Skill, and the evidence is outside the prose: `Hypnotic Eyes`,
 * `Terrifying Appearance`, `Regenerative Tissue` and `Startling Speed` — the
 * four Alchemical Formulae the entry's other Skills name — are all in the
 * BattleScribe catalogues as Alchemical Formulae, and `Zīj Seal` is in none of
 * them. It is a new Formula this book introduces, so this book has to print
 * its rules.
 *
 * It is moved, not dropped. A Formula a player can buy for 20 👑 is game data,
 * and a Patron entry that quietly lost it would be the same kind of hole as
 * one short a Skill — so it ships as `introduces`, beside the Skill that
 * unlocks it, and the Codex renders it there.
 *
 * Only a block an earlier Skill introduced **by name and as a Formula** moves.
 * Anything else in excess of six fails the build, because the next one may
 * well be a Skill we are losing.
 */
function withoutIntroducedItems(patron) {
  if (patron.skills.length <= SKILLS_PER_PATRON) return patron;

  const introducedBy = (s, i) => patron.skills.slice(0, i).find((earlier) =>
    new RegExp(`${s.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+Alchemical Formulae`)
      .test(earlier.description));

  const skills = [];
  const introduces = [];
  patron.skills.forEach((s, i) => {
    const via = introducedBy(s, i);
    if (via) introduces.push({ ...s, kind: 'Alchemical Formulae', unlockedBy: via.name });
    else skills.push(s);
  });

  return { ...patron, skills, introduces };
}

/**
 * Every Patron in both books, in printed order.
 *
 * Throws unless each has exactly six Skills. A Patron short of one has lost a
 * rule a player will roll for; a Patron over six has swallowed something that
 * is not a Skill. Both read as a working Patron on the page.
 */
export function parsePatrons({
  rulebook = RULEBOOK_TXT,
  carcassFront = true,
} = {}) {
  const patrons = patronBlocks(rulebookChapter(rulebook))
    .map((b) => readPatron(b, (l) => RULEBOOK_SKILL.exec(l), 'rulebook'));

  if (carcassFront) patrons.push(...parseCarcassFrontPatrons());

  const checked = patrons.map(withoutIntroducedItems);

  for (const p of checked) {
    if (p.skills.length !== SKILLS_PER_PATRON) {
      throw new Error(
        `parse-patrons: ${p.name} (${p.source}) came out with ${p.skills.length} `
        + `Skills, not ${SKILLS_PER_PATRON}: `
        + `[${p.skills.map((s) => s.name).join(' | ')}]. Every Patron in both `
        + 'books has exactly six, so this is a parse failure — and a Patron '
        + 'with five Skills looks exactly like a Patron with five Skills.');
    }
    if (!p.lore) {
      throw new Error(`parse-patrons: ${p.name} (${p.source}) has no lore paragraph.`);
    }
  }

  const names = checked.map((p) => p.name);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length) {
    throw new Error(`parse-patrons: two Patrons share a name: ${[...new Set(dupes)].join(', ')}.`);
  }

  return checked.map((p) => ({ id: slug(p.name), introduces: [], ...p }));
}

/**
 * The three Patrons Carcass Front adds.
 *
 * The count is the book's own — *"Three new Patrons are included in Carcass
 * Front"* — read out of the text and checked against what parsed, rather than
 * written here as a constant. A supplement that gains a Patron in a later
 * printing then fails the build instead of shipping two of three.
 */
export function parseCarcassFrontPatrons() {
  const lines = chapterLines('Campaigns on the Carcass Front');

  const stated = /\b(One|Two|Three|Four|Five|Six)\b new Patrons are included/i
    .exec(lines.join('\n'));
  if (!stated) {
    throw new Error(
      'parse-patrons: Carcass Front no longer states how many new Patrons it '
      + 'includes. That sentence is the only independent check on the parse.');
  }
  const expected = ['one', 'two', 'three', 'four', 'five', 'six']
    .indexOf(stated[1].toLowerCase()) + 1;

  const patrons = patronBlocks(lines)
    .map((b) => readPatron(b, (l) => CF_SKILL.exec(l), 'carcass-front'));

  if (patrons.length !== expected) {
    throw new Error(
      `parse-patrons: Carcass Front says ${expected} new Patrons and `
      + `${patrons.length} parsed: [${patrons.map((p) => p.name).join(', ')}].`);
  }
  return patrons;
}
