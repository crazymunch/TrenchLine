import fs from 'node:fs';

/**
 * The official Rules Commentaries — the FAQ.
 *
 * `data-sources/rulebook/SOURCES.json` said this file "feeds the Codex and
 * rules-engine edge cases". Nothing read it. The PDF was fetched, extracted and
 * committed, and then no line of code opened the result — a documented role the
 * code did not honour, which is the same failure AUD-1 was written about.
 *
 * So this reads it. Fifty-one questions, each one an answer to something a
 * player at a table actually asked, and several of them settle rules the app
 * itself has to get right: whether a model is within X" of itself, how a
 * 30x60mm base is measured, who rolls an Injury Roll from a non-attack effect.
 *
 * ## Attribution is the document's own, not this parser's
 *
 * Every question opens with a label — `RULES Q1:`, `KEYWORDS Q4:`, `MISC. Q7:`
 * — and that label IS the section. So nothing here detects headings.
 *
 * That matters because heading detection is where this class of parser goes
 * wrong: `Faction Lists Questions` is a heading with three faction sub-headings
 * beneath it, the running head `Rules Commentaries 1.0.2` looks like a heading
 * on every page, and attributing by position put the Lazarist Castigator under
 * the wrong warband when the Carcass Front parser tried it. A label the
 * document repeats on every single entry cannot drift from the entry it labels.
 */

/**
 * `RULES Q1:`, `STARTING A WARBAND Q2:`, `MISC. Q7:`
 *
 * The `.` is in the character class because of `MISC.` alone, and leaving it
 * out silently drops seven questions — a parser that reads 44 of 51 and says
 * nothing is worse than one that throws.
 */
const QUESTION = /^([A-Z][A-Z .&'’-]*?)\s*Q(\d+):\s*(.*)$/;

/** An answer opens its own line, always. */
const ANSWER = /^A:\s*(.*)$/;

/**
 * Page furniture, which sits between a question and its answer often enough
 * that it cannot be ignored — the running head, the page number under it, and
 * the extractor's own page marker.
 */
const FURNITURE = [
  /^Rules Commentaries [\d`.]+\s*$/i,
  /^--\s*\d+\s+of\s+\d+\s*--$/,
  /^\d{1,3}$/,
  /^\s*$/,
];
const isFurniture = (line) => FURNITURE.some((re) => re.test(line.trim()));

/**
 * A section heading, recognised by SHAPE rather than by a list of names.
 *
 * `The Cult of the Black Grail` sits between one section's last answer and the
 * next section's first question, and an answer that keeps reading swallows it —
 * shipping "It has no effect on a Blast that targets a point on the ground. The
 * Cult of the Black Grail" as the official answer. That is the sidebar-bleed
 * failure the D66 tables had, in a different document.
 *
 * Checking against a list of the headings would be circular: it can only catch
 * a name already listed, and the one that matters is the one nobody thought to
 * list. So: a line that does not end a sentence, and whose next real line opens
 * a question, is a heading. An answer's last line ends the answer.
 */
function isHeading(lines, i) {
  const line = lines[i].trim();
  if (!line || /[.!?:;,”")]$/.test(line)) return false;
  /*
    Headings STACK — `Faction Lists Questions` sits above `Trench Pilgrims`,
    which sits above the section's first question — so stopping at the first
    real line finds another heading and concludes the answer simply continues.
    Scanning through heading-shaped lines is what the document requires, and it
    is self-correcting: a wrapped answer line leads to prose that ends a
    sentence, and this returns false there.
  */
  for (let j = i + 1; j < lines.length; j += 1) {
    if (isFurniture(lines[j])) continue;
    if (QUESTION.test(lines[j])) return true;
    if (/[.!?:;,”")]$/.test(lines[j].trim())) return false;
  }
  return false;
}

/**
 * Extraction spacing, not the book's wording.
 *
 * The PDF's justified text leaves a space before some punctuation — "a Line of
 * Sight to itself ?" — and a stray full stop after another. Collapsing those
 * changes no word; leaving them puts what reads as a typo in the Codex under an
 * official heading.
 */
const tidy = (s) => s
  .replace(/\s+/g, ' ')
  .replace(/\s+([.,;:!?])/g, '$1')
  .replace(/([.!?])\1*\s*\./g, '$1')
  .trim();

/** `MISC.` reads as a section name badly; the document's own heading is this. */
const SECTION_NAMES = {
  'MISC.': 'Miscellaneous',
  'RULES': 'Core & Comprehensive Rules',
};

const titleCase = (label) =>
  SECTION_NAMES[label]
  ?? label.toLowerCase().replace(/(^|\s)(\w)/g, (_, s, c) => s + c.toUpperCase());

const SRC = 'data-sources/rulebook/extracted/rules-commentaries-1.0.2.txt';

/** Read the committed extract, the same way every other parser reaches its source. */
export function loadCommentaries() {
  if (!fs.existsSync(SRC)) {
    throw new Error(
      `parse-commentaries: ${SRC} not found. The Rules Commentaries extract is `
      + 'committed; a build without it would ship a Codex missing the FAQ '
      + 'rather than say so.');
  }
  return parseCommentaries(fs.readFileSync(SRC, 'utf8'));
}

/**
 * Read the commentaries.
 *
 * @param {string} text the extracted `rules-commentaries-1.0.2.txt`
 * @returns {{id: string, section: string, label: string, question: string, answer: string}[]}
 */
export function parseCommentaries(text) {
  const lines = text.split('\n');
  const out = [];
  let current = null;
  /** Which half of the entry the following lines continue. */
  let part = null;

  const push = () => {
    if (!current) return;
    const question = tidy(current.question.join(' '));
    const answer = tidy(current.answer.join(' '));
    /*
      Both halves, or neither. A question with no answer is the extraction
      having lost the `A:` line, and shipping the question alone would put an
      unanswered FAQ entry in the Codex under a heading promising an answer.
    */
    if (!question || !answer) {
      throw new Error(
        `parse-commentaries: ${current.label} Q${current.number} has `
        + `${question ? 'no answer' : 'no question text'}. The extraction has `
        + 'changed shape; this must not ship half an entry.');
    }
    out.push({
      id: `faq-${current.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}${current.number}`,
      section: titleCase(current.label),
      label: `${current.label} Q${current.number}`,
      question,
      answer,
    });
    current = null;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const q = QUESTION.exec(line);
    if (q) {
      push();
      current = { label: q[1].trim(), number: q[2], question: [q[3]], answer: [] };
      part = 'question';
      continue;
    }
    if (!current) continue;
    if (isFurniture(line)) continue;
    if (isHeading(lines, i)) continue;

    const a = ANSWER.exec(line.trim());
    if (a) {
      /* A second `A:` inside one entry means two answers ran together, which
         would attribute one question's answer to the other. */
      if (part === 'answer') {
        throw new Error(
          `parse-commentaries: ${current.label} Q${current.number} has two answers.`);
      }
      part = 'answer';
      current.answer.push(a[1]);
      continue;
    }
    current[part].push(line.trim());
  }
  push();

  /*
    Refuse to report a pass on nothing — the failure that hid a dead
    cross-check for weeks. The document has 51 entries; a run that finds a
    handful has stopped reading it, not found it emptied.
  */
  /*
    A heading this parser did not recognise, caught by the same shape the
    campaign parser uses on the D66 tables: a short capitalised fragment left
    dangling after the answer's last full stop, with no terminator of its own.
    That is not how an answer ends, whatever the section happens to be called.
  */
  const trailing = (text) => {
    const stop = text.lastIndexOf('. ');
    return stop < 0 ? '' : text.slice(stop + 2).trim();
  };
  const bled = out.filter((e) => {
    const tail = trailing(e.answer);
    return tail.length > 0 && tail.length < 40
      && !/[.!?]$/.test(tail)
      && /^[A-Z]/.test(tail)
      && tail.split(/\s+/).length <= 6;
  });
  if (bled.length) {
    throw new Error(
      'parse-commentaries: answers ending in a dangling capitalised fragment, '
      + 'which is how a section heading bleeds into an answer: '
      + `${bled.map((e) => `${e.label} (…"${trailing(e.answer)}")`).join(', ')}.`);
  }

  if (out.length < 40) {
    throw new Error(
      `parse-commentaries: found only ${out.length} entries. The Rules `
      + 'Commentaries have far more than that; the extraction or this parser '
      + 'has stopped matching the document.');
  }
  return out;
}
