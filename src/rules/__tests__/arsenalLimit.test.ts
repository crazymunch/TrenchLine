/**
 * `Limit: N` counts the Arsenal (RR-13, FD-10).
 *
 * Page 123, L7234–7238: "if the Battlekit had a Limit of 2, and your Warband
 * already has 2 such items in its Arsenal and/or equipped by a model, then you
 * could not purchase any more. However, if your Warband used to have 2 of the
 * Battlekit and one has subsequently been removed from your Warband Roster for
 * any reason, then you could purchase a replacement."
 *
 * The count was built from the models' `items` alone, so the Arsenal was free
 * storage: a Warband could hold its two Grenade Launchers loose and buy a third
 * onto a model without a word from the validator. That matters most in the
 * Quartermaster Step, which is the step this sentence is printed in and the one
 * place a player buys into the Arsenal on purpose.
 *
 * Everything here reads `DATASET`: the New Antioch Armoury Table's own Grenade
 * Launcher row, which the catalogues price at 30 Ducats and stipulate
 * `Limit: 2`, and a Yeoman to carry it. No statline and no restriction is typed
 * into this file.
 */
import { describe, it, expect } from 'vitest';
import { validateRoster } from '../validate';
import { DATASET } from '@/data/generated/trenchline.generated';
import type { Roster, RosterItem } from '../costs';
import type { Dataset } from '@/types/catalogue';

const dataset = DATASET as unknown as Dataset;

/** The Armoury row the book's own example describes: a plain `Limit: 2`. */
const armoury = dataset.armouries!.find((a) => a.factionId === 'new-antioch')!;
const row = armoury.rows.find((r) => r.name === 'Grenade Launcher')!;
const yeoman = dataset.units.find(
  (u) => u.name === 'Yeoman' && u.factionId === 'New Antioch')!;

const copy = (): RosterItem => ({
  ...(row.weaponId ? { weaponId: row.weaponId } : {}),
  name: row.name,
  cost: row.cost,
});

const roster = (equipped: number, stashed: number): Roster => ({
  id: 'r',
  name: 'Limit test',
  factionId: 'new-antioch',
  units: Array.from({ length: equipped }, (_, i) => ({
    id: `u${i}`,
    profileId: yeoman.id,
    name: yeoman.name,
    cost: yeoman.cost,
    items: [copy()],
    options: [],
  })),
  stash: Array.from({ length: stashed }, copy),
  budget: { ducats: 700, glory: 0 },
});

const limitErrors = (r: Roster) =>
  validateRoster(r, dataset).violations.filter((v) => v.code === 'wargear-limit');

describe('the Arsenal counts towards a roster-wide Limit', () => {
  /* The row itself, so a later dataset that changes it fails here rather than
     quietly turning every case below into a test of nothing. */
  it('reads a Limit: 2 row out of the shipped Armoury Table', () => {
    expect(row.restrictions).toContain('Limit: 2');
  });

  it('allows two equipped copies and nothing in the Arsenal', () => {
    expect(limitErrors(roster(2, 0))).toHaveLength(0);
  });

  it('allows one equipped and one in the Arsenal', () => {
    expect(limitErrors(roster(1, 1))).toHaveLength(0);
  });

  it('refuses a third when one is equipped and one is in the Arsenal', () => {
    const v = limitErrors(roster(2, 1));
    expect(v).toHaveLength(1);
    expect(v[0].severity).toBe('error');
    expect(v[0].message).toBe(
      `${row.name}: 3 taken across the warband, limit is 2.`);
  });

  /* The second half of the same sentence. Nothing implements it on its own:
     a sold copy leaves the Arsenal and the count falls with it. */
  it('and allows the purchase again once a copy is sold back', () => {
    expect(limitErrors(roster(2, 0))).toHaveLength(0);
  });

  /* The Arsenal alone can breach it — the Quartermaster Step buys into the
     Arsenal, so a Warband need never equip anything to go over. */
  it('refuses three copies that are all in the Arsenal', () => {
    expect(limitErrors(roster(0, 3))).toHaveLength(1);
  });

  /* A `Limit: N per model` is a statement about a model, and an item in the
     Arsenal is on no model. Two loose copies breach nobody's per-model limit. */
  it('does not read the Arsenal as a model for a per-model limit', () => {
    const perModel = armoury.rows.find(
      (r) => (r.restrictions ?? []).some((x) => /Limit: \d+ per model/i.test(x)));
    if (!perModel) return;             // none stocked here; nothing to prove
    const r = roster(0, 0);
    const loose = (): RosterItem => ({
      ...(perModel.weaponId ? { weaponId: perModel.weaponId } : {}),
      name: perModel.name,
      cost: perModel.cost,
    });
    r.stash = [loose(), loose()];
    expect(limitErrors(r).filter((v) => /per model/i.test(v.message))).toHaveLength(0);
  });
});
