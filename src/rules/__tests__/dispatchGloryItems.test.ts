/**
 * The two Glory Items the Trench Dispatch adds.
 *
 * A Glory Item needs two things to exist for a player: a PROFILE, so its rules
 * can be read, and an ARMOURY ROW, so a faction stocks it at a price. The
 * layer format could only do the first — `add` puts an entity in a top-level
 * collection, and an armoury row is nested inside `armouries[].rows` — so
 * these would have been readable in the Codex and takeable by nobody.
 *
 * The SECTION is the other half, and it changed in RR-14. Until the rulebook's
 * six Glory Item Tables were parsed there was no `Glory Items` section to add a
 * row to, so these were stocked under the kind of thing they are. The Dispatch
 * says which table they join — "Add the following entry to the BLACK GRAIL
 * Glory Items Table", "...to the SULTANATE Glory Items Table" — and that is now
 * a section that exists, so they join it and sit behind the same p.125
 * discovery gate as every other Glory Item. Left as Equipment they would have
 * been on sale to a Warband that has discovered nothing, while the rulebook's
 * own 4-Glory Knighthood was not.
 *
 * The currency is the interesting part. The Dispatch prints it as a glyph and
 * the text extraction drops it, leaving `Regimental Kaşık … 4` with no unit;
 * the Grail Strain costs had the same problem and needed a maintainer ruling.
 * These did not, because the rows are added to tables the base rulebook
 * already prints, and all 51 priced rows in the rulebook's Glory Items Tables
 * are in Glory with no exceptions. The currency is read off the table the row
 * joins rather than inferred from the item.
 */
import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import BASE from '@/data/generated/github-latest.generated';
import type { Dataset } from '@/types/catalogue';

const d = DATASET as unknown as Dataset;
const base = BASE as unknown as Dataset;

const profile = (name: string) => (d.weapons ?? []).find((w) => w.name === name);
const rows = (name: string) => (d.armouries ?? [])
  .flatMap((a) => (a.rows ?? []).filter((r) => r.name === name).map((r) => ({ faction: a.factionId, ...r })));

describe('the Dispatch Glory Items', () => {
  it('gives Blessings of Beelzebub a profile and a Black Grail row', () => {
    expect(profile('Blessings of Beelzebub')).toBeDefined();
    expect(rows('Blessings of Beelzebub')).toEqual([{
      faction: 'cult-of-the-black-grail',
      name: 'Blessings of Beelzebub',
      section: 'Glory Items',
      cost: { ducats: 0, glory: 9 },
      restrictions: ['Lord of Tumours only, Limit: 1'],
    }]);
  });

  it('gives Regimental Kaşık a profile and a Sultanate row', () => {
    expect(profile('Regimental Kaşık')?.keywords).toEqual(['LEADER']);
    expect(rows('Regimental Kaşık')).toEqual([{
      faction: 'iron-sultanate',
      name: 'Regimental Kaşık',
      section: 'Glory Items',
      cost: { ducats: 0, glory: 4 },
      restrictions: ['Janissaries & Yüzbaşı with Janissary Veteran only, Limit: 1'],
    }]);
  });

  it('prices them in Glory and not in Ducats', () => {
    /*
      The failure the currency reasoning exists to prevent. A bare `4` read as
      Ducats makes a 4-Glory item cost about a fortieth of its price, and the
      roster would validate.
    */
    for (const name of ['Blessings of Beelzebub', 'Regimental Kaşık']) {
      const [row] = rows(name);
      expect(row.cost.ducats, `${name} is not priced in Ducats`).toBe(0);
      expect(row.cost.glory, `${name} has no Glory price`).toBeGreaterThan(0);
    }
  });

  it('keeps them out of a ruleset that does not carry the Dispatch', () => {
    /*
      `github-latest` is the community catalogues as published. The Dispatch is
      a layer, and a layer that leaked into the base would be the app inventing
      rules for a ruleset that does not have them.
    */
    for (const name of ['Blessings of Beelzebub', 'Regimental Kaşık']) {
      expect((base.weapons ?? []).some((w) => w.name === name), name).toBe(false);
      expect((base.armouries ?? []).some((a) => (a.rows ?? []).some((r) => r.name === name)), name)
        .toBe(false);
    }
  });

  it('does not double-stock an item on a rebuild', () => {
    // `addArmouryRow` guards duplicates the same way `add` does: a second row
    // is worse than none, because a player picks one of two prices.
    for (const name of ['Blessings of Beelzebub', 'Regimental Kaşık']) {
      expect(rows(name)).toHaveLength(1);
    }
  });
});
