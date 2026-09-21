/**
 * The prerequisites and exclusions the catalogue states in prose.
 *
 * Driven by the SHIPPED sentences, not by paraphrases of them: these are the
 * exact strings the dataset carries, so a catalogue edit that rewords a rule
 * shows up here as a test that stops matching rather than as a gate that
 * quietly stops gating.
 */
import { describe, it, expect } from 'vitest';
import { DATASET } from '@/data/generated/trenchline.generated';
import { formulaGate, formulaVerdict } from '@/rules/formulaGates';
import { isAlchemicalFormula } from '@/rules/formulae';

/** Every Formula in the ruleset, deduplicated, as the app will pass them. */
const FORMULAE = (() => {
  const byName = new Map<string, { name: string; description?: string }>();
  for (const u of DATASET.units) {
    for (const o of u.options ?? []) {
      if (!isAlchemicalFormula(o)) continue;
      if (!byName.has(o.name)) byName.set(o.name, { name: o.name, description: o.description });
    }
  }
  return [...byName.values()];
})();

const NAMES = FORMULAE.map((f) => f.name);
const shipped = (name: string) => FORMULAE.find((f) => f.name === name)!;

describe('the collection the gates run over', () => {
  it('is all seventeen, Eye Options included', () => {
    // Fifteen before FORM-1; Hawk Eyes and Hypnotic Eyes sit in a sub-group
    // and were not Formulae to `isAlchemicalFormula` until it read the path.
    expect(NAMES).toHaveLength(17);
    expect(NAMES).toEqual(expect.arrayContaining(['Hawk Eyes', 'Hypnotic Eyes']));
  });
});

describe('a prerequisite list', () => {
  it('reads all three names from Gargantuan Size', () => {
    // "Can only be bought if the Homunculus already has the Human Hands,
    //  Inhuman Strength and Massive Size Formulas."
    expect(formulaGate(shipped('Gargantuan Size'), NAMES).requires)
      .toEqual(['Human Hands', 'Inhuman Strength', 'Massive Size']);
  });

  it('refuses until every one of them is held, and then allows', () => {
    const g = shipped('Gargantuan Size');
    expect(formulaVerdict(g, [], NAMES).allowed).toBe(false);
    expect(formulaVerdict(g, ['Human Hands', 'Inhuman Strength'], NAMES).allowed).toBe(false);
    expect(formulaVerdict(g, ['Human Hands', 'Inhuman Strength', 'Massive Size'], NAMES))
      .toEqual({ allowed: true });
  });

  it('refuses with the published sentence, not a sentence of our own', () => {
    const v = formulaVerdict(shipped('Gargantuan Size'), [], NAMES);
    expect(v.reason).toBe(shipped('Gargantuan Size').description);
  });
});

describe('a plain exclusion', () => {
  it('reads Wings off both entries that refuse it', () => {
    // Human Hands: "Cannot be combined with the Wings formula."
    // Massive Size: "This formula cannot be combined with the Wings formula."
    for (const name of ['Human Hands', 'Massive Size']) {
      expect(formulaGate(shipped(name), NAMES).excludes)
        .toEqual([{ name: 'Wings', unless: null }]);
    }
  });

  it('refuses only when the excluded Formula is actually held', () => {
    expect(formulaVerdict(shipped('Human Hands'), [], NAMES).allowed).toBe(true);
    expect(formulaVerdict(shipped('Human Hands'), ['Wings'], NAMES).allowed).toBe(false);
  });
});

describe('an exclusion that names its own exception', () => {
  it('reads both halves, from either side of the pair', () => {
    /*
      The catalogue states it symmetrically, once on each entry:
        Hypnotic Eyes — "Cannot be combined with Hawk Eyes without Two Heads."
        Hawk Eyes     — "Cannot be combined with Hypnotic Eyes without Two Heads."
      So the refusal holds whichever of the two the player reaches for first,
      and neither entry has to know about the other's sentence.
    */
    expect(formulaGate(shipped('Hypnotic Eyes'), NAMES).excludes)
      .toEqual([{ name: 'Hawk Eyes', unless: 'Two Heads' }]);
    expect(formulaGate(shipped('Hawk Eyes'), NAMES).excludes)
      .toEqual([{ name: 'Hypnotic Eyes', unless: 'Two Heads' }]);
  });

  it('refuses the pair from either direction', () => {
    expect(formulaVerdict(shipped('Hawk Eyes'), ['Hypnotic Eyes'], NAMES).allowed).toBe(false);
    expect(formulaVerdict(shipped('Hypnotic Eyes'), ['Hawk Eyes'], NAMES).allowed).toBe(false);
    expect(formulaVerdict(shipped('Hawk Eyes'), ['Hypnotic Eyes', 'Two Heads'], NAMES).allowed)
      .toBe(true);
  });

  it('refuses with Hawk Eyes alone and allows once Two Heads is held', () => {
    const h = shipped('Hypnotic Eyes');
    expect(formulaVerdict(h, [], NAMES).allowed).toBe(true);
    expect(formulaVerdict(h, ['Hawk Eyes'], NAMES).allowed).toBe(false);
    expect(formulaVerdict(h, ['Hawk Eyes', 'Two Heads'], NAMES)).toEqual({ allowed: true });
  });

  it('does not need Two Heads own sentence to say the same thing twice', () => {
    /*
      Two Heads says "This Takwin Homunculus can have both the Hawk Eyes and
      Hypnotic Eyes Alchemical Formulas" — the same rule from the other side.
      Reading it as well would be two mechanisms for one fact, and the one
      that ran last would win when they disagreed. It carries no gate of its
      own, and the exception above still works.
    */
    expect(formulaGate(shipped('Two Heads'), NAMES)).toMatchObject({
      requires: [], excludes: [],
    });
  });
});

describe('a Formula that states no constraint', () => {
  it('gates nothing', () => {
    for (const name of ['Wings', 'Regenerative', 'Terrifying Appearance', 'Startling Speed']) {
      expect(formulaGate(shipped(name), NAMES)).toMatchObject({ requires: [], excludes: [] });
      expect(formulaVerdict(shipped(name), ['Wings', 'Human Hands'], NAMES).allowed).toBe(true);
    }
  });
});

describe('a name the ruleset does not have', () => {
  it('is reported and never enforced as a refusal', () => {
    const invented = {
      name: 'Test',
      description: 'Cannot be combined with the Clockwork Lung formula.',
    };
    const gate = formulaGate(invented, NAMES);
    expect(gate.excludes).toEqual([]);
    expect(gate.unreadable).toEqual(['Clockwork Lung']);

    // A rule this cannot read is not a rule to enforce by guess. The player
    // sees the sentence and applies it themselves.
    const v = formulaVerdict(invented, ['Clockwork Lung'], NAMES);
    expect(v.allowed).toBe(true);
    expect(v.caveat).toBe(invented.description);
  });
});

describe('the ruleset as shipped', () => {
  it('leaves no constraint sentence unread', () => {
    /*
      The survey that would catch a catalogue edit introducing a fifth shape.
      Every Formula whose text talks about combining or prerequisites must
      produce a gate; one that does not is a rule the app has stopped
      enforcing without anyone noticing.
      */
    const talksAboutConstraints = FORMULAE.filter(
      (f) => /cannot be combined|only be bought|only be taken/i.test(f.description ?? ''));
    expect(talksAboutConstraints.map((f) => f.name).sort()).toEqual([
      'Gargantuan Size', 'Hawk Eyes', 'Human Hands', 'Hypnotic Eyes', 'Massive Size',
    ]);
    for (const f of talksAboutConstraints) {
      const gate = formulaGate(f, NAMES);
      expect(gate.requires.length + gate.excludes.length).toBeGreaterThan(0);
      expect(gate.unreadable).toEqual([]);
    }
  });
});
