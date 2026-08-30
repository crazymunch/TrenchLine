import { parseRulesProse } from '../codex/rulesProse';

export type Deed = { title: string; desc: string };

/**
 * The Glorious Deeds of a scenario, from its `GLORIOUS DEEDS` section.
 *
 * This used to split the section on `\n` and keep only the lines that began a
 * bullet, which silently **truncated every deed in the game**. The extractor
 * hard-wraps at the source PDF's column width and separates the fragments
 * with a blank line, so Claim No Man's Land's first deed arrives as
 *
 *     - Bloodletting: An attack made by a friendly model results in the sixth BLOOD
 *
 *     MARKER being placed beside an enemy model.
 *
 * and the old parser dropped the second line. What a player scoring the
 * mission saw was "results in the sixth BLOOD" — a rule cut off mid-clause and
 * presented as if it were the whole rule. Seven of the twelve scenarios lose a
 * clause from most of their deeds that way.
 *
 * `parseRulesProse` already rejoins those fragments (it is the same wrapping
 * problem the Codex has), so the deeds ride on it rather than on a second
 * hand-rolled splitter that would drift from it.
 *
 * Only list blocks become deeds. A `GLORIOUS DEEDS` section can also carry a
 * paragraph of scoring prose — Claim No Man's Land explains Victory Points and
 * the Promotion Pool between two of its deeds — and that is section text, not
 * a deed to tick off.
 */
export function parseDeeds(section: string | null | undefined): Deed[] {
  return parseRulesProse(section ?? '')
    .flatMap((block) => (block.kind === 'list' ? block.items : []))
    .map((item) => {
      const clean = item.replace(/\*\*/g, '').trim();
      const colon = clean.indexOf(':');
      return colon === -1
        ? { title: clean, desc: '' }
        : { title: clean.slice(0, colon).trim(), desc: clean.slice(colon + 1).trim() };
    })
    .filter((deed) => deed.title.length > 0);
}
