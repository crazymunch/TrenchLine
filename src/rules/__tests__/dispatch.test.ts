import { describe, it, expect } from 'vitest';
import { DATASET } from '@/data/generated/trenchline.generated';

/**
 * Trench Dispatch #1, Mercenaries (pp.11–16).
 *
 * The Dispatch turns ten entries into MERCENARY units, and the transcription
 * is long enough — nine keyword rows, two costs, three statlines, eleven
 * abilities — that spot-checking it by eye is not a check. These assert the
 * shipped dataset, not the layer file, so they fail if an op stops applying as
 * well as if it is transcribed wrong.
 */

const unit = (name: string) => {
  const u = DATASET.units.find((x) => x.name === name);
  if (!u) throw new Error(`no unit named ${name}`);
  return u;
};

describe('Trench Dispatch #1 — Mercenaries', () => {
  it('gives every rewritten entry the MERCENARY keyword', () => {
    const names = [
      'Combat Biologist', 'Communicant Anti-Tank Hunter', 'Mamluk Faris',
      'Mendelist Ammo Monk', 'Observer', 'Sin Eater', 'Scripture Guardian',
      'Goetic Warlock', 'Witchburner',
    ];
    const missing = names.filter((n) => !unit(n).keywords.includes('MERCENARY'));
    expect(missing, 'entries the Dispatch made MERCENARY').toEqual([]);
  });

  it('drops the faction keyword the Dispatch row omits', () => {
    // The Sin Eater's row is "MERCENARY, DEMONIC FEAR STRONG TOUGH" — no
    // HERETIC. That is the change, not an omission: a Mercenary is recruitable
    // beyond one faction, and no other Mercenary carries a faction keyword.
    expect(unit('Sin Eater').keywords).toEqual(
      ['MERCENARY', 'DEMONIC', 'FEAR', 'STRONG', 'TOUGH']);
    expect(unit('Sin Eater').keywords).not.toContain('HERETIC');
  });

  it('carries the keyword rows that wrap across two lines', () => {
    // Both of these lost their last keyword to the PDF's line break the first
    // time they were read.
    expect(unit('Mamluk Faris').keywords).toContain('IGNORE OFF-HAND WEAPON');
    expect(unit('Witchburner').keywords).toContain('NEGATE FIRE');
  });

  it('prices the two changed Mercenaries in Glory, not Ducats', () => {
    // The Dispatch prints a bare number; the currency is derived from the
    // catalogue agreeing on the entries it does not change. Ducats staying 0
    // is half the assertion — a number written to the wrong currency would
    // show up here.
    expect(unit('Observer').cost).toMatchObject({ glory: 5, ducats: 0 });
    expect(unit('Witchburner').cost).toMatchObject({ glory: 6, ducats: 0 });
  });

  it('leaves the Mercenaries the Dispatch reprints unchanged', () => {
    // These two are what fix the currency above: reprinted, same number.
    expect(unit('Scripture Guardian').cost.glory).toBe(7);
    expect(unit('Goetic Warlock').cost.glory).toBe(4);
  });

  it('replaces the statlines the catalogue holds as bare numbers', () => {
    expect(unit('Witchburner').stats.ranged).toBe('+0 DICE');
    expect(unit('Witchburner').stats.melee).toBe('+2 DICE');
    expect(unit('Scripture Guardian').stats.ranged).toBe('+2 DICE');
  });

  it('gives the Witchburner the four abilities it had none of', () => {
    expect(unit('Witchburner').abilities.map((a) => a.name)).toEqual(
      ['Dignified Conduct', 'Divine Judgement ACTION', 'Elitist', 'Found Guilty']);
  });

  it('replaces the Goetic Warlock spells rather than adding beside them', () => {
    const names = unit('Goetic Warlock').abilities.map((a) => a.name);
    // The old names are gone: these are different rules, not rewordings.
    expect(names).not.toContain('Goetic Gaze');
    expect(names.some((n) => n.startsWith('Necrotic Gaze'))).toBe(true);
    expect(names).toContain('Disturbing Presence');
    /*
      Five, not four. The fifth is `Powers`, added later for RC-14 — the
      restriction on what a Warlock may spend to cast, which the Dispatch prints
      under its own heading and no op had ever transcribed. The count is still
      pinned, because the point of this test is that the replacement did not
      leave the old spells sitting alongside the new ones.
    */
    expect(names).toHaveLength(5);
    expect(names).toContain('Powers');
  });

  it('keeps the whole of a wrapped ability, not its first line', () => {
    const devour = unit('Sin Eater').abilities.find((a) => a.name === 'Devour the Guilty ACTION');
    expect(devour?.description).toContain('Purge ACTION');
    expect(devour?.description.endsWith('.')).toBe(true);

    const sacrament = unit('Mendelist Ammo Monk').abilities
      .find((a) => a.name === 'Ammunition Sacrament ACTION');
    // All three Sacraments, which are separate ✥ bullets in the source.
    expect(sacrament?.description).toContain('Bullet of the Guided Path');
    expect(sacrament?.description).toContain('Cartridge of his Wrath');
    expect(sacrament?.description).toContain('Echo of his Word');
  });

  it('restores the MERCENARY glossary sentence the abridgement dropped', () => {
    const kw = DATASET.keywords.find((k) => k.name === 'MERCENARY');
    // A campaign rule with mechanical force, absent from the abridged entry.
    expect(kw?.description).toContain('Battlekit cannot be removed or lost');
    expect(kw?.description).toContain('cannot have any other Battlekit');
  });
});

/**
 * A guard for the whole class of error, not just the one instance.
 *
 * Rules prose is cut out of the PDF text by line range, and an off-by-one at
 * the end of a block silently swallows the next heading — which is how the
 * MERCENARY glossary entry first shipped ending "…included in the model's
 * Profile. Combat Biologist". It reads as a typo and is actually a sign the
 * extraction boundary is wrong, so the whole block may be suspect.
 *
 * Entity names are the headings in this document, so a description that ends
 * with one is the signature to look for.
 */
describe('extracted prose does not swallow the next heading', () => {
  it('leaves no description ending in a finished sentence plus another entry name', () => {
    const names = [
      ...DATASET.units.map((u) => u.name),
      ...DATASET.weapons.map((w) => w.name),
    ].filter((n) => n && n.length > 6);

    const bad: string[] = [];

    /*
      Two conditions, both needed.

      A terminal `.` before the name is what separates a swallowed heading from
      an ordinary sentence: the MERCENARY entry ended "…in the model's Profile.
      Combat Biologist", and a heading always follows a finished sentence
      because it is the start of the next block.

      And the name must belong to some OTHER entry. The Lion of Jabir's
      Artificial Life reads "Add -1 INJURY DICE to Injury Rolls for a Lion of
      Jabir" — an ability describing its own unit ends in that unit's name all
      the time, and flagging those would make the guard noise.
    */
    const check = (what: string, owner: string, text?: string) => {
      if (!text) return;
      for (const n of names) {
        if (n === owner) continue;
        if (text.endsWith(`. ${n}`)) bad.push(`${what} ends with ". ${n}"`);
      }
    };

    for (const k of DATASET.keywords) check(`keyword ${k.name}`, k.name, k.description);
    for (const u of DATASET.units) {
      for (const a of u.abilities ?? []) check(`${u.name} / ${a.name}`, u.name, a.description);
    }

    expect(bad, 'descriptions that ran into the next heading').toEqual([]);
  });
});

/**
 * Who may hire a Mercenary.
 *
 * The recruit list granted every Mercenary to every faction, so a Court of the
 * Seven-Headed Serpent Warband was offered the Mendelist Ammo Monk and the
 * Observer — both NEW ANTIOCH and PILGRIM only. The comment justifying it said
 * the catalogues "put them in their own faction rather than listing hosts, so
 * the legality engine decides". Both halves were wrong: the catalogues do carry
 * hosts, and the legality engine runs after a unit is already on the roster.
 */
describe('Mercenary recruitment restrictions', () => {
  const merc = (name: string) => {
    const u = DATASET.units.find((x) => x.name === name);
    if (!u) throw new Error(`no unit named ${name}`);
    return u;
  };

  it('keeps the Faithful Mercenaries out of a Fallen Warband', () => {
    for (const name of ['Mendelist Ammo Monk', 'Observer', 'Witchburner', 'Communicant Anti-Tank Hunter']) {
      /*
        The two the Dispatch names, plus the Procession of the Sacred
        Affliction — which does not name them, it inherits them: "can use any
        Faithful Mercenaries that can be taken by Trench Pilgrim Warbands".
        The delegation is read off that sentence, so the Procession's pool
        follows the Pilgrims' automatically. See `applyMercenaryDelegation`.
      */
      expect(merc(name).allowedFactions, name)
        .toEqual(['New Antioch', 'Trench Pilgrims', 'Procession of the Sacred Affliction']);
      expect(merc(name).allowedFactions, `${name} must not be hireable by the Court`)
        .not.toContain('Court of the Seven-Headed Serpent');
      expect(merc(name).allowedFactions, `${name} must not reach the Fallen Naval Raiders`)
        .not.toContain('Heretic Naval Raiders');
    }
  });

  it('keeps the Fallen Mercenary out of a Faithful Warband', () => {
    // Likewise: the Naval Raiders take what the Heretic Legions take.
    expect(merc('Goetic Warlock').allowedFactions)
      .toEqual(['Heretic Legion', 'Court of the Seven-Headed Serpent', 'Heretic Naval Raiders']);
    expect(merc('Goetic Warlock').allowedFactions)
      .not.toContain('Procession of the Sacred Affliction');
  });

  it('lets the Sultanate hire the two the book gives it', () => {
    for (const name of ['Combat Biologist', 'Mamluk Faris']) {
      expect(merc(name).allowedFactions, name).toEqual(['New Antioch', 'Iron Sultanate']);
    }
  });

  it('leaves the one the book says any Warband may hire unrestricted', () => {
    // Null, not a list of all six: "no restriction" and "not checked yet" must
    // stay different states.
    expect(merc('Scripture Guardian').allowedFactions).toBeNull();
  });
});

/**
 * The fixed kit the catalogue states in shapes the parser used to skip.
 *
 * FD-11a. `forcedKitOf` read only an `entryLink` whose `min` equalled its
 * `max`, and the Mercenaries catalogue states "always has" three other ways.
 * Driven through the BUILT dataset rather than the parser so it also proves
 * the layers do not undo it.
 */
describe('FD-11a: forced Battlekit that the parser used to miss', () => {
  const kit = (name: string) =>
    ((unit(name) as { battlekit?: { name: string }[] }).battlekit ?? [])
      .map((b) => b.name).sort();

  it('gives the Combat Biologist the items stated by a min-only link', () => {
    // "A Combat Biologist always has Gas Grenades, Standard Armour, a Gas
    // Mask, and a Vivisector" — warbands-of-trench-crusade L9802.
    // The Vivisector is a profile on the model itself; the catalogue uses that
    // shape for reference statlines too, so it is stated from the book in
    // FD-11b rather than guessed here. See `forcedKitOf`.
    expect(kit('Combat Biologist')).toEqual(['Gas Grenades', 'Gas Mask', 'Standard Armour']);
  });

  it('gives the Sin Eater the Maul stated by a nested min=max entry', () => {
    // "Sin Eater always has Reinforced Armour, a Combat Helmet, and a
    // Tenderiser Maul" — L10281. The catalogue spells it "Tenderizer"; that
    // is a gear-name ruling, not this change.
    expect(kit('Sin Eater')).toEqual(['Combat Helmet', 'Reinforced Armour', 'Tenderizer Maul']);
  });

  it('gives the Goetic Warlock the claws the Dispatch puts on its kit', () => {
    // "A Goetic Warlock always has Reinforced Armour and Flaying Iron Claws"
    // — Trench Dispatch 01, L785-786. The rename is FD-11b's op; the
    // catalogue calls them Iron-Clawed Hands.
    expect(kit('Goetic Warlock')).toEqual(['Iron-Clawed Hands', 'Reinforced Armour']);
  });

  it('prices a model’s own gear profile at zero, not at the model’s cost', () => {
    /*
      The Gavel of Justice stood in the weapon list at the Witchburner's 6
      Glory and the Vivisector at the Combat Biologist's 3, because the emit
      read the node's cost and on a model node that is the model's price.
      Neither has an Armoury row, and `fromWarband` falls back to this cost
      for an item that has no row — so it is a price waiting for a caller.
    */
    const w = (name: string) =>
      (DATASET.weapons ?? []).find((x: { name: string }) => x.name === name);
    expect(w('Gavel of Justice')!.cost).toEqual({ ducats: 0, glory: 0 });
    expect(w('Vivisector')!.cost).toEqual({ ducats: 0, glory: 0 });
  });
});

/**
 * The Dispatch names an ITEM; the dataset holds several copies of it.
 *
 * FD-11b. "Add the FUMBLE Keyword to: … Incendiary Grenades … Molotov
 * Cocktail …" is one line about one thing on the page. Each of those is two
 * entries here — the Iron Sultanate's copy and the shared Ranged Weapons one
 * — and `findTarget` took the first match, so the keyword reached the
 * Sultanate's copy and every other faction, which draws from the shared list,
 * fought without it. The op reported success, which is why it shipped.
 */
describe('FD-11b: an errata line that names one item and finds two', () => {
  const weapon = (id: string) =>
    (DATASET.weapons ?? []).find((w: { id: string }) => w.id === id)!;

  it('gives FUMBLE to both copies of the Incendiary Grenades', () => {
    expect(weapon('3bfd-2c1d-2d6b-a36c').keywords).toContain('FUMBLE'); // Iron Sultanate
    expect(weapon('316b-d210-767e-e340').keywords).toContain('FUMBLE'); // shared list
  });

  it('gives FUMBLE to both copies of the Molotov Cocktail', () => {
    expect(weapon('b16a-e1fa-433f-efc0').keywords).toContain('FUMBLE'); // Iron Sultanate
    expect(weapon('414f-af63-666d-59d1').keywords).toContain('FUMBLE'); // shared list
  });
});
