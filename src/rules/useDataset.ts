'use client';

/**
 * Loading a generated ruleset into the client.
 *
 * The dataset is served rather than bundled (see `src/app/api/dataset`), so
 * getting at it is asynchronous and can fail. Both of those are surfaced rather
 * than smoothed over: a component gets `loading`, `error` or `dataset`, and
 * there is no third state where it quietly renders with nothing.
 *
 * There is deliberately **no fallback to `defaultRules.ts`**. If the fetch
 * fails, this reports the failure. Substituting the old hand-written data would
 * put statlines back on screen that the audit measured as 97% wrong, and would
 * do it invisibly — the exact shape of the `githubSync` bug this project
 * deleted (docs/AUDIT.md §1.8).
 */
import { useEffect, useState } from 'react';
import type { Dataset } from '@/types/catalogue';
import { DEFAULT_RULESET_ID } from './rulesets';

export interface DatasetState {
  dataset: Dataset | null;
  loading: boolean;
  /** Set when the ruleset could not be loaded. Show it; do not substitute. */
  error: string | null;
}

/** One in-flight request and one result per ruleset, shared across components. */
const cache = new Map<string, Dataset>();
const inFlight = new Map<string, Promise<Dataset>>();

export async function fetchDataset(rulesetId: string): Promise<Dataset> {
  const hit = cache.get(rulesetId);
  if (hit) return hit;

  const running = inFlight.get(rulesetId);
  if (running) return running;

  const p = (async () => {
    const res = await fetch(`/api/dataset?ruleset=${encodeURIComponent(rulesetId)}`);
    if (!res.ok) {
      // The route explains itself — an unknown id lists the valid ones, a
      // missing build says which command regenerates it. Pass that through.
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? `Could not load ruleset '${rulesetId}' (HTTP ${res.status}).`);
    }
    const data = (await res.json()) as Dataset;
    cache.set(rulesetId, data);
    return data;
  })();

  inFlight.set(rulesetId, p);
  try {
    return await p;
  } finally {
    inFlight.delete(rulesetId);
  }
}

export function useDataset(rulesetId: string = DEFAULT_RULESET_ID): DatasetState {
  const [state, setState] = useState<DatasetState>(() => ({
    dataset: cache.get(rulesetId) ?? null,
    loading: !cache.has(rulesetId),
    error: null,
  }));

  useEffect(() => {
    const cached = cache.get(rulesetId);
    if (cached) {
      setState({ dataset: cached, loading: false, error: null });
      return;
    }

    let live = true;
    setState({ dataset: null, loading: true, error: null });

    fetchDataset(rulesetId)
      .then((d) => { if (live) setState({ dataset: d, loading: false, error: null }); })
      .catch((e: unknown) => {
        if (!live) return;
        setState({
          dataset: null,
          loading: false,
          error: e instanceof Error ? e.message : String(e),
        });
      });

    // Switching ruleset mid-flight must not let the old response win.
    return () => { live = false; };
  }, [rulesetId]);

  return state;
}

/** Drop cached datasets, so a rebuild in dev is picked up without a reload. */
export function clearDatasetCache(): void {
  cache.clear();
}
