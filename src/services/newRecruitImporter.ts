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
/**
 * What an import produced, and what it could not.
 *
 * `unmatched` is the part that used to be missing. A roster line the
 * catalogues have no profile for was given an invented one — category
 * Trooper, 35 Ducats, a made-up statline — so the import always "worked" and
 * the player's roster total was quietly wrong from that line on. Now the
 * names come back and the caller shows them.
 */
export interface ImportResult {
  warband: Warband;
  /** Roster lines with no profile in the catalogues. Never guessed at. */
  unmatched: string[];
}

/*
  The option groups a catalogue actually uses, taken from the dataset's own
  `unit.options` group names rather than invented here.

  Used only as the SECOND of two tests — a selection carrying an Ability
  profile is already recognised without it. This catches an export that states
  the group but ships no profile with the selection, which New Recruit's JSON
  does for some entries.
*/
const OPTION_GROUP =
  /^(Alchemical Formulae|Eye Options|Strains|Sagas|Martial Disciplines|Fireteams|Goetic Power|Arts of Assassination|Training Choice|Pride|Envy|Gluttony|Lust|Greed|Wrath|Butcher Knight Rank)$/i;

export function importNewRecruitRoster(
  rawInput: string,
  knownUnits: UnitProfile[] = []
): ImportResult {
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

function parseNewRecruitJson(data: any, allUnits: UnitProfile[]): ImportResult {
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
  /** Roster lines with no resolvable statline. Reported, not invented. */
  const unmatched: string[] = [];
  const armoryStash: StashedItem[] = [];
  /** Named by the export's Warband Variant node; matched by id or name. */
  let variantId: string | undefined;

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

    /*
      The Warband Variant is a Configuration node, and its child names the
      Variant. Read it before skipping the node — dropping it meant every
      imported roster was validated as the faction's *standard* list, so a
      House of Wisdom Warband came back with two errors it does not have: the
      base 0-1 Jabirean Alchemist limit (the Variant raises it to 2) and "must
      include 1 Yüzbaşı Captain" (the Variant forbids the Yüzbaşı).
    */
    if (sel.name === 'Warband Variant') {
      const picked = (sel.selections ?? [])[0]?.name;
      if (picked) variantId = picked;
      return;
    }

    // Skip Configuration nodes (Campaign Rules, Patron Selection, etc.)
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
    /*
      Alchemical Formulae, Eye Options, Strains, Sagas and the rest of a
      model's purchasable options, in the SAME place the app's own purchase
      path puts them.

      They used to land in `equippedEquipment`, so an imported Homunculus wore
      `Human Hands` and `Additional Arm` in its gear list beside its sword —
      the player's words were "attached as some kind of wargear". Two costs to
      that: the model reads wrongly, and an imported warband and one built in
      the app were different shapes for the same thing, which is how the
      legality engine came to need `traitsOf` reading three lists at once.

      Told apart by the PROFILE the selection carries, which is structural and
      always present, rather than by a list of group names written here: a
      Weapon profile is a weapon, a Battlekit profile is armour or equipment,
      and an Ability profile is something the model IS, not something it holds.
    */
    const specialUpgrades: { id: string; name: string; cost: number; category: string }[] = [];
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

        /*
          An option the model bought: a Formula, an Eye Option, a Strain.

          Carries an Ability profile and no Weapon or Battlekit one — it
          changes what the model is rather than adding to what it holds. The
          group is used when the export states it (New Recruit's JSON does),
          because it is the more specific answer, but it is not required: a
          BattleScribe `.ros` carries `entryGroupId`, a GUID, and no group
          name at all, so requiring one would put every `.ros` import back
          where it started.
        */
        const abilityProf = sub.profiles?.find((p: any) => p.typeName === 'Ability');
        const isWargearGroup = /Weapons|Armour|Shields|Equipment|Battlekit/i.test(subGroup);
        if ((abilityProf && !bKitProf && !isWargearGroup) || OPTION_GROUP.test(subGroup)) {
          specialUpgrades.push({
            id: `su-${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            name: subName,
            cost: sub.costs?.find((c: any) => c.name === 'Ducats')?.value || 0,
            // The catalogue's own group name where the export gives one, so
            // the advancement sheet can head these the way it heads the ones
            // bought in the app.
            category: subGroup || 'Upgrades',
          });
          if (sub.selections) parseSubSelections(sub.selections);
          return;
        }

        // Equipment / Battlekit items
        if (subGroup.includes('Equipment') || bKitProf) {
          const bChars: Record<string, string> = {};
          (bKitProf?.characteristics || []).forEach((c: any) => { bChars[c.name] = c.$text || ''; });

          equippedEquipment.push({
            id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: bKitProf?.name || subName,
            // The group is tested three lines above to decide whether to keep
            // this selection, and used to be dropped here. Everything
            // downstream then had to guess from the name.
            group: subGroup || undefined,
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

    /*
      Every characteristic must come from the export or from a matched profile.

      The four `|| '6"'` / `|| '+0 DICE'` / `|| '-1'` tails below used to invent
      one when neither had it, which is a statline with no source presented as
      the player's own. An export that carries its characteristics is fine —
      that IS the player's roster — and a name we can match is fine. Neither is
      a line we can import, so it is reported instead.
    */
    const stats = {
      movement: charMap['Movement'] || matchedProfile?.stats.movement,
      ranged: charMap['Ranged'] || matchedProfile?.stats.ranged,
      melee: charMap['Melee'] || matchedProfile?.stats.melee,
      armour: charMap['Armour'] || matchedProfile?.stats.armour,
    };
    if (!stats.movement || !stats.ranged || !stats.melee || !stats.armour) {
      unmatched.push(sel.customName || sel.name);
      return;
    }
    const resolvedStats = stats as { movement: string; ranged: string; melee: string; armour: string };

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
        stats: { ...resolvedStats, keywords: catNames },
        innateAbilities: (sel.profiles || []).filter((p: any) => p.typeName === 'Ability').map((a: any) => ({
          id: a.id || a.name,
          name: a.name,
          description: a.characteristics?.find((c: any) => c.name === 'Description')?.$text || ''
        }))
      },
      equippedWeapons,
      equippedArmour,
      equippedEquipment,
      specialUpgrades,
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
    warband: {
      id: `wb-${Date.now()}`,
      name: warbandName,
      factionId,
      variantId,
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
    },
    unmatched,
  };
}

/*
  One BattleScribe `.ros` node, in the shape the JSON parser already reads.

  The XML path used to walk the roster itself and build each unit inline — and
  it never looked at a selection's children at all. Every model imported from a
  `.ros` file arrived with no weapons, no armour, no equipment, no Formulae, no
  XP and no advancements: the base profile and nothing else, silently, with the
  import reporting success.

  Normalising instead of re-walking means the two formats cannot drift apart
  again, which is how this happened: `parseSubSelections` was written for the
  JSON path and the XML path was simply never given it.

  fast-xml-parser hands attributes back prefixed and wraps repeated children in
  a named holder, so `<selection name="x">` is `{'@_name': 'x'}` and
  `<selections><selection/></selections>` is `{selections: {selection: [...]}}`.
  Both are undone here.
*/
function xmlSelectionToJson(node: any): any {
  const arr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  return {
    name: node['@_name'],
    customName: node['@_customName'],
    type: node['@_type'],
    number: node['@_number'] != null ? Number(node['@_number']) : undefined,
    /*
      `group` where the export states one. A BattleScribe `.ros` carries
      `entryGroupId` — a GUID with no name behind it in the roster file — so
      this is usually absent and the profile type decides instead.
    */
    group: node['@_group'],
    costs: arr(node.costs?.cost).map((c: any) => ({
      name: c['@_name'],
      value: Number(c['@_value'] ?? 0),
    })),
    categories: arr(node.categories?.category).map((c: any) => ({ name: c['@_name'] })),
    profiles: arr(node.profiles?.profile).map((pr: any) => ({
      id: pr['@_id'],
      name: pr['@_name'],
      typeName: pr['@_typeName'],
      characteristics: arr(pr.characteristics?.characteristic).map((ch: any) => ({
        name: ch['@_name'],
        $text: ch['#text'] ?? '',
      })),
    })),
    selections: arr(node.selections?.selection).map(xmlSelectionToJson),
  };
}

function parseNewRecruitXml(xmlContent: string, allUnits: UnitProfile[]): ImportResult {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['selection', 'profile', 'cost', 'characteristic', 'category'].includes(name)
  });

  const parsed = parser.parse(xmlContent);
  const roster = parsed.roster || parsed.gameSystem || parsed;

  const forceNode = roster.forces?.force;
  const force = Array.isArray(forceNode) ? forceNode[0] : forceNode;
  const rawSelections =
    force?.selections?.selection ?? roster.selections?.selection ?? [];

  /*
    Handed to the JSON parser rather than walked again here.

    That parser reads a selection's CHILDREN — weapons, armour, equipment,
    Alchemical Formulae, Experience, advancements and injuries — and this one
    never did. A `.ros` import produced models carrying nothing at all.
  */
  return parseNewRecruitJson({
    roster: {
      name: roster['@_name'] || 'Imported Roster XML',
      gameSystemName: roster['@_gameSystemName'],
      costLimits: (Array.isArray(roster.costLimits?.cost) ? roster.costLimits.cost : [])
        .map((c: any) => ({ name: c['@_name'], value: Number(c['@_value'] ?? 0) })),
      costs: (Array.isArray(roster.costs?.cost) ? roster.costs.cost : [])
        .map((c: any) => ({ name: c['@_name'], value: Number(c['@_value'] ?? 0) })),
      forces: [{
        name: force?.['@_name'],
        catalogueName: force?.['@_catalogueName'],
        selections: (Array.isArray(rawSelections) ? rawSelections : [rawSelections])
          .filter(Boolean)
          .map(xmlSelectionToJson),
      }],
    },
  }, allUnits);
}

function parseNewRecruitText(text: string, allUnits: UnitProfile[]): ImportResult {
  /*
    Always empty here, and that is honest rather than lazy: this parser only
    creates a unit when a line CONTAINS a known profile name, so a line it
    cannot resolve produces nothing rather than a guess. It never had the
    invented-profile fallback the XML and JSON parsers did.
  */
  const unmatched: string[] = [];
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
    warband: {
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
    },
    unmatched,
  };
}
