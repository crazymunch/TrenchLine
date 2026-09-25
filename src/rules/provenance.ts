/**
 * Where everything a Warband holds came from (FD-12 item 2).
 *
 * The owner asked for "a review of every exploration reward and skill a
 * warband holds and how each was earned". That review is only possible if the
 * record says how — and until now it did not: a Skill was a name, an injury
 * was a string, and an imported roster's `Point Blank [9]` lost the 9 on the
 * way in.
 *
 * Three rules run through this module. The first is rule 2 of `CLAUDE.md`:
 *
 * **An absent record reads as `import`, never as a roll.** A Skill written
 * before `source` existed came from somewhere the app cannot name. Calling
 * that an Advancement Roll would be inventing a die; calling it an import is
 * the truth about the entry — it arrived, and the record does not say how. The
 * same goes for a bare `roll` field on an old entry: the advancement sheet wrote
 * that from a dropdown, so it reads as a `row` — evidence of a choice, not a die.
 *
 * **The marking is for the reader, not for the arithmetic — where the arithmetic
 * is about the entry's EXISTENCE.** A scar counts towards retirement whether it
 * was rolled in the app or typed in afterwards, because what retires a model is
 * having three scars. `injuriesHeld`, `holdingsOf` and the scar count do not
 * filter by `kind`.
 *
 * **But an Advancement Roll is a claim about a die, and there `kind` and `roll`
 * both matter.** This is the correction round 2 made and round 3 tidied: for a
 * while this comment said a pre-app entry "counts exactly as a rolled one" and
 * that "nothing here filters by kind", and `advancementRolls` was being set to
 * `skills.length` on the strength of it. That cancels rolls a model earned — a
 * Patron grants Skills, so do some Glory Items and `65 Bitter Lessons`. So
 * `statesAnAdvancementRoll` reads the record and DOES look at `kind`: a Skill
 * consumes a roll only where its own record states the 2D6 total. Hand entry is
 * not worth less than a roll made in the app; it is worth what it says it is.
 */
import type {
  ActiveUnit, InjuryRecord, Provenance, ProvenanceKind, Warband, WarbandReward,
} from '@/types/warband';

/** What an entry with no record of its own is: an arrival, not a roll. */
export const IMPLIED: Provenance = { kind: 'import' };

/**
 * The provenance of an entry, present or not.
 *
 * One place, so no screen has to remember what a missing `source` means.
 */
export const provenanceOf = (
  entry: { source?: Provenance } | null | undefined,
): Provenance => entry?.source ?? IMPLIED;

/** The kinds, in the order FD-12 lists them. For a picker, and for a test. */
export const PROVENANCE_KINDS: ProvenanceKind[] = [
  'advancement', 'trauma', 'exploration', 'import', 'manual', 'manual-pre-app',
];

const KIND_LABEL: Record<ProvenanceKind, string> = {
  advancement: 'Advancement Roll',
  trauma: 'Trauma Step',
  exploration: 'Exploration',
  import: 'Imported',
  manual: 'Recorded by hand',
  'manual-pre-app': 'Recorded before the app',
};

/** The kind's own name, for a badge. */
export const provenanceKindLabel = (kind: ProvenanceKind): string => KIND_LABEL[kind];

/**
 * One line saying how something was earned.
 *
 * Only what the record actually holds. A provenance with no game does not get
 * "game 1" — that is the guess this whole module exists to refuse — and one
 * with no roll does not get brackets.
 */
export function provenanceLabel(
  entry: { source?: Provenance } | null | undefined,
  /*
    The reader (review round 2 item 4). `note` is the player's own words — "game
    2 exploration, before we used the app" — and a share link is read by whoever
    holds it, so the public reading omits it. Everything else in the label is
    derived: a kind, a game number, a die.

    Public by default, for the same reason `rosterSheet` defaults that way: a
    caller that forgets should say too little.
  */
  opts: { audience?: 'owner' | 'public' } = {},
): string {
  const p = provenanceOf(entry);
  const parts: string[] = [KIND_LABEL[p.kind] ?? KIND_LABEL.import];
  if (typeof p.game === 'number' && Number.isFinite(p.game)) parts.push(`game ${p.game}`);
  /* A throw and a choice are different claims, so they read differently
     (review round 2 item 3). `roll` is a die that came up; `row` is a line a
     player pointed at. Never "rolled" for the second. */
  if (p.roll) parts.push(`rolled ${p.roll}`);
  else if (p.row) parts.push(`row ${p.row}`);
  if (p.location) parts.push(p.location);
  if (p.note && opts.audience === 'owner') parts.push(p.note);
  return parts.join(' · ');
}

/**
 * A NewRecruit Skill or injury name, split from the roll it prints in brackets.
 *
 * `Point Blank [9]`, `Lost Arm [26]`. The bracket IS the provenance FD-12 asks
 * the importer to keep, and it is the only record of the roll that exists
 * anywhere: NewRecruit does not carry the game it happened in, so `game` stays
 * absent rather than being guessed at.
 *
 * A name with no bracket comes back whole with no roll, which is the honest
 * reading — not a roll of 0.
 */
export function splitRecordedRoll(raw: string): { name: string; roll?: string } {
  const m = /^\s*(.+?)\s*\[\s*([0-9]+(?:\s*-\s*[0-9]+)?)\s*\]\s*$/.exec(String(raw ?? ''));
  if (!m) return { name: String(raw ?? '').trim() };
  return { name: m[1].trim(), roll: m[2].replace(/\s+/g, '') };
}

/**
 * Every injury the model carries, with provenance where the record has it.
 *
 * `injuries` is the authority on WHICH injuries — it is the array every other
 * reader uses and the one the roster file has always carried — and
 * `injuryRecords` supplies the source for the ones it names. A record with no
 * matching string is still returned: losing an injury because the two arrays
 * disagree would be worse than showing one twice.
 */
export function injuriesHeld(unit: Pick<ActiveUnit, 'injuries' | 'injuryRecords'>): InjuryRecord[] {
  const records = unit.injuryRecords ?? [];
  const key = (s: string) => s.trim().toLowerCase();
  const taken = new Set<string>();

  const joined: InjuryRecord[] = (unit.injuries ?? []).map((name) => {
    const hit = records.find((r) => key(r.name) === key(name) && !taken.has(key(r.name)));
    if (hit) taken.add(key(hit.name));
    return { name, source: hit?.source };
  });

  for (const r of records) {
    if (!taken.has(key(r.name)) && !joined.some((j) => key(j.name) === key(r.name))) {
      joined.push(r);
    }
  }
  return joined;
}

/**
 * What an entry with no `source` but a `roll` actually says.
 *
 * **`import`, with the roll carried as a recorded roll.** Never `trauma` and
 * never `advancement`: the roll is a number somebody wrote down, and it is not
 * evidence that a step in this app produced it.
 *
 * This was wrong for a release (review round 1, finding D). A scar with a
 * `roll` and no `source` was read as `{ kind: 'trauma', roll }` — but the
 * advancement sheet has always written `roll` from the Trauma Table ROW a
 * player picked out of a dropdown, so every hand-entered scar on every existing
 * roster began reading "Trauma Step · rolled 31" for a D66 nobody threw. The
 * rule is the one the module opens with and it has no exceptions: a record with
 * no `source` is an `import`, whatever else it carries.
 */
const recordedRoll = (
  entry: { source?: Provenance; roll?: string },
): Provenance => entry.source
  /*
    And the bare `roll` is a ROW, not a throw (review round 2 item 3 — finding
    D's leftover). Every one of these was written by the advancement sheet from
    the table row a player picked out of a dropdown, so reading it as a roll made
    an existing roster say "Imported · rolled 31" for a D66 nobody threw. Round 1
    fixed the KIND and left the verb, which is half the claim.
  */
  ?? (entry.roll ? { kind: 'import', row: entry.roll } : IMPLIED);

/**
 * The 2D6 totals a Skills table can be reached on.
 *
 * Two dice, so 2 to 12 — and a D66 injury (`31`), a Trauma row's range
 * (`41-63`) and an empty string all fall outside it. The bound is what lets an
 * imported bracket be read for what it is: `Point Blank [9]` is a Skill roll,
 * `Lost Arm [26]` is not.
 */
const TWO_D6 = { min: 2, max: 12 };

const isTwoD6Total = (roll: string | undefined): boolean => {
  if (!roll || !/^[0-9]+$/.test(roll.trim())) return false;
  const n = Number(roll.trim());
  return n >= TWO_D6.min && n <= TWO_D6.max;
};

/**
 * Whether this Skill's own record says an Advancement Roll produced it.
 *
 * **The rule (review round 2 item 1).** A Skill consumes an Advancement Roll if
 * and only if its record states the roll. Not one per Skill: `advancement.ts`
 * has said so since it was written — "a model can gain a Skill without an
 * Advancement Roll: a Patron grants them, so do some Glory Items and the
 * `65 Bitter Lessons` Trauma result" — and round 1 counted Skills anyway, which
 * cancels rolls a model earned. A Sultanate Azeb imported with three Skills at
 * 6 Experience has earned two rolls (the circles at 2 and 4) and was recorded
 * as having taken three; at 7 it is owed one and the app offered none.
 *
 * Which way to be wrong is not symmetric, and that is the whole argument for
 * this being a floor rather than a guess: an over-offer is visible and the
 * player declines it, while an under-offer silently loses a roll the model
 * earned and nothing on any screen says so.
 *
 * - `advancement` — the app wrote it when the roll was taken, so it states one.
 * - `import` — only with a bracketed 2D6 total, which is NewRecruit's record of
 *   the throw. A Companion Skill whose export carries no roll states none.
 * - `manual`, `manual-pre-app` — only where the entry captured a 2D6 total. A
 *   player who typed a Skill and no number has not claimed a roll.
 * - anything else, and a Skill with no record at all — states none.
 *
 * `row` is deliberately not enough: a row picked out of a dropdown is evidence
 * of a choice, not of a die.
 */
export function statesAnAdvancementRoll(
  entry: { source?: Provenance } | null | undefined,
): boolean {
  const p = provenanceOf(entry);
  if (p.kind === 'advancement') return true;
  if (p.kind === 'import' || p.kind === 'manual' || p.kind === 'manual-pre-app') {
    return isTwoD6Total(p.roll);
  }
  return false;
}

/**
 * How many Advancement Rolls this model's Skills account for.
 *
 * What `advancementRolls` should be set to by an importer, and what a
 * hand-entered Skill adds to it — counted from the records rather than from the
 * length of the list.
 */
export const advancementRollsStated = (
  skills: ({ source?: Provenance } | null | undefined)[] | null | undefined,
): number => (skills ?? []).filter((s) => statesAnAdvancementRoll(s)).length;

/**
 * The Skills whose records state no roll, by name — for an import report.
 *
 * An importer that sets `advancementRolls` from the stated count owes the
 * player the reason: these are the Skills it did not count, and a Patron's
 * grant being among them is correct rather than a parse failure.
 */
export const skillsStatingNoRoll = (
  skills: ({ name?: string; source?: Provenance } | null | undefined)[] | null | undefined,
): string[] => (skills ?? [])
  .filter((s) => !statesAnAdvancementRoll(s))
  .map((s) => (s?.name ?? '').trim())
  .filter(Boolean);

/**
 * One thing a Warband holds, ready to print: what it is, whose it is, and how
 * it was got.
 *
 * `model` is the model's name for a Skill, an injury or a scar, and absent for
 * a reward, which belongs to the Warband rather than to anybody on it.
 */
export interface Holding {
  kind: 'skill' | 'injury' | 'scar' | 'reward';
  name: string;
  /** The rule as printed, where the record carries it. */
  text?: string;
  /**
   * The group the source filed a reward under, where it stated one.
   *
   * Absent for a Skill, an injury or a scar, whose `kind` says what they are —
   * and absent for a reward the source filed under no group, which is a real
   * case: NewRecruit's `Campaign Rules > Enabled` subtree carries its own Glory
   * counter alongside the Exploration rewards, with no group. A reader that
   * printed it as a reward the Warband earned would be adding a claim the roster
   * did not make.
   */
  group?: string;
  model?: string;
  source: Provenance;
}

/**
 * The review the owner asked for: everything at this Warband's disposal, and
 * how each of it was earned.
 *
 * Aggregated across the roster — rewards first, because they are the Warband's
 * own, then each model's Skills, injuries and scars in roster order. `fallen`
 * models are NOT included: the sheet is the Warband as it stands, and a dead
 * model's Skills are not at anybody's disposal.
 */
export function holdingsOf(
  warband: Pick<Warband, 'units' | 'rewards' | 'campaignRules'>,
): Holding[] {
  const out: Holding[] = [];

  for (const r of warband.rewards ?? []) {
    out.push({
      kind: 'reward',
      name: r.name,
      ...(r.text ? { text: r.text } : {}),
      ...(r.group ? { group: r.group } : {}),
      source: provenanceOf(r),
    });
  }

  /*
    A name the roster stated with no reward record beside it.

    `campaignRules` has been durable since GOLEM-1 and predates `rewards`, so a
    Warband imported before this ships holds names and no records. Listing the
    leftovers is what stops the review silently shrinking for those Warbands —
    and they read as `import`, which is exactly what they are.
  */
  const named = new Set((warband.rewards ?? []).map((r) => r.name.trim().toLowerCase()));
  for (const name of warband.campaignRules ?? []) {
    if (!named.has(name.trim().toLowerCase())) {
      out.push({ kind: 'reward', name, source: IMPLIED });
    }
  }

  for (const unit of warband.units ?? []) {
    const who = unit.customName || unit.profileSnapshot?.name || 'Unnamed';
    for (const s of unit.skills ?? []) {
      out.push({
        kind: 'skill', name: s.name, text: s.effect, model: who,
        source: recordedRoll(s),
      });
    }
    for (const i of injuriesHeld(unit)) {
      out.push({ kind: 'injury', name: i.name, model: who, source: provenanceOf(i) });
    }
    for (const sc of unit.scars ?? []) {
      out.push({
        kind: 'scar', name: sc.name, text: sc.effect, model: who,
        source: recordedRoll(sc),
      });
    }
  }

  return out;
}

/**
 * A reward the Warband holds under a NewRecruit group, if it holds one.
 *
 * Used for the Patron, which the roster files under `Patron Selection` rather
 * than naming as a Patron anywhere. Matched on the group the SOURCE stated, so
 * nothing here has to know any Patron's name.
 */
export const rewardInGroup = (
  rewards: readonly WarbandReward[] | undefined,
  group: string,
): WarbandReward | undefined =>
  (rewards ?? []).find((r) => (r.group ?? '').trim().toLowerCase() === group.trim().toLowerCase());
