/**
 * The roster-path layer, checked against the artefact that ships and the
 * roster NewRecruit actually exported.
 *
 * `scripts/__tests__/newrecruitPaths.test.mjs` pins the WALK. This pins what
 * the walk was emitted as: the layer in `src/data/generated/` is what an
 * exporter reads, and a layer that is correct in the generator and wrong on
 * disk helps nobody.
 *
 * The fixture is a real Iron Sultanate warband — thirteen models, ninety-five
 * selections — exported from NewRecruit by a person playing a campaign.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

import { DATASET } from '@/data/generated/trenchline.generated';
import LAYER from '@/data/generated/trenchline.rosterpaths.json';
import {
  decodePath, unitPaths, variantPath, itemPaths, modelIdentity, exportGaps,
  resolveSelection,
  type RosterPathLayer, type Selection,
} from '../rosterPaths';

const layer = LAYER as unknown as RosterPathLayer;
const FIXTURE = 'data-sources/fixtures/al-qarn-rihla/04-august-1320d-CURRENT.json';

/** The shape a NewRecruit JSON export uses for one selection. */
interface RosterSelection {
  name: string;
  type?: string;
  entryId?: string;
  selections?: RosterSelection[];
}

const fixtureSelections = (): RosterSelection[] => {
  const roster = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')).roster;
  const out: RosterSelection[] = [];
  const walk = (xs?: RosterSelection[]) => { for (const s of xs ?? []) { out.push(s); walk(s.selections); } };
  for (const f of roster.forces ?? []) walk(f.selections);
  return out;
};

describe('what the layer says it is', () => {
  it('quotes the one game system a roster file has to name', () => {
    expect(layer.system.id).toBe('sys-4f3d-c5c9-7df1-ad01');
    expect(layer.system.name).toBe('Trench Crusade');
    expect(layer.system.battleScribeVersion).toBe('2.03');
  });

  it('is pinned to the catalogue commit the dataset was built from', () => {
    // Without this the layer could drift a whole revision from the dataset and
    // nothing would say so until a player's export came back wrong.
    const banner = fs.readFileSync('src/data/generated/trenchline.generated.ts', 'utf8')
      .split('\n').slice(0, 8).join('\n');
    expect(banner).toContain(layer.base);
  });

  it('has an identity for every unit the dataset can recruit from a catalogue', () => {
    const mapped = new Set(layer.units.map((u) => u.entryId));
    const missing = DATASET.units
      .filter((u) => u.entryId && !u.entryId.startsWith('cf-') && !mapped.has(u.entryId))
      .map((u) => `${u.name} [${u.factionId}]`);
    expect(missing).toEqual([]);
  });

  it('names what it has no identity for instead of dropping it', () => {
    /*
      The two Carcass Front factions and their four Warband Variants. The
      supplement is transcribed from the PDF by a layer that mints its own ids,
      because no community catalogue carries it — so these are not exportable,
      and the layer says so rather than shipping a shorter list.
    */
    expect(layer.unmapped.length).toBeGreaterThan(0);
    for (const u of layer.unmapped) {
      expect(u.entryId).toMatch(/^cf-/);
      expect(u.why).toMatch(/minted by a supplement layer/);
      expect(['unit', 'variant']).toContain(u.kind);
    }
    expect(layer.unmapped.filter((u) => u.kind === 'variant').length).toBe(4);
  });
});

describe('against the roster NewRecruit exported', () => {
  const sels = fixtureSelections();
  const byPath = new Map<string, { name: string; carries: Record<string, Selection[]> }>();
  for (const u of layer.units) {
    for (const p of u.placements) byPath.set(decodePath(layer, p.path), { name: u.name, carries: p.carries });
  }
  for (const c of layer.containers) byPath.set(decodePath(layer, c.path), { name: c.name, carries: c.carries });

  it('has a roster to check against at all', () => {
    expect(sels.length).toBeGreaterThan(50);
  });

  it('gives every model, unit and container in it the identity the file records', () => {
    const holders = sels.filter((s) => byPath.has(s.entryId ?? '') || s.type === 'model' || s.type === 'unit');
    const unresolved = holders.filter((s) => !byPath.has(s.entryId ?? ''))
      .map((s) => `${s.type} ${s.name} ${s.entryId}`);
    expect(unresolved).toEqual([]);
    expect(holders.length).toBeGreaterThanOrEqual(15);
  });

  it('never gives an item a path the file disagrees with', () => {
    /*
      The assertion that matters. A wrong path is worse than a missing one: a
      missing path is a reported gap, and a wrong one is a roster that opens
      and is quietly not the warband.
    */
    const wrong: string[] = [];
    let checked = 0;
    const walk = (xs: RosterSelection[] | undefined, holder?: { name: string; carries: Record<string, Selection[]> }) => {
      for (const s of xs ?? []) {
        const found = byPath.get(s.entryId ?? '');
        if (found) { walk(s.selections, found); continue; }
        if (holder) {
          const paths = (holder.carries[s.name] ?? []).map((sel) => decodePath(layer, sel.path));
          if (paths.length) {
            checked += 1;
            if (!paths.includes(s.entryId ?? '')) {
              wrong.push(`${holder.name} / ${s.name}: file says ${s.entryId}, layer offers ${paths.join(' | ')}`);
            }
          }
        }
        walk(s.selections, holder);
      }
    };
    const roster = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')).roster;
    for (const f of roster.forces ?? []) walk(f.selections);
    expect(wrong).toEqual([]);
    expect(checked).toBeGreaterThanOrEqual(60);
  });

  it('reaches the option a link element writes, at the prefix the link was reached at', () => {
    // `Assigned Sword` is declared inside the link to the Mamluk Faris model,
    // so the link's own id is absent from its path. It is the case the first
    // pass of the spike could not reach at all.
    const faris = layer.units.find((u) => u.name === 'Mamluk Faris')!;
    const paths = faris.placements.flatMap((p) => itemPaths(layer, p, 'Assigned Sword'));
    expect(paths).toContain('80f0-b0dc-e20d-7ce0');
  });

  it('nests the Mamluk Faris model inside the unit entry the roster wraps it in', () => {
    const faris = layer.units.find((u) => u.name === 'Mamluk Faris')!;
    const wrapped = faris.placements
      .find((p) => decodePath(layer, p.path) === '4314-a55d-a783-18e3::22b8-dc59-428d-87cd')!;
    expect(wrapped.parents.map((p) => `${p.type} ${decodePath(layer, p.path)}`))
      .toEqual(['unit 95cf-1de7-a93e-b165']);
  });

  it('keeps the warband Arsenal under the container the roster hangs it off', () => {
    /*
      One `Pile of Stuff` PER CATALOGUE, and they are not interchangeable: the
      Arsenal a faction can stock is the faction's own, so the container's path
      and its contents differ by catalogue. An exporter has to pick the one
      matching the warband's faction, which is why `catalogueId` is emitted
      alongside the path.
    */
    const piles = layer.containers.filter((c) => c.name === 'Pile of Stuff');
    expect(piles.length).toBeGreaterThan(1);
    const sultanate = piles.find(
      (c) => decodePath(layer, c.path) === 'c0f8-5012-5416-763a::c0cb-8f53-98d4-abc9')!;
    expect(sultanate).toBeDefined();
    expect(Object.keys(sultanate.carries).length).toBeGreaterThan(10);
    expect(new Set(piles.map((c) => c.catalogueId)).size).toBe(piles.length);
  });
});

describe('one weapon, many identities', () => {
  it('gives the same weapon different paths under different models', () => {
    // The whole reason the flat `weapons` list cannot answer this question.
    const seen = new Map<string, Set<string>>();
    for (const u of layer.units) {
      for (const p of u.placements) {
        for (const [name, sels] of Object.entries(p.carries)) {
          const set = seen.get(name) ?? new Set<string>();
          for (const sel of sels) set.add(decodePath(layer, sel.path));
          seen.set(name, set);
        }
      }
    }
    const knife = seen.get('Trench Knife');
    expect(knife!.size).toBeGreaterThan(1);
  });

  it('hands back every candidate rather than picking one quietly', () => {
    /*
      TrenchLine does not record which armoury group a player took an item
      from, so where a model can reach one item by two routes there is a real
      choice to make. Making it here, invisibly, is how an export becomes
      subtly not the warband — so the choice is handed up.
    */
    const many = layer.units.flatMap((u) => u.placements.flatMap((p) =>
      Object.entries(p.carries).filter(([, sels]) => sels.length > 1)));
    expect(many.length).toBeGreaterThan(0);
    const [name, paths] = many[0];
    const placement = layer.units.flatMap((u) => u.placements)
      .find((p) => p.carries[name]?.length > 1)!;
    expect(itemPaths(layer, placement, name)).toHaveLength(paths.length);
  });
});

describe('resolving a model the way an exporter would', () => {
  const alchemist = DATASET.units.find(
    (u) => u.name === 'Jabirean Alchemist' && u.factionId === 'Iron Sultanate')!;

  it('resolves the model and the gear it can carry', () => {
    const id = modelIdentity(layer, alchemist.entryId!, ['Automatic Rifle', 'Trench Knife']);
    expect(id).not.toBeNull();
    expect(id!.self.entryId).toBe('7c17-5f75-6fd9-73cf');
    expect(id!.self.from).toBe('entry');
    expect(id!.missing).toEqual([]);
    const rifle = id!.items.find((i) => i.name === 'Automatic Rifle')!.selections[0];
    expect(rifle.entryId).toContain('::');
    expect(rifle.from).toBe('group');
    expect(rifle.group).toMatch(/Ranged/);
  });

  it('reports gear it has no path for instead of inventing one', () => {
    const id = modelIdentity(layer, alchemist.entryId!, ['Automatic Rifle', 'A Cup Of Tea']);
    expect(id!.missing).toEqual(['A Cup Of Tea']);
    expect(id!.items.map((i) => i.name)).toEqual(['Automatic Rifle']);
  });

  it('returns null for a model with no BattleScribe identity at all', () => {
    const leper = DATASET.units.find((u) => u.name === 'Leper-Pilgrim')!;
    expect(modelIdentity(layer, leper.entryId!, [])).toBeNull();
  });

  it('picks the placement that resolves the most of the model’s own gear', () => {
    /*
      Six Warband Variants place the Scripture Guardian, and they do not offer
      the same armoury. Choosing the placement by what the model is actually
      carrying is a choice between several true identities — not a guess at an
      unknown one, which is why it is allowed at all.
    */
    const guardian = layer.units.find((u) => u.name === 'Scripture Guardian');
    if (!guardian) return;
    expect(guardian.placements.length).toBeGreaterThan(1);
    const names = [...new Set(guardian.placements.flatMap((p) => Object.keys(p.carries)))];
    const only = names.find((n) => guardian.placements.filter((p) => p.carries[n]).length === 1);
    if (!only) return;
    const id = modelIdentity(layer, guardian.entryId, [only]);
    expect(id!.missing).toEqual([]);
  });
});

describe('the compatibility report an exporter has to show first', () => {
  it('is empty for a warband every part of which has an identity', () => {
    const alchemist = DATASET.units.find(
      (u) => u.name === 'Jabirean Alchemist' && u.factionId === 'Iron Sultanate')!;
    expect(exportGaps(layer, [
      { name: 'Ibn Sina', entryId: alchemist.entryId!, items: ['Automatic Rifle'] },
    ])).toEqual([]);
  });

  it('reports an unmapped model, quoting the reason the layer recorded', () => {
    const leper = DATASET.units.find((u) => u.name === 'Leper-Pilgrim')!;
    const gaps = exportGaps(layer, [{ name: 'Brother Anselm', entryId: leper.entryId!, items: [] }]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].kind).toBe('model');
    expect(gaps[0].why).toMatch(/minted by a supplement layer/);
  });

  it('reports an item separately from the model that carries it', () => {
    const alchemist = DATASET.units.find(
      (u) => u.name === 'Jabirean Alchemist' && u.factionId === 'Iron Sultanate')!;
    const gaps = exportGaps(layer, [
      { name: 'Ibn Sina', entryId: alchemist.entryId!, items: ['Automatic Rifle', 'A Cup Of Tea'] },
    ]);
    expect(gaps).toEqual([
      { kind: 'item', model: 'Ibn Sina', name: 'A Cup Of Tea',
        why: 'no path under this model — the catalogues do not offer it here' },
    ]);
  });
});

describe('the Warband Variant a roster records as a selection of its own', () => {
  it('has a path for every variant the catalogues carry', () => {
    expect(layer.variants.length).toBe(
      DATASET.variants.filter((v) => v.entryId && !v.entryId.startsWith('cf-')).length);
  });

  it('resolves one by the id the app stores', () => {
    const wisdom = variantPath(layer, 'houseofwisdom');
    expect(wisdom).toBeDefined();
    expect(decodePath(layer, wisdom!.path)).toBe('c2b1-d49e-937b-2f87');
  });
});

describe('a layer and the code reading it coming apart', () => {
  it('throws rather than decoding a segment it does not have', () => {
    // Silence here would produce a plausible-looking short path and a roster
    // that opens as somebody else's warband.
    expect(() => decodePath(layer, [0, 999999])).toThrow(/not in this layer/);
  });

  it('has no identity for an entry id that is not in the layer', () => {
    expect(unitPaths(layer, 'nope-nope-nope-nope')).toBeUndefined();
  });
});

describe('against the .ros NewRecruit actually wrote', () => {
  /*
    The JSON export above is convenient; this is the format. A `.ros` selection
    carries four things that decide its identity, and getting any of them wrong
    produces a file that opens and is quietly not the warband:

      entryId       where the thing is
      entryGroupId  which group it was taken from
      group         that group's name trail, written verbatim
      from          "entry" or "group", and an importer branches on it

    The layer is checked against all four, for every selection in a real
    thirteen-model campaign warband.
  */
  const ROS = 'data-sources/fixtures/newrecruit/al-qarn-rihla-august.ros';

  interface RosSelection {
    entryId: string;
    entryGroupId?: string;
    group?: string;
    from: string;
    name: string;
    type: string;
  }

  const rosSelections = (): RosSelection[] => {
    const xml = fs.readFileSync(ROS, 'utf8');
    const out: RosSelection[] = [];
    for (const m of xml.matchAll(/<selection\s([^>]*?)\/?>/g)) {
      const at = (k: string) => m[1].match(new RegExp(`(?:^|\\s)${k}="([^"]*)"`))?.[1];
      const entryId = at('entryId');
      if (!entryId) continue;
      out.push({
        entryId,
        entryGroupId: at('entryGroupId'),
        group: at('group'),
        from: at('from') ?? '',
        name: at('name') ?? '',
        type: at('type') ?? '',
      });
    }
    return out;
  };

  /* Every selection the layer names, wherever it sits. */
  const known = new Map<string, ReturnType<typeof resolveSelection>>();
  const remember = (sel: Selection) => {
    const r = resolveSelection(layer, sel);
    if (!known.has(r.entryId)) known.set(r.entryId, r);
  };
  for (const u of layer.units) {
    for (const p of u.placements) {
      remember(p);
      for (const parent of p.parents) remember(parent);
      for (const list of Object.values(p.carries)) list.forEach(remember);
    }
  }
  for (const c of layer.containers) {
    remember(c);
    for (const list of Object.values(c.carries)) list.forEach(remember);
  }
  for (const v of layer.variants) remember(v);

  const sels = rosSelections();

  it('parsed the real file', () => {
    expect(sels.length).toBe(95);
    expect(sels.filter((s) => s.entryGroupId).length).toBeGreaterThan(60);
  });

  it('never disagrees with the file on entryGroupId, group or from', () => {
    /*
      Only the selections the layer claims to know. What it does not carry —
      campaign state, BattleScribe bookkeeping — is listed in
      `docs/ROSTER-PATHS.md` and is a separate question from whether what it
      does carry is right.
    */
    const wrong: string[] = [];
    let checked = 0;
    for (const s of sels) {
      const ours = known.get(s.entryId);
      if (!ours) continue;
      checked += 1;
      if ((ours.entryGroupId ?? undefined) !== (s.entryGroupId ?? undefined)) {
        wrong.push(`${s.name}: entryGroupId file=${s.entryGroupId} layer=${ours.entryGroupId}`);
      }
      if ((ours.group ?? undefined) !== (s.group ?? undefined)) {
        wrong.push(`${s.name}: group file=${s.group} layer=${ours.group}`);
      }
      if (ours.from !== s.from) {
        wrong.push(`${s.name}: from file=${s.from} layer=${ours.from}`);
      }
    }
    expect(wrong).toEqual([]);
    expect(checked).toBeGreaterThanOrEqual(75);
  });

  it('writes a group name trail that is shallower than its id path', () => {
    /*
      Not a bug, and worth pinning because it looks like one. A group reached
      by a link contributes TWO ids — the link and the group it targets — and
      one name. `Weapons::Ranged Weapons::Ranged (Two-Handed)` is three names
      and four ids.
    */
    const rifle = sels.find((s) => s.name === 'Automatic Rifle' && s.group?.startsWith('Weapons'))!;
    expect(rifle.group!.split('::')).toHaveLength(3);
    expect(rifle.entryGroupId!.split('::')).toHaveLength(4);
    expect(known.get(rifle.entryId)!.group).toBe(rifle.group);
  });

  it('resets the group trail at every entry boundary', () => {
    /*
      A model's own options are in the model's own groups, never in the group
      the model was taken from. Carrying the trail down leaked the parent's
      group into every child — the walk produced
      `Variant Selection::Weapon Collections::…` where the file says
      `Weapon Collections::…`.
    */
    const nested = sels.filter((s) => s.group?.startsWith('Weapon Collections'));
    expect(nested.length).toBeGreaterThan(0);
    for (const s of nested) {
      const ours = known.get(s.entryId);
      if (ours) expect(ours.group).toBe(s.group);
    }
  });
});
