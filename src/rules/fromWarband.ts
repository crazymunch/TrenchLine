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
import { ZERO_COST, type Dataset, type UnitProfile } from '@/types/catalogue';
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

/**
 * Is this name one of the catalogue's counters rather than a piece of wargear?
 *
 * Matched against the counter's own name AND against the name it counts plus
 * that counter's parenthetical. The catalogue spells four of these
 * `Ammuntion` — its own typo — and a roster can carry the corrected spelling,
 * so `Alchemical Ammunition (Loaded)` has to reach `Alchemical Ammuntion
 * (Loaded)`. Built from the two strings the catalogue already gives, rather
 * than from a table of misspellings written here.
 */
function isCounter(dataset: Dataset, name: string): boolean {
  const want = key(name);
  return (dataset.counters ?? []).some((c) => {
    if (key(c.name) === want) return true;
    const suffix = /\s(\([^()]*\))\s*$/.exec(c.name)?.[1];
    return Boolean(suffix) && key(`${c.forName} ${suffix}`) === want;
  });
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
  /* Counts the bundle SELECTIONS on this model, so two of the same bundle get
     two grant ids — see the expansion below. */
  let bundleSelections = 0;

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
      /*
        A loadout bundle grants several items under one name.

        `Polearm and Shield` is a catalogue entry with no profile of its own
        that links a Polearm and a Shield, so it matches no weapon and no
        armoury row — and was reported as "not in this ruleset", which drops
        it out of every legality check. Expanded into what it actually gives
        the model, so the hands it uses and the shield it carries are counted.
      */
      const bundle = (dataset.bundles ?? []).find((b) => key(b.name) === key(g.name));
      if (bundle) {
        /*
          THIS selection of the bundle, not the bundle's name.

          `oneStatedLoadout` exempts the items of ONE stated loadout from being
          policed against each other. Keyed on the name, a model carrying
          `Polearm and Shield` twice produced four items all claiming the same
          grant, so the exemption swallowed the whole set and hid two Shields
          and four hands' worth of weapons. The entry states what it hands the
          model ONCE; taking it twice is two loadouts, and the second one's
          items are as countable as anything bought on top.
        */
        const grantedBy = `${bundle.name}#${bundleSelections++}`;
        /*
          Priced as one thing, at the bundle's own cost, and NOT by pricing
          each part out of the Armoury Table: both bundles the catalogues
          define are free options in a Mercenary's `Loadout` group, and
          charging the parts separately billed the model 7 Ducats for a
          Polearm it is handed for nothing. The cost rides on the first part
          so the roster's total stays right whichever way it is summed.
        */
        bundle.grants.forEach((part, i) => {
          const cost = i === 0 ? bundle.cost : ZERO_COST;
          const w2 = dataset.weapons.find((x) => key(x.name) === key(part));
          if (w2) {
            out.push({ weaponId: w2.id, name: part, cost, quantity: 1, grantedBy });
            return;
          }
          /*
            No weapon profile and no armoury row does not make it unknown. The
            Shield a `Polearm and Shield` grants is a real Battlekit profile in
            the shared .gst that the weapon emit deliberately skips — resolving
            Battlekit links there turns a Black Grail Strain into equipment
            anyone can buy — and the build carries it into `dataset.battlekit`
            instead, which is where the limit engine reads its section and
            hands from. Reporting it unmatched would drop the Shield out of the
            one-Shield limit while the model plainly has one.
          */
          const known = (dataset.battlekit ?? []).some((b) => key(b.name) === key(part));
          if (known) { out.push({ name: part, cost, quantity: 1, grantedBy }); return; }
          unmatched.push({ kind: 'wargear', name: part, on: unit.customName });
        });
        continue;
      }

      /*
        BattleScribe's own bookkeeping, which is not wargear and is not
        reported as missing from the ruleset.

        `Alchemical Ammunition (Loaded)` is a hidden entry capped at zero
        across the roster that the catalogue increments once per `Alchemical
        Ammunition` bought — no cost, no profile, no rules, and not choosable.
        Reported as "not in this ruleset" it told the player their list was
        provisional over a thing that is not an item. It contributes nothing to
        a legality check either, so it is dropped rather than counted.
      */
      if (isCounter(dataset, g.name)) continue;

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
      /* A model a rule gave the Warband costs nothing — see `grantedFree`.
         Its gear is still bought and still counted. */
      cost: u.grantedFree ? { ducats: 0, glory: 0 } : profile.cost,
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
    earnedRecruitment: warband.earnedRecruitment,
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
    /* The Strongbox itself, for the overdrawn check. An unrestricted list
       holds no money, so it carries none and is never refused for it. */
    ...(warband.forceMode === 'unrestricted' ? {} : {
      strongbox: {
        ducats: warband.treasuryDucats ?? 0,
        glory: warband.gloryPoints ?? 0,
      },
    }),
  };

  return { roster, unmatched };
}
