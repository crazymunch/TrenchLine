/**
 * PR #114, review round 1 — the findings that are decided in the rules layer.
 *
 * One test per finding, named by its letter, so a reviewer can read the order
 * and this file side by side. The findings that are decided in a store slice
 * live in `src/store/__tests__/reviewRound1Store.test.ts`.
 *
 * Everything reads `DATASET`. No statline, price or ability text is typed here.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import BASE from '@/data/generated/github-latest.generated';
import { FACTIONS } from '@/data/defaultRules';
import type { Dataset, ArmouryRow } from '@/types/catalogue';
import { recruitable } from '../recruitable';
import {
  explorationChoices, explorationGrants, resolveCarcassFrontExploration,
  carcassFrontLootPerPoint, carcassFrontStartingDice,
} from '../campaign';
import {
  gloryItemPermission, gloryItemNotice, gloryItemGrants, grantableRows,
  isGloryItem, openingLocations,
} from '../gloryItems';
import { visibleAbilities, modelSelections } from '../applyVariant';
import { swappedProfile, statlineOptionsOf } from '../statlineOptions';
import { shownAbilitiesFor } from '../shownAbilities';
import { validateRoster } from '../validate';
import { toRoster } from '../fromWarband';
import type { Warband, ActiveUnit } from '@/types/warband';

const dataset = DATASET as unknown as Dataset;
const withoutSupplement = BASE as unknown as Dataset;
const APP = FACTIONS.map((f) => f.id);

const unit = (name: string, faction?: string) => dataset.units.find(
  (u) => u.name === name && (!faction || u.factionId === faction))!;
const variant = (name: string) => (dataset.variants ?? []).find((v) => v.name === name);
const armoury = (id: string) => dataset.armouries!.find((a) => a.factionId === id)!;
const location = (name: string) =>
  Object.values(dataset.campaign!.exploration!.locations as Record<string, {
    name: string; description?: string }[]>)
    .flat().find((l) => l.name === name)!;
const names = (l: { name: string }[]) => l.map((a) => a.name);

/** The whole Glory Item Table open, which is what most of these need. */
const wideOpen = () => gloryItemPermission(
  dataset, explorationGrants(dataset, location('Black Network Contact'), 1));

/* ------------------------------------------------------------------ A ---- */

describe('A — a Glory Item is filed by what it IS', () => {
  const offers = recruitable(dataset, 'new-antioch', APP, undefined, wideOpen());

  /*
    `Glory Items` is a TABLE, not a kind. Filing the row's section as the kind
    matched neither the Armour branch nor the Equipment branch, so all 54 fell
    through to the weapons list — a suit of armour could not reach the armour
    slot.
  */
  it('puts Ducal Winged Armour in the armour list', () => {
    expect(names(offers.armour)).toContain('Ducal Winged Armour');
    expect(names(offers.weapons)).not.toContain('Ducal Winged Armour');
  });

  it('puts a Knighthood in the equipment list', () => {
    expect(names(offers.equipment)).toContain('Knighthood');
    expect(names(offers.weapons)).not.toContain('Knighthood');
  });

  /* And something with a Range is still a weapon. */
  it('keeps a Glory Item that is a weapon in the weapons list', () => {
    const sultanate = recruitable(dataset, 'iron-sultanate', APP, undefined, wideOpen());
    expect(names(sultanate.weapons)).toContain('Kilij');
  });

  it('labels every one of them, whichever list it joined', () => {
    const all = [...offers.weapons, ...offers.armour, ...offers.equipment];
    const labelled = all.filter((x) => x.gloryItem).map((x) => x.name).sort();
    const rows = armoury('new-antioch').rows.filter(isGloryItem).map((r) => r.name).sort();
    expect(labelled).toEqual(rows);
  });

  /* A name can sit on both of a faction's tables, and the book says so: the
     Court's footnote 3 allows three Restraining Muzzles bought with Glory in
     addition to three bought with Ducats. Two offers, two ids. */
  it('keeps the two offers of one name apart', () => {
    const court = recruitable(dataset, 'court-of-the-seven-headed-serpent', APP,
      undefined, wideOpen());
    const muzzles = [...court.weapons, ...court.armour, ...court.equipment]
      .filter((x) => x.name === 'Restraining Muzzle');
    expect(muzzles).toHaveLength(2);
    expect(new Set(muzzles.map((m) => m.id)).size).toBe(2);
    expect(muzzles.filter((m) => m.gloryItem)).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ B ---- */

describe('B — a Location that offers a choice grants only what was chosen', () => {
  it('reads the Trench Merchant’s two options', () => {
    expect(explorationChoices(location('Trench Merchant')).map((c) => c.label))
      .toEqual(['Report', 'Trade']);
  });

  it('grants nothing for Report', () => {
    expect(explorationGrants(dataset, location('Trench Merchant'), 1, 'Report'))
      .toEqual([]);
  });

  it('opens the tables to 5 Glory for Trade', () => {
    const [effect] = explorationGrants(dataset, location('Trench Merchant'), 1, 'Trade');
    expect(effect.gloryItemsUpTo).toBe(5);
  });

  it('grants nothing at all until one is chosen', () => {
    expect(explorationGrants(dataset, location('Trench Merchant'), 1)).toEqual([]);
  });

  /* The Black Market states its permission outright and offers no choice, so
     nothing about it changes. */
  it('leaves a Location with no choice exactly as it was', () => {
    expect(explorationChoices(location('Black Market'))).toEqual([]);
    const [effect] = explorationGrants(dataset, location('Black Market'), 1);
    expect(effect.gloryItemsUpTo).toBe(8);
  });

  it('reads every option of all thirteen Locations that offer one', () => {
    const all = Object.values(dataset.campaign!.exploration!.locations as Record<string, {
      name: string; description?: string }[]>).flat();
    const offering = all.filter((l) => explorationChoices(l).length);
    expect(offering).toHaveLength(13);
    for (const l of offering) {
      for (const c of explorationChoices(l)) {
        expect(c.label, l.name).not.toBe('');
        expect(c.text, `${l.name} / ${c.label}`).not.toBe('');
      }
    }
  });
});

/* ------------------------------------------------------------------ C ---- */

describe('C — the Dispatch’s Glory Items sit behind the gate', () => {
  it.each([
    ['cult-of-the-black-grail', 'Blessings of Beelzebub'],
    ['iron-sultanate', 'Regimental Kaşık'],
  ])('%s / %s is a Glory Item row', (factionId, name) => {
    const row = armoury(factionId).rows.find((r) => r.name === name)!;
    expect(row.section).toBe('Glory Items');
  });

  it('so a Warband that has discovered nothing is not offered them', () => {
    const shut = gloryItemPermission(dataset, []);
    const offers = recruitable(dataset, 'cult-of-the-black-grail', APP, undefined, shut);
    const all = [...offers.weapons, ...offers.armour, ...offers.equipment];
    expect(names(all)).not.toContain('Blessings of Beelzebub');
  });
});

/* ------------------------------------------------------------------ D ---- */

/** A Warband whose Arsenal holds `n` copies of one row, as `buyToStash` stacks them. */
const stacked = (name: string, n: number): Warband => ({
  id: 'w', name: 'Stack', factionId: 'new-antioch',
  ducatLimit: 1000, treasuryDucats: 0, gloryPoints: 0,
  units: [], snapshots: [],
  armoryStash: [{ id: 's1', name, type: 'Weapon', cost: 0, quantity: n }],
} as unknown as Warband);

describe('D — the Arsenal’s stacked quantities reach the limit check', () => {
  const row = armoury('new-antioch').rows.find((r) => r.name === 'Grenade Launcher')!;

  it('reads a Limit: 2 row out of the shipped Armoury Table', () => {
    expect(row.restrictions).toContain('Limit: 2');
  });

  /*
    `buyToStash` stacks a second copy onto the row it already holds, and
    `toRoster` mapped every row to `quantity: 1` — so three copies on one row
    counted as one and the limit raised nothing.
  */
  it('counts three copies on one row as three', () => {
    const { roster } = toRoster(stacked('Grenade Launcher', 3), dataset);
    expect(roster.stash[0].quantity).toBe(3);
    const v = validateRoster(roster, dataset).violations
      .filter((x) => x.code === 'wargear-limit');
    expect(v).toHaveLength(1);
    expect(v[0].message).toContain('3 taken across the warband');
  });

  it('and two on one row as two, which is within the limit', () => {
    const { roster } = toRoster(stacked('Grenade Launcher', 2), dataset);
    expect(validateRoster(roster, dataset).violations
      .filter((x) => x.code === 'wargear-limit')).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ E ---- */

describe('E — an item the catalogues cannot name is still limit-checked', () => {
  const scope = armoury('iron-sultanate').rows
    .find((r) => r.name === 'Sniper Scope' && isGloryItem(r))!;

  it('is a Limit: 2 row with no catalogue profile', () => {
    expect(scope.weaponId).toBeNull();
    expect(scope.restrictions.join(' ')).toContain('Limit: 2');
  });

  it('refuses a third copy in the Arsenal', () => {
    const w = stacked('Sniper Scope', 3);
    (w as { factionId: string }).factionId = 'iron-sultanate';
    const { roster } = toRoster(w, dataset);
    const v = validateRoster(roster, dataset).violations
      .filter((x) => x.code === 'wargear-limit');
    expect(v).toHaveLength(1);
    expect(v[0].message).toContain('Sniper Scope');
  });

  it('and allows two', () => {
    const w = stacked('Sniper Scope', 2);
    (w as { factionId: string }).factionId = 'iron-sultanate';
    const { roster } = toRoster(w, dataset);
    expect(validateRoster(roster, dataset).violations
      .filter((x) => x.code === 'wargear-limit')).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ F ---- */

describe('F — a Location that hands over one Glory Item', () => {
  it('records the grant and its ceiling, not a standing permission', () => {
    const [effect] = explorationGrants(dataset, location('Ruined House'), 2, 'Relic');
    expect(effect.gloryItemOnce).toBe(7);
    expect(effect.gloryItemsUpTo).toBeUndefined();
  });

  it('so the tables stay shut for purchases', () => {
    const held = explorationGrants(dataset, location('Ruined House'), 2, 'Relic');
    expect(gloryItemPermission(dataset, held).upTo).toBeNull();
  });

  it('but the grant is outstanding, and names what it may be spent on', () => {
    const held = explorationGrants(dataset, location('Ruined House'), 2, 'Relic');
    const [grant] = gloryItemGrants(held);
    expect(grant.upTo).toBe(7);
    expect(grant.source).toBe('Ruined House');

    const rows = grantableRows(armoury('new-antioch').rows, grant);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => isGloryItem(r) && r.cost.glory <= 7)).toBe(true);
    /* And nothing dearer: New Antioch's Great Banner is 12 Glory. */
    expect(rows.map((r) => r.name)).not.toContain('Great Banner of New Antioch');
  });

  it('is spent once taken, so a second Relic cannot come off one find', () => {
    const held = explorationGrants(dataset, location('Ruined House'), 2, 'Relic');
    const spent = held.map((e) => ({ ...e, takenAtGame: 3, takenItem: 'Knighthood' }));
    expect(gloryItemGrants(spent)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ G ---- */

describe('G — the notice comes from the dataset', () => {
  it('names the Locations the dataset says open the tables', () => {
    expect(openingLocations(dataset).sort())
      .toEqual(['Black Market', 'Black Network Contact', 'Trench Merchant']);
  });

  it('quotes the rulebook’s own sentence rather than a paraphrase', () => {
    const notice = gloryItemNotice(gloryItemPermission(dataset, []), dataset);
    expect(notice).toContain('Glory Items can only be purchased during a campaign');
    for (const name of openingLocations(dataset)) expect(notice).toContain(name);
  });

  it('says the ceiling and its source once the tables are open', () => {
    const notice = gloryItemNotice(
      gloryItemPermission(dataset, explorationGrants(dataset, location('Black Market'), 2)),
      dataset);
    expect(notice).toContain('8 Glory');
    expect(notice).toContain('Black Market');
  });
});

/* ------------------------------------------------------------------ I ---- */

describe('I — the Carcass Front Step’s numbers are derived', () => {
  it('reads the pool and the rate from the supplement', () => {
    expect(dataset.campaign!.carcassFrontExplorationStep)
      .toEqual({ startingDice: 3, lootPerPoint: 5 });
    expect(carcassFrontStartingDice(dataset)).toBe(3);
    expect(carcassFrontLootPerPoint(dataset)).toBe(5);
  });

  it('and a ruleset without the supplement carries neither', () => {
    expect(withoutSupplement.campaign?.carcassFrontExplorationStep).toBeUndefined();
  });

  it('pays the roll times the rate the book states', () => {
    const resource = Object.keys(dataset.campaign!.carcassFrontExploration!)[0];
    const out = resolveCarcassFrontExploration(dataset, { roll: 9, resource })!;
    expect(out.loot).toBe(9 * carcassFrontLootPerPoint(dataset));
  });
});

/* ------------------------------------------------------------------ J ---- */

describe('J — a condition’s type and value are honoured', () => {
  /*
    The Artillery Witch's Creator's Shadow is hidden when the roster has FEWER
    THAN ONE Cadaver Corps. Read as a presence test the branch was exactly
    backwards: shown to everyone except the Warband it belongs to.
  */
  it('shows Creator’s Shadow under Cadaver Corps and to nobody else', () => {
    const witch = unit('Artillery Witch');
    expect(names(visibleAbilities(witch, { dataset, rosterSelections: [] })))
      .not.toContain("Creator's Shadow");
    expect(names(visibleAbilities(witch, {
      dataset, variant: variant('Cadaver Corps'), rosterSelections: [],
    }))).toContain("Creator's Shadow");
  });

  /*
    And the Yoke Fiend states `Hateful` TWICE — one version for a Fang of the
    Seething Black Warband and one for everybody else, each hidden by its own
    `lessThan`/`atLeast` pair. Keyed by name the two were one, so whichever
    modifier was read last hid both and the ability appeared under no Variant.
  */
  it('shows the Yoke Fiend’s Hateful under both readings', () => {
    const fiend = unit('Yoke Fiend');
    expect(fiend.abilities.filter((a) => a.name === 'Hateful')).toHaveLength(2);
    expect(names(visibleAbilities(fiend, { dataset, rosterSelections: [] })))
      .toContain('Hateful');
    expect(names(visibleAbilities(fiend, {
      dataset, variant: variant('Fang of the Seething Black'), rosterSelections: [],
    }))).toContain('Hateful');
  });

  it('and the two are told apart by the profile id, not the name', () => {
    const fiend = unit('Yoke Fiend');
    const stamped = (fiend.modifiers ?? []).filter(
      (m) => m.origin === 'profile:Hateful' && m.originId);
    expect(stamped.length).toBeGreaterThan(1);
    expect(new Set(stamped.map((m) => m.originId)).size).toBe(2);
  });
});

/* ------------------------------------------------------------------ K ---- */

const model = (over: Partial<ActiveUnit>): ActiveUnit => ({
  id: 'u1', customName: 'Test', isDead: false, xp: 0,
  equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
  injuries: [], totalCost: 0,
  ...over,
} as unknown as ActiveUnit);

describe('K — visibility is asked of the Variant-applied entry', () => {
  /*
    The Knights of Saint Lazarus replace Whip of God with Knightly Code, so the
    snapshot holds the new name and the RAW entry holds the old. Filtering one
    against the other lost the ability the Variant exists to grant.
  */
  it('keeps a Variant’s replaced ability on the model it created', () => {
    const lazarus = variant('Knights of Saint Lazarus');
    /* The Variant is the Procession's, and the entry it renames is the
       Lazarist Castigator — `unit('Castigator')` is the Trench Pilgrims' own
       model, which the Knights of Saint Lazarus have nothing to say about. */
    const entry = unit('Lazarist Castigator');
    const replaced = recruitable(dataset, 'procession-of-the-sacred-affliction', APP,
      lazarus?.id).units.find((u) => u.name === 'Leper-Knight')!;

    const shown = shownAbilitiesFor({
      dataset,
      entry,
      variant: lazarus,
      unit: model({ profileSnapshot: { ...replaced } as never }),
    });
    expect(names(shown)).toContain('Knightly Code');
    expect(names(shown)).not.toContain('Whip of God');
  });

  /*
    And a model recruited before the Variant was declared: `updateWarbandVariant`
    does not re-snapshot, so the snapshot is the standard list's while the entry
    now reads under the Variant.
  */
  it('shows the Variant’s abilities on a model recruited before it was taken', () => {
    const entry = unit('Shocktrooper');
    const standard = recruitable(dataset, 'new-antioch', APP).units
      .find((u) => u.name === 'Shocktrooper')!;

    const shown = shownAbilitiesFor({
      dataset,
      entry,
      variant: variant('Remnants of Byzantium'),
      unit: model({ profileSnapshot: { ...standard } as never }),
    });
    expect(names(shown)).toContain('Axe Mastery');
    expect(names(shown)).toContain('Shield Bash');
  });

  /* An ability the entry has never heard of is the campaign's, and stays. */
  it('keeps an ability the entry does not know', () => {
    const entry = unit('Yeoman', 'New Antioch');
    const shown = shownAbilitiesFor({
      dataset,
      entry,
      variant: undefined,
      unit: model({
        profileSnapshot: {
          name: 'Yeoman', stats: {},
          innateAbilities: [{ id: 'x', name: 'A Campaign Gift', description: 'Given in play.' }],
        } as never,
      }),
    });
    expect(names(shown)).toContain('A Campaign Gift');
  });

  /* And with no entry to ask, the roster's own record stands whole. */
  it('leaves the snapshot alone when the entry cannot be resolved', () => {
    const snapshot = {
      name: 'Nobody', stats: {},
      innateAbilities: [{ id: 'y', name: 'Kept', description: '.' }],
    };
    expect(names(shownAbilitiesFor({
      dataset, entry: null, variant: undefined,
      unit: model({ profileSnapshot: snapshot as never }),
    }))).toEqual(['Kept']);
  });
});

/* ------------------------------------------------------------------ L ---- */

describe('L — a condition naming a GROUP is resolved by membership', () => {
  const shock = unit('Shocktrooper');
  const byz = variant('Remnants of Byzantium');

  /*
    `Shields` is a selectionEntryGroup, not a thing a model can carry. Decided
    as an item the model does not have, a Varangian Guard with a Trench Shield
    and a two-handed axe kept the ability its own rule takes off it.
  */
  it('loses Shock Charge to a real Trench Shield and a real Great Sword/Axe', () => {
    const shown = names(visibleAbilities(shock, {
      dataset, variant: byz,
      selections: ['Trench Shield', 'Great Sword/Axe'],
      rosterSelections: [],
    }));
    expect(shown).not.toContain('Shock Charge');
  });

  it('and keeps it with the shield alone', () => {
    expect(names(visibleAbilities(shock, {
      dataset, variant: byz, selections: ['Trench Shield'], rosterSelections: [],
    }))).toContain('Shock Charge');
  });

  /*
    And it is membership that decides it, not the literal word. The condition
    names `Shields`; a Heavy Ballistic Shield is a different name stocked under
    that group, and it has to count.
  */
  it('counts any member of the group, not just the group’s own name', () => {
    expect(names(visibleAbilities(shock, {
      dataset, variant: byz,
      selections: ['Heavy Ballistic Shield', 'Dane Axe'],
      rosterSelections: [],
    }))).not.toContain('Shock Charge');
  });

  /*
    A known item the model does not have is decided FALSE, not undecidable: the
    axe alone is not the shield-and-axe the rule takes the ability away for.
    (`unknownVisibilityLeaves` is what pins the other half — a name the dataset
    knows nothing about stays undecided; see `visibleAbilities.test.ts`.)
  */
  it('decides a known item the model does not carry', () => {
    expect(names(visibleAbilities(shock, {
      dataset, variant: byz, selections: ['Dane Axe'], rosterSelections: [],
    }))).toContain('Shock Charge');
  });
});

/* ------------------------------------------------------------------ M ---- */

describe('M — an inherited ability brings the sentence that conditions it', () => {
  /*
    `Undead Fortitude` sits on the Grail Thrall entry with `set hidden=true`
    when the selection is `Winged`, and a Winged Thrall IS that selection. The
    ability was copied onto the second profile and the rule that takes it away
    was not, so the Fly Thrall showed a rule the book prints "(Grail Thralls
    only)".
  */
  it('takes Undead Fortitude off the Fly Thrall and leaves it on the Thrall', () => {
    expect(names(visibleAbilities(unit('Winged Thrall'), { dataset, rosterSelections: [] })))
      .not.toContain('Undead Fortitude');
    expect(names(visibleAbilities(unit('Thrall'), { dataset, rosterSelections: [] })))
      .toContain('Undead Fortitude');
  });

  it('and still reads the conditions that are genuinely open', () => {
    /* The Great Hunger turns a Thrall into a Ravenous, on either statline. */
    const hungry = names(visibleAbilities(unit('Winged Thrall'), {
      dataset, variant: variant('The Great Hunger'), rosterSelections: [],
    }));
    expect(hungry).toContain('Gluttonous Horde');
    expect(hungry).not.toContain('Overwhelming Horde');
  });
});

/* ------------------------------------------------------------------ N ---- */

describe('N — a second statline can be fielded', () => {
  it('is offered as an option on the model it belongs to', () => {
    const thrall = unit('Thrall');
    expect(statlineOptionsOf(thrall).map((o) => o.name)).toEqual(['Winged']);

    const dog = unit('Trench Dog', 'New Antioch');
    expect(statlineOptionsOf(dog).map((o) => o.name).sort())
      .toEqual(['Attack Dog', 'Guard Dog', 'Mercy Dog']);
  });

  it('priced as the catalogue prices the swap', () => {
    const dog = unit('Trench Dog', 'New Antioch');
    for (const o of statlineOptionsOf(dog)) expect(o.cost.ducats).toBe(5);

    const merc = unit('Trench Dog', 'Mercenaries');
    for (const o of statlineOptionsOf(merc)) expect(o.cost.glory).toBe(1);

    /* Winged costs nothing: the book prints one entry at one cost. */
    expect(statlineOptionsOf(unit('Thrall'))[0].cost)
      .toEqual({ ducats: 0, glory: 0 });
  });

  it('swaps the statline in when the model carries it', () => {
    const thrall = unit('Thrall');
    const carrying = model({
      specialUpgrades: [{ id: 'o', name: 'Winged', cost: 0, category: 'Thrall Type' }],
    });
    const swapped = swappedProfile(dataset, thrall, modelSelections(carrying));
    expect(swapped?.name).toBe('Winged Thrall');
    expect(swapped?.stats.movementType).toBe('Flying');
    expect(unit('Thrall').stats.movementType).toBe('Infantry');
  });

  it('and leaves a model that has taken none on its own statline', () => {
    expect(swappedProfile(dataset, unit('Thrall'), [])).toBeNull();
  });

  it('swaps a New Antioch Guard Dog in the same way', () => {
    const dog = unit('Trench Dog', 'New Antioch');
    const carrying = model({
      specialUpgrades: [{ id: 'o', name: 'Guard Dog', cost: 5, category: 'Specialization' }],
    });
    const swapped = swappedProfile(dataset, dog, modelSelections(carrying));
    expect(swapped?.name).toBe('Guard Dog');
    expect(swapped?.secondaryProfile).toBe(true);
    expect(swapped?.parentEntryId).toBe(dog.entryId);
  });

  /* And none of them is back on the recruit list. */
  it('without putting any of them back on the recruit list', () => {
    const offered = names(recruitable(dataset, 'new-antioch', APP).units);
    expect(offered).toContain('Trench Dog');
    expect(offered).not.toContain('Guard Dog');
  });
});

/* -------------------------------------------------------------- the shelf - */

describe('the shelf still behaves', () => {
  const rows = (id: string): ArmouryRow[] => armoury(id).rows;

  it('shows no Glory Items before a discovery and the Armoury’s own after', () => {
    const shut = gloryItemPermission(dataset, []);
    const offers = recruitable(dataset, 'new-antioch', APP, undefined, shut);
    const all = [...offers.weapons, ...offers.armour, ...offers.equipment];
    expect(all.filter((x) => x.gloryItem)).toEqual([]);
    expect(names(all)).toContain('Troop Flag');
    expect(rows('new-antioch').filter(isGloryItem).length).toBeGreaterThan(0);
  });
});
