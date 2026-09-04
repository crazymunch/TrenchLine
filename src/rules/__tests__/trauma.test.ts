/**
 * The Trauma Table, checked against what the book prints.
 *
 * `FEATURES.md` carried this as "table needs verification against rulebook"
 * for months. It is derived — 22 rows, from the campaign catalogue with the
 * rulebook filling the four results that attach nothing to a model — but being
 * derived is not the same as being right, and reading it against the page
 * turned up two rows that were wrong in ways nobody would notice by eye.
 *
 * Both mattered at a table, which is why they are pinned individually rather
 * than by a count.
 */
import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';

const trauma = (DATASET as unknown as {
  campaign?: { trauma?: { roll: string; name: string; description: string; source: string }[] };
}).campaign?.trauma ?? [];

const row = (roll: string) => trauma.find((r) => r.roll === roll);

describe('the Trauma Table', () => {
  it('covers every D66 result, with the rolls the book prints', () => {
    expect(trauma.length).toBeGreaterThan(0);
    expect(trauma.map((r) => r.roll)).toEqual([
      '11', '12', '13', '14', '15', '16',
      '21', '22', '23', '24', '25', '26',
      '31', '32', '33', '34', '35', '36',
      '41-63', '64', '65', '66',
    ]);
  });

  it('names them as the book does', () => {
    expect(row('11')!.name).toBe('Dead');
    expect(row('12')!.name).toBe('Captured');
    expect(row('41-63')!.name).toBe('Full Recovery');
    expect(row('66')!.name).toBe('Prominent Scar');
  });
});

describe('12 Captured — the row that was cut at a comma', () => {
  /*
    It ended "…transfer the 👑 from your Strongbox to your opponent’s," and
    stopped. The clause it lost is the one that says what PAYING achieves, so a
    player who paid the ransom would have gone on to remove the model anyway —
    having just bought it back.

    The cause was a six-line window on the rulebook reader; this row is eight.
  */
  it('says what happens when the ransom is paid', () => {
    const d = row('12')!.description;
    expect(d).toMatch(/treat this result as a Full Recovery/i);
    expect(d).toMatch(/Continue with the Trauma Step/i);
  });

  it('and does not stop mid-sentence', () => {
    expect(row('12')!.description.trim()).toMatch(/\.$/);
  });
});

describe('65 Bitter Lessons — the row that ran on into the next one', () => {
  /*
    The catalogue has the entry but no Description, so the rulebook reader
    supplied it — and over-read. The book prints `66` alone on its line with
    `Prominent Scar` beneath, and the boundary test required something after
    the digits, so row 65 swallowed row 66's heading and half of its rule.

    A player rolling 65 was shown a rule about writing down an enemy Warband's
    name and gaining +1 DICE against them. That is 66's rule. 65 gives D3
    Experience.
  */
  it('is the rule the book gives 65', () => {
    const d = row('65')!.description;
    expect(d).toMatch(/D3 extra Experience Points/i);
    expect(d).toMatch(/does not receive an Injury or a Battle Scar/i);
  });

  it('does not carry 66’s heading or rule', () => {
    const d = row('65')!.description;
    expect(d).not.toMatch(/Prominent Scar/i);
    expect(d).not.toMatch(/Write down the name of the Warband/i);
    expect(d).not.toMatch(/\b66\b/);
  });

  it('and 66 still has its own', () => {
    const d = row('66')!.description;
    expect(d).toMatch(/Write down the name of the Warband/i);
    expect(d).toMatch(/\+1 DICE to rolls for Melee Attacks/i);
  });
});

describe('every row', () => {
  it('carries rules text a player can act on', () => {
    // An injury with no text is one a player cannot apply.
    for (const r of trauma) {
      expect(r.description.trim().length, `${r.roll} ${r.name}`).toBeGreaterThan(20);
    }
  });

  it('never stops on a comma or a dangling conjunction', () => {
    /*
      The shape of the `12 Captured` bug, generalised. The build fails on it
      too — `parse-campaign.mjs` — so this is the second line rather than the
      only one.
    */
    for (const r of trauma) {
      expect(r.description.trim(), `${r.roll} ${r.name}`)
        .not.toMatch(/[,;–—]$|\s(and|or|the|a|to|with|from|for|of|if)$/i);
    }
  });

  it('never carries another row’s heading', () => {
    for (const r of trauma) {
      for (const other of trauma) {
        if (other === r) continue;
        expect(r.description, `${r.roll} carries ${other.roll} ${other.name}`)
          .not.toContain(`${other.roll} ${other.name}`);
      }
    }
  });

  it('records which source it came from, because the two are not equal', () => {
    for (const r of trauma) {
      expect(['catalogue', 'rulebook', 'catalogue+rulebook'], `${r.roll} ${r.name}`)
        .toContain(r.source);
    }
  });
});
