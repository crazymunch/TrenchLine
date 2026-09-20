/**
 * The rulesets TrenchLine ships.
 *
 * A ruleset is a base plus an ordered list of layers (docs/RULESET-MODEL.md §4).
 * Adding a future Dispatch means appending one layer id here — never forking
 * the dataset.
 *
 * The base commit is read from data-sources/battlescribe/MANIFEST.json at build
 * time, so it stays in step with what was actually fetched.
 */
export const RULESETS = [
  {
    id: 'github-latest',
    name: 'Latest GitHub Rules',
    description:
      'The community BattleScribe catalogues exactly as published, with no ' +
      'TrenchLine corrections applied. Matches what NewRecruit shows — use this ' +
      'when you need to agree with an opponent who is using NewRecruit.',
    layers: [],
    includeBeta: false,
  },
  {
    id: 'trenchline',
    name: 'TrenchLine Rules',
    description:
      'The GitHub catalogues, cross-checked against the official rulebooks and ' +
      'brought up to date with the Trench Dispatch and the Carcass Front ' +
      'supplement. The most accurate ruleset available in the app.',
    /*
      `warbands-book` first: it carries what the BOOK states and the catalogue
      lacks, and `dispatch-01` after it so the newer source still wins wherever
      the two speak about the same thing. `data-sources/resolutions.json` states
      that precedence — Dispatch over rulebook over catalogue — and the rulebook
      rung had no layer until this one.
    */
    layers: ['warbands-book', 'dispatch-01', 'carcass-front'],
    includeBeta: true,
    isDefault: true,
  },
];

export const DEFAULT_RULESET =
  RULESETS.find((r) => r.isDefault)?.id ?? RULESETS[0].id;
