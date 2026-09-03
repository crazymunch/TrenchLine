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
import { isAlchemicalFormula, traitsOf, hasExtraLimb } from './formulae';
import { effectiveKeywords } from './keywordGrants';
import type { Warband, ActiveUnit } from '@/types/warband';
import type { Roster, RosterUnit, RosterItem } from './costs';
import { armouryFor, priceOf, offersOf } from './armoury';
import { factionOf, variantById, variantRenames } from './variants';
import { nameKey } from './names';

export interface RosterConversion {
  roster: Roster;
  /** Names present in the warband that no dataset entry matched. */
  unmatched: { kind: 'unit' | 'wargear'; name: string; on?: string }[];
}

const key = nameKey;

/**
 * Names drift: a saved model may hold the printed name a variant produced
 * ("Kavass") while the dataset holds the base entry ("Azeb"), and NewRecruit
 * prefixes an elite-promoted model ("Favoured Brazen Bull"). Try the exact
 * name, then the name with a known promotion title stripped, then containment.
 */
const PROMOTION_TITLES = /^(favoured|ascendant|blasphemous|putrid|exalted|commissioned officer)\s+/i;

function findProfile(
  units: UnitProfile[],
  name: string,
  /** Printed name -> entry id, for the names this warband's variant renames. */
  renames: Map<string, string>
): UnitProfile | undefined {
  const want = key(name);
  if (!want) return undefined;
  const bare = key(String(name).replace(PROMOTION_TITLES, ''));

  const byRename = (k: string) => {
    const id = renames.get(k);
    return id ? units.find((u) => u.entryId === id || u.id === id) : undefined;
  };

  return (
    units.find((u) => key(u.name) === want) ??
    // Before the promotion strip, so a variant that renames to a title-like
    // name is not mistaken for a promoted model.
    byRename(want) ??
    units.find((u) => key(u.name) === bare) ??
    byRename(bare) ??
    // Containment is the last resort and the loosest: it is what matches
    // "Sniper" to "Sniper Priest", and it is why it runs after everything else.
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
      // The catalogues reach some Battlekit only through a link the parser
      // cannot follow without turning unit options into equipment, so a real
      // item can have an Armoury Table row and no profile. That row is still
      // authority enough to price it and to say the faction stocks it — the
      // profile only adds range and keywords. Treating it as unmatched would
      // report a legally-equipped model as not in the ruleset.
      const row = offersOf(armoury, { name: g.name })[0];
      if (row) {
        out.push({ weaponId: row.weaponId ?? undefined, name: g.name, cost: row.cost, quantity: 1 });
        continue;
      }
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

  // A saved warband records the name the player saw, which for a variant that
  // renames an entry is not the name the dataset stores. Without this, every
  // Kavass in a House of Wisdom warband fails to join.
  const renames = variantRenames(variantById(dataset, warband.variantId));

  for (const u of warband.units ?? []) {
    const profile =
      findProfile(dataset.units, u.profileSnapshot?.name ?? '', renames) ??
      findProfile(dataset.units, u.customName ?? '', renames);

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
      /*
        The model's own upgrades — Alchemical Formulae, Strains, Sagas.
        Dropped until now, which is why a Takwin Homunculus with Gargantuan
        Size was told it could not take a Titan Zulfiqar: the catalogue reveals
        that weapon to a Brazen Bull *or* to anything with Gargantuan Size, and
        the roster carried no record of the Formula.

        Read from BOTH places an upgrade can be recorded, because that fix was
        only half of one. An upgrade chosen in the app lands in
        `specialUpgrades`; a roster IMPORTED from BattleScribe puts its
        Alchemical Formulae in `equippedEquipment`, and reading only the first
        left every imported Homunculus in exactly the state this comment says
        was repaired — Al-Masyukh carries Gargantuan Size and was still told
        "Brazen Bull only".

        Identified by the catalogue's own group rather than by name; see
        `src/rules/formulae.ts` for why guessing from the name is how this
        family of bug keeps recurring.
      */
      options: [
        ...(u.specialUpgrades ?? []).map((o) => ({
          optionId: o.id,
          name: o.name,
          cost: { ducats: o.cost ?? 0, glory: 0 },
        })),
        ...(u.equippedEquipment ?? []).filter(isAlchemicalFormula).map((e) => ({
          optionId: e.id,
          name: e.name,
          cost: { ducats: e.cost ?? 0, glory: 0 },
        })),
      ],
      /*
        Read from all THREE places, because the two above were still not all of
        them. Al-Masyukh carries Gargantuan Size as an innate ability on its
        profile snapshot — a model advanced into the Formula rather than
        holding a line item for it — and was still told it could not take the
        Titan Zulfiqar the catalogue reveals to exactly that name.
      */
      traits: traitsOf(u),
      /*
        The entry's Keywords plus the ones its Formulae grant. Al-Masyukh has
        STRONG because it bought Inhuman Strength — "Give this Takwin
        Homunculus the STRONG Keyword" — and the base Takwin Homunculus entry
        carries only ARTIFICIAL, so reading the entry alone told a legal model
        that its greatsword and sword needed three hands.
      */
      keywords: effectiveKeywords(profile, traitsOf(u), dataset),
      extraLimb: hasExtraLimb(u) || undefined,
      fireteam: u.fireteam,
    });
  }

  const roster: Roster = {
    id: warband.id,
    name: warband.name,
    factionId: warband.factionId,
    variantId: warband.variantId,
    allowThirdParty: warband.allowThirdParty,
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
      //
      // Matched through `factionOf`, not a bare key comparison: the rulebook
      // parser writes 'cult-of-the-black-grail' where the app says 'black-grail',
      // so a direct match silently missed the Black Grail's record entirely.
      glory: factionOf(dataset, warband.factionId)?.budget?.glory
        ?? warband.gloryPoints ?? 0,
    },
  };

  return { roster, unmatched };
}
