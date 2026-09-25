#!/usr/bin/env node
/**
 * Build the game data from data-sources/ and emit it to src/data/.
 *
 *   npm run rules:build              # build every ruleset
 *   npm run rules:build -- --ruleset trenchline
 *   npm run rules:build -- --check   # verify only, write nothing
 *
 * Pipeline (docs/RULESET-MODEL.md §5):
 *   1. parse   BattleScribe catalogues -> normalised entities
 *   2. layer   apply the ruleset's layers in order, stamping provenance
 *   3. verify  cross-check against the rulebook; fail on unresolved conflicts
 *   4. emit    src/data/*.generated.ts + provenance.json
 *
 * The build fails, loudly, on an unresolved source conflict or a field with no
 * provenance. Data that cannot say where it came from does not ship.
 */
import fs from 'node:fs';
import path from 'node:path';

import { parseCatalogues } from './lib/parse-battlescribe.mjs';
import { parseWarbandEntries, parseVariants, parseArmouryTables, parseFactionRules, parseVariantEconomy } from './lib/parse-warbands.mjs';
import { parseThresholdTable, parseStartingBudget, parseExploration,
         parseSkillsTables, parseTraumaTable, parseExperienceTrack,
         parseCampaignPhaseSteps, parseTraumaProcedure,
         parseReinforcementsSequence, parseCampaignVictoryPoints,
         parseQuartermasterStep, parseGloryItemTables,
         parseCampaignScenarioTables,
         parsePromotions, promotionKeywordDrift } from './lib/parse-campaign.mjs';
import { parseBattlekit, parseBattlekitLimits, parseKeywordCarryRules, keywordGrantsFrom, parseWarbandsBattlekit } from './lib/parse-battlekit.mjs';
import { parseCarryAllowances } from './lib/parse-carry-allowances.mjs';
import { parseMarkers } from './lib/parse-markers.mjs';
import { loadCommentaries } from './lib/parse-commentaries.mjs';
import { parseKeywords } from './lib/parse-keywords.mjs';
import { parseScenarios } from './lib/parse-scenarios.mjs';
import { parseCoreRules } from './lib/parse-core-rules.mjs';
import { parseWeatherEvents } from './lib/parse-weather.mjs';
import { parsePatrons } from './lib/parse-patrons.mjs';
import { parseCarcassFrontExploration, parseCarcassFrontExplorationStep } from './lib/parse-cf-exploration.mjs';
import { parseCarcassFrontCampaigns } from './lib/parse-cf-campaign.mjs';
import { parseVisionCards } from './lib/parse-vision-cards.mjs';
import { parseCarcassFrontScenarios } from './lib/parse-cf-scenarios.mjs';
import { parseScenarioGenerator } from './lib/parse-cf-generator.mjs';
import { parseCarcassFrontMap } from './lib/parse-cf-map.mjs';
import { buildCarcassFrontLayer, crossCheckReprints, applyMercenaryDelegation,
         LAYER_ID as CARCASS_FRONT } from './lib/carcass-front-layer.mjs';
import { buildRosterPaths } from './lib/newrecruit-paths.mjs';
import { createProvenance, applyLayers, applyArmouryRowOps, applyVariantOps, stampBase } from './lib/layers.mjs';
import { verify, applyResolutions, findMissingProvenance, loadResolutions, nameKey } from './lib/verify.mjs';
import { RULESETS } from './lib/rulesets.mjs';

const CAT_DIR = 'data-sources/battlescribe';
const OUT_DIR = 'src/data/generated';
const REPORT_DIR = 'reports';

const argv = process.argv.slice(2);
const checkOnly = argv.includes('--check');
const onlyRuleset = argv.includes('--ruleset') ? argv[argv.indexOf('--ruleset') + 1] : null;

if (!fs.existsSync(path.join(CAT_DIR, 'MANIFEST.json'))) {
  console.error(`error: ${CAT_DIR}/MANIFEST.json missing. Run: npm run rules:fetch`);
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(path.join(CAT_DIR, 'MANIFEST.json'), 'utf8'));

/*
  The Carcass Front supplement is a GENERATED layer.

  Every other layer is a `.layer.json` a maintainer wrote, and that is right for
  the Dispatch: it is a list of errata sentences, and transcribing "change the
  Cost of Incendiary Grenades to 10" is transcription. Carcass Front is two
  faction lists — fifteen entries, ninety-odd armoury rows, fifteen unique
  Battlekit items — and typing those by hand is exactly the failure rule 1 names.
  So it is read from the book on every build, and if the extraction breaks the
  build breaks with it rather than shipping a stale hand-copy.

  Built once, outside the per-ruleset loop, because parsing a 104-page PDF twice
  produces the same answer twice.
*/
const carcassFront = buildCarcassFrontLayer();

/** Load every layer file a ruleset names. */
function loadLayer(id) {
  if (id === CARCASS_FRONT) return carcassFront.layer;
  const candidates = [
    `data-sources/dispatch/${id}.layer.json`,
    `data-sources/layers/${id}.layer.json`,
  ];
  const found = candidates.find((f) => fs.existsSync(f));
  if (!found) {
    console.error(`error: layer '${id}' not found. Looked in:\n  ${candidates.join('\n  ')}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(found, 'utf8'));
}

const bookEntries = parseWarbandEntries();
const variants = parseVariants();
/*
  The catalogue's Battlekit names, for the one Armoury Table row the PDF ran
  together that the book itself cannot split — see `repairWrappedRow`. Parsed
  once here rather than inside the per-ruleset pass, because the armoury is
  read before any ruleset is assembled and the names are the same either way.
*/
const catalogueNames = (() => {
  const cat = parseCatalogues(CAT_DIR);
  return [...new Set([
    ...cat.weapons.map((w) => w.name),
    ...(cat.battlekit ?? []).map((b) => b.name),
  ].filter(Boolean))];
})();

const { rows: armoury, unreadable: armouryUnreadable } = parseArmouryTables(
  undefined, catalogueNames);
const factionRules = parseFactionRules();
const resolutions = loadResolutions();

if (!bookEntries.length) {
  console.warn(
    'warning: the Warbands rulebook extraction is missing, so nothing can be\n' +
      '         cross-checked. Run: npm run rules:pdfs && npm run rules:extract'
  );
}

fs.mkdirSync(REPORT_DIR, { recursive: true });

let failed = false;
const summaries = [];

for (const ruleset of RULESETS) {
  if (onlyRuleset && ruleset.id !== onlyRuleset) continue;

  // The starting allowance is read from every faction entry rather than assumed.
  // If two factions ever disagree, that is a rules change or a parse failure and
  // either way it must not be silently averaged into one number.
  const startingBudget = parseStartingBudget();
  if (!startingBudget || startingBudget.ducats == null) {
    throw new Error(
      'rules-build: the starting Ducat allowance could not be read from the Warbands ' +
      `book, or the faction entries disagree (${startingBudget?.seen?.join(', ') ?? 'none found'}).`);
  }

  // The Battlekit chapter: descriptions and per-item special rules. Throws if
  // the chapter stops yielding profiles, rather than shipping an empty arsenal
  // — the Codex would render that as "this ruleset has no wargear".
  const battlekit = parseBattlekit();

  // How much of it one model may carry. Six bullets under a heading in the
  // same chapter, and the app enforced none of them — a model could wear
  // three suits of Armour and validate clean. Throws if the heading is gone.
  const battlekitLimits = parseBattlekitLimits();
  /*
    Carrying allowances a model's own entry states, which replace the
    chapter's for that model. Only self-describing sentences are read; the
    rest are reported below rather than attributed by guess.
  */
  const carryAllowances = parseCarryAllowances(
    'data-sources/rulebook/extracted/warbands-of-trench-crusade.txt');

  /*
    Faction-exclusive wargear, which the core chapter does not carry.

    `arsenal.ts` read one source and said so to the player's face — the Wind
    Amulet's dossier printed "Described in Warbands of Trench Crusade rather
    than the Battlekit chapter, which is what this view reads" where its rules
    belong. This is that second book, read the same way. The core chapter wins
    a name collision: it is the primary source, and the second only fills gaps.
  */
  const warbandsKit = parseWarbandsBattlekit();

  // The Keyword Glossary. The app's hand-written copy had 46 entries against
  // the book's 59, invented HEAVY COVER and LIGHT COVER outright, and split the
  // book's parameterised forms into instances — NEGATE FIRE, NEGATE GAS and
  // NEGATE SHRAPNEL for the one NEGATE [KEYWORD] rule.
  const keywords = parseKeywords();

  // Three of the carrying limits are stated as KEYWORDS rather than on the
  // BATTLEKIT LIMITS page — STRONG, CUMBERSOME, HEAVY — and a fourth, HELD,
  // which reporting an unreadable rule is what found.
  const keywordCarry = parseKeywordCarryRules(keywords);

  // The twelve scenarios. The hand-written set had the wrong game length for
  // all twelve, inverted Claim No Man's Land's Infiltrator rule, and invented
  // 32 of its 46 Glorious Deeds.
  /*
    The Carcass Front book's five scenarios and its two terrain pieces.

    Parsed once outside this loop would be cleaner, but the map check below is
    per-ruleset and this keeps the two scenario sources side by side. They are
    only added to a ruleset that carries the supplement's layer — playing a
    Carcass Front scenario means using its terrain pieces and its neutral
    models, which the `github-latest` catalogues know nothing about.
  */
  const cf = parseCarcassFrontScenarios();

  /*
    The Random Scenario Generator, printed in the same chapter. Parsed
    separately because it is a different kind of thing: a procedure with four
    charts, not a scenario.
  */
  const generator = parseScenarioGenerator();

  /*
    The fold-out campaign map: 32 zones with their Resources and scenario, ten
    Special Zone Outpost Bonuses, and the campaign's own D6 charts. All three
    are printed on the map and nowhere else, and the book's campaign rules
    point at all three — "the resources available in each zone are shown on the
    Carcass Front Zones table on the campaign map".

    The charts are checked against the vocabulary the BOOK's generator states,
    which is why it is read after `parseScenarioGenerator`: every cell must be
    one of the six deployments, six victory conditions and three archetypes the
    book prints, or the row is reported rather than repaired. A generator chart
    that sends a player to a deployment the book does not print is worse than
    no chart.
  */
  const namesIn = (chart) => (chart?.rows ?? []).map((r) => r.values[0]).filter(Boolean);
  const cfMap = parseCarcassFrontMap({
    deployments: namesIn(generator?.deployment),
    victories: namesIn(generator?.victory),
    archetypes: namesIn(generator?.battlefield),
  });

  const scenarios = parseScenarios().map((s) => {
    /*
      The map is not derived, it is *resolved*: the hand-written scenarios
      pointed every one of them at /maps/scenario_N.webp, and not one of those
      files existed — twelve broken images that nothing ever reported, the same
      failure as the campaign map's /world_map.png.

      `.webp`, and cropped out of the rendered page by
      `scripts/crop-scenario-maps.py`. It used to be `<slug>.png`, which was
      the image the PDF *stores* — and that is the map's BACKGROUND ART, the
      terrain drawing with none of the map on it. The zones, the objective
      markers, the midpoint and the dimensions are drawn over it in vector, so
      the embedded image is the layer underneath the map rather than the map.
      Twelve deployment maps with no deployment zones on them, which nothing
      reported either: the file existed, so the check below passed.
    */
    const file = `maps/${s.slug}.webp`;
    if (!fs.existsSync(path.join('public', file))) {
      throw new Error(
        `rules-build: scenario ${s.roman} (${s.name}) has no deployment map at ` +
        `public/${file}. Emitting the path anyway is how the app ended up ` +
        'showing twelve broken images for its twelve scenario maps.');
    }
    return { ...s, mapImage: `/${file}` };
  });

  if (ruleset.layers.includes(CARCASS_FRONT)) {
    /*
      Resolved the same way as the rulebook's twelve, and `null` only where
      there is genuinely no file — never a path to one that does not exist,
      which is how the app ended up showing twelve broken images.

      These were all five `null` until the maps could be got out of the book.
      They are not raster art like the rulebook's: a Carcass Front map is a
      single large grey-filled rectangle in the page's vector drawings, and
      that rectangle IS the crop box — read from the PDF rather than detected,
      so there is nothing to get wrong. See `scripts/crop-scenario-maps.py`.
    */
    scenarios.push(...cf.scenarios.map((s) => {
      const file = `maps/${s.slug}.webp`;
      return {
        ...s,
        mapImage: fs.existsSync(path.join('public', file)) ? `/${file}` : null,
      };
    }));
  }

  /*
    The Core Rules and Comprehensive Rules chapters.

    A heading the table of contents lists and the walk cannot find in the body
    is a hole in the Codex, so it fails the build rather than shipping a
    chapter list with a gap in it.
  */
  /*
    Hell on Earth's Weather Events. The parser throws rather than returning a
    short table: an eleven-row 2D6 table read with a gap in it would hand a
    player a result the book does not have, which is the exact failure the
    invented weather was.
  */
  const weather = parseWeatherEvents();

  /*
    The eleven Patrons, from the rulebook and from Carcass Front.

    Read together rather than layered, because Carcass Front's three are not a
    Carcass Front feature: "The following new Patrons can be taken by eligible
    Warbands in any Campaign (not just a Carcass Front Campaign)". A ruleset
    without the supplement's layer gets the rulebook's eight.

    The app had no Patron data at all before this. `warband.patron` was a
    free-text string, so a player who rolled a Patron Skill — both ends of
    every 2D6 Skill Table — had nothing to look it up in.
  */
  const patrons = parsePatrons();

  /*
    The four Carcass Front Exploration Tables, keyed by Resource.

    A Carcass Front campaign uses these INSTEAD of the rulebook's three, so
    they sit beside them rather than replacing them in the data: a player is in
    one kind of campaign or the other, and the app has to be able to show
    either.
  */
  const carcassFrontExploration = parseCarcassFrontExploration();
  /* The Step's own two numbers, read from the book rather than written into
     `src/rules/campaign.ts` beside a citation — see
     `parseCarcassFrontExplorationStep`. */
  const carcassFrontExplorationStep = parseCarcassFrontExplorationStep();

  /*
    The two campaigns the book prints, and the sixteen Vision cards.

    Mostly sourced prose, section by section — most of a campaign chapter is
    rules a player reads rather than numbers an app can hold — with the parts
    the app can act on lifted out: the twelve Camp building tiers, the fourteen
    Campaign Tracker rewards, the two Shared Objectives and the three
    conclusions of the Path to Leviathan.
  */
  const campaigns = parseCarcassFrontCampaigns();
  const visionCards = parseVisionCards();

  const coreRules = parseCoreRules();
  /*
    The two battle marker pools. Read from the sections above, because the
    cap was a literal `6` in the store and Blessing Markers were not in the
    app at all — a number and an absence, both decided by hand.
  */
  const markers = parseMarkers(coreRules.chapters);
  /*
    The official FAQ. `SOURCES.json` said this file "feeds the Codex and
    rules-engine edge cases" while nothing in the tree opened it — a documented
    role the code did not honour. Several of its answers settle things the app
    itself has to get right: whether a model is within X" of itself, how a
    30x60mm base is measured, who rolls an Injury Roll from a non-attack effect.
  */
  const commentaries = loadCommentaries();
  if (coreRules.missing.length) {
    throw new Error(
      `rules-build: ${coreRules.missing.length} rulebook section(s) in the table of `
      + `contents were not found in the body: ${coreRules.missing.join(', ')}. `
      + 'Shipping the rest would leave the Codex silently short a chapter.');
  }

  // 1. parse — a fresh copy per ruleset, since layers mutate it
  const base = parseCatalogues(CAT_DIR);

  /*
    Where the catalogue disagrees with itself about a name, let the books decide.

    A BattleScribe gear entry carries a `selectionEntry` name and a profile
    name, and this pipeline ships the profile's. Usually they agree. Where they
    do not, one is sometimes a transcription slip in a community catalogue —
    and the app then ships an official weapon under a name no official document
    prints.

    The shipped example: the rulebook prints "Demonic Aura Grenade" in the
    Glory Items table and four times in its rules text, the catalogue's own
    entry agrees, and its profile says "Demonic Grenade". So the app carried
    the weapon under the profile's name, and the Trench Dispatch op adding the
    FUMBLE Keyword to "Demonic Aura Grenade" found no target. It was reported —
    `addKeyword: target not found` — and the build went green anyway, which is
    how a published keyword stayed out of the app.

    The rule here is the project's own: the books are the authority and the
    catalogues are the convenience. A rename happens only when the books print
    exactly one of the two names, so this can never invent a third spelling or
    pick between two attested ones. Everything else is left alone and reported.
  */
  const bookText = [
    'data-sources/rulebook/extracted/trench-crusade-digital-rulebook.txt',
    'data-sources/rulebook/extracted/warbands-of-trench-crusade.txt',
    'data-sources/carcass-front/extracted/carcass-front-book.txt',
  ].filter((f) => fs.existsSync(f))
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ');

  const printedInABook = (name) => {
    const n = String(name ?? '').replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim();
    if (n.length < 4) return false;
    return bookText.includes(n);
  };

  /*
    Only a SPELLING SLIP is a rename. Two guards, both load-bearing:

    - the names must be near-identical, which excludes an entry whose profile
      is a different label entirely (a `Melee` group holding a `Knight
      Companion of the Bladed Fly` profile);
    - neither may contain the other, which excludes the deliberate decorations
      the catalogues use — `Claimed: Automatic Pistol` for the Court's looted
      copy, `Friends in High Places [9]` for a table roll. Stripping those
      collapses entries the game keeps apart, and a first pass at this renamed
      123 things for exactly that reason.

    What is left is the real class: Catphract, Elixer, Call of Flesh, Demonic
    Grenade.
  */
  const editDistance = (a, b) => {
    const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i += 1) {
      let diag = prev[0];
      prev[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const tmp = prev[j];
        prev[j] = Math.min(
          prev[j] + 1,
          prev[j - 1] + 1,
          diag + (a[i - 1] === b[j - 1] ? 0 : 1),
        );
        diag = tmp;
      }
    }
    return prev[b.length];
  };
  /*
    Two shapes of slip, because they need different measures.

    A letter dropped or swapped — Catphract, Elixer — is a character-distance
    match. A word dropped — "Demonic Grenade" for "Demonic Aura Grenade",
    "Call of Flesh" for "Call of the Flesh" — is not: those are only 0.75 alike
    by characters, under any threshold that does not also sweep in real pairs.
    So a one-word omission is matched on the word sequence instead.
  */
  const oneWordDropped = (a, b) => {
    const [short, long] = a.split(' ').length <= b.split(' ').length ? [a, b] : [b, a];
    const s2 = short.toLowerCase().split(/\s+/);
    const l2 = long.toLowerCase().split(/\s+/);
    if (l2.length - s2.length !== 1) return false;
    // Every word of the short name appears in the long one, in order.
    let i = 0;
    for (const w of l2) if (i < s2.length && s2[i] === w) i += 1;
    return i === s2.length;
  };

  const nearlyTheSame = (a, b) => {
    const [x, y] = [a.toLowerCase(), b.toLowerCase()];
    if (x.includes(y) || y.includes(x)) return false;
    if (oneWordDropped(a, b)) return true;
    return 1 - editDistance(x, y) / Math.max(x.length, y.length) >= 0.85;
  };

  /*
    Where no book can decide, a maintainer does — and it is written down.

    Some gear is not book content at all: the Fireteam formations are community
    additions, so neither spelling of "Cataphract Formation Alpha" appears in
    any of the six official documents and the rule above correctly refuses to
    guess. `_gearNames` in resolutions.json rules on those, with a reason, the
    same way the file rules on a value two sources disagree about.

    A standoff with no ruling stays reported. Silence would put the app back to
    shipping whichever name the catalogue happened to put on the profile.
  */
  const gearNameRulings = (() => {
    const f = 'data-sources/resolutions.json';
    if (!fs.existsSync(f)) return {};
    return JSON.parse(fs.readFileSync(f, 'utf8'))._gearNames ?? {};
  })();

  const gearRenames = [];
  const gearNameStandoffs = [];
  const gearNamesRuled = [];
  for (const w of base.weapons ?? []) {
    if (!w.entryName || w.entryName === w.name) continue;
    if (!nearlyTheSame(w.name, w.entryName)) continue;
    const profileInBook = printedInABook(w.name);
    const entryInBook = printedInABook(w.entryName);
    // Exactly one attested: that one is the name. Both or neither: leave it.
    if (entryInBook && !profileInBook) {
      gearRenames.push({ from: w.name, to: w.entryName });
      w.profileName = w.name;
      w.name = w.entryName;
    } else if (!entryInBook && !profileInBook) {
      const ruling = gearNameRulings[w.name];
      if (!ruling) {
        gearNameStandoffs.push(`${w.name} / ${w.entryName} — neither spelling is printed in any book`);
      } else {
        const want = ruling.use === 'entry' ? w.entryName : w.name;
        if (ruling.value && ruling.value !== want) {
          throw new Error(
            `rules-build: the _gearNames ruling for '${w.name}' says use the `
            + `${ruling.use} name and states '${ruling.value}', but the ${ruling.use} `
            + `name is '${want}'. The catalogue has changed under the ruling; `
            + 're-read it in data-sources/resolutions.json rather than trusting either.');
        }
        if (want !== w.name) {
          gearNamesRuled.push({ from: w.name, to: want, why: ruling.use });
          w.profileName = w.name;
          w.name = want;
        } else {
          gearNamesRuled.push({ from: w.name, to: want, why: `${ruling.use}, unchanged` });
        }
      }
    }
  }
  /*
    The entry's own name ships as `aliases`, where it differs from the
    profile's.

    It used to be deleted as scaffolding for the pass above. What that lost is
    a name OUR OWN catalogue carries: the Iron Sultanate's `selectionEntry
    name="Elixer of Al-Khidr"` (`Iron Sultanate.cat:77`) wraps a profile named
    `Elixir of Al-Khidr` (`:90`) — their misspelling and ours, in one entry —
    and a Trench Companion warband that carries `eq_exlixerofalkhidr` has no
    other route to it. Without this the only way to resolve that item was a
    hand-written equivalence, which is a mapping the project has a rule about;
    with it the answer is derived from the catalogue, like every other name.

    Only where it differs, so the field is on the few hundred entries that have
    something to say rather than on every one; and only as an ALIAS, consulted
    after every name has failed. That ordering is what makes it safe. An
    earlier attempt made the entry name the entry's NAME and produced
    `Automatic Pistol -> Stolen: Automatic Pistol` and
    `Melee -> Knight Companion of the Bladed Fly` (see `parse-battlescribe.mjs`,
    the bundle note) — redirections that a lookup consulting names first can no
    longer make, because the ordinary name answers first.

    `profileName` stays on the three that were renamed — that one is provenance,
    and it is what tells a reader why the app's name differs from the
    catalogue's.
  */
  for (const w of base.weapons ?? []) {
    if (w.entryName && w.entryName !== w.name) w.aliases = [w.entryName];
    delete w.entryName;
  }

  const kitByName = new Map(battlekit.entries.map((b) => [nameKey(b.name), b]));
  for (const e of warbandsKit.entries) {
    const k = nameKey(e.name);
    if (!kitByName.has(k)) kitByName.set(k, e);
  }

  /*
    A third source: the profiles a loadout bundle hands out that neither book
    names and that the weapon emit deliberately skips.

    `Shield` is the whole of it. It is a generic Battlekit profile in the
    shared .gst; the chapter prints `Trench Shield`, which is a different entry
    that also exists, so the two are not the same thing and neither may be
    renamed into the other. Without this the Shield a `Polearm and Shield`
    loadout grants was an item the engine knew nothing about: no section, so it
    counted against the one-Shield limit not at all, and no hands, so it did
    not trigger the Shield restrictions on the weapons beside it.

    The section is derived from the chapter's OWN Type -> section pairings
    rather than from a mapping written here, and an ambiguous one is left
    unset: a wrong section is a legality error on a legal roster, which is the
    failure mode this codebase has been paying for.
  */
  const sectionsByType = new Map();
  for (const e of kitByName.values()) {
    const k = `${e.type}|${/melee/i.test(e.range ?? '') ? 'melee' : 'ranged'}`;
    if (!sectionsByType.has(k)) sectionsByType.set(k, new Set());
    sectionsByType.get(k).add(e.section);
  }
  const bundleKit = [];
  for (const pr of base.bundleProfiles ?? []) {
    if (kitByName.has(nameKey(pr.name))) continue;
    const found = sectionsByType.get(
      `${pr.type}|${/melee/i.test(pr.range ?? '') ? 'melee' : 'ranged'}`);
    const section = found && found.size === 1 ? [...found][0] : '';
    const entry = { ...pr, section, note: '' };
    kitByName.set(nameKey(pr.name), entry);
    bundleKit.push(entry);
  }

  if (bundleKit.length) {
    console.log(`  battlekit (granted by a loadout bundle): ${bundleKit.length} — `
      + bundleKit.map((e) => `${e.name} (${e.section || 'SECTION UNRESOLVED'})`).join(', '));
  }

  const allBattlekit = [...kitByName.values()];

  const dataset = {
    units: base.units,
    weapons: base.weapons,
    factions: factionRules.map((f) => ({
      id: f.faction.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name: f.faction,
      // Every faction starts on 700 Ducats; kept per-faction because the
      // variants change it and a future faction need not match.
      budget: { ducats: f.budget ?? 0, glory: 0 },
      specialRules: f.specialRules,
      /*
        'Faithful' or 'Fallen', from the book's own closing sentence — see
        `parseFactionRules`. A Mercenary's hosts are stated by alignment, so
        this is what `allowedAlignment` resolves against; until now only the
        Carcass Front lists carried one and the core six had none.
      */
      alignment: f.alignment,
      // Distinguishes "the book says this faction has no special rules" from
      // "we failed to find any" — only the first is a fact about the game.
      noSpecialRules: Boolean(f.explicitlyNone),
    })),
    /**
     * The Keyword Glossary, verbatim, Tag/Effect distinction intact.
     *
     * The book draws that distinction and it is itself a rule — "a Keyword that
     * confers an Effect also acts as a Tag" — so the two are carried through
     * rather than flattened into one list.
     */
    keywords,
    /** The scenarios, as printed, with their maps resolved. */
    scenarios,
    /**
     * Terrain pieces that carry rules of their own — the Levant Hedgehog and
     * the Naval Mine, with its 2D6 detonation table and blast profile.
     *
     * The book states they are for use in ANY game, not only its own five
     * scenarios, so they are a collection rather than a section of one.
     */
    terrain: ruleset.layers.includes(CARCASS_FRONT)
      ? cf.terrain.map((t) => ({ ...t, source: 'carcass-front' }))
      : [],
    /**
     * The Random Scenario Generator, as a procedure the app can run.
     *
     * Undefined for a ruleset without the supplement — that ruleset genuinely
     * has no generator, which is a different thing from one we failed to read,
     * and the Codex says so rather than falling back to the invented tables it
     * used to roll.
     */
    scenarioGenerator: ruleset.layers.includes(CARCASS_FRONT) ? generator : undefined,
    /**
     * The Carcass Front campaign map's three tables.
     *
     * Undefined without the supplement, for the same reason as the generator
     * above: that ruleset has no campaign map, which is a different thing from
     * one we failed to read.
     */
    carcassFrontMap: ruleset.layers.includes(CARCASS_FRONT) ? cfMap : undefined,
    /**
     * The Core Rules and Comprehensive Rules chapters, in the book's order.
     *
     * The Codex read eight hand-written chapters until this existed. They gave
     * Initiative to whoever rolled highest on a D6 — the book gives it to the
     * player with the FEWEST models, and rolls only on a tie — put the Success
     * table's failure band at 1-6 when 1 is not a result on 2D6, and triggered
     * Morale at "50% of starting models" rather than the book's "half the
     * models in your Warband (rounded up)". A player checks the Codex exactly
     * when they cannot check the book.
     */
    coreRules: coreRules.chapters,
    markers,
    /**
     * The official Rules Commentaries — the game's own FAQ, 51 entries.
     *
     * Attributed by the label the document puts on every question (`RULES Q1`,
     * `MISC. Q7`) rather than by which heading it sits under, because heading
     * detection is where this class of parser goes wrong and a per-entry label
     * cannot drift from the entry it labels.
     */
    commentaries,
    /**
     * The Weather Events table, from the Hell on Earth module.
     *
     * The app used to roll six invented weather conditions in the Codex and
     * offer five more in the Play Mode lobby, none of which appears in any
     * source. They were deleted with nothing put in their place, because
     * nothing beats a made-up rule at a table. This is the published one.
     */
    weather,
    /**
     * The Patrons. A ruleset without the supplement's layer gets the
     * rulebook's eight; with it, Carcass Front's three as well — the book is
     * explicit that they are for any campaign, not only its own.
     */
    patrons: ruleset.layers.includes(CARCASS_FRONT)
      ? patrons
      : patrons.filter((p) => p.source === 'rulebook'),
    /**
     * The Carcass Front campaigns and their Vision cards.
     *
     * Empty without the supplement's layer, which is the honest answer: that
     * ruleset has no Carcass Front campaign, as distinct from one we failed to
     * read.
     */
    campaigns: ruleset.layers.includes(CARCASS_FRONT) ? campaigns : [],
    visionCards: ruleset.layers.includes(CARCASS_FRONT) ? visionCards : [],
    /**
     * The Battlekit chapter, verbatim.
     *
     * The Codex's arsenal read 34 hand-written wargear records until this
     * existed, each with a single typed Ducat cost — and wargear is priced per
     * faction, so one cost on one record was wrong for five factions out of
     * six by construction. Prices come from the Armoury Tables; this carries
     * the prose they do not print.
     */
    battlekit: allBattlekit,
    /**
     * Loadout bundles: one selectable name that grants several items.
     *
     * `Polearm and Shield` is a Mercenaries entry with no profile of its own
     * that links a Polearm and a Shield. A roster holding that name matched
     * nothing and was reported as "not in this ruleset" — excluded from every
     * legality check while the player was told their list was provisional.
     */
    bundles: base.bundles ?? [],
    /**
     * BattleScribe's own bookkeeping entries, which are not wargear.
     *
     * `Alchemical Ammuntion (Loaded)` is a hidden entry capped at zero across
     * the roster that a modifier increments once per `Alchemical Ammunition`
     * bought. It has no cost, no profile and no rules, and a player cannot
     * choose it — but a roster carrying one was reported under "NOT IN THIS
     * RULESET", telling the player their list is provisional over a thing that
     * is not an item.
     */
    counters: base.counters ?? [],
    /**
     * Carrying allowances a model's own entry states — see the type.
     *
     * Only the sentences that name their own condition are read. The book
     * states four more of the same shape that say "It can have…", where "it"
     * is the entry the paragraph sits under; those need document structure
     * this reader does not have and are REPORTED below rather than guessed at.
     */
    carryAllowances: carryAllowances.allowances,
    /**
     * The per-model carrying limits, from the chapter's own bullets.
     *
     * Derived rather than typed into a constant for the ordinary reason: a
     * number in a TypeScript file is a number nobody re-checks against the
     * page it came from. Each rule keeps the sentence it was read from, both
     * so the app can cite the wording and because "unless otherwise stated"
     * means the caller has to be able to see what was stated.
     */
    /**
     * Keywords an option gives the model that takes it, by the option's name.
     *
     * A granted Keyword appears nowhere on the catalogue entry — Al-Masyukh
     * has STRONG only because it bought Inhuman Strength — and several rules
     * are keyed on a model's Keywords. Read from the option's own rules text;
     * see `keywordGrantsFrom`.
     */
    keywordGrants: (() => {
      const byName = new Map();
      for (const u of base.units) {
        for (const o of u.options ?? []) {
          const grants = keywordGrantsFrom(o.description);
          if (grants.length && !byName.has(o.name)) {
            byName.set(o.name, { name: o.name, grants, raw: o.description });
          }
        }
      }
      return [...byName.values()];
    })(),
    battlekitLimits: {
      limits: battlekitLimits.limits,
      withShield: battlekitLimits.withShield,
      /**
       * The same question answered by the Keyword Glossary rather than by the
       * chapter's bullets. Kept beside them because a model's carrying
       * capacity is decided by both at once, and a caller that read one and
       * not the other would be confidently wrong.
       */
      byKeyword: keywordCarry.rules,
    },
    /**
     * The campaign economy's published numbers.
     *
     * `thresholds` caps the Force you field, not the roster you own, and rises
     * with the game number; `startingBudget` is what a new warband recruits on.
     * Both are derived, because the app's editable `ducatLimit` is exactly the
     * hand-set number this table replaces.
     */
    campaign: {
      thresholds: parseThresholdTable(),
      startingBudget: startingBudget.ducats,
      /**
       * The scale a campaign is actually won on (p.95).
       *
       * The Campaign Hub ranked members on `glory` and `rating` — neither of
       * which is how the game says a season is decided — so the standings
       * answered a question the rules do not ask, and the one they do ask had
       * no answer anywhere in the app.
       */
      victoryPoints: parseCampaignVictoryPoints(),
      // The Exploration Step, which is the Strongbox's only income: loot is the
      // Exploration Roll times 10. The app's hand-written version of this was
      // fabricated end to end (AUDIT §1.13).
      exploration: parseExploration(),
      /*
        The Carcass Front tables, on a ruleset that carries the supplement.

        Undefined otherwise, which is the honest answer: that ruleset has no
        Carcass Front Exploration Tables, as distinct from tables we failed to
        read.
      */
      carcassFrontExploration: ruleset.layers.includes(CARCASS_FRONT)
        ? carcassFrontExploration : undefined,
      /* 3D6 that does not grow with games played, and loot at five a point
         rather than ten. Undefined on a ruleset without the supplement, which
         is the honest answer and the one the panel refuses on. */
      carcassFrontExplorationStep: ruleset.layers.includes(CARCASS_FRONT)
        ? carcassFrontExplorationStep : undefined,
      // The other two post-battle tables. `officialRulesData.ts` still holds
      // hand-written versions of both, and the four Skills tables there are
      // fabricated (AUDIT §1.13) — these are what replaces them.
      skills: parseSkillsTables(),
      /*
        When a model may make an Advancement Roll.

        From the catalogue rather than the book, and that is not a precedence
        slip: page 105 describes the track ("when you reach a box that is a
        circle") and the circles are printed on the Roster Sheet, which the
        text extraction does not carry. The catalogue is the only machine-
        readable record of where they are. See `parseExperienceTrack` for the
        one place it deliberately differs from NewRecruit.
      */
      experience: parseExperienceTrack(),
      trauma: parseTraumaTable(),
      /**
       * Who is entitled to roll on that table, and what removes a model.
       *
       * Shipped separately from the table because they failed separately: the
       * table was derived and correct while the procedure had never been
       * parsed at all, so the wizard offered a D66 Trauma roll to a Troop who
       * by the book takes one D6 and dies on a 1-2. See
       * docs/RULES-COVERAGE-AUDIT.md RC-01 and RC-05.
       */
      traumaProcedure: parseTraumaProcedure(),
      /**
       * What Calling for Reinforcements costs, in the book's six steps.
       *
       * The app offered the choice and applied one clause of it — the
       * forfeiture of Exploration and the Quartermaster — while keeping the
       * Arsenal and the Strongbox the other five say you give up. See
       * docs/RULES-COVERAGE-AUDIT.md RC-09.
       */
      reinforcements: parseReinforcementsSequence(),
      /**
       * The Quartermaster Step's own two numbers.
       *
       * `retireInjured.atScars` is the count at which a player MAY retire a
       * model (p.123) — a different rule from `traumaProcedure.battleScars`,
       * which is the count at which the book retires one for them. The app had
       * the compulsory one and not the voluntary one, so a Warband's two-scar
       * veterans could only leave the roster by dying.
       *
       * `gloryItems` is the gate (p.125): a Glory Item needs an Exploration
       * discovery before it can be bought at all. What a given discovery
       * permits is stated by that discovery, in `exploration.locations`.
       */
      quartermaster: parseQuartermasterStep(),
      /**
       * Which scenario a campaign game is played on (p.96).
       *
       * Three D6 tables banded by game number, and a twelfth game the book
       * names outright. The Mission Generator picked from the whole scenario
       * list at every game, so a first game could land on From Below and the
       * Great War could turn up in game two — the bands exist precisely so
       * that it cannot.
       *
       * Resolved against `scenarios` as it is built above, so a table naming a
       * scenario this ruleset does not carry fails the build.
       */
      scenarioTables: parseCampaignScenarioTables(scenarios),
      /**
       * The six Campaign Phase Steps, in the order the book states.
       *
       * The app's post-battle wizard has four, two of them named things the
       * book does not use, and it omits Reinforcements and Quartermaster
       * entirely. The order is not decoration: Reinforcements comes BEFORE
       * Exploration and taking it costs you both Exploration and the
       * Quartermaster, which a four-step sequence cannot express.
       */
      phaseSteps: parseCampaignPhaseSteps(),
      /**
       * Who may be Promoted, and how much Experience a model may hold.
       *
       * The app had neither bound. Promotion was a free switch on the unit
       * card, so a Warband could promote a model the book forbids and could
       * hold any number of ELITE models; and Experience was granted with no
       * cap, so a LIMITED POTENTIAL model went past the 7 the book allows.
       *
       * The dice half of the step — the Promotion Dice Pool, its assignment
       * rule and the five-miss counter — is derived separately, with the step
       * that rolls it. See docs/RULES-COVERAGE-AUDIT.md RR-05.
       */
      promotions: parsePromotions(
        factionRules.map((f) => ({
          id: f.faction.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          name: f.faction,
        })),
        base.units),
    },
    meta: {
      rulesetId: ruleset.id,
      // Deliberately no build timestamp: the output must be reproducible so CI
      // can prove the committed data still matches data-sources/. The base
      // commit and the layer list already identify the dataset exactly.
      baseCommit: manifest.commit,
      /*
        The catalogue files this dataset was actually built from.

        Shipped so the app can ask a real freshness question — "has anything I
        am built on changed upstream?" — rather than the one it asked before,
        which was "what is upstream's latest commit?" with nothing to compare it
        to. Taken from the manifest, which is what `rules:fetch` pinned, and not
        from a list in the app: a hand-kept copy in `githubSync.ts` had already
        drifted, missing `Campaign Rules.cat`, so an upstream change to the
        injury, skill or exploration tables was invisible to the check.
      */
      baseFiles: Object.keys(manifest.files).sort(),
      layers: ruleset.layers,
    },
  };

  const provenance = createProvenance();
  stampBase(dataset, provenance, { commit: manifest.commit, fileOf: (e) => e.sourceFile });

  // 2. layer
  const layers = ruleset.layers.map(loadLayer);
  /*
    Ops that need `dataset.armouries`, which does not exist yet — the
    armouries are assembled below, out of the catalogues, after the layers
    have run. They are applied in a second pass and counted, so one cannot
    fall between the two.
  */
  const deferredOps = [];
  /* Keywords a layer took OFF an entry — see the cross-check below. */
  const keywordRemovals = [];
  const layerReport = applyLayers(dataset, layers, provenance, {
    includeBeta: ruleset.includeBeta,
    deferred: deferredOps,
    removals: keywordRemovals,
  });

  /*
    An entry that both does and does not have a keyword.

    When a layer replaces an entry it sets the keyword row the new page
    prints, which can REMOVE one — the Dispatch's Amalgam row prints four
    where the catalogue carries five, so STRONG goes. The catalogue's
    abilities are kept, deliberately: dropping an ability asserts that the PDF
    extraction captured a complete list, and an ability wrongly deleted is
    harder to notice than one wrongly kept.

    That reasoning assumed a wrongly-kept ability is inert. It is not always:
    the Amalgam keeps `Strong-ish`, whose text is "Two of the arms of the
    Amalgam have the Keyword STRONG", so the shipped entry contradicts itself.

    Reported, not resolved — resolving it means deleting a published ability
    or restoring a keyword the printed row omits, and both need the page.
  */
  for (const r of keywordRemovals) {
    const contradicts = (r.target.abilities ?? []).filter((a) =>
      r.removed.some((k) => new RegExp(`\\b${k}\\b`).test(a.description ?? '')));
    if (!contradicts.length) continue;
    console.log(`  ⚠ ${r.entity}: the layer removed the ${r.removed.join(', ')} `
      + `Keyword${r.removed.length > 1 ? 's' : ''}, but ${contradicts.length} retained `
      + `ability still names ${r.removed.length > 1 ? 'one' : 'it'}: `
      + `${contradicts.map((a) => a.name).join(', ')}. The entry contradicts itself; `
      + 'confirm against the printed page.');
  }

  /*
    The two ways a catalogue says ELITE must not disagree.

    The rulebook defines a Troop as "any models in your Warband that do not
    have the ELITE Keyword", and the Trauma Step turns on that one word: a
    Troop rolls one D6 and dies on a 1-2, an ELITE model rolls D66 on the
    Trauma Table. Get it backwards and the app kills the wrong model.

    But the catalogues only print the literal keyword on 8 of 105 entries.
    They express the same fact structurally, by which selectionEntryGroup an
    entry sits in — which is what `roles` carries, and 35 entries have it. So
    `roles` is the signal the app must use, and the keyword is a decoration
    that happens to be there sometimes.

    That is fine exactly as long as the decoration never contradicts the
    structure. If an upstream edit ever prints ELITE on an entry filed as a
    Troop, the app would send it to the wrong table with nothing to say so.
    This is the check that says so.

    Deliberately one-directional: an Elite-role entry WITHOUT the keyword is
    the normal case, 27 times over, and is not an error.
  */
  const eliteDisagreements = dataset.units.filter((u) =>
    (u.keywords ?? []).some((k) => k.toUpperCase() === 'ELITE')
    && !(u.roles ?? []).some((r) => r.toLowerCase() === 'elite'));
  if (eliteDisagreements.length) {
    throw new Error(
      'rules-build: entries carry the ELITE Keyword but are not filed under an '
      + `Elite role: ${eliteDisagreements.map((u) => `${u.name} (${u.factionId}, `
      + `roles: ${(u.roles ?? []).join('/') || 'none'})`).join('; ')}. `
      + 'The Trauma Step reads the role, so these models would take a Troop\'s '
      + 'D6 Survival Roll instead of a D66 Trauma roll. Resolve which the '
      + 'catalogue means before shipping.');
  }


  // ------------------------------------------------------------- armouries
  //
  // The Armoury Table is the pricing and legality authority, and it is per
  // faction. An Automatic Rifle is 40 Ducats with "Limit: 1" in the New Antioch
  // and Trench Pilgrims armouries, and 2 Glory with "Limit: 2" in the Heretic
  // Legions one — the price and the restriction both differ.
  //
  // So the armoury is modelled as itself rather than flattened onto the weapon.
  // A weapon entry is a profile: what it does. An armoury row is an offer: what
  // this faction pays for it and under what condition. A warband buys from its
  // faction's armoury, which is exactly how the book reads.
  const slug = (n) => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const weaponByName = new Map();
  for (const w of dataset.weapons) {
    const k = w.name.toLowerCase();
    if (!weaponByName.has(k)) weaponByName.set(k, w);
  }

  const armouryByFaction = new Map();
  let unmatchedRows = 0;
  for (const row of armoury) {
    if (!row.faction) continue;
    const id = slug(row.faction);
    if (!armouryByFaction.has(id)) {
      armouryByFaction.set(id, { factionId: id, faction: row.faction, rows: [] });
    }
    const w = weaponByName.get(row.name.toLowerCase());
    if (!w) unmatchedRows++;
    armouryByFaction.get(id).rows.push({
      name: row.name,
      // Null where the rulebook lists Battlekit the catalogues do not carry.
      // Recorded rather than dropped: it is a real offer the player can take.
      weaponId: w?.id ?? null,
      section: row.section,
      cost: { ducats: row.ducats, glory: row.glory },
      restrictions: row.restrictions ? [row.restrictions] : [],
    });
  }
  dataset.armouries = [...armouryByFaction.values()];

  /*
    The Glory Item Tables (pp.125 to 127), which had never been parsed at all.

    They join the faction's own armoury as a `Glory Items` section rather than
    a collection of their own, because every reader of an offer already goes
    through `armouryFor` / `offersOf` / `priceOf` / `restrictionsFor`, and a
    second collection would be a second place each of them has to learn about.
    It is also the shape the Dispatch's own ops assume — "Add the following
    entry to the BLACK GRAIL Glory Items Table" had no table to add to, and
    reported as unapplied on every build.

    The SECTION is what makes them gateable. Page 125 distinguishes a Glory
    Item from the Glory-priced Battlekit in a faction's Armoury Table, and only
    the first needs an Exploration discovery — so `gloryItemGate` in
    `src/rules/gloryItems.ts` keys on `section`, never on the currency. A
    Martyrdom Pill is 1 Glory and needs no discovery; a Knighthood is 4 Glory
    and does.

    A table whose faction has no armoury is a build failure rather than a
    dropped table: it would mean a whole faction's Glory Items silently on
    offer to nobody.
  */
  /*
    A Glory Item's profile comes from `Campaign Rules.cat` and from nowhere
    else, because that is the catalogue the Glory Items are entered in — 25 of
    the 34 distinct rows resolve there and the rules text on each one is the
    Glory Item Cartulary's.

    Matching by name across every catalogue instead leaks: the Iron Sultanate
    catalogue carries a `Rocket-Propelled Grenade` gated on `Nomads of
    Al-Badia`, which `thirdPartyGate` classes as unofficial content, and the
    rulebook prints an official Rocket-Propelled Grenade in five Glory Item
    Tables. A bare name match handed New Antioch's official Glory Item the
    unofficial Sultanate profile, and third-party wargear reached the recruit
    list of a faction that had not opted in.

    A row that resolves to nothing keeps `weaponId: null`, which is the same
    answer the Armoury Tables already give for Battlekit the catalogues lack:
    the offer is real and priced by the book, and its rules are in the
    Cartulary rather than in a catalogue.
  */
  const GLORY_CATALOGUE = 'Campaign Rules.cat';
  const gloryProfileByName = new Map();
  for (const w of dataset.weapons) {
    if (w.sourceFile !== GLORY_CATALOGUE) continue;
    const k = w.name.toLowerCase();
    if (!gloryProfileByName.has(k)) gloryProfileByName.set(k, w);
  }

  const gloryTables = parseGloryItemTables(dataset.factions ?? []);
  for (const table of gloryTables) {
    const armoury = armouryByFaction.get(table.factionId)
      ?? dataset.armouries.find((a) => a.factionId === table.factionId);
    if (!armoury) {
      throw new Error(
        `rules-build: the "${table.faction} Glory Items" table resolves to faction `
        + `"${table.factionId}", which has no Armoury Table to join. Its `
        + `${table.rows.length} Glory Items would be readable by nobody.`);
    }
    for (const row of table.rows) {
      const w = gloryProfileByName.get(row.name.toLowerCase());
      if (!w) unmatchedRows++;
      armoury.rows.push({
        name: row.name,
        weaponId: w?.id ?? null,
        section: row.section,
        cost: row.cost,
        restrictions: row.restrictions,
        ...(row.priceRange ? { priceRange: row.priceRange } : {}),
      });
    }
  }

  /*
    Carcass Front prints its own Armoury Table per faction, in the same shape
    and with the same authority. It is merged here rather than layered because
    the assignment above replaces the whole collection — see loadLayer.

    Only for a ruleset that actually carries the layer: `github-latest` is the
    community catalogues as published, and the supplement is not in them.
  */
  if (ruleset.layers.includes(CARCASS_FRONT)) {
    for (const a of carcassFront.armouries) {
      dataset.armouries.push({
        ...a,
        // Resolved against the layered weapon list, so a supplement row naming
        // a core weapon (Sniper Rifle, Bolt-Action Rifle) points at the same
        // profile every other faction's armoury does, and its own Battlekit
        // points at the entry the layer just added.
        rows: a.rows.map((r) => {
          const w = weaponByName.get(r.name.toLowerCase());
          if (!w) unmatchedRows++;
          return { ...r, weaponId: w?.id ?? null };
        }),
      });
    }
  }

  /*
    The second layer pass: rows a layer adds to a faction's Armoury Table.

    The Dispatch's two new Glory Items arrive here. Without it they would have
    profiles in the Codex and no price and no faction stocking them — readable
    by a player and takeable by nobody.

    Every op deferred by the first pass must be accounted for by this one. A
    layer op that quietly disappears between two passes is a published rule the
    app does not have and nobody is told about, which is the failure this
    pipeline exists to prevent.
  */
  /*
    Two second passes, over one deferred queue.

    Armoury rows and Variant amendments are both deferred for the same reason —
    neither collection exists when the layers run — but they are applied at
    different points, because `dataset.variants` is assembled later still. Each
    pass ignores the other's ops, so the accounting below counts only its own.
  */
  const variantDeferred = deferredOps.filter((d) => d.op.target?.kind === 'variant');
  const armouryDeferred = deferredOps.filter((d) => d.op.target?.kind !== 'variant');

  const armouryOps = applyArmouryRowOps(dataset, deferredOps);
  if (armouryOps.applied + armouryOps.unresolved.length + armouryOps.notes.length
      !== armouryDeferred.length) {
    throw new Error(
      `rules-build: ${armouryDeferred.length} layer op(s) were deferred to the armoury `
      + `pass but only ${armouryOps.applied + armouryOps.unresolved.length
         + armouryOps.notes.length} were accounted for. An op has been lost `
      + 'between the two passes.');
  }


  // The weapon keeps the union of every armoury's restrictions as a quick
  // "this is restricted somewhere" signal, stamped so it can say where from.
  // The per-faction row above is what actually governs a roster.
  const restrictionsByName = new Map();
  for (const row of armoury) {
    if (!row.restrictions) continue;
    const k = row.name.toLowerCase();
    if (!restrictionsByName.has(k)) restrictionsByName.set(k, new Set());
    restrictionsByName.get(k).add(row.restrictions);
  }
  let restricted = 0;
  for (const w of dataset.weapons) {
    const hit = restrictionsByName.get(w.name.toLowerCase());
    if (!hit || !hit.size) continue;
    w.restrictions = [...hit];
    restricted++;
    provenance.stamp('weapon', w.id, 'restrictions', {
      layer: 'base',
      source: 'rulebook:warbands-of-trench-crusade#armoury',
      verified: 'rulebook:warbands-of-trench-crusade',
    });
  }

  // ------------------------------------------------------------- variants
  //
  // A Warband Variant's mechanical effect is not prose to be transcribed: it is
  // already in the catalogues, as modifiers conditioned on that variant being
  // selected at roster scope. "Pride of Jabir: a House of Wisdom Warband can
  // include 0-3 Lions of Jabir" is an `increment` on the Lion's roster max.
  //
  // Ops are matched to a variant by its entry id, never by name. Matching on a
  // roster-scope condition's name alone also catches units, campaign settings
  // and the Court's seven sins — 44 "variants" for 17 real ones.
  const conditionLeaves = (c, out = []) => {
    if (!c) return out;
    if (c.all) c.all.forEach((x) => conditionLeaves(x, out));
    else if (c.any) c.any.forEach((x) => conditionLeaves(x, out));
    else out.push(c);
    return out;
  };

  const opsByVariantId = new Map();
  for (const u of dataset.units) {
    for (const m of u.modifiers ?? []) {
      for (const leaf of conditionLeaves(m.when)) {
        if (leaf.scope !== 'roster' && leaf.scope !== 'force') continue;
        if (!leaf.childId) continue;
        if (!opsByVariantId.has(leaf.childId)) opsByVariantId.set(leaf.childId, []);
        opsByVariantId.get(leaf.childId).push({
          op: m.op,
          target: { kind: 'unit', id: u.entryId ?? u.id, name: u.name },
          field: m.field,
          value: m.value,
          ...(m.constraintBound ? { constraintBound: m.constraintBound } : {}),
        });
      }
    }
  }

  // The rulebook parse is kept as the cross-check on the prose, not the source:
  // the catalogues carry the same special rules with full published text, and
  // three variants the Warbands PDF extraction never produced.
  // The PDF prints variant headings in caps and drops articles, so "THE HOUSE
  // OF WISDOM" and "TRENCH GHOST" have to reach "The House of Wisdom" and
  // "Trench Ghosts". Normalise case and punctuation, drop a leading article,
  // and treat one name containing the other as the same variant — otherwise
  // every heading looks like a variant the catalogues are missing.
  const variantKey = (n) => String(n).toLowerCase()
    // The PDF transliterates: Stoßtruppen prints as STOSSTRUPPEN. NFKD leaves
    // ß alone, so spell it out before normalising.
    .replace(/ß/g, 'ss').normalize('NFKD')
    .replace(/[^a-z0-9 ]+/g, '').replace(/^the /, '').replace(/\s+/g, '');
  const sameVariant = (a, b) => {
    const [x, y] = [variantKey(a), variantKey(b)];
    return x === y || x.startsWith(y) || y.startsWith(x);
  };
  const bookFor = (name) => variants.find((v) => sameVariant(v.name, name));

  /*
    A variant that musters on its own economy.

    "Specialist Force: You have 500 👑 and 11 ☼ to recruit a Papal State
    Intervention Force Warband for a campaign … its Threshold Value is reduced
    by 200 👑" is not flavour text: it is the purse, the threshold and the
    Reinforcements payout, and the app was printing it while mustering the
    warband on the faction's 700 👑 anyway.

    Both sources carry the rule, in different spellings — glyphs in the PDF,
    words in the catalogue — so both are read and required to agree. A
    disagreement means one source has been errata'd and the other has not, and
    picking either silently would ship a number nobody chose.
  */
  const economyFor = (v, book) => {
    const fromCatalogue = parseVariantEconomy(v.specialRules);
    const fromBook = book ? parseVariantEconomy(book.specialRules) : null;
    if (fromCatalogue && fromBook) {
      const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
      if (!same(fromCatalogue.budget, fromBook.budget)
        || fromCatalogue.thresholdDelta !== fromBook.thresholdDelta
        || fromCatalogue.reinforcementGlory !== fromBook.reinforcementGlory) {
        throw new Error(
          `rules-build: the catalogue and the Warbands book disagree on the economy `
          + `'${v.name}' states. catalogue ${JSON.stringify(fromCatalogue)} vs book `
          + `${JSON.stringify(fromBook)}. One of the two has been errata'd; resolve it `
          + 'in data-sources/resolutions.json rather than letting the build pick.');
      }
    }
    return fromCatalogue ?? fromBook;
  };

  dataset.variants = base.variantEntries.map((v) => {
    const book = bookFor(v.name);
    const economy = economyFor(v, book);
    return {
      id: variantKey(v.name),
      entryId: v.id,
      name: v.name,
      factionId: v.factionId,
      specialRules: v.specialRules,
      ops: opsByVariantId.get(v.id) ?? [],
      sources: book ? ['catalogue', 'rulebook'] : ['catalogue'],
      thirdParty: v.thirdParty || undefined,
      ...(economy?.budget ? { budget: economy.budget } : {}),
      ...(economy?.thresholdDelta !== undefined
        ? { thresholdDelta: economy.thresholdDelta } : {}),
      ...(economy?.reinforcementGlory !== undefined
        ? { reinforcementGlory: economy.reinforcementGlory } : {}),
      ...(economy ? { economyFrom: economy.statedIn } : {}),
    };
  });

  // A variant the book describes but the catalogues do not carry is a real
  // finding, not something to paper over.
  const bookOnly = variants.filter(
    (v) => !base.variantEntries.some((c) => sameVariant(c.name, v.name)));
  for (const v of bookOnly) {
    const economy = parseVariantEconomy(v.specialRules);
    dataset.variants.push({
      id: variantKey(v.name), name: v.name, factionId: '',
      specialRules: v.specialRules, ops: [], sources: ['rulebook'],
      ...(economy?.budget ? { budget: economy.budget } : {}),
      ...(economy?.thresholdDelta !== undefined
        ? { thresholdDelta: economy.thresholdDelta } : {}),
      ...(economy?.reinforcementGlory !== undefined
        ? { reinforcementGlory: economy.reinforcementGlory } : {}),
      ...(economy ? { economyFrom: economy.statedIn } : {}),
    });
  }

  // The supplement's four Warband Variants, for the same reason as its
  // armouries: `dataset.variants` is assigned wholesale just above.
  if (ruleset.layers.includes(CARCASS_FRONT)) {
    dataset.variants.push(...carcassFront.variants);
  }

  /*
    The layer ops that amend a Variant, now that the Variants exist.

    Last of the three passes, because this is the first line at which
    `dataset.variants` is complete — the catalogue entries, the book-only ones
    and the supplement's four. An op deferred and never applied is a published
    rule the app does not have, so the accounting is the same as the armoury
    pass's and the failure is just as loud.
  */
  const variantOps = applyVariantOps(dataset, variantDeferred);
  if (variantOps.applied + variantOps.unresolved.length + variantOps.notes.length
      !== variantDeferred.length) {
    throw new Error(
      `rules-build: ${variantDeferred.length} layer op(s) were deferred to the variant `
      + `pass but only ${variantOps.applied + variantOps.unresolved.length
         + variantOps.notes.length} were accounted for. An op has been lost `
      + 'between the passes.');
  }
  if (variantOps.unresolved.length) {
    for (const u of variantOps.unresolved) {
      console.log(`    ${u.op.op} on variant/${u.op.target?.id}: ${u.why}`);
    }
    throw new Error(
      `rules-build: ${variantOps.unresolved.length} variant layer op(s) did not `
      + 'resolve — THIS FAILS THE BUILD. An errata that cannot find its target is '
      + 'a rule the app silently does not have.');
  }
  if (variantOps.applied) {
    console.log(`  variant layer ops applied: ${variantOps.applied}`);
  }

  /*
    Mercenary pools stated by delegation — "can use any Faithful Mercenaries
    that can be taken by Trench Pilgrim Warbands". Run for every ruleset, not
    just the one carrying the supplement: it reads whatever faction rules the
    dataset holds, so a future list stating its pool the same way is picked up
    without another special case.
  */
  const delegated = applyMercenaryDelegation(dataset);
  for (const d of delegated) {
    provenance.stamp('unit', d.unit.id, 'allowedFactions', {
      layer: 'derived',
      source: `${d.to} faction special rule '${d.rule}' — delegates to ${d.from}`,
    });
  }

  const withOps = dataset.variants.filter((v) => v.ops.length).length;
  const bookOnlyCount = bookOnly.length;

  /*
    3. apply the maintainer's decisions, then verify.

    Order matters: a resolution is a value the maintainer chose over one of the
    sources, so it has to be in the dataset before the dataset is checked
    against those sources. Applying it afterwards is what let resolutions.json
    describe decisions the app had never taken.
  */
  const res = applyResolutions(dataset, resolutions, provenance, bookEntries);
  if (res.errors.length) {
    failed = true;
    console.log('\n  Resolutions that do not match the source they cite:');
    for (const e of res.errors) console.log(`    ${e}`);
  }

  const v = verify(dataset, bookEntries, provenance, resolutions);
  const missingProv = findMissingProvenance(dataset, provenance);

  // Ops whose cost currency could not be read from the source. Reported every
  // build, loudly, because a Ducat silently read as Glory is exactly the kind
  // of wrong-but-plausible value this pipeline exists to prevent.
  //
  // A maintainer ruling clears the flag but does not make the value ordinary
  // source data: it is unreadable in the extraction and only a person holding
  // the printed page can supply it, so those ops are listed separately rather
  // than falling silent.
  const unresolvedCurrency = layers.flatMap((l) =>
    (l.ops ?? []).filter((o) => o._costCurrencyUnresolved)
      .map((o) => `${l.id}: ${o.option?.name ?? o.target?.id} — ${o._src ?? ''}`));

  const confirmedCurrency = layers.flatMap((l) =>
    (l.ops ?? []).filter((o) => o._costCurrencyConfirmed)
      .map((o) => `${l.id}: ${o.option?.name ?? o.target?.id} — ${o._src ?? ''}`));

  // A third case, and the only one of the three that is checkable in-repo: the
  // glyph is still unreadable, but the currency follows from the data rather
  // than from a person holding the page. The Mercenary costs are the example —
  // the catalogue prices that whole section in Glory, and the entries the
  // Dispatch reprints without changing agree with it to the number.
  //
  // Kept apart from `confirmedCurrency` because the line printed under that
  // heading — "confirmed against the printed page" — is not true of these, and
  // a report that overstates how a value was established is the same failure as
  // a value with no provenance at all.
  const derivedCurrency = layers.flatMap((l) =>
    (l.ops ?? []).filter((o) => o._costCurrencyDerived)
      .map((o) => `${l.id}: ${o.option?.name ?? o.target?.id} — ${o._src ?? ''}`));

  const unresolvedOps = layerReport.flatMap((r) => r.unresolved ?? []);
  const layerNotes = layerReport.flatMap((r) => r.notes ?? []);

  /*
    Entries a layer reprinted rather than introduced. The engine skipped the
    duplicate; this reads the skipped copy as a SECOND SOURCE for the entry the
    dataset already had, and reports where the two printings disagree.

    A disagreement fails the build unless resolutions.json rules on it, for the
    same reason a rulebook conflict does: two official books stating different
    numbers for one model is a fact about the sources, and the app has to say
    which one it followed and why.
  */
  const reprints = crossCheckReprints(layerNotes.filter((n) => n.reprintOf));
  const reprintConflicts = reprints.disagreed.filter((d) => !resolutions[d.key]);
  const reprintResolved = reprints.disagreed.filter((d) => resolutions[d.key]);

  summaries.push({ ruleset, v, missingProv, unresolvedOps, layerNotes, layerReport, dataset });

  console.log(`\n=== ${ruleset.name} (${ruleset.id}) ===`);
  console.log(`  units ${dataset.units.length}  weapons ${dataset.weapons.length}`);
  console.log(`  weapons carrying armoury restrictions: ${restricted}`);
  const rows = dataset.armouries.reduce((n, a) => n + a.rows.length, 0);
  console.log(`  armouries: ${dataset.armouries.length} factions, ${rows} priced rows` +
              (unmatchedRows ? `  (${unmatchedRows} row(s) name Battlekit the catalogues lack)` : ''));
  /*
    Armoury rows the book prints that `{ducats, glory}` cannot express — today
    only Grail Devotee, priced "15 👑 or 2 ☼", a CHOICE where that shape means
    "and". Reported rather than dropped: a row missing from an armoury reads
    to the legality engine as "this faction does not stock it", which is the
    false statement that hid three truncated tables for as long as it did.
  */
  for (const u of armouryUnreadable) {
    console.log(`  NOT STOCKED: ${u.faction} ${u.section} "${u.name}" (L${u.line}) — ${u.reason}`);
  }
  const mods = [...dataset.units, ...dataset.weapons]
    .reduce((n, e) => n + (e.modifiers?.length ?? 0), 0);
  const unmapped = [...dataset.units, ...dataset.weapons]
    .flatMap((e) => e.modifiers ?? []).filter((m) => m.rawField).length;
  console.log(`  conditional modifiers read: ${mods}` +
              (unmapped ? `  (${unmapped} with an unmapped field)` : ''));
  const opts = dataset.units.reduce((n, u) => n + (u.options?.length ?? 0), 0);
  const optUnits = dataset.units.filter((u) => u.options?.length).length;
  const optGroups = new Set(dataset.units.flatMap((u) => (u.options ?? []).map((o) => o.group)));
  console.log(`  unit options: ${opts} across ${optUnits} units, ${optGroups.size} groups`);
  // How much of the arsenal the chapter actually covers. Reported rather than
  // asserted: the Armoury Tables also stock faction-exclusive Battlekit printed
  // in Warbands of Trench Crusade, so a shortfall here is expected, and only a
  // *collapse* in the number means the parse broke.
  const bkKeys = new Set(dataset.battlekit.map((b) => nameKey(b.name)));
  const armouryNames = new Set(dataset.armouries.flatMap((a) => a.rows.map((r) => nameKey(r.name))));
  const described = [...armouryNames].filter((n) => bkKeys.has(n)).length;
  /*
    Glorious Deeds, counted across both books' notations. The rulebook bullets
    them (`- Bloodletting: …`); the Carcass Front book sets each as its own
    paragraph (`Doomed: A friendly model…`). Counting only bullets reported
    the same 64 whether the supplement was in the ruleset or not, which made
    the number useless as a check on the parse.
  */
  const deeds = dataset.scenarios.reduce((n, s) => {
    const body = s.sections.find((x) => x.heading === 'GLORIOUS DEEDS')?.body ?? '';
    const bullets = body.match(/^- /gm)?.length ?? 0;
    const named = body.match(/^[A-Z][A-Za-z0-9’'/ -]{1,44}:\s/gm)?.length ?? 0;
    return n + (bullets || named);
  }, 0);
  const mapped = dataset.scenarios.filter((s) => s.mapImage).length;
  console.log(`  scenarios: ${dataset.scenarios.length} (${mapped} with maps), ${deeds} Glorious Deeds`);
  if (dataset.terrain.length) {
    console.log(`  terrain pieces with rules: ${dataset.terrain.map((t) => t.title).join(', ')}`);
  }
  if (dataset.carcassFrontMap) {
    const m = dataset.carcassFrontMap;
    console.log(`  campaign map: ${m.zones.length} zones, `
      + `${m.outpostBonuses.length} Special Zone Outpost Bonuses, `
      + `${m.generator?.rows?.length ?? 0} generator rows across `
      + `${m.generator?.archetypes?.length ?? 0} archetypes`
      + (m.unreadable.length ? `  (${m.unreadable.length} UNREADABLE: `
                              + `${m.unreadable.join(' | ')})` : ''));
  }

  /*
    Carrying allowances, and the ones this reader will not attribute.

    Reported rather than dropped, the same way an unreadable Battlekit bullet
    is: a stated rule that silently goes unread is a rule silently unenforced,
    and these four are real allowances the book gives real models.
  */
  console.log(`  carry allowances: ${carryAllowances.allowances.length} read `
    + `(${carryAllowances.allowances.map((a) => `${a.model} [${a.modality}]`)
        .join(', ') || 'none'})`
    + (carryAllowances.unattributed.length
        ? `  (${carryAllowances.unattributed.length} STATED BUT UNATTRIBUTED — `
          + 'the entry heading and the prose disagree about which model states '
          + 'these, so neither is trusted: '
          + carryAllowances.unattributed.map((u) => `"${u.slice(0, 70)}…"`).join(' | ') + ')'
        : ''));

  /*
    What is read and NOT enforced, said out loud.

    A `required` or `innate` allowance states a FLOOR as well as a ceiling —
    a Scripture Guardian "must have either two 1-Handed Melee Weapons or one
    2-Handed Melee Weapon" — and `noOtherBattlekit` forbids everything else.
    The validator enforces the ceiling only. Printing the rest is the
    difference between a rule we have decided not to enforce yet and a rule
    nobody knows went unread.
  */
  const floors = carryAllowances.allowances.filter((a) => a.modality !== 'permitted');
  const closed = carryAllowances.allowances.filter((a) => a.noOtherBattlekit);
  if (floors.length || closed.length) {
    console.log('    ceiling enforced, floor recorded only: '
      + [...floors.map((a) => `${a.model} (${a.modality})`),
         ...closed.map((a) => `${a.model} (no other Battlekit)`)].join(', '));
  }
  if (carryAllowances.chapterLevel.length) {
    console.log(`    ${carryAllowances.chapterLevel.length} stated by a Keyword `
      + 'rather than an entry, read by the Keyword carrying rules: '
      + carryAllowances.chapterLevel
          .map((c) => c.match(/\b([A-Z][A-Z ]{2,})\s*\(/)?.[1].trim() ?? '?')
          .join(', '));
  }

  if (dataset.scenarioGenerator) {
    const g = dataset.scenarioGenerator;
    const deeds = g.gloriousDeeds.charts.reduce((n, c) => n + c.rows.length, 0);
    console.log(`  scenario generator: ${g.steps.length} steps, ` +
      `${g.battlefield.rows.length} archetypes, ${g.deployment.rules.length} deployments, ` +
      `${g.victory.rules.length} victory conditions, ${deeds} Glorious Deeds`);
  }
  console.log('  battle markers: '
    + (dataset.markers ?? []).map((m) =>
        `${m.name} (${m.cap === null ? 'no published cap' : `cap ${m.cap}`}, `
        + `spent by the ${m.spentBy})`).join(', '));

  console.log(`  commentaries: ${dataset.commentaries.length} FAQ entries across `
            + `${new Set(dataset.commentaries.map((c) => c.section)).size} sections`);
  const coreChapters = dataset.coreRules.filter((c) => c.category === 'Core Rules').length;
  console.log(`  core rules: ${dataset.coreRules.length} sections `
            + `(${coreChapters} Core, ${dataset.coreRules.length - coreChapters} Comprehensive)`);
  console.log(`  weather: ${dataset.weather.events.length} Weather Events (2D6)`);
  {
    const cf = dataset.patrons.filter((p) => p.source === 'carcass-front').length;
    const introduced = dataset.patrons.flatMap((p) => p.introduces);
    console.log(`  patrons: ${dataset.patrons.length} `
      + `(${dataset.patrons.length - cf} rulebook, ${cf} Carcass Front), `
      + `${dataset.patrons.reduce((n, p) => n + p.skills.length, 0)} Patron Skills`
      + (introduced.length
        ? `; ${introduced.length} item(s) printed among the Skills and carried apart: `
          + introduced.map((i) => `${i.name} (${i.kind})`).join(', ')
        : ''));
  }
  for (const c of dataset.campaigns) {
    console.log(`  campaign "${c.name}": ${c.sections.length} sections`
      + (c.buildings.length ? `, ${c.buildings.length} Camp buildings `
        + `(${c.buildings.reduce((n, b) => n + b.tiers.length, 0)} tiers)` : '')
      + (c.trackerRewards.length ? `, ${c.trackerRewards.length} Tracker rewards` : '')
      + (c.sharedObjectives.length ? `, ${c.sharedObjectives.length} Shared Objectives` : '')
      + (c.conclusions.length ? `, ${c.conclusions.length} conclusions `
        + `(${c.conclusions.map((x) => x.result).join(' / ')})` : '')
      + (c.requiresMap ? '  [needs the fold-out map from the box]' : ''));
  }
  if (dataset.visionCards.length) {
    console.log(`  vision cards: ${dataset.visionCards.length}, `
      + `${dataset.visionCards[0].maxPoints} 🏅 each if fully achieved`);
  }
  if (dataset.campaign.carcassFrontExploration) {
    const t = Object.values(dataset.campaign.carcassFrontExploration);
    console.log(`  Carcass Front exploration: ${t.length} Resource tables, `
      + `${t.reduce((n, x) => n + x.locations.length, 0)} Locations `
      + `(${t.map((x) => `${x.resource} ${x.glyph} ${x.locations.length}`).join(', ')})`);
  }
  console.log(`  keywords: ${dataset.keywords.length} glossary entries ` +
              `(${dataset.keywords.filter((k) => k.type === 'Effect').length} Effect, ` +
              `${dataset.keywords.filter((k) => k.type === 'Tag').length} Tag)`);
  console.log(`  battlekit: ${dataset.battlekit.length} entries described` +
              ` (${described}/${armouryNames.size} distinct armoury items carry a description)` +
              (battlekit.unreadable.length ? `  (${battlekit.unreadable.length} unreadable)` : ''));

  console.log(`  battlekit (Warbands of Trench Crusade): ${warbandsKit.entries.length} ` +
              `faction-exclusive entries, ${warbandsKit.entries.filter((e) => e.rules.length).length} with rules` +
              (warbandsKit.unreadable.length ? `  (${warbandsKit.unreadable.length} reported)` : ''));
  console.log(`  battlekit limits: ${dataset.battlekitLimits.limits.length} carrying rules` +
              (dataset.battlekitLimits.withShield ? ', plus the Shield restrictions' : '') +
              `, ${keywordCarry.rules.length} by keyword ` +
              `(${keywordCarry.rules.map((r) => r.keyword).join(', ')})` +
              (keywordCarry.unreadable.length
                ? `  (${keywordCarry.unreadable.length} keyword rule(s) UNREADABLE: ` +
                  `${keywordCarry.unreadable.join(' | ')})`
                : '') +
              (battlekitLimits.unreadable.length
                ? `  (${battlekitLimits.unreadable.length} UNREADABLE: ` +
                  `${battlekitLimits.unreadable.join(' | ')})`
                : ''));

  const fRules = dataset.factions.reduce((n, f) => n + f.specialRules.length, 0);
  console.log(`  factions: ${dataset.factions.length} with budgets, ${fRules} faction special rules`);
  if (delegated.length) {
    const byFaction = new Map();
    for (const d of delegated) byFaction.set(d.to, (byFaction.get(d.to) ?? 0) + 1);
    console.log(`  Mercenary pools delegated by a faction rule: ` +
      [...byFaction].map(([f, n]) => `${f} +${n}`).join(', '));
  }
  console.log(`  variants: ${dataset.variants.length} — ${withOps} with derived ops` +
              (bookOnlyCount ? `, ${bookOnlyCount} in the rulebook only` : ''));
  console.log(`  layers applied: ${layers.map((l) => l.id).join(', ') || '(none)'}`);
  console.log(`  verified against the rulebook: ${v.compared} units`);
  console.log(`    confirmed   ${v.confirmed}`);
  console.log(`    unconfirmed ${v.unconfirmed}`);
  console.log(`    resolved    ${v.resolved.length}`);
  if (res.applied.length) {
    console.log('  maintainer resolutions (data-sources/resolutions.json):');
    for (const a of res.applied) console.log(`    ${a}`);
  }
  console.log(`    CONFLICTS   ${v.conflicts.length}`);
  unresolvedOps.push(...armouryOps.unresolved);
  if (armouryOps.applied) {
    console.log(`  armoury rows added by layers: ${armouryOps.applied}`);
  }
  if (unresolvedOps.length) {
    /*
      And the build FAILS on one.

      This used to print and carry on, and the comment below already said why
      that was wrong — "a published rule the app does not have" — while the
      build went green anyway. One op sat unresolved that whole time: the
      Dispatch adds FUMBLE to the Demonic Aura Grenade, the catalogue's profile
      called it a Demonic Grenade, and the keyword never reached the app. The
      line was printed on every build and read as noise.

      An op that cannot find its target is either a name to reconcile (see
      `reconcileGearNames` above) or a layer written against an entry that does
      not exist. Both need a person; neither should ship.
    */
    failed = true;
    console.log(`  unresolved layer ops: ${unresolvedOps.length} — THIS FAILS THE BUILD`);
    /*
      And WHY. The count alone sent me looking in the wrong place: two
      `addArmouryRow` ops were being reported as a number with no reason, and
      a layer op that cannot be applied is a published rule the app does not
      have — the one thing this pipeline exists to make visible.
    */
    for (const u of unresolvedOps) {
      console.log(`    ${u.op?.op ?? '?'} ${u.op?.collection ?? u.op?.factionId ?? ''}`
        + `${u.op?.row?.name ? `/${u.op.row.name}` : ''}`
        + `${u.op?.entity?.name ? `/${u.op.entity.name}` : ''}: ${u.why}`);
    }
  }

  /*
    A unit whose hosts are stated by ALIGNMENT must have factions to match.

    `allowedAlignment` resolves in `recruitable.ts` to every faction carrying
    that alignment. If none does, the filter matches nobody and the model is
    offered to no Warband at all — which on screen is indistinguishable from a
    model the game does not have, and is the quietest way to lose one.

    Checked here rather than in the app: the app must not throw at a player,
    and by the time it runs this has already guaranteed the invariant.
  */
  const alignmentsPresent = new Set(
    (dataset.factions ?? []).map((f) => f.alignment).filter(Boolean));
  for (const u of dataset.units ?? []) {
    if (u.allowedAlignment && !alignmentsPresent.has(u.allowedAlignment)) {
      failed = true;
      console.log(
        `  ${u.name} is hired by "${u.allowedAlignment}" Warbands and no faction `
        + 'carries that alignment — it would be offered to nobody. '
        + `Alignments present: ${[...alignmentsPresent].join(', ') || '(none)'}. `
        + 'THIS FAILS THE BUILD');
    }
  }
  /*
    Forced kit and the profile it points at must call the weapon the same
    thing.

    Two places hold the name — the catalogue's `selectionEntry` and the
    profile — and when they disagree the card prints one while the rules popup
    prints the other, so a player looking the weapon up in the book finds
    neither. The Goetic Warlock was carrying exactly that: `Iron-Clawed Hands`
    on the kit, `Reaping Claws` on the profile, and `Flaying Iron Claws` in the
    Dispatch that replaced the entry.

    It was the only pair in the dataset that disagreed, which is what makes
    this worth asserting rather than reporting: the invariant already held
    everywhere else, so a new violation is a mistake, not a backlog.

    Except on a ruleset with NO layers. `github-latest` promises the community
    catalogues exactly as published, so that it agrees with NewRecruit — and
    the disagreement IS what the catalogues publish. Correcting it there would
    break the one thing that ruleset is for, so it is reported instead, and
    only a ruleset that carries corrections has to be consistent.
  */
  const profileNames = new Map((dataset.weapons ?? []).map((w) => [w.id, w.name]));
  const corrected = ruleset.layers.length > 0;
  for (const u of dataset.units ?? []) {
    for (const kit of u.battlekit ?? []) {
      if (!kit.profileId || !profileNames.has(kit.profileId)) continue;
      const profileName = profileNames.get(kit.profileId);
      if (profileName === kit.name) continue;
      if (corrected) failed = true;
      console.log(
        `  ${u.name}'s Battlekit calls it "${kit.name}" and its profile calls `
        + `it "${profileName}" (${kit.profileId}) — the card and the rules `
        + `popup would disagree.${corrected ? ' THIS FAILS THE BUILD'
          : ' Left as published: this ruleset carries no corrections.'}`);
    }
  }
  if (gearRenames.length) {
    console.log(`  gear renamed to the books' spelling: ${gearRenames.length}`);
    for (const r of gearRenames) console.log(`    ${r.from}  ->  ${r.to}`);
  }
  if (gearNamesRuled.length) {
    console.log(`  gear names settled by a maintainer ruling: ${gearNamesRuled.length}`);
    for (const r of gearNamesRuled) console.log(`    ${r.from}  ->  ${r.to}  (${r.why})`);
  }
  if (gearNameStandoffs.length) {
    console.log(`  gear whose two catalogue names are both unattested: ${gearNameStandoffs.length}`);
    for (const r of gearNameStandoffs) console.log(`    ${r}`);
  }
  if (layerNotes.length) console.log(`  layer ops superseded upstream: ${layerNotes.length}`);
  if (reprints.agreed.length || reprints.disagreed.length) {
    console.log(`  reprinted entries cross-checked: ${reprints.agreed.length} field(s) agree` +
                (reprints.disagreed.length ? `, ${reprints.disagreed.length} disagree` : ''));
    for (const d of reprintResolved) {
      console.log(`    ${d.key.padEnd(34)} ours=${d.ours}  reprint=${d.book}` +
                  `  -> ${resolutions[d.key].chose} (${resolutions[d.key].value})`);
    }
  }
  if (reprintConflicts.length) {
    failed = true;
    console.log('\n  Two official printings of the same entry disagree — rule on each in');
    console.log('  data-sources/resolutions.json:');
    for (const d of reprintConflicts) {
      console.log(`    ${d.key.padEnd(34)} shipped=${d.ours}  reprint=${d.book}`);
    }
  }
  if (unresolvedCurrency.length) {
    console.log(`\n  ⚠ ${unresolvedCurrency.length} cost(s) with an UNCONFIRMED CURRENCY:`);
    for (const u of unresolvedCurrency) console.log(`      ${u}`);
    console.log('      The Dispatch prints currency as a glyph the text extraction drops.');
    console.log('      Recorded as Ducats. Confirm against the PDF before relying on them.');
  }
  if (confirmedCurrency.length) {
    console.log(`\n  ${confirmedCurrency.length} cost(s) whose currency rests on a maintainer ruling:`);
    for (const u of confirmedCurrency) console.log(`      ${u}`);
    console.log('      Unreadable in data-sources/ — confirmed against the printed page.');
  }
  if (derivedCurrency.length) {
    console.log(`\n  ${derivedCurrency.length} cost(s) whose currency is derived from the catalogues:`);
    for (const u of derivedCurrency) console.log(`      ${u}`);
    console.log('      The glyph is unreadable, but the surrounding entries fix the currency.');
    console.log('      Checkable in-repo — see the op\'s _costCurrencyDerived note.');
  }
  if (missingProv.length) console.log(`  fields with NO provenance: ${missingProv.length}`);

  if (v.conflicts.length) {
    failed = true;
    console.log('\n  Unresolved source conflicts — resolve each in data-sources/resolutions.json:');
    for (const c of v.conflicts.slice(0, 20)) {
      console.log(`    ${c.key.padEnd(38)} ours=${c.ours}  book=${c.book}`);
    }
    if (v.conflicts.length > 20) console.log(`    …and ${v.conflicts.length - 20} more`);
  }
  if (missingProv.length) {
    failed = true;
    console.log('\n  Fields with no provenance (first 10):');
    missingProv.slice(0, 10).forEach((m) => console.log(`    ${m}`));
  }

  /*
    The roster-path layer: what a BattleScribe `.ros` calls each of these
    things.

    Derived from the catalogues by a walk, not from the dataset — see
    `scripts/lib/newrecruit-paths.mjs` and `docs/NEWRECRUIT-SPIKE.md`. It is
    emitted as its own file rather than folded into the dataset because only an
    exporter or an importer reads it, and the app ships to phones.

    `carryable` is the dataset's OWN vocabulary of what a model can be given,
    handed in so this file decides what an item is and the walk decides only
    where it sits. Ids first: the dataset holds Alchemical Formulae, Homunculus
    body parts and every other per-model choice as `unit.options`, which carry
    catalogue ids, and matching those by name alone left all of them without a
    path. Names are the fallback for the handful the catalogues do not carry —
    the six weapons with no `entryId`, both bundles, and the Battlekit chapter.
  */
  const rosterPaths = buildRosterPaths(CAT_DIR, {
    units: dataset.units,
    variants: dataset.variants,
    carryable: {
      ids: [
        ...dataset.weapons.map((w) => w.entryId),
        ...dataset.units.flatMap((u) => (u.options ?? []).map((o) => o.id)),
      ].filter(Boolean),
      names: [
        ...dataset.weapons.filter((w) => !w.entryId).map((w) => w.name),
        ...(dataset.bundles ?? []).map((b) => b.name),
        ...(dataset.battlekit ?? []).map((b) => b.name),
        ...dataset.armouries.flatMap((a) => a.rows.map((r) => r.name)),
      ].filter(Boolean),
    },
  });

  /*
    A unit with no roster identity is stated, not skipped.

    The sixteen are the two Carcass Front factions, whose entry ids the
    supplement layer mints because no community catalogue carries them. If that
    number moves, a model that used to be exportable has stopped being one, and
    that is worth a line on the console rather than a silent shrink.
  */
  /*
    Limited Potential, cross-checked against the units as shipped.

    The rulebook's table and the catalogue's keyword agree on all seven models
    until `dispatch-01` rewrites the Brazen Bull's keyword row without it. That
    is precedence working, not a fault — so the build states the difference and
    leaves it standing.
  */
  const drift = promotionKeywordDrift(dataset.campaign?.promotions, dataset.units);
  if (drift.length) {
    console.log(`  Limited Potential: ${drift.length} model(s) where the rulebook's `
      + 'table and the shipped keywords differ:');
    for (const d of drift) console.log(`      ${d}`);
    console.log('      Precedence decides; experienceCap reads the keyword.');
  }

  console.log(`  roster paths: ${rosterPaths.units.length} unit(s) and `
    + `${rosterPaths.variants.length} variant(s) mapped, ${rosterPaths.unmapped.length} `
    + 'without a BattleScribe identity');
  const noCatalogue = rosterPaths.unmapped.filter((u) => /^cf-/.test(String(u.entryId ?? '')));
  if (noCatalogue.length !== rosterPaths.unmapped.length) {
    for (const u of rosterPaths.unmapped) {
      if (!/^cf-/.test(String(u.entryId ?? ''))) {
        console.log(`    ${u.name} [${u.factionId}]: ${u.why}`);
      }
    }
    throw new Error(
      `rules-build: ${rosterPaths.unmapped.length - noCatalogue.length} entr(ies) carry a `
      + 'BattleScribe entry id that no catalogue root can reach. Either the catalogues moved '
      + 'under `npm run rules:fetch`, or the walk in scripts/lib/newrecruit-paths.mjs has '
      + 'stopped holding. Both are findings; neither is something to ship past.');
  }

  // 4. emit
  if (!checkOnly && !v.conflicts.length && !missingProv.length && !reprintConflicts.length) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const banner =
      `// GENERATED FILE — DO NOT EDIT.\n` +
      `// Produced by \`npm run rules:build\` from data-sources/.\n` +
      `// Ruleset: ${ruleset.id}\n` +
      `// Base:    ${manifest.repo}@${manifest.commit}\n` +
      `// Layers:  ${ruleset.layers.join(', ') || '(none)'}\n` +
      `// See docs/RULESET-MODEL.md.\n\n`;

    const file = path.join(OUT_DIR, `${ruleset.id}.generated.ts`);
    fs.writeFileSync(file,
      banner +
      `import type { Dataset } from '../../types/catalogue';\n\n` +
      `export const DATASET: Dataset = ${JSON.stringify(dataset, null, 2)} as unknown as Dataset;\n\n` +
      `export default DATASET;\n`);

    fs.writeFileSync(path.join(OUT_DIR, `${ruleset.id}.provenance.json`),
      JSON.stringify(provenance.map, null, 2) + '\n');

    /*
      Indented, but with every leaf on ONE line.

      A path is an array of small integers into `segments`, and a selection is
      a two- or three-key object of those. The default indenter puts each
      integer on a line of its own, which took this file from 0.6 MB to 3 MB of
      mostly punctuation — larger than the dataset it accompanies, for no added
      legibility. Collapsed, a changed path reads as a changed line, which is
      what a review of this file is for.

      Innermost-first and repeated until it stops moving, so an array of
      selections collapses only after the selections themselves have.
    */
    const collapseLeaves = (json) => {
      const leaf = /[[{]\s*\n\s*((?:[^[\]{}]|\n)*?)\n\s*([\]}])/g;
      for (let pass = 0; pass < 8; pass += 1) {
        const next = json.replace(leaf, (whole, body) => {
          const open = whole[0];
          const flat = body.replace(/\s*\n\s*/g, ' ').trim();
          return open === '{' ? `{ ${flat} }` : `[${flat}]`;
        });
        if (next === json) return json;
        json = next;
      }
      return json;
    };

    fs.writeFileSync(path.join(OUT_DIR, `${ruleset.id}.rosterpaths.json`),
      collapseLeaves(JSON.stringify(
        { base: `${manifest.repo}@${manifest.commit}`, ...rosterPaths }, null, 2)) + '\n');

    console.log(`  wrote ${file}`);
  }

  // A human-readable report, always.
  const lines = [
    `# Cross-check — ${ruleset.name}`, '',
    `Base \`${manifest.repo}@${manifest.commit}\``, '',
    `| | |`, `|---|---|`,
    `| units | ${dataset.units.length} |`,
    `| weapons | ${dataset.weapons.length} |`,
    `| units compared to the rulebook | ${v.compared} |`,
    `| fields confirmed | ${v.confirmed} |`,
    `| fields unconfirmed | ${v.unconfirmed} |`,
    `| resolved by precedence or by hand | ${v.resolved.length} |`,
    `| **unresolved conflicts** | **${v.conflicts.length}** |`, '',
  ];
  if (unresolvedOps.length) {
    lines.push('## Layer ops that could not be applied', '',
      'Usually the catalogues lag the source the layer was transcribed from.', '');
    for (const u of unresolvedOps) lines.push(`- ${u.why}`);
    lines.push('');
  }
  if (layerNotes.length) {
    lines.push('## Layer ops the catalogues have caught up with', '',
      'These applied, but the base data already carried the change. Each is a',
      'candidate for retirement from the layer once the base is confirmed current.', '');
    for (const n of layerNotes) lines.push(`- ${n.why}`);
    lines.push('');
  }
  if (reprints.disagreed.length) {
    lines.push('## Entries reprinted by a layer, where the two printings differ', '',
      'The layer reprints a model the dataset already carries. Every other field',
      `agreed (${reprints.agreed.length} of them).`, '',
      '| field | shipped | reprint | ruling |', '|---|---|---|---|');
    for (const d of reprints.disagreed) {
      const r = resolutions[d.key];
      lines.push(`| ${d.key} | ${d.ours} | ${d.book} | ${r ? `${r.chose} — ${r.because ?? ''}` : '**unresolved**'} |`);
    }
    lines.push('');
  }
  if (v.conflicts.length) {
    lines.push('## Unresolved conflicts', '', '| field | ours | rulebook |', '|---|---|---|');
    for (const c of v.conflicts) lines.push(`| ${c.key} | ${c.ours} | ${c.book} |`);
  }
  fs.writeFileSync(path.join(REPORT_DIR, `crosscheck-${ruleset.id}.md`), lines.join('\n') + '\n');
}

console.log(`\nreports written to ${REPORT_DIR}/`);

if (failed) {
  console.error(
    '\nBUILD FAILED. A source conflict or a field without provenance means the\n' +
      'dataset cannot say where one of its values came from. Resolve it in\n' +
      'data-sources/resolutions.json with a written reason, then rebuild.'
  );
  process.exit(1);
}
console.log('\nOK');
