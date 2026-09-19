/**
 * The Carcass Front Vision cards.
 *
 * Sixteen cards, dealt one per player at the start of a Carcass Front
 * campaign: *"The Vision card will provide you with an objective that your
 * Patron wishes you to fulfil."* Each carries three tiers of the same
 * objective, worth 10, 15 and 20 🏅, and *"the scores are cumulative for each
 * level that you achieve"* — so a card that is fully achieved is worth 45.
 *
 * They are scored at the very end of the campaign, after the Campaign
 * Trackers are totalled and the Shared Objectives allocated, and a player is
 * meant to keep evidence for them all the way through. A player who cannot see
 * their card's wording until the end of the campaign cannot do that.
 *
 * ## The card is a card, so its title is wherever the layout put it
 *
 * These are print-ready cards on four sheets, not a chapter, and the
 * extraction gives the pieces of each card in whatever order the page laid
 * them out. The title lands **before** its objectives on the first two cards
 * and **after** them on the other fourteen — the same page-furniture problem
 * the book's chapters have, on a smaller page.
 *
 * So the title is not found by position. Three facts fix the assignment and
 * all three are checked:
 *
 *   1. There are exactly **sixteen** objective groups and exactly **sixteen**
 *      title candidates.
 *   2. Each title belongs to exactly one card — the matching is a bijection,
 *      taken nearest-first.
 *   3. **No other card's objectives lie between a title and its group.** A
 *      title cannot belong to a card if another card's objectives sit in
 *      between it, and this is what turns "nearest" from a guess into a rule.
 *
 * Nearest-title alone is not enough, and the failure is worth recording: it
 * gives `Idol`, `Butcher` and `Survivor` two cards each and leaves
 * `Specialist`, `Lion` and `Diplomat` with none — and the mis-assignments read
 * perfectly well, because every one of these words describes a warband.
 */
import fs from 'node:fs';
import { toLines } from './lines.mjs';

export const VISION_CARDS_TXT =
  'data-sources/carcass-front/extracted/vision-cards.txt';

/** Sixteen cards in the deck, three tiers on each. */
export const CARD_COUNT = 16;
export const TIERS = [10, 15, 20];

/** `** Win 2 games as the Aggressor: 10` — a tier of the card's objective. */
const OBJECTIVE = /^\*\*\s+(.*)$/;

/** `…: 10` — the tier's score, which is also where the objective's text ends. */
const SCORE = /:\s*(\d+)\s*$/;

/** `Warlord`, `War Priest` — a card's title: one or two Capitalised words. */
const TITLE = /^[A-Z][a-z]+(?: [A-Z][a-z]+)?$/;

/*
  The cards carry a printed number (`•10101/26`), and it is deliberately NOT
  emitted.

  The sixteen numbers are all present in the extraction, but they land wherever
  the sheet's layout put them rather than beside the card they belong to, and
  one of them (`10101`) is printed twice while `10104` sits next to a different
  card's title. Any rule for attaching them that this parser could state would
  be a guess, and a Vision card labelled with another card's number is exactly
  the plausible-looking wrong value this pipeline exists to prevent.

  The title is the identity instead. All sixteen are distinct, and the title is
  what a player reads off the card in their hand.
*/

/**
 * Everything on the sheet that is not a card's content.
 *
 * The blank `NO. _` and `OFFICE STAMP` fields the cards are printed with, the
 * artist credits, the sheet's page numbers and the copyright line. `189NO. _`
 * is a page number the extraction ran into the field beside it.
 */
const FURNITURE = [
  /^\d*NO\. _$/,
  /^OFFICE STAMP$/,
  /^-- \d+ of \d+ --$/,
  /^\d*\s*Copyright ©/,
  /^\d{1,4}$/,
  /^•/,
];

/**
 * The private-use glyph the cards print as a tick box beside each tier.
 *
 * U+1045C, in Supplementary Private Use Area-**B**. Matching only Area-A
 * (U+F0000–U+FFFFD) missed it, and it then arrived on the front of every card
 * note: "􁐼 An Outpost is in supply if…".
 */
const TICK_BOX = /^[\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}\s]+$/u;

/** `• Mike Franchina` — the artist credit printed on each card. */
const ARTIST = /^•\s*[A-Z]/;

const isFurniture = (l) => FURNITURE.some((f) => f.test(l)) || TICK_BOX.test(l);

/**
 * A quotation and its attribution, which most cards close on.
 *
 * The attribution wraps on at least one card — the Architect's runs `– Recipe
 * for infernal concrete,` / `also sold as “Little Horn’s Moonshine”` — so a
 * quotation, once opened, runs to the end of the card. Ending it at the
 * attribution line put that second half in the card's rules notes, where it
 * read as a rule.
 */
const QUOTE_OPEN = /^[“"]/;
const ATTRIBUTION = /^[-–—]\s*\S/;

export function parseVisionCards(file = VISION_CARDS_TXT) {
  if (!fs.existsSync(file)) {
    throw new Error(
      `${file} not found. Extract it first: `
      + 'npm run rules:extract -- data-sources/carcass-front/vision-cards.pdf '
      + `${file}`);
  }

  const lines = toLines(fs.readFileSync(file, 'utf8')).map((l) => l.replace(/\s+$/, ''));

  /* ---- 1. the objective groups, three tiers each ---- */
  const tiers = [];
  for (let i = 0; i < lines.length; i++) {
    const m = OBJECTIVE.exec(lines[i].trim());
    if (!m) continue;
    /*
      A tier's text wraps, and it ends where its score is printed — the score
      is the terminator, not the line break. `** One ELITE` / `model has 2 or
      more` / `Glory Items: 10` is one tier printed over three lines.
    */
    const parts = [m[1]];
    let j = i;
    while (j + 1 < lines.length && !SCORE.test(parts[parts.length - 1])) {
      j += 1;
      const next = lines[j].trim();
      if (!next || isFurniture(next) || OBJECTIVE.test(next)) break;
      parts.push(next);
    }
    const text = parts.join(' ').replace(/\s+/g, ' ').trim();
    const score = SCORE.exec(text);
    if (!score) {
      throw new Error(
        `parse-vision-cards: the tier opening "${parts[0].slice(0, 48)}…" has no `
        + 'score. Every tier on every card is printed with one, and a tier '
        + 'without its 🏅 is an objective a player cannot score.');
    }
    tiers.push({
      at: i,
      end: j,
      text: text.replace(SCORE, '').trim(),
      points: Number(score[1]),
    });
    i = j;
  }

  if (tiers.length !== CARD_COUNT * TIERS.length) {
    throw new Error(
      `parse-vision-cards: read ${tiers.length} tiers, expected `
      + `${CARD_COUNT * TIERS.length} (${CARD_COUNT} cards × ${TIERS.length}).`);
  }

  const groups = [];
  for (let i = 0; i < tiers.length; i += TIERS.length) {
    const g = tiers.slice(i, i + TIERS.length);
    // Every card scores 10, 15 and 20, in that order. A group that does not is
    // three tiers taken from two different cards.
    const points = g.map((t) => t.points);
    if (points.join(',') !== TIERS.join(',')) {
      throw new Error(
        `parse-vision-cards: a card's tiers score [${points.join(', ')}], not `
        + `[${TIERS.join(', ')}]: "${g[0].text.slice(0, 48)}…". Every card in `
        + 'the deck scores the same three, so this group spans two cards.');
    }
    groups.push({ from: g[0].at, to: g[g.length - 1].end, tiers: g });
  }

  /* ---- 2. the titles, which are not where the objectives are ---- */
  const titles = [];
  lines.forEach((l, i) => {
    const t = l.trim();
    if (!t || isFurniture(t) || OBJECTIVE.test(t) || QUOTE_OPEN.test(t) || ATTRIBUTION.test(t)) return;
    if (TITLE.test(t)) titles.push({ at: i, name: t });
  });

  if (titles.length !== CARD_COUNT) {
    throw new Error(
      `parse-vision-cards: read ${titles.length} card titles, expected ${CARD_COUNT}: `
      + `[${titles.map((t) => t.name).join(', ')}].`);
  }

  assignTitles(groups, titles);

  /* ---- 3. each card's flavour and its notes ---- */
  const titleLines = new Set(titles.map((t) => t.at));
  return groups.map((g) => card(g, lines, groups, titleLines));
}

/**
 * Match each objective group to its title, nearest pair first.
 *
 * Nearest-first over all pairs rather than group by group: a group whose title
 * is unambiguous should claim it before a group whose nearest is already
 * spoken for, and processing in reading order does not do that.
 */
function assignTitles(groups, titles) {
  const distance = (g, t) => Math.min(Math.abs(t.at - g.from), Math.abs(t.at - g.to));
  const pairs = groups
    .flatMap((g) => titles.map((t) => ({ g, t, d: distance(g, t) })))
    .sort((a, b) => a.d - b.d || a.g.from - b.g.from);

  const takenTitle = new Set();
  for (const { g, t } of pairs) {
    if (g.title || takenTitle.has(t.name)) continue;
    g.title = t;
    takenTitle.add(t.name);
  }

  for (const g of groups) {
    if (!g.title) {
      throw new Error(
        `parse-vision-cards: the card whose first tier reads `
        + `"${g.tiers[0].text.slice(0, 48)}…" was left without a title.`);
    }
    /*
      The check that makes "nearest" a rule instead of a guess: a title cannot
      belong to a card if ANOTHER card's objectives sit between them.

      Without it the matching gives Idol, Butcher and Survivor two cards each
      and leaves Specialist, Lion and Diplomat with none — and every one of
      those reads perfectly well on the card it lands on, because all sixteen
      are words that describe a warband.
    */
    const lo = Math.min(g.title.at, g.from);
    const hi = Math.max(g.title.at, g.to);
    const between = groups.find((o) => o !== g && o.from > lo && o.to < hi);
    if (between) {
      throw new Error(
        `parse-vision-cards: the title "${g.title.name}" was matched to the card `
        + `whose first tier reads "${g.tiers[0].text.slice(0, 40)}…", but another `
        + `card's objectives ("${between.tiers[0].text.slice(0, 40)}…") are printed `
        + 'between them. The match is wrong.');
    }
  }
}

/** One card: its title, three tiers, and whatever it prints under them. */
function card(g, lines, groups, titleLines) {
  /*
    A card's remaining content runs from the end of its objectives to the
    start of the NEXT card's objectives.

    Not from the end of the previous card: a title sits before its objectives
    on the first two cards and after them on the other fourteen, so a region
    bounded by "previous card's last line" cuts across the quotation printed
    under the previous card's tiers. Bounded that way, Ascetic inherited
    Warlord's flavour and Legend inherited Ascetic's — three cards carrying
    another card's quotation, and every one of them reading like a card.

    Every card's own flavour, note and footnote is printed directly under its
    tiers, which is what makes this boundary the right one.
  */
  const next = groups.filter((o) => o.from > g.to).map((o) => o.from);
  const to = next.length ? Math.min(...next) : lines.length;

  const quote = [];
  const notes = [];
  let inQuote = false;
  let afterCredit = false;

  for (let i = g.to + 1; i < to; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    const credit = ARTIST.test(t);
    if (isFurniture(t)) { afterCredit = credit; continue; }
    // Any card's title, not only this one's: the next card's title is often
    // printed inside this region.
    if (titleLines.has(i)) { afterCredit = false; continue; }
    /*
      An artist credit that wrapped. One does: `• Eduard` / `o Valdés-Hevia`,
      broken mid-name, and the second half has no shape of its own — so it is
      recognised by what it follows rather than by what it looks like, and it
      otherwise arrives on the front of the Raider card's notes.
    */
    if (afterCredit) { afterCredit = false; continue; }
    if (QUOTE_OPEN.test(t)) { inQuote = true; quote.push(t); continue; }
    if (ATTRIBUTION.test(t)) { inQuote = true; quote.push(t); continue; }
    if (inQuote) { quote.push(t); continue; }
    // Not every card closes on a quotation: some print a clarification of
    // their own objective instead ("An Outpost is in supply if…").
    notes.push(t);
  }

  return {
    id: g.title.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: g.title.name,
    /** 10, 15 and 20 🏅, and the book says the scores are cumulative. */
    tiers: g.tiers.map((t) => ({ text: t.text, points: t.points })),
    /** Everything on the card scores 🏅, so a fully achieved card is worth 45. */
    maxPoints: g.tiers.reduce((n, t) => n + t.points, 0),
    flavour: quote.join(' ').replace(/\s+/g, ' ').trim(),
    note: notes.join(' ').replace(/\s+/g, ' ').trim(),
  };
}
