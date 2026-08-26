import { XMLParser } from 'fast-xml-parser';
import { Warband, ActiveUnit, EquippedWeapon, EquippedArmour, EquippedEquipment } from '../types/warband';
import { UnitProfile, WeaponProfile, ArmourProfile } from '../types/rules';
import { BASE_UNITS, BASE_WEAPONS, BASE_ARMOUR, BASE_EQUIPMENT } from '../data/defaultRules';

export function importNewRecruitRoster(rawInput: string, customUnits: UnitProfile[] = []): Warband {
  const trimmed = rawInput.trim();
  const allUnits = [...BASE_UNITS, ...customUnits];

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
  const name = rosterData.name || rosterData.customName || 'Imported NewRecruit Warband';
  
  // Detect faction
  let factionId = 'new-antioch';
  const factionStr = (rosterData.faction || rosterData.forces?.[0]?.name || rosterData.system || '').toLowerCase();
  if (factionStr.includes('pilgrim')) factionId = 'trench-pilgrims';
  else if (factionStr.includes('sultan')) factionId = 'iron-sultanate';
  else if (factionStr.includes('heretic')) factionId = 'heretic-legion';
  else if (factionStr.includes('grail')) factionId = 'black-grail';
  else if (factionStr.includes('serpent') || factionStr.includes('hell')) factionId = 'court-seven-serpents';

  const ducatLimit = rosterData.pointsLimit || rosterData.costLimit || 700;
  const units: ActiveUnit[] = [];

  // Parse units from forces / selections
  const rawUnits = rosterData.units || rosterData.selections || rosterData.forces?.[0]?.selections || [];

  rawUnits.forEach((uItem: any, idx: number) => {
    const uName = uItem.name || uItem.customName || `Warrior ${idx + 1}`;
    
    // Find matching base unit or create a fallback profile
    const matchedProfile = allUnits.find(
      (p) => p.name.toLowerCase() === uName.toLowerCase() || uName.toLowerCase().includes(p.name.toLowerCase())
    ) || {
      id: `custom-unit-${Date.now()}-${idx}`,
      name: uName,
      factionId,
      category: (uItem.category || uItem.role || 'Trooper') as any,
      baseCost: uItem.cost || uItem.points || 35,
      stats: {
        movement: uItem.stats?.movement || '6"',
        ranged: uItem.stats?.ranged || '+0',
        melee: uItem.stats?.melee || '+1',
        armour: uItem.stats?.armour || '+1',
        keywords: []
      },
      innateAbilities: []
    };

    // Extract weapons / items
    const equippedWeapons: EquippedWeapon[] = [];
    const equippedArmour: EquippedArmour[] = [];

    const rawGear = uItem.weapons || uItem.equipment || uItem.selections || [];
    rawGear.forEach((g: any, gIdx: number) => {
      const gName = typeof g === 'string' ? g : g.name || '';
      const matchedWep = BASE_WEAPONS.find(w => w.name.toLowerCase().includes(gName.toLowerCase()));
      if (matchedWep) {
        equippedWeapons.push({ ...matchedWep, instanceId: `w-imp-${Date.now()}-${idx}-${gIdx}` });
      }
    });

    const isTough = matchedProfile.stats.keywords.some(k => k.toLowerCase().includes('tough'));
    const maxHp = isTough ? 2 : 1;

    units.push({
      id: `u-imp-${Date.now()}-${idx}`,
      customName: uItem.customName || uName,
      baseProfileId: matchedProfile.id,
      profileSnapshot: matchedProfile,
      equippedWeapons,
      equippedArmour,
      equippedEquipment: [],
      xp: uItem.xp || 0,
      advancements: uItem.advancements || [],
      injuries: uItem.injuries || [],
      isDead: false,
      totalCost: uItem.totalCost || matchedProfile.baseCost + equippedWeapons.reduce((s, w) => s + w.cost, 0),
      currentWounds: maxHp,
      maxWounds: maxHp,
      bloodMarkers: 0,
      status: 'Active',
      hasActedThisTurn: false
    });
  });

  return {
    id: `wb-${Date.now()}`,
    name,
    factionId,
    ducatLimit,
    treasuryDucats: rosterData.treasury || 0,
    gloryPoints: rosterData.glory || 0,
    units,
    armoryStash: [],
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

  let factionId = 'new-antioch';
  const units: ActiveUnit[] = [];

  const selections = roster.forces?.force?.selections?.selection || roster.selections?.selection || [];

  selections.forEach((sel: any, idx: number) => {
    const selName = sel['@_name'] || `Unit ${idx + 1}`;
    
    // Find matching profile
    const matchedProfile = allUnits.find(
      (p) => p.name.toLowerCase() === selName.toLowerCase() || selName.toLowerCase().includes(p.name.toLowerCase())
    ) || {
      id: `custom-unit-${Date.now()}-${idx}`,
      name: selName,
      factionId,
      category: 'Trooper' as const,
      baseCost: 35,
      stats: { movement: '6"', ranged: '+0', melee: '+1', armour: '+1', keywords: [] },
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

  // Look for header e.g. "Warband: 3rd Trench Guard" or "++ Principality of New Antioch ++"
  lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    if (lower.startsWith('warband:') || lower.startsWith('name:')) {
      name = line.split(':')[1]?.trim() || name;
    } else if (lower.includes('pilgrim')) {
      factionId = 'trench-pilgrims';
    } else if (lower.includes('sultan')) {
      factionId = 'iron-sultanate';
    } else if (lower.includes('heretic')) {
      factionId = 'heretic-legion';
    }

    // Match lines starting with bullet, number, or unit names
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
