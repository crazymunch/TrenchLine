/**
 * The roster file, and the dump it replaces.
 *
 * `docs/EXPORT-ARCHITECTURE-BRIEF.md` §3.1 and `docs/EXPORT-CODEX-REVIEW.md`
 * E2/E9/E10. The app's export has been `JSON.stringify(warband)` — the internal
 * type, unversioned — since long before either document. Those files are in
 * users' hands, so this format has to read them as well as write its own.
 *
 * The invariant these tests exist for is Codex's:
 *
 *   decode(encode(durable(w))) == durable(w)
 *
 * NOT equality to the whole runtime `Warband`. A file deliberately drops battle
 * state and this device's bookkeeping, and the round trip is over what it
 * keeps.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  ROSTER_FILE_FORMAT, ROSTER_SCHEMA_VERSION, UNIT_FIELDS, WARBAND_FIELDS,
  decodeRosterFile, durableWarband, encodeRosterFile, warbandFromFile,
} from '../rosterFile';
import { DATASET } from '@/data/generated/trenchline.generated';
import type { ActiveUnit, Warband } from '@/types/warband';

/** The roster as a decoded file carries it — every field optional but `name`. */
type DecodedRoster = Partial<Warband> & { name: string; units: Partial<ActiveUnit>[] };

const unit = (over: Partial<ActiveUnit> = {}): ActiveUnit => ({
  id: 'u1',
  customName: 'Brother Anselm',
  baseProfileId: 'p1',
  profileSnapshot: { name: 'Trench Pilgrim', category: 'Elite' },
  equippedWeapons: [{ instanceId: 'w1', id: 'flail', name: 'Flail', cost: 10 }],
  equippedArmour: [],
  equippedEquipment: [],
  xp: 4,
  isElite: true,
  advancements: ['+1 Melee'],
  skills: [{ name: 'Duellist', category: 'Melee' }],
  injuries: ['D66: 33 - Lost an Eye'],
  scars: [{ name: 'Prominent Scar', roll: '66' }],
  isDead: false,
  totalCost: 55,
  lore: 'Walked from Antioch.',
  titles: ['the Scarred'],
  titleRecords: [{ title: 'the Scarred', source: 'injury', active: true }],
  deeds: ['Held the bridge'],
  quote: 'Deus vult.',
  notes: 'private',
  /* Battle state, which a file must never carry. */
  currentWounds: 0,
  maxWounds: 2,
  bloodMarkers: 3,
  blessingMarkers: 1,
  status: 'Out of Action',
  hasActedThisTurn: true,
  ...over,
} as unknown as ActiveUnit);

const warband = (over: Partial<Warband> = {}): Warband => ({
  id: 'wb-1',
  name: 'The Tested',
  factionId: 'new-antioch',
  variantId: 'papalstatesinterventionforce',
  allowThirdParty: true,
  ducatLimit: 1000,
  treasuryDucats: 420,
  gloryPoints: 3,
  units: [unit()],
  armoryStash: [{ id: 's1', name: 'Gas Mask', type: 'Equipment', cost: 5, quantity: 1 }],
  lore: 'A company of penitents.',
  motto: 'Per aspera',
  patron: 'Saint Methodius',
  chronicleLog: ['Won at the bridgehead'],
  notes: 'organiser notes',
  ledger: [{ kind: 'loot', ducats: 100 }],
  explorationDiscoveries: ['Warband Strongbox'],
  earnedRecruitment: [],
  forceMode: 'campaign',
  creatorName: 'A Player',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-01T00:00:00Z',
  /* Never in a file. */
  editedAt: '2026-02-01T00:00:01Z',
  campaignId: 'camp-local-1',
  creatorId: 'user-abc',
  snapshots: [{
    id: 'snap1', timestamp: '2026-01-15T00:00:00Z', label: 'Post-Battle',
    units: [unit()], treasuryDucats: 320, changesSummary: ['x'],
  }],
  ...over,
} as unknown as Warband);

const VERSION = '1.0.0-test';
const encode = (w = warband()) =>
  encodeRosterFile(w, DATASET, { exporterVersion: VERSION, now: () => new Date('2026-09-06T12:00:00Z') });

describe('the field inventory', () => {
  it('classifies every field of both types', () => {
    /*
      The map is `Record<keyof Warband, …>`, so this is really a compile-time
      guarantee — a new field on either type is a type error until someone
      decides what a file does with it. Asserted anyway, because the guarantee
      is the point of the file and a future `as never` would quietly remove it.
    */
    expect(Object.keys(WARBAND_FIELDS).length).toBeGreaterThan(20);
    expect(Object.keys(UNIT_FIELDS).length).toBeGreaterThan(25);
    for (const d of Object.values({ ...WARBAND_FIELDS, ...UNIT_FIELDS })) {
      expect(['durable', 'identity', 'live', 'local']).toContain(d);
    }
  });

  it('keeps persistent death, which reads like battle state and is not', () => {
    // A model removed by the Trauma Step is gone. A restore that brought it
    // back would be inventing a model.
    expect(UNIT_FIELDS.isDead).toBe('durable');
    expect(UNIT_FIELDS.status).toBe('live');
  });
});

describe('what an exported file contains', () => {
  it('says what it is and what wrote it', () => {
    const f = encode();
    expect(f.format).toBe(ROSTER_FILE_FORMAT);
    expect(f.schemaVersion).toBe(ROSTER_SCHEMA_VERSION);
    expect(f.exporterVersion).toBe(VERSION);
    expect(f.exportedAt).toBe('2026-09-06T12:00:00.000Z');
  });

  it('records the layer stack, not just the commit', () => {
    /*
      The same base commit with a different layer stack is a different ruleset,
      and this app ships two. `rulesetId` + `baseCommit` alone cannot tell them
      apart (E2).
    */
    const { rules } = encode();
    expect(rules!.rulesetId).toBe(DATASET.meta.rulesetId);
    expect(rules!.baseCommit).toBe(DATASET.meta.baseCommit);
    expect(rules!.layers).toEqual(DATASET.meta.layers);
    expect(rules!.baseFiles.length).toBeGreaterThan(5);
    expect(encode().provenance).toBe('known');
  });

  it('says it does not know rather than inventing a manifest', () => {
    // Rule 2. An export made before the dataset loaded records no ruleset.
    const f = encodeRosterFile(warband(), null, { exporterVersion: VERSION });
    expect(f.rules).toBeNull();
    expect(f.provenance).toBe('unknown');
  });

  it('carries the campaign’s durable results', () => {
    const { roster } = encode();
    const u = roster.units[0];
    expect(u.xp).toBe(4);
    expect(u.injuries).toEqual(['D66: 33 - Lost an Eye']);
    expect(u.scars).toHaveLength(1);
    expect(u.advancements).toEqual(['+1 Melee']);
    expect(roster.ledger).toHaveLength(1);
    expect(roster.snapshots).toHaveLength(1);
    expect(roster.treasuryDucats).toBe(420);
  });

  it('carries no battle state, in the roster or in its history', () => {
    /*
      `currentWounds`, markers, `status` and `hasActedThisTurn` live on roster
      units today — a known defect — so a dump ships mid-battle wounds inside a
      roster file. The snapshots carry whole model copies and are projected the
      same way, which a first pass here did not do.
    */
    const { roster } = encode();
    for (const u of [...roster.units, ...roster.snapshots![0].units]) {
      expect(u).not.toHaveProperty('currentWounds');
      expect(u).not.toHaveProperty('bloodMarkers');
      expect(u).not.toHaveProperty('blessingMarkers');
      expect(u).not.toHaveProperty('status');
      expect(u).not.toHaveProperty('hasActedThisTurn');
    }
  });

  it('carries no account or campaign identifier, and no sync bookkeeping', () => {
    // A file's ids grant nothing (E2), so a file is not where they belong.
    const { roster } = encode();
    expect(roster).not.toHaveProperty('creatorId');
    expect(roster).not.toHaveProperty('campaignId');
    expect(roster).not.toHaveProperty('editedAt');
    expect(roster.creatorName).toBe('A Player');
  });
});

describe('the round trip', () => {
  it('decode(encode(durable(w))) equals durable(w)', () => {
    const w = warband();
    const decoded = decodeRosterFile(JSON.stringify(encode(w)));
    expect(decoded.ok).toBe(true);
    expect((decoded as { file: { roster: unknown } }).file.roster)
      .toEqual(durableWarband(w));
  });

  it('survives a roster with nothing optional set', () => {
    const bare = {
      id: 'w', name: 'Bare', factionId: 'new-antioch',
      ducatLimit: 500, treasuryDucats: 0, gloryPoints: 0,
      units: [], armoryStash: [],
      createdAt: 'a', updatedAt: 'b',
    } as unknown as Warband;
    const decoded = decodeRosterFile(JSON.stringify(encode(bare)));
    expect((decoded as { file: { roster: unknown } }).file.roster)
      .toEqual(durableWarband(bare));
  });

  it('survives names and lore that are not ASCII', () => {
    const w = warband({ name: 'Yüzbaşı’s Own — Kaşık', motto: '⚔️ Deus vult' });
    const decoded = decodeRosterFile(JSON.stringify(encode(w)));
    expect((decoded as { file: { roster: { name: string } } }).file.roster.name)
      .toBe('Yüzbaşı’s Own — Kaşık');
  });
});

describe('reading a v0 file — the dump already in users’ hands', () => {
  const v0 = () => JSON.stringify(warband());

  it('reads it, and says out loud that it records no ruleset', () => {
    const r = decodeRosterFile(v0());
    expect(r.ok).toBe(true);
    const { file, warnings } = r as { file: { provenance: string }; warnings: string[] };
    expect(file.provenance).toBe('unknown');
    expect(warnings.join(' ')).toContain('older TrenchLine');
  });

  it('does not stamp today’s ruleset onto it', () => {
    /*
      The one thing that must not happen. A v0 file cannot say what it was built
      under, and filling that in from the dataset loaded right now is a claim
      the file then carries forever (E2).
    */
    expect((decodeRosterFile(v0()) as { file: { rules: unknown } }).file.rules).toBeNull();
  });

  it('drops the battle state a dump carries', () => {
    const r = decodeRosterFile(v0()) as { file: { roster: { units: object[] } } };
    expect(r.file.roster.units[0]).not.toHaveProperty('bloodMarkers');
    expect(r.file.roster.units[0]).not.toHaveProperty('status');
  });

  it('keeps the campaign results, which is the point of reading it at all', () => {
    const r = decodeRosterFile(v0()) as { file: { roster: { units: { xp: number }[] } } };
    expect(r.file.roster.units[0].xp).toBe(4);
  });
});

describe('a file this build should not open', () => {
  it('refuses a newer schema version instead of loading part of it', () => {
    const f = { ...encode(), schemaVersion: ROSTER_SCHEMA_VERSION + 1 };
    const r = decodeRosterFile(JSON.stringify(f));
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toContain('Update TrenchLine');
  });

  it('refuses something that is not a roster at all', () => {
    expect(decodeRosterFile('{"format":"battlescribe.roster"}').ok).toBe(false);
    expect(decodeRosterFile('not json').ok).toBe(false);
    expect(decodeRosterFile('[1,2,3]').ok).toBe(false);
    expect(decodeRosterFile('{"name":"x"}').ok).toBe(false);
  });

  it('refuses an envelope with no version', () => {
    const r = decodeRosterFile(JSON.stringify({ ...encode(), schemaVersion: 'one' }));
    expect(r.ok).toBe(false);
  });
});

describe('a file that is hostile rather than merely wrong', () => {
  it('does not let a file write through a prototype', () => {
    const nasty = `{"name":"x","units":[],"__proto__":{"polluted":true}}`;
    const r = decodeRosterFile(nasty);
    expect(r.ok).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('refuses a roster claiming more models than a roster can have', () => {
    const many = JSON.stringify({ name: 'x', units: Array.from({ length: 5000 }, () => ({})) });
    expect(decodeRosterFile(many).ok).toBe(false);
  });

  it('refuses text too long to be roster prose', () => {
    const huge = JSON.stringify({ name: 'x', units: [], lore: 'a'.repeat(300_000) });
    expect(decodeRosterFile(huge).ok).toBe(false);
  });

  it('refuses a structure nested past any real roster', () => {
    let deep: unknown = 'x';
    for (let i = 0; i < 60; i++) deep = { deep };
    expect(decodeRosterFile(JSON.stringify({ name: 'x', units: [], lore: deep })).ok).toBe(false);
  });
});

describe('fields this build does not know', () => {
  it('drops them, and says how many rather than silently', () => {
    const f = encode();
    const withExtra = { ...f, roster: { ...f.roster, futureField: 'x', another: 1 } };
    const r = decodeRosterFile(JSON.stringify(withExtra)) as { warnings: string[] };
    expect(r.warnings.join(' ')).toContain('futureField');
    expect(r.warnings.join(' ')).toContain('another');
  });
});

describe('turning a file back into a roster', () => {
  const opened = () => (decodeRosterFile(JSON.stringify(encode())) as
    { file: Parameters<typeof warbandFromFile>[0] }).file;

  it('mints new ids when importing as a new roster', () => {
    /*
      A file opened twice must give two warbands, not one overwriting the
      other. Ids in a file are a reference, never authority (E2).
    */
    const a = warbandFromFile(opened(), 'clone');
    const b = warbandFromFile(opened(), 'clone');
    expect(a.id).not.toBe('wb-1');
    expect(a.id).not.toBe(b.id);
    expect(a.units[0].id).not.toBe(b.units[0].id);
  });

  it('keeps them when restoring a backup, which is what makes it a restore', () => {
    const w = warbandFromFile(opened(), 'restore');
    expect(w.id).toBe('wb-1');
    expect(w.units[0].id).toBe('u1');
  });

  it('stands the models up ready, rather than mid-battle', () => {
    const w = warbandFromFile(opened());
    const u = w.units[0];
    expect(u.currentWounds).toBe(u.maxWounds);
    expect(u.bloodMarkers).toBe(0);
    expect(u.blessingMarkers).toBe(0);
    expect(u.hasActedThisTurn).toBe(false);
    expect(u.status).toBe('Active');
  });

  it('leaves a dead model dead', () => {
    // Persistent death is not battle state — see the inventory. A restore that
    // brought this model back would be inventing one.
    const f = encodeRosterFile(warband({ units: [unit({ isDead: true })] }), DATASET,
      { exporterVersion: VERSION });
    const w = warbandFromFile(f, 'restore');
    expect(w.units[0].isDead).toBe(true);
    expect(w.units[0].status).toBe('Out of Action');
  });

  it('keeps everything the campaign earned', () => {
    const w = warbandFromFile(opened());
    expect(w.units[0].xp).toBe(4);
    expect(w.units[0].injuries).toEqual(['D66: 33 - Lost an Eye']);
    expect(w.treasuryDucats).toBe(420);
    expect(w.snapshots).toHaveLength(1);
  });
});

describe('the v0 fixture, as the old exporter actually wrote one', () => {
  /*
    A committed file rather than one built in this test. The reader's job is to
    keep opening what is already on people's disks, and a fixture the test
    constructs proves only that the test agrees with itself.
  */
  const raw = fs.readFileSync(
    path.join(process.cwd(), 'data-sources/fixtures/trenchline-roster/v0-ninefold-penance.json'),
    'utf8');

  it('has none of the envelope, which is why the envelope exists', () => {
    const parsed = JSON.parse(raw);
    expect(parsed.format).toBeUndefined();
    expect(parsed.schemaVersion).toBeUndefined();
    expect(parsed.rules).toBeUndefined();
  });

  it('opens, with its campaign intact', () => {
    const r = decodeRosterFile(raw);
    expect(r.ok).toBe(true);
    const { file } = r as { file: { roster: DecodedRoster } };
    expect(file.roster.name).toBe('The Ninefold Penance');
    expect(file.roster.units).toHaveLength(3);
    expect(file.roster.units[0].xp).toBe(5);
    expect(file.roster.units[0].injuries![0]).toContain('Lost an Eye');
    expect(file.roster.treasuryDucats).toBe(85);
  });

  it('keeps the model the campaign killed', () => {
    const { file } = decodeRosterFile(raw) as { file: { roster: DecodedRoster } };
    expect(file.roster.units[2].isDead).toBe(true);
  });

  it('leaves the mid-battle state behind', () => {
    // The fixture has a model Downed with two Blood Markers, from a game that
    // ended before the file was written.
    const { file } = decodeRosterFile(raw) as { file: { roster: DecodedRoster } };
    for (const u of file.roster.units) {
      expect(u).not.toHaveProperty('bloodMarkers');
      expect(u).not.toHaveProperty('status');
      expect(u).not.toHaveProperty('hasActedThisTurn');
    }
  });

  it('leaves the exporter’s account and campaign ids behind', () => {
    const { file } = decodeRosterFile(raw) as { file: { roster: DecodedRoster } };
    expect(file.roster).not.toHaveProperty('creatorId');
    expect(file.roster).not.toHaveProperty('campaignId');
    expect(file.roster).not.toHaveProperty('editedAt');
  });

  it('says it cannot tell which rules it was built under', () => {
    const r = decodeRosterFile(raw) as { file: { rules: unknown }; warnings: string[] };
    expect(r.file.rules).toBeNull();
    expect(r.warnings.join(' ')).toContain('cannot say which rules');
  });
});
