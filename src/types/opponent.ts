/**
 * An opponent whose warband is not in this app.
 *
 * You turn up, someone brings a list on paper or in another app, and you still
 * want the match tracked and the result recorded against somebody. A
 * placeholder is the smallest thing that makes that possible: who they are and
 * what they field, and nothing it would be guessing at.
 *
 * **Deliberately not a `Warband`.** It is stored in its own list, it never
 * appears in the roster picker, it is never synced as one of the player's own,
 * and it can never be recruited into or equipped. A placeholder that drifted
 * into `warbands` would be a roster with no models that the builder, the
 * validator and cloud sync would all try to reason about.
 */
export interface PlaceholderOpponent {
  /** Always prefixed `opp-`, which is also how a match side is told apart. */
  id: string;
  /**
   * What to call them — usually the player's name, or their warband's if you
   * know it. May be blank: `opponentLabel` falls back to the faction.
   */
  name: string;
  /** One of the app's real faction ids. Never free text. */
  factionId: string;
  /**
   * How many models they field, if they told you.
   *
   * Optional and never defaulted. Scenario rules and Deeds that key off
   * warband size can use it when it is there; a guess would make them fire on
   * a number nobody gave.
   */
  fieldStrength?: number;
  createdAt: string;
}

/** `opp-…` is the only thing that distinguishes a placeholder side by id. */
export const PLACEHOLDER_ID_PREFIX = 'opp-';

export function isPlaceholderId(id: string): boolean {
  return id.startsWith(PLACEHOLDER_ID_PREFIX);
}

/**
 * What to show for an opponent, given the faction names the app knows.
 *
 * The name is optional on purpose — at a table you often have a faction and a
 * first name and nothing else — so this falls back rather than rendering an
 * empty chip. It never invents: with neither a name nor a known faction it
 * says so.
 */
export function opponentLabel(
  opp: PlaceholderOpponent,
  factionName: (id: string) => string | undefined,
): string {
  const named = opp.name.trim();
  if (named) return named;
  return factionName(opp.factionId) ?? 'Unnamed opponent';
}
