/**
 * Reading a Trench Companion warband.
 *
 * The envelope below is **built here, in their shape**, rather than committed
 * from somebody's share page: the public warband the design was measured on
 * belongs to a stranger and is not ours to commit, and the owner's own link
 * is a separate fixture. What this can still prove is everything about the
 * READING — which names resolve, which do not, what the ledger opens as, and
 * that their prices are reported rather than charged.
 *
 * Every name in it is a name our dataset carries or deliberately does not,
 * and every one of OUR numbers is read off the generated data rather than
 * typed (rule 1). The numbers that are typed are **theirs**, and they are
 * typed precisely because they differ from ours — that difference is the
 * thing under test.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import type { Dataset } from '@/types/catalogue';
import { recruitable } from '@/rules/recruitable';
import {
  importTrenchCompanionWarband, priceDifferenceLine,
} from '../trenchCompanionImporter';

const D = DATASET as unknown as Dataset;
const APP = (D.factions ?? []).map((f) => f.id ?? f.name);
const SHELF = recruitable(D, 'heretic-legions', APP, 'hereticnavalraiders');

/** What THIS ruleset says these cost. The roster is priced at these. */
const TROOPER = SHELF.units.find((u) => u.name === 'Heretic Trooper')!;
const MASK = SHELF.equipment.find((e) => e.name === 'Gas Mask')!;
const NADES = SHELF.weapons.find((w) => w.name === 'Incendiary Grenades')!;

/** Their prices, which are not ours. That is the point of them. */
const THEIR_TROOPER = TROOPER.baseCost + 5;
const THEIR_MASK = MASK.cost + 7;

const purchase = (cost: number) => ({ cost_value: cost, cost_type: 0 });

const envelope = (over: Record<string, unknown> = {}) => ({
  warband_id: 1,
  warband_data: JSON.stringify({
    name: 'The Drowned Choir',
    ducat_bank: 700,
    glory_bank: 0,
    debts: { ducats: 0, glory: 0 },
    tags: { tc_version: 'ver_default' },
    context: {
      campaign_round: 4,
      victory_points: 22,
      failed_promotions: 3,
      stored_ratings: {
        rating_ducat: 407, rating_glory: 0, spare_ducat: 293, spare_glory: 0,
      },
    },
    faction: {
      faction_property: { object_id: 'fc_hereticlegions_fv_hereticnavalraiders' },
    },
    exploration: { explorationskills: [{ object_id: 'es_reroll' }], locations: [] },
    models: [
      {
        purchase: purchase(THEIR_TROOPER),
        model: {
          name: 'Heretic Trooper',
          model: 'md_heretictrooper',
          elite: false,
          experience: 3,
          list_skills: [{ object_id: 'sk_standfirm' }],
          list_injury: [{ object_id: 'in_severenervedamage' }],
          list_upgrades: [],
          scar_reserves: 0,
          stat_selections: [],
          active: 'active',
          equipment: [
            {
              purchase: purchase(THEIR_MASK),
              equipment: { id: 'eq_gasmask', name: 'Gas Mask' },
            },
            {
              purchase: purchase(NADES.cost),
              equipment: { id: 'eq_incendiarygrenades', name: 'Incendiary Grenades' },
            },
          ],
        },
      },
      {
        /* A Preview entry this ruleset has never carried. */
        purchase: purchase(30),
        model: {
          name: 'Fly Bereaved',
          model: 'md_grailthrall_flybereaved',
          elite: false,
          experience: 0,
          equipment: [],
        },
      },
    ],
    equipment: [],
    fireteams: [],
    notes: [],
    modifiers: [],
    consumables: [],
    ...over,
  }),
});

const run = (over?: Record<string, unknown>) =>
  importTrenchCompanionWarband(envelope(over), D);

/* ------------------------------------------------------------- the shape */

describe('what the import reads', () => {
  const r = run();

  it('names the warband, the faction and the Variant', () => {
    expect(r.warband.name).toBe('The Drowned Choir');
    expect(r.warband.factionId).toBe('heretic-legions');
    expect(r.warband.variantId).toBe('hereticnavalraiders');
  });

  it('records the ruleset every name was resolved against', () => {
    expect(r.warband.rulesetId).toBe('trenchline');
  });

  it('imports the model it can resolve and leaves out the one it cannot', () => {
    expect(r.warband.units.map((u) => u.customName)).toEqual(['Heretic Trooper']);
  });

  it('names exactly what it left out, and never guesses at a near match', () => {
    /* `toEqual`, as the design's test asks: a list that merely CONTAINS the
       right name would pass while quietly dropping something else too. */
    expect(r.unmatched).toEqual(['Fly Bereaved (md_grailthrall_flybereaved)']);
  });

  it('prices the roster from OUR ruleset, not theirs', () => {
    expect(r.warband.units[0].totalCost).toBe(TROOPER.baseCost + MASK.cost + NADES.cost);
    expect(r.warband.units[0].profileSnapshot.baseCost).toBe(TROOPER.baseCost);
    expect(r.warband.units[0].equippedEquipment[0].cost).toBe(MASK.cost);
  });

  it('reports every price that differs, and only those', () => {
    expect(r.priceDifferences.map(priceDifferenceLine).sort()).toEqual([
      `Gas Mask: ${THEIR_MASK} Ducats in Trench Companion, ${MASK.cost} Ducats here.`,
      `Heretic Trooper: ${THEIR_TROOPER} Ducats in Trench Companion, `
        + `${TROOPER.baseCost} Ducats here.`,
    ].sort());
  });
});

/* ----------------------------------------------------------- the ledger */

describe('the ledger, opened as migrateFoundingPot opens one', () => {
  const r = run();
  const ledger = r.warband.ledger ?? [];

  it('credits the founding allowance and debits their rating, in that order', () => {
    expect(ledger.map((e) => [e.reason, e.ducats])).toEqual([
      ['founding', 700],
      ['quartermaster', -407],
    ]);
  });

  it('leaves their spare as the Strongbox', () => {
    expect(r.warband.treasuryDucats).toBe(293);
    expect(r.warband.gloryPoints).toBe(0);
  });

  it('debits THEIR rating, not our arithmetic over what resolved', () => {
    /* A model we could not resolve cost us nothing and is not on our roster,
       so summing our own prices would hand the player back what they spent
       on it. Their rating is what they actually spent. */
    const ourRoster = r.warband.units.reduce((s, u) => s + u.totalCost, 0);
    expect(ourRoster).not.toBe(407);
    expect(ledger[1].ducats).toBe(-407);
  });

  it('credits the Glory allowance from glory_bank, not from a field it just zeroed', () => {
    /* Money enters a warband through `book` and nowhere else, so the object
       carries 0 Glory at the moment the founding entry is written. The
       allowance has to come from their record. */
    const out = run({
      glory_bank: 11,
      context: {
        campaign_round: 1, victory_points: 0, failed_promotions: 0,
        stored_ratings: {
          rating_ducat: 407, rating_glory: 4, spare_ducat: 293, spare_glory: 7,
        },
      },
    });
    expect((out.warband.ledger ?? []).map((e) => [e.reason, e.ducats, e.glory])).toEqual([
      ['founding', 700, 11],
      ['quartermaster', -407, -4],
    ]);
    expect(out.warband.gloryPoints).toBe(7);
    expect(out.warnings.some((w) => /do not add up/.test(w))).toBe(false);
  });

  it('debits bank less spare, so a warband with a stash lands on their Strongbox', () => {
    /*
      `rating_*` is the ROSTER's value; `stash_rating_*` is the Arsenal's, and
      their record keeps them apart. Debiting `rating` alone left the
      Strongbox here 60 Ducats richer than the one on their page.
    */
    const out = run({
      context: {
        campaign_round: 1, victory_points: 0, failed_promotions: 0,
        stored_ratings: {
          rating_ducat: 407, rating_glory: 0,
          stash_rating_ducat: 60, stash_rating_glory: 0,
          spare_ducat: 233, spare_glory: 0,
        },
      },
    });
    expect((out.warband.ledger ?? []).map((e) => [e.reason, e.ducats])).toEqual([
      ['founding', 700],
      ['quartermaster', -467],
    ]);
    expect(out.warband.treasuryDucats).toBe(233);
    expect(out.warnings.some((w) => /do not add up/.test(w))).toBe(false);
  });

  it('names both of their figures in the quartermaster entry', () => {
    const out = run({
      context: {
        campaign_round: 1, victory_points: 0, failed_promotions: 0,
        stored_ratings: {
          rating_ducat: 407, rating_glory: 0,
          stash_rating_ducat: 60, stash_rating_glory: 0,
          spare_ducat: 233, spare_glory: 0,
        },
      },
    });
    const note = (out.warband.ledger ?? [])[1].note ?? '';
    expect(note).toContain('407 Ducats');
    expect(note).toContain('60 Ducats');
  });

  it('lands on their Strongbox even when their own totals disagree, and says so', () => {
    const out = run({
      context: {
        campaign_round: 1, victory_points: 0, failed_promotions: 0,
        stored_ratings: {
          rating_ducat: 407, rating_glory: 0,
          stash_rating_ducat: 0, stash_rating_glory: 0,
          spare_ducat: 100, spare_glory: 0,
        },
      },
    });
    /* Their page says the Strongbox holds 100, and that is what it holds
       here — whatever their roster and stash figures add up to. */
    expect(out.warband.treasuryDucats).toBe(100);
    expect(out.warnings.some((w) => /do not add up/.test(w))).toBe(true);
  });
});

/* --------------------------------------------------------- campaign state */

describe('the campaign state', () => {
  const r = run();
  const unit = () => r.warband.units[0];

  it('lands Experience and the ELITE flag on the model', () => {
    expect(unit().xp).toBe(3);
    expect(unit().isElite).toBe(false);
  });

  it('resolves a Skill by name against the Advancement tables', () => {
    expect(unit().skills).toEqual([expect.objectContaining({
      name: 'Stand Firm', category: 'melee',
    })]);
  });

  it('counts that Skill as no Advancement Roll, because their share has no roll', () => {
    /*
      Order 44 item 4a. Round 2 changed this importer from `advancementRolls =
      skills.length` to a count of the Skills whose records state a 2D6 total, and
      nothing pinned it — their export carries no field for a Skill's roll at all,
      so the two rules differ on every model this importer builds, and reverting
      the change left every test green.

      One Skill, nought rolls. Not one, which is what the length would give.
    */
    expect(unit().skills).toHaveLength(1);
    expect(unit().advancementRolls ?? 0).toBe(0);
    expect(unit().advancementRolls ?? 0).not.toBe(unit().skills!.length);
  });

  it('and says which Skills it did not count, rather than leaving it to be inferred', () => {
    /* A model carrying a Skill against no roll taken looks identical whether the
       reading is right or the parse failed. So the import says which. */
    const said = r.warnings.join(' | ');
    expect(said).toMatch(/no roll/i);
    expect(said).toContain('Stand Firm');
  });

  it('resolves an injury by name against the Trauma Table', () => {
    expect(unit().injuries).toEqual(['Severe Nerve Damage']);
  });

  it('seeds the Promotion miss counter from failed_promotions', () => {
    expect(r.warband.promotionMisses).toBe(3);
  });

  it('records their round and Campaign Victory Points as theirs', () => {
    expect(r.warband.importedCampaign)
      .toEqual({ source: 'trench-companion', round: 4, victoryPoints: 22 });
  });

  it('records no round their record did not state', () => {
    /* A missing `campaign_round` used to be written down as round 1 — a fact
       about their campaign their record never asserted. */
    const out = run({
      context: { stored_ratings: { rating_ducat: 407, spare_ducat: 293 } },
    });
    expect(out.warband.importedCampaign).toBeUndefined();
  });

  it('records the half of it they did state', () => {
    const out = run({
      context: { victory_points: 9, stored_ratings: { rating_ducat: 407, spare_ducat: 293 } },
    });
    expect(out.warband.importedCampaign)
      .toEqual({ source: 'trench-companion', victoryPoints: 9 });
  });

  it('resolves an Exploration Skill by name', () => {
    expect(r.warband.explorationEffects)
      .toEqual([expect.objectContaining({ name: 'Re-roll' })]);
  });
});

/* -------------------------------------------------------- what it reports */

describe('the report', () => {
  it('warns when the warband is on their Preview rules', () => {
    const r = run({ tags: { tc_version: 'ver_preview' } });
    expect(r.warnings.some((w) => /Preview/.test(w))).toBe(true);
  });

  it('says nothing about the rules when they are the Official ones', () => {
    expect(run().warnings.some((w) => /Preview/.test(w))).toBe(false);
  });

  it('warns about a debt, which this app has no home for', () => {
    const r = run({ debts: { ducats: 25, glory: 0 } });
    expect(r.warnings.some((w) => /debt of 25 Ducats/.test(w))).toBe(true);
  });

  it('lists the three per-model fields it does not map, every time', () => {
    const r = run();
    for (const field of ['scar_reserves', 'stat_selections', 'active']) {
      expect(r.unmapped.some((u) => u.startsWith(`${field}:`))).toBe(true);
    }
  });

  it('does not read a price they did not state as free', () => {
    /* A missing `cost_value` read as 0 produced a "free in Trench Companion"
       line — a claim about their record that their record never made. */
    const out = run({
      models: [{
        purchase: {},
        model: {
          name: 'Heretic Trooper', model: 'md_heretictrooper', equipment: [],
        },
      }],
    });
    expect(out.priceDifferences).toEqual([]);
    expect(out.warnings.some((w) => /does not state a price/.test(w))).toBe(true);
    /* And it is still priced here, from our ruleset. */
    expect(out.warband.units[0].totalCost).toBe(TROOPER.baseCost);
  });

  it('reports an unresolvable Skill rather than dropping it', () => {
    const r = run({
      models: [{
        purchase: purchase(TROOPER.baseCost),
        model: {
          name: 'Heretic Trooper', model: 'md_heretictrooper',
          list_skills: [{ object_id: 'sk_nosuchskill' }], equipment: [],
        },
      }],
    });
    expect(r.unmatched).toContain("Heretic Trooper: Skill 'sk_nosuchskill'");
    expect(r.warband.units[0].skills).toBeUndefined();
  });

  it('reports an item it cannot resolve rather than inventing a price', () => {
    const r = run({
      models: [{
        purchase: purchase(TROOPER.baseCost),
        model: {
          name: 'Heretic Trooper', model: 'md_heretictrooper',
          equipment: [{
            purchase: purchase(9),
            equipment: { id: 'eq_nosuchthing', name: 'Tide-Caller Horn' },
          }],
        },
      }],
    });
    expect(r.unmatched).toContain('Heretic Trooper: Tide-Caller Horn');
    expect(r.warband.units[0].equippedWeapons).toEqual([]);
    expect(r.warband.units[0].equippedEquipment).toEqual([]);
    expect(r.warband.units[0].totalCost).toBe(TROOPER.baseCost);
  });
});

/* ------------------------------------------------------- failing loudly */

describe('an envelope that is not one', () => {
  it('refuses a response with no warband_data', () => {
    expect(() => importTrenchCompanionWarband({ warband_id: 1 }, D))
      .toThrow(/no warband_data/);
  });

  it('refuses warband_data that is not JSON', () => {
    expect(() => importTrenchCompanionWarband({ warband_data: '<html>' }, D))
      .toThrow(/not JSON/);
  });

  it('refuses a warband that names no faction', () => {
    expect(() => importTrenchCompanionWarband(
      { warband_data: JSON.stringify({ name: 'x', models: [] }) }, D))
      .toThrow(/names no faction/);
  });

  it('refuses a faction this ruleset does not carry, and lists the ones it does', () => {
    expect(() => run({ faction: { faction_property: { object_id: 'fc_hanseaticleague' } } }))
      .toThrow(/not a faction this ruleset carries/);
  });
});
