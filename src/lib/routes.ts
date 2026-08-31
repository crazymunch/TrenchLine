import type { AppView } from '../store/state';

/**
 * The map between a URL and a view, in one place and both directions.
 *
 * Two directions written separately is how they drift: a rename in the nav
 * that misses the parser gives you a route that renders the wrong view and no
 * error anywhere.
 */
const SEGMENT: Record<AppView, string> = {
  builder: 'roster',
  play: 'play',
  campaign: 'campaign',
  directory: 'directory',
  codex: 'codex',
  customizer: 'customizer',
};

const VIEW: Record<string, AppView> = Object.fromEntries(
  Object.entries(SEGMENT).map(([view, segment]) => [segment, view as AppView]),
) as Record<string, AppView>;

/** `builder` + a roster id -> `/roster/wb-al-qarn-rihla`. */
export function pathForView(view: AppView, rosterId?: string): string {
  const segment = SEGMENT[view] ?? SEGMENT.builder;
  if (view === 'builder' && rosterId) return `/roster/${encodeURIComponent(rosterId)}`;
  return `/${segment}`;
}

/**
 * `/roster/wb-al-qarn-rihla` -> `builder`.
 *
 * An unknown path falls back to the roster rather than throwing: a URL is user
 * input, and a 404-shaped blank screen is a worse answer to a stale link than
 * the app's front door.
 */
export function viewForPath(pathname: string): AppView {
  const first = pathname.split('/').filter(Boolean)[0] ?? '';
  return VIEW[first] ?? 'builder';
}

/** The roster id in `/roster/[id]`, or null anywhere else. */
export function rosterIdFromPath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== SEGMENT.builder || !parts[1]) return null;
  return decodeURIComponent(parts[1]);
}

export const VIEW_SEGMENTS = SEGMENT;
