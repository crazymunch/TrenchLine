/**
 * Abilities a Variant reveals, and a second Unit profile (DA-01 and DA-02,
 * FD-08).
 *
 * **DA-01.** The catalogues mark an Ability profile `hidden="true"` when a
 * Variant owns it and reveal it with a `set hidden=false` modifier naming that
 * Variant. The parser read the profile and not the attribute, so
 * `recruitable()` copied all of them into `innateAbilities` and a standard New
 * Antioch Shocktrooper's card printed four Varangian Guard rules it does not
 * have.
 *
 * **DA-02.** The `Grail Thrall` entry holds two Unit profiles in two
 * sub-entries, and the parser emitted both as units — so a 0-Ducat `Winged
 * Thrall` with no keywords and no abilities was on the recruit list beside the
 * 25-Ducat Thrall.
 *
 * Everything here reads `DATASET`. No statline, no ability text and no cost is
 * typed into this file.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import { FACTIONS } from '@/data/defaultRules';
import type { Dataset } from '@/types/catalogue';
import {
  visibleAbilities, labelledAbilities, unknownVisibilityLeaves, modelSelections,
} from '../applyVariant';
import { recruitable } from '../recruitable';

const dataset = DATASET as unknown as Dataset;
const APP_FACTIONS = FACTIONS.map((f) => f.id);

const unit = (name: string, faction?: string) => dataset.units.find(
  (u) => u.name === name && (!faction || u.factionId === faction))!;
const variant = (name: string) => (dataset.variants ?? []).find((v) => v.name === name);
const names = (list: { name: string }[]) => list.map((a) => a.name);

describe('the catalogue says which abilities are hidden', () => {
  it('records the profile attribute the parser used to ignore', () => {
    const sh = unit('Shocktrooper');
    expect(names(sh.abilities.filter((a) => a.hidden))).toEqual([
      'Axe Mastery', 'Shield Bash', 'Indomitable', 'Weapon Familiarity',
    ]);
  });

  /*
    And the reveals survive the modifier dedup. Four identical "reveal when
    Remnants of Byzantium" rules on four profiles used to collapse to one,
    because the dedup discarded the origin — so three of the four abilities had
    nothing left that could ever reveal them.
  */
  it('keeps one reveal per hidden ability rather than collapsing four into one', () => {
    const sh = unit('Shocktrooper');
    const reveals = (sh.modifiers ?? []).filter(
      (m) => m.field === 'hidden' && String(m.value) === 'false');
    expect(reveals.map((m) => m.origin).sort()).toEqual([
      'profile:Axe Mastery', 'profile:Indomitable',
      'profile:Shield Bash', 'profile:Weapon Familiarity',
    ]);
  });

  /*
    The Stalker is the case the entry-versus-profile collapse got wrong: its
    entry carries a reveal that unlocks the MODEL, and four of its abilities
    carry the identical rule about themselves. Discarding the origin made those
    the same statement.
  */
  it('keeps an entry reveal and a profile reveal apart when they read alike', () => {
    const st = unit('Stalker');
    const hidden = (st.modifiers ?? []).filter((m) => m.field === 'hidden');
    expect(hidden.some((m) => m.origin === 'entry')).toBe(true);
    expect(hidden.filter((m) => m.origin?.startsWith('profile:'))).toHaveLength(4);
  });
});

describe('the Shocktrooper, which is the shape', () => {
  const sh = unit('Shocktrooper');
  const byz = variant('Remnants of Byzantium');

  it('prints Shock Charge and Assault Drill with no Variant, and nothing else', () => {
    expect(names(visibleAbilities(sh, { dataset })))
      .toEqual(['Shock Charge', 'Assault Drill']);
  });

  it('gains the four Varangian Guard rules under the Remnants of Byzantium', () => {
    const shown = names(visibleAbilities(sh, { dataset, variant: byz }));
    expect(shown).toContain('Axe Mastery');
    expect(shown).toContain('Shield Bash');
    expect(shown).toContain('Indomitable');
    expect(shown).toContain('Weapon Familiarity');
  });

  /*
    A reveal runs both ways. Assault Drill is printed on the entry and the
    catalogue REMOVES it under the Remnants of Byzantium and under the
    Stoßtruppen — `set hidden=true`, the mirror of the four above. An engine
    that only revealed would leave a Varangian Guard holding a rule the
    catalogue takes off it.
  */
  it('loses Assault Drill under the Variants that take it away', () => {
    expect(names(visibleAbilities(sh, { dataset, variant: byz })))
      .not.toContain('Assault Drill');
  });

  /*
    And a reveal can turn on the model's own loadout, not only its Variant.
    Weapon Familiarity: "They lose Shock Charge if they equip a shield together
    with a two-handed axe." The catalogue states it as `set hidden=true` on
    Shock Charge, conditioned on the Variant AND a Shield AND a two-handed axe.

    FD-08 describes this case the other way round — Shock Charge APPEARING when
    the Shields are carried. The catalogue and the Varangian Guard's own printed
    rule agree against the design, so the catalogue is what is implemented.
  */
  it('loses Shock Charge with a shield and a two-handed axe, as its own rule says', () => {
    const armed = visibleAbilities(sh, {
      dataset, variant: byz, selections: ['Shields', 'Dane Axe'],
    });
    expect(names(armed)).not.toContain('Shock Charge');
    /* And keeps it with the shield alone — all three conditions are required. */
    expect(names(visibleAbilities(sh, { dataset, variant: byz, selections: ['Shields'] })))
      .toContain('Shock Charge');
  });
});

describe('a reveal that is not a Variant', () => {
  const saint = unit('Desecrated Saint');

  /*
    The Desecrated Saint's seven Auras are revealed by the Court's **Chosen
    Sin** — a roster-level selectionEntryGroup, not a Variant. FD-08 expected
    every roster-scoped reveal to name a Variant; eleven do not.
  */
  it('keeps the Court’s seven Auras off a Warband that has chosen no Sin', () => {
    const shown = names(visibleAbilities(saint, { dataset, rosterSelections: [] }));
    expect(shown.filter((n) => /^Aura of/.test(n))).toEqual([]);
    expect(saint.abilities.filter((a) => /^Aura of/.test(a.name)).length).toBeGreaterThan(5);
  });

  it('shows the one the Sin names once the Warband has chosen it', () => {
    const shown = names(visibleAbilities(saint, { dataset, rosterSelections: ['Envy'] }));
    expect(shown).toContain('Aura of Envy');
    expect(shown).not.toContain('Aura of Wrath');
  });

  /*
    Rule 2. A caller that cannot say what the Warband has chosen gets the
    ability left exactly as the catalogue printed it, rather than a guess in
    either direction.
  */
  it('leaves the modifier unapplied when the caller cannot say', () => {
    const shown = names(visibleAbilities(saint, { dataset }));
    expect(shown.filter((n) => /^Aura of/.test(n))).toEqual([]);
  });
});

describe('a modifier naming an ability the entry does not carry', () => {
  /*
    The Hound of the Black Grail has a `profile:Teeths & Claws` hidden modifier
    and no such ability profile — DA-04 records that Teeth & Claws is absent
    from every catalogue. FD-08's test case for it is therefore unreachable, and
    what matters is that the stray modifier changes nothing.
  */
  it('changes nothing', () => {
    const hound = unit('Hound of the Black Grail');
    expect(names(hound.abilities)).not.toContain('Teeths & Claws');
    expect(names(visibleAbilities(hound, { dataset, selections: ['Infected'] })))
      .toEqual(names(hound.abilities));
  });
});

describe('every reveal in the shipped catalogues', () => {
  /*
    The guard. A hidden ability whose reveal cannot be evaluated stays as the
    catalogue printed it — the safe answer, and an invisible one. Zero here
    means every condition shape in the catalogues is one this can read; a
    catalogue release that introduces a new one fails this rather than quietly
    dropping an ability for somebody mid-campaign.
  */
  it('can be decided, so none is silently left unapplied', () => {
    expect(unknownVisibilityLeaves(dataset)).toEqual([]);
  });
});

describe('the recruit list', () => {
  const list = (factionId: string, variantId?: string) =>
    recruitable(dataset, factionId, APP_FACTIONS, variantId);

  it('offers a standard Shocktrooper without the Varangian Guard’s rules', () => {
    const sh = list('new-antioch').units.find((u) => u.name === 'Shocktrooper')!;
    expect(names(sh.innateAbilities ?? [])).toEqual(['Shock Charge', 'Assault Drill']);
  });

  /* And names what the Variant would add, rather than silently dropping it. */
  it('names them under the Variant that reveals them', () => {
    const sh = list('new-antioch').units.find((u) => u.name === 'Shocktrooper')!;
    const extra = sh.variantAbilities ?? [];
    expect(names(extra)).toContain('Axe Mastery');
    expect(extra.find((a) => a.name === 'Axe Mastery')!.variantOnly)
      .toContain('Remnants of Byzantium');
  });

  it('gives them to a Warband that has taken the Variant', () => {
    const byz = variant('Remnants of Byzantium')!;
    const sh = list('new-antioch', byz.id).units
      .find((u) => /Shocktrooper|Varangian/.test(u.name))!;
    expect(names(sh.innateAbilities ?? [])).toContain('Axe Mastery');
  });

  /*
    And however the roster spells the Variant. `variantById` documented three
    spellings and accepted two: an imported roster carries BattleScribe's entry
    id, which resolved to no Variant at all — so the Warband was shown the
    faction's standard list, reveals and all.
  */
  it.each(['id', 'entryId', 'name'] as const)(
    'resolves the Variant by its %s', (field) => {
      const byz = variant('Remnants of Byzantium')!;
      const sh = list('new-antioch', byz[field] as string).units
        .find((u) => /Shocktrooper|Varangian/.test(u.name))!;
      expect(names(sh.innateAbilities ?? [])).toContain('Axe Mastery');
    });
});

describe('the Codex’s own view', () => {
  it('keeps every ability and labels the ones a Variant reveals', () => {
    const sh = unit('Shocktrooper');
    const all = labelledAbilities(sh, dataset);
    expect(all).toHaveLength(sh.abilities.length);
    expect(all.find((a) => a.name === 'Axe Mastery')!.variantOnly)
      .toEqual(['Remnants of Byzantium']);
    /* An ability the entry simply has carries no label. */
    expect(all.find((a) => a.name === 'Shock Charge')!.variantOnly).toBeUndefined();
  });

  it('labels a Sin-revealed ability with the Sin, which is what a reader needs', () => {
    const saint = unit('Desecrated Saint');
    const envy = labelledAbilities(saint, dataset).find((a) => a.name === 'Aura of Envy')!;
    expect(envy.variantOnly).toContain('Envy');
  });
});

describe('a second Unit profile under one entry (DA-02)', () => {
  it('is not a recruit', () => {
    const offered = recruitable(dataset, 'black-grail', APP_FACTIONS).units
      .map((u) => u.name);
    expect(offered).not.toContain('Winged Thrall');
    /* And the entry it belongs to still is. */
    expect(offered).toContain('Thrall');
  });

  it('keeps the Fly Thrall’s statline in the dataset, as its own profile', () => {
    const winged = unit('Winged Thrall');
    expect(winged.secondaryProfile).toBe(true);
    expect(winged.parentEntryId).toBeTruthy();
    /* The statline is the second profile's own — flying, where the Thrall walks. */
    expect(winged.stats.movementType).toBe('Flying');
    expect(unit('Thrall').stats.movementType).toBe('Infantry');
  });

  /* And it is no longer a blank card: what the sub-entry does not state is
     filled from the parent entry that does. */
  it('carries the parent entry’s cost, roles, keywords and abilities', () => {
    const winged = unit('Winged Thrall');
    expect(winged.cost.ducats).toBeGreaterThan(0);
    expect(winged.roles.length).toBeGreaterThan(0);
    expect(winged.keywords.length).toBeGreaterThan(0);
    expect(winged.abilities.length).toBeGreaterThan(0);
  });

  /*
    The same shape, found by applying the rule rather than by naming the Thrall:
    the Trench Dog's Specialization group. Page 121 — "When you give a Trench
    Dog to a model, you can give the Trench Dog one of the following special
    abilities at a Cost of +1 ☼" — so these are the dog's upgrades, and the app
    was offering each as a separate 5-Ducat model.
  */
  it('takes the Trench Dog’s specializations off the list too', () => {
    const offered = recruitable(dataset, 'new-antioch', APP_FACTIONS).units.map((u) => u.name);
    expect(offered).toContain('Trench Dog');
    expect(offered).not.toContain('Guard Dog');
    expect(offered).not.toContain('Mercy Dog');
    expect(offered).not.toContain('Attack Dog');
  });

  it('keeps a sub-entry’s own price where the catalogue states one', () => {
    /* The New Antioch dogs are +5 Ducats each; inheriting the parent's 35
       would misstate an upgrade the catalogue prices itself. */
    const guard = dataset.units.find(
      (u) => u.name === 'Guard Dog' && u.factionId === 'New Antioch')!;
    expect(guard.cost.ducats).toBe(5);
  });
});

describe('what a model carries, for a visibility question', () => {
  it('counts weapons, armour, gear, options, injuries and scars', () => {
    expect(modelSelections({
      equippedWeapons: [{ name: 'Dane Axe' }],
      equippedArmour: [{ name: 'Shields' }],
      equippedEquipment: [{ name: 'Gas Mask' }],
      specialUpgrades: [{ name: 'Inhuman Strength' }],
      injuries: ['Lost Arm [26]'],
      scars: [{ name: 'Prominent Scar' }],
    })).toEqual([
      'Dane Axe', 'Shields', 'Gas Mask', 'Inhuman Strength',
      'Lost Arm [26]', 'Prominent Scar',
    ]);
  });

  it('is empty for a model that carries nothing', () => {
    expect(modelSelections({})).toEqual([]);
    expect(modelSelections(null)).toEqual([]);
  });
});
