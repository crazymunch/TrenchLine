/**
 * The sides in a match, whether or not the app holds their roster.
 *
 * A match is a list of ids. Most name a `Warband` the player owns; one may
 * name a `PlaceholderOpponent` — somebody who turned up with a list on paper.
 * Every read site in Play Mode wants the same four things from a side (what to
 * call it, whose faction it is, what models it has, whether it is real), so
 * they are resolved once here rather than each site learning about two shapes.
 *
 * **A placeholder has no models, and that is not a gap to fill.** `units` is
 * empty because nobody told us what they field, and inventing a model to make
 * the activation tracker look busy would be a roster this app made up. The
 * consequence is the design: a placeholder is a side you SCORE, never a side
 * you CONTROL — see `isControllable`.
 */
import type { Warband, ActiveUnit } from '@/types/warband';
import { isPlaceholderId, opponentLabel, type PlaceholderOpponent } from '@/types/opponent';

export interface MatchSide {
  id: string;
  name: string;
  factionId: string;
  /** Empty for a placeholder. Never a stand-in. */
  units: ActiveUnit[];
  isPlaceholder: boolean;
  /**
   * How many models the side fields, where that is known.
   *
   * A real warband knows exactly. A placeholder knows only if the player was
   * told, so this is `undefined` rather than `0` — a scenario rule that keys
   * off warband size must be able to tell "none" from "not stated".
   */
  fieldStrength?: number;
}

const sideFromWarband = (w: Warband): MatchSide => ({
  id: w.id,
  name: w.name,
  factionId: w.factionId,
  units: w.units,
  isPlaceholder: false,
  fieldStrength: w.units.length,
});

const sideFromOpponent = (
  o: PlaceholderOpponent, factionName: (id: string) => string | undefined,
): MatchSide => ({
  id: o.id,
  name: opponentLabel(o, factionName),
  factionId: o.factionId,
  units: [],
  isPlaceholder: true,
  fieldStrength: o.fieldStrength,
});

/**
 * A lookup from a match id to the side it names.
 *
 * Returns `undefined` for an id neither list has — a warband deleted while it
 * was still in a saved match, say. Callers already guard that case, and
 * answering with a made-up side would put a nameless player in the score bar.
 */
export function matchSides(
  warbands: Warband[],
  opponents: PlaceholderOpponent[],
  factionName: (id: string) => string | undefined = () => undefined,
): (id: string) => MatchSide | undefined {
  const byId = new Map<string, MatchSide>();
  for (const w of warbands) byId.set(w.id, sideFromWarband(w));
  for (const o of opponents) byId.set(o.id, sideFromOpponent(o, factionName));
  return (id) => byId.get(id);
}

/**
 * Whether this side's models can be activated, wounded and marked.
 *
 * Only a real warband. Play Mode's whole control surface — the activation
 * list, wounds, Blood and Blessing markers — reads `units`, so pointing it at
 * a side with none is a screen of nothing with no way back. The side switcher
 * skips these, and a placeholder can still hold VP and claim Deeds.
 */
export function isControllable(side: MatchSide | undefined): boolean {
  return Boolean(side && !side.isPlaceholder);
}

/**
 * The first id in a match that can actually be controlled.
 *
 * Used when a match opens, and when the viewed side is one the player cannot
 * control. `undefined` where the match is all placeholders, which a caller
 * must treat as "no match to run" rather than defaulting to index 0.
 */
export function firstControllableId(
  ids: string[], side: (id: string) => MatchSide | undefined,
): string | undefined {
  return ids.find((id) => isControllable(side(id)));
}

export { isPlaceholderId };
