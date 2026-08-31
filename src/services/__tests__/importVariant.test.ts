/**
 * The Warband Variant survives an import.
 *
 * Reported from a real roster: a House of Wisdom Warband came back with two
 * errors it does not have — "Jabirean Alchemist: 2 taken, limit is 1" and
 * "must include 1 Yüzbaşı Captain". Both are the *standard* Iron Sultanate
 * list's rules. The export states `Warband Variant > The House of Wisdom`; the
 * importer skipped that node as Configuration and never set `variantId`, so
 * every imported roster was checked against the wrong list.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { DATASET } from '@/data/generated/trenchline.generated';
import { variantById } from '@/rules/variants';
import { variantLimits } from '@/rules/validate';
import { satisfiesOnlyFor } from '@/rules/restrictions';

const FIXTURE = path.join(process.cwd(),
  'data-sources/fixtures/al-qarn-rihla/04-august-1320d-CURRENT.json');

describe('the Variant named by a NewRecruit export', () => {
  it('is stated in the fixture, so there is something to lose', () => {
    const raw = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
    const sels = raw.roster.forces[0].selections as { name: string; selections?: { name: string }[] }[];
    const node = sels.find((s) => s.name === 'Warband Variant');
    expect(node, 'the export has no Warband Variant node').toBeDefined();
    expect(node!.selections?.[0]?.name).toBe('The House of Wisdom');
  });

  it('resolves to the Variant in the dataset', () => {
    // Stored as the name; `variantById` matches on id or name.
    const v = variantById(DATASET, 'The House of Wisdom');
    expect(v, 'the House of Wisdom is not in the dataset').toBeDefined();
    expect(v!.ops.length, 'the Variant carries no ops').toBeGreaterThan(0);
  });
});

describe('what the Variant changes for that roster', () => {
  const v = variantById(DATASET, 'The House of Wisdom');
  const unit = (name: string) => DATASET.units.find((u) => u.name === name)!;

  it('raises the Jabirean Alchemist limit past the base 1', () => {
    const base = unit('Jabirean Alchemist');
    expect(base.max, 'the base list is 0-1').toBe(1);
    const withVariant = variantLimits(base, v);
    expect(withVariant.max, 'the House of Wisdom allows a second Alchemist')
      .toBeGreaterThan(1);
  });

  it('drops the Yüzbaşı Captain requirement the standard list imposes', () => {
    const cap = unit('Yüzbaşı Captain');
    expect(cap.min, 'the base list requires one').toBe(1);
    // The Variant forbids the Yüzbaşı outright, so it cannot also be required.
    const forbidden = (v!.ops ?? []).some((o) =>
      (o as { field?: string; value?: string; target?: { name?: string } }).field === 'hidden'
      && String((o as { value?: string }).value) === 'true'
      && (o as { target?: { name?: string } }).target?.name === 'Yüzbaşı Captain');
    const relaxed = variantLimits(cap, v).min !== 1;
    expect(forbidden || relaxed,
      'the House of Wisdom neither forbids nor un-requires the Yüzbaşı').toBe(true);
  });
});

describe('a weapon an Armoury row calls exclusive', () => {
  /*
    Reported from the same roster: "Homunculus cannot take Titan Zulfiqar —
    Brazen Bull only." The Armoury row's prose is a shorthand. The catalogue
    reveals the Titan Zulfiqar to a model that is a Brazen Bull **or** has the
    Gargantuan Size Alchemical Formula, and the rulebook says so in words:
    "The Homunculus can use 1 Weapon that can usually only be taken by a
    Brazen Bull."
  */
  const zulfiqar = DATASET.weapons.find((w) => w.name === 'Titan Zulfiqar')!;

  it('carries the catalogue conditions, not just the prose', () => {
    expect(zulfiqar.unlockedBy?.sort()).toEqual(['Brazen Bull', 'Gargantuan Size']);
  });

  it('still rejects a model with neither', () => {
    const kavass = { name: 'Kavass', keywords: [], roles: ['Troop'] };
    expect(satisfiesOnlyFor('Brazen Bull', kavass,
      { selections: [], unlockedBy: zulfiqar.unlockedBy })).toBe(false);
  });

  it('accepts the Brazen Bull by name, as before', () => {
    expect(satisfiesOnlyFor('Brazen Bull', { name: 'Brazen Bull' })).toBe(true);
  });

  it('accepts a Homunculus that has Gargantuan Size', () => {
    const homunculus = { name: 'Takwin Homunculus', keywords: [], roles: ['Elite'] };
    expect(satisfiesOnlyFor('Brazen Bull', homunculus,
      { selections: ['Massive Size', 'Gargantuan Size'], unlockedBy: zulfiqar.unlockedBy }))
      .toBe(true);
  });

  it('does not let an unrelated upgrade unlock it', () => {
    // Only names the entry itself names count.
    const homunculus = { name: 'Takwin Homunculus', keywords: [], roles: ['Elite'] };
    expect(satisfiesOnlyFor('Brazen Bull', homunculus,
      { selections: ['Hawk Eyes', 'Human Hands'], unlockedBy: zulfiqar.unlockedBy }))
      .toBe(false);
  });
});
