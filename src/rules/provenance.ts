/**
 * Where everything a Warband holds came from (FD-12 item 2).
 *
 * The owner asked for "a review of every exploration reward and skill a
 * warband holds and how each was earned". That review is only possible if the
 * record says how — and until now it did not: a Skill was a name, an injury
 * was a string, and an imported roster's `Point Blank [9]` lost the 9 on the
 * way in.
 *
 * Two rules run through this module, and both are rule 2 of `CLAUDE.md`:
 *
 * **An absent record reads as `import`, never as a roll.** A Skill written
 * before `source` existed came from somewhere the app cannot name. Calling
 * that an Advancement Roll would be inventing a die; calling it an import is
 * the truth about the entry — it arrived, and the record does not say how.
 *
 * **A pre-app entry counts exactly as a rolled one.** The owner's answer on
 * pre-app history was manual entry marked as such, so the marking is for the
 * reader, not for the arithmetic: `advancementRollsDue` and the scar count
 * must not treat a Skill typed in as worth less than one rolled in the app.
 * Nothing in here filters by `kind` for that reason.
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
  'advancement', 'trauma', 'exploration', 'import', 'manual-pre-app',
];

const KIND_LABEL: Record<ProvenanceKind, string> = {
  advancement: 'Advancement Roll',
  trauma: 'Trauma Step',
  exploration: 'Exploration',
  import: 'Imported',
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
): string {
  const p = provenanceOf(entry);
  const parts: string[] = [KIND_LABEL[p.kind] ?? KIND_LABEL.import];
  if (typeof p.game === 'number' && Number.isFinite(p.game)) parts.push(`game ${p.game}`);
  if (p.roll) parts.push(`rolled ${p.roll}`);
  if (p.location) parts.push(p.location);
  if (p.note) parts.push(p.note);
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
        /* A Skill imported before `source` existed carries its roll in `roll`
           and nothing else. That roll is a fact; presenting it is not a guess
           about WHERE it came from, which stays `import`. */
        source: s.source ?? (s.roll ? { kind: 'import', roll: s.roll } : IMPLIED),
      });
    }
    for (const i of injuriesHeld(unit)) {
      out.push({ kind: 'injury', name: i.name, model: who, source: provenanceOf(i) });
    }
    for (const sc of unit.scars ?? []) {
      out.push({
        kind: 'scar', name: sc.name, text: sc.effect, model: who,
        source: sc.source ?? (sc.roll ? { kind: 'trauma', roll: sc.roll } : IMPLIED),
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
