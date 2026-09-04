/**
 * The Carcass Front fold-out campaign map.
 *
 * Three tables are printed on the map and NOWHERE ELSE — not in the book, not
 * in the quickstart. The book's campaign rules point at all three:
 *
 *   * The Carcass Front Zones table — 33 zones, the Resources each offers and
 *     the scenario played there. "The resources available in each zone are
 *     shown on the Carcass Front Zones table on the campaign map."
 *   * The Special Zone Outpost Bonuses — what an Outpost in one of the ten
 *     named zones confers.
 *   * The Carcass Front Scenario Generator charts — deployment and victory
 *     conditions per battlefield archetype, for a random scenario in a
 *     campaign game.
 *
 * `DATA-SOURCES.md` recorded this file as print material with no rules
 * content, and the Codex told players it was short a table it could not have.
 * It was simply never fetched.
 *
 * The page extracts cleanly as tab-separated rows for the first table and
 * badly for the other two, where a cell that wrapped becomes its own line with
 * no tab. Neither is reassembled by guessing at the layout: both are put back
 * together against a vocabulary the sources already state — the 33 zone names
 * for the bonuses, and the book's own generator charts for the D6 charts — so
 * a cell that reassembles into something no source names is REPORTED rather
 * than kept.
 */
import fs from 'node:fs';

export const MAP_TXT = 'data-sources/carcass-front/extracted/carcass-front-map.txt';
export const BOOK_TXT = 'data-sources/carcass-front/extracted/carcass-front-book.txt';

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const lines = (src) => fs.readFileSync(src, 'utf8').split('\n').map((l) => l.replace(/\s+$/, ''));

/** A page marker the extractor writes, e.g. `-- 1 of 2 --`. */
const PAGE = /^--\s*\d+\s*of\s*\d+\s*--$/;

/**
 * The Resource each glyph stands for, read from the book's own legend.
 *
 *     The four Resources are:
 *     Favour 👁
 *     ...
 *
 * Read rather than written down here: the map prints only the glyphs, and a
 * mapping typed into the pipeline would be four pieces of game data by hand.
 */
export function resourceLegend(src = BOOK_TXT) {
  const ls = lines(src);
  const at = ls.findIndex((l) => /^The four Resources are:/.test(clean(l)));
  if (at < 0) return new Map();
  const out = new Map();
  for (const l of ls.slice(at + 1, at + 40)) {
    const m = /^([A-Z][A-Za-z]+)\s+(\p{Extended_Pictographic})\s*$/u.exec(clean(l));
    if (m) out.set(m[2], m[1]);
    if (out.size === 4) break;
  }
  return out;
}

/**
 * `Zone <tab> Resources <tab> Scenario`, 33 rows.
 *
 * The only one of the three tables the extraction gives back intact.
 */
function zonesOf(ls, legend, unreadable) {
  const at = ls.findIndex((l) => /^Zone\s*\t\s*Resources\s*\t\s*Scenario/.test(l));
  if (at < 0) {
    unreadable.push('the Carcass Front Zones table has no header row');
    return [];
  }
  const out = [];
  for (const line of ls.slice(at + 1)) {
    if (!line.includes('\t')) break;
    const [name, glyphs, scenario] = line.split('\t').map(clean);
    if (!name || !scenario) break;
    const resources = [...glyphs].filter((c) => legend.has(c)).map((c) => legend.get(c));
    const unknown = [...clean(glyphs).replace(/\s/g, '')].filter((c) => !legend.has(c));
    if (unknown.length) unreadable.push(`${name}: unknown Resource glyph ${unknown.join(' ')}`);
    out.push({ name, resources, scenario });
  }
  return out;
}

/**
 * The Special Zone Outpost Bonuses.
 *
 * A zone name that fits the column stays on its row (`Kurd Dagh <tab> You can
 * re-roll…`); one that does not becomes one or two lines of its own with the
 * bonus starting on the line after. So the boundary is found by NAME: a line,
 * or two consecutive lines joined, that is one of the 33 zones the table above
 * names. Anything else is body text belonging to the bonus above it.
 *
 * Reading it by shape instead — "a short line starts a row" — would have split
 * every bonus that wrapped onto a short last line, and there are four.
 */
function bonusesOf(ls, zones, unreadable) {
  const at = ls.findIndex((l) => /^SPECIAL ZONE OUTPOST BONUSES/.test(clean(l)));
  if (at < 0) {
    unreadable.push('the Special Zone Outpost Bonuses table has no heading');
    return [];
  }
  const end = ls.findIndex((l, i) => i > at && /SCENARIO GENERATOR CHARTS/.test(clean(l)));
  const body = ls.slice(at + 1, end < 0 ? undefined : end)
    .filter((l) => clean(l) && !PAGE.test(clean(l)));

  const byName = new Map(zones.map((z) => [clean(z.name).toLowerCase(), z.name]));
  const out = [];
  let current = null;

  for (let i = 0; i < body.length; i++) {
    const line = body[i];

    // `Kurd Dagh <tab> You can re-roll…` — name and bonus on one row.
    if (line.includes('\t')) {
      const [name, ...rest] = line.split('\t');
      const zone = byName.get(clean(name).toLowerCase());
      if (zone) {
        current = { zone, bonus: clean(rest.join(' ')) };
        out.push(current);
        continue;
      }
    }

    /*
      Longest first. `Ruins of Nineveh Novus` is set over THREE lines, and
      taking the shortest match would have made `Ruins of` the row and left
      `Nineveh Novus` at the head of its bonus text — which is what happened,
      and lost the zone entirely because `Ruins of` is not a zone either.
      `Kurd Dagh` is the opposite case: a whole zone name whose next line is
      the start of its bonus.
    */
    let matched = false;
    for (let take = 3; take >= 1; take--) {
      if (i + take > body.length) continue;
      const zone = byName.get(clean(body.slice(i, i + take).join(' ')).toLowerCase());
      if (!zone) continue;
      current = { zone, bonus: '' };
      out.push(current);
      i += take - 1;
      matched = true;
      break;
    }
    if (matched) continue;

    if (current) current.bonus = clean(`${current.bonus} ${line}`);
  }

  for (const b of out) {
    if (!b.bonus) unreadable.push(`${b.zone}: an Outpost Bonus with no text`);
  }
  return out;
}

/**
 * The D6 charts: a Deployment and a Victory Condition per battlefield
 * archetype.
 *
 * Every cell that wrapped is its own line, and a row's six cells arrive spread
 * over as many as six lines with the tabs falling wherever the wrap did. So
 * the row is flattened to a single string and read against the vocabulary the
 * BOOK's own generator states — six deployments, six victory conditions, three
 * archetypes — longest name first, so `Standard Deployment` is not read as
 * `Standard` plus a stray word. A row that does not resolve into exactly six
 * published names is reported, not repaired: a generator chart that sends a
 * player to a deployment the book does not print is worse than no chart.
 *
 * `vocab` is `{ deployments, victories, archetypes }`, all read from
 * `dataset.scenarioGenerator`.
 */
function generatorOf(ls, vocab, unreadable) {
  const at = ls.findIndex((l) => /SCENARIO GENERATOR CHARTS/.test(clean(l)));
  if (at < 0) {
    unreadable.push('the Scenario Generator charts have no heading');
    return null;
  }
  const body = ls.slice(at + 1).filter((l) => clean(l) && !PAGE.test(clean(l)));

  const intro = [];
  let i = 0;
  for (; i < body.length && clean(body[i]) !== 'D6'; i++) intro.push(clean(body[i]));
  i++;   // the bare `D6` header

  // Split on the tab BEFORE cleaning: `clean` collapses every run of
  // whitespace, tabs included, so cleaning first turned the three archetype
  // headings into one string and the chart was refused as unpublished.
  const archetypes = String(body[i] ?? '').split('\t').map(clean).filter(Boolean);
  const unknownArch = archetypes.filter(
    (a) => !vocab.archetypes.some((x) => clean(x).toLowerCase() === a.toLowerCase()));
  if (unknownArch.length) {
    unreadable.push(`generator: unpublished battlefield archetype ${unknownArch.join(', ')}`);
    return null;
  }

  // Skip the `Deployment / Victory Conditions` sub-header, which wraps too.
  i++;
  while (i < body.length && !/^\d/.test(clean(body[i]))) i++;

  /*
    The published names, looked up with hyphens and spaces treated alike.

    The book prints `Long-Distance Battle` and the map prints `Long Distance
    Battle`, and matched literally the map's row 5-6 resolved to nothing at
    all. Compared this way it matches, and what is EMITTED is the book's
    spelling — so a chart cell and the generator's rules text for that
    deployment are the same string and the app can join them.
  */
  const norm = (t) => clean(t).toLowerCase()
    .replace(/[\u2010-\u2015-]/g, ' ').replace(/\s+/g, ' ').trim();
  const names = new Map([...vocab.deployments, ...vocab.victories].map((n) => [norm(n), n]));
  const longest = Math.max(...[...names.keys()].map((n) => n.split(' ').length));

  const rows = [];
  let buffer = [];
  const flush = () => {
    if (!buffer.length) return;
    const printed = clean(buffer[0]).match(/^(\d(?:-\d)?)/)?.[1] ?? '';
    // Rejoin a name the typesetter hyphenated across the wrap: `Chance En-`
    // then `counter`.
    let rest = buffer.join(' ').replace(/^\s*\d(?:-\d)?\s*/, '')
      .replace(/(\p{L})-\s+(\p{L})/gu, '$1$2');
    rest = clean(rest.replace(/\t/g, ' '));

    // Word by word, longest name first: `Attritional Battle` must be read
    // before `Battle` could be, and a name is only ever a whole run of words.
    const words = rest.split(' ').filter(Boolean);
    const cells = [];
    let k = 0;
    while (k < words.length) {
      let taken = 0;
      for (let take = Math.min(longest, words.length - k); take >= 1; take--) {
        const hit = names.get(norm(words.slice(k, k + take).join(' ')));
        if (!hit) continue;
        cells.push(hit);
        taken = take;
        break;
      }
      if (!taken) break;
      k += taken;
    }
    rest = words.slice(k).join(' ');

    if (rest || cells.length !== archetypes.length * 2) {
      unreadable.push(
        `generator row ${printed || '?'}: read ${cells.length} of `
        + `${archetypes.length * 2} published names`
        + (rest ? `, and "${rest.slice(0, 40)}" matches none` : ''));
      buffer = [];
      return;
    }
    rows.push({
      printed,
      rolls: printed.includes('-')
        ? (() => { const [a, b] = printed.split('-').map(Number);
                   return Array.from({ length: b - a + 1 }, (_, k) => a + k); })()
        : [Number(printed)],
      // Two cells per archetype, in the order the sub-header prints them.
      byArchetype: Object.fromEntries(archetypes.map(
        (a, k) => [a, { deployment: cells[k * 2], victory: cells[k * 2 + 1] }])),
    });
    buffer = [];
  };

  for (; i < body.length; i++) {
    if (/^\d(-\d)?\s/.test(clean(body[i])) || /^\d(-\d)?\t/.test(body[i])) flush();
    buffer.push(body[i]);
  }
  flush();

  return { intro: intro.join(' '), archetypes, rows };
}

/**
 * Everything printed on the map.
 *
 * `vocab` comes from the book's own scenario generator; without it the charts
 * cannot be checked against anything and are skipped rather than guessed at.
 */
export function parseCarcassFrontMap(vocab, src = MAP_TXT) {
  const unreadable = [];
  const ls = lines(src);
  const legend = resourceLegend();
  if (legend.size !== 4) unreadable.push(`the Resource legend read ${legend.size} of 4 glyphs`);

  const zones = zonesOf(ls, legend, unreadable);
  if (!zones.length) unreadable.push('no zones read from the Carcass Front Zones table');

  return {
    legend: Object.fromEntries(legend),
    zones,
    outpostBonuses: bonusesOf(ls, zones, unreadable),
    generator: vocab ? generatorOf(ls, vocab, unreadable) : null,
    unreadable,
  };
}
