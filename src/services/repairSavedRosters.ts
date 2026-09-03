import type { Warband } from '../types/warband';
import { isInventedFormula } from '../rules/formulae';

/**
 * Remove Alchemical Formulae that were never in any book from saved rosters.
 *
 * `UnitAdvancementModal` used to offer eight hand-written Formulae that appear
 * in no catalogue and in no rulebook. The list is gone from the app, but a
 * roster saved while it existed still carries whatever was bought from it —
 * and a saved roster is the one place a deleted mistake survives a deploy.
 *
 * The one that mattered is `Third Arm`. It sat in the picker directly beside
 * the real `Additional Arm` at a different price — 10 Ducats against 15 — so a
 * player had no way to tell which of the two was the real entry, and buying
 * the wrong one both overstated the model's cost and was the only thing that
 * actually granted the third weapon hand, because `hasExtraArm` matched on the
 * invented name. Al-Masyukh, Hunter of Hunters carried both at once: the real
 * Formula rendered as gear and doing nothing, the invented one rendered as the
 * model's only Formula and doing the work.
 *
 * The Ducats are refunded, because they were charged for nothing.
 *
 * This does NOT touch anything it cannot name. An upgrade the catalogue has no
 * entry for is not necessarily invented — it may come from a ruleset this
 * build does not have loaded — so the repair is keyed to the nine specific
 * names that were shipped, and everything else is left exactly as it is.
 */
export interface RosterRepair {
  warband: string;
  unit: string;
  removed: string[];
  ducatsRefunded: number;
}

export function repairInventedFormulae(warbands: Warband[]): {
  warbands: Warband[];
  repairs: RosterRepair[];
} {
  const repairs: RosterRepair[] = [];

  const repaired = warbands.map((w) => {
    let warbandChanged = false;

    const units = (w.units ?? []).map((u) => {
      const invented = (u.specialUpgrades ?? []).filter(isInventedFormula);
      if (invented.length === 0) return u;

      const refund = invented.reduce((sum, x) => sum + (x.cost || 0), 0);
      warbandChanged = true;
      repairs.push({
        warband: w.name,
        unit: u.customName || u.profileSnapshot?.name || u.id,
        removed: invented.map((x) => x.name),
        ducatsRefunded: refund,
      });

      return {
        ...u,
        specialUpgrades: (u.specialUpgrades ?? []).filter((x) => !isInventedFormula(x)),
        totalCost: Math.max(0, (u.totalCost || 0) - refund),
      };
    });

    return warbandChanged ? { ...w, units } : w;
  });

  return { warbands: repairs.length ? repaired : warbands, repairs };
}
