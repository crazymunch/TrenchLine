/**
 * Glory Items behind their gate (RR-14, FD-10), and the tables they come from.
 *
 * Two things had to be true before the gate could mean anything, and neither
 * was: the Glory Item Tables had never been parsed, and nothing recorded the
 * Exploration discovery that opens them.
 *
 * Page 125:
 *
 * > Glory Items … are similar in many ways to the Battlekit that can only be
 * > purchased with ☼ that are found in the Armoury Tables of a Faction List.
 * > **However**, Glory Items can only be purchased during a campaign and if the
 * > Warband has made a discovery from an Exploration Table that allows them to
 * > take a Glory Item for free or purchase it in the Quartermaster Step.
 *
 * Every number here reads from `DATASET`. The ceilings come from the Locations'
 * own sentences, the rows from the six parsed tables, and the one literal in
 * the file is the count of tables the book prints.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import type { Dataset, ArmouryRow } from '@/types/catalogue';
import { recruitable } from '../recruitable';
import { explorationGrants } from '../campaign';
import {
  gloryItemPermission, offerableRows, isGloryItem, gloryItemNotice,
} from '../gloryItems';
import { explorationChoices } from '../campaign';

const dataset = DATASET as unknown as Dataset;
const factionIds = (dataset.factions ?? []).map((f) => f.id);

const armoury = (id: string) => dataset.armouries!.find((a) => a.factionId === id)!;
const gloryRows = (id: string) => armoury(id).rows.filter(isGloryItem);

/** A Location, by name, out of whichever Exploration table prints it. */
const location = (name: string) =>
  Object.values(dataset.campaign!.exploration!.locations as Record<string, {
    name: string; description?: string }[]>)
    .flat().find((l) => l.name === name)!;

describe('the Glory Item Tables', () => {
  it('are parsed, one per faction the book prints one for', () => {
    const withTables = dataset.armouries!.filter((a) => gloryRows(a.factionId).length);
    expect(withTables.map((a) => a.factionId).sort()).toEqual([
      'court-of-the-seven-headed-serpent',
      'cult-of-the-black-grail',
      'heretic-legions',
      'iron-sultanate',
      'new-antioch',
      'trench-pilgrims',
    ]);
  });

  it('price every row in Glory, as every row in those tables is', () => {
    const rows = dataset.armouries!.flatMap((a) => gloryRows(a.factionId));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.filter((r) => r.cost.ducats !== 0)).toEqual([]);
    expect(rows.filter((r) => r.cost.glory <= 0)).toEqual([]);
  });

  /*
    The footnote markers the PDF superscripts and the extraction flattens. Left
    alone these read "Limit: 11" and "Limit: 33" — a Warband entitled to eleven
    Ducal Winged Armours, which is invented game data of the exact kind rule 1
    exists to stop.
  */
  it('split a footnote marker off a limit rather than reading it as the limit', () => {
    const ducal = gloryRows('new-antioch').find((r) => r.name === 'Ducal Winged Armour')!;
    expect(ducal.restrictions[0]).toBe('Battlefield Title or Knighthood only, Limit: 1');
    expect(ducal.restrictions[1]).toMatch(/^Only a model that already has a Battlefield Title/);

    const muzzle = gloryRows('court-of-the-seven-headed-serpent')
      .find((r) => r.name === 'Restraining Muzzle')!;
    expect(muzzle.restrictions[0]).toBe('Yoke Fiends only, Limit: 3');
    expect(muzzle.restrictions[1]).toMatch(/A Warband can have up to 3 Restraining Muzzles/);
  });

  it('carries the footnote as a stipulation rather than discarding it', () => {
    const dog = gloryRows('heretic-legions').find((r) => r.name === 'Trench Dog')!;
    expect(dog.restrictions).toContain(
      'This item may not be taken by Trench Ghost Warbands.');
  });

  it('joins a name the book wrapped across two lines', () => {
    expect(gloryRows('new-antioch').map((r) => r.name))
      .toContain('Great Banner of New Antioch');
    expect(gloryRows('iron-sultanate').map((r) => r.name))
      .toContain('Mobile Sultanate Grand Cannon');
    expect(gloryRows('court-of-the-seven-headed-serpent').map((r) => r.name))
      .toContain('Koraktor, the Great Tome of Hell');
  });

  it('keeps a printed price range, and charges its lowest', () => {
    const dog = gloryRows('new-antioch').find((r) => r.name === 'Trench Dog')!;
    expect(dog.priceRange).toBe('1-3 ☼');
    expect(dog.cost.glory).toBe(1);
  });
});

describe('what opens the tables', () => {
  /*
    Three Locations grant a standing permission, and each states its own
    ceiling. None of those numbers is typed anywhere in the app.
  */
  it.each([
    ['Trench Merchant', 'Trade', 5],
    ['Black Market', undefined, 8],
    ['Black Network Contact', undefined, 12],
  ] as const)('%s opens them to %i Glory, from its own sentence', (name, choice, upTo) => {
    const granted = explorationGrants(dataset, location(name), 1, choice);
    expect(granted.map((g) => g.gloryItemsUpTo)).toContain(upTo);
  });

  /*
    And the Trench Merchant's OTHER option does not (finding B). Its two are
    alternatives — "Report: Your Warband gains 2 ☼" against "Trade: From now on,
    in the Quartermaster Step, you can purchase Glory Items costing 5 ☼ or
    less" — and the grant used to be read off the whole description, so a
    Warband that banked the Glory had the shop opened as well.
  */
  it('does not open them when the player takes the Trench Merchant\u2019s Report', () => {
    expect(explorationGrants(dataset, location('Trench Merchant'), 1, 'Report'))
      .toEqual([]);
  });

  it('and grants nothing at all until one of the options is chosen', () => {
    expect(explorationGrants(dataset, location('Trench Merchant'), 1)).toEqual([]);
  });

  it('offers exactly the options the Location prints', () => {
    expect(explorationChoices(location('Trench Merchant')).map((c) => c.label))
      .toEqual(['Report', 'Trade']);
    /* The Black Market states its permission outright and offers no choice. */
    expect(explorationChoices(location('Black Market'))).toEqual([]);
  });

  /*
    A Location that hands out ONE Glory Item is not a standing permission. The
    Ruined House offers "Choose one Glory Item worth up to 7 ☼ and add it to
    your Arsenal" — an item taken now, not a shop that stays open — and reading
    it as a permission would unlock the tables for the rest of the campaign.
  */
  it('a one-off find grants no standing permission', () => {
    for (const name of ['Ruined House', 'Heavy Weapons Cache', 'Warband Strongbox']) {
      const granted = explorationGrants(dataset, location(name), 1);
      expect(granted.filter((g) => g.gloryItemsUpTo !== undefined)).toEqual([]);
    }
  });

  it('takes the higher of two permissions, because the lower stays true', () => {
    const held = [
      ...explorationGrants(dataset, location('Trench Merchant'), 1, 'Trade'),
      ...explorationGrants(dataset, location('Black Network Contact'), 4),
    ];
    expect(gloryItemPermission(dataset, held).upTo).toBe(12);
  });

  it('reads no permission out of an empty roster', () => {
    const none = gloryItemPermission(dataset, []);
    expect(none.upTo).toBeNull();
    expect(none.sources).toEqual([]);
    /* Null, not zero: the shop is shut, which is a different fact from a
       ceiling of nothing. */
    expect(none.upTo).not.toBe(0);
  });
});

describe('the shelf a Warband is offered', () => {
  const rows = (id: string): ArmouryRow[] => armoury(id).rows;

  it('carries no Glory Items at all before a discovery', () => {
    const shut = gloryItemPermission(dataset, []);
    expect(offerableRows(rows('new-antioch'), shut).filter(isGloryItem)).toEqual([]);
  });

  it('still carries the Armoury Table\'s own Glory-priced Battlekit', () => {
    /* The distinction p.125 draws, and the reason the gate keys on the section
       rather than on the currency. A Troop Flag costs 1 Glory and needs no
       discovery; a Knighthood costs 4 Glory and does. */
    const shut = gloryItemPermission(dataset, []);
    const offered = offerableRows(rows('new-antioch'), shut);
    const gloryPriced = offered.filter((r) => r.cost.glory > 0);
    expect(gloryPriced.length).toBeGreaterThan(0);
    expect(gloryPriced.map((r) => r.name)).toContain('Troop Flag');
    expect(gloryPriced.map((r) => r.name)).not.toContain('Knighthood');
  });

  it('opens up to the discovery\'s ceiling and no further', () => {
    const merchant = gloryItemPermission(
      dataset, explorationGrants(dataset, location('Trench Merchant'), 1, 'Trade'));
    const offered = offerableRows(rows('new-antioch'), merchant).filter(isGloryItem);
    expect(offered.length).toBeGreaterThan(0);
    expect(offered.every((r) => r.cost.glory <= 5)).toBe(true);
    /* Priced at 12, and the Trench Merchant stops at 5. */
    expect(offered.map((r) => r.name)).not.toContain('Great Banner of New Antioch');
    expect(offered.map((r) => r.name)).toContain('Knighthood');
  });

  it('opens the whole table to a Black Network Contact', () => {
    const network = gloryItemPermission(
      dataset, explorationGrants(dataset, location('Black Network Contact'), 1));
    const offered = offerableRows(rows('new-antioch'), network).filter(isGloryItem);
    expect(offered).toHaveLength(gloryRows('new-antioch').length);
  });
});

describe('the recruit list', () => {
  it('offers no Glory Items to a Warband that has discovered nothing', () => {
    const r = recruitable(dataset, 'new-antioch', factionIds, undefined,
      gloryItemPermission(dataset, []));
    const names = [...r.weapons, ...r.armour, ...r.equipment].map((x) => x.name);
    expect(names).not.toContain('Knighthood');
    expect(names).not.toContain('Battlefield Title');
    /* And has lost nothing else: the Armoury Table's own Glory-priced rows are
       still there. */
    expect(names).toContain('Troop Flag');
  });

  it('offers them once a Trench Merchant has been found', () => {
    const r = recruitable(dataset, 'new-antioch', factionIds, undefined,
      gloryItemPermission(dataset,
        explorationGrants(dataset, location('Trench Merchant'), 1, 'Trade')));
    const names = [...r.weapons, ...r.armour, ...r.equipment].map((x) => x.name);
    expect(names).toContain('Knighthood');
  });

  /*
    A Sniper Scope is a Glory Item on three tables AND an entry in the
    Battlekit chapter, which files it as Equipment. `recruitable` normally lets
    the chapter's section win; if it did here, the row would be filed Equipment
    and walk straight through a gate that only looks at Glory Items.
  */
  it('does not let the Battlekit chapter re-file a Glory Item out of its gate', () => {
    expect(gloryRows('new-antioch').map((r) => r.name)).toContain('Sniper Scope');
    const r = recruitable(dataset, 'new-antioch', factionIds, undefined,
      gloryItemPermission(dataset, []));
    const names = [...r.weapons, ...r.armour, ...r.equipment].map((x) => x.name);
    expect(names).not.toContain('Sniper Scope');
  });

  /* No Warband is asking: the Codex describes the game, not one roster. */
  it('lists the whole table when no permission is supplied at all', () => {
    const r = recruitable(dataset, 'new-antioch', factionIds);
    const names = [...r.weapons, ...r.armour, ...r.equipment].map((x) => x.name);
    expect(names).toContain('Knighthood');
  });
});

describe('the sentence the player reads', () => {
  it('names what to go and do about it when the tables are shut', () => {
    expect(gloryItemNotice(gloryItemPermission(dataset, [])))
      .toMatch(/Trench Merchant|Black Market|Black Network/);
  });

  it('names the ceiling and its source when they are open', () => {
    const notice = gloryItemNotice(gloryItemPermission(
      dataset, explorationGrants(dataset, location('Black Market'), 2)));
    expect(notice).toContain('8 Glory');
    expect(notice).toContain('Black Market');
  });
});

describe('the rule itself', () => {
  it('is carried from the book rather than paraphrased', () => {
    expect(dataset.campaign!.quartermaster!.gloryItems.needsDiscovery).toBe(true);
    expect(dataset.campaign!.quartermaster!.gloryItems.text)
      .toMatch(/Glory Items can only be purchased during a campaign/);
  });
});
