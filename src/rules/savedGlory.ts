/**
 * What a saved model costs in Glory.
 *
 * Trench Crusade prices in two currencies and the app's saved format models
 * one: `ActiveUnit.totalCost` is a running Ducat total, maintained by the
 * store as gear is added and removed. So a Mercenary hired for 0 Ducats and 4
 * Glory read `0 D` on its card — a free model, on a roster where nothing else
 * is free, next to a budget meter it moved not at all.
 *
 * The Glory is not missing from the save. `UnitProfile.gloryCost` and the
 * `gloryCost` on every wargear profile are captured in the snapshot at recruit
 * time, and the recruit sheet already prints them; nothing downstream read
 * them back. This adds it up, and nothing more:
 *
 * - It does **not** re-price from the catalogue. `fromWarband.ts` does that,
 *   and it is the right answer when a dataset is loaded — but it needs one,
 *   and a card has to render without.
 * - It does **not** touch `totalCost`. Turning the Ducat total into a `Cost`
 *   means changing every incremental `+ weapon.cost` in the store slices, and
 *   a display fix should not carry that risk.
 *
 * Which means the two numbers come from different places, and only the Ducat
 * one follows an advancement's cost delta. That is the existing behaviour of
 * the save format; it is written down here rather than smoothed over.
 */
import type { ActiveUnit } from '@/types/warband';

/** Glory on the model's own entry, plus Glory on everything it carries. */
export function unitGlory(u: ActiveUnit): number {
  const gear = [
    ...(u.equippedWeapons ?? []),
    ...(u.equippedArmour ?? []),
    ...(u.equippedEquipment ?? []),
  ];
  return (u.profileSnapshot?.gloryCost ?? 0)
    + gear.reduce((sum, g) => sum + (g.gloryCost ?? 0), 0);
}

/** Glory across a whole roster. */
export function rosterGlory(units: ActiveUnit[]): number {
  return units.reduce((sum, u) => sum + unitGlory(u), 0);
}

/**
 * `120 D`, `4 G`, or `120 D · 4 G`.
 *
 * Zero Ducats with no Glory still prints `0 D`: a genuinely free model is a
 * fact about the entry, and blanking the cost would make it look unpriced.
 * What must never happen again is `0 D` standing in for a cost that exists.
 */
export function formatUnitCost(ducats: number, glory: number): string {
  if (!glory) return `${ducats} D`;
  if (!ducats) return `${glory} G`;
  return `${ducats} D · ${glory} G`;
}
