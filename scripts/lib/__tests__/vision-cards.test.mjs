import { describe, it, expect } from 'vitest';
import { parseVisionCards, CARD_COUNT, TIERS } from '../parse-vision-cards.mjs';

/**
 * The sixteen Vision cards. Every assertion is printed on a card.
 *
 * These are print-ready cards on four sheets rather than a chapter, so the
 * extraction hands back the pieces of each card in whatever order the page
 * laid them out. Each group below is a place that cost a card the wrong
 * content — and a Vision card with another card's title, or another card's
 * quotation, reads perfectly well.
 */
const cards = parseVisionCards();
const card = (t) => cards.find((c) => c.title === t);

describe('the deck', () => {
  it('reads all sixteen', () => {
    expect(cards).toHaveLength(CARD_COUNT);
    expect(cards.map((c) => c.title)).toEqual([
      'Warlord', 'Ascetic', 'Legend', 'Conqueror', 'Architect', 'Explorer',
      'Idol', 'Specialist', 'Butcher', 'Lion', 'Raider', 'Champion',
      'Leader', 'Survivor', 'Diplomat', 'Veteran',
    ]);
  });

  it('gives every card three tiers scoring 10, 15 and 20', () => {
    for (const c of cards) {
      expect(c.tiers.map((t) => t.points), c.title).toEqual(TIERS);
      // "the scores are cumulative for each level that you achieve"
      expect(c.maxPoints, c.title).toBe(45);
    }
  });

  it('keys a card by its title, not by the number printed on it', () => {
    // The printed numbers are all in the extraction and none of them can be
    // attached to a card safely: they land wherever the sheet's layout put
    // them, `10101` appears twice, and `10104` sits beside another card's
    // title. A card labelled with another card's number is exactly the
    // plausible-looking wrong value the pipeline exists to prevent.
    expect(cards.map((c) => c.id)).toEqual(cards.map((c) => c.title.toLowerCase()));
    expect(new Set(cards.map((c) => c.id)).size).toBe(CARD_COUNT);
  });
});

/*
  A card's title sits BEFORE its objectives on the first two cards and AFTER
  them on the other fourteen — the book's page-furniture problem on a smaller
  page. Nearest-title alone gives Idol, Butcher and Survivor two cards each and
  leaves Specialist, Lion and Diplomat with none, and every one of those
  mis-assignments reads well, because all sixteen words describe a warband.

  What makes the match a rule rather than a guess is that no other card's
  objectives may lie between a title and its own. These four are the pairs that
  a wrong match separates, and each reads as its title on inspection.
*/
describe('titles', () => {
  it('matches each title to the card it describes', () => {
    expect(card('Diplomat').tiers[0].text).toBe('Have 1 Mercenary in your Warband');
    expect(card('Veteran').tiers[0].text).toBe('Promote 1 model to ELITE by the end of the campaign');
    expect(card('Specialist').tiers.map((t) => t.text)).toEqual([
      'Have a Tier I Building', 'Have a Tier II Building', 'Have a Tier III Building',
    ]);
    expect(card('Architect').tiers[0].text).toBe('Have at least 1 Tier I Building');
    expect(card('Warlord').tiers[0].text).toBe('Win 2 games as the Aggressor');
    expect(card('Butcher').tiers[0].text).toBe('Have 14 models in your Warband die');
  });
});

/*
  A tier's text wraps, and it ends where its score is printed rather than at a
  line break. `** One ELITE` / `model has 2 or more` / `Glory Items: 10` is one
  tier over three lines.
*/
describe('a tier that wrapped', () => {
  it('is read as one objective', () => {
    expect(card('Idol').tiers.map((t) => t.text)).toEqual([
      'One ELITE model has 2 or more Glory Items',
      'Three ELITE models have 2 or more Glory Items',
      'Six ELITE models have 2 or more Glory Items',
    ]);
    expect(card('Explorer').tiers[0].text)
      .toBe('Have 2 zones that your only your Warband has Scouted');
  });

  it('keeps a footnote marker, and the footnote it points at', () => {
    expect(card('Lion').tiers[0].text).toBe('Play 2 different scenarios *');
    expect(card('Lion').note).toBe('* Up to one random scenario can be included.');
  });
});

/*
  A card's quotation is printed directly under its tiers. Bounding a card's
  region by the PREVIOUS card's last line instead cut across that quotation,
  and Ascetic inherited Warlord's and Legend inherited Ascetic's — three cards
  carrying another card's words.
*/
describe('flavour', () => {
  it('gives each card its own quotation', () => {
    expect(card('Warlord').flavour).toMatch(/All is kindling before Elohim’s holy flame/);
    expect(card('Ascetic').flavour).toMatch(/Cast aside the trappings of thy flesh/);
    expect(card('Legend').flavour).toMatch(/Her blade was a righteous chorus/);
    // The Architect's is a recipe for infernal concrete, which is the one that
    // makes the assignment checkable by eye.
    expect(card('Architect').flavour).toMatch(/1 part cement, 2 parts bone ash/);

    const quoted = cards.map((c) => c.flavour).filter(Boolean);
    expect(new Set(quoted).size, 'two cards share a quotation').toBe(quoted.length);
  });

  it('keeps an attribution that wrapped with its quotation', () => {
    // "– Recipe for infernal concrete," / "also sold as “Little Horn’s
    // Moonshine”". Ending the quotation at the attribution line put the second
    // half in the card's rules notes, where it read as a rule.
    expect(card('Architect').flavour).toMatch(/also sold as “Little Horn’s Moonshine”/);
    expect(card('Architect').note).toBe('');
  });

  it('does not invent one for a card that has none', () => {
    // Seven cards give the space to the artwork instead.
    expect(card('Explorer').flavour).toBe('');
    expect(card('Veteran').flavour).toBe('');
  });
});

describe('the sheet’s own furniture', () => {
  it('keeps the tick box, the credits and the copyright off the cards', () => {
    for (const c of cards) {
      const text = [c.note, c.flavour, ...c.tiers.map((t) => t.text)].join(' ');
      expect(text, c.title).not.toMatch(/Copyright ©/);
      expect(text, c.title).not.toMatch(/OFFICE STAMP|NO\. _/);
      // U+1045C, the tick box, which is in Private Use Area-B and not A.
      expect(text, c.title).not.toMatch(/[\u{100000}-\u{10FFFD}]/u);
    }
  });

  it('keeps an artist credit that wrapped mid-name off the card', () => {
    // `• Eduard` / `o Valdés-Hevia`, split across two lines.
    expect(card('Raider').note).toBe('');
    for (const c of cards) expect(c.note, c.title).not.toMatch(/Valdés-Hevia/);
  });

  it('keeps a card’s rules note when it has one', () => {
    expect(card('Conqueror').note).toBe(
      'An Outpost is in supply if you can trace a line of linked zones back to '
      + 'your Entry Zone. Each zone must have a friendly Outpost.');
  });
});
