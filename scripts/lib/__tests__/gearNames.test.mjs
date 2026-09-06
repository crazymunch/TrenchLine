/**
 * When the catalogue disagrees with itself about a name, the books decide.
 *
 * A BattleScribe gear entry carries a `selectionEntry` name and a profile name,
 * and this pipeline ships the profile's. Where a community catalogue has a
 * transcription slip in one of them, the app ships an official weapon under a
 * name no official document prints — and any layer op written against the real
 * name then finds nothing.
 *
 * That is not hypothetical. The Trench Dispatch adds the FUMBLE Keyword to the
 * "Demonic Aura Grenade"; the catalogue's profile called it a "Demonic
 * Grenade"; the op reported `target not found` on every build and the build
 * went green, so FUMBLE never reached the app.
 *
 * The matcher is the delicate part, so it is tested directly. A first pass
 * renamed 123 entries because it swept in the catalogues' deliberate
 * decorations — `Claimed: Automatic Pistol` for the Court's looted copy — which
 * would have collapsed entries the game keeps apart.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const BUILD = 'scripts/rules-build.mjs';

/*
  The two predicates are defined inside the build's main function, so they are
  lifted out by source text rather than imported. That is deliberate: it pins
  the shipped implementation, and a test that redefined them here would pass
  against a copy while the build did something else.
*/
const src = fs.readFileSync(BUILD, 'utf8');
const lift = (name, startsAt) => {
  const i = src.indexOf(startsAt);
  if (i === -1) throw new Error(`${BUILD} no longer defines ${name}`);
  // To the line that closes the arrow function at the same indentation.
  const end = src.indexOf('\n  };', i);
  return src.slice(i, end + 4);
};

const harness = [
  lift('editDistance', '  const editDistance = ('),
  lift('oneWordDropped', '  const oneWordDropped = ('),
  lift('nearlyTheSame', '  const nearlyTheSame = ('),
  'return { editDistance, oneWordDropped, nearlyTheSame };',
].join('\n');

const { oneWordDropped, nearlyTheSame } = new Function(harness)();

describe('nearlyTheSame — what counts as a spelling slip', () => {
  it('matches a letter dropped or swapped', () => {
    expect(nearlyTheSame('Cataphract Formation Alpha', 'Catphract Formation Alpha')).toBe(true);
    expect(nearlyTheSame('Elixer of Al-Khidr', 'Elixir of Al-Khidr')).toBe(true);
  });

  it('matches a word dropped, which character distance alone misses', () => {
    // 0.75 alike by characters — under any threshold that does not also sweep
    // in genuinely different entries. Hence the separate word-sequence rule.
    expect(nearlyTheSame('Demonic Grenade', 'Demonic Aura Grenade')).toBe(true);
    expect(nearlyTheSame('Call of Flesh', 'Call of the Flesh')).toBe(true);
  });

  it('refuses the catalogues’ deliberate decorations', () => {
    // The Court's looted copy of a New Antioch weapon is a different entry with
    // its own restrictions. Renaming it collapses the two.
    expect(nearlyTheSame('Claimed: Automatic Pistol', 'Automatic Pistol')).toBe(false);
    expect(nearlyTheSame('Stolen: Sniper Rifle', 'Sniper Rifle')).toBe(false);
    expect(nearlyTheSame('Pilfered: Alchemist Armour', 'Alchemist Armour')).toBe(false);
    expect(nearlyTheSame('Secrets of Chemistry & Alchemy', 'Chemistry & Alchemy')).toBe(false);
    // A Campaign Rules entry carries its roll number; the profile does not.
    expect(nearlyTheSame('Friends in High Places [9]', 'Friends in High Places')).toBe(false);
  });

  it('refuses an entry whose profile is a different label entirely', () => {
    // A `Melee` group holding a `Knight Companion of the Bladed Fly` profile is
    // correct structure, not a typo — and the first pass renamed it.
    expect(nearlyTheSame('Knight Companion of the Bladed Fly', 'Melee')).toBe(false);
    expect(nearlyTheSame('Swiss Guard', 'Papal Courage')).toBe(false);
    expect(nearlyTheSame('Second Grail Devotee', 'Grail Devotee')).toBe(false);
  });
});

describe('oneWordDropped', () => {
  it('requires the shorter name’s words to appear in order', () => {
    expect(oneWordDropped('Call of Flesh', 'Call of the Flesh')).toBe(true);
    expect(oneWordDropped('Flesh of Call', 'Call of the Flesh')).toBe(false);
  });

  it('requires exactly one word of difference', () => {
    expect(oneWordDropped('Demonic Grenade', 'Demonic Aura Grenade')).toBe(true);
    expect(oneWordDropped('Grenade', 'Demonic Aura Grenade')).toBe(false);
  });
});

describe('the build still fails on an op it cannot place', () => {
  it('sets failed rather than only printing', () => {
    /*
      The line "a published rule the app does not have — the one thing this
      pipeline exists to make visible" was already in the build, above a branch
      that printed and carried on. One op sat unresolved the whole time.
    */
    const i = src.indexOf('if (unresolvedOps.length) {');
    expect(i, 'the unresolved-ops branch is gone').toBeGreaterThan(-1);
    expect(src.slice(i, i + 1400)).toMatch(/failed = true;/);
  });
});
