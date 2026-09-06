/**
 * A recruitment bound a Warband can earn, and what earning it costs.
 *
 * The Black Grail's *Curse on Creation*:
 *
 *   "If the total cost of all of the other models in the Warband (including
 *    their Battlekit, etc.) adds up to 1000 or higher, in any Promotion Step
 *    after making all Advancement Rolls, you can remove 6 Grail Thralls from
 *    your Warband Roster. If you do so, increase the Limit of Amalgams your
 *    Warband can have to 0-2, and immediately recruit an Amalgam at no cost."
 *
 * The ability was derived, and rendered on the unit card, and consumed by
 * nothing. The Amalgam's `max` of 1 stayed correct as a BASE bound, so a second
 * Amalgam was simply illegal whether or not a player had earned it — there was
 * no state that could tell the two apart (docs/RULES-COVERAGE-AUDIT.md RC-08).
 *
 * The claim is a HISTORICAL FACT. Conditions are checked when it is made and
 * never again: a Warband that shrinks below 1000 Ducats afterwards does not
 * lose an Amalgam it already paid six Thralls for.
 */
import type { Cost, Dataset, EarnedRecruitment, UnitProfile } from '../types/catalogue';

/** A claim a Warband has made, as it is recorded on the roster. */
export interface EarnedClaim {
  /** The entry whose bound was raised. */
  profileId: string;
  /** The ability that granted it, so a chronicle can name the rule. */
  grantedBy: string;
  /** ISO timestamp, for the campaign record. */
  claimedAt: string;
  /** Names of the models given up, so the player can see what it cost. */
  spent: string[];
}

export const entitlementOf = (
  profile: UnitProfile | undefined | null,
): EarnedRecruitment | null => profile?.earnedRecruitment ?? null;

/** The bound in force: the earned one where it has been claimed, else the base. */
export function boundFor(
  profile: UnitProfile,
  claims: EarnedClaim[] | undefined,
  base: number | null,
): number | null {
  const rule = entitlementOf(profile);
  if (!rule) return base;
  const claimed = (claims ?? []).some((c) => c.profileId === profile.id);
  return claimed ? rule.max : base;
}

/**
 * A Warband, reduced to what this question needs.
 *
 * Models are identified by their PROFILE NAME rather than a profile id, which
 * is what the app can actually supply. `ActiveUnit.baseProfileId` is the id of
 * the hydrated catalogue entry, and hydration re-keys entries — the Amalgam is
 * `e5d5-…` in the dataset and `036b-…` in the store — so an id comparison here
 * silently matches nothing and every Warband looks ineligible. `toRoster`
 * matches by name for the same reason.
 */
export interface Candidates {
  units: { id: string; profileName: string; name: string; totalCost: number }[];
  claims?: EarnedClaim[];
}

export interface Eligibility {
  eligible: boolean;
  /** Why not, in the rule's terms. Empty where it is. */
  blockers: string[];
  /** Models that would be given up, if the player is eligible. */
  spendable: { id: string; name: string }[];
  /** What the rest of the Warband is worth right now. */
  othersCost: Cost;
  /** How many of the required models the Warband has. */
  have: number;
  /** The rule's own words. */
  text: string;
}

/**
 * Whether the Warband may claim it now.
 *
 * Every blocker is a sentence a player can act on, because the alternative — a
 * disabled control with no reason — is the shape of problem this whole audit
 * keeps finding.
 */
export function eligibility(
  dataset: Dataset,
  profile: UnitProfile,
  warband: Candidates,
): Eligibility {
  const rule = entitlementOf(profile);
  const blockers: string[] = [];
  if (!rule) {
    return {
      eligible: false,
      blockers: [`${profile.name} has no earned recruitment rule in this ruleset.`],
      spendable: [], othersCost: { ducats: 0, glory: 0 }, have: 0, text: '',
    };
  }

  /*
    "all of the other models" — every model that is not one of the ones being
    given up. The six Thralls are what is being spent, so they cannot also be
    what pays the threshold.
  */
  const spendProfile = (dataset.units ?? []).find((u) => u.name === rule.spends.profileName);
  const candidates = warband.units.filter((u) => u.profileName === rule.spends.profileName);
  const spendable = candidates.slice(0, rule.spends.count);
  const spentIds = new Set(spendable.map((u) => u.id));

  const othersCost: Cost = {
    ducats: warband.units.filter((u) => !spentIds.has(u.id))
      .reduce((n, u) => n + (u.totalCost ?? 0), 0),
    glory: 0,
  };

  if (!spendProfile) {
    blockers.push(
      `This ruleset has no entry named "${rule.spends.profileName}", so the rule cannot be applied.`);
  } else if (candidates.length < rule.spends.count) {
    blockers.push(
      `${rule.spends.count} ${rule.spends.profileName}s must be removed; the Warband has `
      + `${candidates.length}.`);
  }

  const need = rule.otherModelsCostAtLeast;
  if (othersCost.ducats < (need.ducats ?? 0)) {
    blockers.push(
      `The other models must be worth ${need.ducats} Ducats; they are worth `
      + `${othersCost.ducats}.`);
  }

  if ((warband.claims ?? []).some((c) => c.profileId === profile.id)) {
    blockers.push(`${rule.grantedBy} has already been claimed for this Warband.`);
  }

  return {
    eligible: blockers.length === 0,
    blockers,
    spendable: spendable.map((u) => ({ id: u.id, name: u.name })),
    othersCost,
    have: candidates.length,
    text: rule.text,
  };
}
