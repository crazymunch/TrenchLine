/**
 * Sides that fight together, and what their combined score is.
 *
 * Trench Crusade's multi-player scenarios — Brothers in Arms, and several of
 * the All Out War packs — put four warbands on the table as two pairs. **Each
 * side still scores individually**, which is why this adds a tag over the
 * existing per-side record rather than replacing it with a per-team one: the
 * per-side numbers are the real ones, and a coalition total is their sum.
 *
 * That ordering matters. A model that stored points per TEAM could not answer
 * "how did my warband do", which is the number a campaign record wants and the
 * number a player actually cares about after the game.
 */

/** Two coalitions is what every scenario that has any uses. */
export type CoalitionId = 'A' | 'B';

export const COALITIONS: CoalitionId[] = ['A', 'B'];

/**
 * What a coalition is called on screen.
 *
 * Deliberately not faction-flavoured: a coalition is whoever agreed to fight
 * together tonight, and the pairs change between games. Naming them for their
 * factions would be wrong the first time somebody allies across the divide,
 * which the campaign rules allow.
 */
export const COALITION_NAME: Record<CoalitionId, string> = {
  A: 'First Coalition',
  B: 'Second Coalition',
};

/** Side id -> the coalition it fights for. A side may have none. */
export type CoalitionMap = Record<string, CoalitionId | undefined>;

/**
 * Whether a match is being played as coalitions at all.
 *
 * Only when BOTH have somebody in them. One tagged side is a player who
 * started assigning teams and stopped, and showing a total of one warband's
 * points beside that same warband's points is noise.
 */
export function hasCoalitions(ids: string[], map: CoalitionMap): boolean {
  const used = new Set(ids.map((id) => map[id]).filter(Boolean));
  return used.size >= 2;
}

/** The sides in one coalition, in match order. */
export function sidesIn(
  ids: string[], map: CoalitionMap, coalition: CoalitionId,
): string[] {
  return ids.filter((id) => map[id] === coalition);
}

/**
 * A coalition's combined Victory Points.
 *
 * A side with no score yet contributes nothing rather than being skipped —
 * the distinction matters when every side is untagged, because a total of
 * zero is a real answer and `undefined` is not.
 */
export function coalitionScore(
  ids: string[], map: CoalitionMap, coalition: CoalitionId,
  vpOf: (id: string) => number,
): number {
  return sidesIn(ids, map, coalition).reduce((sum, id) => sum + (vpOf(id) || 0), 0);
}

/**
 * Which coalition is ahead, or `null` where they are level.
 *
 * `null` rather than picking one: a draw is the answer, and a scoreboard that
 * silently breaks ties invents a winner.
 */
export function leader(
  ids: string[], map: CoalitionMap, vpOf: (id: string) => number,
): CoalitionId | null {
  const a = coalitionScore(ids, map, 'A', vpOf);
  const b = coalitionScore(ids, map, 'B', vpOf);
  if (a === b) return null;
  return a > b ? 'A' : 'B';
}

/**
 * A starting assignment for a match that has none.
 *
 * Alternating, because that is how players sit down: you and your ally on one
 * side of the table, opponents on the other, and the list is built by adding
 * them in turn. It is a SUGGESTION — every tag is editable, and a match is
 * only treated as coalitions once somebody has confirmed them.
 */
export function suggestCoalitions(ids: string[]): CoalitionMap {
  const map: CoalitionMap = {};
  ids.forEach((id, i) => { map[id] = i % 2 === 0 ? 'A' : 'B'; });
  return map;
}

/** Keep only tags for sides still in the match, so a removed side leaves none. */
export function pruneCoalitions(ids: string[], map: CoalitionMap): CoalitionMap {
  const next: CoalitionMap = {};
  for (const id of ids) if (map[id]) next[id] = map[id];
  return next;
}
