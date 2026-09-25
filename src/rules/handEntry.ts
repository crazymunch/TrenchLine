/**
 * What a hand-entered record says about itself.
 *
 * Two components let a player write down something that happened at their
 * table: the advancement sheet (a Skill, a scar, an injury) and the Roster
 * Sheet's rewards modal. Both were building the same `Provenance` by hand, in
 * their own JSX, and the duplication cost exactly what duplication costs —
 * round 2 fixed the invented game number in one of them and left the other
 * writing `game: 1` for a Warband in no campaign, which round 3 then found
 * (Order 44 item 1).
 *
 * So the decision lives here, once, and is a pure function of its inputs rather
 * than of a component's state. That is also what makes it testable: the repo has
 * no DOM test environment, and a test that greps a component for the right call
 * proves only that the text is present.
 *
 * ## The rules it encodes
 *
 * **"Before the app" carries no game**, because there was no campaign record to
 * place it in. It is a different claim from "recorded by hand in the game the
 * campaign is on", and the player makes it deliberately.
 *
 * **Otherwise the game comes from `recordedCampaignGame`**, which is absent
 * unless the Warband is a member of the campaign that is loaded. Not
 * `campaignGameOf`: that answers 1 for a Warband in no campaign and for one
 * whose campaign is not the one open — the right Threshold to field to, and an
 * invention if it is written into a record (round 2 item 2).
 *
 * **A thrown die and a picked row are different claims.** `roll` is a total the
 * player says they threw; `row` is the line of a table they chose off a
 * dropdown. Only the first can consume an Advancement Roll, and
 * `provenanceLabel` reads them differently — "rolled 9" against "row 41-63".
 * Passing both is allowed and means what it says: this row, reached by this
 * throw.
 *
 * Empty strings are absent, not empty: a field the player left alone records
 * nothing at all.
 */
import type { Provenance } from '@/types/warband';
import { recordedCampaignGame } from './campaign';

export interface HandEntry {
  /** The player's claim that this predates the app holding the Warband. */
  beforeTheApp?: boolean;
  /** The Warband the entry is on — only its campaign membership is read. */
  warband: { campaignId?: string };
  /** The campaign currently loaded in the app, if any. */
  campaign?: { id?: string; currentGame?: number; currentTurn?: number } | null;
  /** The player's own words about how they came by it. */
  note?: string;
  /** A total the player says they threw. */
  roll?: string;
  /** A table row the player picked. Never reported as a throw. */
  row?: string;
}

const said = (s: string | undefined): string | undefined => {
  const t = (s ?? '').trim();
  return t ? t : undefined;
};

/** The provenance of something a player wrote down themselves. */
export function handEnteredSource(entry: HandEntry): Provenance {
  const note = said(entry.note);
  const roll = said(entry.roll);
  const row = said(entry.row);

  if (entry.beforeTheApp) {
    return {
      kind: 'manual-pre-app',
      ...(note ? { note } : {}),
      ...(roll ? { roll } : {}),
      ...(row ? { row } : {}),
    };
  }

  const game = recordedCampaignGame(entry.warband, entry.campaign);
  return {
    kind: 'manual',
    ...(game !== undefined ? { game } : {}),
    ...(note ? { note } : {}),
    ...(roll ? { roll } : {}),
    ...(row ? { row } : {}),
  };
}

/**
 * The 2D6 totals a Skills table can be reached on, as a player may type one.
 *
 * `provenance.ts` applies the same bound when it decides whether a record states
 * an Advancement Roll. This is the other end of it: the input that collects the
 * total refuses anything the rule would then silently ignore (Order 44 item 3).
 * Two dice, so 2 to 12 — `13` is not a 2D6 result, and saving it produced a
 * record reading "rolled 13" that consumed no roll and explained nothing.
 *
 * Returns the total as it should be stored, or a sentence saying what is wrong.
 * An empty field is neither: it is the player declining to claim a roll, which
 * is the correct entry for a Patron's Skill.
 */
export function readTwoD6Total(
  raw: string,
): { ok: true; roll?: string } | { ok: false; why: string } {
  const t = (raw ?? '').trim();
  if (!t) return { ok: true };
  if (!/^[0-9]{1,2}$/.test(t)) {
    return { ok: false, why: 'Give the 2D6 total as a number, or leave it empty.' };
  }
  const n = Number(t);
  if (n < 2 || n > 12) {
    return {
      ok: false,
      why: `${n} is not a 2D6 total — two dice give 2 to 12. `
        + 'Leave it empty for a Skill you did not roll for.',
    };
  }
  return { ok: true, roll: String(n) };
}
