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
      /*
        The Sister was missing from this list, and missing an op. Her entry IS
        reprinted — "Replace the Keywords with: MERCENARY NEGATE FEAR",
        dispatch L654-655 — and the layer had no `setKeywords` for it, so she
        shipped with the catalogue's empty keyword list. Every one of the eight
        keyword reprints in the Dispatch now has an op; this list is nine of
        them, the ninth being the Desecrated Saint, which is not a Mercenary.
      */
      'Sister of Saint Cosmas',
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
    /*
      "A Combat Biologist always has Gas Grenades, Standard Armour, a Gas
      Mask, and a Vivisector" — warbands-of-trench-crusade L9802.

      Three of the four come from the min-only links this change reads. The
      VIVISECTOR is a Weapon profile on the model itself, which the parser
      will not read as forced kit because the catalogue uses that shape for
      reference statlines too (see `forcedKitOf`) — it arrives from the book
      through FD-11b's `addBattlekit`, which is why all four are here now.
    */
    expect(kit('Combat Biologist'))
      .toEqual(['Gas Grenades', 'Gas Mask', 'Standard Armour', 'Vivisector']);
  });

  it('gives the Sin Eater the Maul stated by a nested min=max entry', () => {
    // "Sin Eater always has Reinforced Armour, a Combat Helmet, and a
    // Tenderiser Maul" — L10281. The catalogue spelt it "Tenderizer"; the
    // Dispatch's own heading (L702) spells it with an s, and FD-11b renames it.
    expect(kit('Sin Eater')).toEqual(['Combat Helmet', 'Reinforced Armour', 'Tenderiser Maul']);
  });

  it('gives the Goetic Warlock the claws the Dispatch puts on its kit', () => {
    // "A Goetic Warlock always has Reinforced Armour and Flaying Iron Claws"
    // — Trench Dispatch 01, L785-786. The catalogue called them Iron-Clawed
    // Hands on the kit and Reaping Claws on the profile; FD-11b's rename,
    // promised in this comment, settles both on the Dispatch's name.
    expect(kit('Goetic Warlock')).toEqual(['Flaying Iron Claws', 'Reinforced Armour']);
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

/**
 * What the Warbands book states and the catalogues lack.
 *
 * FD-11b. The precedence in `data-sources/resolutions.json` is Dispatch over
 * rulebook over catalogue, but the rulebook rung was only ever applied through
 * a *resolution* — and a resolution is for a CONFLICT. An empty catalogue field
 * is a gap, and no gap was filled from the book until `warbands-book.layer.json`.
 */
describe('FD-11b: the Warbands book reaches the dataset', () => {
  it('gives the Sister of Saint Cosmas her printed name', () => {
    // Warbands L10366. The catalogue kept "Combat Medic", which is also a New
    // Antioch Troop — the ambiguity #77's guard now refuses outright.
    const sister = DATASET.units.find((u: { id: string }) => u.id === 'aa7f-02df-a12f-1ed3')!;
    expect(sister.name).toBe('Sister of Saint Cosmas');
    expect(sister.factionId).toBe('Mercenaries');
  });

  it('prints her statline the way every other statline is written', () => {
    // Warbands L10381. The catalogue carries a bare "0".
    const sister = DATASET.units.find((u: { id: string }) => u.id === 'aa7f-02df-a12f-1ed3')!;
    expect(sister.stats.ranged).toBe('+0 DICE');
    expect(sister.stats.melee).toBe('+0 DICE');
  });

  it('gives Finish the Fallen the INJURY DICE the book prints', () => {
    /*
      The catalogue says "+1 DICE" and the book says "+1 INJURY DICE"
      (L10387-10392). Those are different rolls, and the catalogue's reading
      makes the Sister markedly worse at the thing her rule is about.
    */
    const sister = DATASET.units.find((u: { id: string }) => u.id === 'aa7f-02df-a12f-1ed3')!;
    const ability = (sister.abilities ?? [])
      .find((a: { name: string }) => a.name === 'Finish the Fallen')!;
    expect(ability.description).toContain('+1 INJURY DICE');
  });

  it('gives the Combat Biologist the two abilities the catalogue omits', () => {
    // Warbands L9804-9813. The catalogue gives it none at all.
    const bio = DATASET.units.find((u: { id: string }) => u.id === '02df-b4d5-3ca5-9a2b')!;
    expect((bio.abilities ?? []).map((a: { name: string }) => a.name))
      .toEqual(['Battlefield Vivisection', 'Prize Specimens']);
  });

  it('carries Gather Knowledge on the ability that grants it', () => {
    /*
      "add the Gather Knowledge Glorious Deed to those normally available in
      each scenario you play" — so the deed travels with the ability rather
      than being a scenario's, and Play Mode reads it off the roster.
    */
    const bio = DATASET.units.find((u: { id: string }) => u.id === '02df-b4d5-3ca5-9a2b')!;
    const ability = (bio.abilities ?? [])
      .find((a: { name: string }) => a.name === 'Battlefield Vivisection')!;
    expect(ability.grantsDeed?.name).toBe('Gather Knowledge');
    expect(ability.grantsDeed?.description).toContain('3 or');
  });

  it('gives the Biologist the Vivisector from the book, at no cost', () => {
    /*
      The parser will not read a model-node Weapon profile as forced kit (see
      `forcedKitOf`), so this comes through `addBattlekit` from the book's own
      "always has" line, L9802.
    */
    const bio = DATASET.units.find((u: { id: string }) => u.id === '02df-b4d5-3ca5-9a2b')!;
    const kit = (bio.battlekit ?? []).find((b: { name: string }) => b.name === 'Vivisector')!;
    expect(kit).toBeTruthy();
    expect(kit.cost).toEqual({ ducats: 0, glory: 0 });
    expect(kit.profileId).toBe('6dbf-5d41-0a93-b558');
  });

  it('states the Sin Eater’s hosts by alignment, not by a list', () => {
    /*
      "A Sin Eater is Fallen and can be recruited as a Mercenary by Fallen
      Warbands" (L10273). A written-out list of Fallen factions goes stale the
      moment one is added, which is how the Heretic Naval Raiders were missed.
    */
    const sin = DATASET.units.find((u: { id: string }) => u.id === '2d21-7af1-0770-da4c')!;
    expect(sin.allowedAlignment).toBe('Fallen');
  });

  it('reads an alignment onto all six core factions, from the book', () => {
    // L1241, L2744, L4100, L5994, L7254, L8379-8380.
    const by = (id: string) => DATASET.factions.find((f: { id: string }) => f.id === id)?.alignment;
    expect(by('new-antioch')).toBe('Faithful');
    expect(by('trench-pilgrims')).toBe('Faithful');
    expect(by('iron-sultanate')).toBe('Faithful');
    expect(by('heretic-legions')).toBe('Fallen');
    expect(by('cult-of-the-black-grail')).toBe('Fallen');
    expect(by('court-of-the-seven-headed-serpent')).toBe('Fallen');
    // Every faction carries one, so an alignment filter can never match nobody.
    expect(DATASET.factions.every((f: { alignment?: string }) => f.alignment)).toBe(true);
  });

  it('gives the Sister the keywords and the one host the book states', () => {
    /*
      Her keyword list was EMPTY — the only model in the game with none — so
      NEGATE FEAR (L10393) was not being applied, and with no host restriction
      at all (L10367-10368 names Trench Pilgrims) every Warband was offered her.

      The Procession is here because Carcass Front delegates: "any Faithful
      Mercenaries that can be taken by Trench Pilgrim Warbands". That is why
      the layer states a faction and not an alignment — the delegation extends
      a named list and would not see one.
    */
    const sister = DATASET.units.find((u: { id: string }) => u.id === 'aa7f-02df-a12f-1ed3')!;
    expect(sister.keywords).toContain('NEGATE FEAR');
    expect(sister.allowedFactions).toEqual(
      ['Trench Pilgrims', 'Procession of the Sacred Affliction']);
  });
});

describe('Trench Dispatch #1 — the Mercenary entries it reprints', () => {
  const byId = (id: string) => DATASET.units.find((u: { id: string }) => u.id === id)!;
  const weapon = (id: string) => DATASET.weapons.find((w: { id: string }) => w.id === id)!;
  const kitNames = (id: string) =>
    (byId(id).battlekit ?? []).map((b: { name: string }) => b.name).sort();

  it('arms the Scripture Guardian, whose Battlekit was empty', () => {
    // L748: "always has Reinforced Armour, Combat Helmet, and a Vengeful Scripture."
    expect(kitNames('3fe9-1530-6fcd-1855'))
      .toEqual(['Combat Helmet', 'Reinforced Armour', 'Vengeful Scripture']);
  });

  it('makes Vengeful Scripture a weapon, not an ability', () => {
    /*
      The catalogue carried it as an ABILITY, in the pre-Dispatch wording: that
      version ignores armour outright and may be used in Melee. The Dispatch's
      profile (L757-768) does neither — IGNORE ARMOUR only on a Critical
      Success, and Spoken is what lets it be fired within 1".
    */
    const sg = byId('3fe9-1530-6fcd-1855');
    expect((sg.abilities ?? []).map((a: { name: string }) => a.name)).toEqual(['Slow']);
    const w = weapon('dispatch01-weapon-vengeful-scripture');
    expect(w.type).toBe('Special');
    expect(w.range).toBe('18”');
    expect(w.keywords).toEqual(['ASSAULT', 'IGNORE COVER']);
    expect(w.rules).toContain('Unmaking');
    expect(w.rules).toContain('Spoken');
  });

  it('states Slow as a Movement Characteristic, as the Dispatch does', () => {
    // L754-755. The catalogue said "half Dash distance", which no other rule reads.
    const slow = (byId('3fe9-1530-6fcd-1855').abilities ?? [])
      .find((a: { name: string }) => a.name === 'Slow')!;
    expect(slow.description).toContain('Movement Characteristic of 3”/Infantry');
  });

  it('calls the Warlock’s claws what the Dispatch calls them, in both places', () => {
    /*
      Three names for one weapon: the Battlekit said "Iron-Clawed Hands", the
      profile said "Reaping Claws", the Dispatch says "Flaying Iron Claws"
      (L797). The build now fails if the two places ever disagree again.
    */
    expect(kitNames('1a28-719d-fbd0-5bf0'))
      .toEqual(['Flaying Iron Claws', 'Reinforced Armour']);
    const claws = weapon('e8d8-c2a3-9a3e-b3b8');
    expect(claws.name).toBe('Flaying Iron Claws');
    expect(claws.type).toBe('2-Handed');
    // The catalogue's rule was the workaround for the weapon not existing.
    expect(claws.rules).toBeUndefined();
  });

  it('arms the Witchburner with the Gavel its own ability names', () => {
    // L834. Found Guilty triggers off "an attack made with … a Gavel of
    // Justice", and the model was not carrying one.
    expect(kitNames('b5ac-1a57-c1d4-3f4c'))
      .toEqual(['Combat Helmet', 'Gavel of Justice', 'Reinforced Armour']);
  });

  it('gives the Gavel FIRE, and drops the rule the Dispatch replaced', () => {
    /*
      L863 prints "CRITICAL, FIRE". The catalogue's own "Wrath of God" on the
      Gavel places an extra BLOOD MARKER — which is what the new Found Guilty
      ability does, on different terms, so keeping both places it twice.
    */
    const gavel = weapon('ddce-0973-220d-51e0');
    expect(gavel.keywords).toEqual(['CRITICAL', 'FIRE']);
    expect(gavel.rules).toBeUndefined();
  });

  it('gives the Tenderiser Maul the Mulch rule, and the book’s spelling', () => {
    /*
      L701 replaces the Battlekit outright. The catalogue carried only Swinging
      Blow; Mulch makes that one of two choices, and the other — Crushing Blow,
      a +2 INJURY MODIFIER — was simply not in the app.
    */
    const maul = weapon('c63d-fe53-a980-4a2a');
    expect(maul.name).toBe('Tenderiser Maul');
    expect(maul.rules).toContain('Mulch');
    expect(maul.rules).toContain('Crushing Blow');
    expect(maul.rules).toContain('+2 INJURY MODIFIER');
    // and the rename reached the Sin Eater's kit, not just the profile
    expect(kitNames('2d21-7af1-0770-da4c')).toContain('Tenderiser Maul');
  });

  it('states each reprinted entry’s Battlekit sentence without its column label', () => {
    // The extract renders the row as "Battlekit \t <text>"; the label is a
    // heading, not part of the rule.
    for (const id of ['3fe9-1530-6fcd-1855', '1a28-719d-fbd0-5bf0', 'b5ac-1a57-c1d4-3f4c']) {
      const note = byId(id).battlekitNote!;
      expect(note, `${byId(id).name}`).toBeTruthy();
      expect(note.startsWith('Battlekit'), `${byId(id).name}: "${note.slice(0, 30)}"`)
        .toBe(false);
    }
  });

  it('keeps forced kit and its profile on the same name, dataset-wide', () => {
    /*
      The invariant the build now asserts, checked here too so a reader can see
      what it means. One pair disagreed before this — the Warlock's.
    */
    const names = new Map(DATASET.weapons.map((w: { id: string; name: string }) => [w.id, w.name]));
    const clashes = DATASET.units.flatMap((u) =>
      (u.battlekit ?? [])
        .filter((b) => b.profileId && names.has(b.profileId) && names.get(b.profileId) !== b.name)
        .map((b) => `${u.name}: ${b.name} vs ${names.get(b.profileId!)}`));
    expect(clashes).toEqual([]);
  });
});
