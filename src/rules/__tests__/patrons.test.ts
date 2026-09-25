/**
 * FD-15: a Patron Skill result needs a Patron.
 *
 * The design's own test list, and one thing it asked for first: *"verify the core
 * six factions' Patrons (rulebook line 4757 onward) are parsed there as the
 * Carcass Front ones are, and parse them if not."* The first `describe` is that
 * verification, against the shipped dataset — it is the measurement, not an
 * assumption that the pipeline did it.
 *
 * Then the design's tests: *"a Patron Skill result on a Warband with a Patron
 * offers that Patron's Skills; with none, the step asks and then offers; a Skill
 * already held falls to the next lowest per line 6039."*
 */
import { describe, it, expect } from 'vitest';
import { DATASET } from '@/data/generated/trenchline.generated';
import { advancementRoll, offerFor, patronSkillsFor } from '../advancement';
import { patronEligibility, patronMissing, patronNamed, patronsFor } from '../patrons';
import type { SkillsTableName } from '@/types/catalogue';
import type { Warband } from '@/types/warband';

/** The six the app builds warbands for. */
const CORE = [
  'new-antioch', 'trench-pilgrims', 'iron-sultanate',
  'heretic-legions', 'black-grail', 'court-seven-serpents',
];

describe('the Patrons are parsed, and their restrictions are readable', () => {
  it('ships Patrons from both books', () => {
    expect(DATASET.patrons.length).toBeGreaterThan(0);
    expect(new Set(DATASET.patrons.map((p) => p.source)))
      .toEqual(new Set(['rulebook', 'carcass-front']));
  });

  it('every Patron carries its restriction and six Skills', () => {
    for (const p of DATASET.patrons) {
      expect(p.restriction.trim(), `${p.name} has no restriction`).not.toBe('');
      expect(p.skills.length, `${p.name} has ${p.skills.length} Skills`).toBe(6);
      for (const s of p.skills) expect(s.description.trim()).not.toBe('');
    }
  });

  it('every faction can be offered at least one, and exactly one restriction is unreadable', () => {
    /*
      There is exactly ONE `unknown` in the shipped data, and it is Mammon for
      the Court of the Seven-Headed Serpent (review round 1, finding G).

      The sentence is "Heretic Legions or Court of the Seven-Headed Serpent
      (Greed Warband) only." — the bracket restricts the COURT half to a Greed
      Warband, and this app records no Court warband's Sin. A substring match on
      the faction name ignored the qualifier and offered Mammon to every Court
      warband. By the module's own rule a condition it cannot evaluate is
      `unknown`: the Patron is still OFFERED, with the sentence printed, so the
      player decides — neither hidden nor silently allowed.

      The Heretic Legions half of the same sentence carries no qualifier and
      stays a plain `yes`, which is what makes this a reading of the punctuation
      rather than a blanket refusal of any sentence with a bracket in it.
    */
    const unknowns: string[] = [];
    for (const factionId of CORE) {
      const offers = patronsFor(DATASET, factionId);
      expect(offers, factionId).toHaveLength(DATASET.patrons.length);
      for (const o of offers.filter((x) => x.eligible === 'unknown')) {
        unknowns.push(`${factionId}: ${o.patron.name}`);
      }
      expect(offers.filter((o) => o.eligible === 'yes').length, factionId)
        .toBeGreaterThan(0);
    }
    expect(unknowns).toEqual(['court-seven-serpents: MAMMON']);
  });

  it('an unknown is offered, not hidden', () => {
    const mammon = patronsFor(DATASET, 'court-seven-serpents')
      .find((o) => o.patron.name === 'MAMMON')!;
    expect(mammon.eligible).toBe('unknown');
    /* With the sentence that made it unknown, so the player can read it. */
    expect(mammon.restriction).toMatch(/Greed Warband/);
  });

  it('a qualifier on somebody else’s half of the sentence says nothing about mine', () => {
    /* The Legions are named unqualified in Mammon's sentence. */
    expect(patronsFor(DATASET, 'heretic-legions')
      .find((o) => o.patron.name === 'MAMMON')!.eligible).toBe('yes');
  });

  it('eligible Patrons are listed before ineligible ones', () => {
    const order = patronsFor(DATASET, 'iron-sultanate').map((o) => o.eligible);
    expect(order).toEqual([...order].sort((a, b) =>
      (a === 'yes' ? 0 : a === 'unknown' ? 1 : 2) - (b === 'yes' ? 0 : b === 'unknown' ? 1 : 2)));
  });

  it('reads a faction named in the sentence, whichever spelling the book uses', () => {
    /* The rulebook writes "Black Grail"; the dataset's faction is "Cult of the
       Black Grail". One comparison covers both. */
    expect(patronEligibility(DATASET, 'black-grail', { restriction: 'Black Grail only.' })).toBe('yes');
    expect(patronEligibility(DATASET, 'new-antioch', { restriction: 'Black Grail only.' })).toBe('no');
    /* And "The Court of the Seven-Headed Serpent", where the app's id drops
       three words. */
    expect(patronEligibility(DATASET, 'court-seven-serpents', {
      restriction: 'Heretic Legions & The Court of the Seven-Headed Serpent only.',
    })).toBe('yes');
  });

  it('reads an alignment sentence against the faction’s own alignment', () => {
    expect(patronEligibility(DATASET, 'new-antioch', { restriction: 'Faithful Warbands only.' })).toBe('yes');
    expect(patronEligibility(DATASET, 'new-antioch', { restriction: 'Fallen Warbands only.' })).toBe('no');
    expect(patronEligibility(DATASET, 'heretic-legions', { restriction: 'Fallen Warbands only.' })).toBe('yes');
  });

  it('a sentence naming nobody it can place is unknown, not a refusal', () => {
    expect(patronEligibility(DATASET, 'new-antioch', {
      restriction: 'Only by agreement with your group.',
    })).toBe('unknown');
  });

  it('the Sultanate’s two are the Sublime Gate and the House of Wisdom', () => {
    const eligible = patronsFor(DATASET, 'iron-sultanate')
      .filter((o) => o.eligible === 'yes')
      .map((o) => o.patron.name);
    expect(eligible).toContain('SUBLIME GATE');
    expect(eligible).toContain('HOUSE OF WISDOM');
  });
});

describe('the Warband’s own Patron', () => {
  it('is matched case-insensitively, because the field has always been free text', () => {
    /* The book prints caps and a player types title case. */
    expect(patronNamed(DATASET, 'Sublime Gate')?.id).toBe('sublime-gate');
    expect(patronNamed(DATASET, 'SUBLIME GATE')?.id).toBe('sublime-gate');
    expect(patronNamed(DATASET, '  sublime gate ')?.id).toBe('sublime-gate');
  });

  it('a name the dataset cannot place resolves to nothing', () => {
    expect(patronNamed(DATASET, 'The Duke of Somewhere')).toBeUndefined();
    expect(patronNamed(DATASET, '')).toBeUndefined();
  });

  it('a campaign Warband with none recorded is a gap; an unrestricted list is not', () => {
    const wb = (over: Partial<Warband>) => over as Warband;
    expect(patronMissing(wb({ forceMode: 'campaign' }))).toBe(true);
    expect(patronMissing(wb({ forceMode: 'campaign', patron: '  ' }))).toBe(true);
    expect(patronMissing(wb({ forceMode: 'campaign', patron: 'Sublime Gate' }))).toBe(false);
    expect(patronMissing(wb({ forceMode: 'unrestricted' }))).toBe(false);
    /* No `forceMode` recorded: every Warband saved before the field existed was
       on the published economy. */
    expect(patronMissing(wb({}))).toBe(true);
  });
});

describe('the Patron Skill result, per the Advancement Roll', () => {
  /** The 2D6 total the Patron Skill row sits on. Read, not typed. */
  const patronRow = (table: SkillsTableName) =>
    (DATASET.campaign.skills![table] ?? []).find((r) => /^patron skill$/i.test(r.name));

  it('the dataset has a Patron Skill row to roll, or this proves nothing', () => {
    expect(patronRow('melee')).toBeTruthy();
  });

  it('with a Patron, the roll offers that Patron’s Skills and no others', () => {
    const row = patronRow('melee')!;
    const patron = patronNamed(DATASET, 'Sublime Gate')!;
    const offer = offerFor(DATASET, 'melee', row.roll, [], patronSkillsFor(DATASET, 'Sublime Gate'));

    expect(offer.substitution).toBe('patron');
    expect(offer.offered.map((s) => s.name).sort())
      .toEqual(patron.skills.map((s) => s.name).sort());
  });

  it('with none, nothing is offered — the step asks rather than substituting', () => {
    const row = patronRow('melee')!;
    const offer = offerFor(DATASET, 'melee', row.roll, [], patronSkillsFor(DATASET, undefined));

    expect(offer.substitution).toBe('patron');
    expect(offer.offered).toEqual([]);
    /*
      The important half: it does NOT fall back to the table's own row. A Skill
      the Patron does not grant is not an answer to this roll, and offering one
      is what the step used to do.
    */
    expect(offer.landedOn!.name).toMatch(/patron skill/i);
  });

  it('and once the Patron is recorded, the same roll offers its Skills', () => {
    const row = patronRow('melee')!;
    const before = offerFor(DATASET, 'melee', row.roll, [], patronSkillsFor(DATASET, ''));
    const after = offerFor(DATASET, 'melee', row.roll, [], patronSkillsFor(DATASET, 'Sublime Gate'));

    expect(before.offered).toEqual([]);
    expect(after.offered.length).toBe(6);
  });

  it('a Patron Skill the model already has is not offered again', () => {
    const row = patronRow('melee')!;
    const patron = patronNamed(DATASET, 'Sublime Gate')!;
    const held = [patron.skills[0].name];
    const offer = offerFor(DATASET, 'melee', row.roll, held, patronSkillsFor(DATASET, 'Sublime Gate'));

    expect(offer.offered.map((s) => s.name)).not.toContain(patron.skills[0].name);
    expect(offer.offered).toHaveLength(5);
  });

  it('a Skill already held on an ordinary row falls to the next lowest (L6039)', () => {
    const rows = [...(DATASET.campaign.skills!.melee ?? [])]
      .filter((r) => !/^patron skill$/i.test(r.name))
      .sort((a, b) => a.roll - b.roll);
    /* A row with at least one lower row to fall to. */
    const landed = rows[2];
    const offer = offerFor(DATASET, 'melee', landed.roll, [landed.name]);

    expect(offer.substitution).toBe('next-lowest');
    expect(offer.offered[0].name).toBe(rows[1].name);
  });

  it('both tables of one Advancement Roll answer independently', () => {
    const row = patronRow('melee')!;
    const [a, b] = advancementRoll(
      DATASET, ['melee', 'ranged'], [row.roll, 7], [],
      patronSkillsFor(DATASET, 'Sublime Gate'),
    );
    expect(a.substitution).toBe('patron');
    expect(b.substitution).not.toBe('patron');
  });
});
