/**
 * The Carcass Front Scenarios & Terrain chapter.
 *
 * Five scenarios and two terrain pieces, read the same way
 * `parse-scenarios.mjs` reads the rulebook's twelve — the chapters have the
 * same shape, an ALL-CAPS section per block with Title-Case sub-headings under
 * it, so the same discipline applies: nothing is summarised, a section is
 * carried under the heading the book prints, and a scenario missing one of its
 * core sections fails the build rather than shipping half-playable.
 *
 * Three things are different enough to need their own handling.
 *
 * **The numerals are fullwidth.** The book sets `Ⅰ º The Ruins of Nineveh
 * Novus` with U+2160 ROMAN NUMERAL ONE, and two of them for `ⅠⅠ` rather than
 * U+2161. So `Ⅰ` and `ⅠⅠⅠ` are runs of the same character, and the numeral is
 * counted rather than looked up.
 *
 * **Every scenario carries a Path to Leviathan Consequences block** that the
 * rulebook's twelve have no equivalent of — what winning this scenario does to
 * the next one. It is a rule, and it only applies inside that campaign, so it
 * is kept as its own section with the book's own caveat attached rather than
 * folded into the tagline.
 *
 * **The deployment maps interleave with the prose.** Labels and dimensions off
 * the map — `DEPLOYMENT ZONE`, `24’’`, `SWORD OF GOD`, `CLIFF WALL` — extract
 * as bare lines in the middle of a sentence, and in scenario V they land
 * between "within 1” of the Altar of Leviathan and" and "not within 1” of any
 * enemy models". Dropping them by name would need a list per scenario; they
 * are found by shape instead, as a run of short label-or-dimension lines
 * containing at least one dimension.
 */
import {
  BOOK_TXT, SECTION, NAMED_RULE, endsSentence, chapterLines, toMarkdown, slugify,
} from './cf-prose.mjs';

export { BOOK_TXT, slugify };

/** The running head on every page of the chapter this reads. */
export const CHAPTER = 'Scenarios & Terrain';

/** U+2160, repeated: `Ⅰ`, `ⅠⅠ`, `ⅠⅠⅠ`. `Ⅳ` and `Ⅴ` are their own characters. */
const TITLE = /^(Ⅰ+|Ⅳ|Ⅴ)\s*º\s*(.+)$/;

/** Fullwidth numeral -> the value it stands for, and the ASCII the app shows. */
const NUMERAL = { 'Ⅳ': 4, 'Ⅴ': 5 };
const ASCII = ['I', 'II', 'III', 'IV', 'V'];

/** The six sections every scenario has, in the order the book prints them. */
export const CORE_SECTIONS = [
  'FORCES', 'THE BATTLEFIELD', 'DEPLOYMENT', 'GAME LENGTH',
  'VICTORY CONDITIONS', 'GLORIOUS DEEDS',
];

/** The attribution under a quotation: `-Ashur, Epistoliary Majoris of…`. */
const ATTRIBUTION_LINE = /^[-–—]\s*[A-Z]/;

/**
 * Rules vocabulary. A block containing any of it is not a quotation.
 *
 * Used only to tell the closing epigraph from the Glorious Deed above it —
 * they are typographically distinct in the book and identical in the text
 * extraction, so the split has to be made on what the words say.
 */
const RULES_WORDS =
  /friendly model|enemy model|Out of Action|Glorious Deed|Marker|ACTION|Turns?\b|VPs?\b|☼|👑|[0-9]”/;

/**
 * Split a section's raw lines into its own body and the closing epigraph.
 *
 * Every scenario ends on a quotation and its attribution — "Burn it. Burn it
 * all. / -Trench Cleric Viktor Drazdau, 33rd Lithuanian Hussars" — printed
 * under the last section, which is always GLORIOUS DEEDS. The book sets it in
 * a different face; the extraction does not, so it arrives as more lines of
 * the last Glorious Deed. That is the one section where a stray sentence is a
 * rule a player would try to score, and it truncated the last deed of all five
 * scenarios before this existed.
 *
 * Three facts locate the boundary, and all three have to hold:
 *
 *   1. Every Glorious Deed opens `Name: `. The quotation never contains a
 *      colon, so it begins after the LAST such line.
 *   2. It begins a sentence: the line before it finishes one, and it starts on
 *      a capital. A wrapped continuation of the deed starts lower-case.
 *   3. It is prose. A block naming a friendly model, an ACTION, a Marker, a
 *      Turn or a currency is the rule, not the quotation.
 *
 * Taking the EARLIEST boundary that satisfies all three keeps the whole
 * quotation; taking the latest would leave its first sentences in the deed.
 * Where no boundary satisfies them, nothing is split — the section keeps
 * everything, which is the safe direction to be wrong in.
 */
function splitEpigraph(lines) {
  const a = lines.findIndex((l) => ATTRIBUTION_LINE.test(l));
  if (a < 0) return { lines, epigraph: '' };

  let lastRule = -1;
  for (let i = 0; i < a; i++) if (NAMED_RULE.test(lines[i])) lastRule = i;

  for (let j = lastRule + 1; j < a; j++) {
    if (!/^["“'‘]?[A-Z]/.test(lines[j])) continue;
    if (j > 0 && !endsSentence(lines[j - 1])) continue;
    const block = lines.slice(j, a).join(' ');
    if (block.includes(':') || RULES_WORDS.test(block)) continue;
    return { lines: lines.slice(0, j), epigraph: lines.slice(j, a + 1).join(' ') };
  }
  return { lines, epigraph: '' };
}

/**
 * The two terrain pieces, from the `Carcass Front Terrain Piece Rules` block
 * that opens the chapter.
 *
 * Kept separate from the scenarios because that is what the book says they
 * are: "rules for two different terrain pieces that you can use in ANY of your
 * Trench Crusade games". Tying them to the five scenarios would hide them from
 * every other game.
 */
export function parseTerrain(lines) {
  const at = lines.findIndex((l) => l === 'Carcass Front Terrain Piece Rules');
  if (at < 0) {
    throw new Error(
      'parse-cf-scenarios: the Carcass Front Terrain Piece Rules block was not ' +
      'found. Naval Mines carry a 2D6 detonation table and a blast profile, and ' +
      'a player cannot resolve one from memory.');
  }
  const firstScenario = lines.findIndex((l) => TITLE.test(l));
  const body = lines.slice(at + 1, firstScenario < 0 ? lines.length : firstScenario);

  // Each piece opens on its ALL-CAPS name; everything to the next one is its.
  const starts = [];
  body.forEach((l, i) => { if (SECTION.test(l)) starts.push({ i, name: l }); });

  return starts.map(({ i, name }, k) => {
    const own = body.slice(i + 1, k + 1 < starts.length ? starts[k + 1].i : body.length);
    return {
      name,
      slug: slugify(name),
      /*
        The name is printed in caps as a heading; Title Case is for display.
        `LEVANT HEDGEHOG` -> `Levant Hedgehog`. No word of the rules changes.
      */
      title: name.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()),
      body: toMarkdown(own),
    };
  });
}

/**
 * The five scenarios and the two terrain pieces.
 *
 * @returns {{scenarios: object[], terrain: object[]}}
 */
export function parseCarcassFrontScenarios(src = BOOK_TXT) {
  const lines = chapterLines(CHAPTER, src);
  const terrain = parseTerrain(lines);

  const starts = [];
  lines.forEach((l, i) => {
    const m = TITLE.exec(l);
    if (m) starts.push({ i, numeral: m[1], name: m[2].trim() });
  });

  /*
    The chapter continues past the last scenario into the Random Scenario
    Generator, which is a different thing with its own tables. Bounded on its
    heading rather than on the end of the chapter, or scenario V would swallow
    four pages of charts as Glorious Deeds.
  */
  const generatorAt = lines.findIndex((l) => l === 'Random Scenario Generator');

  const scenarios = [];
  for (let k = 0; k < starts.length; k++) {
    const { i, numeral, name } = starts[k];
    const nextAt = k + 1 < starts.length ? starts[k + 1].i
      : (generatorAt > i ? generatorAt : lines.length);
    const body = lines.slice(i + 1, nextAt);

    const firstSection = body.findIndex((l) => SECTION.test(l));
    const head = firstSection > 0 ? body.slice(0, firstSection) : [];

    /*
      The Path to Leviathan Consequences block sits between the tagline and
      FORCES, under a Title-Case heading rather than an ALL-CAPS one. It is a
      rule — what winning this scenario does to a later one — so it becomes a
      section rather than part of the tagline, and it keeps the book's own
      caveat that it applies only inside that campaign.
    */
    const consequencesAt = head.findIndex((l) => /^Path to Leviathan Consequences$/i.test(l));
    const intro = consequencesAt >= 0 ? head.slice(0, consequencesAt) : head;

    /*
      Each scenario OPENS on a quotation too, above the summary — "…the wrath
      of Heaven and Hell still hungers… / -Ashur, Epistoliary Majoris of
      Nineveh Novus" — and it is set apart in the book by italics the
      extraction drops. Here the boundary is unambiguous: the attribution line
      ends it, and everything after it is the summary. Carried as its own
      field rather than run into the tagline, which is what a picker shows in
      one line under the scenario's name.
    */
    const openAt = intro.findIndex((l) => ATTRIBUTION_LINE.test(l));
    const quotation = openAt >= 0 ? intro.slice(0, openAt + 1).join(' ').replace(/\s+/g, ' ').trim() : '';
    const tagline = intro.slice(openAt + 1).join(' ').replace(/\s+/g, ' ').trim();
    const consequences = consequencesAt >= 0
      ? toMarkdown(head.slice(consequencesAt + 1))
      : '';

    const sections = [];
    if (consequences) {
      sections.push({ heading: 'PATH TO LEVIATHAN CONSEQUENCES', body: consequences });
    }

    let epigraph = '';
    let current = null;
    let buffer = [];
    const flush = () => {
      if (!current) return;
      // The closing quotation trails the last section. Taken off whichever
      // section it lands under, so a book that moves it still reads.
      const split = splitEpigraph(buffer);
      if (split.epigraph) epigraph = split.epigraph;
      const text = toMarkdown(split.lines);
      // A heading with nothing under it is a map label the shape check let
      // through, not a section. Dropped rather than emitted empty.
      if (text) sections.push({ heading: current, body: text });
    };
    for (const line of body.slice(firstSection < 0 ? body.length : firstSection)) {
      if (SECTION.test(line)) { flush(); current = line; buffer = []; continue; }
      buffer.push(line);
    }
    flush();

    const number = NUMERAL[numeral] ?? numeral.length;
    scenarios.push({
      number,
      roman: ASCII[number - 1],
      name,
      slug: `carcass-front-${slugify(name)}`,
      tagline,
      /** The quotation the scenario opens on, above its summary. */
      quotation,
      /** The quotation it closes on, printed under the Glorious Deeds. */
      epigraph,
      sections,
      source: 'carcass-front',
    });
  }

  if (scenarios.length !== 5) {
    throw new Error(
      `parse-cf-scenarios: found ${scenarios.length} scenarios, expected 5. ` +
      'The book states five and they are numbered I to V; a missing one is ' +
      'worse than an obviously absent one, because four would look complete.');
  }

  const has = (s, h) => s.sections.some((x) => x.heading === h && x.body);
  const incomplete = scenarios.filter((s) => CORE_SECTIONS.some((h) => !has(s, h)));
  if (incomplete.length) {
    throw new Error(
      'parse-cf-scenarios: these scenarios are missing a core section — ' +
      incomplete.map((s) => `${s.roman} ${s.name} (${
        CORE_SECTIONS.filter((h) => !has(s, h)).join(', ')})`).join('; ') +
      '. A scenario without its GAME LENGTH or GLORIOUS DEEDS is one a player ' +
      'cannot actually play.');
  }

  if (terrain.length !== 2) {
    throw new Error(
      `parse-cf-scenarios: found ${terrain.length} terrain pieces, expected 2 ` +
      '(Levant Hedgehog and Naval Mine). The book says the section "includes ' +
      'rules for two different terrain pieces".');
  }

  return { scenarios, terrain };
}
