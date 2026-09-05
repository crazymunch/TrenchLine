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
import { parseWarbandEntries, parseVariants, parseArmouryTables, parseFactionRules } from './lib/parse-warbands.mjs';
import { parseThresholdTable, parseStartingBudget, parseExploration,
         parseSkillsTables, parseTraumaTable,
         parseCampaignPhaseSteps } from './lib/parse-campaign.mjs';
import { parseBattlekit, parseBattlekitLimits, parseKeywordCarryRules, keywordGrantsFrom, parseWarbandsBattlekit } from './lib/parse-battlekit.mjs';
import { parseCarryAllowances } from './lib/parse-carry-allowances.mjs';
import { parseMarkers } from './lib/parse-markers.mjs';
import { parseKeywords } from './lib/parse-keywords.mjs';
import { parseScenarios } from './lib/parse-scenarios.mjs';
import { parseCoreRules } from './lib/parse-core-rules.mjs';
import { parseWeatherEvents } from './lib/parse-weather.mjs';
import { parsePatrons } from './lib/parse-patrons.mjs';
import { parseCarcassFrontExploration } from './lib/parse-cf-exploration.mjs';
import { parseCarcassFrontCampaigns } from './lib/parse-cf-campaign.mjs';
import { parseVisionCards } from './lib/parse-vision-cards.mjs';
import { parseCarcassFrontScenarios } from './lib/parse-cf-scenarios.mjs';
import { parseScenarioGenerator } from './lib/parse-cf-generator.mjs';
import { parseCarcassFrontMap } from './lib/parse-cf-map.mjs';
import { buildCarcassFrontLayer, crossCheckReprints, applyMercenaryDelegation,
         LAYER_ID as CARCASS_FRONT } from './lib/carcass-front-layer.mjs';
import { createProvenance, applyLayers, applyArmouryRowOps, stampBase } from './lib/layers.mjs';
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
const armoury = parseArmouryTables();
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
  if (coreRules.missing.length) {
    throw new Error(
      `rules-build: ${coreRules.missing.length} rulebook section(s) in the table of `
      + `contents were not found in the body: ${coreRules.missing.join(', ')}. `
      + 'Shipping the rest would leave the Codex silently short a chapter.');
  }

  // 1. parse — a fresh copy per ruleset, since layers mutate it
  const base = parseCatalogues(CAT_DIR);

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
      // The other two post-battle tables. `officialRulesData.ts` still holds
      // hand-written versions of both, and the four Skills tables there are
      // fabricated (AUDIT §1.13) — these are what replaces them.
      skills: parseSkillsTables(),
      trauma: parseTraumaTable(),
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
    },
    meta: {
      rulesetId: ruleset.id,
      // Deliberately no build timestamp: the output must be reproducible so CI
      // can prove the committed data still matches data-sources/. The base
      // commit and the layer list already identify the dataset exactly.
      baseCommit: manifest.commit,
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
  const layerReport = applyLayers(dataset, layers, provenance, {
    includeBeta: ruleset.includeBeta,
    deferred: deferredOps,
  });

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
  const armouryOps = applyArmouryRowOps(dataset, deferredOps);
  if (armouryOps.applied + armouryOps.unresolved.length + armouryOps.notes.length
      !== deferredOps.length) {
    throw new Error(
      `rules-build: ${deferredOps.length} layer op(s) were deferred to the armoury `
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

  dataset.variants = base.variantEntries.map((v) => {
    const book = bookFor(v.name);
    return {
      id: variantKey(v.name),
      entryId: v.id,
      name: v.name,
      factionId: v.factionId,
      specialRules: v.specialRules,
      ops: opsByVariantId.get(v.id) ?? [],
      sources: book ? ['catalogue', 'rulebook'] : ['catalogue'],
      thirdParty: v.thirdParty || undefined,
    };
  });

  // A variant the book describes but the catalogues do not carry is a real
  // finding, not something to paper over.
  const bookOnly = variants.filter(
    (v) => !base.variantEntries.some((c) => sameVariant(c.name, v.name)));
  for (const v of bookOnly) {
    dataset.variants.push({
      id: variantKey(v.name), name: v.name, factionId: '',
      specialRules: v.specialRules, ops: [], sources: ['rulebook'],
    });
  }

  // The supplement's four Warband Variants, for the same reason as its
  // armouries: `dataset.variants` is assigned wholesale just above.
  if (ruleset.layers.includes(CARCASS_FRONT)) {
    dataset.variants.push(...carcassFront.variants);
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
    console.log(`  unresolved layer ops: ${unresolvedOps.length}`);
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
