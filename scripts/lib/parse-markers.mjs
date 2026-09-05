/**
 * The two marker pools a model carries during a battle.
 *
 * Play Mode had BLOOD MARKERS with the cap written into the store as a literal
 * `Math.min(6, …)` under a comment reading "Official Rulebook Cap", and it had
 * no BLESSING MARKERS at all. Both of those are the same mistake: a number and
 * an absence, each decided by a person reading a book rather than by the
 * pipeline reading it.
 *
 * Read from the sections the rulebook parser already produces, so this adds no
 * new source and no new extraction — only the two facts the app needs as data
 * rather than as prose.
 *
 * The two pools are NOT mirror images, and the book is explicit about it:
 *
 *   BLOOD     "A model cannot have more than 6 BLOOD MARKERS at any one time."
 *             "your opponent may choose to spend one or more BLOOD MARKERS"
 *   BLESSING   no cap is stated anywhere in the section
 *             "you may choose to spend one or more BLESSING MARKERS"
 *
 * So Blood is capped and spent against you by the other player; Blessing is
 * uncapped and spent by you. A UI that treats the second as a recolour of the
 * first gets the cap wrong in the direction that refuses a legal game state.
 */

/** `A model cannot have more than 6 BLOOD MARKERS at any one time.` */
const CAP = /cannot have more than (\d+)\s+[A-Z]+\s+MARKERS/i;

/**
 * Who spends them.
 *
 * Taken from the sentence that says so rather than assumed from the pool's
 * name: both sections state it in the same shape, and they disagree.
 */
const OPPONENT_SPENDS = /your opponent may (?:choose to )?spend/i;
const YOU_SPEND = /you may (?:choose to )?spend/i;

/** The sections this reads, by the title the rulebook parser gives them. */
const SECTIONS = ['Blood Markers', 'Blessing Markers'];

/**
 * @param {{title: string, content: string, page: number}[]} coreRules
 */
export function parseMarkers(coreRules) {
  const out = [];

  for (const title of SECTIONS) {
    const section = (coreRules ?? []).find((c) => c.title === title);
    /*
      Loudly, not silently. A missing section means the rulebook extraction
      changed shape, and the alternative to failing here is Play Mode quietly
      capping a pool at whatever the code last happened to believe.
    */
    if (!section) {
      throw new Error(
        `parse-markers: the rulebook has no "${title}" section. `
        + 'The marker pools cannot be read, and Play Mode must not fall back '
        + 'to a hand-written cap.');
    }

    const capped = section.content.match(CAP);
    const opponent = OPPONENT_SPENDS.test(section.content);
    const you = YOU_SPEND.test(section.content);
    if (!opponent && !you) {
      throw new Error(
        `parse-markers: "${title}" does not say who spends the markers. `
        + 'That is the difference between the two pools, so it is not guessed.');
    }

    out.push({
      /* `BLOOD MARKERS`, as the book sets it. */
      name: title.toUpperCase(),
      id: title.toLowerCase().replace(/\s+/g, '-'),
      /*
        `null` where the book states no cap — which is a fact about the game,
        not a gap in the reading. Blessing Markers have no printed limit.
      */
      cap: capped ? Number(capped[1]) : null,
      spentBy: opponent ? 'opponent' : 'controller',
      page: section.page,
      /* Quoted, so the app can show the rule rather than paraphrase it. */
      rules: section.content,
    });
  }

  return out;
}
