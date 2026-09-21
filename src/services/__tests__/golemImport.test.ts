/**
 * The Golem, found on the owner's own roster.
 *
 * FD-13b end to end: the real file, through the real importer, through the
 * rules module — no hand-built fixture anywhere in it. This is the test the
 * design asked for, and it is the one that proves the identification works on
 * a roster somebody actually plays rather than on a model shaped to pass.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { DATASET } from '@/data/generated/trenchline.generated';
import { recruitable } from '@/rules/recruitable';
import { importNewRecruitRoster } from '../newRecruitImporter';
import { golemOnImport, golemGrant } from '@/rules/golem';
import type { Dataset } from '@/types/catalogue';

const D = DATASET as unknown as Dataset;
const KNOWN = recruitable(D, 'iron-sultanate',
  (D.armouries ?? []).map((a: { factionId: string }) => a.factionId)).units;

const importFixture = (name: string) => importNewRecruitRoster(
  fs.readFileSync(
    path.join(process.cwd(), 'data-sources/fixtures/newrecruit', name), 'utf8'),
  KNOWN as never,
);

describe('the August export', () => {
  const res = importFixture('al-qarn-rihla-august.json');

  it('imports with nothing unmatched', () => {
    expect(res.unmatched).toEqual([]);
  });

  it('reports the Book of Golems among what the Warband holds', () => {
    expect(res.campaignRules).toContain('Book of Golems');
  });

  /*
    The design names this model. It is reached here by the grant's own
    clauses — never Promoted, and Formulas within the free budget — rather
    than by its name, so the test would still find it if the owner renamed it.
  */
  it('identifies Al-Mudawwan as the Golem, and says why', () => {
    const v = golemOnImport(D, res.campaignRules, res.warband.units as never);
    expect(v.index).not.toBeNull();
    expect((v as { name: string }).name).toMatch(/Mudawwan/);
    expect(v.reason).toContain('Human Hands');
    /* The budget, to the Ducat, off the catalogue's own Formula prices. */
    expect(v.reason).toMatch(/50 Ducats of Formulas, within the grant's 50/);
    expect(v.reason).toMatch(/has not been Promoted/);
  });

  it('does not pick the promoted Homunculus', () => {
    const v = golemOnImport(D, res.campaignRules, res.warband.units as never);
    expect((v as { name?: string }).name ?? '').not.toMatch(/Masyukh/);
  });
});

describe('a roster that holds no such reward', () => {
  const res = importFixture('al-qarn-rihla-august.json');

  it('marks nobody, and says that is why', () => {
    const v = golemOnImport(D, ['Reroll'], res.warband.units as never);
    expect(v.index).toBeNull();
    expect(v.reason).toMatch(/does not hold the Book of Golems/i);
  });
});

describe('the grant this all rests on', () => {
  it('is the one the rulebook states', () => {
    const g = golemGrant(D)!;
    expect(g.freeFormulaDucats).toBe(50);
    expect(g.startsWith).toBe('Human Hands');
    expect(g.neverPromoted).toBe(true);
  });
});
