/**
 * Reading the official Rules Commentaries.
 *
 * The document is small and regular, which is exactly when a parser ships
 * something subtly wrong and nobody notices. Two failures are pinned here
 * because both actually happened while this was written:
 *
 * - `MISC.` has a full stop in its label, and a character class without one
 *   drops seven of the fifty-one questions while reporting no error at all.
 * - A section heading sits between one section's last answer and the next
 *   section's first question, and an answer that keeps reading swallows it —
 *   the sidebar-bleed failure the D66 tables had, in another document.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { parseCommentaries, loadCommentaries } from '../parse-commentaries.mjs';

const SRC = 'data-sources/rulebook/extracted/rules-commentaries-1.0.2.txt';

describe('the committed Rules Commentaries', () => {
  const entries = loadCommentaries();

  it('reads every question the document asks', () => {
    /* Counted from the source rather than hard-coded, so this measures the
       parser against the document and not against a number typed once. */
    const answers = (fs.readFileSync(SRC, 'utf8').match(/^A:\s/gm) ?? []).length;
    expect(entries).toHaveLength(answers);
  });

  it('keeps MISC., whose label has a full stop in it', () => {
    /* A character class without `.` matches 44 of 51 and says nothing. */
    const misc = entries.filter((e) => e.section === 'Miscellaneous');
    expect(misc).toHaveLength(7);
    expect(misc.at(-1)?.question).toBe('Does a model have a Line of Sight to itself?');
  });

  it('does not let a section heading bleed into the answer above it', () => {
    /* `The Cult of the Black Grail` sits directly below this answer. */
    const q = entries.find((e) => e.label === 'HERETIC LEGIONS Q2');
    expect(q?.answer).toBe(
      'Only if the attack targets the Death Commando directly. '
      + 'It has no effect on a Blast that targets a point on the ground.');
  });

  it('handles headings that stack', () => {
    /* `Faction Lists Questions` sits above `Trench Pilgrims`, which sits above
       that section's first question. Looking only one line ahead finds another
       heading and concludes the answer simply continues. */
    expect(entries.find((e) => e.label === 'STARTING A WARBAND Q3')?.answer).toBe('Yes.');
  });

  it('attributes by the document’s own label, not by position', () => {
    for (const e of entries) {
      expect(e.label, `${e.id} has no reference`).toMatch(/^[A-Z][A-Z .&'’-]* Q\d+$/);
      expect(e.section.length).toBeGreaterThan(0);
    }
  });
});

describe('refusing to ship a half-read document', () => {
  const entry = (body) => `Core & Comprehensive Rules\n${body}\n`;

  it('throws on a question with no answer', () => {
    /* Shipping the question alone puts an unanswered entry in the Codex under
       a heading that promises an answer. */
    expect(() => parseCommentaries(entry('RULES Q1: Does it work?')))
      .toThrow(/no answer/);
  });

  it('throws when two answers run together', () => {
    expect(() => parseCommentaries(entry('RULES Q1: Does it?\nA: Yes.\nA: No.')))
      .toThrow(/two answers/);
  });

  it('refuses to report a pass on a near-empty read', () => {
    /* The failure that hid a dead cross-check for weeks: a comparison against
       almost nothing reports success. */
    expect(() => parseCommentaries(entry('RULES Q1: Does it?\nA: Yes.')))
      .toThrow(/found only 1 entr/);
  });

  it('throws on a heading it did not recognise', () => {
    /*
      The backstop for the look-ahead. Detected by SHAPE — a short capitalised
      fragment dangling after the answer's last full stop — not by consulting a
      list of headings, which could only ever catch a name already in it.
    */
    const many = Array.from({ length: 45 }, (_, i) => `RULES Q${i + 1}: Does it?\nA: Yes.`).join('\n');
    const bled = `${many}\nRULES Q46: Does it?\nA: It does. Some Later Heading\n`;
    expect(() => parseCommentaries(entry(bled))).toThrow(/dangling capitalised fragment/);
  });
});
