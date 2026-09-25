/**
 * What a hand-entered record says about itself (Order 44 items 1 and 3).
 *
 * Both of these were found by mutation testing rather than by a test, and both
 * have the same shape: a rule stated in one place and applied in two, or an
 * input that collects a value the rule downstream then ignores.
 *
 * The functions under test are pure, which is the point. Round 2's version of
 * this logic lived inside two components' JSX, so the only thing a test without a
 * DOM could do was grep the components for the right call — and a grep passes
 * whether or not the call does anything.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { handEnteredSource, readTwoD6Total } from '../handEntry';
import { provenanceLabel, statesAnAdvancementRoll } from '../provenance';

const CAMP = 'camp-1';
const loaded = { id: CAMP, currentGame: 5 };

describe('Order 44 item 1: the game is recorded only where the app can name one', () => {
  /*
    Round 2 fixed this in the advancement sheet and missed the rewards modal,
    because each had its own copy of the rule. A reward entered by hand on a
    standalone Warband read "Recorded by hand · game 1" — a game nobody played,
    and the exact invention `provenance.ts` exists to refuse.
  */
  it('records the game for a member of the loaded campaign', () => {
    const source = handEnteredSource({
      warband: { campaignId: CAMP }, campaign: loaded,
    });
    expect(source).toEqual({ kind: 'manual', game: 5 });
    expect(provenanceLabel({ source }, { audience: 'owner' }))
      .toBe('Recorded by hand · game 5');
  });

  it('records NO game for a warband in no campaign', () => {
    const source = handEnteredSource({ warband: {}, campaign: loaded });
    expect(source).toEqual({ kind: 'manual' });
    expect(source).not.toHaveProperty('game');
    expect(provenanceLabel({ source }, { audience: 'owner' })).toBe('Recorded by hand');
  });

  it('records NO game when the loaded campaign is a different campaign', () => {
    /* `campaignGameOf`'s fallback answers 1 here, which is the right Threshold
       to field to and a false thing to write down. */
    const source = handEnteredSource({
      warband: { campaignId: CAMP },
      campaign: { id: 'somebody-elses-campaign', currentGame: 9 },
    });
    expect(source).toEqual({ kind: 'manual' });
  });

  it('records no game with no campaign loaded at all', () => {
    expect(handEnteredSource({ warband: { campaignId: CAMP }, campaign: null }))
      .toEqual({ kind: 'manual' });
    expect(handEnteredSource({ warband: { campaignId: CAMP } }))
      .toEqual({ kind: 'manual' });
  });

  it('"before the app" carries no game even inside a campaign', () => {
    /* A different claim, made deliberately: there was no campaign record then. */
    const source = handEnteredSource({
      beforeTheApp: true, warband: { campaignId: CAMP }, campaign: loaded,
      note: 'game 2, before we used the app',
    });
    expect(source).toEqual({
      kind: 'manual-pre-app', note: 'game 2, before we used the app',
    });
    expect(source).not.toHaveProperty('game');
  });

  it('a field the player left alone records nothing, not an empty string', () => {
    expect(handEnteredSource({ warband: {}, note: '   ', roll: '', row: '  ' }))
      .toEqual({ kind: 'manual' });
  });

  it('keeps a throw and a picked row apart, and labels them apart', () => {
    const thrown = handEnteredSource({ warband: {}, roll: '9' });
    const picked = handEnteredSource({ warband: {}, row: '41-63' });

    expect(thrown).toEqual({ kind: 'manual', roll: '9' });
    expect(picked).toEqual({ kind: 'manual', row: '41-63' });
    expect(provenanceLabel({ source: thrown })).toBe('Recorded by hand · rolled 9');
    expect(provenanceLabel({ source: picked })).toBe('Recorded by hand · row 41-63');

    /* And only the throw consumes an Advancement Roll. */
    expect(statesAnAdvancementRoll({ source: thrown })).toBe(true);
    expect(statesAnAdvancementRoll({ source: picked })).toBe(false);
  });
});

describe('Order 44 item 3: the 2D6 input refuses what the dice cannot give', () => {
  /*
    The field was added in round 2 so a player who rolled at the table could say
    what came up. It accepted anything: `13` was saved, labelled "rolled 13",
    consumed no Advancement Roll — because `statesAnAdvancementRoll` bounds a 2D6
    total at 2..12 — and explained none of that. A value the rule downstream will
    ignore must not be storable.
  */
  it('takes a real 2D6 total, at both bounds', () => {
    for (const t of ['2', '7', '12']) {
      expect(readTwoD6Total(t)).toEqual({ ok: true, roll: t });
    }
  });

  it('an empty field is not an error — it is declining to claim a roll', () => {
    /* Which is the correct entry for a Patron's Skill or a Glory Item's. */
    expect(readTwoD6Total('')).toEqual({ ok: true });
    expect(readTwoD6Total('   ')).toEqual({ ok: true });
  });

  it('refuses a total two dice cannot make, and says so', () => {
    for (const t of ['0', '1', '13', '66']) {
      const read = readTwoD6Total(t);
      expect(read.ok, `${t} was accepted`).toBe(false);
      if (!read.ok) expect(read.why).toMatch(/2 to 12/);
    }
  });

  it('refuses anything that is not a number', () => {
    for (const t of ['nine', '7-9', '41-63', '1.5', '+7']) {
      const read = readTwoD6Total(t);
      expect(read.ok, `${t} was accepted`).toBe(false);
      if (!read.ok) expect(read.why).toBeTruthy();
    }
  });

  it('what it accepts is exactly what states an Advancement Roll', () => {
    /*
      The join between the two ends of the rule: the input must not accept a
      value `statesAnAdvancementRoll` would then ignore, or the player is told
      they recorded a roll and the arithmetic disagrees.
    */
    for (let n = 0; n <= 20; n += 1) {
      const read = readTwoD6Total(String(n));
      const stored = read.ok && read.roll
        ? handEnteredSource({ warband: {}, roll: read.roll })
        : null;
      const consumes = stored ? statesAnAdvancementRoll({ source: stored }) : false;
      expect(read.ok && read.roll !== undefined, `${n}: accepted`).toBe(consumes);
    }
  });

  it('normalises a padded total rather than storing the padding', () => {
    expect(readTwoD6Total(' 09 ')).toEqual({ ok: true, roll: '9' });
  });
});

describe('Order 44 item 4b: the advancement sheet records a picked row as a row', () => {
  /*
    A scar entered by hand comes off a dropdown of the Trauma Table's rows. Nobody
    threw a die for it, so the record must say "row 31" and not "rolled 31" — and
    it must not consume an Advancement Roll either, which a `roll` would.

    The component's own call site is asserted at the foot, because what these
    cannot see is the modal going back to building the object itself.
  */
  it('a picked row reads as a row, and consumes nothing', () => {
    const source = handEnteredSource({ warband: {}, row: '31' });
    expect(source).toEqual({ kind: 'manual', row: '31' });
    expect(provenanceLabel({ source })).toBe('Recorded by hand · row 31');
    expect(provenanceLabel({ source })).not.toMatch(/rolled/);
    expect(statesAnAdvancementRoll({ source })).toBe(false);
  });

  it('a ranged row survives as the range it is', () => {
    /* `41-63` is reached by more than one total, which is why it is a string and
       why it can never be reported as a throw. */
    const source = handEnteredSource({ warband: {}, row: '41-63' });
    expect(source.row).toBe('41-63');
    expect(provenanceLabel({ source })).toBe('Recorded by hand · row 41-63');
  });

  it('and the modal records the row it was given, not a roll', () => {
    const modal = readFileSync(join(process.cwd(),
      'src/components/builder/UnitAdvancementModal.tsx'), 'utf8');

    /* The scar writer. */
    expect(modal).toMatch(/source: handEntry\(injuryObj\.roll \? \{ row: injuryObj\.roll \} : \{\}\)/);
    /* And the Skill writer, which prefers a stated throw and otherwise records
       the dropdown's row. */
    expect(modal).toMatch(/handRollRead\.ok && handRollRead\.roll/);
    expect(modal).toMatch(/\{ row: String\(skillObj\.roll\) \}/);
  });
});
