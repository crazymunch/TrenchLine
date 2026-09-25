/**
 * The Trauma Step, against the real dataset.
 *
 * Reported by Codex's rules-coverage audit (RC-01, RC-02, RC-03, RC-05). The
 * app offered every casualty a D66 roll on the Trauma Table, so a Troop — who
 * by the book takes one D6 and dies on a 1-2 — drew instead from 36 results of
 * which one is Dead. And it awarded an Experience Point to every model on the
 * roster, unconditionally, including models it had just recorded as dead and
 * models carrying the one injury that forbids Experience outright.
 *
 * Tested against `DATASET` rather than a fixture, for the same reason the Papal
 * States tests are: the whole failure was that the procedure existed only as
 * prose nothing read. A fixture asserting the numbers I typed would pass
 * whether or not the pipeline derives them.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DATASET } from '@/data/generated/trenchline.generated';
import type { ActiveUnit } from '@/types/warband';
import {
  traumaProcedure, eliteVerdict, casualtyRoute, survivalOutcome, rollSurvival,
  scarCount, unfitForDuty, alreadySuffered, earnsExperience, xpBarringInjuries,
  barsExperience, traumaWriteFor, traumaRowIn, traumaRecords,
} from '../trauma';

const PROC = traumaProcedure(DATASET)!;

/** A rostered model. Only the fields these rules read are filled in. */
const unit = (over: Partial<ActiveUnit> & {
  category?: string; elite?: boolean;
} = {}): ActiveUnit => {
  const { category = 'Trooper', elite, ...rest } = over;
  return {
    id: 'u1',
    customName: 'Test',
    baseProfileId: 'p1',
    profileSnapshot: {
      id: 'p1', name: 'Test', factionId: 'new-antioch',
      category, baseCost: 0,
      stats: { movement: '6"', ranged: '', melee: '', armour: '', keywords: [] },
      ...(elite === undefined ? {} : { elite }),
    },
    equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
    xp: 0, advancements: [], injuries: [], isDead: false, totalCost: 0,
    currentWounds: 1, maxWounds: 1, bloodMarkers: 0,
    status: 'Active', hasActedThisTurn: false,
    ...rest,
  } as unknown as ActiveUnit;
};

describe('the derived procedure', () => {
  it('is on the dataset at all, which it was not before', () => {
    expect(PROC).toBeTruthy();
  });

  it('gives Troops one D6, dead on 1-2 and alive on 3+', () => {
    expect(PROC.troops.die).toBe('D6');
    expect(PROC.troops.deadUpTo).toBe(2);
    expect(PROC.troops.survivesFrom).toBe(3);
  });

  it('defines a Troop by the Keyword, not by a roster role', () => {
    expect(PROC.troops.definition).toBe(
      'Troops are any models in your Warband that do not have the ELITE Keyword.');
  });

  it('sends ELITE models to the D66 table, and retires them at three scars', () => {
    expect(PROC.elite.die).toBe('D66');
    expect(PROC.battleScars.unfitAt).toBe(3);
    expect(PROC.battleScars.eliteOnly).toBe(true);
  });

  it('carries the rule text, not only the numbers', () => {
    // A screen that removes a model from a roster has to be able to say why,
    // in the book's words rather than the app's paraphrase.
    expect(PROC.battleScars.unfitText).toContain('third Battle Scar');
    expect(PROC.duplicateInjury.text).toContain('make the D66 roll for the model');
  });

  it('does not carry the scrambled sidebar reprint that follows it', () => {
    // The extraction repeats the passage twice more, typos and all. An earlier
    // pass swallowed one into the final section.
    for (const t of Object.values(PROC).map((v) => JSON.stringify(v))) {
      expect(t).not.toContain('Unify for Duty');
      expect(t).not.toContain('unles’s');
    }
  });
});

describe('who counts as ELITE', () => {
  it('believes the snapshot over everything else', () => {
    expect(eliteVerdict(unit({ elite: true, category: 'Trooper' })))
      .toMatchObject({ elite: true, basis: 'snapshot', needsConfirmation: false });
    expect(eliteVerdict(unit({ elite: false, category: 'Elite' })))
      .toMatchObject({ elite: false, basis: 'snapshot' });
  });

  it('treats a model promoted in the app as ELITE', () => {
    expect(eliteVerdict(unit({ isElite: true }))).toMatchObject({
      elite: true, basis: 'promotion', needsConfirmation: false,
    });
  });

  it('falls back to the category, but says the answer is weak', () => {
    for (const category of ['Elite', 'Leader']) {
      expect(eliteVerdict(unit({ category })), category)
        .toMatchObject({ elite: true, basis: 'category', needsConfirmation: true });
    }
    expect(eliteVerdict(unit({ category: 'Trooper' })))
      .toMatchObject({ elite: false, basis: 'category', needsConfirmation: true });
  });

  it('refuses to guess a Mercenary, which is the case the category gets wrong', () => {
    /*
      The Witchburner is filed `Mercenary/Elite` in the catalogue and prints the
      literal ELITE Keyword, but `categoryOf` resolves Mercenary first — so its
      category says Mercenary and its rules say Elite. Guessing from the
      category here would send a genuine ELITE model to a roll it can die on.
    */
    expect(eliteVerdict(unit({ category: 'Mercenary' })))
      .toMatchObject({ elite: null, basis: 'unknown', needsConfirmation: true });
    expect(casualtyRoute(unit({ category: 'Mercenary' }))).toBeNull();
  });

  it('routes a Troop to the Survival Roll and an Elite to the Trauma Table', () => {
    expect(casualtyRoute(unit({ elite: false }))).toBe('survival');
    expect(casualtyRoute(unit({ elite: true }))).toBe('trauma');
  });
});

describe('the Witchburner, in the shipped data', () => {
  /*
    Not a hypothetical. This is the entry that makes `category` unusable as the
    ELITE signal, so it is pinned against the dataset — if the catalogues ever
    stop filing it both ways, this test should be the thing that notices.
  */
  const w = DATASET.units.find((u) => u.name === 'Witchburner')!;

  it('is filed as both a Mercenary and an Elite', () => {
    expect(w.roles.map((r) => r.toLowerCase())).toEqual(
      expect.arrayContaining(['mercenary', 'elite']));
  });

  it('also prints the literal ELITE Keyword', () => {
    expect(w.keywords.map((k) => k.toUpperCase())).toContain('ELITE');
  });
});

describe('the Survival Roll', () => {
  it('kills on 1 and 2, and spares 3 to 6', () => {
    expect(survivalOutcome(PROC, 1).dead).toBe(true);
    expect(survivalOutcome(PROC, 2).dead).toBe(true);
    for (const r of [3, 4, 5, 6]) expect(survivalOutcome(PROC, r).dead, `${r}`).toBe(false);
  });

  it('says which die it was and what happened, in the book’s terms', () => {
    expect(survivalOutcome(PROC, 1).text).toMatch(/^D6: 1 — dead or very badly wounded/);
    expect(survivalOutcome(PROC, 4).text).toContain('can fight on as normal');
  });

  it('throws on a roll that is not a result on the die', () => {
    // Rather than clamping. A 7 on a D6 is a typed digit or a bug, and reading
    // it as "survives" is the same failure this module exists to fix.
    for (const bad of [0, 7, -1, 2.5, NaN]) {
      expect(() => survivalOutcome(PROC, bad), `${bad}`).toThrow(RangeError);
    }
  });

  it('rolls only results that exist on the die', () => {
    const seen = new Set(Array.from({ length: 400 }, () => rollSurvival(PROC)));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('Battle Scars and Unfit for Duty', () => {
  it('counts scars, not injuries', () => {
    // Several Trauma results award an injury and no scar. Counting injuries
    // retires models early, which the audit warns about by name (RC-05).
    const u = unit({ injuries: ['Lost an Eye', 'Gut Wound', 'Blood Poisoning'] });
    expect(scarCount(u)).toBe(0);
    expect(unfitForDuty(PROC, u).unfit).toBe(false);
  });

  it('retires a model on its third scar and not its second', () => {
    const scars = (n: number) => unit({
      scars: Array.from({ length: n }, (_, i) => ({ name: `Scar ${i}` })),
    });
    expect(unfitForDuty(PROC, scars(2)).unfit).toBe(false);
    expect(unfitForDuty(PROC, scars(3))).toMatchObject({ unfit: true, scars: 3, at: 3 });
  });

  it('counts a scar about to be taken, so the wizard can warn before it lands', () => {
    const two = unit({ scars: [{ name: 'a' }, { name: 'b' }] });
    expect(unfitForDuty(PROC, two, 1)).toMatchObject({ unfit: true, scars: 3 });
  });

  it('quotes the rule that removes the model', () => {
    expect(unfitForDuty(PROC, unit()).text).toContain('Remove the model from your Warband Roster');
  });
});

describe('a repeated injury', () => {
  it('is recognised whichever array it was recorded in', () => {
    expect(alreadySuffered(unit({ injuries: ['D66: 15 - Lost an Eye: …'] }), 'Lost an Eye'))
      .toBe(true);
    expect(alreadySuffered(unit({ scars: [{ name: 'Lost an Eye' }] }), 'Lost an Eye'))
      .toBe(true);
  });

  it('does not fire on a different injury', () => {
    expect(alreadySuffered(unit({ injuries: ['Gut Wound'] }), 'Lost an Eye')).toBe(false);
  });

  it('says no for a model with nothing recorded', () => {
    expect(alreadySuffered(unit(), 'Lost an Eye')).toBe(false);
    expect(alreadySuffered(unit({ injuries: ['Gut Wound'] }), '  ')).toBe(false);
  });
});

describe('the Experience Point', () => {
  const BARRED = xpBarringInjuries(DATASET);

  it('is barred by exactly one row of the derived Trauma Table', () => {
    // Derived from the row's own text rather than from a list of names here,
    // so a Dispatch that adds another does not need this file edited.
    expect(BARRED).toEqual(['Head Wound']);
  });

  it('reads the prohibition out of the row the app already displays', () => {
    const head = DATASET.campaign.trauma.find((r) => r.roll === '22')!;
    expect(head.name).toBe('Head Wound');
    expect(barsExperience(head.description)).toBe(true);
  });

  const opts = { tookPart: true, died: false, xpBarringInjuries: BARRED };

  it('goes to an ELITE model that fought and lived', () => {
    expect(earnsExperience(unit({ elite: true }), opts)).toEqual({ earns: true });
  });

  it('does not go to a Troop', () => {
    // R:6026 — "each ELITE model that took part in a game and survived".
    expect(earnsExperience(unit({ elite: false }), opts))
      .toMatchObject({ earns: false, blocked: 'not-elite' });
  });

  it('does not go to a model that sat the game out', () => {
    expect(earnsExperience(unit({ elite: true }), { ...opts, tookPart: false }))
      .toMatchObject({ earns: false, blocked: 'did-not-take-part' });
  });

  it('does not go to a model that died in it', () => {
    expect(earnsExperience(unit({ elite: true }), { ...opts, died: true }))
      .toMatchObject({ earns: false, blocked: 'died' });
    expect(earnsExperience(unit({ elite: true, isDead: true }), opts))
      .toMatchObject({ earns: false, blocked: 'died' });
  });

  it('does not go to a model with a Head Wound', () => {
    /*
      The finding that stung: `campaign.ts` ran `u.xp + 1` on the same
      submission that recorded "This model can no longer gain Experience
      Points", and displayed that sentence while doing it.
    */
    const injured = unit({ elite: true, injuries: ['D66: 22 - Head Wound: This model can no longer gain Experience Points.'] });
    expect(earnsExperience(injured, opts)).toMatchObject({ earns: false, blocked: 'head-wound' });

    const scarred = unit({ elite: true, scars: [{ name: 'Head Wound' }] });
    expect(earnsExperience(scarred, opts)).toMatchObject({ earns: false, blocked: 'head-wound' });
  });

  it('withholds it rather than guessing when ELITE cannot be established', () => {
    expect(earnsExperience(unit({ category: 'Mercenary' }), opts))
      .toMatchObject({ earns: false, blocked: 'elite-unknown' });
  });
});

/* --------------------------------------------------- what a result records */

describe('what a Trauma result writes onto the model', () => {
  /*
    RR-07. Two rules, neither applied.

    Page 101: "Unless stated otherwise, each time an ELITE model is taken Out
    of Action, they receive a Battle Scar." Nothing in the store wrote
    `unit.scars` at all, so retirement at the third scar could not be reached
    by playing.

    And five results end "It does not receive an Injury or a Battle Scar" —
    every one of them was appended to `unit.injuries` anyway. 41-63 Full
    Recovery is fifteen of the thirty-six results, so a model that had once
    recovered fully hit the duplicate-injury reroll prompt on nearly half of
    all later rolls.
  */
  const row = (name: string) => {
    const r = DATASET.campaign.trauma.find((t) => t.name === name);
    expect(r, `${name} is not in the shipped Trauma Table`).toBeDefined();
    return r!;
  };
  /* The string the wizard records: `D66: 31 - Leg Wound: <the row's text>`. */
  const recorded = (name: string) => {
    const r = row(name);
    return `D66: ${r.roll} - ${r.name}: ${r.description}`;
  };

  const ELITE = { elite: true };
  const TROOP = { elite: false };

  it('finds the row a recorded outcome landed on', () => {
    expect(traumaRowIn(DATASET, recorded('Leg Wound'))?.roll).toBe('31');
    expect(traumaRowIn(DATASET, 'a note the player typed')).toBeNull();
    expect(traumaRowIn(DATASET, null)).toBeNull();
  });

  it('writes nothing for the five rows that say so', () => {
    // The rows' own sentence, not a list of roll numbers kept here.
    for (const name of ['Robbed', 'Full Recovery', 'Hardened', 'Bitter Lessons', 'Prominent Scar']) {
      const w = traumaWriteFor(DATASET, recorded(name), ELITE);
      expect(w.injury, name).toBe(false);
      expect(w.scar, name).toBeNull();
    }
  });

  it('is exactly those five in the shipped table', () => {
    /*
      Scope, measured rather than asserted from memory. If a Dispatch adds a
      sixth or rewords one of these, this fails and whoever changed it finds
      out that the wizard's behaviour moved with it.
    */
    const silent = DATASET.campaign.trauma
      .filter((r) => !traumaWriteFor(DATASET, `D66: ${r.roll} - ${r.name}: ${r.description}`, ELITE).injury)
      .map((r) => r.name);
    expect(silent).toEqual(['Robbed', 'Full Recovery', 'Hardened', 'Bitter Lessons', 'Prominent Scar']);
  });

  it('gives an ELITE model the injury and the Battle Scar', () => {
    const w = traumaWriteFor(DATASET, recorded('Leg Wound'), ELITE);
    expect(w.injury).toBe(true);
    expect(w.scar).toEqual({ name: 'Leg Wound', roll: '31' });
  });

  it('gives a Troop no Battle Scar', () => {
    // "each time an ELITE model is taken Out of Action". A Troop that survives
    // its D6 takes none.
    const w = traumaWriteFor(DATASET, recorded('Leg Wound'), TROOP);
    expect(w.injury).toBe(true);
    expect(w.scar).toBeNull();
  });

  it('writes nothing for a model already off the roster', () => {
    // Dead, or a capture nobody ransomed: there is no entry left to mark.
    const w = traumaWriteFor(DATASET, recorded('Leg Wound'), { elite: true, alreadyRemoved: true });
    expect(w.injury).toBe(false);
    expect(w.scar).toBeNull();
  });

  it('keeps an unrecognised result as an injury, and gives it no scar', () => {
    /*
      Rule 2, both ways. The player rolled something and it is their record of
      it, so it is not dropped — but a scar retires a model at three, and that
      is not a conclusion to reach from a row this build could not read.
    */
    const w = traumaWriteFor(DATASET, 'D66: 99 - Something This Build Cannot Read', ELITE);
    expect(w.injury).toBe(true);
    expect(w.scar).toBeNull();
    expect(w.row).toBeNull();
  });

  it('stops a Full Recovery triggering the duplicate-injury prompt', () => {
    /*
      The end-to-end shape of the defect: record a Full Recovery the way the
      wizard did, and every later Full Recovery reads as a repeat.
    */
    const write = traumaWriteFor(DATASET, recorded('Full Recovery'), ELITE);
    const injuries = write.injury ? [recorded('Full Recovery')] : [];
    const model = { injuries, scars: [] } as unknown as ActiveUnit;
    expect(alreadySuffered(model, 'Full Recovery')).toBe(false);
  });

  describe('Order 44 item 4b: the record says which die, and which row', () => {
    /*
      Round 2 item 3 fixed the post-battle wizard storing the matched ROW's range
      where it was holding the thrown D66 — so a sheet read "rolled 41-63" for a die
      that came up 52. Nothing pinned it: the only tests went through a hand-built
      `CasualtyRecord`, which proves the store reads the fields and says nothing
      about whether the wizard writes them. Reverting the fix left the suite green.

      `traumaRecords` is that decision, lifted out of the component's JSX so it can
      be driven directly. The wizard's own call site is asserted at the foot.
    */
    const LEG_WOUND = recorded('Leg Wound');

    it('records the throw as the roll, and the row as the row', () => {
      const write = traumaWriteFor(DATASET, LEG_WOUND, ELITE);
      /* 52 is a D66 that lands on the ranged row; 31 is the Leg Wound row. */
      const records = traumaRecords(write, 52);

      expect(records.roll).toBe('52');
      expect(records.row).toBe(write.row!.roll);
      /* And never the range in `roll`, which is the bug this pins. */
      expect(records.roll).not.toBe(records.row);
    });

    it('a result with no throw behind it records the row and no roll', () => {
      /* A row picked out of a dropdown, or a match recorded before the wizard
         carried the throw. Absent means not recorded. */
      const records = traumaRecords(traumaWriteFor(DATASET, LEG_WOUND, ELITE));

      expect(records).not.toHaveProperty('roll');
      expect(records.row).toBe('31');
    });

    it('a row this build cannot identify records no row, rather than a guess', () => {
      const write = traumaWriteFor(DATASET, 'a note the player typed', ELITE);
      const records = traumaRecords(write, 52);

      expect(records.roll).toBe('52');
      expect(records).not.toHaveProperty('row');
    });

    it('carries the injury flag and the scar through unchanged', () => {
      const write = traumaWriteFor(DATASET, LEG_WOUND, ELITE);
      const records = traumaRecords(write, 52);
      expect(records.injury).toBe(write.injury);
      expect(records.scar).toEqual(write.scar ?? undefined);
    });

    it('and the wizard builds its records through this, not by hand', () => {
      /*
        Source-level and deliberately narrow: what the assertions above cannot see
        is the component going back to assembling the object itself. If it does,
        `traumaRecords` is still correct and still unused, which is exactly the
        shape Order 44 found.
      */
      const wizard = readFileSync(join(process.cwd(),
        'src/components/campaign/PostBattleWizardModal.tsx'), 'utf8');

      expect(wizard).toMatch(/records: traumaRecords\(write, data\.thrown\)/);
      /* And the throw really is carried in the component's state, or it is passing
         `undefined` and the first assertion above is about nothing. */
      expect(wizard).toMatch(/thrown: rollNum/);
    });
  });
});
