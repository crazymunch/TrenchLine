/**
 * The rule that decides whether a `.ros` exporter is possible at all.
 *
 * `docs/EXPORT-CODEX-REVIEW.md` E3 refused to accept an `entryId` count as
 * evidence of interoperability, and this is why. A roster selection is not
 * identified by a catalogue entry id: it is identified by the chain of
 * `entryLink` ids traversed from the force root, with the target entry's id
 * appended. The same weapon under a different model is a different string.
 *
 * These tests pin that rule against a roster NewRecruit actually exported, not
 * against my reading of a schema. It reproduces all ninety-five of that
 * roster's selections; if the rule stops holding, that number is what moves.
 *
 * The layer this feeds — `src/data/generated/*.rosterpaths.json` — is checked
 * against the same fixture in `src/services/__tests__/rosterPaths.test.ts`.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

import { buildPathIndex, loadCatalogues, walkRoots, MAX_DEPTH }
  from '../lib/newrecruit-paths.mjs';
import { DATASET } from '../../src/data/generated/trenchline.generated';

const CAT = 'data-sources/battlescribe';
const FIXTURE = 'data-sources/fixtures/al-qarn-rihla/04-august-1320d-CURRENT.json';

const index = buildPathIndex(CAT);

const rosterSelections = () => {
  const roster = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')).roster;
  const out = [];
  const walk = (xs) => { for (const s of xs ?? []) { out.push(s); walk(s.selections); } };
  for (const f of roster.forces ?? []) walk(f.selections);
  return out;
};

describe('what the catalogues say they are', () => {
  it('names one game system, which a roster file has to quote', () => {
    expect(index.system.id).toBe('sys-4f3d-c5c9-7df1-ad01');
    expect(index.system.name).toBe('Trench Crusade');
    expect(index.system.battleScribeVersion).toBe('2.03');
  });

  it('has every catalogue declaring a gameSystemRevision that is not the system’s', () => {
    /*
      All eleven. Not a transcription slip on one file — the community
      catalogues simply do not keep that attribute current, and an importer
      that validates a roster against it will reject files that are fine.
      Recorded because a generator has to decide what to write there.
    */
    const stale = index.catalogues.filter((c) => c.gameSystemRevision !== index.system.revision);
    expect(stale).toHaveLength(index.catalogues.length);
  });
});

describe('the path rule, against a roster NewRecruit exported', () => {
  const sels = rosterSelections();

  it('has a roster to check against at all', () => {
    expect(sels.length).toBeGreaterThan(50);
  });

  it('reproduces every one of its selection paths', () => {
    /*
      All ninety-five, where the first pass of this spike reproduced 92. The
      three it could not reach were `Assigned Sword` and two `Alchemical
      Ammuntion (Loaded)`, and the spike recorded the cause as not established.
      The cause is the second half of the path rule — see below.

      Kept as an equality rather than a floor now that there is no residue to
      excuse: `npm run rules:fetch` may add or move entries, and if it drops
      one of these the walk has stopped holding, which is the thing worth
      failing a build over.
    */
    const missed = sels.filter((s) => !index.paths.has(s.entryId));
    expect(missed.map((s) => `${s.name} ${s.entryId}`)).toEqual([]);
  });

  it('reproduces the deepest gear path in the roster, exactly', () => {
    /*
      Five segments: four `entryLink` ids — Weapons, Ranged Weapons, Ranged
      (Two-Handed), the weapon — then the shared entry they point at, which
      lives in a different catalogue file entirely.

      The deepest rather than a named one: the same weapon appears in this
      roster at more than one depth, because two models reach it by different
      routes. That is the finding, so the test picks by depth.
    */
    const deepest = sels.reduce((a, b) =>
      (b.entryId ?? '').split('::').length > (a.entryId ?? '').split('::').length ? b : a);
    expect(deepest.entryId.split('::').length).toBeGreaterThanOrEqual(5);
    expect(index.paths.has(deepest.entryId)).toBe(true);
  });

  it('gives one weapon different identities under different models', () => {
    // The reason a flat `weapons` list cannot answer this.
    const byName = new Map();
    for (const s of sels) {
      if (!s.entryId?.includes('::')) continue;
      byName.set(s.name, new Set([...(byName.get(s.name) ?? []), s.entryId]));
    }
    const shared = [...byName].filter(([, ids]) => ids.size > 1);
    expect(shared.length).toBeGreaterThan(0);
  });

  it('does not put a model’s own id in its children’s paths', () => {
    /*
      The rule in one assertion, and the thing three earlier guesses got wrong.
      An entry id is not a link, so it appears once — as the last segment of
      its own path — and lends nothing to what hangs below it.
    */
    const alchemist = sels.find((s) => s.name === 'Jabirean Alchemist');
    expect(alchemist.entryId).toBe('7c17-5f75-6fd9-73cf');
    const rifle = sels.find((s) => s.name === 'Automatic Rifle');
    expect(rifle.entryId).not.toContain(alchemist.entryId);
  });

  it('does carry a LINK’s id into its children’s paths', () => {
    // Pile of Stuff is reached by a link, so that link prefixes everything
    // underneath it — including the model's own path.
    const pile = sels.find((s) => s.name === 'Pile of Stuff');
    const link = pile.entryId.split('::')[0];
    const child = sels.find((s) => s.name === 'Armour Storage');
    expect(child.entryId.startsWith(`${link}::`)).toBe(true);
  });

  it('does NOT carry a link\u2019s id into what the link element itself writes', () => {
    /*
      The second half of the rule, and the reason three selections used to be
      unreachable.

      A BattleScribe `entryLink` may carry its own `selectionEntries` —
      options that exist only at that placement. `Mamluk Faris` is a `unit`
      entry whose only child is a link to the `model`, and the link writes an
      `Assigned Sword` inside itself. That sword's path is its own id ALONE:
      the link id that prefixes everything under the entry it points at does
      not prefix what the link itself declares, because a per-placement option
      is already unique and has nothing to disambiguate.

      Nested under the model in the roster all the same, which is why the walk
      keeps it in the parent trail and drops it from the prefix.
    */
    const faris = sels.find((s) => s.type === 'model' && s.name === 'Mamluk Faris');
    const link = faris.entryId.split('::')[0];
    const sword = sels.find((s) => s.name === 'Assigned Sword');
    expect(sword.entryId).toBe('80f0-b0dc-e20d-7ce0');
    expect(sword.entryId).not.toContain(link);
    expect(index.paths.has(sword.entryId)).toBe(true);
  });

  it('reaches the ammunition a weapon link declares, at the weapon\u2019s own prefix', () => {
    // The same rule again, one level down: the `Siege Jezzail` link writes its
    // ammunition options, so their paths stop at the group above the weapon
    // and the weapon link's own id is absent.
    const ammo = sels.filter((s) => s.name === 'Alchemical Ammuntion (Loaded)');
    expect(ammo.length).toBeGreaterThan(0);
    for (const a of ammo) expect(index.paths.has(a.entryId)).toBe(true);
  });
});

describe('the walk itself', () => {
  it('terminates, and says where it was bounded', () => {
    // Catalogue links reach back up; an unbounded walk does not return.
    expect(MAX_DEPTH).toBe(8);
    expect(index.roots.some((r) => r.truncated > 0)).toBe(true);
  });

  it('indexes far more paths than there are entries, which is the point', () => {
    /*
      ~26,000 paths from ~1,100 entries: one weapon is reachable under many
      models by many routes, and each route is a different roster identity.
      A flat list of entry ids cannot express that, which is exactly why the
      generated dataset cannot answer this question.
    */
    const { entries } = loadCatalogues(CAT);
    expect(index.paths.size).toBeGreaterThan(entries.size * 10);
  });
});

describe('the parent trail, which is not the path', () => {
  const cat = loadCatalogues(CAT);
  const roots = walkRoots(cat);
  const all = roots.flatMap((r) => r.found);

  it('nests the Mamluk Faris model inside the unit entry that wraps it', () => {
    /*
      Two selections for one model, and a generator that writes only the inner
      one produces a file no importer reads back the same way. The wrapper is
      not in the model's PATH — it is a `selectionEntry`, and entry ids do not
      prefix — so the only place it can be recorded is the trail.
    */
    const model = all.find((f) => f.path === '4314-a55d-a783-18e3::22b8-dc59-428d-87cd');
    expect(model.type).toBe('model');
    expect(model.parents.map((p) => `${p.type} ${p.path}`))
      .toEqual(['unit 95cf-1de7-a93e-b165']);
  });

  it('never nests one RECRUITABLE model inside another, in these catalogues', () => {
    /*
      Pinned because the emitter has to choose an owner for each item, and it
      chooses the innermost recruitable model in the trail. Today that choice
      is never exercised — nothing here has two — so innermost and outermost
      agree everywhere and the branch is untested by data.

      "Recruitable" is doing real work: at the catalogue level models DO nest,
      because `Mamluk Faris` is a `unit` entry wrapping the `model` that carries
      the profile. The dataset recruits only the inner one, so only the inner
      one can own an item. Reading the dataset's own entry ids here rather than
      the catalogue's `type` is the difference between a true statement and a
      false one, and getting it wrong is how the first draft of this test read.

      If a future revision nests two recruitable models, this fails and the
      choice becomes real — which is the point of writing it down.
    */
    const recruitable = new Set(DATASET.units.map((u) => u.entryId).filter(Boolean));
    expect(recruitable.size).toBeGreaterThan(80);

    const owners = new Set(all.filter((f) => recruitable.has(f.id)).map((f) => f.path));
    const nested = all.filter((f) => f.parents.filter((p) => owners.has(p.path)).length > 1);
    expect(nested.map((f) => `${f.name} ${f.path}`)).toEqual([]);
  });

  it('keeps a link-owned option under the model, though not under the link', () => {
    // `Assigned Sword` is written inside the link to the model. The roster
    // nests it under the model; its path does not mention the link.
    const sword = all.find((f) => f.path === '80f0-b0dc-e20d-7ce0');
    expect(sword.name).toBe('Assigned Sword');
    expect(sword.parents.map((p) => p.path)).toContain(
      '4314-a55d-a783-18e3::22b8-dc59-428d-87cd');
  });
});
