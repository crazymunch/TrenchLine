import { describe, it, expect } from 'vitest';
import { parseCampaign } from '../campaignFromCloud';

/**
 * The cloud-to-local campaign mapper.
 *
 * A pure function, tested without a database or a browser, because the part
 * worth exhausting is the mapping and rule 2's application to it: a response
 * missing something structural must FAIL rather than become a campaign with
 * nobody in it, and the only fields that get a default are the ones the schema
 * itself makes optional.
 */

/** A campaign as `include: FULL` returns one. */
const payload = (over: Record<string, unknown> = {}) => ({
  id: '9f1c0f5e-0000-4000-8000-000000000001',
  name: 'The Long Retreat',
  inviteCode: 'TRENCH-ABCDEFGHJKMNPQR',
  adminId: 'user-organiser',
  admin: { name: 'Aurelia' },
  status: 'active',
  framework: 'carcass-front',
  currentTurn: 4,
  houseRules: { reinforcementsKeepExploration: true },
  version: 7,
  maxWarbandDucats: 900,
  gloryVictoryThreshold: 30,
  members: [
    {
      userId: 'user-organiser', playerName: 'Aurelia of the Wall',
      warbandId: 'wb-1', warbandName: 'The Iron Choir', factionId: 'new-antioch',
      glory: 12, rating: 850, wins: 3, losses: 1, draws: 0, treasury: 40,
    },
    {
      userId: 'user-bob', playerName: 'Bob',
      warbandId: 'wb-2', warbandName: 'The Bone Choir', factionId: 'heretic-legions',
      glory: 5, rating: 700, wins: 1, losses: 3, draws: 0, treasury: 0,
    },
  ],
  territories: [
    {
      id: 'srv-terr-1', localId: 'cf-the-bone-mill', name: 'The Bone Mill',
      type: 'Special Zone', version: 3, perk: 'Outpost Bonus: +1 Exploration die.',
      perkSource: 'published', description: 'A mill.',
      controlledByWarbandId: 'wb-2', controlledByPlayerName: 'Bob',
    },
    {
      id: 'srv-terr-2', localId: null, name: 'Contested Ridge',
      type: "No Man's Land", version: 1, perk: '', description: 'A ridge.',
    },
  ],
  matches: [
    {
      id: 'match-1', date: '2026-09-01', scenarioId: 'sc-1', scenarioName: 'The Push',
      participants: [{ warbandId: 'wb-1' }], narrativeLog: 'It rained.',
    },
  ],
  ...over,
});

describe('parseCampaign', () => {
  it('carries the campaign across', () => {
    const c = parseCampaign(payload());
    expect(c.name).toBe('The Long Retreat');
    expect(c.framework).toBe('carcass-front');
    expect(c.currentTurn).toBe(4);
    expect(c.maxWarbandDucats).toBe(900);
    expect(c.gloryVictoryThreshold).toBe(30);
    expect(c.houseRules).toEqual({ reinforcementsKeepExploration: true });
    expect(c.inviteCode).toBe('TRENCH-ABCDEFGHJKMNPQR');
  });

  it('makes the cloud id the local id as well', () => {
    // Minting a second would mean this copy and the organiser's disagree about
    // what to call one campaign, in every log and every outbox key.
    const c = parseCampaign(payload());
    expect(c.id).toBe(c.cloudId);
    expect(c.cloudId).toBe('9f1c0f5e-0000-4000-8000-000000000001');
  });

  it('keeps the version, so the first op states what it was made against', () => {
    expect(parseCampaign(payload()).version).toBe(7);
  });

  describe('members', () => {
    it('reads the table', () => {
      const c = parseCampaign(payload());
      expect(c.members).toHaveLength(2);
      expect(c.members[1]).toMatchObject({
        playerName: 'Bob', warbandName: 'The Bone Choir', glory: 5, wins: 1,
      });
    });

    it('derives isAdmin from the campaign, not from the row', () => {
      // CampaignMember has no admin column. A flag on the row would be a
      // client trusting a payload to say who runs the campaign.
      const c = parseCampaign(payload());
      expect(c.members.find((m) => m.userId === 'user-organiser')!.isAdmin).toBe(true);
      expect(c.members.find((m) => m.userId === 'user-bob')!.isAdmin).toBe(false);
    });
  });

  describe('the organiser’s name', () => {
    it('prefers the name they chose for this campaign', () => {
      expect(parseCampaign(payload()).adminName).toBe('Aurelia of the Wall');
    });

    it('falls back to the account name when they are not a member', () => {
      const c = parseCampaign(payload({
        members: [payload().members[1]],
      }));
      expect(c.adminName).toBe('Aurelia');
    });

    it('says Commander only when there is genuinely no name', () => {
      const c = parseCampaign(payload({ members: [], admin: { name: null } }));
      expect(c.adminName).toBe('Commander');
    });
  });

  describe('territories', () => {
    it('addresses one by the id the DEVICE knows it by', () => {
      // The store queues `entityId: territory.id`, and the sync route resolves
      // that by primary key or localId. Preferring localId keeps two devices
      // naming the same territory the same way.
      const c = parseCampaign(payload());
      expect(c.territories[0].id).toBe('cf-the-bone-mill');
    });

    it('uses the primary key where the server made the territory itself', () => {
      const c = parseCampaign(payload());
      expect(c.territories[1].id).toBe('srv-terr-2');
    });

    it('carries perkSource rather than re-deriving it', () => {
      // A copy that forgot which perks the book wrote would offer to edit one.
      const c = parseCampaign(payload());
      expect(c.territories[0].perkSource).toBe('published');
      expect(c.territories[1].perkSource).toBeUndefined();
    });

    it('carries who holds it', () => {
      const c = parseCampaign(payload());
      expect(c.territories[0].controlledByWarbandId).toBe('wb-2');
      expect(c.territories[0].controlledByPlayerName).toBe('Bob');
      expect(c.territories[1].controlledByWarbandId).toBeUndefined();
    });

    it('keeps each territory’s own version', () => {
      const c = parseCampaign(payload());
      expect(c.territories[0].version).toBe(3);
    });
  });

  it('stamps each match with the campaign it belongs to', () => {
    const c = parseCampaign(payload());
    expect(c.matches[0].campaignId).toBe(c.id);
    expect(c.matches[0].scenarioName).toBe('The Push');
  });

  it('starts the chronicle empty rather than filling it from a dead column', () => {
    // `chronicleLogs` is a JSON column no operation writes. Rendering it would
    // put a history on screen that does not match the matches beside it.
    expect(parseCampaign(payload()).chronicleLogs).toEqual([]);
  });

  describe('refuses a response it does not understand', () => {
    /*
      Rule 2. Each of these used to be the shape of a silent bug: a campaign
      that looked downloaded and had nobody in it, or no map.
    */
    const cases: [string, Record<string, unknown>][] = [
      ['no id', { id: undefined }],
      ['no name', { name: '' }],
      ['members that are not a list', { members: null }],
      ['territories that are not a list', { territories: undefined }],
      ['matches that are not a list', { matches: 'none' }],
      ['a member with no warband', { members: [{ userId: 'u', playerName: 'p' }] }],
    ];
    for (const [what, over] of cases) {
      it(what, () => {
        expect(() => parseCampaign(payload(over))).toThrow();
      });
    }

    it('and is not merely throwing on everything', () => {
      // The guard on the guards: a valid payload must still parse, or every
      // assertion above passes for the wrong reason.
      expect(() => parseCampaign(payload())).not.toThrow();
    });
  });

  describe('defaults only what the schema makes optional', () => {
    it('a campaign saved before frameworks existed', () => {
      expect(parseCampaign(payload({ framework: null })).framework).toBeUndefined();
    });

    it('a campaign that plays it straight', () => {
      expect(parseCampaign(payload({ houseRules: null })).houseRules).toBeUndefined();
    });

    it('a campaign with no invite code visible', () => {
      expect(parseCampaign(payload({ inviteCode: undefined })).inviteCode).toBe('');
    });
  });
});
