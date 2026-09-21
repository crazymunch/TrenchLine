/**
 * A Takwin Homunculus whose Alchemist has died.
 *
 * FD-13b, built from the sentence the book actually carries (Warbands L5294 to
 * L5302) rather than the Re-creation offer the design asked for, which no
 * source in this repository contains — see the module's own note.
 */
import { describe, it, expect } from 'vitest';
import { DATASET } from '@/data/generated/trenchline.generated';
import { takwinRestrictions, takwinRuleText, takwinAllowance } from '../takwin';
import type { Dataset } from '@/types/catalogue';

const D = DATASET as unknown as Dataset;

describe('the rule’s own sentence', () => {
  it('names all three restrictions, whether from the dataset or the book', () => {
    const { text } = takwinRuleText(D);
    expect(text).toMatch(/cannot be deployed/i);
    expect(text).toMatch(/Battlekit cannot be changed/i);
    expect(text).toMatch(/no Alchemical Formulas can be applied/i);
  });

  /* A quotation either way, and the caller can tell which. */
  it('says whether it found the text in the dataset or fell back to the book', () => {
    expect(typeof takwinRuleText(D).found).toBe('boolean');
    expect(takwinRuleText(null).found).toBe(false);
    expect(takwinRuleText(null).text).toMatch(/associated Alchemist is killed/i);
  });
});

describe('what a Takwin may no longer do', () => {
  it('is nothing at all while its Alchemist lives', () => {
    const r = takwinRestrictions(D, { isTakwin: true, alchemistAlive: true });
    expect(r.cannotDeploy).toBe(false);
    expect(r.battlekitLocked).toBe(false);
    expect(r.noFormulas).toBe(false);
  });

  it('is all three once the Alchemist is dead, with the sentence as the reason', () => {
    const r = takwinRestrictions(D, { isTakwin: true, alchemistAlive: false });
    expect(r.cannotDeploy).toBe(true);
    expect(r.battlekitLocked).toBe(true);
    expect(r.noFormulas).toBe(true);
    expect(r.reason).toMatch(/cannot be deployed/i);
  });

  /*
    An unassociated Homunculus is the case the book's LAST sentence covers —
    a new Alchemist must be associated with one — not a model to bench. A
    model the importer could not match must not be silently taken out of the
    game on a guess.
  */
  it('does not bench a model whose association is simply unrecorded', () => {
    const r = takwinRestrictions(D, { isTakwin: true, alchemistAlive: null });
    expect(r.cannotDeploy).toBe(false);
  });

  it('says nothing about a model that is not a Takwin', () => {
    const r = takwinRestrictions(D, { isTakwin: false, alchemistAlive: false });
    expect(r.cannotDeploy).toBe(false);
  });
});

describe('how many Takwin a Warband may field', () => {
  /* "one Takwin Homunculus for each Jabirean Alchemist in the Warband" */
  it('is one per Alchemist', () => {
    expect(takwinAllowance(0)).toBe(0);
    expect(takwinAllowance(2)).toBe(2);
  });

  it('never goes negative or fractional', () => {
    expect(takwinAllowance(-3)).toBe(0);
    expect(takwinAllowance(1.7)).toBe(1);
    expect(takwinAllowance(NaN)).toBe(0);
  });
});
