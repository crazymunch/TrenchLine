/**
 * GOLEM-1: the Book of Golems actually marks a model.
 *
 * `golemOnImport` was built with the rules in #95 and then had no caller at
 * all — nothing in the app ever wrote `grantedBy: 'Book of Golems'` — so the
 * grant's free-Formula allowance was unreachable, *"can never be Promoted"*
 * never fired and `golemKeywords` had no live effect.
 *
 * Driven off the owner's own September export, which holds the Book and two
 * Homunculi, because that is the roster the rule has to be right about.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { DATASET } from '@/data/generated/trenchline.generated';
import { recruitable } from '@/rules/recruitable';
import { importNewRecruitRoster } from '../newRecruitImporter';
import { golemGrant, isGolem, GOLEM_GRANTED_BY } from '@/rules/golem';
import { formulaShelf } from '@/rules/formulaShelf';
import { catalogueUnitFor } from '@/rules/catalogueUnit';
import { canBePromoted } from '@/rules/promotions';
import type { Dataset } from '@/types/catalogue';
import type { ActiveUnit } from '@/types/warband';

const D = DATASET as unknown as Dataset;
const KNOWN = recruitable(D, 'iron-sultanate',
  (D.armouries ?? []).map((a: { factionId: string }) => a.factionId)).units;
const GRANT = golemGrant(D)!;

const read = (file: string) => fs.readFileSync(
  path.join(process.cwd(), 'data-sources/fixtures/newrecruit', file), 'utf8');

const september = () => importNewRecruitRoster(
  read('al-qarn-rihla-september.json'), KNOWN as never, D);

const by = (res: ReturnType<typeof september>, name: string) =>
  res.warband.units.find((u) => u.customName === name)!;

describe('marking the Golem on import', () => {
  const res = september();

  it('marks the one model the roster can say the grant created', () => {
    /*
      forces[0].selections[12], Al-Mudawwan — the link the Iron Sultanate
      catalogue comments "Golem From Book". The roster does not say so
      directly; `golemCandidates` reads it from what the model holds.
    */
    expect(isGolem(by(res, 'Al-Mudawwan, the Inscribed'))).toBe(true);
    expect(by(res, 'Al-Mudawwan, the Inscribed').grantedBy).toBe(GOLEM_GRANTED_BY);
  });

  it('leaves the Takwin unmarked', () => {
    expect(isGolem(by(res, 'Al-Masyukh, Hunter of Hunters'))).toBe(false);
    expect(by(res, 'Al-Masyukh, Hunter of Hunters').grantedBy).toBeUndefined();
  });

  it('marks exactly one model on the roster', () => {
    expect(res.warband.units.filter(isGolem)).toHaveLength(1);
  });

  it('keeps the reason, and the campaign rules, for the builder to read', () => {
    expect(res.golem?.markedIndex).not.toBeNull();
    expect(res.golem?.reason).toMatch(new RegExp(GRANT.name, 'i'));
    /* Persisted on the Warband, not only returned: the builder's own Book of
       Golems action is offered on the strength of it. */
    expect(res.warband.campaignRules).toContain(GRANT.name);
  });

  it('marks nothing where the roster does not hold the grant', () => {
    const noRules = importNewRecruitRoster(
      read('al-qarn-rihla-september.json').replace(/Book of Golems/g, 'Some Other Find'),
      KNOWN as never, D);
    expect(noRules.warband.units.filter(isGolem)).toHaveLength(0);
    expect(noRules.golem?.markedIndex).toBeNull();
  });

  it('marks nothing when the importer is given no ruleset', () => {
    // The grant lives in the dataset's Exploration table; without it the rule
    // cannot be found, and a guess would hand a free 50 Ducats to a model.
    const blind = importNewRecruitRoster(read('al-qarn-rihla-september.json'), KNOWN as never);
    expect(blind.warband.units.filter(isGolem)).toHaveLength(0);
  });
});

describe('what the mark then does', () => {
  const res = september();
  const golem = by(res, 'Al-Mudawwan, the Inscribed');

  it('spends the free allowance, counting the grant’s own Formula as given', () => {
    /*
      The model's upgrades sum to 60 — Enslaved Mind 10, Human Hands 10,
      Inhuman Strength 15, Additional Arm 15, Hawk Eyes 10 — and Human Hands
      is what the grant HANDS OVER: "It has the Human Hands Alchemical
      Formula, PLUS Alchemical Formulas worth a total of up to 50 👑". The
      other four sum to exactly the allowance.

      Before GOLEM-1 the spend counted Human Hands too, read 60 against 50,
      and `Math.max(0, …)` clamped the −10 out of sight. A Golem that had
      spent LESS was simply told it had 10 Ducats less than the grant gives.
    */
    const shelf = formulaShelf(D, {
      unit: golem,
      catalogueUnit: catalogueUnitFor(D, golem, 'iron-sultanate'),
      alchemistAlive: null,
      isTakwin: true,
    });
    expect(shelf.freeBudgetLeft).toBe(0);

    const spent = (golem.specialUpgrades ?? [])
      .filter((u) => u.name !== GRANT.startsWith)
      .reduce((n, u) => n + (u.cost ?? 0), 0);
    expect(spent).toBe(GRANT.freeFormulaDucats);
  });

  it('is out of the promotion pool, refused on the GRANT’s own sentence', () => {
    /*
      Refused for the right reason, not merely refused: both Homunculi are
      short of the Experience a Promotion needs, so "eligible: false" alone
      would pass whether the mark did anything or not. `reason` is what says
      the grant is what stopped it.
    */
    expect(GRANT.neverPromoted).toBe(true);
    const verdict = canBePromoted(D, golem as ActiveUnit, res.warband as never);
    expect(verdict.eligible).toBe(false);
    expect(verdict.reason).toBe('granted-ally');
    expect(verdict.detail).toMatch(new RegExp(GRANT.name, 'i'));

    // The model beside it, off the same entry, is judged on its own merits.
    const takwin = by(res, 'Al-Masyukh, Hunter of Hunters');
    expect(canBePromoted(D, takwin as ActiveUnit, res.warband as never).reason)
      .not.toBe('granted-ally');
  });
});
