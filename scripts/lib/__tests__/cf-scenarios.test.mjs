import { describe, it, expect } from 'vitest';
import { parseCarcassFrontScenarios } from '../parse-cf-scenarios.mjs';

/**
 * Every assertion is a value printed in the Carcass Front book.
 *
 * The chapter is read by shape, and each group below is a place the first pass
 * got that shape wrong. They are worth pinning because none of them produced
 * an obviously broken scenario — they produced a playable-looking one with a
 * rule missing or a rule added, which is the failure mode this project exists
 * to stop.
 */
const { scenarios, terrain } = parseCarcassFrontScenarios();

const byRoman = (r) => scenarios.find((s) => s.roman === r);
const section = (r, h) => byRoman(r)?.sections.find((x) => x.heading === h)?.body ?? '';
const piece = (n) => terrain.find((t) => t.title === n);

describe('the five scenarios', () => {
  /*
    The book sets `Ⅰ`, `ⅠⅠ`, `ⅠⅠⅠ` as one to three copies of U+2160 ROMAN
    NUMERAL ONE, then `Ⅳ` and `Ⅴ` as their own characters — so the numeral is
    counted, not looked up in a table of twelve.
  */
  it('reads all five, numbered from their own book', () => {
    expect(scenarios.map((s) => `${s.roman}. ${s.name}`)).toEqual([
      'I. The Ruins of Nineveh Novus',
      'II. Domus Demetrius',
      'III. The Steel Necropolis',
      'IV. The Sword of God',
      'V. The Altar of Leviathan',
    ]);
    expect(scenarios.map((s) => s.number)).toEqual([1, 2, 3, 4, 5]);
    for (const s of scenarios) expect(s.source).toBe('carcass-front');
  });

  it('gives each its six core sections', () => {
    for (const s of scenarios) {
      for (const h of ['FORCES', 'THE BATTLEFIELD', 'DEPLOYMENT',
                       'GAME LENGTH', 'VICTORY CONDITIONS', 'GLORIOUS DEEDS']) {
        expect(s.sections.find((x) => x.heading === h)?.body, `${s.roman} ${h}`).toBeTruthy();
      }
    }
  });

  /*
    Each scenario also carries a Path to Leviathan Consequences block, which
    the rulebook's twelve have no equivalent of: what winning it does to a
    later scenario. It sits under a Title-Case heading between the tagline and
    FORCES, so a parser looking only for ALL-CAPS headings folds it into the
    tagline and loses a rule.
  */
  it('keeps the Path to Leviathan consequences as a section of its own', () => {
    for (const s of scenarios) {
      expect(s.sections[0].heading, s.name).toBe('PATH TO LEVIATHAN CONSEQUENCES');
    }
    expect(section('I', 'PATH TO LEVIATHAN CONSEQUENCES'))
      .toContain('gains a bonus to summoning Leviathan in the final scenario');
    expect(byRoman('I').tagline).not.toContain('Path to Leviathan');
  });

  it('keeps the sections that make each scenario itself', () => {
    expect(byRoman('I').sections.map((x) => x.heading))
      .toEqual(expect.arrayContaining(['ANCIENT TABLETS', 'LUNATIC MONKS', 'THE CURSE OF NINEVEH']));
    expect(byRoman('II').sections.map((x) => x.heading))
      .toEqual(expect.arrayContaining(['CORPSE MOUNDS', 'CARRION FEEDERS']));
    expect(byRoman('V').sections.map((x) => x.heading))
      .toEqual(expect.arrayContaining(['THE ALTAR OF LEVIATHAN', 'THE VIOLENT SHORE']));
  });

  /*
    Not one of the five is a plain "lasts N Turns": three carry a second
    condition that ends the game early, and IV can end before Turn one is over.
    The hand-written scenarios this pipeline replaced showed a default of
    "5 Turns" for every scenario in the game.
  */
  it('reads the published game length, second condition and all', () => {
    expect(section('I', 'GAME LENGTH')).toBe(
      'This scenario lasts six Turns, or until one side has no models left on the battlefield.');
    expect(section('II', 'GAME LENGTH')).toBe('This scenario lasts six Turns.');
    expect(section('IV', 'GAME LENGTH')).toBe(
      'The game ends when the Sword of God reaches the other side of the battlefield. '
      + 'Otherwise, this scenario lasts six Turns.');
    expect(section('V', 'GAME LENGTH')).toBe(
      'This scenario lasts eight Turns or until a player makes their third successful Summoning Roll.');
  });

  /*
    The deployment maps extract INTO the prose. In scenario V the labels land
    between "within 1” of the Altar of Leviathan and" and "not within 1” of
    any enemy models", so leaving them in breaks the sentence that says who
    may attempt a Summon Roll.
  */
  it('drops the deployment map without breaking the sentence it lands in', () => {
    const altar = section('V', 'THE ALTAR OF LEVIATHAN');
    expect(altar).toContain(
      'within 1” of the Altar of Leviathan and not within 1” of any enemy models');
    for (const s of scenarios) {
      const all = s.sections.map((x) => x.body).join('\n');
      expect(all, s.name).not.toContain('DEPLOYMENT ZONE');
      expect(all, s.name).not.toMatch(/^(?:VIOLENT SHORE\/|CLIFF WALL|RAILWAY|EZ)$/m);
    }
  });
});

describe('Glorious Deeds', () => {
  /*
    The deeds are `Name: description` paragraphs, not bullets, and the closing
    quotation is printed straight under the last one with no marker of any
    kind. Both facts broke the first pass: consecutive deeds ran together into
    one paragraph, and every scenario's last deed was truncated by the
    quotation being taken as part of it.
  */
  it('reads each deed as its own, under its whole name', () => {
    const names = (r) => section(r, 'GLORIOUS DEEDS').split('\n\n').map((p) => p.split(':')[0]);
    expect(names('I')).toEqual(['Doomed', 'Doom Seeker', 'Lunacy', 'Officium Ante Mortem', 'Tomb Raider']);
    expect(names('II')).toEqual(['Almost There', 'Becchini', 'Bestial', 'Bold', 'Corpse Lurker', 'Resurrectionist']);
    expect(names('III')).toEqual(['Bloody Wrecker', 'Opportunist', 'Scavenger', 'Scrap King', 'Tanker']);
    expect(names('IV')).toEqual(['Bloody Tracks', 'Cast them Out', 'Lord’s Claim', 'Ride the Lightning', 'Roadkill']);
    expect(names('V')).toEqual(['Drowned Glory', 'Herald of the Deep', 'Silenced Prayer', 'Tidewalker']);
  });

  it('ends the last deed where the book ends it', () => {
    expect(section('V', 'GLORIOUS DEEDS')).toMatch(
      /Tidewalker: A friendly model ends 3 consecutive Turns within 10” of the Violent Shore edge of the battlefield\.$/);
    expect(section('I', 'GLORIOUS DEEDS')).not.toContain('Always the thirst');
  });

  it('carries both quotations, and neither inside a rule', () => {
    for (const s of scenarios) {
      expect(s.quotation.length, `${s.name} opening`).toBeGreaterThan(40);
      expect(s.epigraph.length, `${s.name} closing`).toBeGreaterThan(20);
    }
    expect(byRoman('V').epigraph)
      .toBe('Burn it. Burn it all. -Trench Cleric Viktor Drazdau, 33rd Lithuanian Hussars');
    // The two-letter artist mark at the foot of the page is not part of it.
    for (const s of scenarios) expect(s.epigraph, s.name).not.toMatch(/\b[A-Z]{2}$/);
  });
});

describe('tables', () => {
  /*
    Flattened into prose the naval mine's table reads "2-6 The naval mine does
    not explode now, but you must roll again … 7-11 The naval mine is jostled
    …", which is a roll table nobody can use at the moment they are rolling on
    it. The extraction gives tab-separated rows; they stay rows.
  */
  it('keeps the naval mine detonation table as a table', () => {
    const mine = piece('Naval Mine').body;
    expect(mine).toContain('| Roll | Result |');
    expect(mine).toMatch(/\| 2-6 \| The naval mine does not explode now/);
    expect(mine).toMatch(/\| 7-11 \| The naval mine is jostled enough to set off a rusty fuse timer/);
    expect(mine).toContain('| 12 | The mine explodes immediately. |');
  });

  it('keeps the blast profile, and the rules printed under it out of it', () => {
    const mine = piece('Naval Mine').body;
    expect(mine).toContain('| Type | Range | Keywords |');
    expect(mine).toContain('| Special | - | BLAST D6”, IGNORE COVER, SHRAPNEL |');
    // The Keywords cell ends on SHRAPNEL, which finishes no sentence, so the
    // three named rules under the profile were being appended to it.
    for (const rule of ['Bad Hiding Spot:', 'Duck:', 'Mighty Explosion:']) {
      expect(mine, rule).toMatch(new RegExp(`^${rule}`, 'm'));
    }
  });

  it('keeps a scenario Search Table as a table', () => {
    const battlefield = section('I', 'THE BATTLEFIELD');
    expect(battlefield).toContain('| Roll | Result |');
    expect(battlefield).toContain('| 1 | The area is empty – nothing is revealed. |');
    expect(battlefield).toContain(
      '| 5-6 | The search reveals 4 Ancient Tablet Markers and 2 Lunatic Monks. |');
  });

  /*
    Two scenarios field neutral models with full statlines, printed in the same
    row shape as a table. The `Battlekit` / `Abilities` / `Keywords` rows are a
    label and a paragraph rather than columns, so they are rendered as the
    paragraphs they are.
  */
  it('reads a neutral model’s statline and its labelled rows', () => {
    const monks = section('I', 'LUNATIC MONKS');
    expect(monks).toContain('| Movement | Ranged | Melee | Armour | Base |');
    expect(monks).toContain('| 8”/Infantry | - | +1 DICE | 0 | 25mm |');
    expect(monks).toContain('**Battlekit:** A Lunatic Monk always has an Antique Blade.');
    expect(monks).toContain('**Keywords:** None.');
  });
});

describe('the terrain pieces', () => {
  /*
    "This section includes rules for two different terrain pieces that you can
    use in any of your Trench Crusade games" — so they are their own thing, not
    a section of the five scenarios.
  */
  it('reads both, usable in any game', () => {
    expect(terrain.map((t) => t.title)).toEqual(['Levant Hedgehog', 'Naval Mine']);
    expect(terrain.map((t) => t.slug)).toEqual(['levant-hedgehog', 'naval-mine']);
  });

  it('reads what each does to a model that touches it', () => {
    expect(piece('Levant Hedgehog').body).toContain(
      'Dangerous terrain to vehicles and models with Machine Armour, and Difficult terrain to all other models');
    expect(piece('Naval Mine').body).toContain('Impassable terrain to all models');
  });

  it('rejoins the words the extraction hyphenates across the column break', () => {
    // "co-\nopted as land mines" — the mine's own lore says it.
    expect(piece('Naval Mine').body).toContain('co-opted as land mines');
    for (const t of terrain) expect(t.body, t.title).not.toMatch(/\b[a-z]+- [a-z]/);
  });
});
