/**
 * The Battlekit readers, against the committed books.
 *
 * DA-06 / FD-01. Two separate ways a bare line of capitals was misread, in
 * opposite directions.
 *
 * **The Warbands book.** `parseWarbandsBattlekit` read the profile row from a
 * single line and started the stop scan at the line after it. When a row's
 * keywords wrap, the book prints the continuation as a bare capitals line —
 * and `WB_BANNER` matches a bare capitals line, so the scan halted on the
 * entry's OWN keywords and never reached the rules below them. Five entries
 * shipped with half their keywords and no rules at all: the Punt Gun's
 * Overcharge, the Tank-Splitter Sword's Melt Armour and the Engineer Body
 * Armour's Ballistic Box Armour were all on the far side of that line.
 *
 * **The rulebook's chapter.** `parseBattlekit`'s `readRow` appends any bare
 * capitals line to the keywords, which is right for a wrapped run and wrong
 * for `PW` — a page mark printed alone three times in that chapter. The
 * Shotgun shipped carrying a keyword `SHOTGUN PW`, which nothing can match.
 *
 * These assert the shipped output of the readers, not strings written here.
 */
import { describe, it, expect } from 'vitest';

import { parseBattlekit, parseWarbandsBattlekit } from '../lib/parse-battlekit.mjs';

const warbands = parseWarbandsBattlekit();
const chapter = parseBattlekit();
const chapterEntries = chapter.entries ?? chapter;

const find = (list, name) => {
  const e = list.find((x) => x.name === name);
  expect(e, `${name} is not in the parsed output`).toBeDefined();
  return e;
};

describe('a profile row whose keywords wrap', () => {
  /*
    Each of these prints its keywords across two lines, the first ending in a
    comma. All three used to stop at that break.
  */
  it('reads the Punt Gun’s second keyword line, and the rule under it', () => {
    const e = find(warbands.entries, 'Punt Gun');
    expect(e.keywords).toEqual(expect.arrayContaining(['SHOTGUN', 'SHRAPNEL']));
    expect(e.rules[0]).toMatch(/^Overcharge/);
  });

  it('reads the Trench Mortar’s', () => {
    const e = find(warbands.entries, 'Trench Mortar');
    expect(e.keywords).toEqual(expect.arrayContaining(['IGNORES COVER', 'SCATTER']));
    expect(e.rules[0]).toMatch(/^High Trajectory/);
  });

  it('reads the Engineer Body Armour’s', () => {
    const e = find(warbands.entries, 'Engineer Body Armour');
    expect(e.keywords).toEqual(expect.arrayContaining(['NEGATE SHRAPNEL']));
    expect(e.rules[0]).toMatch(/^Ballistic Box Armour/);
  });

  it('reads the Tank-Splitter Sword’s', () => {
    const e = find(warbands.entries, 'Tank-Splitter Sword');
    expect(e.keywords).toEqual(expect.arrayContaining(['CRITICAL', 'CUMBERSOME']));
    expect(e.rules[0]).toMatch(/^Melt Armour/);
  });
  it('reads a wrapped run on an entry that has no rule under it', () => {
    /*
      The keyword-only case, which the three entries above do not cover.

      The Titan Zulfiqar prints `1-Handed \t Melee \t +2 INJURY MODIFIER,` and
      then `CRITICAL, HEAVY` on the next line, with no rule after it — so
      before the comma gate it shipped one keyword of three, and the two it
      lost are the ones that decide what the weapon does. It is also the case
      that tells the gate apart from a reader that simply takes the next line:
      with nothing of its own to find below the keywords, an over-eager scan
      would reach the entry printed after it.
    */
    const e = find(warbands.entries, 'Titan Zulfiqar');
    expect(e.keywords).toEqual(['+2 INJURY MODIFIER', 'CRITICAL', 'HEAVY']);
    expect(e.rules).toEqual([]);
  });

  it('does not give the Corruption Belcher a neighbour’s rule either', () => {
    const e = find(warbands.entries, 'Corruption Belcher');
    expect(e.keywords).toEqual(['FLAMETHROWER', 'GAS', 'IGNORE ARMOUR']);
    expect(e.rules).toEqual([]);
  });
});

describe('what stops a row being read further', () => {
  it('still stops at a section banner, which never follows a comma', () => {
    /*
      The comma is the whole distinction. A banner — `DEFENDERS OF THE IRON
      WALL` — is also a bare capitals line, and the Fire Shield's one rule
      used to run on through one into two paragraphs about Sultan Malik. If
      the continuation rule were "any capitals line", that would come back.
    */
    const e = find(warbands.entries, 'Fire Shield');
    const joined = (e.rules ?? []).join(' ');
    expect(joined).not.toMatch(/Malik/);
    expect(joined).not.toMatch(/DEFENDERS/);
  });

  it('reads no entry whose rules ran into the models printed after it', () => {
    // The existing guard, restated: a statline header or a price inside a
    // rule means the reader passed the end of its own entry.
    const swallowed = warbands.entries.filter((e) => (e.rules ?? []).some((r) =>
      /Movement\s+Ranged\s+Melee/.test(r) || /-\s*Cost:\s*\d/.test(r)));
    expect(swallowed.map((e) => e.name)).toEqual([]);
  });
});

describe('the PW page mark', () => {
  it('is in no keyword and no rule, from either reader', () => {
    /*
      It reached three entries: `SHOTGUN PW` on the Shotgun, `CUMBERSOME PW`
      on the Bayonet, and a trailing ` PW` on the Satchel Charge's rule.
    */
    const tainted = [...chapterEntries, ...warbands.entries].filter((e) =>
      (e.keywords ?? []).some((k) => /\bPW\b/.test(k))
      || (e.rules ?? []).some((r) => /\bPW\b/.test(r)));
    expect(tainted.map((e) => e.name)).toEqual([]);
  });

  it('leaves the keywords it was stuck to', () => {
    expect(find(chapterEntries, 'Shotgun').keywords).toContain('SHOTGUN');
    expect(find(chapterEntries, 'Bayonet').keywords).toContain('CUMBERSOME');
  });
});

describe('no keyword ends in a stray two-letter mark', () => {
  it('holds across both readers', () => {
    /*
      The general shape of the `PW` defect rather than that one instance: the
      Keywords chapter has no two-letter entries, so a keyword ending in a
      bare pair of capitals is page furniture that got appended.
    */
    const odd = [];
    for (const e of [...chapterEntries, ...warbands.entries]) {
      for (const k of e.keywords ?? []) {
        if (/\s[A-Z]{2}$/.test(k)) odd.push(`${e.name}: ${k}`);
      }
    }
    expect(odd).toEqual([]);
  });
});

describe('the readers did not get worse', () => {
  it('reads every entry it read before, and no more unreadable', () => {
    /*
      A parser change that recovers rules by relaxing a boundary can lose
      entries at the same time. These are the counts at the fix: 82 entries
      and 12 unreadable. A change that moves either has to say why.
    */
    expect(warbands.entries.length).toBe(82);
    expect(warbands.unreadable.length).toBe(12);
  });

  it('leaves fewer entries with no rules than before the fix', () => {
    // 31 before, 26 after. Stated as a ceiling so recovering more is fine
    // and losing ground is not.
    const noRules = warbands.entries.filter((e) => !(e.rules ?? []).length);
    expect(noRules.length).toBeLessThanOrEqual(26);
  });
});
