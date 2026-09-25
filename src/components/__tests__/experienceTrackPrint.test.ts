/**
 * The Experience track survives the printer.
 *
 * Review round 1, finding I, and it was a silent one: the Roster Sheet's print
 * stylesheet sets `background: transparent !important` on `.roster-sheet *` —
 * right for the rest of the sheet, because a lit screen's panels and tints are
 * noise on paper — and that rule overrode the fills. Every filled Experience
 * box and every greyed LIMITED POTENTIAL box printed EMPTY, so a sheet came out
 * of the printer claiming every model had nought Experience and no cap. The
 * track is the one thing on the page whose meaning IS its fill.
 *
 * Asserted against the stylesheet and the component together, the way the card
 * geometry in `rosterPresentation.test.ts` is: what broke was the interaction
 * between a blanket rule and a class, and neither file can show that alone.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

const css = read('src/app/globals.css');
const component = read('src/components/ExperienceTrack.tsx');

/** The print block, which is where the blanket rule lives. */
const printBlock = css.slice(css.indexOf('@media print'));

describe('the blanket rule that caused it is still there', () => {
  it('clears every background on the sheet', () => {
    /*
      Asserted so the fix reads as an exemption from a rule that exists, rather
      than as a fix to a rule somebody might later delete — at which point the
      exemption would be dead code nobody could explain.
    */
    const sheetRules = printBlock.slice(printBlock.indexOf('.roster-sheet,'));
    expect(sheetRules).toMatch(/background:\s*transparent\s*!important/);
  });
});

describe('and the track is exempt from it', () => {
  it('every box the component draws carries the print-fill class', () => {
    /*
      One class on the box, filled or not. The exemption keys on it, so a box
      that did not carry it would print blank again — which is why this reads
      the component rather than trusting it.
    */
    const box = component.match(/const box = '([^']+)'/)![1];
    expect(box).toContain('print-fill');
  });

  it('the stylesheet tells the printer those fills are content', () => {
    expect(printBlock).toMatch(/\.roster-sheet \.print-fill\s*\{[^}]*print-color-adjust:\s*exact/s);
    /* And the prefixed property, which is what Chromium and Safari read. */
    expect(printBlock).toMatch(/\.roster-sheet \.print-fill\s*\{[^}]*-webkit-print-color-adjust:\s*exact/s);
  });

  it('a filled box prints black and a capped box prints grey', () => {
    /*
      In ink, not in theme tokens: `bg-theme-primary` is a colour for a lit
      screen and resolves to nothing useful on paper. Both are stated, because
      the greyed boxes past a LIMITED POTENTIAL cap carry information too — the
      cap is meant to be visible on the model.
    */
    expect(printBlock).toMatch(/\.print-fill\.bg-theme-primary\s*\{[^}]*background:\s*#000/s);
    expect(printBlock).toMatch(/\.print-fill\.bg-theme-border\\\/40\s*\{[^}]*background:\s*#bbb/s);
  });

  it('EVERY fill class the component uses is one the stylesheet names', () => {
    /*
      The join between the two files, which is the thing that actually rots: a
      renamed Tailwind class in the component would leave the stylesheet
      exempting a selector that matches nothing, and the boxes would go blank on
      paper with every test still green.

      Read as a SET rather than as a pair (review round 2 item 11 added a third:
      the box a submission is awarding). Pulling every `bg-*` out of the box's
      own className expression means the next fill somebody adds fails here
      unless the stylesheet names it too — which is the property this test is
      for, and a two-group regex did not have.
    */
    const expr = component.slice(
      component.indexOf('b.gained'),
      component.indexOf('].join', component.indexOf('b.gained')));
    expect(expr, 'the component no longer names its fills this way').toBeTruthy();

    const fills = [...new Set(
      [...expr.matchAll(/'(bg-[a-z0-9-]+(?:\/[0-9]+)?)'/g)].map((m) => m[1]),
    )].filter((c) => c !== 'bg-transparent');

    /* The three real fills, or this test has stopped seeing them. */
    expect(fills.length).toBeGreaterThanOrEqual(3);

    for (const fill of fills) {
      /* A class carrying a slash is escaped in CSS. */
      expect(printBlock, `the stylesheet does not name ${fill}, so print erases it`)
        .toContain(`.print-fill.${fill.replace('/', '\\/')}`);
    }
  });

  it('names the awarded box in ink, distinct from held and from capped', () => {
    /* Round 2 item 11. Three greys on paper, because the accent is a screen
       colour: solid black held, mid grey awarded, light grey capped. */
    expect(printBlock)
      .toMatch(/\.print-fill\.bg-theme-accent\s*\{[^}]*background:\s*#777/s);
  });
});

describe('the sheet variant is gone rather than unused', () => {
  it('the component has one rendering, and print styles it', () => {
    /*
      Review round 1 asked for the unused `variant="sheet"` to be used or
      deleted. Deleted: the print stylesheet is where ink belongs, and a second
      set of colours in the component was a second place for the paper to go
      wrong.
    */
    expect(component).not.toMatch(/variant\s*[?:]?\s*:\s*'screen'\s*\|\s*'sheet'/);
    expect(component).not.toContain("variant = 'screen'");
  });
});
