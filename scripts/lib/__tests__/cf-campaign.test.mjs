import { describe, it, expect } from 'vitest';
import { parseCarcassFrontCampaigns } from '../parse-cf-campaign.mjs';

/**
 * Both campaigns, pp. 80-90. Every assertion is a value the book prints.
 *
 * The groups below are the places reading these two chapters by shape got it
 * wrong, and each has the same character as every other bug in this pipeline:
 * the output looked like a campaign.
 */
const [cf, path] = parseCarcassFrontCampaigns();
const section = (c, h) => c.sections.find((s) => s.heading === h);

describe('the two campaigns', () => {
  it('reads both, with the player counts the book states', () => {
    expect([cf.id, path.id]).toEqual(['carcass-front', 'path-to-leviathan']);
    expect(cf.players).toBe('2 or more');
    expect(path.players).toBe('2');
  });

  it('records that the map campaign needs the fold-out map', () => {
    // The zone board, the Carcass Front Zones table, the Special Zones table
    // and the generator charts it uses are printed on the map in the box and
    // appear in no PDF. Said out loud rather than left for a player to
    // discover that a rule points at a table the app does not have.
    expect(cf.requiresMap).toBe(true);
    expect(path.requiresMap).toBe(false);
  });

  it('carries every section with content, in printed order', () => {
    expect(cf.sections.length).toBeGreaterThanOrEqual(40);
    expect(cf.sections.map((s) => s.heading)).toContain('GAME RESULT SUMMARY');
    expect(cf.sections.map((s) => s.heading)).toContain('Outposts Step');
    expect(path.sections.map((s) => s.heading)).toContain('Campaign Conclusions');
    for (const s of [...cf.sections, ...path.sections]) expect(s.markdown, s.heading).toBeTruthy();
  });
});

/*
  Four rules separate a heading from a line of prose that starts like one, and
  every one of them is here because a line in these chapters breaks it. The
  Aerial Bombardment rules are set in a narrow column beside an illustration,
  so nearly every line of them is short enough to be a heading.
*/
describe('finding the headings', () => {
  it('does not read a wrapped line of prose as a heading', () => {
    const headings = cf.sections.map((s) => s.heading);
    for (const notAHeading of [
      'In order to use an Aerial Bom-',   // ends on a hyphen
      'We have provided an example of',   // ends on a function word
      'The ceremony of innocence',        // the next line continues it
      'Roll \tResult',                    // a table's header row
    ]) {
      expect(headings, notAHeading).not.toContain(notAHeading);
    }
  });

  it('joins a heading the column broke in two', () => {
    // `Carcass Front` / `Campaign Games` is one heading on two lines — the
    // section the book cross-references as "Carcass Front Campaign Games".
    expect(cf.sections.map((s) => s.heading)).toContain('Carcass Front Campaign Games');
  });

  it('keeps the book’s two levels', () => {
    expect(section(cf, 'GAME RESULT SUMMARY').level).toBe(1);
    expect(section(cf, 'Outposts Step').level).toBe(2);
  });
});

describe('the four Camp buildings', () => {
  it('reads all four, with three stacking tiers each', () => {
    expect(cf.buildings.map((b) => b.name)).toEqual(['Depot', 'Garrison', 'Shrine', 'Vault']);
    expect(cf.buildings.map((b) => b.glyph)).toEqual(['💰', '⛫', '🛐', '🏦']);
    for (const b of cf.buildings) {
      expect(b.tiers.map((t) => t.tier), b.name).toEqual([1, 2, 3]);
    }
  });

  it('reads a tier’s benefit as printed', () => {
    const depot = cf.buildings.find((b) => b.name === 'Depot');
    expect(depot.flavour).toBe('A supply station, a mound of ripe corpses, a field surgeon.');
    expect(depot.tiers[0].effect).toBe(
      'You can add or subtract 1 from your Exploration Roll when rolling on the '
      + 'Supplies Exploration Table.');
    // The Threshold Value change is a number in a sentence, so losing the
    // sentence loses the rule.
    expect(depot.tiers[1].effect).toMatch(/increase your Warband’s Threshold Value by 20 👑/);
    const garrison = cf.buildings.find((b) => b.name === 'Garrison');
    expect(garrison.tiers[2].effect).toMatch(/immediately recruit one Mercenary available to your Warband for no cost/);
  });
});

/*
  The extraction keeps the tab between the reward table's two columns on five
  of its fourteen rows and drops it on the other nine, so left to `toMarkdown`
  it renders as five table rows with two walls of run-on text either side —
  "+1 🎲 Roll an extra Exploration Dice in each Exploration Step. Reroll 🎲 You
  can reroll 1…". That is a lookup table nobody can look anything up in.
*/
describe('the Campaign Tracker rewards', () => {
  it('reads all fourteen, split into symbol and effect', () => {
    expect(cf.trackerRewards).toHaveLength(14);
    expect(cf.trackerRewards[0]).toEqual({
      symbol: '🏅', effect: 'Score the indicated number of Campaign Victory Points.',
    });
    expect(cf.trackerRewards.find((r) => r.symbol === 'Reroll 🎲').effect)
      .toBe('You can reroll 1 Exploration Dice in each Exploration Step.');
  });

  it('reads a symbol that was printed on two lines', () => {
    // `🗺` and `(Resource)`, with the effect underneath.
    expect(cf.trackerRewards.find((r) => r.symbol === '🗺 (Resource)').effect)
      .toBe('Roll on the Exploration Table for the indicated Resource type.');
  });

  it('renders the section as a table rather than as prose', () => {
    const md = section(cf, 'Campaign Tracker Rewards').markdown;
    expect(md).toMatch(/\| Reward \| Effect \|/);
    expect(md).toMatch(/\| \+👁 \| Fill in 1 box on your Favour Track\. \|/);
    expect(md).not.toMatch(/Step\. Reroll 🎲 You can reroll/);
  });

  /*
    A real cross-check between two independently read parts of the chapter: a
    reward that builds a building that does not exist, or a building no reward
    can ever build, is a parse failure in one of the two.
  */
  it('has exactly one reward per Camp building', () => {
    for (const b of cf.buildings) {
      expect(cf.trackerRewards.filter((r) => r.symbol.includes(b.glyph)), b.name)
        .toHaveLength(1);
    }
  });
});

describe('the two Shared Objectives', () => {
  it('reads both, with what each scores', () => {
    expect(cf.sharedObjectives.map((o) => [o.name, o.points])).toEqual([
      ['Herald of Leviathan', 6],
      ['Largest Enclave', 8],
    ]);
    expect(cf.sharedObjectives[1].description).toMatch(/trace a supply line of linked zones/);
  });
});

/*
  The Path to Leviathan's chapter closes on an eyewitness account of the
  battle, in quotation marks and under no heading of its own, so it falls
  inside the Campaign Conclusions section. Read as rules it gives `Serpent.`,
  `Dragon.`, `Monster.` and `Evil Absolute.` as four more conclusions — four
  short sentences, each opening a line, each following one that finished.
*/
describe('the three Campaign Conclusions', () => {
  it('reads exactly the three, and what each is worth', () => {
    expect(path.conclusions.map((c) => [c.name, c.result])).toEqual([
      ['The summoning fails', 'Draw'],
      ['Leviathan is summoned but not subdued', 'Minor Victory'],
      ['Leviathan is summoned and subdued', 'Total Victory'],
    ]);
  });

  it('keeps the condition each one turns on', () => {
    // Two facts decide the whole campaign: whether Leviathan was summoned in
    // Scenario V, and whether the summoner also holds the cannon from IV.
    expect(path.conclusions[1].description)
      .toMatch(/does not control the railway cannon from Scenario IV: The Sword of God/);
    expect(path.conclusions[2].description)
      .toMatch(/also has control of the railway cannon from Scenario IV: The Sword of God/);
  });

  it('does not read the closing eyewitness account as a conclusion', () => {
    const names = path.conclusions.map((c) => c.name);
    for (const fiction of ['Serpent', 'Dragon', 'Monster', 'Evil Absolute']) {
      expect(names, fiction).not.toContain(fiction);
    }
  });
});

describe('the prose', () => {
  it('carries no page furniture into a section', () => {
    for (const c of [cf, path]) {
      for (const s of c.sections) {
        expect(s.markdown, `${c.id}/${s.heading}`).not.toMatch(/-- \d+ of \d+ --/);
      }
    }
  });

  it('keeps a table a player rolls on as a table', () => {
    // The Strafing Run's shoot-down table, which is rolled on mid-game.
    const md = section(cf, 'Shoot it Down').markdown;
    expect(md).toMatch(/\| Roll \| Result \|/);
    expect(md).toMatch(/\| 2-7 \| No Effect\. \|/);
    expect(md).toMatch(/\| 12 \| Shot Down: The Aircraft Marker is destroyed/);
  });

  it('keeps the numbers that make the Carcass Front loot rule different', () => {
    // × 5, not the rulebook's × 10, and it appears on all four outcomes.
    const md = section(cf, 'GAME RESULT SUMMARY').markdown;
    expect(md.match(/Exploration Roll × 5 in 👑/g)).toHaveLength(4);
  });

  it('rejoins a word the column broke', () => {
    expect(section(cf, 'Shoot it Down').markdown).not.toMatch(/Explora- tion/);
    expect(cf.buildings.find((b) => b.name === 'Garrison').tiers[2].effect)
      .not.toMatch(/[a-z]- [a-z]/);
  });
});
