/**
 * Turn a finished match into a record of it.
 *
 * Everything here already existed in Play Mode's state and was thrown away
 * when the match ended. This is the one function that keeps it, and it is
 * pure: it takes what the tracker had and returns a record, so what gets
 * written can be tested without a browser.
 *
 * **It records, it does not judge.** No result is computed here — `victors()`
 * derives that from the scores when something needs to show it. A record that
 * stored "win" would be asserting an outcome the table may have decided on
 * different grounds, and would be wrong forever once written.
 */
import type { BattleRecord, BattleSide, DeedClaim } from '@/types/battle';
import { BATTLE_VERSION } from '@/types/battle';
import { COALITIONS, coalitionScore, hasCoalitions, type CoalitionMap } from './coalitions';
import type { SideScore } from './matchState';

/** What the caller knows about each side, resolved before this is called. */
export interface SideInfo {
  id: string;
  name: string;
  factionId: string;
  isPlaceholder: boolean;
}

/** A Deed as the scenario prints it, so its text can be copied into the record. */
export interface ScenarioDeed {
  title: string;
  description?: string;
}

export interface BattleInput {
  matchWarbandIds: string[];
  sideInfo: (id: string) => SideInfo | undefined;
  scores: Record<string, SideScore>;
  coalitions: CoalitionMap;
  scenarioId: string;
  scenarioName: string;
  scenarioDeeds: ScenarioDeed[];
  playTurn: number;
  weather?: { name: string; effect: string } | null;
  campaignMatchId?: string;
  /** Injected so a record is reproducible in a test. */
  now?: Date;
  id?: string;
}

/**
 * Build the record.
 *
 * Returns `null` where there is nothing to record — no sides — rather than
 * writing an empty battle into the chronicle. An empty record is worse than a
 * missing one: it looks like a game that was played and went nowhere.
 */
export function battleFromMatch(input: BattleInput): BattleRecord | null {
  const {
    matchWarbandIds, sideInfo, scores, coalitions,
    scenarioId, scenarioName, scenarioDeeds, playTurn, weather,
    campaignMatchId, now = new Date(),
  } = input;

  if (!matchWarbandIds.length) return null;

  const sides: BattleSide[] = matchWarbandIds.map((id) => {
    const info = sideInfo(id);
    const s = scores[id];
    return {
      id,
      /* The name at the time. A record holds what they were called, not a
         pointer to what they are called now — deleting a warband must not
         rewrite a battle it fought. */
      name: info?.name ?? id,
      factionId: info?.factionId ?? '',
      wasPlaceholder: info?.isPlaceholder ?? false,
      ...(coalitions[id] ? { coalition: coalitions[id] } : {}),
      vp: s?.vp ?? 0,
      turnScores: s?.turnScores ?? {},
    };
  });

  /*
    Deeds, attributed.

    `completedDeeds` is keyed by title and carries what the table knew about
    the claim: the model that performed it, and the turn if the tracker took
    one. The scenario supplies the text, and the text is COPIED: the dataset
    is regenerated from upstream catalogues, so a record storing only a title
    would silently re-describe a past battle whenever the wording changed.

    This loop used to read the mark as a turn and write the model's name into
    `DeedClaim.turn`, because the mark was a bare string and its comment said
    one thing while its writer wrote another. Each part now goes to the field
    that is named for it.
  */
  const deeds: DeedClaim[] = [];
  for (const id of matchWarbandIds) {
    const claimed = scores[id]?.completedDeeds ?? {};
    for (const [title, mark] of Object.entries(claimed)) {
      const printed = scenarioDeeds.find((d) => d.title === title);
      deeds.push({
        title,
        description: printed?.description ?? '',
        sideId: id,
        sideName: sides.find((s) => s.id === id)?.name ?? id,
        ...(mark?.unitId ? { unitId: mark.unitId } : {}),
        ...(mark?.unitName ? { unitName: mark.unitName } : {}),
        ...(mark?.turn ? { turn: mark.turn } : {}),
      });
    }
  }

  const vpOf = (id: string) => scores[id]?.vp ?? 0;
  const teamed = hasCoalitions(matchWarbandIds, coalitions);

  return {
    version: BATTLE_VERSION,
    id: input.id ?? `btl-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    endedAt: now.toISOString(),
    scenarioId,
    scenarioName,
    turns: Math.max(1, playTurn),
    sides,
    deeds,
    /* Only where it was actually played as coalitions. Totals on a free-for-all
       would be two sums of arbitrary groupings. */
    ...(teamed
      ? { coalitionTotals: {
          A: coalitionScore(matchWarbandIds, coalitions, COALITIONS[0], vpOf),
          B: coalitionScore(matchWarbandIds, coalitions, COALITIONS[1], vpOf),
        } }
      : {}),
    ...(weather ? { weather } : {}),
    ...(campaignMatchId ? { campaignMatchId } : {}),
  };
}
