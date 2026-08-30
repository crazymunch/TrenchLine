/**
 * The rulesets the app can serve, mirroring `scripts/lib/rulesets.mjs`.
 *
 * Deliberately tiny and dependency-free: both the API route and the client
 * import it, and it must not drag any generated data along with it — the whole
 * point of serving the datasets is that neither side bundles 1.6 MB.
 *
 * Not to be confused with `src/data/rulesets/` (RulesetVersion 1.0 / 1.0.2 /
 * 1.0.2TD), which is the older rulebook-edition concept the Codex still uses.
 * These are datasets — which sources a warband is built and checked against.
 */
export interface RulesetInfo {
  id: string;
  name: string;
  description: string;
  isDefault?: boolean;
}

export const RULESETS: RulesetInfo[] = [
  {
    id: 'trenchline',
    name: 'TrenchLine Rules',
    description:
      'The BattleScribe catalogues, cross-checked against the official rulebooks, ' +
      'with the Trench Dispatch applied on top. Every field records where it came from.',
    isDefault: true,
  },
  {
    id: 'github-latest',
    name: 'Latest GitHub Rules',
    description:
      'The community catalogues exactly as published, with nothing layered on. ' +
      'Use this when an opponent or tournament plays to the public repo.',
  },
];

export const RULESET_IDS = RULESETS.map((r) => r.id);
export const DEFAULT_RULESET_ID = RULESETS.find((r) => r.isDefault)?.id ?? RULESETS[0].id;
export const rulesetInfo = (id: string) => RULESETS.find((r) => r.id === id);
