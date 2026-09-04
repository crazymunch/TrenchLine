/**
 * The two campaigns Carcass Front prints.
 *
 * **The Carcass Front Campaign** (pp. 80-87) is a map campaign for two or more
 * players: Warbands travel a board of zones, scout them, fight for them and
 * plant Outposts, filling in a Campaign Tracker whose boxes pay Campaign
 * Victory Points and Camp buildings. **The Path to Leviathan** (pp. 88-90) is a
 * narrative campaign for two, and it is the spine the five Carcass Front
 * scenarios hang on — they are played in order and the last one decides it.
 *
 * ## Prose, with the parts the app can act on lifted out
 *
 * Most of both chapters is rules a player reads: how the Aggressor is chosen,
 * what each Tracker box does, how a Strafing Run is shot down. That is carried
 * as sourced Markdown, section by section, and rendered by `RulesProse` — the
 * same treatment the rulebook's Core Rules chapters get, and for the same
 * reason: a player opens the Codex exactly when they cannot open the book.
 *
 * Three things are lifted into structure on top, because the app can do
 * something with them that prose cannot:
 *
 *   - the **twelve Camp building tiers**, which a player consults every
 *     Exploration Step and which each change a roll or a Threshold;
 *   - the **two Shared Objectives**, which are scored at the end and split
 *     between tied players;
 *   - the **three Campaign Conclusions** of the Path to Leviathan, which are
 *     decided by the outcomes of scenarios IV and V and nothing else.
 *
 * ## What is NOT here, and why
 *
 * **The campaign map is not in the PDF.** The zone board, the Carcass Front
 * Zones table (which zone offers which Resources, and which scenario is played
 * there), the Special Zones table and the Scenario Generator charts the
 * campaign refers to are all printed on the fold-out map in the box. The book
 * says so repeatedly — *"listed in the Carcass Front Zones table on the
 * campaign map"*. None of it can be derived from any source in this repo, and
 * so none of it is: the sections that refer to it say what the rule is and
 * where to look, rather than inventing a zone list.
 */
import { chapterLines, toMarkdown, SECTION, slugify } from './cf-prose.mjs';
import { joinWrapped } from './dehyphenate.mjs';

const CARCASS_FRONT_CAMPAIGN = 'The Carcass Front Campaign';
const PATH_TO_LEVIATHAN = 'The Path to Leviathan Campaign';

const endsSentence = (l) => /[.!?:]["'”’)]?$/.test(l);

/** `Aggressor Wins Game: The Aggressor gains…` — a named rule, not a heading. */
const NAMED_RULE = /^[A-Z][A-Za-z0-9’'/ -]{1,44}:\s/;

/**
 * A word no heading ends on.
 *
 * The one signal that separates a real Title-Case heading from a line of prose
 * that happens to start one. `We have provided an example of` and `In order to
 * make a Strafing Run` are both mid-paragraph lines in the narrow column beside
 * the Bomb Marker illustration, and both look exactly like headings otherwise.
 */
const FUNCTION_WORD =
  /\b(of|the|a|an|and|or|to|in|on|at|for|with|from|by|that|as|is|are|if|it|their|your|you|we|but|than|into|up|be|can|will|has|have|was|were)$/i;

/**
 * Is this line a section heading?
 *
 * ALL-CAPS lines are headings outright. A Title-Case line is one only if every
 * one of these holds, and each rule is here because a line in this chapter
 * breaks it:
 *
 *   - **No tab.** `Roll \t Result` and `Type \t Range \t Keywords` are table
 *     header rows, and a table is not a section.
 *   - **Does not finish a sentence**, and is not a `Name: rules` block.
 *   - **Does not end on a hyphen.** `In order to use an Aerial Bom-` — the
 *     Aerial Bombardment rules are set in a narrow column beside an
 *     illustration, so almost every line of them is short enough to be a
 *     heading.
 *   - **Does not end on a function word.** `We have provided an example of`.
 *   - **The next line starts a new sentence.** `The ceremony of innocence` is
 *     the third line of the Yeats epigraph and is followed by `is drowned”`.
 */
function isHeading(lines, i) {
  const l = lines[i];
  if (!l || l.includes('\t')) return false;
  if (SECTION.test(l)) return true;
  if (l.length > 45 || l.length < 4) return false;
  if (!/^[A-Z]/.test(l)) return false;
  if (endsSentence(l) || NAMED_RULE.test(l)) return false;
  if (/-$/.test(l) || FUNCTION_WORD.test(l)) return false;
  const next = lines[i + 1];
  return Boolean(next) && /^[A-Z“]/.test(next);
}

/**
 * Split a chapter into sections, in printed order.
 *
 * Two levels, because the chapters have two: an ALL-CAPS banner is a part of
 * the chapter and a Title-Case heading is a rule within it. Consecutive
 * headings are one heading that wrapped — `Carcass Front` / `Campaign Games`
 * is the section the book cross-references as *"Carcass Front Campaign
 * Games"*, printed on two lines.
 */
function sectionsOf(lines) {
  const heads = [];
  for (let i = 0; i < lines.length; i++) {
    if (!isHeading(lines, i)) continue;
    const parts = [lines[i]];
    let j = i;
    while (!SECTION.test(lines[j]) && isHeading(lines, j + 1) && !SECTION.test(lines[j + 1])) {
      j += 1;
      parts.push(lines[j]);
    }
    heads.push({ at: i, end: j, level: SECTION.test(lines[i]) ? 1 : 2, heading: parts.join(' ') });
    i = j;
  }

  if (!heads.length) {
    throw new Error(
      'parse-cf-campaign: read a campaign chapter with no section headings at '
      + 'all. The chapter would ship as one unbroken wall of rules.');
  }

  const sections = heads.map((h, k) => {
    const body = lines.slice(h.end + 1, heads[k + 1]?.at ?? lines.length);
    return { id: slugify(h.heading), level: h.level, heading: h.heading, body,
             markdown: toMarkdown(body) };
  });

  return {
    // Everything before the first heading: the chapter opener and its lead-in.
    // The chapter's own title line carries the book's display capitalisation
    // and tabs (`The CArCAss \t fronT \t CAmPAiGn`), so it is dropped.
    intro: toMarkdown(lines.slice(1, heads[0].at)),
    sections: sections.filter((s) => s.markdown),
  };
}

/**
 * One section's own lines, by heading.
 *
 * Every structured parser below works from these rather than scanning forward
 * from a heading to the next ALL-CAPS banner. The Path to Leviathan's
 * `Campaign Conclusions` is why: it is followed by an eyewitness account of
 * the battle, in quotation marks and under no heading at all, and a scan that
 * ran to the next banner read `Serpent. Dragon. Monster. Evil Absolute.` as
 * three more campaign conclusions.
 */
function sectionBody(parsed, heading) {
  const found = parsed.sections.find((s) => s.heading === heading);
  if (!found) {
    throw new Error(
      `parse-cf-campaign: no "${heading}" section. The chapter's headings are `
      + `[${parsed.sections.map((s) => s.heading).join(' | ')}].`);
  }
  return found.body;
}

/* ------------------------------------------------------------- buildings */

/** `Depot 💰: A supply station, a mound of ripe corpses, a field surgeon.` */
const BUILDING = /^([A-Z][A-Za-z]+)\s+(\S+):\s+(.*)$/u;

/** `Tier 1: You can add or subtract 1 from your Exploration Roll…` */
const TIER = /^Tier ([123]):\s+(.*)$/;

/**
 * The four Camp buildings and their three tiers each.
 *
 * *"When a building is added to your Camp, it starts as a tier 1 building.
 * Each further reward that you receive for the building adds a new tier, up to
 * a maximum of 3 tiers. Each new tier adds a new benefit, which is received in
 * addition to the benefits from the lower tiers."*
 *
 * Twelve tiers exactly — four buildings, three each — and that is asserted,
 * because a building silently short a tier is a benefit a player has earned
 * and cannot see.
 */
function parseBuildings(lines) {
  const buildings = [];
  let open = null;
  let field = null;

  for (const l of lines) {
    const b = BUILDING.exec(l);
    if (b && !TIER.test(l)) {
      open = { name: b[1], glyph: b[2], flavour: [b[3]], tiers: [] };
      buildings.push(open);
      field = open.flavour;
      continue;
    }
    if (!open) continue;

    const t = TIER.exec(l);
    if (t) {
      const tier = { tier: Number(t[1]), effect: [t[2]] };
      open.tiers.push(tier);
      field = tier.effect;
      continue;
    }
    if (field) field.push(l);
  }

  const clean = (parts) => parts.reduce((a, b2) => joinWrapped(a, b2), '').replace(/\s+/g, ' ').trim();
  const out = buildings.map((b) => ({
    id: slugify(b.name),
    name: b.name,
    glyph: b.glyph,
    flavour: clean(b.flavour),
    tiers: b.tiers.map((t) => ({ tier: t.tier, effect: clean(t.effect) })),
  }));

  if (out.length !== 4 || out.some((b) => b.tiers.map((t) => t.tier).join() !== '1,2,3')) {
    throw new Error(
      'parse-cf-campaign: expected 4 Camp buildings of 3 tiers each and read '
      + `[${out.map((b) => `${b.name}:${b.tiers.length}`).join(', ')}]. A building `
      + 'short a tier is a benefit a player has earned and cannot see.');
  }
  return out;
}

/* -------------------------------------------------------- tracker rewards */

/**
 * A Campaign Tracker reward, as `<symbol> <effect>`.
 *
 * The symbol column is a glyph, sometimes with a word or a tier range beside
 * it: `🏅`, `+1 🎲`, `Reroll 🎲`, `Set 🎲`, `🗺 (Resource)`, `+👁`, `💰 1/2/3`.
 * The effect always begins on a capitalised word — Score, Roll, You, Fill,
 * Gain — which is what separates the two columns when the tab between them is
 * gone.
 */
const REWARD =
  /^((?:Reroll|Set|\+1)?\s*\+?[^\x00-\x7F]+\s*(?:1\/2\/3)?)\s+(.*)$/u;

/**
 * The fourteen Campaign Tracker rewards.
 *
 * Structured rather than left as prose because the extraction keeps the tab
 * between the two columns on **five** of the fourteen rows and drops it on the
 * other nine, so the table renders as five table rows with two walls of run-on
 * text either side of them:
 *
 *     +1 🎲 Roll an extra Exploration Dice in each Exploration Step. Reroll 🎲
 *     You can reroll 1 Exploration Dice in each Exploration Step. Set 🎲 You
 *     can pick the value of 1 Exploration Dice in each Exploration Step.
 *
 * That is a lookup table a player cannot use at the moment they are looking
 * something up in it, which is the same failure the naval mine's detonation
 * table had.
 *
 * The four Camp building rewards are cross-checked against the four buildings
 * parsed from the section above, which is a real check between two
 * independently read parts of the chapter: a reward pointing at a building
 * that does not exist, or a building no reward can ever build, is a parse
 * failure in one of the two.
 */
function parseTrackerRewards(lines, buildings) {
  const rows = [];
  for (const l of lines) {
    const m = REWARD.exec(l);
    if (m && m[2] && /^[A-Z]/.test(m[2])) {
      rows.push({ symbol: [m[1].trim()], effect: [m[2]] });
      continue;
    }
    // A row whose symbol is printed alone on its line: `🗺` then `(Resource)`
    // then the effect under them.
    if (/^[^\x00-\x7F]+$/u.test(l)) { rows.push({ symbol: [l], effect: [] }); continue; }
    if (!rows.length) continue;
    const row = rows[rows.length - 1];
    /*
      `🗺` and `(Resource)` are printed on two lines with the effect under
      them, so a row's symbol can wrap as well as its effect. While the effect
      is still empty, a line that does not open on a capital is more of the
      symbol; the effect starts at the first line that does.
    */
    if (!row.effect.length && !/^[A-Z]/.test(l)) row.symbol.push(l);
    else row.effect.push(l);
  }

  const clean = (parts) => parts.reduce((a, b) => joinWrapped(a, b), '').replace(/\s+/g, ' ').trim();
  const rewards = rows.map((r) => ({ symbol: clean(r.symbol), effect: clean(r.effect) }));

  if (rewards.some((r) => !r.symbol || !r.effect)) {
    throw new Error('parse-cf-campaign: a Campaign Tracker reward is missing its symbol or its effect.');
  }

  for (const b of buildings) {
    const found = rewards.filter((r) => r.symbol.includes(b.glyph));
    if (found.length !== 1) {
      throw new Error(
        `parse-cf-campaign: the ${b.name} building's glyph ${b.glyph} appears in `
        + `${found.length} Campaign Tracker rewards, not 1. Every building is `
        + 'built by a reward, and a reward that builds nothing is a mis-read row.');
    }
  }
  return rewards;
}

/* ------------------------------------------------------ shared objectives */

/** `Herald of Leviathan: The player(s) with the most Omens… scores 6 🏅.` */
const OBJECTIVE_POINTS = /scores?\s+(\d+)\s*🏅/u;

/**
 * The two Shared Campaign Objectives.
 *
 * *"The Carcass Front Map Campaign has 2 Shared Objectives that any player can
 * achieve at the end of the campaign. If two or more players have achieved a
 * Shared Objective, then the 🏅 are divided between them, rounding fractions
 * down to a minimum of 1."*
 *
 * The count is the book's own and is read out of that sentence rather than
 * written here, so a printing that adds a third fails the build.
 */
function parseSharedObjectives(body) {
  const stated = /has (\d+) Shared Objectives/.exec(body.join(' '));
  if (!stated) {
    throw new Error(
      'parse-cf-campaign: the Shared Objectives section no longer states how '
      + 'many there are. That sentence is the only check on the parse.');
  }

  const found = [];
  for (const l of body) {
    const m = NAMED_RULE.test(l) && /^([^:]+):\s+(.*)$/.exec(l);
    if (m) { found.push({ name: m[1].trim(), parts: [m[2]] }); continue; }
    if (found.length) found[found.length - 1].parts.push(l);
  }

  const objectives = found.map((o) => {
    const description = o.parts.reduce((a, b) => joinWrapped(a, b), '').replace(/\s+/g, ' ').trim();
    const points = OBJECTIVE_POINTS.exec(description);
    if (!points) {
      throw new Error(
        `parse-cf-campaign: the Shared Objective "${o.name}" does not say how `
        + 'many 🏅 it scores, and scoring it is the whole of what it does.');
    }
    return { id: slugify(o.name), name: o.name, points: Number(points[1]), description };
  });

  if (objectives.length !== Number(stated[1])) {
    throw new Error(
      `parse-cf-campaign: the book states ${stated[1]} Shared Objectives and `
      + `${objectives.length} parsed: [${objectives.map((o) => o.name).join(', ')}].`);
  }
  return objectives;
}

/* --------------------------------------------------- campaign conclusions */

/**
 * The three ways the Path to Leviathan ends.
 *
 * The whole narrative campaign resolves on two facts and nothing else: whether
 * a Warband succeeded in summoning Leviathan in Scenario V, and whether that
 * Warband also controls the railway cannon from Scenario IV.
 *
 *   summoning fails                        -> Draw
 *   summoned, no cannon                    -> Minor Victory to the summoner
 *   summoned, with the cannon              -> Total Victory to the summoner
 *
 * Each conclusion opens on its own sentence, and the result is the named
 * outcome inside it. Both are read; neither is written here.
 */
const RESULTS = ['Draw', 'Minor Victory', 'Total Victory'];

function parseConclusions(lines) {
  const stated = /There are (\w+) potential conclusions/.exec(lines.slice(0, 4).join(' '));
  const expected = ['one', 'two', 'three', 'four', 'five']
    .indexOf((stated?.[1] ?? '').toLowerCase()) + 1;
  if (!expected) {
    throw new Error(
      'parse-cf-campaign: the Path to Leviathan no longer states how many '
      + 'conclusions it has. That sentence is the only check on the parse.');
  }

  /*
    A conclusion opens a paragraph with a short sentence naming it, and the
    rest of the paragraph explains it. `The summoning fails. Due to a mixture
    of mischance, bad luck,` is one line: the name is not printed on a line of
    its own, so it is the first sentence rather than the first line.

    Two conditions, and the second is what keeps a mid-paragraph line out: the
    opening sentence must be short, and the PREVIOUS line must have finished
    its own sentence. `subdued and eventually returns to the depths. This
    outcome occurs if a` opens on a 44-character sentence and is a
    continuation, and the line above it ends mid-clause.
  */
  const OPENS = /^([^.!?]{5,45}[.!?])\s*(.*)$/;
  const found = [];
  let previousEnded = true;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    /*
      The chapter closes on an eyewitness account of the battle, in quotation
      marks and under no heading, so it falls inside this section. Read as
      rules it gives `Serpent. Dragon. Monster. Evil Absolute.` as four more
      campaign conclusions — four short sentences, each opening a line, each
      following one that finished.

      The rules end where the fiction is introduced: a line closing on a colon
      whose next line opens a quotation.
    */
    if (/^[“"]/.test(l)) break;
    if (/:$/.test(l) && /^[“"]/.test(lines[i + 1] ?? '')) break;
    const m = previousEnded && OPENS.exec(l);
    previousEnded = endsSentence(l);
    if (m) { found.push({ name: m[1].replace(/\.$/, ''), parts: m[2] ? [m[2]] : [] }); continue; }
    if (found.length) found[found.length - 1].parts.push(l);
  }

  const conclusions = found.map((c) => {
    const description = c.parts.reduce((a, b) => joinWrapped(a, b), '').replace(/\s+/g, ' ').trim();
    const result = RESULTS.filter((r) => description.includes(r))
      // "Minor Victory" also contains "Victory"; take the most specific match.
      .sort((a, b) => b.length - a.length)[0];
    if (!result) {
      throw new Error(
        `parse-cf-campaign: the conclusion "${c.name}" names none of `
        + `[${RESULTS.join(', ')}], so nothing says who won.`);
    }
    return { id: slugify(c.name), name: c.name, result, description };
  });

  if (conclusions.length !== expected) {
    throw new Error(
      `parse-cf-campaign: the book states ${expected} campaign conclusions and `
      + `${conclusions.length} parsed: [${conclusions.map((c) => c.name).join(', ')}].`);
  }
  return conclusions;
}

/* -------------------------------------------------------------------- api */

/** Both campaigns, in the order the book prints them. */
export function parseCarcassFrontCampaigns() {
  const map = sectionsOf(chapterLines(CARCASS_FRONT_CAMPAIGN));
  const path = sectionsOf(chapterLines(PATH_TO_LEVIATHAN));

  const cfBuildings = parseBuildings(sectionBody(map, 'Building Benefits'));
  const rewards = parseTrackerRewards(
    sectionBody(map, 'Campaign Tracker Rewards'), cfBuildings);

  /*
    Re-render the rewards section from the rows that were read, rather than
    leaving `toMarkdown` to make what it can of a table whose tabs the
    extraction kept on five rows of fourteen. Everything before the table is
    the section's own prose and is left alone.
  */
  const rewardsSection = map.sections.find((x) => x.heading === 'Campaign Tracker Rewards');
  rewardsSection.markdown = [
    toMarkdown(rewardsSection.body.slice(
      0, rewardsSection.body.findIndex((l) => /^Reward\s*\t/.test(l)))),
    ['| Reward | Effect |', '| --- | --- |',
      ...rewards.map((r) => `| ${r.symbol} | ${r.effect} |`)].join('\n'),
  ].filter(Boolean).join('\n\n');

  const strip = (parsed) => ({
    ...parsed,
    // The line spans are working state for the parsers above, not data.
    sections: parsed.sections.map(({ body, ...s }) => s),
  });

  return [
    {
      id: 'carcass-front',
      name: 'The Carcass Front Campaign',
      players: '2 or more',
      ...strip(map),
      buildings: cfBuildings,
      trackerRewards: rewards,
      sharedObjectives: parseSharedObjectives(sectionBody(map, 'SHARED CAMPAIGN OBJECTIVES')),
      /*
        The zone BOARD — the picture of which zone borders which — is still
        only on the printed sheet. Its three tables are not: the Carcass Front
        Zones table, the Special Zone Outpost Bonuses and the campaign's own D6
        charts come off `carcass-front-map.pdf` and reach the app as
        `dataset.carcassFrontMap` (see `parse-cf-map.mjs`). This stays true for
        the board, which is what a rule about supply lines and adjacency needs,
        and the Codex says which of the two it is missing.
      */
      requiresMap: true,
      conclusions: [],
    },
    {
      id: 'path-to-leviathan',
      name: 'The Path to Leviathan',
      players: '2',
      ...strip(path),
      buildings: [],
      trackerRewards: [],
      sharedObjectives: [],
      requiresMap: false,
      conclusions: parseConclusions(sectionBody(path, 'Campaign Conclusions')),
    },
  ];
}
