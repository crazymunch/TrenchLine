import { describe, it, expect } from 'vitest';
import { parsePatrons, parseCarcassFrontPatrons, SKILLS_PER_PATRON } from '../parse-patrons.mjs';

/**
 * Every assertion is a value printed in the digital rulebook or in Carcass
 * Front. The groups are the four places the first pass got it wrong, each of
 * which produced a Patron that read as a working Patron on the page.
 */
const patrons = parsePatrons();
const byName = (n) => patrons.find((p) => p.name === n);

describe('the Patron list', () => {
  it('reads all eleven, from the two books that print them', () => {
    expect(patrons.map((p) => p.name)).toEqual([
      'TEMPORAL LORD', 'WARRIOR SAINT', 'LEARNED SAINT', 'INFERNAL NOBLE',
      'SUBLIME GATE', 'THE ORDER OF THE FLY', 'MAMMON', 'THE ANTIPOPE OF AVIGNON',
      'HOUSE OF WISDOM', 'BLESSED BARTOLOMEO', 'WAR PRIEST CHARON',
    ]);
    expect(patrons.filter((p) => p.source === 'rulebook')).toHaveLength(8);
    expect(patrons.filter((p) => p.source === 'carcass-front')).toHaveLength(3);
  });

  /*
    The invariant the whole parser rests on, and the one that caught the
    Antipope swallowing the Campaign Phase steps.
  */
  it('gives every Patron exactly six Skills', () => {
    for (const p of patrons) expect(p.skills.length, p.name).toBe(SKILLS_PER_PATRON);
  });

  it('reads the restriction, which is what makes a heading a Patron', () => {
    expect(byName('TEMPORAL LORD').restriction).toBe('New Antioch only.');
    expect(byName('HOUSE OF WISDOM').restriction).toBe('Iron Sultanate only.');
    expect(byName('BLESSED BARTOLOMEO').restriction).toBe('Faithful Warbands only.');
    expect(byName('WAR PRIEST CHARON').restriction).toBe('Fallen Warbands only.');
    // Mammon's wraps across two lines, and the second carries the parenthesis.
    expect(byName('MAMMON').restriction).toBe(
      'Heretic Legions or Court of the Seven-Headed Serpent (Greed Warband) only.');
  });
});

/*
  The rulebook's Patrons are the last thing in their chapter, and the six
  Campaign Phase steps printed on the page after it are bulleted exactly like a
  Skill: `** Trauma Step: …`. Read to the end of the file the Antipope of
  Avignon came out with twelve Skills, six of which are not Skills at all.
*/
describe('the end of the chapter', () => {
  it('stops the Antipope at its own six Skills', () => {
    expect(byName('THE ANTIPOPE OF AVIGNON').skills.map((s) => s.name)).toEqual([
      'Beelzebub’s Wisdom', 'Eye of Beelzebub ACTION', 'Feast on Disease',
      'Infect the Mind', 'Silvered Tongue ACTION', 'Swine Hybrid',
    ]);
  });

  it('does not read a Campaign Phase step as a Patron Skill', () => {
    const all = patrons.flatMap((p) => p.skills.map((s) => s.name));
    for (const step of ['Trauma Step', 'Exploration Step', 'Quartermaster Step',
      'Reinforcements Step (Optional)', 'Roster Step']) {
      expect(all, step).not.toContain(step);
    }
  });
});

/*
  The sentence that separates a Patron's lore from its Skills wraps, and it
  wraps in BOTH books — after `allows you to take` for the Antipope, after
  `allows you to take the` for the House of Wisdom. Anchoring on the half that
  ends in `Skills:` left the other half glued to the end of the lore.
*/
describe('the lore paragraph', () => {
  it('ends on the lore, not on half of the Skills sentence', () => {
    for (const p of patrons) {
      expect(p.lore, p.name).not.toMatch(/allows you to take/);
      expect(p.lore, p.name).toMatch(/[.!?]$/);
    }
  });

  it('reads the whole paragraph, opening on the book’s own words', () => {
    expect(byName('HOUSE OF WISDOM').lore).toBe(
      'Your Patron is of the bloodline of a fabled alchemist such as ibn Sina, '
      + 'ibn Umayl, or even an entire school within the House of Wisdom. Such '
      + 'Patrons offer rare and esoteric knowledge and treatments from the '
      + 'Sultan’s most secretive laboratories, both for the glory of Allah and '
      + 'for practical field testing.');
  });

  it('leaves the letter under the House of Wisdom out of it', () => {
    for (const p of patrons) expect(p.lore, p.name).not.toMatch(/Peace be upon you/);
  });
});

/*
  `Zīj Seal` is printed in the House of Wisdom's Skill list, in a Skill's
  shape, and is not a Skill: it is a new Alchemical Formula that the
  `Whispering Zīj` Skill above it lets a Takwin Homunculus buy for 20 👑.

  The evidence is outside the prose. The four Formulae the entry's other Skills
  name — Hypnotic Eyes, Terrifying Appearance, Regenerative Tissue, Startling
  Speed — are all in the BattleScribe catalogues; `Zīj Seal` is in none of
  them, so it is new here and this book has to print its rules.
*/
describe('a Formula printed among the Skills', () => {
  const wisdom = byName('HOUSE OF WISDOM');

  it('keeps the House of Wisdom to its six Skills', () => {
    expect(wisdom.skills.map((s) => s.name)).toEqual([
      'Elemental Savant', 'Experimental Ammunition', 'Eyes of Hanayn',
      'Jinn Talisman ACTION', 'Heart of al-Jazari', 'Whispering Zīj',
    ]);
  });

  it('carries the Formula rather than dropping it, beside the Skill that unlocks it', () => {
    expect(wisdom.introduces).toHaveLength(1);
    expect(wisdom.introduces[0]).toMatchObject({
      name: 'Zīj Seal', kind: 'Alchemical Formulae', unlockedBy: 'Whispering Zīj',
    });
    expect(wisdom.introduces[0].description).toMatch(
      /Enemy models cannot use the INFILTRATOR Keyword to deploy within 12” of a model/);
  });

  it('is the only entry in either book that prints one', () => {
    for (const p of patrons.filter((x) => x.name !== 'HOUSE OF WISDOM')) {
      expect(p.introduces, p.name).toEqual([]);
    }
  });
});

/*
  The extraction hyphenates across the column break, and whether the hyphen
  survives is a decision — see `dehyphenate.mjs`.
*/
describe('wrapped words', () => {
  it('rejoins a word the column broke', () => {
    const eyes = byName('HOUSE OF WISDOM').skills.find((s) => s.name === 'Eyes of Hanayn');
    expect(eyes.description).toMatch(/you can immediately purchase/);
    expect(eyes.description).toMatch(/replacing instances of “Takwin Homunculus”/);
  });

  it('leaves a real hyphen alone', () => {
    const ammo = byName('HOUSE OF WISDOM').skills.find((s) => s.name === 'Experimental Ammunition');
    expect(ammo.description).toMatch(/Armour-Piercing Bullets/);
    expect(ammo.description).toMatch(/Dum-Dum Ammunition/);
  });
});

describe('Carcass Front’s three', () => {
  /*
    The book states the count itself — "Three new Patrons are included in
    Carcass Front" — and the parser reads that sentence and checks the parse
    against it, rather than carrying a 3 written here.
  */
  it('agrees with the count the book states', () => {
    expect(parseCarcassFrontPatrons().map((p) => p.name)).toEqual([
      'HOUSE OF WISDOM', 'BLESSED BARTOLOMEO', 'WAR PRIEST CHARON',
    ]);
  });

  it('reads a Skill verbatim, glyphs and all', () => {
    expect(byName('WAR PRIEST CHARON').skills.find((s) => s.name === 'Fire and Fear').description)
      .toBe('Pick one Skill from the Ranged Skills Table and give it to this model.');
    expect(byName('BLESSED BARTOLOMEO').skills.find((s) => s.name === 'Martyr of Leviathan').description)
      .toBe('When a model with this Skill is deployed for the first time, place D3 '
        + 'BLESSING MARKERS next to the model.');
  });

  /*
    Not a Carcass Front feature: "The following new Patrons can be taken by
    eligible Warbands in any Campaign (not just a Carcass Front Campaign)."
    They are read alongside the rulebook's eight for that reason.
  */
  it('sits in one list with the rulebook’s', () => {
    expect(patrons.map((p) => p.id)).toContain('house-of-wisdom');
    expect(patrons.map((p) => p.id)).toContain('temporal-lord');
  });
});
