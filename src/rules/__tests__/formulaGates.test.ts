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

/**
 * The Formulae ONE entry offers, which is what the gate resolves against.
 *
 * The six Homunculus entries do not offer the same list: the Takwin offers
 * Two Heads, the five Golem copies offer Additional Head. Resolving against
 * the ruleset's union finds a Two Heads a Golem can never buy — see the
 * module header — so every test here names the entry it means.
 */
const offeredBy = (unitName: string, pick: (u: typeof DATASET.units[number]) => boolean) => {
  const u = DATASET.units.filter((x) => x.name === unitName).find(pick)!;
  return (u.options ?? []).filter(isAlchemicalFormula)
    .map((o) => ({ name: o.name, description: o.description }));
};

const hasFormula = (name: string) => (u: typeof DATASET.units[number]) =>
  (u.options ?? []).some((o) => isAlchemicalFormula(o) && o.name === name);

/** The Iron Sultanate entry: the one that offers Two Heads. */
const TAKWIN = offeredBy('Homunculus', hasFormula('Two Heads'));
/** A Golem copy: offers Additional Head, and its Eyes still say "Two Heads". */
const GOLEM = offeredBy('Homunculus', hasFormula('Additional Head'));

/** Everything the ruleset has, for the surveys. */
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
/** A Formula as THAT entry prints it — the Eyes text differs between them. */
const on = (entry: typeof TAKWIN, name: string) => entry.find((f) => f.name === name)!;

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

describe('the two Homunculus entries, which do not offer the same Formulae', () => {
  it('differ on the Formula that grants two sets of eyes', () => {
    expect(TAKWIN.map((f) => f.name)).toContain('Two Heads');
    expect(TAKWIN.map((f) => f.name)).not.toContain('Additional Head');
    expect(GOLEM.map((f) => f.name)).toContain('Additional Head');
    expect(GOLEM.map((f) => f.name)).not.toContain('Two Heads');
  });

  it('both say "without Two Heads" on the Eyes, even the one that has no Two Heads', () => {
    expect(on(GOLEM, 'Hawk Eyes').description).toMatch(/without Two Heads/i);
  });

  it('lets a Takwin with Two Heads take the second pair, and refuses without it', () => {
    expect(formulaVerdict(on(TAKWIN, 'Hypnotic Eyes'), ['Hawk Eyes'], TAKWIN).allowed)
      .toBe(false);
    expect(formulaVerdict(on(TAKWIN, 'Hypnotic Eyes'), ['Hawk Eyes', 'Two Heads'], TAKWIN))
      .toEqual({ allowed: true });
  });

  it('lets a GOLEM with Additional Head take the second pair, and refuses without it', () => {
    /*
      The defect this test exists for: resolved against the ruleset, "Two
      Heads" finds a Formula the Golem can never buy, so a Golem holding Hawk
      Eyes and Additional Head was refused Hypnotic Eyes — against the
      sentence printed on the Formula it was holding.
    */
    expect(formulaVerdict(on(GOLEM, 'Hypnotic Eyes'), ['Hawk Eyes'], GOLEM).allowed)
      .toBe(false);
    expect(formulaVerdict(on(GOLEM, 'Hypnotic Eyes'), ['Hawk Eyes', 'Additional Head'], GOLEM))
      .toEqual({ allowed: true });
  });

  it('names Additional Head as the lifter on the Golem entry', () => {
    // Read from the permission Additional Head states, not from its name.
    expect(formulaGate(on(GOLEM, 'Hypnotic Eyes'), GOLEM).excludes)
      .toEqual([{ name: 'Hawk Eyes', unless: 'Additional Head' }]);
  });
});

describe('an exception that resolves to nothing at all', () => {
  it('is a caveat and never an unconditional refusal', () => {
    /*
      The second defect: when the lifter did not resolve, the exclusion was
      pushed with `unless: null` and enforced — turning "cannot be combined
      with X without Y" into "cannot be combined with X". That is the one
      direction of error the header says this avoids, and it cost a player a
      legal purchase.
    */
    const entry = [
      { name: 'Test', description: 'Cannot be combined with Hawk Eyes without Clockwork Skull.' },
      { name: 'Hawk Eyes', description: 'Sees well.' },
    ];
    const gate = formulaGate(entry[0], entry);
    expect(gate.excludes).toEqual([{ name: 'Hawk Eyes', unless: null }]);
    expect(gate.unreadable).toEqual(['Clockwork Skull']);

    const v = formulaVerdict(entry[0], ['Hawk Eyes'], entry);
    expect(v.allowed).toBe(true);
    expect(v.caveat).toBe(entry[0].description);
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
      (f) => /cannot be combined|cannot have the|only be bought|only be taken/i.test(f.description ?? ''));
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
