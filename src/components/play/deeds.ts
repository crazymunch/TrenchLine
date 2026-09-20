import { parseRulesProse } from '@/rules/rulesProse';

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

/**
 * Deeds a model on the roster brings with it.
 *
 * The Combat Biologist's Battlefield Vivisection reads *"Whenever a Combat
 * Biologist is part of your Warband, add the Gather Knowledge Glorious Deed to
 * those normally available in each scenario you play"* (Warbands L9804-9806).
 *
 * So that Deed is not a property of the scenario, it is a property of having
 * the model — and the layer carries it on the ability that grants it, as
 * `grantsDeed`. This is the reader. Without it the field was data nothing
 * looked at, which is the antipattern this codebase keeps finding: machinery
 * written, tested, never wired up.
 *
 * **Read from the DATASET, not from the roster's `profileSnapshot`.** A
 * snapshot is frozen at recruitment and `recruitable.ts`'s `abilityOf` copies
 * only `id`, `name` and `description` — so no roster in existence carries
 * `grantsDeed`, and one recruited before this shipped never would. Which Deeds
 * an entry grants is a rules fact about the entry, not a stat the model was
 * hired with, so it is looked up live and a Warband saved months ago gets it
 * too.
 *
 * Matched on `entryId || id`, because that is what the hydrated profile's `id`
 * is (see `recruitable.ts`) — the roster holds the catalogue ENTRY's id, which
 * is not the dataset unit's own.
 *
 * Reads the whole roster, not the deployed models: the rule says "part of your
 * Warband", and a benched Biologist is still part of it.
 *
 * De-duplicated by title, because two Biologists grant the same Deed once —
 * and against `already`, so a scenario that happens to print a Deed of the
 * same name keeps its own wording rather than gaining a near-duplicate.
 */
export function rosterDeeds(
  warbands: readonly ({ units?: readonly RosterUnit[] } | null | undefined)[],
  datasetUnits: readonly DatasetUnit[] | null | undefined,
  already: readonly Deed[] = [],
): Deed[] {
  if (!datasetUnits?.length) return [];
  const byEntry = new Map<string, DatasetUnit>();
  for (const u of datasetUnits) {
    const key = u?.entryId || u?.id;
    if (key) byEntry.set(key, u);
  }

  const seen = new Set(already.map((d) => d.title.toLowerCase()));
  const out: Deed[] = [];
  for (const wb of warbands) {
    for (const unit of wb?.units ?? []) {
      const entry = unit?.profileSnapshot?.id
        ? byEntry.get(unit.profileSnapshot.id)
        : undefined;
      for (const ability of entry?.abilities ?? []) {
        const deed = ability?.grantsDeed;
        if (!deed?.name) continue;
        const key = deed.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ title: deed.name, desc: deed.description ?? '' });
      }
    }
  }
  return out;
}

/* The shapes `rosterDeeds` needs, so it depends on neither whole type. */
type RosterUnit = { profileSnapshot?: { id?: string } } | null | undefined;
type DatasetUnit = {
  id?: string;
  entryId?: string;
  abilities?: readonly { grantsDeed?: { name: string; description?: string } }[];
} | null | undefined;
