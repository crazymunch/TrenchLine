/**
 * Dispatch content that no layer op ever transcribed.
 *
 * `docs/RULES-COVERAGE-AUDIT.md` RC-10 through RC-16. Seven published rules
 * printed in the Trench Dispatch and simply absent from the dataset — not
 * mis-parsed, not mis-costed, absent. The Dispatch's 73 ops all resolved
 * against their targets, so every existing check was green: the placement gate
 * can only ask "did this op find its target", never "was an op written at all".
 *
 * That is the inverse read the audit was commissioned for, and it is why these
 * tests assert **presence**. Each one fails if the op is dropped, and the whole
 * class is what a value-oriented check cannot see.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';

const unit = (name: string) => DATASET.units.find((u) => u.name === name)!;
const abilities = (name: string) =>
  (unit(name).abilities ?? []).map((a) => a.name);
const weapon = (name: string) => DATASET.weapons.find((w) => w.name === name);
const sultanate = () => DATASET.armouries.find((a) => a.factionId === 'iron-sultanate')!;

describe('RC-10 — the Amalgam’s Gluttonous Arsenal', () => {
  it('is a weapon with a profile, not just a name in another rule', () => {
    /*
      The only mention of it was inside the Bombardment Horde option — "you can
      replace the AUTOMATIC 3 Keyword with BLAST 3” and SCATTER" — so the app
      referred a player to a weapon it did not have.
    */
    const w = weapon('Gluttonous Arsenal')!;
    expect(w).toBeDefined();
    expect(w.range).toBe('Melee/16”');
    expect(w.keywords).toEqual(['ASSAULT', 'AUTOMATIC 3', 'CLEAVE 3']);
    expect(w.rules).toContain('Putrid Spray');
    expect(w.rules).toContain('INFECTION MARKERS');
  });

  it('carries the AUTOMATIC 3 that Bombardment Horde offers to replace', () => {
    // The two now agree, which they could not while one of them did not exist.
    const horde = (unit('Amalgam').options ?? [])
      .find((o) => o.name === 'Bombardment Horde');
    expect(horde?.description).toContain('AUTOMATIC 3');
    expect(weapon('Gluttonous Arsenal')!.keywords).toContain('AUTOMATIC 3');
  });

  it('states that the Amalgam always has it and can carry nothing else', () => {
    /*
      On `battlekitNote`, not as a sixth ability — which is where a first pass
      put it, and `dispatchAmalgam.test.ts` was right to reject that. The
      printed page shows the entry as heading, statline, Battlekit, FIVE
      abilities, the Keyword row and the Gluttonous Arsenal box: this sentence
      is the Battlekit line, and `battlekitNote` is where the books' prose
      Battlekit sentences live.
    */
    const note = unit('Amalgam').battlekitNote ?? '';
    expect(note).toContain('always has a Gluttonous Arsenal');
    expect(note).toContain('cannot be removed or lost');
    expect(note).toContain('cannot have any other Battlekit');
    expect(abilities('Amalgam')).not.toContain('Gluttonous Arsenal');
  });
});

describe('RC-11 — three Iron Sultanate Battlekit entries', () => {
  const NEW = ['Al-inbīq Kit', 'Alchemical Fire', 'Corrosive Ammunition'];

  it('exist as profiles', () => {
    for (const n of NEW) expect(weapon(n), n).toBeDefined();
  });

  it('are stocked in the Sultanate armoury at the printed cost', () => {
    const rows = sultanate().rows.filter((r) => NEW.includes(r.name));
    expect(rows.map((r) => [r.name, r.cost.ducats])).toEqual([
      ['Al-inbīq Kit', 15],
      ['Alchemical Fire', 10],
      ['Corrosive Ammunition', 10],
    ]);
  });

  it('are priced in Ducats, which the Dispatch settles by naming its table', () => {
    /*
      The cost glyph does not survive extraction. It is not guessed: the
      Dispatch announces these under "Add/replace the following entries in the
      Iron Sultanate Battlekit", and announces Glory rows separately under "Add
      the following entry to the SULTANATE Glory Items Table". It names the
      destination, and the two tables differ in currency.
    */
    for (const r of sultanate().rows.filter((x) => NEW.includes(x.name))) {
      expect(r.cost.glory, r.name).toBe(0);
      expect(r.cost.ducats, r.name).toBeGreaterThan(0);
    }
  });

  it('keeps its restrictions, including the one that limits the repair kit', () => {
    const row = (n: string) => sultanate().rows.find((r) => r.name === n)!;
    expect(row('Al-inbīq Kit').restrictions).toEqual(['Jabirean Alchemist only']);
    expect(row('Alchemical Fire').restrictions).toEqual(['ELITE only, Limit: 3']);
    expect(row('Corrosive Ammunition').restrictions).toEqual(['Limit: 5']);
  });

  it('is not confused with the Alchemical Ammunition that already existed', () => {
    /*
      Both are Sultanate ammunition and the names are a word apart, which is
      how the audit's own first pass nearly read one as the other. They are not
      even in the same collection: the existing entry is `battlekit`, the two
      new ones are `weapons` with their own profiles.
    */
    expect(DATASET.battlekit.some((b) => b.name === 'Alchemical Ammunition')).toBe(true);
    expect(weapon('Alchemical Ammunition')).toBeUndefined();
    expect(weapon('Alchemical Fire')!.rules).toContain('Unfettered Flame');
    expect(weapon('Corrosive Ammunition')!.rules).toContain('Volatile Concoction');
  });
});

describe('RC-12 — the Janissary update', () => {
  it('replaces Counter-Charge with Mehterân on the Janissary', () => {
    // "Replace the Counter Charge ability with the following ability."
    expect(abilities('Janissary')).toContain('Mehterân');
    expect(abilities('Janissary')).not.toContain('Counter-Charge');
  });

  it('leaves the Counter-Charge training OPTION alone, which the errata does not mention', () => {
    /*
      Deliberate, and flagged rather than fixed. The sentence replaces an
      ability; it says nothing about the option that grants one. Removing the
      option too would be going past the source — but an option granting a
      superseded ability is a loose end the Dispatch does not resolve, and a
      maintainer should rule on it.
    */
    expect((unit('Janissary').options ?? []).map((o) => o.name))
      .toContain('Counter-Charge');
  });

  it('gives the Yüzbaşı the Janissary Veteran option the Kaşık depends on', () => {
    /*
      This is also the missing half of RC-06. The Regimental Kaşık is
      restricted to "Janissaries & Yüzbaşı with Janissary Veteran only" — a
      condition no model could satisfy, because the option did not exist.
    */
    expect(abilities('Yüzbaşı Captain')).toContain('Janissary Veteran');
    expect(abilities('Yüzbaşı Captain')).toContain('Mehterân (Janissary Veterans only)');

    const kasik = sultanate().rows.find((r) => r.name === 'Regimental Kaşık')!;
    expect(kasik.restrictions?.[0]).toContain('Janissary Veteran');
  });

  it('adds Ferocious Claws to the Lions of Jabir', () => {
    expect(abilities('Lion of Jabir')).toContain('Ferocious Claws');
    expect(unit('Lion of Jabir').abilities!.find((a) => a.name === 'Ferocious Claws')!
      .description).toContain('CLEAVE 2');
  });
});

describe('RC-13 — Masters of the Grenade', () => {
  const rule = () => DATASET.variants
    .find((v) => v.id === 'stosstruppenofthefreestateofprussia')!
    .specialRules!.find((r) => r.name === 'Masters of the Grenade')!;

  it('keeps the benefit', () => {
    expect(rule().description).toContain('Add 4” to the Range of all Grenades');
  });

  it('now also carries the penalty past 8 inches', () => {
    /*
      The app printed the benefit without its qualification, on the screen a
      player reads before choosing the Variant. Showing a rule while omitting
      the half that costs you is the Papal States failure in miniature.
    */
    expect(rule().description).toContain('more than 8”');
    expect(rule().description).toContain('-1 DICE');
  });
});

describe('RC-14, RC-15, RC-16 — three rules with nowhere to live', () => {
  it('restricts what a Goetic Warlock may spend to cast', () => {
    const powers = unit('Goetic Warlock').abilities!.find((a) => a.name === 'Powers')!;
    expect(powers.description).toContain('only remove BLOOD MARKERS from enemy models');
    expect(powers.description).toContain('friendly Wretched models');
  });

  it('states the Court’s Quartermaster surcharge, on a faction that had no rules at all', () => {
    const court = DATASET.factions.find((f) => f.id === 'court-of-the-seven-headed-serpent')!;
    const rule = court.specialRules!.find((r) => r.name.startsWith('Goetic Powers'))!;
    expect(rule.description).toContain('Quartermaster Step');
    expect(rule.description).toContain('learn a new power');
  });

  it('gives the Hell Knight its Corpse Candles entitlement', () => {
    const cc = unit('Hell Knight').abilities!.find((a) => a.name === 'Corpse Candles')!;
    expect(cc.description).toContain('Unholy Relic');
  });
});

describe('the currency the extraction lost', () => {
  /*
    Three of these rules print a cost as a glyph the text extraction drops,
    leaving a bare number. Unlike the armoury rows above, the sentences name no
    table whose currency could settle it — so the number ships as printed with
    the gap marked, and nothing invents a Ducat or a Glory.

    Rule 2. A plausible currency here would be a price a player pays.
  */
  const MARK = '[currency unreadable in the extracted source]';

  it('marks the gap rather than choosing a currency', () => {
    const texts = [
      unit('Yüzbaşı Captain').abilities!.find((a) => a.name === 'Janissary Veteran')!.description,
      unit('Lion of Jabir').abilities!.find((a) => a.name === 'Ferocious Claws')!.description,
      unit('Hell Knight').abilities!.find((a) => a.name === 'Corpse Candles')!.description,
      DATASET.factions.find((f) => f.id === 'court-of-the-seven-headed-serpent')!
        .specialRules!.find((r) => r.name.startsWith('Goetic Powers'))!.description,
    ];
    for (const t of texts) expect(t, t.slice(0, 60)).toContain(MARK);
  });

  it('never prints a bare number where a currency belongs', () => {
    // "at a cost of +5 each" reads as Ducats to anyone who does not know the
    // glyph was lost. The mark is what stops that reading.
    const claws = unit('Lion of Jabir').abilities!
      .find((a) => a.name === 'Ferocious Claws')!.description;
    expect(claws).not.toMatch(/\+5\s+each/);
  });
});
