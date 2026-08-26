import { XMLParser } from 'fast-xml-parser';
import { UnitProfile, WeaponProfile, ArmourProfile } from '../types/rules';

export interface ParsedCatalogue {
  id: string;
  name: string;
  units: UnitProfile[];
  weapons: WeaponProfile[];
  armour: ArmourProfile[];
}

export function parseBattleScribeXml(xmlContent: string): ParsedCatalogue {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => {
      return ['entryLink', 'selectionEntry', 'profile', 'characteristic', 'rule', 'cost'].includes(name);
    }
  });

  const parsed = parser.parse(xmlContent);
  const catalogue = parsed.catalogue || parsed.gameSystem;

  const result: ParsedCatalogue = {
    id: catalogue?.['@_id'] || 'imported-catalog',
    name: catalogue?.['@_name'] || 'Imported Catalogue',
    units: [],
    weapons: [],
    armour: []
  };

  if (!catalogue) return result;

  // Traverse selectionEntries / sharedSelectionEntries
  const entries = [
    ...(catalogue.selectionEntries?.selectionEntry || []),
    ...(catalogue.sharedSelectionEntries?.selectionEntry || [])
  ];

  entries.forEach((entry: any) => {
    const type = entry['@_type'];
    const name = entry['@_name'];
    const id = entry['@_id'] || name?.toLowerCase().replace(/\s+/g, '-');

    // Extract costs (Ducats)
    let cost = 0;
    const costs = entry.costs?.cost || [];
    costs.forEach((c: any) => {
      if (c['@_name']?.toLowerCase().includes('ducat') || c['@_name']?.toLowerCase().includes('point')) {
        cost = parseFloat(c['@_value']) || 0;
      }
    });

    // Extract profiles
    const profiles = entry.profiles?.profile || [];
    profiles.forEach((p: any) => {
      const typeName = p['@_typeName']?.toLowerCase();
      const chars = p.characteristics?.characteristic || [];
      const charMap: Record<string, string> = {};
      chars.forEach((ch: any) => {
        if (ch['@_name'] && ch['#text'] !== undefined) {
          charMap[ch['@_name'].toLowerCase()] = String(ch['#text']);
        }
      });

      if (typeName?.includes('unit') || typeName?.includes('model') || typeName?.includes('warrior')) {
        result.units.push({
          id,
          name: p['@_name'] || name,
          factionId: catalogue['@_name']?.toLowerCase().replace(/\s+/g, '-') || 'custom',
          category: (entry['@_category'] as any) || 'Trooper',
          baseCost: cost,
          stats: {
            movement: charMap['movement'] || charMap['mov'] || '6"',
            ranged: charMap['ranged'] || charMap['rng'] || '+0',
            melee: charMap['melee'] || '+0',
            armour: charMap['armour'] || charMap['arm'] || '+0',
            keywords: []
          },
          innateAbilities: [],
          lore: entry.comment || ''
        });
      } else if (typeName?.includes('weapon') || typeName?.includes('ranged') || typeName?.includes('melee')) {
        result.weapons.push({
          id,
          name: p['@_name'] || name,
          type: typeName.includes('melee') ? 'Melee' : 'Ranged',
          range: charMap['range'] || 'Melee',
          modifiers: charMap['modifier'] || charMap['modifiers'] || '+0',
          damage: charMap['damage'] || 'Standard',
          keywords: (charMap['keywords'] || '').split(',').map((k: string) => k.trim()).filter(Boolean),
          cost
        });
      }
    });
  });

  return result;
}
