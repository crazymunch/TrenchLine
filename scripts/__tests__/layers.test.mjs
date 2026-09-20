/**
 * A layer's price change reaches the price.
 *
 * DA-07 / FD-02. The Dispatch says "Change the Cost of Incendiary Grenades to
 * 10 in the following Armoury Tables: New Antioch, Trench Pilgrims, Iron
 * Sultanate, Heretic Legions, The Court" — five tables, named.
 *
 * `setCost` wrote `target.cost` on the single weapon profile the name
 * resolved to first and touched no armoury row at all. `priceOf` reads the
 * ROW, so the published change reached nothing a player was charged: every
 * row still said 15 while one profile said 10, and which number you saw
 * depended on which screen asked.
 *
 * So a weapon `setCost` names its Armoury Tables and is applied in both
 * passes, and one without a faction list is unresolved rather than quietly
 * repricing a copy nobody chose.
 */
import { describe, it, expect } from 'vitest';

import { applyLayer, applyArmouryRowOps } from '../lib/layers.mjs';

/** The provenance sink, reduced to what `applyLayer` calls. */
const sink = () => {
  const stamps = [];
  return { stamps, stamp: (kind, id, field, by) => stamps.push({ kind, id, field, by }) };
};

/*
  Three factions, one weapon, and the two spellings the dataset really uses:
  an armoury is keyed by SLUG, a weapon profile carries `factionId` as the
  printed NAME, and some profiles are not faction-scoped at all. A faction
  list written in slugs and compared naively against profiles would match
  nothing — silently — which is the same fault in a new place.
*/
const fixture = () => ({
  weapons: [
    { id: 'w-a', name: 'Grenades', factionId: 'Alpha Company', cost: { ducats: 15, glory: 0 } },
    { id: 'w-b', name: 'Grenades', factionId: 'Beta Company', cost: { ducats: 15, glory: 0 } },
    { id: 'w-c', name: 'Grenades', factionId: 'Gamma Company', cost: { ducats: 15, glory: 0 } },
    { id: 'w-x', name: 'Grenades', factionId: 'Ranged Weapons', cost: { ducats: 0, glory: 0 } },
  ],
  armouries: [
    { factionId: 'alpha-company', rows: [{ name: 'Grenades', cost: { ducats: 15, glory: 0 } }] },
    { factionId: 'beta-company', rows: [{ name: 'Grenades', cost: { ducats: 15, glory: 0 } }] },
    { factionId: 'gamma-company', rows: [{ name: 'Grenades', cost: { ducats: 15, glory: 0 } }] },
  ],
});

const layer = (op) => ({ id: 'test-layer', sourceRef: 'p.1', ops: [op] });

const setCost = (over = {}) => ({
  op: 'setCost',
  target: { kind: 'weapon', id: 'Grenades' },
  currency: 'ducats',
  value: 10,
  ...over,
});

const run = (dataset, op) => {
  const deferred = [];
  const unresolved = applyLayer(dataset, layer(op), sink(), [], deferred, []);
  const second = applyArmouryRowOps(dataset, deferred);
  return { unresolved, deferred, second };
};

const rowCost = (d, slug) =>
  d.armouries.find((a) => a.factionId === slug).rows[0].cost.ducats;
const profileCost = (d, label) =>
  d.weapons.find((w) => w.factionId === label).cost.ducats;

describe('a weapon price change that names its Armoury Tables', () => {
  it('changes exactly the named rows, and leaves the rest', () => {
    const d = fixture();
    const { unresolved, second } = run(d, setCost({ factions: ['alpha-company', 'beta-company'] }));

    expect(unresolved).toEqual([]);
    expect(rowCost(d, 'alpha-company')).toBe(10);
    expect(rowCost(d, 'beta-company')).toBe(10);
    // Not named, so it keeps its own price. This is the Procession and the
    // Naval Raiders in the real data.
    expect(rowCost(d, 'gamma-company')).toBe(15);
    expect(second.applied).toBe(1);
  });

  it('changes the matching profiles too, matching a slug to a printed name', () => {
    const d = fixture();
    run(d, setCost({ factions: ['alpha-company', 'beta-company'] }));

    expect(profileCost(d, 'Alpha Company')).toBe(10);
    expect(profileCost(d, 'Beta Company')).toBe(10);
    expect(profileCost(d, 'Gamma Company')).toBe(15);
    // A profile that is a section heading rather than a faction is not one of
    // the tables and is never repriced.
    expect(profileCost(d, 'Ranged Weapons')).toBe(0);
  });

  it('says which layer set the row, so the audit does not read it as drift', () => {
    const d = fixture();
    run(d, setCost({ factions: ['alpha-company'] }));
    expect(d.armouries.find((a) => a.factionId === 'alpha-company').rows[0].source)
      .toBe('test-layer');
  });

  it('accounts for itself exactly once however many rows it touched', () => {
    /*
      The build reconciles deferred ops against applied + unresolved + notes
      and throws when they disagree, so an op that sets three rows must still
      count as one. Counting per row was the first thing this got wrong.
    */
    const d = fixture();
    const { deferred, second } = run(d, setCost({
      factions: ['alpha-company', 'beta-company', 'gamma-company'],
    }));
    expect(deferred).toHaveLength(1);
    expect(second.applied + second.unresolved.length + second.notes.length).toBe(1);
  });
});

describe('what it refuses', () => {
  it('rejects a weapon setCost with no faction list, and changes nothing', () => {
    /*
      The old behaviour — reprice whichever copy resolved first — is the
      defect, not a lesser version of the fix.
    */
    const d = fixture();
    const { unresolved } = run(d, setCost());

    expect(unresolved).toHaveLength(1);
    expect(unresolved[0].why).toMatch(/factions/);
    expect(rowCost(d, 'alpha-company')).toBe(15);
    expect(profileCost(d, 'Alpha Company')).toBe(15);
  });

  it('rejects the whole op when a named table does not stock the item', () => {
    /*
      Partly applied is a failure, not a success with a footnote: the Dispatch
      named its tables and expects to find them. A row that has moved or been
      renamed is an errata pointing at something that is no longer there.
    */
    const d = fixture();
    d.armouries.find((a) => a.factionId === 'beta-company').rows = [];
    const { second } = run(d, setCost({ factions: ['alpha-company', 'beta-company'] }));

    expect(second.unresolved).toHaveLength(1);
    expect(second.unresolved[0].why).toMatch(/does not stock/);
    // And nothing was written, including for the faction that did stock it.
    expect(rowCost(d, 'alpha-company')).toBe(15);
  });

  it('rejects a named faction with no armoury at all', () => {
    const d = fixture();
    const { second } = run(d, setCost({ factions: ['alpha-company', 'delta-company'] }));
    expect(second.unresolved).toHaveLength(1);
    expect(second.unresolved[0].why).toMatch(/no armoury/);
  });
});

describe('a unit price change is unaffected', () => {
  it('still sets the one entry, with no faction list', () => {
    // A unit is a single entry priced from `unit.cost`; the four unit
    // `setCost` ops in the Dispatch are deliberately untouched by this.
    const d = { ...fixture(), units: [{ id: 'u1', name: 'Observer', cost: { ducats: 15, glory: 0 } }] };
    const { unresolved } = run(d, {
      op: 'setCost', target: { kind: 'unit', id: 'Observer' }, currency: 'ducats', value: 5,
    });
    expect(unresolved).toEqual([]);
    expect(d.units[0].cost.ducats).toBe(5);
  });
});
