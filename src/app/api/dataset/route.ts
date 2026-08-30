/**
 * Serve a generated ruleset.
 *
 * The dataset is ~1.6 MB per ruleset — 89 units with their options and
 * modifiers, 543 weapons, 6 armouries, 17 variants. A static import would put
 * every byte of that in the client bundle, and a second ruleset would double
 * it, so it is served instead.
 *
 * Three things fall out of that:
 *
 *   - the client ships none of it;
 *   - switching ruleset is a refetch, not a rebuild;
 *   - validation can move server-side later without moving the data again.
 *
 * The import is dynamic and inside the handler so the module is only ever
 * resolved on the server, and only for the ruleset actually asked for.
 */
import { NextRequest, NextResponse } from 'next/server';
import { RULESET_IDS, DEFAULT_RULESET_ID } from '@/rules/rulesets';

/** Loaded once per ruleset per server process. */
const cache = new Map<string, unknown>();

async function load(id: string): Promise<unknown> {
  const hit = cache.get(id);
  if (hit) return hit;

  // The switch is deliberate: a template literal here would let a request
  // string reach the module resolver, and would defeat static analysis of what
  // this route can load.
  const mod =
    id === 'trenchline' ? await import('@/data/generated/trenchline.generated')
    : id === 'github-latest' ? await import('@/data/generated/github-latest.generated')
    : null;

  if (!mod) return null;
  cache.set(id, mod.DATASET);
  return mod.DATASET;
}

export async function GET(req: NextRequest) {
  const asked = new URL(req.url).searchParams.get('ruleset') ?? DEFAULT_RULESET_ID;

  if (!RULESET_IDS.includes(asked)) {
    // Naming the valid ids beats a bare 400: the caller is our own store, and
    // a silent fallback to the default would hide a typo'd ruleset for good.
    return NextResponse.json(
      { error: `Unknown ruleset '${asked}'.`, available: RULESET_IDS },
      { status: 400 }
    );
  }

  const dataset = await load(asked);
  if (!dataset) {
    return NextResponse.json(
      { error: `Ruleset '${asked}' is declared but its generated data is missing. ` +
               `Run: npm run rules:build` },
      { status: 500 }
    );
  }

  return NextResponse.json(dataset, {
    headers: {
      // The dataset is immutable for a given build: it is generated from
      // SHA-pinned sources and CI proves it has not drifted.
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
