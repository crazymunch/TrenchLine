/**
 * Roll 12: the one Trauma result the table does not decide.
 *
 * `docs/RULES-COVERAGE-AUDIT.md` RC-04. The wizard set `isDead` only where the
 * row's name was exactly `Dead`, so a captured model came out of the Trauma
 * Step alive, uninjured and with the ransom unpaid — "the existing automatic
 * survivor result has no basis in the unresolved rule".
 *
 * Two branches, and the app was silently picking the survivable one. It cannot
 * pick either: the negotiation happens between two people at a table. What it
 * can do is refuse to commit a step whose outcome nobody has stated, which is
 * what these tests pin.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import { captureRules, captureRuleIn, captureOutcome } from '../capture';

const RULE = captureRules(DATASET)[0];

describe('finding the rule at all', () => {
  it('is found by what the row says, not by the roll or the name', () => {
    /*
      "Before continuing the Trauma Step". A Dispatch that adds a second
      deferring result, or renames this one, needs no code change — and a build
      that loses the sentence stops FINDING the rule rather than quietly
      stopping enforcing it.
    */
    expect(captureRules(DATASET)).toHaveLength(1);
    expect(RULE.roll).toBe('12');
    expect(RULE.name).toBe('Captured');
  });

  it('reads both branches off the row', () => {
    expect(RULE.removesIfUnpaid).toBe(true);
    expect(RULE.paidIsFullRecovery).toBe(true);
    expect(RULE.paidFromStrongbox).toBe(true);
  });

  it('finds nothing on a ruleset whose table does not defer', () => {
    // Rule 2. No table, no rule — not a rule invented from the roll number.
    const empty = { ...DATASET, campaign: { ...DATASET.campaign, trauma: [] } };
    expect(captureRules(empty as typeof DATASET)).toEqual([]);
  });

  it('recognises the outcome the wizard actually records', () => {
    const recorded = `D66: 12 - ${RULE.name}: ${RULE.text}`;
    expect(captureRuleIn(DATASET, recorded)?.roll).toBe('12');
  });

  it('does not fire on a player’s narrative note that says "captured"', () => {
    // Matched on the row's text, not its name: "Captured a trench" is prose.
    expect(captureRuleIn(DATASET, 'Captured a trench and held it')).toBeNull();
    expect(captureRuleIn(DATASET, 'D66: 33 - Lost Eye: ...')).toBeNull();
  });
});

describe('what each branch does', () => {
  it('removes the model when the ransom is not paid', () => {
    const out = captureOutcome(RULE, 'executed');
    expect(out.removed).toBe(true);
    expect(out.fullRecovery).toBe(false);
    expect(out.ransom).toBe(0);
    expect(out.text).toContain('removed');
  });

  it('is a Full Recovery when it is paid — no injury, no scar', () => {
    const out = captureOutcome(RULE, 'ransomed', 50);
    expect(out.removed).toBe(false);
    expect(out.fullRecovery).toBe(true);
    expect(out.ransom).toBe(50);
    expect(out.text).toContain('50 Ducats');
  });

  it('allows a ransom of nothing, because the rule says "can negotiate"', () => {
    const out = captureOutcome(RULE, 'ransomed', 0);
    expect(out.fullRecovery).toBe(true);
    expect(out.ransom).toBe(0);
    expect(out.text).not.toContain('0 Ducats');
  });

  it('refuses a ransom that is not a number of Ducats', () => {
    expect(() => captureOutcome(RULE, 'ransomed', -5)).toThrow(RangeError);
    expect(() => captureOutcome(RULE, 'ransomed', 2.5)).toThrow(RangeError);
  });
});

describe('a table that no longer states a branch', () => {
  /*
    Loudly, not survivably. If the row stops saying what an unpaid ransom does,
    this app does not know what an unpaid ransom does — and the quiet version of
    that, choosing the branch where the model lives, is the finding itself.
  */
  it('throws rather than assuming the model survives', () => {
    expect(() => captureOutcome({ ...RULE, removesIfUnpaid: false }, 'executed'))
      .toThrow(/no longer states what an unpaid ransom does/);
  });

  it('throws rather than assuming a paid ransom heals', () => {
    expect(() => captureOutcome({ ...RULE, paidIsFullRecovery: false }, 'ransomed', 10))
      .toThrow(/no longer states what a paid ransom does/);
  });
});
