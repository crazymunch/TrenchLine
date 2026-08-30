/**
 * The app's saved `Warband` -> the rules engine's `Roster`.
 *
 * This is where the old model and the generated data meet, and the join is by
 * **name**, because they have no ids in common: a saved warband carries profile
 * ids from the hand-written `defaultRules.ts` (`na-lieutenant`), while the
 * dataset carries BattleScribe ids (`5fad-8b9c-8d6a-a2f0`).
 *
 * A name that does not join is **reported, never dropped**. A silently omitted
 * model is a roster that validates as legal while being illegal — worse than no
 * validation at all, because it tells the player something false. Everything
 * that failed to join comes back in `unmatched` for the UI to show.
 *
 * Costs come from the faction's Armoury Table, not from the saved warband: the
 * saved numbers were computed against data the audit measured as 21% wrong on
 * Ducat costs, so re-pricing is the point of doing this at all.
 */
import type { Dataset, UnitProfile } from '@/types/catalogue';
import type { Warband, ActiveUnit } from '@/types/warband';
import type { Roster, RosterUnit, RosterItem } from './costs';
import { armouryFor, priceOf } from './armoury';

export interface RosterConversion {
  roster: Roster;
  /** Names present in the warband that no dataset entry matched. */
  unmatched: { kind: 'unit' | 'wargear'; name: string; on?: string }[];
}

const key = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Names drift: a saved model may hold the printed name a variant produced
 * ("Kavass") while the dataset holds the base entry ("Azeb"), and NewRecruit
 * prefixes an elite-promoted model ("Favoured Brazen Bull"). Try the exact
 * name, then the name with a known promotion title stripped, then containment.
 */
const PROMOTION_TITLES = /^(favoured|ascendant|blasphemous|putrid|exalted|commissioned officer)\s+/i;

function findProfile(units: UnitProfile[], name: string): UnitProfile | undefined {
  const want = key(name);
  if (!want) return undefined;
  return (
    units.find((u) => key(u.name) === want) ??
    units.find((u) => key(u.name) === key(String(name).replace(PROMOTION_TITLES, ''))) ??
    units.find((u) => key(u.name).includes(want) || want.includes(key(u.name)))
  );
}

/** Everything equipped on a model, priced from the faction's armoury. */
function itemsOf(
  unit: ActiveUnit,
  dataset: Dataset,
  factionId: string,
  unmatched: RosterConversion['unmatched']
): RosterItem[] {
  const armoury = armouryFor(dataset, factionId);
  const out: RosterItem[] = [];

  const gear = [
    ...(unit.equippedWeapons ?? []),
    ...(unit.equippedArmour ?? []),
    ...(unit.equippedEquipment ?? []),
  ] as { name: string; id?: string }[];

  for (const g of gear) {
    const w = dataset.weapons.find((x) => key(x.name) === key(g.name));
    if (!w) {
      unmatched.push({ kind: 'wargear', name: g.name, on: unit.customName });
      continue;
    }
    // The armoury is the price authority. Where this faction does not stock the
    // item, fall back to the catalogue's own cost rather than pricing it free —
    // and the validator will separately flag that it is not stocked.
    const price = priceOf(armoury, w) ?? w.cost;
    out.push({ weaponId: w.id, cost: price, quantity: 1 });
  }
  return out;
}

export function toRoster(warband: Warband, dataset: Dataset): RosterConversion {
  const unmatched: RosterConversion['unmatched'] = [];
  const units: RosterUnit[] = [];

  for (const u of warband.units ?? []) {
    const profile =
      findProfile(dataset.units, u.profileSnapshot?.name ?? '') ??
      findProfile(dataset.units, u.customName ?? '');

    if (!profile) {
      unmatched.push({ kind: 'unit', name: u.profileSnapshot?.name || u.customName || '(unnamed)' });
      continue;
    }

    units.push({
      id: u.id,
      profileId: profile.id,
      name: u.customName || profile.name,
      cost: profile.cost,
      items: itemsOf(u, dataset, warband.factionId, unmatched),
      options: [],
      fireteam: u.fireteam,
    });
  }

  const roster: Roster = {
    id: warband.id,
    name: warband.name,
    factionId: warband.factionId,
    variantId: warband.variantId,
    units,
    stash: (warband.armoryStash ?? []).map((s) => {
      const w = dataset.weapons.find((x) => key(x.name) === key((s as { name?: string }).name ?? ''));
      return {
        weaponId: w?.id,
        cost: w ? (priceOf(armouryFor(dataset, warband.factionId), w) ?? w.cost)
                : { ducats: 0, glory: 0 },
        quantity: 1,
      };
    }),
    budget: {
      ducats: warband.ducatLimit ?? 0,
      // The warband stores Glory as a running total rather than a limit; the
      // faction's own budget is the ceiling where one is published.
      glory: (dataset as unknown as { factions?: { id: string; budget?: { glory: number } }[] })
        .factions?.find((f) => key(f.id) === key(warband.factionId))?.budget?.glory
        ?? warband.gloryPoints ?? 0,
    },
  };

  return { roster, unmatched };
}
