/**
 * ID-1: which catalogue entry a model on a roster is an instance of.
 *
 * Driven off the owner's own September export, because the collision this
 * exists to fix is in that file: two Takwin Homunculi, one shared catalogue
 * entry, and six dataset units called `Homunculus`.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { DATASET } from '@/data/generated/trenchline.generated';
import { recruitable } from '@/rules/recruitable';
import { importNewRecruitRoster } from '@/services/newRecruitImporter';
import { isAlchemicalFormula } from '../formulae';
import { catalogueUnitFor } from '../catalogueUnit';
import type { Dataset, UnitOption } from '@/types/catalogue';
import type { ActiveUnit } from '@/types/warband';

const D = DATASET as unknown as Dataset;
const KNOWN = recruitable(
  D, 'iron-sultanate', (D.armouries ?? []).map((a: { factionId: string }) => a.factionId)).units;

const september = () => importNewRecruitRoster(
  fs.readFileSync(path.join(
    process.cwd(), 'data-sources/fixtures/newrecruit/al-qarn-rihla-september.json'), 'utf8'),
  KNOWN as never);

/** The Iron Sultanate's own Homunculus, which is what both links target. */
const SULTANATE_ID = '02c4-88da-ec78-8a33';

const formulae = (u: { options?: UnitOption[] } | undefined) =>
  (u?.options ?? []).filter(isAlchemicalFormula).map((o) => o.name);

describe('six entries are called Homunculus', () => {
  it('and a bare name lookup answers with the wrong one', () => {
    const named = D.units.filter((u) => u.name === 'Homunculus');
    expect(named.length).toBeGreaterThan(1);
    // The failure exactly as it stood: `find` takes the first.
    expect(named[0].factionId).toBe('Court of the Seven-Headed Serpent');
    expect(named[0].id).not.toBe(SULTANATE_ID);
  });

  it('and the wrong one offers different Formulae, which FORM-4 resolves against', () => {
    const court = D.units.find((u) => u.id === named0())!;
    const sultanate = D.units.find((u) => u.id === SULTANATE_ID)!;
    function named0() {
      return D.units.filter((u) => u.name === 'Homunculus')[0].id;
    }
    expect(formulae(court)).toContain('Additional Head');
    expect(formulae(court)).not.toContain('Two Heads');
    expect(formulae(sultanate)).toContain('Two Heads');
    expect(formulae(sultanate)).not.toContain('Additional Head');
    // And the Eye Options on BOTH entries say "without Two Heads", so the
    // Court's entry cannot resolve its own exception.
    expect(formulae(sultanate)).toContain('Regenerative Tissue');
    expect(formulae(court)).toContain('Regenerative');
  });
});

describe('the September export’s two Homunculi', () => {
  const res = september();
  const by = (name: string) => res.warband.units.find((u) => u.customName === name)!;

  /*
    The file carries them at forces[0].selections[7] and [12]:

      da5c-280f-9d08-42b4::2f82-e47f-c162-9152   Al-Masyukh
      8891-b3fa-58ca-f1fc::2f82-e47f-c162-9152   Al-Mudawwan

    Two links, ONE shared entry. Both links are in `Iron Sultanate.cat`
    (L7389 and L7368) and both target `2f82-e47f-c162-9152`, which is that
    catalogue's Homunculus. The link chooses the provenance — the catalogue
    comments them "Wisdom One" and "Golem From Book" — not the entry, and the
    app records provenance as `grantedBy`.
  */
  it('both carry the shared entry id the file gives them', () => {
    expect(by('Al-Masyukh, Hunter of Hunters').baseProfileId)
      .toBe('2f82-e47f-c162-9152');
    expect(by('Al-Mudawwan, the Inscribed').baseProfileId)
      .toBe('2f82-e47f-c162-9152');
  });

  it('both resolve to the Iron Sultanate entry, not the Court’s', () => {
    for (const name of ['Al-Masyukh, Hunter of Hunters', 'Al-Mudawwan, the Inscribed']) {
      const entry = catalogueUnitFor(D, by(name) as unknown as ActiveUnit, 'iron-sultanate');
      expect(entry?.id).toBe(SULTANATE_ID);
      expect(entry?.factionId).toBe('Iron Sultanate');
      expect(formulae(entry)).toContain('Two Heads');
      expect(formulae(entry)).not.toContain('Additional Head');
    }
  });
});

describe('how it resolves', () => {
  const sultanate = D.units.find((u) => u.id === SULTANATE_ID)!;

  it('takes the dataset id where a warband built in the app has one', () => {
    const unit = { baseProfileId: SULTANATE_ID, profileSnapshot: { name: 'Homunculus' } };
    expect(catalogueUnitFor(D, unit)?.id).toBe(SULTANATE_ID);
  });

  it('takes the entry id where an import wrote one', () => {
    const unit = { baseProfileId: sultanate.entryId, profileSnapshot: { name: 'Homunculus' } };
    expect(catalogueUnitFor(D, unit)?.id).toBe(SULTANATE_ID);
  });

  it('falls back to the name WITHIN the faction, not to the first match', () => {
    // Hydration re-keys the catalogue, so a saved warband's id is the
    // store's and not the dataset's; the name has to carry it.
    const unit = {
      baseProfileId: 'a-hydrated-id-the-dataset-never-had',
      profileSnapshot: { name: 'Homunculus', factionId: 'iron-sultanate' },
    };
    expect(catalogueUnitFor(D, unit)?.id).toBe(SULTANATE_ID);
  });

  it('uses the warband’s faction where the model does not state its own', () => {
    const unit = { baseProfileId: 'unknown', profileSnapshot: { name: 'Homunculus' } };
    expect(catalogueUnitFor(D, unit, 'iron-sultanate')?.id).toBe(SULTANATE_ID);
    expect(catalogueUnitFor(D, unit, 'trench-pilgrims')?.factionId).toBe('Trench Pilgrims');
  });

  it('still answers for a name no faction of ours claims', () => {
    // A Mercenary sits on a roster whose faction is not its own; a
    // wrong-faction match beats no entry at all for a name that is unique.
    const unit = { baseProfileId: 'unknown', profileSnapshot: { name: 'Homunculus' } };
    expect(catalogueUnitFor(D, unit, 'no-such-faction')).toBeDefined();
  });

  it('answers with nothing rather than a guess where there is no model', () => {
    expect(catalogueUnitFor(D, null)).toBeUndefined();
    expect(catalogueUnitFor(D, { baseProfileId: 'nope' })).toBeUndefined();
  });
});
