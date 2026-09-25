/**
 * The Warband Roster Sheet against the printed sheet (FD-12 item 3).
 *
 * FD-12's own test list: *"the table's twelve rows equal `campaign.thresholds`;
 * the circles equal `advancementAt`; a warband with three recorded matches fills
 * three rows and leaves nine blank with the total right; a pre-app skill renders
 * with its marker and counts toward the next Advancement Roll; a LIMITED
 * POTENTIAL model greys boxes past its cap."* The circles and the cap are in
 * `experienceTrack.test.ts`; the rest are here.
 *
 * The twelve rows are checked twice on purpose — against the dataset, which is
 * the operative source, and against the numbers the official sheet actually
 * prints, read out of
 * `data-sources/rulebook/extracted/warband-roster-sheet.txt`. A sheet built from
 * the picture would pass the second check and mean nothing; a sheet built from
 * the dataset that did not match the paper would mean the dataset was wrong.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { DATASET } from '@/data/generated/trenchline.generated';
import { rosterSheet } from '../rosterSheet';
import { advancementRollsDue } from '../advancement';
import { variantsForFaction } from '../variants';
import type { ActiveUnit, Warband, WarbandSnapshot } from '@/types/warband';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* ----------------------------------------------------- the printed sheet --- */

const EXTRACT = fs.readFileSync(
  path.join(process.cwd(), 'data-sources/rulebook/extracted/warband-roster-sheet.txt'),
  'utf8',
);

/**
 * The GAME / THRESHOLD / FIELD STRENGTH rows as the paper prints them.
 *
 * Parsed out of the extract rather than retyped here, so this test reads the
 * committed source the same way the pipeline does.
 */
const PRINTED_ROWS = EXTRACT.split('\n')
  .map((l) => /^\s*(\d+)\s+(\d+)\s+(\d+)\s*$/.exec(l.replace(/\t/g, ' ')))
  .filter(Boolean)
  .map((m) => ({ game: Number(m![1]), threshold: Number(m![2]), fieldStrength: Number(m![3]) }));

/* ------------------------------------------------------------- fixtures --- */

const unit = (over: Partial<ActiveUnit> = {}): ActiveUnit => ({
  id: 'u1',
  customName: 'Kasim ibn Rashid',
  baseProfileId: DATASET.units.find((u) => u.name === 'Azeb')?.id ?? 'p1',
  profileSnapshot: {
    name: 'Azeb',
    category: 'Trooper',
    stats: {
      movement: '6"/Infantry', ranged: '+1', melee: '+0', armour: '0',
      baseSize: '30mm', keywords: ['SULTANATE'],
    },
    innateAbilities: [],
  } as never,
  equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
  xp: 0, advancements: [], injuries: [], isDead: false, totalCost: 25,
  currentWounds: 1, maxWounds: 1, bloodMarkers: 0,
  status: 'Active', hasActedThisTurn: false,
  ...over,
});

const post = (game: number, scenarioName: string, outcome: 'Victory' | 'Defeat' | 'Draw') => ({
  id: `snap-${game}`,
  timestamp: '2026-09-01T00:00:00Z',
  label: `Post-Battle: ${scenarioName} (${outcome})`,
  type: 'post_battle' as const,
  campaignGame: game,
  scenarioName,
  outcome,
  ducatCost: 0, treasuryDucats: 0, gloryPoints: 0, unitCount: 1,
  units: [], armoryStash: [], changesSummary: [],
}) as WarbandSnapshot;

const warband = (over: Partial<Warband> = {}): Warband => ({
  id: 'wb1',
  name: 'Al-Qarn Rihla',
  factionId: 'iron-sultanate',
  creatorName: 'Nick',
  forceMode: 'campaign',
  ducatLimit: 700,
  treasuryDucats: 0,
  gloryPoints: 0,
  units: [unit()],
  armoryStash: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...over,
});

/* ---------------------------------------------------------------- tests --- */

describe('FD-12: the campaign table is the dataset’s Threshold table', () => {
  it('the extract yields twelve printed rows, or the parse above is wrong', () => {
    expect(PRINTED_ROWS).toHaveLength(12);
    expect(PRINTED_ROWS[0]).toEqual({ game: 1, threshold: 700, fieldStrength: 10 });
    /* Game 12's Field Strength jumps to 22, which is the row that makes this
       table worth reading off the page rather than extrapolating. */
    expect(PRINTED_ROWS[11]).toEqual({ game: 12, threshold: 1800, fieldStrength: 22 });
  });

  it('twelve rows, equal to campaign.thresholds', () => {
    const sheet = rosterSheet(warband(), { dataset: DATASET });
    expect(sheet.campaign.rows).toHaveLength(DATASET.campaign.thresholds!.length);
    expect(sheet.campaign.rows.map((r) => ({
      game: r.game, threshold: r.threshold, fieldStrength: r.fieldStrength,
    }))).toEqual(DATASET.campaign.thresholds!.map((t) => ({
      game: t.game, threshold: t.threshold, fieldStrength: t.fieldStrength,
    })));
  });

  it('and the dataset equals what the official sheet prints', () => {
    const sheet = rosterSheet(warband(), { dataset: DATASET });
    expect(sheet.campaign.rows.map((r) => ({
      game: r.game, threshold: r.threshold, fieldStrength: r.fieldStrength,
    }))).toEqual(PRINTED_ROWS);
  });

  it('a Variant’s Threshold delta reaches the sheet through forceLimits', () => {
    /* Papal States: "In a campaign, their Threshold Value is reduced by 200 👑."
       Resolved in one place, so the sheet gets it without knowing the rule. */
    const shifted = DATASET.variants.find((v) => (v.thresholdDelta ?? 0) !== 0);
    expect(shifted, 'no Variant in this ruleset shifts the Threshold').toBeTruthy();
    const sheet = rosterSheet(
      warband({ factionId: shifted!.factionId, variantId: shifted!.id }),
      { dataset: DATASET },
    );
    expect(sheet.campaign.rows[0].threshold)
      .toBe(Math.max(0, DATASET.campaign.thresholds![0].threshold + shifted!.thresholdDelta!));
  });
});

describe('FD-12: three recorded matches fill three rows and leave nine blank', () => {
  const played = warband({
    snapshots: [
      post(1, 'No Man’s Land', 'Victory'),
      post(2, 'The Reliquary', 'Defeat'),
      post(3, 'Trench Raid', 'Draw'),
    ],
  });

  it('fills exactly the games played, in order', () => {
    const { campaign } = rosterSheet(played, { dataset: DATASET });
    expect(campaign.rows.filter((r) => r.scenarioName).map((r) => [r.game, r.scenarioName]))
      .toEqual([[1, 'No Man’s Land'], [2, 'The Reliquary'], [3, 'Trench Raid']]);
    expect(campaign.rows.filter((r) => !r.scenarioName)).toHaveLength(9);
  });

  it('records W, L and D', () => {
    const { campaign } = rosterSheet(played, { dataset: DATASET });
    expect(campaign.rows.slice(0, 3).map((r) => r.result)).toEqual(['W', 'L', 'D']);
    expect(campaign.rows[3].result).toBeUndefined();
  });

  it('totals the Campaign Victory Points from the published scale', () => {
    const scale = DATASET.campaign.victoryPoints!;
    const { campaign } = rosterSheet(played, { dataset: DATASET });
    expect(campaign.rows.slice(0, 3).map((r) => r.vps))
      .toEqual([scale.win, scale.loss, scale.draw]);
    expect(campaign.total).toBe(scale.win + scale.loss + scale.draw);
    /* An unplayed game scores nothing, and nothing is not zero on the sheet. */
    expect(campaign.rows[3].vps).toBeNull();
  });

  it('says the per-game total is not the whole score', () => {
    const { campaign } = rosterSheet(played, { dataset: DATASET });
    /*
      Two Exploration results move Campaign Victory Points outside the scale and
      neither is derivable from a win/loss/draw record. The sheet says so rather
      than presenting a final score it cannot compute.
    */
    expect(campaign.adjustmentsPending).toBe(true);
    expect(rosterSheet(warband(), { dataset: DATASET }).campaign.adjustmentsPending)
      .toBe(false);
  });

  it('a snapshot with no campaignGame is placed on no row at all', () => {
    /* Read strictly: a snapshot written before the field existed is not evidence
       for any game, and putting it on a row would print a scenario against a
       Threshold it was never played under. */
    const vague = { ...post(1, 'Unknown', 'Victory') };
    delete (vague as { campaignGame?: number }).campaignGame;
    const { campaign } = rosterSheet(warband({ snapshots: [vague] }), { dataset: DATASET });
    expect(campaign.rows.every((r) => !r.scenarioName)).toBe(true);
    expect(campaign.total).toBe(0);
  });

  it('a game past the published table gets a row, flagged rather than extrapolated', () => {
    const { campaign } = rosterSheet(
      warband({ snapshots: [post(13, 'The Long Season', 'Victory')] }),
      { dataset: DATASET },
    );
    const row = campaign.rows.find((r) => r.game === 13)!;
    expect(row.scenarioName).toBe('The Long Season');
    expect(row.extrapolated).toBe(true);
    const last = DATASET.campaign.thresholds![DATASET.campaign.thresholds!.length - 1];
    expect(row.threshold).toBe(last.threshold);
  });
});

describe('FD-12: the header is the sheet’s own blanks', () => {
  it('fills each one from the roster and the campaign', () => {
    /* Through `variantsForFaction`, because the catalogues and the app spell a
       faction differently and that resolution is its own function. */
    const variant = variantsForFaction(DATASET, 'iron-sultanate')[0];
    const { header } = rosterSheet(
      warband({ variantId: variant.id, patron: 'Sublime Gate', campaignId: 'camp1' }),
      /* The owner's own sheet: PLAYER is their account name, and only here.
         The public reading of this same header is asserted below. */
      {
        dataset: DATASET, audience: 'owner',
        campaign: { id: 'camp1', name: 'The Carcass Front' },
      },
    );
    expect(header).toEqual({
      warbandName: 'Al-Qarn Rihla',
      player: 'Nick',
      warband: variant.name,
      patron: 'Sublime Gate',
      campaignBattle: 'The Carcass Front',
      faction: 'Iron Sultanate',
    });
  });

  it('leaves CAMPAIGN BATTLE blank for a campaign that is not this Warband’s', () => {
    const { header } = rosterSheet(
      warband({ campaignId: 'camp1' }),
      { dataset: DATASET, campaign: { id: 'camp2', name: 'Somebody else’s crusade' } },
    );
    expect(header.campaignBattle).toBe('');
  });

  it('and blank for no campaign at all, rather than naming one', () => {
    expect(rosterSheet(warband(), { dataset: DATASET }).header.campaignBattle).toBe('');
  });
});

describe('FD-12: STRONGBOX is a TOTAL and an UNSPENT, from the ledger', () => {
  const led = warband({
    ledger: [
      { id: 'l1', at: '2026-01-01', reason: 'founding', ducats: 700, glory: 0 },
      { id: 'l2', at: '2026-01-02', reason: 'quartermaster', ducats: -620, glory: 0 },
      { id: 'l3', at: '2026-02-01', reason: 'exploration', ducats: 40, glory: 6 },
      { id: 'l4', at: '2026-02-02', reason: 'quartermaster', ducats: 0, glory: -2 },
    ],
  });

  it('TOTAL is everything ever credited; UNSPENT is the balance', () => {
    const { strongbox } = rosterSheet(led, { dataset: DATASET });
    expect(strongbox.ducatsTotal).toBe(740);
    expect(strongbox.ducatsUnspent).toBe(120);
    expect(strongbox.gloryTotal).toBe(6);
    expect(strongbox.gloryUnspent).toBe(4);
    expect(strongbox.fromLedger).toBe(true);
  });

  it('a Warband with no ledger has no TOTAL at all, not a balance wearing its name', () => {
    /*
      Round 2 item 9, and it is the model that is asserted rather than the flag.
      Round 1 put the BALANCE in `ducatsTotal` and set `fromLedger: false` beside
      it, so anything that read the number without reading the flag printed a
      TOTAL the app never computed — and 80 looks exactly like a real total,
      which is what makes it worth removing rather than documenting.
    */
    const { strongbox } = rosterSheet(
      warband({ treasuryDucats: 80, gloryPoints: 3 }), { dataset: DATASET });
    expect(strongbox.fromLedger).toBe(false);
    expect(strongbox.ducatsTotal).toBeUndefined();
    expect(strongbox.gloryTotal).toBeUndefined();
    /* The balance is known, and is still reported. */
    expect(strongbox.ducatsUnspent).toBe(80);
    expect(strongbox.gloryUnspent).toBe(3);
    /* And the key is absent, not present-and-undefined: a reader spreading this
       into another object must not acquire a `ducatsTotal`. */
    expect(Object.keys(strongbox)).not.toContain('ducatsTotal');
    expect(Object.keys(strongbox)).not.toContain('gloryTotal');
  });
});

describe('FD-12: the unit cards', () => {
  it('carry the five characteristics the sheet prints, Base included', () => {
    const { cards } = rosterSheet(warband(), { dataset: DATASET });
    expect(cards[0].model.stats).toEqual({
      movement: '6"/Infantry', ranged: '+1', melee: '+0', armour: '0', base: '30mm',
    });
  });

  it('carry a track, Battlekit and keywords', () => {
    const armed = warband({
      units: [unit({
        equippedWeapons: [{ instanceId: 'w1', name: 'Machine Gun' } as never],
        equippedArmour: [{ instanceId: 'a1', name: 'Heavy Armour' } as never],
        xp: 6,
      })],
    });
    const { cards } = rosterSheet(armed, { dataset: DATASET });
    expect(cards[0].battlekit).toEqual(['Machine Gun', 'Heavy Armour']);
    expect(cards[0].keywords).toEqual(['SULTANATE']);
    expect(cards[0].track!.boxes.filter((b) => b.filled)).toHaveLength(6);
  });

  it('a pre-app Skill renders with its marker', () => {
    const marked = warband({
      units: [unit({
        skills: [{
          name: 'Ranged Proficiency', category: 'Ranged Skills',
          source: { kind: 'manual-pre-app', note: 'earned in game 2, before the app' },
        }],
      })],
    });
    /* The note is the player's own words, so it reaches their own sheet and not
       a share (round 2 item 4). The marker is derived and reaches both. */
    const { cards, holdings } = rosterSheet(marked, { dataset: DATASET, audience: 'owner' });
    const line = cards[0].abilitiesSkillsInjuries.find((a) => a.name === 'Ranged Proficiency')!;
    expect(line.provenance).toContain('Recorded before the app');
    expect(line.provenance).toContain('earned in game 2, before the app');

    const shared = rosterSheet(marked, { dataset: DATASET, audience: 'public' });
    const sharedLine = shared.cards[0].abilitiesSkillsInjuries
      .find((a) => a.name === 'Ranged Proficiency')!;
    expect(sharedLine.provenance).toContain('Recorded before the app');
    expect(sharedLine.provenance).not.toContain('earned in game 2, before the app');
    /* And it appears in the Warband-wide review, which is the other half of what
       the owner asked for beside the sheet. */
    expect(holdings.some((h) => h.name === 'Ranged Proficiency')).toBe(true);
  });

  it('a pre-app Skill counts towards the next Advancement Roll exactly as a rolled one', () => {
    /*
      The marking is for the reader, not for the arithmetic. `advancementRollsDue`
      counts the Experience track against rolls TAKEN, so a hand-entered Skill
      neither grants nor cancels a roll — which is the owner's ruling, and the
      reason nothing in `provenance.ts` filters by kind.
    */
    const at = DATASET.campaign.experience!.advancementAt[1];
    const rolled = unit({ xp: at, advancementRolls: 1, skills: [{ name: 'A', category: 'x', source: { kind: 'advancement', game: 2, roll: '7' } }] });
    const byHand = unit({ xp: at, advancementRolls: 1, skills: [{ name: 'A', category: 'x', source: { kind: 'manual-pre-app' } }] });
    expect(advancementRollsDue(DATASET, byHand)).toBe(advancementRollsDue(DATASET, rolled));
  });
});

describe('FD-12: ARSENAL, BIO and the fallen', () => {
  it('lists the stash with what each item cost, in its own currency', () => {
    const stocked = warband({
      armoryStash: [
        { id: 's1', name: 'Anti-Tank Hammer', type: 'Weapon', cost: 35, quantity: 1 },
        { id: 's2', name: 'Relic', type: 'Equipment', cost: 4, currency: 'glory', quantity: 2 },
      ],
    });
    const { arsenal } = rosterSheet(stocked, { dataset: DATASET });
    expect(arsenal).toEqual([
      { name: 'Anti-Tank Hammer', quantity: 1, ducats: 35, glory: 0 },
      { name: 'Relic', quantity: 2, ducats: 0, glory: 4 },
    ]);
  });

  it('BIO is the Warband’s lore and HERALDRY its motto', () => {
    const told = warband({ lore: 'Out of the sand.', motto: 'The sand remembers.' });
    const sheet = rosterSheet(told, { dataset: DATASET, audience: 'owner' });
    expect(sheet.bio).toBe('Out of the sand.');
    expect(sheet.heraldry).toBe('The sand remembers.');

    /*
      And on a share, the motto stays and the bio goes (round 2 item 4). The
      motto is HERALDRY — the thing a player puts on the outside of the roster —
      while `lore` is what `presentRoster` has always read as private.
    */
    const shared = rosterSheet(told, { dataset: DATASET, audience: 'public' });
    expect(shared.heraldry).toBe('The sand remembers.');
    expect(shared.bio).toBe('');
  });

  it('names the fallen, which the printed sheet has no room for', () => {
    const bereaved = warband({
      fallen: [unit({ id: 'u9', customName: 'Zayd' })],
    });
    expect(rosterSheet(bereaved, { dataset: DATASET }).fallen)
      .toEqual([{ name: 'Zayd', profileName: 'Azeb', retired: false }]);
  });

  it('says a model sent home apart from one that was killed', () => {
    /*
      #114's Quartermaster Step retires a model by setting `retired` on the way
      to `fallen`, and `removeFromRoster` writes `isDead` for both — so the flag
      is the only thing that tells them apart. A Warband that lost six models
      and retired two has lost six, and a list that merges them says eight.
    */
    const both = warband({
      fallen: [
        unit({ id: 'u9', customName: 'Zayd' }),
        unit({
          id: 'u10', customName: 'Hafsa', retired: true, retiredAtGame: 4,
        }),
      ],
    });
    expect(rosterSheet(both, { dataset: DATASET }).fallen).toEqual([
      { name: 'Zayd', profileName: 'Azeb', retired: false },
      { name: 'Hafsa', profileName: 'Azeb', retired: true, retiredAtGame: 4 },
    ]);
  });

  it('a retirement with no game recorded claims no game', () => {
    const quiet = warband({
      fallen: [unit({ id: 'u11', customName: 'Nadir', retired: true })],
    });
    const [only] = rosterSheet(quiet, { dataset: DATASET }).fallen;
    expect(only.retired).toBe(true);
    expect(only).not.toHaveProperty('retiredAtGame');
  });
});

describe('a sheet rendered with no ruleset says nothing it cannot know', () => {
  it('has no Threshold rows and no track, rather than invented ones', () => {
    const sheet = rosterSheet(warband(), { dataset: null });
    expect(sheet.campaign.rows).toEqual([]);
    expect(sheet.campaign.total).toBeNull();
    expect(sheet.cards[0].track).toBeNull();
    /* The roster's own facts still render: the name is the name. */
    expect(sheet.header.warbandName).toBe('Al-Qarn Rihla');
  });
});

describe('review round 1, finding A: nothing private reaches the projection', () => {
  /*
    SH-1's share page projects the sheet on the SERVER and hands the client the
    `RosterSheetModel` and nothing else — because a `'use client'` component's
    props are SERIALISED INTO THE HTML, and the first version passed the whole
    warband. View-source on a shared roster carried the owner's private notes,
    every model's notes, quote and lore, the `chronicleLog`, the `snapshots`
    whose labels name opponents, the `ledger` including the `byUserId` and
    `byName` of admin entries — another user's data — plus `campaignMembers`
    and `creatorId`.

    So this asserts the boundary rather than trusting it: the projection is
    stringified, exactly as the framework will stringify it, and searched for
    every one of those secrets. "We checked once" is not a property a page
    keeps.
  */
  const SECRETS = {
    warbandNotes: 'PRIVATE-WARBAND-NOTE',
    modelNotes: 'PRIVATE-MODEL-NOTE',
    modelQuote: 'PRIVATE-MODEL-QUOTE',
    modelLore: 'PRIVATE-MODEL-LORE',
    chronicle: 'PRIVATE-CHRONICLE-LINE',
    snapshotLabel: 'PRIVATE-OPPONENT-NAME',
    ledgerByName: 'PRIVATE-ADMIN-NAME',
    ledgerByUserId: 'PRIVATE-ADMIN-USER-ID',
    creatorId: 'PRIVATE-CREATOR-ID',
    campaignMember: 'PRIVATE-CAMPAIGN-MEMBER',
    /*
      Round 2 item 4. Four things round 1 left on the public page, each of which
      the projection carried deliberately — which is why the earlier test passed:
      it searched for the fields nothing printed, and these were printed.

      `creatorName` is the sharpest of them. It is an ACCOUNT name, and
      `register/route.ts` sets it to the local part of the address for an account
      registered by email with no name given — so PLAYER on a shared roster was
      the owner's email, less the domain.
    */
    creatorName: 'PRIVATE-ACCOUNT-NAME',
    warbandLore: 'PRIVATE-WARBAND-LORE',
    provenanceNote: 'PRIVATE-PROVENANCE-NOTE',
    legacyAdvancement: 'PRIVATE-LEGACY-ADVANCEMENT',
  };

  const loaded = {
    ...warband({
      notes: SECRETS.warbandNotes,
      chronicleLog: [SECRETS.chronicle],
      creatorId: SECRETS.creatorId,
      creatorName: SECRETS.creatorName,
      lore: SECRETS.warbandLore,
      units: [unit({
        notes: SECRETS.modelNotes,
        quote: SECRETS.modelQuote,
        lore: SECRETS.modelLore,
        advancements: [SECRETS.legacyAdvancement],
        skills: [{
          name: 'Point Blank', category: 'Ranged Skills', roll: '9',
          source: { kind: 'manual', roll: '9', note: SECRETS.provenanceNote },
        }],
      })],
      ledger: [
        { id: 'l1', at: '2026-01-01', reason: 'founding', ducats: 700, glory: 0 },
        {
          id: 'l2', at: '2026-02-01', reason: 'admin-grant', ducats: 50, glory: 0,
          byName: SECRETS.ledgerByName, byUserId: SECRETS.ledgerByUserId,
        },
      ],
      snapshots: [{
        ...post(1, 'No Man’s Land', 'Victory'),
        label: `Post-Battle vs ${SECRETS.snapshotLabel}`,
      }],
    }),
    /* Server-owned fields the loader returns alongside the roster. */
    campaignMembers: [{ warbandName: SECRETS.campaignMember }],
  } as unknown as Warband;

  it('the fixture really carries every secret, or the next test proves nothing', () => {
    /*
      The guard that makes this suite honest. A `unit()` or `warband()` helper
      that quietly dropped one of these fields would leave the leak test passing
      on a roster that never held the secret in the first place.
    */
    const input = JSON.stringify(loaded);
    for (const [what, secret] of Object.entries(SECRETS)) {
      expect(input.includes(secret), `the fixture does not carry ${what}`).toBe(true);
    }
  });

  it('carries none of them, in the shape the framework serialises', () => {
    const sheet = rosterSheet(loaded, { dataset: DATASET, audience: 'public' });
    const wire = JSON.stringify(sheet);

    for (const [what, secret] of Object.entries(SECRETS)) {
      expect(wire.includes(secret), `the projection leaks ${what}`).toBe(false);
    }
  });

  it('and carries none of them when the audience is not named at all', () => {
    /*
      The point of the parameter over stripping (round 2 item 4): the DEFAULT is
      public. A caller that forgets — a new route, a test, a script — gets the
      safe model, so the next field somebody adds is private until this function
      is asked for it.
    */
    const wire = JSON.stringify(rosterSheet(loaded, { dataset: DATASET }));
    for (const [what, secret] of Object.entries(SECRETS)) {
      expect(wire.includes(secret), `the default audience leaks ${what}`).toBe(false);
    }
  });

  it('the public sheet leaves PLAYER and the bio blank, as the paper sheet is', () => {
    const sheet = rosterSheet(loaded, { dataset: DATASET, audience: 'public' });
    expect(sheet.header.player).toBe('');
    expect(sheet.bio).toBe('');
    /* And no free text on the card, of any of the three kinds. */
    const details = JSON.stringify(sheet.cards[0].abilitiesSkillsInjuries);
    expect(details).not.toContain(SECRETS.legacyAdvancement);
    expect(details).not.toContain(SECRETS.provenanceNote);
  });

  it('and still carries the sheet, so this is not passing by rendering nothing', () => {
    const sheet = rosterSheet(loaded, { dataset: DATASET, audience: 'public' });
    expect(sheet.header.warbandName).toBe('Al-Qarn Rihla');
    expect(sheet.cards).toHaveLength(1);
    expect(sheet.campaign.rows).toHaveLength(12);
    /* The scenario is printed on the sheet; the snapshot's LABEL is not. */
    expect(sheet.campaign.rows[0].scenarioName).toBe('No Man’s Land');
    expect(sheet.holdings.some((h) => h.name === 'Point Blank')).toBe(true);
    /* The Strongbox is summed from the ledger even though no entry reaches the
       wire: a total is not the entry that produced it. */
    expect(sheet.strongbox.ducatsTotal).toBe(750);
  });

  it('the owner’s own sheet keeps what is theirs, and still no server fields', () => {
    /*
      The other half: `'owner'` is not a bypass. The account name, the bio, the
      provenance note and the legacy progression string are the player's own and
      come back — while the fields that are nobody's to read on any sheet, the
      chronicle, another admin's id, the campaign roll, stay out of both models.
    */
    const sheet = rosterSheet(loaded, { dataset: DATASET, audience: 'owner' });
    const wire = JSON.stringify(sheet);

    expect(sheet.header.player).toBe(SECRETS.creatorName);
    expect(sheet.bio).toBe(SECRETS.warbandLore);
    const details = JSON.stringify(sheet.cards[0].abilitiesSkillsInjuries);
    expect(details).toContain(SECRETS.legacyAdvancement);
    expect(details).toContain(SECRETS.provenanceNote);

    for (const secret of [SECRETS.warbandNotes, SECRETS.chronicle, SECRETS.creatorId,
      SECRETS.ledgerByName, SECRETS.ledgerByUserId, SECRETS.campaignMember,
      SECRETS.snapshotLabel, SECRETS.modelNotes, SECRETS.modelQuote,
      SECRETS.modelLore]) {
      expect(wire.includes(secret)).toBe(false);
    }
  });
});

describe('review round 1, finding O: the Locations are read, not typed', () => {
  it('names the Exploration rows whose own text moves Campaign Victory Points', () => {
    /*
      The sheet used to type "16 Treasure of the Holies scores D3, and 23
      Patron's Visit" into a UI string — two rows of game data retyped into a
      paragraph (rule 1). They are found now by reading which Locations' printed
      description names Campaign Victory Points at all.

      The expectation is derived the same way, from the dataset, so this test
      cannot be the place the numbers are hard-coded either; then it checks the
      list is neither empty nor everything.
    */
    const { outsideTheScale } = rosterSheet(warband(), { dataset: DATASET }).campaign;
    const locations = Object.values(
      DATASET.campaign.exploration!.locations as Record<string, { name: string; description: string }[]>,
    ).flat();
    const expected = [...new Set(locations
      .filter((l) => /campaign victory point/i.test(l.description))
      .map((l) => l.name))];

    expect(outsideTheScale.length).toBe(expected.length);
    for (const name of expected) {
      expect(outsideTheScale.some((s) => s.includes(name)), name).toBe(true);
    }
    expect(outsideTheScale.length).toBeGreaterThan(0);
    expect(outsideTheScale.length).toBeLessThan(locations.length);
  });

  it('a ruleset with no Exploration tables names nothing rather than guessing', () => {
    expect(rosterSheet(warband(), { dataset: null }).campaign.outsideTheScale).toEqual([]);
  });
});

describe('review round 1, finding P: TOTAL is blank without a ledger', () => {
  it('reports the balance as UNSPENT and no TOTAL at all', () => {
    const { strongbox } = rosterSheet(
      warband({ treasuryDucats: 80, gloryPoints: 3 }), { dataset: DATASET });
    /*
      The projection still carries the numbers; `fromLedger` is the flag the
      view reads to leave the TOTAL column blank. Printing the balance under a
      heading that says TOTAL states something nobody computed — and the note
      beside it then contradicts it.
    */
    expect(strongbox.fromLedger).toBe(false);
    expect(strongbox.ducatsUnspent).toBe(80);
    expect(strongbox.gloryUnspent).toBe(3);
  });
});

describe('round 2 item 4: the default cuts both ways, so the owner’s surfaces say so', () => {
  /*
    `provenanceLabel` defaults to the public reading, which is the right default —
    forgetting it on a new share surface shows too little. The cost is that
    forgetting it on an OWNER's surface hides the player's own note from them, and
    the note exists for no other reason. Introducing that default introduced that
    bug in five places at once.

    So the owner-facing components are asserted to ask for the owner's reading.
    Source-level, because these are React components and this suite has no DOM —
    the same technique the wizard's call site is held to.
  */
  const OWNER_SURFACES = [
    'src/components/builder/UnitAdvancementModal.tsx',
    'src/components/builder/PreAppRewardModal.tsx',
    'src/components/sheet/WarbandRosterSheet.tsx',
  ];

  it('every provenanceLabel call on an owner’s screen asks for the owner’s reading', () => {
    for (const file of OWNER_SURFACES) {
      const src = readFileSync(join(process.cwd(), file), 'utf8');
      const calls = [...src.matchAll(/provenanceLabel\(([^;]*?)\)\}/g)].map((m) => m[0]);
      expect(calls.length, `${file} no longer labels any provenance`)
        .toBeGreaterThan(0);
      for (const call of calls) {
        expect(call, `${file} labels a provenance without naming the audience`)
          .toContain("audience: 'owner'");
      }
    }
  });

  it('and the share page asks for the public one', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/w/[token]/page.tsx'), 'utf8');
    expect(src).toMatch(/audience:\s*'public'/);
    expect(src).not.toMatch(/audience:\s*'owner'/);
  });

  it('the owner’s sheet route asks for the owner', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/app/(app)/roster/[id]/sheet/page.tsx'), 'utf8');
    expect(src).toMatch(/audience="owner"/);
  });
});
