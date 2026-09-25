/**
 * A Glory-priced item in the Arsenal was free.
 *
 * FD-05f. `ArmoryStashModal` rendered every purchase row with the Ducat field
 * as its whole cost. Every Glory-priced offer in the dataset is **zero Ducats**
 * and some Glory, so each one printed `0 D`, was tested for affordability
 * against a Strongbox it was not spending from, passed, and was bought for
 * nothing — and `sellFromStash` then paid Ducats back for it.
 *
 * The rows are not a separate price list: `recruitable` builds the store's
 * weapon, armour and equipment lists from `armouryFor(dataset, factionId)`,
 * one entry per Armoury Table row, and splits the row's `Cost` across `cost`
 * (Ducats) and `gloryCost` (Glory) because the legacy roster shape carries one
 * number. `profileCost` puts the two back together, and this asserts that what
 * comes back is the row's own Cost — for every Glory-priced row the books
 * print, against the shipped dataset rather than a fixture.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import { recruitable } from '../recruitable';
import { profileCost } from '../costs';
import { nameKey } from '../names';

const APP_FACTION_IDS = (DATASET.armouries ?? []).map((a) => a.factionId);

/** Every Armoury Table row priced in Glory, with the faction that offers it. */
const gloryRows = (DATASET.armouries ?? []).flatMap((a) =>
  a.rows.filter((r) => r.cost.glory > 0).map((r) => ({ factionId: a.factionId, row: r })));

/**
 * Whether the row came from a Glory Item Table rather than the Armoury Table.
 *
 * Needed to find the right offer, because a faction can stock one NAME on both
 * of its tables at two prices and the book says so: the Court's footnote 3
 * reads "A Warband can have up to 3 Restraining Muzzles purchased with ☼ in
 * addition to up to 3 Restraining Muzzles purchased with 👑." Matching on the
 * name alone found whichever came first and compared a 10-Ducat Armoury row
 * against a 1-Glory Glory Item.
 */
const isGloryRow = (section: string) => section === 'Glory Items';

describe('the Glory-priced offers in the shipped dataset', () => {
  it('are there to be got wrong', () => {
    // 32 offers of 16 distinct items across 8 of the armouries. The number is
    // asserted loosely on purpose — the point is that the case is real and
    // reachable, not that the catalogues never gain another Glory price.
    expect(gloryRows.length).toBeGreaterThanOrEqual(30);
    expect(new Set(gloryRows.map((g) => g.row.name)).size).toBeGreaterThanOrEqual(15);
  });

  it('are every one of them zero Ducats, which is why reading Ducats alone made them free', () => {
    expect(gloryRows.filter((g) => g.row.cost.ducats > 0)).toEqual([]);
  });
});

describe('the price a purchase row carries', () => {
  it.each(gloryRows.map((g) =>
    [g.factionId, g.row.name, g.row.cost.glory, isGloryRow(g.row.section)] as const))(
    '%s / %s is %i Glory in the lists the Arsenal buys from',
    (factionId, name, glory, fromGloryTable) => {
      /* The whole table, because a Glory Item is only offered once a discovery
         has opened it — the list a Warband with none sees has no Glory Items at
         all (p.125, RR-14). */
      const lists = recruitable(DATASET, factionId, APP_FACTION_IDS, undefined);
      const entry = [...lists.weapons, ...lists.armour, ...lists.equipment]
        .find((x) => nameKey(x.name) === nameKey(name) && !!x.gloryItem === fromGloryTable);

      expect(entry, `${name} is not offered to ${factionId} at all`).toBeTruthy();
      expect(profileCost(entry!)).toEqual({ ducats: 0, glory });
    });
});

describe('a Ducat-priced row', () => {
  it('reads back as Ducats and no Glory', () => {
    const antioch = recruitable(DATASET, 'new-antioch', APP_FACTION_IDS);
    const priced = antioch.weapons.find((w) => w.cost > 0);
    expect(priced, 'New Antioch stocks no Ducat-priced weapon').toBeTruthy();
    expect(profileCost(priced!)).toEqual({ ducats: priced!.cost, glory: 0 });
  });
});
