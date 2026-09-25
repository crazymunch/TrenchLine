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
import { TRENCH_COMPANION_IDS } from '@/data/generated/trench-companion-ids.generated';
import { upgradeSlugKeys } from '../trenchCompanionImporter';

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

/** Every option name on every entry — what an `up_` id resolves against. */
const everyOptionName = (): Set<string> => new Set(
  (D.units ?? []).flatMap((u) => (u.options ?? []).map((o) => nameKey(o.name))));

/** Every Exploration Location — what an `el_` id resolves against. */
const everyLocationName = (): Set<string> => new Set(
  Object.values(D.campaign?.exploration?.locations ?? {}).flat().map((r) => nameKey(r.name)));

/** The fixture, for the model slug an `up_` id is namespaced by. */
const fixture = fs.readFileSync(path.join(process.cwd(),
  'data-sources/fixtures/trench-companion/al-qarn-rihla-505410.json'), 'utf8');
const theirModels = (JSON.parse(
  (JSON.parse(fixture) as { warband_data: string }).warband_data,
) as { models: { model: { model?: string; list_upgrades?: { upgrade?: { object_id?: string } }[] } }[] })
  .models.map((l) => l.model);

/**
 * One domain per prefix: the names an id of that kind resolves against, and
 * the keys the importer tries it under.
 *
 * Every prefix in the table must have one. That is the point of doing it this
 * way: the guard used to run on `md_` alone and skip everything else, so
 * `up_meleemight` and `el_snipersnest` sat in the file unguarded — which is
 * precisely the state this file exists to prevent.
 *
 * The keys mirror the importer rather than being re-derived: `up_` asks
 * `upgradeSlugKeys` itself, so a guard cannot drift from the rules it guards.
 */
const DOMAINS: Record<string, { what: string; names: () => Set<string>; keys: (id: string) => string[] }> = {
  md_: {
    what: 'a model this ruleset can field',
    names: everyUnitName,
    /* `resolveModel`: the whole slug, the part after `_mv_`, the part before. */
    keys: (id) => {
      const tail = id.replace(/^md_/, '').replace(/_golem$/, '');
      const [before, after] = tail.includes('_mv_') ? tail.split('_mv_') : [tail, ''];
      return [nameKey(tail), nameKey(after), nameKey(before)].filter(Boolean);
    },
  },
  up_: {
    what: "an option on some entry's own list",
    names: everyOptionName,
    /* `readUpgrades`, through the importer's own `upgradeSlugKeys` — under
       every model in the fixture that carries the id, because their upgrade
       ids are namespaced by the model as well as by the group. */
    keys: (id) => {
      const carriers = theirModels
        .filter((m) => (m.list_upgrades ?? []).some((u) => u.upgrade?.object_id === id))
        .map((m) => m.model);
      return [...new Set([undefined, ...carriers]
        .flatMap((slug) => upgradeSlugKeys(id, slug)))];
    },
  },
  el_: {
    what: 'an Exploration Location',
    names: everyLocationName,
    /* `readExploration`: the tail, with the book suffix taken off. */
    keys: (id) => [nameKey(id.replace(/^el_/, '').replace(/_cf$/, ''))].filter(Boolean),
  },
};

const domainOf = (id: string) => DOMAINS[`${id.slice(0, id.indexOf('_') + 1)}`];

describe('the Trench Companion id equivalence table', () => {
  it('is not empty, or this test proves nothing', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('ships to the app exactly as the source file states it', () => {
    /*
      The app reads the GENERATED copy, because `.vercelignore` keeps
      `data-sources/` out of every deployment: importing the source directly
      built in CI, which has the whole checkout, and failed the Vercel build,
      which does not. Every other test in this file reads the SOURCE, where the
      citations live, so this is the one that makes those tests true of what
      the app actually loads.

      Deep-equal over the whole file, prose keys and all — `rules-build.mjs`
      copies it verbatim, and anything less than exactness here would let the
      two drift in a way no other test could see.
    */
    expect(TRENCH_COMPANION_IDS).toEqual(table);
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

  it('guards every prefix it carries, not just the models', () => {
    /*
      Item 7. The two guards below ran on `md_` and skipped everything else,
      so an `up_` or an `el_` entry could go stale and no test would say so.
      A prefix with no domain is now a failure here rather than a silent skip.
    */
    for (const [id] of entries) {
      expect(domainOf(id), `${id} has a prefix no domain in this test covers, so nothing `
        + 'guards it — add one').toBeDefined();
    }
  });

  it('names only things this ruleset actually has', () => {
    for (const [id, e] of entries) {
      if (!e.ours) continue;
      const domain = domainOf(id)!;
      expect(domain.names().has(nameKey(e.ours)),
        `${id} maps to '${e.ours}', which is not ${domain.what} in this ruleset — the mapping `
        + 'has gone stale').toBe(true);
    }
  });

  it('holds no entry the ordinary slug rules would now resolve on their own', () => {
    /*
      The guard that matters. Their ids are slugs of their names, so an entry
      is only earned where the slug reaches nothing. If our data is renamed
      such that the slug DOES reach it, this entry has stopped being needed
      and must go rather than sit here being believed.
    */
    const stale: string[] = [];
    for (const [id, e] of entries) {
      const domain = domainOf(id)!;
      const names = domain.names();
      if (domain.keys(id).some((k) => names.has(k))) stale.push(`${id} ('${e.theirs}')`);
    }
    expect(stale, 'entries the slug rules now reach without help — delete them').toEqual([]);
  });

  it('holds no entry for an id the importer never sees', () => {
    /* Every key must appear in the committed fixture, or it is a mapping for
       something nobody has ever imported. */
    for (const [id] of entries) {
      expect(fixture.includes(id), `${id} appears in no committed fixture`).toBe(true);
    }
  });
});
