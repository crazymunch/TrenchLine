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
import { formulaShelf } from '@/rules/formulaShelf';
import { formulaeOf } from '@/rules/formulae';
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
  purchase?: { cost_value?: number; discount?: number };
  model: {
    id?: string;
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

    /*
      The resolved ENTRY, by id. Round 2, item 6: asserting the name and the
      base cost proved less than it looked — both hold by construction on a
      roster where the Kavass and the Brazen Bull are different entries anyway,
      and an id cannot be satisfied by a coincidence of names.
    */
    const kavassEntry = shelfTL.units.find((u) => u.name === 'Kavass')!;
    const bullEntry = shelfTL.units.find((u) => u.name === 'Brazen Bull')!;
    expect(meddledUnit.profileSnapshot.id).toBe(kavassEntry.id);
    expect(meddledUnit.profileSnapshot.id).not.toBe(bullEntry.id);
    expect(meddledUnit.profileSnapshot.name).toBe('Kavass');
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

    const said = out.warnings.find((x) => x.includes("as 'sipahi'"))!;
    expect(said).toBeDefined();
    expect(said).toContain('imported as Mamluk Faris');
    /* Nothing in this ruleset carries the name, and the line says so — see the
       next test for the other half of that sentence. */
    expect(said).toContain('No list this ruleset carries has an entry of that name');

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

  it("names the Variant that does carry a name this Warband's list does not", () => {
    /*
      Round 2, item 6. "No list this ruleset carries has an entry of that name"
      is false whenever another Variant of the faction does, and then the fact
      the player needs is that they have the wrong Variant rather than an
      unknown model. `md_azeb_mv_kavass` in a PLAIN Iron Sultanate Warband is
      that case: the House of Wisdom is what calls an Azeb a Kavass.
    */
    const meddled = JSON.parse(JSON.stringify(envelope));
    const data = JSON.parse(meddled.warband_data);
    data.faction.faction_property.object_id = 'fc_ironsultanate';
    meddled.warband_data = JSON.stringify(data);
    const out = importTrenchCompanionWarband(meddled, D);

    const variant = (D.variants ?? []).find((v) => v.id === 'houseofwisdom')!;
    const lines = out.warnings.filter((x) => x.includes("as 'kavass'"));
    /* One line for the Variant form, not one per model (item 8). */
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(`what the ${variant.name} list calls it`);
    for (const name of ['Idris the Relic Hound', 'Nasir the Inaccurate',
      'Rafiq the Incinerator', 'Sabir the Wind-Caller']) {
      expect(lines[0], name).toContain(name);
    }
    /* And the models are on the roster as the base entry. */
    expect(out.warband.units.filter((u) => u.profileSnapshot.name === 'Azeb')).toHaveLength(4);
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
    for (const value of [null, 3, { state: 'active' }, undefined, '', '   ']) {
      const out = meddle((m) => {
        if (value === undefined) delete m.active; else m.active = value;
      });
      /* Round 2, item 7: an empty string is not one of their words either, and
         it used to be read as `active`. */
      expect(out.warband.units.some((u) => u.customName.trim() === 'Al-Qahhar, the Crippled'),
        JSON.stringify(value)).toBe(false);
      expect(out.unmatched.some((x) => /fighter status is/.test(x)), JSON.stringify(value))
        .toBe(true);
    }
  });

  it('says nothing about a model it did not import', () => {
    /*
      Round 2, item 7. The unmapped report walked their whole model list, so a
      model their record calls `lost` still had its `list_modelequipment` choice
      printed and was still counted in "3 models carry a value for it" — a
      report speaking for a model the player did not import.
    */
    const faris = 'Jawhar al-Sari';
    expect(report.unmapped.some((u) => u.startsWith(`list_modelequipment on ${faris}:`)))
      .toBe(true);
    const counted = (lines: string[]) =>
      Number(/(\d+) models? carr/.exec(lines.find((u) => u.startsWith('list_modelequipment:'))!)![1]);
    expect(counted(report.unmapped)).toBe(3);

    const out = meddle((m) => { m.active = 'lost'; }, 'md_mamlukfaris');
    expect(out.warband.units.some((u) => u.customName.trim() === faris)).toBe(false);
    expect(out.unmapped.some((u) => u.startsWith(`list_modelequipment on ${faris}:`)))
      .toBe(false);
    expect(counted(out.unmapped)).toBe(2);
  });

  it('says a miss once, listing the models that carried it', () => {
    /*
      Round 2, item 8. `up_skirmisher` and one unresolvable item on four
      Kavass produced eight lines — two facts, said eight times. One line each
      now, naming all four models.
    */
    const copy = JSON.parse(JSON.stringify(envelope));
    const data = JSON.parse(copy.warband_data);
    const kavass = (data.models as { model: { model: string; name: string;
      equipment: unknown[]; list_upgrades: unknown[] } }[])
      .filter((m) => m.model.model === 'md_azeb_mv_kavass');
    expect(kavass).toHaveLength(4);
    for (const line of kavass) {
      line.model.list_upgrades = [{
        purchase: { cost_value: 5, cost_type: 0 },
        upgrade: { object_id: 'up_skirmisher' },
      }];
      line.model.equipment = [{
        purchase: { cost_value: 9, cost_type: 0 },
        equipment: { id: 'eq_nosuchthing', name: 'Tide-Caller Horn' },
      }];
    }
    copy.warband_data = JSON.stringify(data);
    const out = importTrenchCompanionWarband(copy, D);

    const names = kavass.map((l) => l.model.name.trim());
    const lines = out.unmatched.filter(
      (u) => u.includes('up_skirmisher') || u.includes('Tide-Caller Horn'));
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      for (const name of names) expect(line, line).toContain(name);
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
    expect(out.unmatched.some((x) => x.includes(`on ${kasim}`))).toBe(false);
    expect(out.priceDifferences.some((d) => d.where.includes(kasim))).toBe(false);
  });
});

/** An option on the Kavass entry, by name — the price comes from here. */
const kavassOption = (name: string) => {
  const kavass = shelfTL.units.find((u) => u.name === 'Kavass')!;
  const entry = catalogueUnitFor(D, { baseProfileId: kavass.id }, 'iron-sultanate');
  const option = (entry?.options ?? []).find((o) => o.name === name)!;
  expect(option, `the Kavass entry offers ${name}`).toBeDefined();
  return option;
};

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
    /*
      The group PATH, which is what `AddEquipmentModal` writes for the same
      purchase. Round 2: imported with the leaf, an Eye Option was not a
      Formula to `formulaeOf` — the defect FD-13a fixed for the in-app
      purchase, reintroduced by the import.
    */
    expect(held.find((u) => u.name === 'Hawk Eyes')?.category)
      .toBe('Alchemical Formulae::Eye Options');
    expect(formulaeOf(unit('Al-Masyukh, Hunter of Hunters'))).toContain('Hawk Eyes');
    expect(formulaeOf(unit('Al-Masyukh, Hunter of Hunters'))).toContain('Hypnotic Eyes');
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
    /* The option's own price, read from the entry. Round 2, item 9: this used
       to type `5` under a comment saying it came from the dataset. */
    const blade = kavassOption('Studied Blade');
    expect(blade.cost.ducats).toBeGreaterThan(0);

    for (const name of ['Idris the Relic Hound', 'Nasir the Inaccurate', 'Rafiq the Incinerator']) {
      const held = unit(name).specialUpgrades ?? [];
      expect(held.map((u) => u.name), name).toEqual([blade.name]);
      expect(held[0].cost, name).toBe(blade.cost.ducats);
      expect(held[0].category, name).toBe(blade.groupPath ?? blade.group);
    }
    expect(report.unmatched.some((u) => /meleemight/.test(u))).toBe(false);
    expect(report.unmapped.some((u) => /meleemight/.test(u))).toBe(false);
  });

  it('charges the three Kavass for it, at the catalogue\'s price', () => {
    const blade = kavassOption('Studied Blade');
    const kavass = unit('Nasir the Inaccurate');
    const gear = [...kavass.equippedWeapons, ...kavass.equippedArmour, ...kavass.equippedEquipment]
      .reduce((sum, g) => sum + (g.cost ?? 0), 0);
    expect(kavass.totalCost)
      .toBe(kavass.profileSnapshot.baseCost + gear + blade.cost.ducats);
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

  it('carries the Arsenal across, and what a Location gave it', () => {
    /*
      Round 2, item 3. Their two lines, and then the Curative Fluids the
      Ransacked Alchemist Workshop's own text adds — *"Add Curative Fluids to
      your Warband’s Arsenal"* — which `explorationGrants` does not read (it
      answers Skills, loot and the Glory Item permissions and returns nothing
      at all for that Location), so the item this ruleset does carry was being
      dropped while the report claimed the text had been read.
    */
    expect(w.armoryStash.map((s) => s.name))
      .toEqual(['Siege Jezzail', 'Alchemical Ammunition', 'Curative Fluids']);

    const fluids = w.armoryStash.find((s) => s.name === 'Curative Fluids')!;
    /* Given, not bought: no cost, and the Location that gave it. */
    expect(fluids.cost).toBe(0);
    expect(fluids.price).toEqual({ ducats: 0, glory: 0 });
    expect(fluids.grantedBy).toBe('Ransacked Alchemist Workshop');
    expect(w.explorationDiscoveries).toContain(fluids.grantedBy);

    /* The item is this ruleset's, not a name this import invented, and the
       sentence that grants it is the Location's own. */
    const entry = (D.weapons ?? []).find((x) => nameKey(x.name) === nameKey('Curative Fluids'));
    expect(entry, 'this ruleset carries Curative Fluids').toBeDefined();
    const rows = Object.values(D.campaign?.exploration?.locations ?? {}).flat();
    const workshop = rows.find((x) => x.name === 'Ransacked Alchemist Workshop')!;
    expect(workshop.description).toMatch(/Add Curative Fluids to your Warband’s Arsenal/);
    /* And pack G's reader really does return nothing for it, which is why this
       is a second reader rather than a call to that one. */
    expect(explorationGrants(D, workshop, 5)).toEqual([]);
  });

  it('never says a text was read when the reader returned nothing', () => {
    /*
      Round 2, item 3. The `location_mods` note stated that "the Location's own
      standing effect is read from that text" whatever the reader had returned.
      It now names what was read — and for a Location whose text says nothing
      this app records, it says that instead.
    */
    const line = report.unmapped.find(
      (u) => u.startsWith("location_mods 'el_ransackedalchemistworkshop_mod'"))!;
    expect(line).toBeDefined();
    expect(line).toContain('What was read from that text: Curative Fluids in the Arsenal');
    expect(line).not.toMatch(/standing effect is read from that text/);
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

  it("prices the Golem the way the app's own Book of Golems path prices it", () => {
    /*
      Round 2, item 2, and the architect's ruling on the question round 1
      raised. The grant reads *"Add a Takwin Homunculus … to your Warband. It
      has the Human Hands Alchemical Formula, plus Alchemical Formulas worth a
      total of up to 50 👑 for free"* — three things free, and round 1 priced
      only the named Formula at nothing, leaving the Golem at 90 Ducats where
      the app's own path would have it at none.

      Every figure below is read from the dataset, the grant, or the app's own
      `formulaShelf`; none is typed.
    */
    const grant = golemGrant(D)!;
    const golem = unit('Al-Mudawwan, the Inscribed');
    const entry = catalogueUnitFor(D, { baseProfileId: golem.profileSnapshot.id },
      'iron-sultanate');

    /* The model: given, and recorded the way the app records a given model. */
    expect(golem.grantedFree).toBe(GOLEM_GRANTED_BY);
    expect(golem.profileSnapshot.baseCost).toBeGreaterThan(0);

    /* Each Formula at the price the app's own shelf would put on it. */
    const shelf = formulaShelf(D, {
      unit: golem,
      catalogueUnit: entry,
      alchemistAlive: null,
      isTakwin: true,
      strongbox: { ducats: 0, glory: 0 },
    });
    for (const held of golem.specialUpgrades ?? []) {
      const offer = shelf.offers.find((o) => o.option.name === held.name);
      expect(offer, held.name).toBeDefined();
      expect(held.cost, held.name).toBe(offer!.price.ducats);
    }

    /* And the allowance really is what covers them: the four beside the
       granted Formula sum to exactly what the grant states. */
    const listPrice = (name: string) =>
      (entry?.options ?? []).find((o) => o.name === name)!.cost.ducats;
    const beside = (golem.specialUpgrades ?? [])
      .filter((u) => nameKey(u.name) !== nameKey(grant.startsWith));
    expect(beside.reduce((sum, u) => sum + listPrice(u.name), 0))
      .toBe(grant.freeFormulaDucats);
    expect(golem.totalCost).toBe(0);

    /* Their record says the same, in its own structure: the model and those
       four carry a discount equal to their price. */
    const theirs = theirModels.find((l) => l.model.model === 'md_takwincreation_golem')!;
    expect(theirs.purchase!.discount).toBe(golem.profileSnapshot.baseCost);
    expect(report.warnings.some((x) => /Ducats off this model's price/.test(x))).toBe(false);
  });

  it('charges a Golem for the Formulae the allowance does not stretch to', () => {
    /* The other half of the grant's sentence: "up to 50 👑". A Formula beyond
       the allowance is priced from the entry, in their record's own order. */
    const grant = golemGrant(D)!;
    const golem = unit('Al-Mudawwan, the Inscribed');
    const entry = catalogueUnitFor(D, { baseProfileId: golem.profileSnapshot.id },
      'iron-sultanate');
    const extra = (entry?.options ?? []).find((o) => o.name === 'Massive Size')!;
    expect(extra.cost.ducats).toBeGreaterThan(0);

    const out = meddle((m) => {
      (m.list_upgrades as unknown[]).push({
        purchase: { cost_value: extra.cost.ducats, cost_type: 0, discount: 0 },
        upgrade: { object_id: 'up_alchemicalformulae_massive_size' },
      });
    }, 'md_takwincreation_golem');
    const richer = out.warband.units.find((u) => u.customName.trim() === 'Al-Mudawwan, the Inscribed')!;
    expect((richer.specialUpgrades ?? []).find((u) => u.name === extra.name)?.cost)
      .toBe(extra.cost.ducats);
    /* The allowance still covered the first 50, and nothing more. */
    expect(richer.totalCost).toBe(extra.cost.ducats);
    expect(grant.freeFormulaDucats).toBeGreaterThan(0);
  });

  it('reports a discount their record takes and this import does not', () => {
    /* The cross-check, on a record that disagrees with ours: strip their
       discount and the two no longer agree about what the model cost. */
    const out = meddle((m) => { void m; }, 'md_takwincreation_golem');
    expect(out.warnings.some((x) => /Ducats off this model's price/.test(x))).toBe(false);

    const copy = JSON.parse(JSON.stringify(envelope));
    const data = JSON.parse(copy.warband_data);
    data.models.find((m: { model: { model: string } }) =>
      m.model.model === 'md_takwincreation_golem').purchase.discount = 0;
    copy.warband_data = JSON.stringify(data);
    const stripped = importTrenchCompanionWarband(copy, D);
    expect(stripped.warnings.some((x) => x.startsWith('Al-Mudawwan, the Inscribed: ')
      && /Ducats off this model's price/.test(x))).toBe(true);
  });

  it("never claims another faction's row for a name two entries carry", () => {
    /*
      Round 2, item 1. The alias route shipped falling through on an AMBIGUOUS
      name as well as a missing one, and four names in this ruleset belong to
      two entries each while the Court of the Seven-Headed Serpent's Weapon
      Collections rows carry the same four as `Claimed: …` with the bare name
      as their alias. So a plain Iron Sultanate model holding an Anti-Tank
      Hammer — not stocked by that list, and correctly reported before this —
      resolved to another faction's row at no cost.
    */
    const four = ['Anti-Tank Hammer', 'Punt Gun', 'Warcross', 'Molotov Cocktail'];

    /* The collision is real, on both halves: two entries by name, and a third
       carrying the name as an alias. */
    for (const name of four) {
      expect((D.weapons ?? []).filter((w) => nameKey(w.name) === nameKey(name)).length, name)
        .toBeGreaterThan(1);
      expect((D.weapons ?? []).some((w) => (w.aliases ?? [])
        .some((a) => nameKey(a) === nameKey(name))), name).toBe(true);
    }

    const meddled = JSON.parse(JSON.stringify(envelope));
    const data = JSON.parse(meddled.warband_data);
    /* A plain Iron Sultanate Warband — no Variant — carrying the four. */
    data.faction.faction_property.object_id = 'fc_ironsultanate';
    data.models.find((m: { model: { model: string } }) => m.model.model === 'md_brazenbull')
      .model.equipment = four.map((name, i) => ({
        purchase: { cost_value: 0, cost_type: 0, faction_rel_id: `rel_fc_eq_${i}` },
        equipment: { id: `eq_${i}`, name },
      }));
    meddled.warband_data = JSON.stringify(data);
    const out = importTrenchCompanionWarband(meddled, D);

    const bull = out.warband.units.find((u) => u.customName.trim() === 'Al-Qahhar, the Crippled')!;
    expect([...bull.equippedWeapons, ...bull.equippedArmour, ...bull.equippedEquipment]
      .map((x) => x.name)).toEqual([]);
    for (const name of four) {
      expect(out.unmatched, name).toContain(`${name}, on Al-Qahhar, the Crippled`);
    }
  });

  it('reports the prices that differ, with ours read from the ruleset', () => {
    /*
      One line, where six of the seven it used to print were the double-charge
      above reported as a disagreement. The Brazen Bull is the real one: their
      record prices the model 100 and ours prices it from the catalogue.
    */
    expect(report.priceDifferences.map((d) => d.name))
      .toEqual(['Brazen Bull', 'Siege Jezzail', 'Alchemical Ammunition']);

    /*
      The two Arsenal lines are there because their record prices them at
      NOTHING: each carries a discount equal to its cost, which is the Sniper's
      Lair granting them ("Add the Battlekit listed below for your Faction to
      your Arsenal"). This ruleset prices what an item is worth, so the two
      records disagree about the Arsenal's value and the report says so per
      item rather than adopting either number.
    */
    const theirStash = (JSON.parse(envelope.warband_data) as {
      equipment: { purchase: { cost_value: number; discount: number } }[] }).equipment;
    for (const line of theirStash) {
      expect(line.purchase.discount).toBe(line.purchase.cost_value);
    }

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
        when the House of Wisdom is taken (`:5468-5470`, conditioned on the Variant
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
      "upgrade 'up_fierceandbrave', on Dhi’b al-Nafud",
      "upgrade 'up_skirmisher', on Sabir the Wind-Caller",
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
  const ENVELOPE: Record<string, string> = {
    warband_data: 'read: everything below',
    warband_id: 'read: reported back by the route; the roster carries none of their ids',
    id: 'theirs: their own row id',
    warband_user_id: 'theirs: whose account it is — deliberately not read',
    warband_campaigns: 'theirs: the campaigns their record links it to',
    warband_campaign_invites: 'theirs',
  };
  /** `{ object_id, selections, consumables, tags }` — their reference wrapper. */
  const REF: Record<string, string> = {
    object_id: 'read: the id that is resolved',
    selections: 'read: the choice recorded, named in the report',
    consumables: 'theirs: their per-object consumable counters',
    tags: "theirs: their own flags on the reference",
  };
  const SELECTION: Record<string, string> = {
    option_refID: 'read: which option the choice answers',
    selection_ID: 'read: what was chosen',
    suboption: 'read: reported with the choice it belongs to',
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
    /* The envelope around it, too: `warband_campaigns` holds a campaign id and
       was outside the walk entirely (round 2, item 4). */
    walk('envelope', envelope, ENVELOPE);
    walk('warband_data', their, WARBAND);
    walk('context', their.context, CONTEXT);
    walk('context.stored_ratings', (their.context as Record<string, never>).stored_ratings, RATINGS);
    walk('exploration', their.exploration, EXPLORATION);
    walk('faction', their.faction, FACTION);
    for (const line of (their.equipment ?? []) as Record<string, never>[]) {
      walk('equipment[]', line, LINE);
      walk('equipment[].purchase', line.purchase, PURCHASE);
    }

    /*
      And the objects inside the lists, which the walk used to stop short of.
      Every one of them is their reference wrapper, and a selection inside it is
      a choice this import reports by name.
    */
    const exploration = their.exploration as Record<string, never>;
    for (const [what, list] of [
      ['exploration.locations[]', exploration.locations],
      ['exploration.location_mods[]', exploration.location_mods],
      ['fireteams[]', their.fireteams],
    ] as [string, Record<string, never>[]][]) {
      for (const ref of list ?? []) {
        walk(what, ref, REF);
        for (const sel of (ref.selections ?? []) as Record<string, never>[]) {
          walk(`${what}.selections[]`, sel, SELECTION);
        }
      }
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
      for (const sub of (m.subproperties ?? []) as Record<string, never>[]) {
        walk('subproperties[]', sub, REF);
        for (const sel of (sub.selections ?? []) as Record<string, never>[]) {
          walk('subproperties[].selections[]', sel, SELECTION);
        }
      }
      for (const rel of (m.list_modelequipment ?? []) as Record<string, never>[]) {
        walk('list_modelequipment[]', rel, REF);
        for (const sel of (rel.selections ?? []) as Record<string, never>[]) {
          walk('list_modelequipment[].selections[]', sel, SELECTION);
        }
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

  it('names the choice an ability records, by what it chose', () => {
    /*
      Round 2, item 4. The line said the ids were "rather than anything the
      player chose", and two of them are exactly that: Mastery of the Elements
      picks an element, and `ab_chosenhomunculus` names which Homunculus is
      this Alchemist's — by the purchase id their record gives that model, so
      it resolves to a name on this roster. `golem.ts` searched the HOMUNCULI
      for that association and found none, which was correct: it is recorded on
      the Alchemist.
    */
    const kasim = 'Sipahsalar Kasim bin Malik, the Living Engineer';
    const lines = report.unmapped.filter((u) => u.startsWith(`subproperties on ${kasim}:`));
    expect(lines).toHaveLength(2);

    const element = lines.find((x) => x.includes('ab_masteryoftheelements'))!;
    expect(element).toContain("'kw_gas'");
    /* Resolved against this ruleset's own glossary, not spelled out here. */
    const gas = (D.keywords ?? []).find((k) => nameKey(k.name) === nameKey('gas'))!;
    expect(gas, 'this ruleset carries the GAS Keyword').toBeDefined();
    expect(element).toContain(`the ${gas.name} Keyword`);

    const homunculus = lines.find((x) => x.includes('ab_chosenhomunculus'))!;
    const theirs = theirModels.find((l) => (l.model.name ?? '').trim()
      === 'Al-Masyukh, Hunter of Hunters')!;
    expect(homunculus).toContain(theirs.model.id!);
    expect(homunculus).toContain('Al-Masyukh, Hunter of Hunters on this roster');

    /* The model whose choice is null says nothing at all. */
    expect(report.unmapped.some((u) => u.startsWith('subproperties on Zayd'))).toBe(false);
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
