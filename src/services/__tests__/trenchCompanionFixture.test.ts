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
import { GOLEM_GRANTED_BY } from '@/rules/golem';
import { scarCount, unfitForDuty, traumaProcedure } from '@/rules/trauma';
import { importTrenchCompanionWarband } from '../trenchCompanionImporter';

const envelope = JSON.parse(fs.readFileSync(path.join(process.cwd(),
  'data-sources/fixtures/trench-companion/al-qarn-rihla-505410.json'), 'utf8'));

const report = importTrenchCompanionWarband(envelope, DATASET as unknown as Dataset);
const w = report.warband;
const unit = (name: string) => w.units.find((u) => u.customName.trim() === name)!;

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
    /* `es_reroll` against our `Re-roll`. */
    expect((w.explorationEffects ?? []).map((e) => e.name)).toEqual(['Re-roll']);
  });

  it('records the Locations, stripping the book suffix', () => {
    /* `el_ransackedalchemistworkshop_cf` is the Carcass Front printing of a
       Location our tables hold once. */
    expect(w.explorationDiscoveries)
      .toEqual(['Ransacked Alchemist Workshop', 'Book of Golems', 'Black Market']);
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

  it('reports the Variant\'s own rename as expressed by the Variant, not as missing', () => {
    /* `up_meleemight` is their name for the House of Wisdom's Azeb → Kavass
       rename, carried as an upgrade. Our Variant applies it to the entry. */
    expect(report.unmapped.some((u) => u.startsWith('up_meleemight'))).toBe(true);
    expect(report.unmatched.some((u) => /meleemight/.test(u))).toBe(false);
  });
});

describe('the equipment', () => {
  it('lands each model\'s kit, by our names', () => {
    const kit = (name: string) => {
      const u = unit(name);
      return [...u.equippedWeapons, ...u.equippedArmour, ...u.equippedEquipment]
        .map((x) => x.name);
    };
    expect(kit('Jawhar al-Sari'))
      .toEqual(['Jezzail', 'Reinforced Armour', 'Alchemical Ammunition', 'Combat Helmet']);
    expect(kit('Al-Qahhar, the Crippled'))
      .toEqual(['Titan Zulfiqar', 'Flame Cannon', 'Machine Armour']);
    expect(kit('The Iron Needle')).toEqual([
      'Siege Jezzail', 'Trench Club', 'Standard Armour', 'Shovel', 'Alchemical Ammunition',
    ]);
    expect(kit('Al-Masyukh, Hunter of Hunters'))
      .toEqual(['Siege Jezzail', 'Titan Zulfiqar', 'Great Sword/Axe', 'Trench Shield']);
  });

  it('carries the Arsenal across', () => {
    expect(w.armoryStash.map((s) => s.name)).toEqual(['Siege Jezzail', 'Alchemical Ammunition']);
  });

  it('prices a Glory-hire\'s kit from our shelf, and says their record priced it at nothing', () => {
    /* The Mamluk Faris is hired for Glory and their record prices its kit 0.
       Ours prices from the Armoury, and the difference is reported per item
       rather than silently adopted either way. */
    expect(report.priceDifferences.map((d) => d.name)).toEqual([
      'Jezzail', 'Alchemical Ammunition', 'Reinforced Armour', 'Combat Helmet',
      'Brazen Bull', 'Shovel', 'Human Hands',
    ]);
    expect(report.priceDifferences.find((d) => d.name === 'Brazen Bull'))
      .toEqual({ name: 'Brazen Bull', theirs: { ducats: 100, glory: 0 },
        ours: { ducats: 115, glory: 0 } });
  });
});

describe('what it could not resolve', () => {
  it('names exactly that, and nothing else', () => {
    /*
      Four of the five are real gaps rather than failures of the reading:

      - `Elixer of Al-Khidr` is their spelling of our `Elixir of Al-Khidr`.
        One letter, and their id misspells it a third way
        (`eq_exlixerofalkhidr`), so no rule of spelling reaches it.
      - `up_secrets_secretsoftakwin` is the House of Wisdom's
        *Secrets of Takwin* (20 Ducats). Our pipeline records a Variant's
        granted abilities as the Variant rule's PROSE, not as purchasable
        options, so there is no option entry for it to resolve to.
      - `up_fierceandbrave` and `up_skirmisher` appear nowhere in this
        ruleset under any name.
      - `el_snipersnest` is their `Sniper's Nest`; our Common Locations table
        prints `Sniper's Lair`.

      Reported, not guessed at. Each is a decision for the owner, and a
      silently adopted near-match would have made all five invisible.
    */
    expect(report.unmatched).toEqual([
      'Sipahsalar Kasim bin Malik, the Living Engineer: Elixer of Al-Khidr',
      "Sipahsalar Kasim bin Malik, the Living Engineer: upgrade 'up_secrets_secretsoftakwin'",
      "Dhi’b al-Nafud: upgrade 'up_fierceandbrave'",
      "Sabir the Wind-Caller: upgrade 'up_skirmisher'",
      "Exploration Location 'el_snipersnest'",
    ]);
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
