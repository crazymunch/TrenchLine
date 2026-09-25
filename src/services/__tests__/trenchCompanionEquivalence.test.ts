/**
 * The equivalence table cannot outlive the drift it records.
 *
 * `data-sources/trench-companion/id-name-equivalence.json` names the handful
 * of Trench Companion ids where no rule of spelling reaches our name. That is
 * a liability: a hand-written mapping is exactly the kind of thing that stops
 * being true and goes on being believed, and this project has a rule about
 * hand-written game data for precisely that reason.
 *
 * So the file is guarded the way `promotion-model-names.json` is guarded: an
 * entry that is **no longer needed** — one the ordinary slug rules would now
 * resolve on their own, or one that names a model this ruleset no longer has
 * — fails this test rather than quietly staying.
 *
 * It is a name equivalence and nothing else. These tests also hold it to
 * that: no entry may carry a cost, a statline, a keyword or a constraint.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { DATASET } from '@/data/generated/trenchline.generated';
import type { Dataset } from '@/types/catalogue';
import { recruitable } from '@/rules/recruitable';
import { nameKey } from '@/rules/names';

const D = DATASET as unknown as Dataset;
const APP = (D.factions ?? []).map((f) => f.id ?? f.name);

interface Entry { ours: string | null; theirs: string; why: string; cites: string }

const table = JSON.parse(fs.readFileSync(path.join(process.cwd(),
  'data-sources/trench-companion/id-name-equivalence.json'), 'utf8')) as {
    ids: Record<string, Entry>;
  };
const entries = Object.entries(table.ids);

/** Every name this ruleset offers, across the factions and their Variants. */
const everyUnitName = (): Set<string> => {
  const names = new Set<string>();
  for (const f of D.factions ?? []) {
    const id = f.id ?? f.name;
    for (const v of [undefined, ...(D.variants ?? [])
      .filter((x) => x.factionId && nameKey(x.factionId) === nameKey(f.name)).map((x) => x.id)]) {
      for (const u of recruitable(D, id, APP, v).units) names.add(nameKey(u.name));
    }
  }
  return names;
};

describe('the Trench Companion id equivalence table', () => {
  it('is not empty, or this test proves nothing', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('cites their bundle and says why, on every entry', () => {
    for (const [id, e] of entries) {
      expect(e.theirs, `${id} must say what THEIR bundle calls it`).toBeTruthy();
      expect(e.why, `${id} must say what no slug rule can reach`).toBeTruthy();
      expect(e.cites, `${id} must cite both sides`).toBeTruthy();
    }
  });

  it('states no game data — it is a name equivalence and nothing else', () => {
    /* Rule 1. A cost, a statline, a keyword or a constraint in here would be
       hand-written game data wearing a mapping's clothes. */
    for (const [id, e] of entries) {
      expect(Object.keys(e).sort(), `${id} carries a field this file may not hold`)
        .toEqual(['cites', 'ours', 'theirs', 'why']);
    }
  });

  it('names only models this ruleset actually has', () => {
    const names = everyUnitName();
    for (const [id, e] of entries) {
      if (!e.ours || !id.startsWith('md_')) continue;
      expect(names.has(nameKey(e.ours)), `${id} maps to '${e.ours}', which this ruleset has no `
        + 'entry for — the mapping has gone stale').toBe(true);
    }
  });

  it('holds no entry the ordinary slug rules would now resolve on their own', () => {
    /*
      The guard that matters. Their ids are slugs of their names, so an entry
      is only earned where the slug reaches nothing. If our data is renamed
      such that the slug DOES reach it, this entry has stopped being needed
      and must go rather than sit here being believed.
    */
    const names = everyUnitName();
    const stale: string[] = [];
    for (const [id, e] of entries) {
      if (!id.startsWith('md_')) continue;
      const tail = id.replace(/^md_/, '').replace(/_golem$/, '');
      const [before, after] = tail.includes('_mv_') ? tail.split('_mv_') : [tail, ''];
      const reachable = [nameKey(tail), nameKey(after), nameKey(before)]
        .filter(Boolean).some((k) => names.has(k));
      if (reachable) stale.push(`${id} ('${e.theirs}')`);
    }
    expect(stale, 'entries the slug rules now reach without help — delete them').toEqual([]);
  });

  it('holds no entry for an id the importer never sees', () => {
    /* Every key must appear in the committed fixture, or it is a mapping for
       something nobody has ever imported. */
    const fixture = fs.readFileSync(path.join(process.cwd(),
      'data-sources/fixtures/trench-companion/al-qarn-rihla-505410.json'), 'utf8');
    for (const [id] of entries) {
      expect(fixture.includes(id), `${id} appears in no committed fixture`).toBe(true);
    }
  });
});
