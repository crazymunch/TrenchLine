/**
 * The Experience track against the printed sheet and against the dataset
 * (FD-12 item 1).
 *
 * The point of these tests is that the two AGREE. The official Warband Roster
 * Sheet prints eighteen Experience boxes with circles at six of them and two
 * SCARS boxes; `dataset.campaign.experience` and `dataset.campaign.trauma`
 * publish the same three facts. If the track were typed from the picture the
 * tests would pass and mean nothing, so every assertion here reads the DATASET
 * and then checks it against the numbers the extract of the sheet prints — which
 * is the only way the agreement is a fact rather than a coincidence.
 *
 * `data-sources/rulebook/extracted/warband-roster-sheet.txt` is the extract.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DATASET } from '@/data/generated/trenchline.generated';
import { experienceTrackFor } from '../experienceTrack';
import { traumaProcedure } from '../trauma';
import type { ActiveUnit } from '@/types/warband';

/**
 * The sheet's own numbers, from the printed page.
 *
 * These are facts about the PAPER, not game data — the count of boxes drawn in a
 * row and which of them are circles. They are here so the dataset can be checked
 * against them; nothing in `src/` reads them.
 */
const PRINTED = {
  experienceBoxes: 18,
  circlesAt: [2, 4, 7, 10, 14, 18],
  scarBoxes: 2,
};

const unit = (over: Partial<ActiveUnit> = {}): ActiveUnit => ({
  id: 'u1',
  customName: 'Kasim',
  /* A Sultanate Azeb: no LIMITED POTENTIAL, so no cap. */
  baseProfileId: DATASET.units.find(
    (u) => u.name === 'Azeb' && !(u.keywords ?? []).includes('LIMITED POTENTIAL'),
  )?.id ?? 'unknown',
  profileSnapshot: { name: 'Azeb' } as never,
  equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
  xp: 0, advancements: [], injuries: [], isDead: false, totalCost: 0,
  currentWounds: 1, maxWounds: 1, bloodMarkers: 0,
  status: 'Active', hasActedThisTurn: false,
  ...over,
});

describe('FD-12: the track is the dataset, and the dataset is the printed sheet', () => {
  it('has as many boxes as the sheet prints, from the dataset', () => {
    const track = experienceTrackFor(DATASET, unit())!;
    expect(track).not.toBeNull();
    expect(DATASET.campaign.experience!.max).toBe(PRINTED.experienceBoxes);
    expect(track.boxes).toHaveLength(PRINTED.experienceBoxes);
  });

  it('circles the boxes the sheet circles, and those are advancementAt', () => {
    const track = experienceTrackFor(DATASET, unit())!;
    const circled = track.boxes.filter((b) => b.advancement).map((b) => b.index);

    // The dataset first — this is the operative rule.
    expect(circled).toEqual([...DATASET.campaign.experience!.advancementAt]);
    // And the paper agrees with it.
    expect(circled).toEqual(PRINTED.circlesAt);
  });

  it('fills to the model’s Experience, left to right, and no further', () => {
    const track = experienceTrackFor(DATASET, unit({ xp: 6 }))!;
    expect(track.boxes.filter((b) => b.filled).map((b) => b.index))
      .toEqual([1, 2, 3, 4, 5, 6]);
    expect(track.xp).toBe(6);
  });

  it('prints as many SCARS boxes as the sheet, which is one short of retirement', () => {
    const track = experienceTrackFor(DATASET, unit())!;
    /* Through `traumaProcedure`, which is what resolves the rule — not by
       reaching into the dataset's shape, which would test a different thing. */
    const unfitAt = traumaProcedure(DATASET)!.battleScars.unfitAt;

    expect(track.unfitAt).toBe(unfitAt);
    /* The third scar retires the model ("they are sent back home. Remove the
       model from your Warband Roster"), so two is what it may carry and serve —
       and two is what the paper prints. */
    expect(unfitAt - 1).toBe(PRINTED.scarBoxes);
    expect(track.scars).toHaveLength(PRINTED.scarBoxes);
  });

  it('fills a scar box per scar the model carries', () => {
    const track = experienceTrackFor(DATASET, unit({
      scars: [{ name: 'Leg Wound', roll: '31' }],
    }))!;
    expect(track.scars.map((s) => s.filled)).toEqual([true, false]);
  });
});

describe('FD-12: a LIMITED POTENTIAL model greys the boxes past its cap', () => {
  /*
    The Brazen Bull is the entry the keyword is on, and it is read from the
    DATASET entry rather than from the model's snapshot — a layer can change a
    model's keywords after it was recruited, which is exactly what `experienceCap`
    exists to handle.
  */
  const limited = DATASET.units.find(
    (u) => (u.keywords ?? []).some((k) => String(k).toUpperCase() === 'LIMITED POTENTIAL'),
  );

  it('the dataset ships at least one such entry, or this test proves nothing', () => {
    expect(limited, 'no LIMITED POTENTIAL entry in the dataset').toBeTruthy();
  });

  it('greys past the cap and leaves the row eighteen boxes long', () => {
    const track = experienceTrackFor(DATASET, unit({
      baseProfileId: limited!.id, xp: 1,
    }))!;
    const cap = DATASET.campaign.promotions!.limitedPotential!.maxXp;

    expect(track.cap).toBe(cap);
    expect(track.boxes).toHaveLength(PRINTED.experienceBoxes);
    expect(track.boxes.filter((b) => b.beyondCap).map((b) => b.index))
      .toEqual(track.boxes.filter((b) => b.index > cap).map((b) => b.index));
    /* The cap is visible rather than stated: the boxes it forbids are still
       drawn. A shorter row would say the model is on a different track. */
    expect(track.boxes.some((b) => b.beyondCap)).toBe(true);
  });

  it('a model somehow past its cap keeps what it holds, and the row grows', () => {
    const cap = DATASET.campaign.promotions!.limitedPotential!.maxXp;
    const over = experienceTrackFor(DATASET, unit({
      baseProfileId: limited!.id, xp: PRINTED.experienceBoxes + 2,
    }))!;
    expect(over.cap).toBe(cap);
    expect(over.boxes).toHaveLength(PRINTED.experienceBoxes + 2);
    expect(over.boxes.every((b) => b.filled)).toBe(true);
  });
});

describe('a ruleset with no Experience track reports one rather than assuming eighteen', () => {
  it('returns null', () => {
    expect(experienceTrackFor(null, unit())).toBeNull();
    expect(experienceTrackFor({ campaign: {} } as never, unit())).toBeNull();
  });
});

describe('review round 1, finding L: the wizard draws the Experience it is awarding', () => {
  /*
    The post-battle wizard computes the Advancement Rolls due from
    `unit.xp + gain` — the Experience this submission is about to award — and
    drew the track on `unit.xp` alone. So a model one point short of a circle
    was shown one box short of it while being offered the roll that circle
    earns, which reads as the app contradicting itself mid-step.

    The component takes a unit, so the wizard hands it one with the award
    applied. This is that arithmetic, asserted where the track is decided.
  */
  const at = DATASET.campaign.experience!.advancementAt[1];

  it('a model that crosses a circle on this submission is drawn across it', () => {
    const before = experienceTrackFor(DATASET, unit({ xp: at - 1 }))!;
    const after = experienceTrackFor(DATASET, unit({ xp: at }))!;

    expect(before.boxes[at - 1].filled).toBe(false);
    expect(after.boxes[at - 1].filled).toBe(true);
    /* And that box is a circle, or this test is about the wrong one. */
    expect(after.boxes[at - 1].advancement).toBe(true);
  });

  it('and the wizard is the caller that applies the award', () => {
    /*
      The arithmetic above is the component's; the BUG was which number the
      wizard handed it. Read from the source, because this suite has no DOM and
      the alternative is a comment claiming the call site is right.
    */
    const wizard = fs.readFileSync(
      path.join(process.cwd(), 'src/components/campaign/PostBattleWizardModal.tsx'), 'utf8');
    const call = wizard.slice(
      wizard.indexOf('<ExperienceTrack'),
      wizard.indexOf('/>', wizard.indexOf('<ExperienceTrack')));

    expect(call, 'the wizard draws the track on the Experience from before the battle')
      .toMatch(/unit\.xp \+ xp\.points/);
    /* And resets a model Promoted in this step, as the commit does. */
    expect(call).toMatch(/promoted/);
  });

  it('a Promotion resets to the award alone, as the commit does', () => {
    /*
      "They begin with 0 Experience Points, but will gain at least 1 due to
      surviving the game after which they were Promoted." So a model Promoted in
      this step is drawn on the award, not on the award plus what it held as a
      Troop.
    */
    const promoted = experienceTrackFor(DATASET, unit({ xp: 1 }))!;
    expect(promoted.boxes.filter((b) => b.filled)).toHaveLength(1);
  });
});

describe('review round 2, item 11: which boxes this submission is awarding', () => {
  /*
    The wizard has to draw the track on Experience PLUS the gain — the
    Advancement Rolls it offers beside it are computed from that total, which is
    round 1's finding L. What it could not show was which of the filled boxes the
    battle had just earned, so a player checking the app against the table saw
    six filled boxes and no way to tell four-plus-two from six.

    `heldBefore` is the caller saying what the model brought.
  */
  it('marks only the boxes between what was held and the new total', () => {
    const track = experienceTrackFor(DATASET, unit({ xp: 6 }), { heldBefore: 4 })!;
    expect(track.boxes.filter((b) => b.gained).map((b) => b.index)).toEqual([5, 6]);
    /* All six are still filled: the gain is a subset of the fill, not a rival. */
    expect(track.boxes.filter((b) => b.filled).map((b) => b.index))
      .toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('marks nothing when the caller does not say, which is every other screen', () => {
    /* The unit card and the Roster Sheet state what a model HAS. Nothing there
       is pending, so nothing is a gain. */
    const track = experienceTrackFor(DATASET, unit({ xp: 6 }))!;
    expect(track.boxes.some((b) => b.gained)).toBe(false);
  });

  it('a Promoted model’s whole row is the gain, because it begins at nothing', () => {
    /* "They begin with 0 Experience Points, but will gain at least 1 due to
       surviving the game after which they were Promoted." */
    const track = experienceTrackFor(DATASET, unit({ xp: 1 }), { heldBefore: 0 })!;
    expect(track.boxes.filter((b) => b.gained).map((b) => b.index)).toEqual([1]);
  });

  it('awards nothing when the battle awarded nothing', () => {
    const track = experienceTrackFor(DATASET, unit({ xp: 6 }), { heldBefore: 6 })!;
    expect(track.boxes.some((b) => b.gained)).toBe(false);
  });

  it('refuses to mark ground that does not exist', () => {
    /* A "before" above the total would mark backwards, and a negative one would
       claim the model earned its whole history this game. Both clamp. */
    const over = experienceTrackFor(DATASET, unit({ xp: 3 }), { heldBefore: 9 })!;
    expect(over.boxes.some((b) => b.gained)).toBe(false);

    const under = experienceTrackFor(DATASET, unit({ xp: 2 }), { heldBefore: -5 })!;
    expect(under.boxes.filter((b) => b.gained).map((b) => b.index)).toEqual([1, 2]);
  });

  it('and the wizard is the caller that says what was held', () => {
    /* Source-level, as the finding-L case above is: this suite has no DOM, and
       the bug was which numbers the call site passes. */
    const wizard = fs.readFileSync(
      path.join(process.cwd(), 'src/components/campaign/PostBattleWizardModal.tsx'), 'utf8');
    const call = wizard.slice(
      wizard.indexOf('<ExperienceTrack'),
      wizard.indexOf('/>', wizard.indexOf('<ExperienceTrack')));

    expect(call, 'the wizard does not tell the track what the model held')
      .toMatch(/heldBefore=/);
    /* Zero for a model Promoted in this step, its own Experience otherwise. */
    expect(call).toMatch(/heldBefore=\{[\s\S]*promoted[\s\S]*\?[\s\S]*0[\s\S]*:[\s\S]*unit\.xp/);
  });
});
