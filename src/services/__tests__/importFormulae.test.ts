/**
 * What an import does with a model's Alchemical Formulae, and with its
 * children at all.
 *
 * Two failures, both reported by the app's owner looking at his own
 * Homunculus: the Formulae were "attached as some kind of wargear", and a
 * `.ros` import produced models carrying nothing whatsoever.
 */
import { describe, it, expect } from 'vitest';
import { importNewRecruitRoster } from '../newRecruitImporter';
import type { UnitProfile } from '../../types/rules';

const KNOWN: UnitProfile[] = [{
  id: 'u-homunculus', name: 'Takwin Homunculus', factionId: 'iron-sultanate',
  category: 'Elite', baseCost: 100,
  stats: { movement: '6"', ranged: '+0 DICE', melee: '+1 DICE', armour: '0', keywords: [] },
  innateAbilities: [],
} as UnitProfile];

/** A `.ros` as BattleScribe writes one: no group NAMES, only profiles. */
const ROS = `<roster name="Al-Qarn Rihla"><forces><force name="F" catalogueName="Iron Sultanate"><selections>
  <selection name="Takwin Homunculus" type="model" customName="Al-Masyukh">
    <costs><cost name="Ducats" value="100"/></costs>
    <selections>
      <selection name="Human Hands" type="upgrade">
        <costs><cost name="Ducats" value="10"/></costs>
        <profiles><profile name="Human Hands" typeName="Ability">
          <characteristics><characteristic name="Description">Iron Sultanate weapons.</characteristic></characteristics>
        </profile></profiles>
      </selection>
      <selection name="Additional Arm" type="upgrade">
        <costs><cost name="Ducats" value="15"/></costs>
        <profiles><profile name="Additional Arm" typeName="Ability">
          <characteristics><characteristic name="Description">CLEAVE 2.</characteristic></characteristics>
        </profile></profiles>
      </selection>
      <selection name="Sword/Axe" type="upgrade">
        <costs><cost name="Ducats" value="5"/></costs>
        <profiles><profile name="Sword/Axe" typeName="Weapon">
          <characteristics>
            <characteristic name="Type">1-Handed Melee</characteristic>
            <characteristic name="Range">Melee</characteristic>
          </characteristics>
        </profile></profiles>
      </selection>
      <selection name="Experience" type="upgrade" number="3"/>
    </selections>
  </selection>
</selections></force></forces></roster>`;

/** New Recruit's JSON, which does state the group. */
const NR_JSON = JSON.stringify({
  roster: { name: 'Al-Qarn Rihla', forces: [{ catalogueName: 'Iron Sultanate', selections: [
    { name: 'Takwin Homunculus', type: 'model', customName: 'Al-Masyukh',
      costs: [{ name: 'Ducats', value: 100 }],
      selections: [
        { name: 'Human Hands', group: 'Alchemical Formulae', costs: [{ name: 'Ducats', value: 10 }] },
        { name: 'Gargantuan Size', group: 'Alchemical Formulae', costs: [{ name: 'Ducats', value: 20 }] },
      ] },
  ] }] },
});

describe('importing a model’s Alchemical Formulae', () => {
  it('files them as upgrades, not as things the model is carrying', () => {
    /*
      They used to land in `equippedEquipment`, so an imported Homunculus wore
      `Human Hands` in its gear list beside its sword. The app's own purchase
      path writes to `specialUpgrades`; an import that writes somewhere else
      makes two shapes for one thing.
    */
    const { warband } = importNewRecruitRoster(NR_JSON, KNOWN);
    const u = warband.units[0];

    expect(u.specialUpgrades?.map((s) => s.name).sort())
      .toEqual(['Gargantuan Size', 'Human Hands']);
    expect(u.equippedEquipment?.map((e) => e.name)).not.toContain('Human Hands');
    expect(u.equippedWeapons?.map((w) => w.name)).not.toContain('Human Hands');
  });

  it('keeps the catalogue’s own group name where the export states one', () => {
    const { warband } = importNewRecruitRoster(NR_JSON, KNOWN);
    for (const up of warband.units[0].specialUpgrades ?? []) {
      expect(up.category).toBe('Alchemical Formulae');
    }
  });
});

describe('importing a BattleScribe .ros', () => {
  it('reads a model’s children at all — it used to read none', () => {
    /*
      The XML path built each unit inline and never looked at a selection's
      sub-selections. Every `.ros` import produced the base profile and
      nothing else: no weapons, no Formulae, no XP, and it reported success.
    */
    const { warband, unmatched } = importNewRecruitRoster(ROS, KNOWN);

    expect(unmatched).toEqual([]);
    const u = warband.units[0];
    expect(u.equippedWeapons?.map((w) => w.name)).toEqual(['Sword/Axe']);
    expect(u.xp).toBe(3);
  });

  it('recognises a Formula with no group name, by the profile it carries', () => {
    /*
      A `.ros` carries `entryGroupId` — a GUID with no name behind it in the
      roster file — so there is no group to read. An Ability profile with no
      Weapon or Battlekit profile is something the model IS, not something it
      holds, and that is structural.
    */
    const { warband } = importNewRecruitRoster(ROS, KNOWN);
    const u = warband.units[0];

    expect(u.specialUpgrades?.map((s) => s.name).sort())
      .toEqual(['Additional Arm', 'Human Hands']);
    expect(u.equippedWeapons?.map((w) => w.name)).not.toContain('Human Hands');
  });

  it('keeps the roster’s own name and the model’s custom name', () => {
    const { warband } = importNewRecruitRoster(ROS, KNOWN);
    expect(warband.name).toBe('Al-Qarn Rihla');
    expect(warband.units[0].customName).toBe('Al-Masyukh');
  });

  it('costs the model from the roster, not from the profile’s base cost', () => {
    // 100 + 10 + 15 + 5, summed over the tree the walker never descended.
    const { warband } = importNewRecruitRoster(ROS, KNOWN);
    expect(warband.units[0].totalCost).toBe(130);
  });
});
