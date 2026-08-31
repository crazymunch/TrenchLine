import { XMLParser } from 'fast-xml-parser';
import { Warband, ActiveUnit, EquippedWeapon, EquippedArmour, EquippedEquipment, StashedItem } from '../types/warband';
import { UnitProfile } from '../types/rules';
import { enrichUnitWithLore, SULTANATE_WARBAND_LORE } from '../data/warbandLore';

/**
 * Import a NewRecruit / BattleScribe roster.
 *
 * `knownUnits` is now passed in rather than read from `defaultRules.ts`. That
 * matters: an import resolves each roster line against this list, so importing
 * against the hand-written profiles gave every imported model a statline the
 * audit measured as 97% wrong — silently, because the names matched.
 *
 * The caller passes the store's `units`, which the dataset fills.
 */
export function importNewRecruitRoster(
  rawInput: string,
  knownUnits: UnitProfile[] = []
): Warband {
  const trimmed = rawInput.trim();
  const allUnits = knownUnits;

  // 1. Try parsing as JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const data = JSON.parse(trimmed);
      return parseNewRecruitJson(data, allUnits);
    } catch (e) {
      console.warn('Failed JSON parse, trying XML/Text fallback:', e);
    }
  }

  // 2. Try parsing as XML (.ros / BattleScribe / NewRecruit XML)
  if (trimmed.startsWith('<')) {
    try {
      return parseNewRecruitXml(trimmed, allUnits);
    } catch (e) {
      console.warn('Failed XML parse, trying Text fallback:', e);
    }
  }

  // 3. Fallback: Parse Plaintext Roster
  return parseNewRecruitText(trimmed, allUnits);
}

function parseNewRecruitJson(data: any, allUnits: UnitProfile[]): Warband {
  const rosterData = data.roster || data;
  const force = rosterData.forces?.[0] || rosterData;
  const warbandName = force.customName || rosterData.customName || rosterData.name || 'Imported Warband';

  // Faction detection
  let factionId = 'new-antioch';
  const factionSearchStr = `${rosterData.name || ''} ${force.catalogueName || ''} ${force.name || ''} ${rosterData.gameSystemName || ''}`.toLowerCase();
  
  if (factionSearchStr.includes('sultan')) factionId = 'iron-sultanate';
  else if (factionSearchStr.includes('pilgrim')) factionId = 'trench-pilgrims';
  else if (factionSearchStr.includes('heretic')) factionId = 'heretic-legions';
  else if (factionSearchStr.includes('grail')) factionId = 'black-grail';
  else if (factionSearchStr.includes('court') || factionSearchStr.includes('serpent') || factionSearchStr.includes('hell')) factionId = 'court-seven-serpents';

  const ducatsLimit = rosterData.costLimits?.find((c: any) => c.name === 'Ducats')?.value || 
                      rosterData.costs?.find((c: any) => c.name === 'Ducats')?.value || 700;
  const gloryPoints = rosterData.costs?.find((c: any) => c.name === 'Glory Points')?.value || 0;

  const rawSelections = force.selections || rosterData.selections || [];
  const units: ActiveUnit[] = [];
  const armoryStash: StashedItem[] = [];

  rawSelections.forEach((sel: any, idx: number) => {
    const isConfig = (sel.categories || []).some((c: any) => c.name === 'Configuration');
    const isPileOfStuff = sel.name === 'Pile of Stuff' || sel.customName === 'Pile of Stuff';

    // Parse unassigned storage items into Armory Stash
    if (isPileOfStuff) {
      (sel.selections || []).forEach((stashSel: any) => {
        const wepProf = stashSel.profiles?.find((p: any) => p.typeName === 'Weapon');
        const cost = stashSel.costs?.find((c: any) => c.name === 'Ducats')?.value || 0;
        const group = stashSel.group || '';

        if (wepProf || group.includes('Weapons')) {
          armoryStash.push({
            id: `stash-${Date.now()}-${Math.random()}`,
            name: stashSel.name,
            type: 'Weapon',
            cost,
            quantity: stashSel.number || 1
          });
        } else if (group.includes('Armour') || group.includes('Shield')) {
          armoryStash.push({
            id: `stash-${Date.now()}-${Math.random()}`,
            name: stashSel.name,
            type: 'Armour',
            cost,
            quantity: stashSel.number || 1
          });
        } else if (group.includes('Equipment')) {
          armoryStash.push({
            id: `stash-${Date.now()}-${Math.random()}`,
            name: stashSel.name,
            type: 'Equipment',
            cost,
            quantity: stashSel.number || 1
          });
        }
      });
      return;
    }

    // Skip Configuration nodes (Campaign Rules, Warband Variant, Patron Selection, etc.)
    if (isConfig && !sel.profiles?.some((p: any) => p.typeName === 'Unit')) {
      return;
    }

    // Only process real models / units
    const isModelType = sel.type === 'model' || sel.type === 'unit' || sel.profiles?.some((p: any) => p.typeName === 'Unit');
    if (!isModelType) {
      return;
    }

    // Extract Unit Characteristic Profile
    const unitProfile = sel.profiles?.find((p: any) => p.typeName === 'Unit');
    const charMap: Record<string, string> = {};
    if (unitProfile?.characteristics) {
      unitProfile.characteristics.forEach((c: any) => {
        charMap[c.name] = c.$text || c.name || '';
      });
    }

    // Determine category (Leader, Elite, Trooper, Mercenary)
    let category: 'Leader' | 'Elite' | 'Trooper' | 'Mercenary' = 'Trooper';
    const catNames = (sel.categories || []).map((c: any) => c.name);
    
    if (catNames.includes('Leader') || sel.name.toLowerCase().includes('leader') || sel.name.toLowerCase().includes('lieutenant') || sel.name.toLowerCase().includes('prophet') || sel.name.toLowerCase().includes('alchemist')) {
      category = catNames.includes('Elite') && !catNames.includes('Leader') ? 'Elite' : 'Leader';
    }
    if (catNames.includes('Elite') || sel.name.toLowerCase().startsWith('favoured')) {
      category = 'Elite';
    } else if (catNames.includes('Mercenary') || sel.name.toLowerCase().includes('mamluk') || sel.name.toLowerCase().includes('sin eater') || sel.name.toLowerCase().includes('trench dog')) {
      category = 'Mercenary';
    } else if (catNames.includes('Troop') || catNames.includes('Trooper')) {
      category = 'Trooper';
    }

    // Extract gear, skills, injuries, xp
    const equippedWeapons: EquippedWeapon[] = [];
    const equippedArmour: EquippedArmour[] = [];
    const equippedEquipment: EquippedEquipment[] = [];
    const advancements: string[] = [];
    const injuries: string[] = [];
    let xp = 0;

    function parseSubSelections(subList: any[]) {
      if (!Array.isArray(subList)) return;

      subList.forEach((sub) => {
        const subName = sub.name || '';
        const subGroup = sub.group || '';

        // Experience counter
        if (subName === 'Experience') {
          xp += (sub.number || 1);
          return;
        }

        // Skills / Advancements / Injuries
        if (subGroup.includes('Skills') || subGroup.includes('Advancement') || subName === 'Elite Promotion' || subGroup.includes('Upgrades')) {
          if (subGroup.includes('Injuries')) {
            injuries.push(subName);
          } else {
            advancements.push(subName);
          }
          return;
        }

        // Weapon profiles
        const wepProf = sub.profiles?.find((p: any) => p.typeName === 'Weapon');
        if (wepProf || subGroup.includes('Weapons')) {
          const wChars: Record<string, string> = {};
          (wepProf?.characteristics || []).forEach((c: any) => { wChars[c.name] = c.$text || ''; });
          
          const rawType = wChars['Type'] || '';
          const is2Handed = rawType.toLowerCase().includes('2') || rawType.toLowerCase().includes('two');
          const isMelee = rawType.toLowerCase().includes('melee') || (wChars['Range'] || '').toLowerCase().includes('melee');

          equippedWeapons.push({
            id: `w-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: wepProf?.name || subName,
            type: isMelee ? 'Melee' : 'Ranged',
            hands: is2Handed ? 2 : 1,
            range: wChars['Range'] || (isMelee ? 'Melee (1")' : '12"'),
            modifiers: wChars['Keywords']?.includes('DICE') ? wChars['Keywords'] : '+0 DICE',
            damage: 'Standard',
            keywords: wChars['Keywords'] ? wChars['Keywords'].split(',').map((k: string) => k.trim()) : [],
            cost: sub.costs?.find((c: any) => c.name === 'Ducats')?.value || 0,
            instanceId: `w-inst-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
          });
          return;
        }

        // Armour / Shield profiles
        const bKitProf = sub.profiles?.find((p: any) => p.typeName === 'Battlekit');
        if (subGroup.includes('Armour') || subGroup.includes('Shields') || bKitProf?.name.toLowerCase().includes('armour') || bKitProf?.name.toLowerCase().includes('shield')) {
          const bChars: Record<string, string> = {};
          (bKitProf?.characteristics || []).forEach((c: any) => { bChars[c.name] = c.$text || ''; });

          equippedArmour.push({
            id: `a-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: bKitProf?.name || subName,
            armourModifier: bChars['Keywords']?.includes('INJURY MODIFIER') ? bChars['Keywords'] : '-1 Injury Modifier',
            cost: sub.costs?.find((c: any) => c.name === 'Ducats')?.value || 0,
            keywords: bChars['Keywords'] ? bChars['Keywords'].split(',').map((k: string) => k.trim()) : [],
            instanceId: `a-inst-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
          });
          return;
        }

        // Equipment / Battlekit items / Alchemical Formulae
        if (subGroup.includes('Equipment') || subGroup.includes('Alchemical Formulae') || bKitProf) {
          const bChars: Record<string, string> = {};
          (bKitProf?.characteristics || []).forEach((c: any) => { bChars[c.name] = c.$text || ''; });

          equippedEquipment.push({
            id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: bKitProf?.name || subName,
            cost: sub.costs?.find((c: any) => c.name === 'Ducats')?.value || 0,
            effect: bChars['Rules'] || '',
            keywords: bChars['Keywords'] ? bChars['Keywords'].split(',').map((k: string) => k.trim()) : [],
            instanceId: `e-inst-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
          });
        }

        // Recurse into nested sub-selections
        if (sub.selections) {
          parseSubSelections(sub.selections);
        }
      });
    }

    parseSubSelections(sel.selections);

    // Compute total cost recursively
    function getSelectionCost(item: any): number {
      let sum = 0;
      if (Array.isArray(item.costs)) {
        const dCost = item.costs.find((c: any) => c.name === 'Ducats');
        if (dCost && typeof dCost.value === 'number') sum += dCost.value;
      }
      if (Array.isArray(item.selections)) {
        item.selections.forEach((sub: any) => { sum += getSelectionCost(sub); });
      }
      return sum;
    }

    const totalUnitCost = getSelectionCost(sel);

    const isTough = catNames.includes('Tough') || 
                    unitProfile?.characteristics?.some((c: any) => c.$text?.toLowerCase().includes('tough')) ||
                    advancements.some(a => a.toLowerCase().includes('tough'));
    const maxHp = isTough ? 2 : 1;

    // Find or create profile snapshot
    const matchedProfile = allUnits.find(
      (p) => p.name.toLowerCase() === sel.name.toLowerCase() || sel.name.toLowerCase().includes(p.name.toLowerCase())
    );

    const baseProfileName = unitProfile?.name || sel.name;
    const baseProfileId = (matchedProfile?.id || baseProfileName.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

    units.push({
      id: `u-imp-${Date.now()}-${idx}`,
      customName: sel.customName || sel.name,
      baseProfileId,
      profileSnapshot: {
        id: baseProfileId,
        name: baseProfileName,
        factionId,
        category,
        baseCost: totalUnitCost,
        stats: {
          movement: charMap['Movement'] || matchedProfile?.stats.movement || '6"',
          ranged: charMap['Ranged'] || matchedProfile?.stats.ranged || '+0 DICE',
          melee: charMap['Melee'] || matchedProfile?.stats.melee || '+0 DICE',
          armour: charMap['Armour'] || matchedProfile?.stats.armour || '-1',
          keywords: catNames
        },
        innateAbilities: (sel.profiles || []).filter((p: any) => p.typeName === 'Ability').map((a: any) => ({
          id: a.id || a.name,
          name: a.name,
          description: a.characteristics?.find((c: any) => c.name === 'Description')?.$text || ''
        }))
      },
      equippedWeapons,
      equippedArmour,
      equippedEquipment,
      xp,
      advancements,
      injuries,
      isDead: false,
      totalCost: totalUnitCost,
      currentWounds: maxHp,
      maxWounds: maxHp,
      bloodMarkers: 0,
      status: 'Active',
      hasActedThisTurn: false
    });
  });

  const enrichedUnits = units.map(enrichUnitWithLore);

  const isSultanate = factionId === 'iron-sultanate' || warbandName.toLowerCase().includes('qarn') || warbandName.toLowerCase().includes('sultanate');

  return {
    id: `wb-${Date.now()}`,
    name: warbandName,
    factionId,
    ducatLimit: ducatsLimit,
    treasuryDucats: 0,
    gloryPoints,
    units: enrichedUnits,
    armoryStash,
    lore: isSultanate ? SULTANATE_WARBAND_LORE.lore : undefined,
    motto: isSultanate ? SULTANATE_WARBAND_LORE.motto : undefined,
    patron: isSultanate ? SULTANATE_WARBAND_LORE.patron : undefined,
    chronicleLog: isSultanate ? SULTANATE_WARBAND_LORE.chronicleLog : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function parseNewRecruitXml(xmlContent: string, allUnits: UnitProfile[]): Warband {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['selection', 'profile', 'cost', 'characteristic'].includes(name)
  });

  const parsed = parser.parse(xmlContent);
  const roster = parsed.roster || parsed.gameSystem || parsed;
  const name = roster['@_name'] || 'Imported Roster XML';

  const factionId = 'new-antioch';
  const units: ActiveUnit[] = [];

  const selections = roster.forces?.force?.selections?.selection || roster.selections?.selection || [];

  selections.forEach((sel: any, idx: number) => {
    const selName = sel['@_name'] || `Unit ${idx + 1}`;
    if (selName === 'Campaign Rules' || selName === 'Warband Variant') return;

    const matchedProfile = allUnits.find(
      (p) => p.name.toLowerCase() === selName.toLowerCase() || selName.toLowerCase().includes(p.name.toLowerCase())
    ) || {
      id: `custom-unit-${Date.now()}-${idx}`,
      name: selName,
      factionId,
      category: 'Trooper' as const,
      baseCost: 35,
      stats: { movement: '6"', ranged: '+0 DICE', melee: '+1 DICE', armour: '-1', keywords: [] },
      innateAbilities: []
    };

    units.push({
      id: `u-xml-${Date.now()}-${idx}`,
      customName: sel['@_customName'] || selName,
      baseProfileId: matchedProfile.id,
      profileSnapshot: matchedProfile,
      equippedWeapons: [],
      equippedArmour: [],
      equippedEquipment: [],
      xp: 0,
      advancements: [],
      injuries: [],
      isDead: false,
      totalCost: matchedProfile.baseCost,
      currentWounds: 1,
      maxWounds: 1,
      bloodMarkers: 0,
      status: 'Active',
      hasActedThisTurn: false
    });
  });

  return {
    id: `wb-${Date.now()}`,
    name,
    factionId,
    ducatLimit: 700,
    treasuryDucats: 0,
    gloryPoints: 0,
    units,
    armoryStash: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function parseNewRecruitText(text: string, allUnits: UnitProfile[]): Warband {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let name = 'Imported Plaintext Warband';
  let factionId = 'new-antioch';
  const units: ActiveUnit[] = [];

  lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    if (lower.startsWith('warband:') || lower.startsWith('name:')) {
      name = line.split(':')[1]?.trim() || name;
    } else if (lower.includes('pilgrim')) {
      factionId = 'trench-pilgrims';
    } else if (lower.includes('sultan')) {
      factionId = 'iron-sultanate';
    } else if (lower.includes('heretic')) {
      factionId = 'heretic-legions';
    }

    allUnits.forEach((profile) => {
      if (lower.includes(profile.name.toLowerCase())) {
        units.push({
          id: `u-txt-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 3)}`,
          customName: profile.name,
          baseProfileId: profile.id,
          profileSnapshot: profile,
          equippedWeapons: [],
          equippedArmour: [],
          equippedEquipment: [],
          xp: 0,
          advancements: [],
          injuries: [],
          isDead: false,
          totalCost: profile.baseCost,
          currentWounds: 1,
          maxWounds: 1,
          bloodMarkers: 0,
          status: 'Active',
          hasActedThisTurn: false
        });
      }
    });
  });

  return {
    id: `wb-${Date.now()}`,
    name,
    factionId,
    ducatLimit: 700,
    treasuryDucats: 0,
    gloryPoints: 0,
    units,
    armoryStash: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
