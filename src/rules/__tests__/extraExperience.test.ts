/**
 * The two rules that grant Experience beyond surviving and a Deed.
 *
 * FD-06d, closing the last of RR-05. Driven against the SHIPPED dataset,
 * because both rules are matched on the text the pipeline derived — if the
 * rulebook extraction ever stops producing those sentences, these tests should
 * fail rather than the app silently stopping paying the points.
 */
import { describe, it, expect } from 'vitest';
import { DATASET } from '@/data/generated/trenchline.generated';
import {
  extraExperienceRules, extraExperienceFor, dieRange, isValidRoll,
  warStoriesRule, warStoriesOffer, warStoriesEligible,
} from '../extraExperience';
import type { Dataset } from '@/types/catalogue';

const D = DATASET as unknown as Dataset;

const skill = (name: string) => ({ name });
const unit = (id: string, skills: { name: string }[] = [], isDead = false) =>
  ({ id, skills, isDead });

describe('Trauma results that grant Experience', () => {
  it('finds exactly one in the shipped table, and it is Bitter Lessons on 65', () => {
    const rules = extraExperienceRules(D);
    expect(rules).toHaveLength(1);
    expect(rules[0].name).toBe('Bitter Lessons');
    expect(rules[0].roll).toBe('65');
  });

  it('reads the die off the row rather than assuming a D3', () => {
    const [rule] = extraExperienceRules(D);
    expect(rule.die).toBe(3);
    expect(rule.fixed).toBeNull();
    expect(dieRange(rule)).toEqual([1, 3]);
  });

  it('keeps the row’s own words, for the panel that asks for the roll', () => {
    const [rule] = extraExperienceRules(D);
    expect(rule.text).toContain('D3 extra Experience Points');
    expect(rule.text).toContain('does not receive an Injury or a Battle Scar');
  });

  it('matches the recorded outcome, which is the row’s description', () => {
    const [rule] = extraExperienceRules(D);
    expect(extraExperienceFor(D, rule.text)?.name).toBe('Bitter Lessons');
  });

  it('still matches when a capture settlement has been appended to it', () => {
    const [rule] = extraExperienceRules(D);
    expect(extraExperienceFor(D, `${rule.text} Ransom of 30 paid.`)?.roll).toBe('65');
  });

  it('says nothing for a result that grants none', () => {
    const hardened = (D.campaign?.trauma ?? []).find((r) => r.name === 'Hardened')!;
    expect(hardened.description).toContain('NEGATE FEAR');
    expect(extraExperienceFor(D, hardened.description)).toBeNull();
  });

  it('says nothing for an empty or missing outcome', () => {
    expect(extraExperienceFor(D, '')).toBeNull();
    expect(extraExperienceFor(D, null)).toBeNull();
    expect(extraExperienceFor(D, undefined)).toBeNull();
  });

  it('accepts only a roll the die could have made', () => {
    const [rule] = extraExperienceRules(D);
    expect([1, 2, 3].every((n) => isValidRoll(rule, n))).toBe(true);
    expect(isValidRoll(rule, 0)).toBe(false);
    expect(isValidRoll(rule, 4)).toBe(false);
    expect(isValidRoll(rule, 1.5)).toBe(false);
  });

  it('finds nothing in a ruleset with no Trauma table', () => {
    expect(extraExperienceRules(null)).toEqual([]);
    expect(extraExperienceFor(undefined, 'anything')).toBeNull();
  });
});

describe('War Stories', () => {
  it('is found in the shipped Skills tables, with its four clauses read from its own text', () => {
    const rule = warStoriesRule(D)!;
    expect(rule.name).toBe('War Stories');
    expect(rule.points).toBe(1);
    /* "each model with the ELITE Keyword" */
    expect(rule.eliteOnly).toBe(true);
    /* "You can't pick the model with the Skill itself" — typographic apostrophe */
    expect(rule.excludesHolder).toBe(true);
    /* "you CAN give" — an offer, which is why the wizard asks */
    expect(rule.optional).toBe(true);
  });

  it('offers nothing when no model in the Warband holds it', () => {
    expect(warStoriesOffer(D, [unit('a'), unit('b', [skill('Show Off')])])).toBeNull();
  });

  it('offers it, and names the holder, when one does', () => {
    const offer = warStoriesOffer(D, [unit('a', [skill('War Stories')]), unit('b')])!;
    expect([...offer.holderIds]).toEqual(['a']);
  });

  it('matches the Skill however the roster spells its case and spacing', () => {
    const offer = warStoriesOffer(D, [unit('a', [skill('  war stories ')])])!;
    expect(offer.holderIds.has('a')).toBe(true);
  });

  /*
    The reason this is derived and never stored: a model that held the Skill
    and died in the game it was holding it is not in the Warband any more.
  */
  it('stops offering it when the holder is dead', () => {
    expect(warStoriesOffer(D, [unit('a', [skill('War Stories')], true)])).toBeNull();
  });

  it('pays every other ELITE model, and not the holder', () => {
    const offer = warStoriesOffer(D, [unit('a', [skill('War Stories')]), unit('b')]);
    expect(warStoriesEligible(offer, 'b', true)).toBe(true);
    expect(warStoriesEligible(offer, 'a', true)).toBe(false);
  });

  it('pays no Troop, because the rule names the ELITE Keyword', () => {
    const offer = warStoriesOffer(D, [unit('a', [skill('War Stories')]), unit('b')]);
    expect(warStoriesEligible(offer, 'b', false)).toBe(false);
  });

  it('pays nobody where there is no offer at all', () => {
    expect(warStoriesEligible(null, 'b', true)).toBe(false);
  });

  /*
    "A Warband can only have one model with this Skill" is a rule about the
    roster, not one this function may assume: two holders excludes both, and
    still pays one point, never two.
  */
  it('excludes every holder where a roster somehow carries two', () => {
    const offer = warStoriesOffer(D, [
      unit('a', [skill('War Stories')]),
      unit('b', [skill('War Stories')]),
      unit('c'),
    ])!;
    expect(offer.holderIds.size).toBe(2);
    expect(warStoriesEligible(offer, 'a', true)).toBe(false);
    expect(warStoriesEligible(offer, 'b', true)).toBe(false);
    expect(warStoriesEligible(offer, 'c', true)).toBe(true);
    expect(offer.rule.points).toBe(1);
  });

  it('finds nothing in a ruleset with no Skills tables', () => {
    expect(warStoriesRule(null)).toBeNull();
    expect(warStoriesOffer(undefined, [unit('a', [skill('War Stories')])])).toBeNull();
  });
});
