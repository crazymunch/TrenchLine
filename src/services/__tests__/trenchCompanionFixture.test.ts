/**
 * The owner's own warband, through the real importer.
 *
 * CI-1's acceptance, on a share link the owner supplied for the purpose:
 * `trench-companion.com/warband/detail/505410` — Al-Qarn Rihla, Iron
 * Sultanate, House of Wisdom, thirteen models, campaign round 5. The envelope
 * is committed exactly as their endpoint returned it
 * (`data-sources/fixtures/trench-companion/`); the public warband the shape
 * was first measured on belongs to a stranger and is deliberately not.
 *
 * It is the **progressed** warband, one game on from
 * `newrecruit/al-qarn-rihla-september.json`. The two are NOT the same roster
 * and nothing here asserts they are.
 *
 * What it settles that a hand-built envelope could not, and what each one
 * broke before it arrived:
 *
 * 1. **`model.name` is the PLAYER's name.** Every model on the first warband
 *    measured carried its entry's display name, so resolving by name worked
 *    by accident. Here it is `Jawhar al-Sari` on a `md_mamlukfaris`.
 * 2. **Their slugs carry structure**: `md_azeb_mv_kavass` is the Azeb under a
 *    named Variant, and our Variant-applied list calls it `Kavass`.
 * 3. **`md_takwincreation_golem`** is a Takwin Homunculus the Book of Golems
 *    created.
 * 4. **Upgrade ids are namespaced by GROUP** and keep underscores inside a
 *    name: `up_alchemicalformulae_massive_size`.
 * 5. **Their money does not follow the simple relation**, which is what
 *    settled the ledger amendment.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { DATASET } from '@/data/generated/trenchline.generated';
import type { Dataset } from '@/types/catalogue';
import { GOLEM_GRANTED_BY, golemGrant } from '@/rules/golem';
import { carriesAsBattlekit, forcedBattlekit } from '@/rules/battlekit';
import { catalogueUnitFor } from '@/rules/catalogueUnit';
import { nameKey } from '@/rules/names';
import { explorationGrants } from '@/rules/campaign';
import { patronSkillsFor } from '@/rules/advancement';
import { scarCount, unfitForDuty, traumaProcedure } from '@/rules/trauma';
import { recruitable } from '@/rules/recruitable';
import { importTrenchCompanionWarband, priceDifferenceLine } from '../trenchCompanionImporter';

const D = DATASET as unknown as Dataset;
/** What this warband can field and buy — the same list the import resolves on. */
const shelfTL = recruitable(D, 'iron-sultanate',
  (D.factions ?? []).map((f) => f.id ?? f.name), 'houseofwisdom');

const envelope = JSON.parse(fs.readFileSync(path.join(process.cwd(),
  'data-sources/fixtures/trench-companion/al-qarn-rihla-505410.json'), 'utf8'));

const report = importTrenchCompanionWarband(envelope, DATASET as unknown as Dataset);
const w = report.warband;
const unit = (name: string) => w.units.find((u) => u.customName.trim() === name)!;

/** Their own record, read straight from the fixture: `warband_data` is a string. */
interface TheirLine {
  purchase?: { cost_value?: number };
  model: {
    name?: string;
    model?: string;
    equipment?: { equipment?: { name?: string } }[];
  };
}
const theirModels = (JSON.parse(envelope.warband_data) as { models: TheirLine[] }).models;
/** The equipment lines their record carries for one model, in their order. */
const theirEquipment = (name: string) =>
  (theirModels.find((l) => (l.model.name ?? '').trim() === name)?.model.equipment ?? [])
    .map((e) => (e.equipment?.name ?? '').trim());

describe('the warband itself', () => {
  it('is the owner\'s House of Wisdom warband, with all thirteen models', () => {
    expect(w.name).toBe('Al-Qarn Rihla');
    expect(w.factionId).toBe('iron-sultanate');
    expect(w.variantId).toBe('houseofwisdom');
    expect(w.units).toHaveLength(13);
  });

  it('keeps the player\'s own name on every model and resolves the entry separately', () => {
    /* Their `model.name` is the PLAYER's name here, not the entry's. Every
       pairing below is a name that resolves to nothing on our side. */
    expect(w.units.map((u) => [u.customName.trim(), u.profileSnapshot.name])).toEqual([
      ['Jawhar al-Sari', 'Mamluk Faris'],
      ['Al-Hafiz Tariq', 'Scripture Guardian'],
      ['Sipahsalar Kasim bin Malik, the Living Engineer', 'Jabirean Alchemist'],
      ['Zayd bin Tariq al-Nahas', 'Jabirean Alchemist'],
      ['Al-Qahhar, the Crippled', 'Brazen Bull'],
      ['Idris the Relic Hound', 'Kavass'],
      ['Nasir the Inaccurate', 'Kavass'],
      ['Rafiq the Incinerator', 'Kavass'],
      ['Dhi’b al-Nafud', 'Lion of Jabir'],
      ['The Iron Needle', 'Sultanate Sapper'],
      ['Al-Masyukh, Hunter of Hunters', 'Homunculus'],
      ['Al-Mudawwan, the Inscribed', 'Homunculus'],
      ['Sabir the Wind-Caller', 'Kavass'],
    ]);
  });

  it('resolves the Variant\'s own rename from the slug, not from the name', () => {
    /* `md_azeb_mv_kavass`: the base entry is the Azeb and the part after
       `_mv_` is what the House of Wisdom calls it. Four models carry it. */
    expect(w.units.filter((u) => u.profileSnapshot.name === 'Kavass')).toHaveLength(4);
  });

  it('resolves by the slug even when the player\'s name IS another entry', () => {
    /*
      The case this fixture cannot produce on its own, and the one that makes
      slug-first load-bearing rather than merely tidy: a nickname that
      collides with a real entry. Nobody on this roster happens to be called
      `Brazen Bull`, so trying the name first and the slug second lands
      correctly here by luck. Rename one model and the luck runs out.

      Built from the committed envelope with one field changed, so everything
      else about it is still the owner's own record.
    */
    const meddled = JSON.parse(JSON.stringify(envelope));
    const data = JSON.parse(meddled.warband_data);
    const kavass = data.models.find((m: { model: { model: string } }) =>
      m.model.model === 'md_azeb_mv_kavass');
    kavass.model.name = 'Brazen Bull';
    meddled.warband_data = JSON.stringify(data);

    const out = importTrenchCompanionWarband(meddled, DATASET as unknown as Dataset);
    const meddledUnit = out.warband.units.find((u) => u.customName === 'Brazen Bull')!;
    expect(meddledUnit.profileSnapshot.name).toBe('Kavass');
    expect(meddledUnit.profileSnapshot.baseCost)
      .toBe(unit('Nasir the Inaccurate').profileSnapshot.baseCost);
  });

  it('reports a Variant name no list here carries, and prices the base entry', () => {
    /*
      Item 4. `md_mamlukfaris_mv_sipahi` is a Mamluk Faris under the Defenders
      of the Iron Wall, who state the Sipahi as a Variant RULE rather than as
      an entry — "can include up to 1 Sipahi Automaton Cavalry Mercenary at a
      cost of 110 ducats … they use the Mercenary Entry for a Mamluk Faris" —
      so no list in this ruleset has an entry of that name, and the slug falls
      back to the base Mamluk Faris. That fallback is not free of consequences:
      the base entry costs no Ducats at all.
    */
    const meddled = JSON.parse(JSON.stringify(envelope));
    const data = JSON.parse(meddled.warband_data);
    data.models.find((m: { model: { model: string } }) => m.model.model === 'md_mamlukfaris')
      .model.model = 'md_mamlukfaris_mv_sipahi';
    meddled.warband_data = JSON.stringify(data);
    const out = importTrenchCompanionWarband(meddled, D);

    /* The entry it resolved to, by id and not by name. */
    const base = shelfTL.units.find((u) => u.name === 'Mamluk Faris')!;
    const faris = out.warband.units.find((u) => u.customName.trim() === 'Jawhar al-Sari')!;
    expect(faris.profileSnapshot.id).toBe(base.id);

    expect(out.warnings.some((x) => x.includes("files this model as 'sipahi'")
      && x.includes('imported as Mamluk Faris'))).toBe(true);

    /* No list here carries the name, under that Variant or any other. */
    const defenders = recruitable(D, 'iron-sultanate',
      (D.factions ?? []).map((f) => f.id ?? f.name), 'defendersoftheironwall');
    expect(defenders.units.some((u) => nameKey(u.name) === nameKey('Sipahi'))).toBe(false);

    /* And the price the Variant's own rule states is not the one it was
       imported at — read from the rule's sentence, not typed. */
    const rule = (D.variants ?? []).find((v) => v.id === 'defendersoftheironwall')!
      .specialRules.find((r) => r.name === 'Sipahi')!;
    const stated = Number(/at a cost of (\d+) ducats/i.exec(rule.description)![1]);
    expect(stated).toBeGreaterThan(0);
    expect(base.baseCost).not.toBe(stated);
    expect(faris.totalCost).not.toBe(stated);
  });

  it('marks the model the Book of Golems created, and only that one', () => {
    /* `md_takwincreation_golem`. Its twin `md_takwincreation` is the same
       entry arrived at by ordinary recruitment, and is not marked. */
    expect(w.units.filter((u) => u.grantedBy === GOLEM_GRANTED_BY).map((u) => u.customName.trim()))
      .toEqual(['Al-Mudawwan, the Inscribed']);
    expect(unit('Al-Masyukh, Hunter of Hunters').grantedBy).toBeUndefined();
  });
});

describe('the ledger', () => {
  it('credits their bank and debits bank less Strongbox', () => {
    expect((w.ledger ?? []).map((e) => [e.reason, e.ducats, e.glory])).toEqual([
      ['founding', 1460, 13],
      ['quartermaster', -1400, -11],
    ]);
  });

  it('lands on the Strongbox their page prints', () => {
    expect(w.treasuryDucats).toBe(60);
    expect(w.gloryPoints).toBe(2);
  });

  it('states their four figures where they do not reconcile, rather than calling them wrong', () => {
    /* 1460 banked, 1455 roster, 33 stash, 60 spare: bank less Strongbox is
       1400 while roster plus stash is 1488. We do not know what their app
       counts where, so the report states all four. */
    const said = report.warnings.find((x) => /do not reconcile/.test(x)) ?? '';
    for (const figure of ['1460 Ducats and 13 Glory', '1455 Ducats and 11 Glory',
      '33 Ducats and 0 Glory', '60 Ducats and 2 Glory']) {
      expect(said).toContain(figure);
    }
  });

  it('warns about the debt on its own', () => {
    expect(report.warnings.some((x) => /debt of 35 Ducats/.test(x))).toBe(true);
  });
});

describe('the campaign state', () => {
  it('records their round and Campaign Victory Points', () => {
    expect(w.importedCampaign)
      .toEqual({ source: 'trench-companion', round: 5, victoryPoints: 52 });
  });

  it('seeds the Promotion miss counter', () => {
    expect(w.promotionMisses).toBe(5);
  });

  it('carries Experience, the ELITE flag, Skills and injuries onto the models', () => {
    expect(unit('Sipahsalar Kasim bin Malik, the Living Engineer').xp).toBe(7);
    expect(unit('Al-Qahhar, the Crippled').isElite).toBe(true);
    expect((unit('Al-Qahhar, the Crippled').skills ?? []).map((s) => s.name))
      .toEqual(['Hip Shot', 'Strength of Samson']);
    expect(unit('Al-Qahhar, the Crippled').injuries).toEqual(['Lost Arm']);
  });

  it('resolves their Exploration Skill across the hyphen and the case', () => {
    /* `es_reroll` against our `Re-roll`. The second effect is not a Skill:
       it is what the Black Market grants for the rest of the campaign, read
       from the Location's own text — see 'reads the standing effect a Location
       grants' below. */
    expect((w.explorationEffects ?? []).map((e) => e.name)).toEqual(['Re-roll', 'Black Market']);
  });

  it('records the Patron, which is both ends of every Skill table', () => {
    /*
      Item 3 found it: `faction.patron_id` held `pt_houseofwisdom` and nothing
      read it. It is not a label — `patronSkillsFor` matches `warband.patron`
      against the Patron names to fill the roll of 2 and the roll of 12 — so a
      warband imported without it loses both ends of every Advancement Roll.
    */
    const patron = (D.patrons ?? []).find((p) => nameKey(p.name) === nameKey('house of wisdom'));
    expect(patron, 'this ruleset carries the House of Wisdom Patron').toBeDefined();
    expect(w.patron).toBe(patron!.name);
    expect(patronSkillsFor(D, w.patron)).toHaveLength(patron!.skills.length);
    expect(patronSkillsFor(D, w.patron).length).toBeGreaterThan(0);
  });

  it('records the Locations, stripping the book suffix', () => {
    /* `el_ransackedalchemistworkshop_cf` is the Carcass Front printing of a
       Location our tables hold once. */
    expect(w.explorationDiscoveries).toEqual([
      'Ransacked Alchemist Workshop', 'Sniper’s Lair', 'Book of Golems', 'Black Market',
    ]);
  });

  it('reaches a Location the slug rules cannot, through the equivalence table', () => {
    /*
      Item 9. `el_snipersnest` is their `Sniper's Nest` and our Common
      Locations table prints `Sniper’s Lair` — the same roll-16 result. The
      table named it and cited both sides, and `readExploration` was the one
      reader that never consulted the table, so the Location was reported as
      unknown with its own answer sitting beside it.
    */
    const table = JSON.parse(fs.readFileSync(path.join(process.cwd(),
      'data-sources/trench-companion/id-name-equivalence.json'), 'utf8')) as {
        ids: Record<string, { ours: string | null }>;
      };
    expect(table.ids.el_snipersnest.ours).toBe('Sniper’s Lair');
    expect(w.explorationDiscoveries).toContain(table.ids.el_snipersnest.ours);
    expect(report.unmatched.some((x) => x.includes('el_snipersnest'))).toBe(false);
    /* The option the player took is still reported: it is a choice we have
       nowhere to put, which is a different thing from a Location we cannot
       name. */
    expect(report.unmapped.some((x) => x.startsWith('Sniper’s Lair:')
      && /the option taken/.test(x))).toBe(true);
  });
});

/* ------------------------------------------- 40c: scars and fighter status */

/** The fixture with one model's fields changed, for the cases it cannot show. */
const meddle = (change: (m: Record<string, unknown>) => void, slug = 'md_brazenbull') => {
  const copy = JSON.parse(JSON.stringify(envelope));
  const data = JSON.parse(copy.warband_data);
  change(data.models.find((m: { model: { model: string } }) => m.model.model === slug).model);
  copy.warband_data = JSON.stringify(data);
  return importTrenchCompanionWarband(copy, DATASET as unknown as Dataset);
};

describe('Battle Scars', () => {
  it('gives Al-Qahhar the one Scar the owner\'s own screen shows', () => {
    /*
      Measured, 25 September: the Companion screen for Al-Qahhar, the Crippled
      (`in_lostarm`, `scar_reserves: 0`) shows exactly one Battle Scar. So a
      Scar comes with each injury, and `scar_reserves` is what a model carries
      BEYOND them — which is what the book implies, since a Full Recovery and a
      paid ransom each leave a Scar with no injury.
    */
    const bull = unit('Al-Qahhar, the Crippled');
    expect(bull.injuries).toEqual(['Lost Arm']);
    expect((bull.scars ?? []).map((s) => s.name)).toEqual(['Lost Arm']);
    expect(scarCount(bull)).toBe(1);
  });

  it('adds one more Scar per reserve, beyond the injuries', () => {
    const out = meddle((m) => { m.scar_reserves = 1; });
    const bull = out.warband.units.find((u) => u.customName.trim() === 'Al-Qahhar, the Crippled')!;
    expect(scarCount(bull)).toBe(2);
    expect((bull.scars ?? []).map((s) => s.name)).toEqual(['Lost Arm', 'Battle Scar']);
  });

  it('names a reserve Scar as what it is, without inventing a Trauma result', () => {
    /* We know how many there are and nothing else. Labelling each with a row
       it does not have would be exactly the fabrication rule 2 forbids. */
    const out = meddle((m) => { m.scar_reserves = 1; });
    const bull = out.warband.units.find((u) => u.customName.trim() === 'Al-Qahhar, the Crippled')!;
    const reserve = (bull.scars ?? [])[1];
    expect(reserve.roll).toBeUndefined();
    expect(reserve.effect).toMatch(/records the count but not/);
  });

  it('puts a Scar where the roster reads it, so an import is judged like a home-grown model', () => {
    /* `scarCount` reads `scars`, never `injuries` — the two are separate
       arrays and RC-05 is specifically about not inferring one from the
       other. `unfitForDuty` retires on the Scar count. */
    const procedure = traumaProcedure(DATASET as unknown as Dataset)!;
    expect(unfitForDuty(procedure, unit('Al-Qahhar, the Crippled'), 0).scars).toBe(1);
  });
});

describe('their fighter status', () => {
  it('puts every model on the roster, because all thirteen are active', () => {
    expect(w.units).toHaveLength(13);
    expect(w.fallen ?? []).toEqual([]);
    expect(w.units.some((u) => u.benched)).toBe(false);
  });

  it('benches a reserved model rather than dropping it', () => {
    /* "Any models you do not use will have to sit the game out" (p.97) is the
       same choice, durable for the same reason. */
    const out = meddle((m) => { m.active = 'reserved'; });
    const bull = out.warband.units.find((u) => u.customName.trim() === 'Al-Qahhar, the Crippled')!;
    expect(bull.benched).toBe(true);
  });

  it('takes a dead model to the memorial with its Battlekit, and says so', () => {
    const out = meddle((m) => { m.active = 'dead'; });
    expect(out.warband.units.some((u) => u.customName.trim() === 'Al-Qahhar, the Crippled'))
      .toBe(false);
    const gone = (out.warband.fallen ?? [])[0];
    expect(gone.customName.trim()).toBe('Al-Qahhar, the Crippled');
    expect(gone.isDead).toBe(true);
    /* Its kit goes with it — the book removes both. */
    expect(gone.equippedWeapons.map((x) => x.name)).toEqual(['Titan Zulfiqar', 'Flame Cannon']);
    expect(out.warnings.some((x) => /is dead in their record/.test(x))).toBe(true);
  });

  it('imports a dog as the model it names, and says the attachment is not mapped', () => {
    const out = meddle((m) => { m.active = 'dog'; });
    const dog = out.warband.units.find((u) => u.customName.trim() === 'Al-Qahhar, the Crippled')!;
    expect(dog).toBeDefined();
    expect(dog.benched).toBeUndefined();
    expect(out.warnings.some((x) => /attaches it to a handler/.test(x))).toBe(true);
  });

  it('refuses to guess at a status it does not know, and reports their word', () => {
    /*
      `lost` is the one their bundle tests for whose meaning is stated nowhere
      public. Reading it as dead kills a model the player may still have;
      reading it as benched keeps one they have lost. Neither is safe, so it is
      left off and named.
    */
    const out = meddle((m) => { m.active = 'lost'; });
    expect(out.warband.units.some((u) => u.customName.trim() === 'Al-Qahhar, the Crippled'))
      .toBe(false);
    expect(out.warband.fallen ?? []).toEqual([]);
    expect(out.unmatched.some((x) => /is 'lost' in their record/.test(x))).toBe(true);
  });

  it('treats a status that is not one of their words the same way', () => {
    /*
      Item 10. It read `typeof raw === 'string' ? … : 'active'`, so a record
      whose `active` was a number, an object or missing put the model on the
      roster as a fighting member — a default dressed as a reading, and the
      one field that says whether the model is there at all.
    */
    for (const value of [null, 3, { state: 'active' }, undefined]) {
      const out = meddle((m) => {
        if (value === undefined) delete m.active; else m.active = value;
      });
      expect(out.warband.units.some((u) => u.customName.trim() === 'Al-Qahhar, the Crippled'),
        JSON.stringify(value)).toBe(false);
      expect(out.unmatched.some((x) => /fighter status is/.test(x)), JSON.stringify(value))
        .toBe(true);
    }
  });

  it('asks whether the model is on the roster before reading anything off it', () => {
    /*
      Item 10 again, and the order the two are asked in. Status used to be read
      LAST, so a model their record does not put on the roster still spent its
      gear into the report: the Living Engineer's unresolvable Elixer was named
      as unmatched, and its prices compared, for a model that was never
      imported. A report about a model the player did not import is worse than
      no report.
    */
    const kasim = 'Sipahsalar Kasim bin Malik, the Living Engineer';
    /* Everything this model contributes to the report, while it is imported:
       four gear lines and an upgrade, all of them resolved, and a warning
       about where the Secrets of Takwin came from. */
    expect(report.warnings.some((x) => x.startsWith(`${kasim}: Secrets of Takwin`))).toBe(true);

    const out = meddle((m) => { m.active = 'lost'; }, 'md_jabireanalchemist');
    expect(out.warband.units.some((u) => u.customName.trim() === kasim)).toBe(false);
    expect(out.unmatched.some((x) => /is 'lost' in their record/.test(x))).toBe(true);
    /* And nothing of that model's reaches the report once it is not imported. */
    expect(out.warnings.some((x) => x.startsWith(`${kasim}: `))).toBe(false);
    expect(out.unmatched.some((x) => x.startsWith(`${kasim}: `))).toBe(false);
    expect(out.priceDifferences.some((d) => d.where.includes(kasim))).toBe(false);
  });
});

describe('the upgrades', () => {
  it('resolves all ten Formulae on Al-Masyukh, group-namespaced slugs and all', () => {
    expect((unit('Al-Masyukh, Hunter of Hunters').specialUpgrades ?? []).map((u) => u.name))
      .toEqual([
        'Additional Arm', 'Inhuman Strength', 'Massive Size', 'Hypnotic Eyes', 'Two Heads',
        'Hawk Eyes', 'Human Hands', 'Gargantuan Size', 'Terrifying Appearance',
        'Elemental Resistance',
      ]);
  });

  it('resolves all five on Al-Mudawwan', () => {
    expect((unit('Al-Mudawwan, the Inscribed').specialUpgrades ?? []).map((u) => u.name))
      .toEqual([
        'Human Hands', 'Inhuman Strength', 'Additional Arm', 'Terrifying Appearance', 'Hawk Eyes',
      ]);
  });

  it('reads an underscore inside a name, and a group that is not ours', () => {
    /* `up_alchemicalformulae_massive_size` keeps the underscore; and
       `up_alchemicalformulae_hawkeyes` is in OUR `Eye Options` group, so the
       group in their slug is theirs and not a claim about ours. */
    const held = unit('Al-Masyukh, Hunter of Hunters').specialUpgrades ?? [];
    expect(held.find((u) => u.name === 'Massive Size')?.category).toBe('Alchemical Formulae');
    expect(held.find((u) => u.name === 'Hawk Eyes')?.category).toBe('Eye Options');
  });

  it('resolves up_meleemight to the purchase it actually is', () => {
    /*
      Not the rename, which is what this test used to assert and what the
      report used to tell the player. Their upgrade carries
      `upgrade_stat: melee +1`, and that is the PURCHASE the catalogue's
      Kavass rule describes — "change the Melee Characteristic of up to 3
      Azebs … at a cost of +5 ducats each" (Iron Sultanate.cat:5847) — which
      our dataset carries as the entry's hidden `Upgrades :: Studied Blade`
      at 5 Ducats (:5497).

      As it shipped, Idris, Nasir and Rafiq each lost a point of Melee and 5
      Ducats, and the report said the rename was "already in the model".
    */
    for (const name of ['Idris the Relic Hound', 'Nasir the Inaccurate', 'Rafiq the Incinerator']) {
      const held = unit(name).specialUpgrades ?? [];
      expect(held.map((u) => u.name), name).toEqual(['Studied Blade']);
      expect(held[0].cost, name).toBe(5);
      expect(held[0].category, name).toBe('Upgrades');
    }
    expect(report.unmatched.some((u) => /meleemight/.test(u))).toBe(false);
    expect(report.unmapped.some((u) => /meleemight/.test(u))).toBe(false);
  });

  it('charges the three Kavass for it, at the catalogue\'s price', () => {
    /* Read from the dataset, not typed: the price is the entry option's. */
    const blade = shelfTL.units.find((u) => u.name === 'Kavass');
    expect(blade).toBeDefined();
    const kavass = unit('Nasir the Inaccurate');
    const gear = [...kavass.equippedWeapons, ...kavass.equippedArmour, ...kavass.equippedEquipment]
      .reduce((sum, g) => sum + (g.cost ?? 0), 0);
    expect(kavass.totalCost).toBe(kavass.profileSnapshot.baseCost + gear + 5);
  });
});

describe('the equipment', () => {
  /** Every model's equipped lists, in the order the roster holds them. */
  const carried = (name: string) => {
    const u = unit(name);
    return [...u.equippedWeapons, ...u.equippedArmour, ...u.equippedEquipment];
  };
  const carriedNames = (name: string) => carried(name).map((x) => x.name);
  /** What this Warband's Armoury charges for an item, by our name for it. */
  const armouryPrice = (itemName: string) => {
    const hit = [...shelfTL.weapons, ...shelfTL.armour, ...shelfTL.equipment]
      .filter((x) => nameKey(x.name) === nameKey(itemName));
    expect(hit, itemName).toHaveLength(1);
    return hit[0].cost;
  };

  it('lands each model\'s purchases, by our names', () => {
    expect(carriedNames('Jawhar al-Sari'))
      .toEqual(['Jezzail', 'Reinforced Armour', 'Alchemical Ammunition', 'Combat Helmet']);
    expect(carriedNames('Al-Qahhar, the Crippled'))
      .toEqual(['Titan Zulfiqar', 'Flame Cannon', 'Machine Armour']);
    expect(carriedNames('Al-Masyukh, Hunter of Hunters'))
      .toEqual(['Siege Jezzail', 'Titan Zulfiqar', 'Great Sword/Axe', 'Trench Shield']);
  });

  it('accounts for every equipment line on all thirteen models', () => {
    /*
      Item 12. Four models asserted by hand left nine unexamined, and the
      double-charge below lived on two of them. Every line their record carries
      lands in exactly one of three places — on the model as a purchase, on the
      entry as Battlekit the model already has, or in `unmatched` — and this
      counts all thirteen models' lines against all three.
    */
    for (const [i, line] of theirModels.entries()) {
      const m = line.model;
      const label = (m.name ?? '').trim();
      const u = w.units.find((x) => x.customName.trim() === label)
        ?? (w.fallen ?? []).find((x) => x.customName.trim() === label);
      expect(u, `${label} is on the roster`).toBeDefined();

      const lines = (m.equipment ?? []) as { equipment?: { name?: string } }[];
      const theirNames = lines.map((e) => (e.equipment?.name ?? '').trim());
      const kit = forcedBattlekit(u!.profileSnapshot);

      const asKit = theirNames.filter((n) => carriesAsBattlekit(u!.profileSnapshot, { name: n }));
      const reported = theirNames.filter(
        (n) => report.unmatched.some((r) => r.includes(label) && r.includes(n)));
      /* Their `list_upgrades` can land in the equipped lists too — see the
         Secrets of Takwin, which this ruleset holds as an item — and those are
         not equipment lines, so they are not counted against them. */
      const bought = carried(label!).filter((x) => !x.instanceId.includes('-upgrade-'));

      expect(
        bought.length + asKit.length + reported.length,
        `${label}: ${theirNames.length} lines -> ${bought.length} bought, ${asKit.length} `
        + `already kit (${kit.map((b) => b.name).join(', ')}), ${reported.length} reported`,
      ).toBe(theirNames.length);
      expect(i).toBeLessThan(13);
    }
  });

  it('carries the Arsenal across', () => {
    expect(w.armoryStash.map((s) => s.name)).toEqual(['Siege Jezzail', 'Alchemical Ammunition']);
  });

  it('charges a Scripture Guardian nothing for the kit its own entry carries', () => {
    /*
      Item 2. Their record lists a model's Battlekit as equipment lines like
      any other, and this import priced each one off the Armoury Table: the
      Guardian was charged for the Reinforced Armour and Combat Helmet its
      entry already gives it, on top of the 7 Glory that includes them.

      The kit is not dropped — it is on the profile snapshot, which is where
      the card, the carrying limits and the Mercenary rule read it from, and
      where the equip sheet reads it to hide the Armoury row. Only the second
      purchase is gone.
    */
    const guardian = unit('Al-Hafiz Tariq');
    const kit = forcedBattlekit(guardian.profileSnapshot).map((b) => b.name);
    expect(kit).toEqual(expect.arrayContaining(['Reinforced Armour', 'Combat Helmet']));

    /* Their record does list both, so this is a line that was read and not one
       that was missing. */
    expect(theirEquipment('Al-Hafiz Tariq'))
      .toEqual(['Combat Helmet', 'Reinforced Armour', 'Great Hammer/Maul']);

    /* And the Armoury would have charged for them, which is what was happening. */
    expect(armouryPrice('Reinforced Armour') + armouryPrice('Combat Helmet'))
      .toBeGreaterThan(0);

    expect(carriedNames('Al-Hafiz Tariq')).toEqual(['Great Hammer/Maul']);
    expect(guardian.totalCost)
      .toBe(guardian.profileSnapshot.baseCost + armouryPrice('Great Hammer/Maul'));
  });

  it('does not sell a Sultanate Sapper its own Shovel', () => {
    /* The same defect on the entry whose kit is a shared `Shovel` entry that
       our snapshot reaches through `profileNames` — see `battlekit.ts`. */
    const sapper = unit('The Iron Needle');
    expect(forcedBattlekit(sapper.profileSnapshot).map((b) => b.name)).toEqual(['Shovel']);
    expect(theirEquipment('The Iron Needle')).toContain('Shovel');
    expect(carriedNames('The Iron Needle')).toEqual([
      'Siege Jezzail', 'Trench Club', 'Standard Armour', 'Alchemical Ammunition',
    ]);
    expect(armouryPrice('Shovel')).toBeGreaterThan(0);
    expect(sapper.totalCost).toBe(
      sapper.profileSnapshot.baseCost
      + carriedNames('The Iron Needle').reduce((sum, n) => sum + armouryPrice(n), 0));
  });

  it('leaves a Mamluk Faris the kit its price includes, and says where that price came from', () => {
    /*
      The third case, and the one our own dataset cannot answer: the errata
      gives the Mamluk Faris "Reinforced Armour, a Combat Helmet, and a a
      Jezzail with Alchemical Ammunition" inside its 4-Glory price (Warbands
      1.0.2 p179), and the catalogue states those as `infoLinks` rather than
      forced `entryLink`s, so the pipeline carries no Battlekit for the entry —
      the gap `equipGate.ts`'s `mercenaryRefusal` documents. Their record says
      the same thing in its own structure: a `rel_md_eq_…` relation at no cost.
      Priced off the Armoury it added 55 Ducats to a model that costs no Ducats
      at all.
    */
    const faris = unit('Jawhar al-Sari');
    expect(forcedBattlekit(faris.profileSnapshot)).toEqual([]);
    expect(carriedNames('Jawhar al-Sari'))
      .toEqual(['Jezzail', 'Reinforced Armour', 'Alchemical Ammunition', 'Combat Helmet']);
    expect(carried('Jawhar al-Sari').map((x) => x.cost)).toEqual([0, 0, 0, 0]);
    expect(faris.profileSnapshot.baseCost).toBe(0);
    expect((faris.profileSnapshot.gloryCost ?? 0)).toBeGreaterThan(0);
    expect(faris.totalCost).toBe(0);

    /* The Armoury does stock all four, at a price — that is what was added. */
    expect(carriedNames('Jawhar al-Sari').reduce((sum, n) => sum + armouryPrice(n), 0))
      .toBeGreaterThan(0);

    /* Reported, never silent: a price taken from their file rather than from
       this ruleset is one the player has to be able to check. One line for the
       model, naming all four items, rather than the same sentence four times
       (item 11). */
    const said = report.warnings.filter((x) => x.startsWith('Jawhar al-Sari: '));
    expect(said).toHaveLength(1);
    expect(said[0]).toMatch(/their record hands the model at no cost/);
    for (const item of carriedNames('Jawhar al-Sari')) expect(said[0]).toContain(item);
  });

  it('does not charge the Golem for the Formula the Book of Golems gives it', () => {
    /*
      *"It has the Human Hands Alchemical Formula, plus Alchemical Formulas
      worth a total of up to 50 👑 for free"* — the named Formula is given, and
      the import was charging for it. Read from the grant, not by name.
    */
    const grant = golemGrant(D)!;
    expect(grant.startsWith).toBeTruthy();

    const golem = unit('Al-Mudawwan, the Inscribed');
    expect(golem.grantedBy).toBe(GOLEM_GRANTED_BY);
    const given = (golem.specialUpgrades ?? []).find((x) => x.name === grant.startsWith);
    expect(given, grant.startsWith).toBeDefined();
    expect(given!.cost).toBe(0);

    /* The option is not a free row: the same Formula on the Homunculus that
       the grant did NOT create is charged the catalogue's price. */
    const entry = catalogueUnitFor(D, { baseProfileId: golem.profileSnapshot.id },
      'iron-sultanate');
    const option = (entry?.options ?? []).find((o) => o.name === grant.startsWith);
    expect(option?.cost.ducats).toBeGreaterThan(0);
    const sibling = unit('Al-Masyukh, Hunter of Hunters');
    expect(sibling.grantedBy).toBeUndefined();
    expect((sibling.specialUpgrades ?? []).find((x) => x.name === grant.startsWith)?.cost)
      .toBe(option!.cost.ducats);

    /* And their record prices it at nothing too, so nothing is reported. */
    expect(report.priceDifferences.some((d) => d.name === grant.startsWith)).toBe(false);
  });

  it('reports the prices that differ, with ours read from the ruleset', () => {
    /*
      One line, where six of the seven it used to print were the double-charge
      above reported as a disagreement. The Brazen Bull is the real one: their
      record prices the model 100 and ours prices it from the catalogue.
    */
    expect(report.priceDifferences.map((d) => d.name)).toEqual(['Brazen Bull']);

    const bull = shelfTL.units.find((u) => u.name === 'Brazen Bull')!;
    const theirs = theirModels.find((l) => l.model.model === 'md_brazenbull')!.purchase!;
    expect(report.priceDifferences[0]).toEqual({
      name: 'Brazen Bull',
      theirs: { ducats: theirs.cost_value, glory: 0 },
      ours: { ducats: bull.baseCost, glory: bull.gloryCost ?? 0 },
      /* Which model it was read on — one line per item, listing the models it
         is on (item 11). */
      where: ['Al-Qahhar, the Crippled'],
    });
    expect(priceDifferenceLine(report.priceDifferences[0]))
      .toContain('On Al-Qahhar, the Crippled.');
    /* The two really do disagree, so this is not an equality that holds by
       both sides being the same number. */
    expect(bull.baseCost).not.toBe(theirs.cost_value);
  });
});

describe('what it could not resolve', () => {
  it('names exactly that, and nothing else', () => {
    /*
      Two, and both are this ruleset's own gaps rather than failures of the
      reading. Item 6 corrected what this comment used to claim about them.

      - `up_fierceandbrave` is **Fierce Lion**, 5 Ducats, a real
        `selectionEntry type="upgrade"` on the Lion of Jabir
        (`Iron Sultanate.cat:5676`): "You can upgrade any Lion of Jabir into a
        Fierce Lion of Jabir at the cost of +5 ducats." It is declared as a
        direct child of the model entry rather than inside a
        `selectionEntryGroup`, and `scripts/lib/parse-battlescribe.mjs`'s
        `optionsOf` reads only the inline groups — so this ruleset carries no
        option for it, and our Lion of Jabir has no options at all.
      - `up_skirmisher` is **Light Skirmisher**, 5 Ducats, in the Azeb's own
        `Upgrades` group (`Iron Sultanate.cat:5456`), beside the Studied Blade
        that does resolve. Two things keep it out of this Warband's list. Its
        rule arrives as an `infoLink type="rule"` (Skirmisher) rather than as
        an inline Ability profile, and `optionsOf` resolves only profile links,
        so nothing is emitted for it; and the catalogue hides the row outright
        when the House of Wisdom is taken (`:5466`, conditioned on the Variant
        entry `c2b1-d49e-937b-2f87`), following that Variant's own Kavass rule
        — "However, you cannot give these Azebs the SKIRMISHER Keyword."

      Neither is guessed at. Where the book's rule is narrower than the
      catalogue's hide — it forbids the Keyword to the Azebs bought the Kavass
      Melee change, and this model is not one of them — that is the owner's
      decision to make, and it is made on a line that names the purchase rather
      than on one that silently dropped it.

      The two that used to be here are gone: the Elixer resolves through the
      entry's own name (item 8), the Secrets of Takwin through the gear shelf
      it lives on (item 6), and `el_snipersnest` through the equivalence table
      (item 9).
    */
    expect(report.unmatched).toEqual([
      "Dhi’b al-Nafud: upgrade 'up_fierceandbrave'",
      "Sabir the Wind-Caller: upgrade 'up_skirmisher'",
    ]);
  });

  it("resolves their spelling through the catalogue's own other name for it", () => {
    /*
      Item 8. `Elixer of Al-Khidr` is their spelling AND ours: the Iron
      Sultanate's `selectionEntry name="Elixer of Al-Khidr"`
      (`Iron Sultanate.cat:77`) wraps a profile named `Elixir of Al-Khidr`
      (`:90`). The pipeline used to delete the entry name as scaffolding, so
      the only route left was a hand-written equivalence — which is the kind of
      mapping rule 1 exists to keep out of this project. It now ships as
      `aliases`, and the import reads it after every name has failed.
    */
    const entry = (D.weapons ?? []).find((x) => x.name === 'Elixir of Al-Khidr')!;
    expect(entry.aliases).toEqual(['Elixer of Al-Khidr']);

    const kasim = unit('Sipahsalar Kasim bin Malik, the Living Engineer');
    const held = kasim.equippedEquipment.find((x) => x.name === entry.name);
    expect(held).toBeDefined();
    expect(held!.cost).toBe(entry.cost.ducats);
    expect(report.unmatched.some((x) => /Elix/.test(x))).toBe(false);

    /* And no equivalence entry for it: the answer is derived. */
    const table = JSON.parse(fs.readFileSync(path.join(process.cwd(),
      'data-sources/trench-companion/id-name-equivalence.json'), 'utf8')) as {
        ids: Record<string, unknown>;
      };
    expect(Object.keys(table.ids).some((k) => /elix/i.test(k))).toBe(false);
  });

  it('puts the Secrets of Takwin on the model, where this ruleset holds it', () => {
    /*
      Item 6. Their record files it as an upgrade; this ruleset carries it as a
      Battlekit-typed entry of the Iron Sultanate's, because the catalogue
      states the House of Wisdom's Secrets on the WARBAND rather than on the
      Alchemist (`Iron Sultanate.cat:2831`). The model may have one — "Each
      Jabirean Alchemist in a House of Wisdom Warband can have one of following
      abilities at the cost indicated below" — so it is resolved rather than
      reported as missing.
    */
    const kasim = unit('Sipahsalar Kasim bin Malik, the Living Engineer');
    const secrets = kasim.equippedEquipment.find((x) => x.name === 'Secrets of Takwin');
    expect(secrets).toBeDefined();

    /* Priced from the entry, not from their record. */
    const entry = (D.weapons ?? []).find((x) => x.name === 'Secrets of Takwin')!;
    expect(secrets!.cost).toBe(entry.cost.ducats);
    expect(secrets!.effect).toBe(entry.rules);

    /* And the report says where the price came from, since the Armoury Table
       does not stock it. */
    expect(report.warnings.some((x) => x.includes('Secrets of Takwin')
      && /does not stock/.test(x))).toBe(true);
  });

  it('reports only the field it still does not map', () => {
    /* `stat_selections` is `[]` on all thirteen, so there is nothing to read
       it from. The other two were measured and now map. */
    expect(report.unmapped.some((u) => u.startsWith('stat_selections:'))).toBe(true);
    for (const mapped of ['scar_reserves:', 'active:']) {
      expect(report.unmapped.some((u) => u.startsWith(mapped))).toBe(false);
    }
  });

  it('reports the Fireteam and the Location option', () => {
    expect(report.unmapped.some((u) => u.startsWith('fireteams:'))).toBe(true);
    expect(report.unmapped.some((u) => /the option taken/.test(u))).toBe(true);
  });
});

describe('every field their record carries', () => {
  /*
    Item 3, and the walk that found a fifth.

    `list_modelequipment`, `subproperties`, `location_mods` and
    `expansion_data` all held something on the owner's warband and were
    neither read nor reported; walking the keys turned up `faction_rules` as
    well. A field is handled here when the import READS it — the reader named
    beside it — or REPORTS it in `unmapped`. Anything else that holds a value
    fails this test, so the next field their export grows is a failing test
    rather than a silent loss.

    The classifications are the point of the test and are written out rather
    than derived: a field quietly reclassified is exactly what this is for.
  */
  /** Holds something, in the sense `reportUnmapped` uses. */
  const holds = (v: unknown): boolean => {
    if (v === undefined || v === null || v === false || v === '') return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'object') return Object.keys(v as object).length > 0;
    return true;
  };

  const WARBAND: Record<string, string> = {
    id: 'theirs: their own id for the record',
    source: 'theirs: their marker for a user-built warband',
    contextdata: 'theirs: their editor state',
    name: 'read: the Warband name',
    tags: 'read: tc_version, which decides the Preview-rules warning',
    ducat_bank: 'read: the founding allowance',
    glory_bank: 'read: the founding allowance in Glory',
    debts: 'read: reported as a warning, since TrenchLine has no debt',
    context: 'read: the campaign state and their four money figures',
    faction: 'read: faction_property; faction_rules reported',
    exploration: 'read: the Skills, the Locations and what they grant',
    models: 'read: the roster',
    equipment: 'read: the Arsenal',
    notes: 'read: the Warband notes',
    modifiers: 'reported',
    modifiersloc: 'reported',
    fireteams: 'reported',
    consumables: 'reported',
    restrictions_list: 'reported',
    expansion_ids: 'reported',
    expansion_data: 'reported',
  };
  const CONTEXT: Record<string, string> = {
    id: 'theirs: their own id for the context',
    victory_points: 'read: importedCampaign.victoryPoints',
    campaign_round: 'read: importedCampaign.round',
    failed_promotions: 'read: promotionMisses',
    stored_ratings: 'read: the ledger and the Strongbox',
    homebrew_id: 'theirs: their homebrew content ids',
  };
  const RATINGS: Record<string, string> = {
    rating_ducat: 'read: the quartermaster debit',
    rating_glory: 'read: the quartermaster debit',
    spare_ducat: 'read: the Strongbox',
    spare_glory: 'read: the Strongbox',
    stash_rating_ducat: 'read: the money warning',
    stash_rating_glory: 'read: the money warning',
  };
  const EXPLORATION: Record<string, string> = {
    explorationskills: 'read: explorationEffects',
    locations: 'read: explorationDiscoveries and what each Location grants',
    location_mods: 'read: checked against the Locations discovered',
    templocations: 'theirs: their in-progress Exploration Step',
    contextdata: 'theirs', id: 'theirs', name: 'theirs', source: 'theirs', tags: 'theirs',
  };
  const FACTION: Record<string, string> = {
    faction_property: 'read: the faction and its Variant',
    faction_rules: 'reported',
    patron_id: 'read: warband.patron, and through it the Patron Skill tables',
    contextdata: 'theirs', id: 'theirs', name: 'theirs', source: 'theirs', tags: 'theirs',
  };
  const MODEL: Record<string, string> = {
    id: 'theirs: their own id for the model',
    source: 'theirs', contextdata: 'theirs',
    name: 'read: customName',
    model: 'read: the entry, by slug',
    tags: "theirs: their copy of the Variant's name and the Mercenary role",
    active: 'read: fighterStatus',
    equipment: 'read: the gear',
    list_upgrades: 'read: specialUpgrades',
    list_skills: 'read: skills',
    list_injury: 'read: injuries and Scars',
    experience: 'read: xp',
    elite: 'read: isElite',
    notes: 'read: the lore note',
    recruited: 'theirs: their flag for a model added this Step',
    scar_reserves: 'read: Scars beyond the injuries',
    stat_selections: 'reported',
    subproperties: 'reported',
    list_modelequipment: 'reported',
  };
  const LINE: Record<string, string> = {
    purchase: 'read: their price, for the price report',
    model: 'read', equipment: 'read', upgrade: 'read',
  };
  const PURCHASE: Record<string, string> = {
    cost_value: 'read: their price',
    cost_type: 'read: which currency their price is in',
    faction_rel_id: 'read: whether the line is a purchase or the entry\'s own kit',
    custom_rel: 'read: the relation\'s own name, as a second name to resolve by',
    purchaseid: 'theirs: their id for the purchase',
    discount: 'theirs: their own discount bookkeeping',
    count_limit: 'theirs: whether their UI caps the line',
    count_cap: 'theirs: whether their UI caps the line',
    sell_item: 'theirs: whether their UI offers to sell it',
    sell_full: 'theirs: whether their UI refunds it in full',
    modelpurch: 'theirs: their flag for a model purchase',
  };

  /** Every key that holds something is classified, and 'reported' is reported. */
  const walk = (what: string, obj: unknown, table: Record<string, string>) => {
    for (const [key, value] of Object.entries((obj ?? {}) as Record<string, unknown>)) {
      if (!holds(value)) continue;
      expect(table[key], `${what}.${key} holds ${JSON.stringify(value).slice(0, 60)} and is `
        + 'neither read nor reported').toBeDefined();
      if (table[key] === 'reported') {
        expect(report.unmapped.some((u) => u.includes(key)),
          `${what}.${key} is classified 'reported' and no line of the report names it`).toBe(true);
      }
    }
  };

  it('classifies every field the Warband itself carries', () => {
    const their = JSON.parse(envelope.warband_data) as Record<string, never>;
    walk('warband_data', their, WARBAND);
    walk('context', their.context, CONTEXT);
    walk('context.stored_ratings', (their.context as Record<string, never>).stored_ratings, RATINGS);
    walk('exploration', their.exploration, EXPLORATION);
    walk('faction', their.faction, FACTION);
    for (const line of (their.equipment ?? []) as Record<string, never>[]) {
      walk('equipment[]', line, LINE);
      walk('equipment[].purchase', line.purchase, PURCHASE);
    }
  });

  it('classifies every field all thirteen models carry', () => {
    for (const line of theirModels as unknown as Record<string, never>[]) {
      walk('models[]', line, LINE);
      walk('models[].purchase', line.purchase, PURCHASE);
      const m = line.model as Record<string, never>;
      walk(`models[${String(m.name).trim()}]`, m, MODEL);
      for (const e of (m.equipment ?? []) as Record<string, never>[]) {
        walk('equipment[]', e, LINE);
        walk('equipment[].purchase', e.purchase, PURCHASE);
      }
      for (const u of (m.list_upgrades ?? []) as Record<string, never>[]) {
        walk('list_upgrades[]', u, LINE);
        walk('list_upgrades[].purchase', u.purchase, PURCHASE);
      }
    }
  });

  it('says what it does not read, field by field', () => {
    /* The five the walk above requires a line for, each named once. */
    for (const field of ['subproperties', 'list_modelequipment', 'stat_selections',
      'faction_rules', 'expansion_data']) {
      expect(report.unmapped.filter((u) => u.startsWith(`${field}:`)), field)
        .toHaveLength(1);
    }
    /* And the one line that is about a model rather than a field. */
    expect(report.unmapped.some(
      (u) => u.startsWith('list_modelequipment on Jawhar al-Sari:')
        && /rel_md_eq_mamlukpackage_1/.test(u))).toBe(true);
  });

  it('reads the standing effect a Location grants, from our own text', () => {
    /*
      Item 5. Their `location_mods` records that a Location's effect is
      standing; the effect itself is in the Location's text, and pack G's
      `explorationGrants` is what reads it. The Black Market — "From now on, in
      the Quartermaster Step, you can purchase Glory Items costing 8 ☼ or
      less" — is the case on this warband, and the import used to record the
      discovery and lose the permission.
    */
    const rows = Object.values(D.campaign?.exploration?.locations ?? {}).flat();
    const market = rows.find((r) => r.name === 'Black Market')!;
    expect(w.explorationDiscoveries).toContain('Black Market');
    expect(w.explorationEffects).toEqual(expect.arrayContaining(
      explorationGrants(D, market, 5)));
    expect(explorationGrants(D, market, 5)[0].gloryItemsUpTo).toBeGreaterThan(0);

    /* Their mod for it needs no line of its own: it says what the text says.
       The Workshop's does, because their record keeps an option for it and
       this ruleset's text for it offers no choice to make. */
    expect(report.unmapped.some((u) => u.includes('el_blackmarket_mod'))).toBe(false);
    expect(report.unmapped.some(
      (u) => u.startsWith("location_mods 'el_ransackedalchemistworkshop_mod'"))).toBe(true);
  });
});
