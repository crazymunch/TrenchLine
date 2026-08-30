/**
 * Where one entity's values came from.
 *
 * The pipeline stamps every field with its layer and source, and the build
 * fails if any field lacks one — that guarantee is the whole reason the data
 * can be trusted, and until now nothing showed it to a player.
 *
 * Served per entity rather than wholesale: the full map is ~915 KB, and the
 * question is always about one model on screen. `?entity=unit:<id>` returns a
 * few hundred bytes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { RULESET_IDS, DEFAULT_RULESET_ID } from '@/rules/rulesets';

type ProvenanceMap = Record<string, Record<string, { layer: string; source: string; verified?: string }>>;

const cache = new Map<string, ProvenanceMap>();

async function load(id: string): Promise<ProvenanceMap | null> {
  const hit = cache.get(id);
  if (hit) return hit;

  const mod =
    id === 'trenchline' ? await import('@/data/generated/trenchline.provenance.json')
    : id === 'github-latest' ? await import('@/data/generated/github-latest.provenance.json')
    : null;

  if (!mod) return null;
  const map = (mod.default ?? mod) as ProvenanceMap;
  cache.set(id, map);
  return map;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const ruleset = url.searchParams.get('ruleset') ?? DEFAULT_RULESET_ID;
  const entity = url.searchParams.get('entity');

  if (!RULESET_IDS.includes(ruleset)) {
    return NextResponse.json(
      { error: `Unknown ruleset '${ruleset}'.`, available: RULESET_IDS }, { status: 400 });
  }
  if (!entity) {
    return NextResponse.json(
      { error: "Name the entity, e.g. ?entity=unit:5fad-8b9c-8d6a-a2f0" }, { status: 400 });
  }

  const map = await load(ruleset);
  if (!map) {
    return NextResponse.json(
      { error: `Provenance for '${ruleset}' is missing. Run: npm run rules:build` }, { status: 500 });
  }

  const fields = map[entity];
  if (!fields) {
    // An entity with no provenance is a real problem, not an empty result: the
    // build is supposed to fail rather than emit one. Say so plainly.
    return NextResponse.json(
      { error: `No provenance recorded for '${entity}'. Every field is supposed to have some — ` +
               `this is a pipeline bug, not a missing feature.` },
      { status: 404 });
  }

  return NextResponse.json(
    { entity, ruleset, fields },
    { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } });
}
