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
 * against my reading of a schema. If the rule is wrong the percentage moves,
 * and the percentage is the deliverable.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

import { buildPathIndex, loadCatalogues, MAX_DEPTH } from '../lib/newrecruit-paths.mjs';

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

  it('reproduces at least 96% of its selection paths', () => {
    /*
      A floor, not an equality: the catalogues are refreshed by
      `npm run rules:fetch` and a new revision may add or move entries. A drop
      below this means the rule stopped holding, which is the thing worth
      failing a build over.
    */
    const hit = sels.filter((s) => index.paths.has(s.entryId)).length;
    expect(hit / sels.length).toBeGreaterThanOrEqual(0.96);
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

  it('names the selections it cannot reach rather than rounding them away', () => {
    const missed = sels.filter((s) => !index.paths.has(s.entryId));
    expect(missed.length).toBeLessThanOrEqual(4);
    // All in one catalogue, and not a depth problem — 10 and 12 reproduce
    // exactly what 8 does. Listed in docs/NEWRECRUIT-SPIKE.md.
    for (const s of missed) expect(s.name).toMatch(/Alchemical Ammuntion|Assigned Sword|Anti-Tank/);
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
