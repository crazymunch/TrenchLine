const fs = require('fs');

const userRoster = JSON.parse(fs.readFileSync('scratch/user_roster.json', 'utf8'));

function parseNewRecruitJson(data) {
  const rosterData = data.roster || data;
  const force = rosterData.forces?.[0] || rosterData;
  const warbandName = force.customName || rosterData.name || 'Imported Warband';

  // Faction detection
  let factionId = 'new-antioch';
  const catName = (force.catalogueName || rosterData.gameSystemName || '').toLowerCase();
  if (catName.includes('sultan')) factionId = 'iron-sultanate';
  else if (catName.includes('pilgrim')) factionId = 'trench-pilgrims';
  else if (catName.includes('heretic')) factionId = 'heretic-legions';
  else if (catName.includes('grail')) factionId = 'black-grail';
  else if (catName.includes('court') || catName.includes('serpent')) factionId = 'court-seven-serpents';

  const ducatsLimit = rosterData.costLimits?.find(c => c.name === 'Ducats')?.value || 700;
  const gloryPoints = rosterData.costs?.find(c => c.name === 'Glory Points')?.value || 0;

  const rawSelections = force.selections || [];
  const units = [];
  const armoryStash = [];

  rawSelections.forEach((sel, idx) => {
    const isConfig = sel.categories?.some(c => c.name === 'Configuration');
    const isPileOfStuff = sel.name === 'Pile of Stuff';

    if (isPileOfStuff) {
      // Parse stash items
      (sel.selections || []).forEach((stashSel) => {
        const wepProf = stashSel.profiles?.find(p => p.typeName === 'Weapon');
        const cost = stashSel.costs?.find(c => c.name === 'Ducats')?.value || 0;
        if (wepProf || stashSel.group?.includes('Weapons')) {
          armoryStash.push({
            id: `stash-${Date.now()}-${Math.random()}`,
            name: stashSel.name,
            type: 'Weapon',
            cost: cost,
            quantity: stashSel.number || 1
          });
        }
      });
      return;
    }

    if (isConfig) {
      // Skip configuration nodes like Campaign Rules or Warband Variant
      return;
    }

    // It's a real model or unit
    const unitProfile = sel.profiles?.find(p => p.typeName === 'Unit');
    const charMap = {};
    if (unitProfile?.characteristics) {
      unitProfile.characteristics.forEach(c => {
        charMap[c.name] = c.$text || c.name;
      });
    }

    // Determine category
    let category = 'Trooper';
    const catNames = (sel.categories || []).map(c => c.name);
    if (catNames.includes('Leader')) category = 'Leader';
    else if (catNames.includes('Elite')) category = 'Elite';
    else if (catNames.includes('Mercenary')) category = 'Mercenary';
    else if (catNames.includes('Troop') || catNames.includes('Trooper')) category = 'Trooper';

    // Extract weapons, armour, equipment, skills, injuries, xp
    const equippedWeapons = [];
    const equippedArmour = [];
    const equippedEquipment = [];
    const advancements = [];
    const injuries = [];
    let xp = 0;

    // Helper to recursively parse selections inside the model
    function parseSubSelections(subList) {
      if (!subList) return;
      subList.forEach(sub => {
        const subName = sub.name;
        const subGroup = sub.group || '';

        // Experience
        if (subName === 'Experience') {
          xp += (sub.number || 1);
          return;
        }

        // Skills / Advancements
        if (subGroup.includes('Skills') || subGroup.includes('Advancement') || subName === 'Elite Promotion') {
          if (subGroup.includes('Injuries')) {
            injuries.push(subName);
          } else {
            advancements.push(subName);
          }
          return;
        }

        // Check for weapon profile
        const wepProf = sub.profiles?.find(p => p.typeName === 'Weapon');
        if (wepProf || subGroup.includes('Weapons')) {
          const wChars = {};
          (wepProf?.characteristics || []).forEach(c => { wChars[c.name] = c.$text || ''; });
          equippedWeapons.push({
            id: `w-${Date.now()}-${Math.random()}`,
            name: wepProf?.name || subName,
            type: (wChars['Type']?.includes('Melee') || wChars['Range']?.includes('Melee')) ? 'Melee' : 'Ranged',
            hands: wChars['Type']?.includes('2') ? 2 : 1,
            range: wChars['Range'] || 'Melee (1")',
            modifiers: wChars['Keywords']?.includes('DICE') ? wChars['Keywords'] : '+0 DICE',
            damage: 'Standard',
            keywords: wChars['Keywords'] ? wChars['Keywords'].split(',').map(k => k.trim()) : [],
            cost: sub.costs?.find(c => c.name === 'Ducats')?.value || 0,
            instanceId: `w-inst-${Date.now()}-${Math.random()}`
          });
          return;
        }

        // Check for Armour / Shield profile
        const bKitProf = sub.profiles?.find(p => p.typeName === 'Battlekit');
        if (subGroup.includes('Armour') || subGroup.includes('Shields') || bKitProf?.name.includes('Armour') || bKitProf?.name.includes('Shield')) {
          const bChars = {};
          (bKitProf?.characteristics || []).forEach(c => { bChars[c.name] = c.$text || ''; });
          equippedArmour.push({
            id: `a-${Date.now()}-${Math.random()}`,
            name: bKitProf?.name || subName,
            armourModifier: bChars['Keywords']?.includes('INJURY MODIFIER') ? bChars['Keywords'] : '-1 Injury Modifier',
            cost: sub.costs?.find(c => c.name === 'Ducats')?.value || 0,
            keywords: bChars['Keywords'] ? bChars['Keywords'].split(',').map(k => k.trim()) : [],
            instanceId: `a-inst-${Date.now()}-${Math.random()}`
          });
          return;
        }

        // Check for Equipment
        if (subGroup.includes('Equipment') || bKitProf) {
          const bChars = {};
          (bKitProf?.characteristics || []).forEach(c => { bChars[c.name] = c.$text || ''; });
          equippedEquipment.push({
            id: `e-${Date.now()}-${Math.random()}`,
            name: bKitProf?.name || subName,
            cost: sub.costs?.find(c => c.name === 'Ducats')?.value || 0,
            effect: bChars['Rules'] || '',
            keywords: bChars['Keywords'] ? bChars['Keywords'].split(',').map(k => k.trim()) : [],
            instanceId: `e-inst-${Date.now()}-${Math.random()}`
          });
        }

        // Recurse into nested selections if any
        if (sub.selections) {
          parseSubSelections(sub.selections);
        }
      });
    }

    parseSubSelections(sel.selections);

    const isTough = catNames.includes('Tough') || unitProfile?.characteristics?.some(c => c.$text?.includes('Tough'));
    const maxHp = isTough ? 2 : 1;

    // Calculate total cost
    let unitCost = sel.costs?.find(c => c.name === 'Ducats')?.value || 0;
    if (unitCost === 0) {
      unitCost = 35 + equippedWeapons.reduce((s, w) => s + w.cost, 0) + equippedArmour.reduce((s, a) => s + a.cost, 0);
    }

    units.push({
      id: `u-imp-${Date.now()}-${idx}`,
      customName: sel.customName || sel.name,
      baseProfileId: sel.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      profileSnapshot: {
        id: sel.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: sel.name,
        factionId,
        category,
        baseCost: unitCost,
        stats: {
          movement: charMap['Movement'] || '6"',
          ranged: charMap['Ranged'] || '+0 DICE',
          melee: charMap['Melee'] || '+0 DICE',
          armour: charMap['Armour'] || '-1',
          keywords: catNames
        },
        innateAbilities: (sel.profiles || []).filter(p => p.typeName === 'Ability').map(a => ({
          id: a.id || a.name,
          name: a.name,
          description: a.characteristics?.find(c => c.name === 'Description')?.$text || ''
        }))
      },
      equippedWeapons,
      equippedArmour,
      equippedEquipment,
      xp,
      advancements,
      injuries,
      isDead: false,
      totalCost: unitCost,
      currentWounds: maxHp,
      maxWounds: maxHp,
      bloodMarkers: 0,
      status: 'Active',
      hasActedThisTurn: false
    });
  });

  return {
    id: `wb-${Date.now()}`,
    name: warbandName,
    factionId,
    ducatLimit: ducatsLimit,
    treasuryDucats: 0,
    gloryPoints,
    units,
    armoryStash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

const parsed = parseNewRecruitJson(userRoster);
console.log('Parsed Warband Name:', parsed.name);
console.log('Faction:', parsed.factionId);
console.log('Ducat Limit:', parsed.ducatLimit);
console.log('Glory Points:', parsed.gloryPoints);
console.log('Stash Items:', parsed.armoryStash);
console.log('Total Units:', parsed.units.length);
parsed.units.forEach((u, i) => {
  console.log(`\n[${i+1}] ${u.customName} (${u.profileSnapshot.category}) - ${u.totalCost}D`);
  console.log(`    Base: ${u.profileSnapshot.name} | Movement: ${u.profileSnapshot.stats.movement} | Ranged: ${u.profileSnapshot.stats.ranged} | Melee: ${u.profileSnapshot.stats.melee} | Armour: ${u.profileSnapshot.stats.armour}`);
  console.log(`    XP: ${u.xp} | Advancements: [${u.advancements.join(', ')}] | Injuries: [${u.injuries.join(', ')}]`);
  console.log(`    Weapons: [${u.equippedWeapons.map(w => `${w.name} (${w.cost}D)`).join(', ')}]`);
  console.log(`    Armour: [${u.equippedArmour.map(a => `${a.name} (${a.cost}D)`).join(', ')}]`);
  console.log(`    Equipment: [${u.equippedEquipment.map(e => `${e.name} (${e.cost}D)`).join(', ')}]`);
});
