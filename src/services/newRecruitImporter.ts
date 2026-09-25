import { XMLParser } from 'fast-xml-parser';
import { Warband, ActiveUnit, EquippedWeapon, EquippedArmour, EquippedEquipment, StashedItem, WarbandReward, InjuryRecord } from '../types/warband';
import { UnitProfile } from '../types/rules';
import type { Dataset } from '../types/catalogue';
import { golemOnImport, GOLEM_GRANTED_BY } from '../rules/golem';
import { patronNamed } from '../rules/patrons';
import { splitRecordedRoll } from '../rules/provenance';

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
  /**
   * What the Book of Golems decided, where the roster holds it.
   *
   * GOLEM-1. `golemOnImport` was built with the rules in #95 and then had no
   * caller at all, so no model on any roster was ever marked a Golem: the
   * grant's free-Formula allowance was unreachable, *"can never be Promoted"*
   * never fired, and `golemKeywords` had no live effect.
   *
   * It returns the index and the reason, or `null` and the reason, and
   * deliberately mutates nothing — so this carries the reason out for the
   * builder to show. A roster the grant cannot resolve to one model is NOT
   * marked by guess; the player marks it, with this sentence in front of them.
   */
  golem?: { markedIndex: number | null; reason: string };
  /**
   * What the roster's `Campaign Rules > Enabled` subtree says the Warband holds.
   *
   * The importer used to drop this whole subtree with the rest of the
   * Configuration nodes, so a roster that had earned the Book of Golems, a
   * Ransacked Alchemist Workshop and a Reroll imported as though it had earned
   * nothing. Names only, exactly as the roster spells them — what each one
   * MEANS is a rules question, and the rules modules answer it.
   */
  campaignRules: string[];
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

/**
 * The names under `Campaign Rules > Enabled`, where a roster carries them.
 *
 * A separate pass over the document rather than a branch inside the model
 * walk: that walk's job is to turn selections into models, and the rewards are
 * not models. Threading a second kind of output through it is how the walk
 * grew the Configuration special-case it already carries.
 *
 * Shallow by intent — the names, in the roster's own spelling. A reward's
 * meaning belongs to the rules modules (`rules/golem.ts` reads the Book of
 * Golems from the rulebook's own Exploration row), not to a parser.
 */
export function readCampaignRules(data: unknown): string[] {
  const out: string[] = [];
  const named = (n: unknown): n is { name?: string; selections?: unknown } =>
    typeof n === 'object' && n !== null;

  const collect = (node: unknown) => {
    if (!named(node)) return;
    if (Array.isArray(node)) return node.forEach(collect);
    const box = node as { selections?: unknown; selection?: unknown };
    const kids = box.selections ?? box.selection;
    const list = Array.isArray(kids)
      ? kids
      : named(kids) ? Object.values(kids as object) : [];
    for (const k of list) {
      if (!named(k)) continue;
      /* JSON spells it `name`; the `.ros` XML spells it `@_name`. */
      const kn = (k as { name?: string; '@_name'?: string });
      const label = (kn.name ?? kn['@_name'] ?? '').trim();
      if (label) out.push(label);
    }
  };

  const find = (node: unknown) => {
    if (!named(node)) return;
    if (Array.isArray(node)) return node.forEach(find);
    const n = node as { name?: string; '@_name'?: string };
    const name = n.name ?? n['@_name'];
    if (typeof name === 'string' && /^Enabled$/i.test(name.trim())) collect(node);
    for (const v of Object.values(node as object)) {
      if (typeof v === 'object' && v !== null) find(v);
    }
  };

  find(data);
  return [...new Set(out)];
}

/**
 * The same subtree, with each entry's GROUP and its printed rules text
 * (FD-12 item 2).
 *
 * `readCampaignRules` returns names, and names are all the rules modules need —
 * `golemGrant` matches the Book of Golems by the sentence its Exploration row
 * prints, never by a string. But the Roster Sheet has to show the player what
 * each reward actually says and how the Warband came by it, and a name cannot
 * carry either.
 *
 * The group is the load-bearing part. NewRecruit files these under
 * `Exploration Rewards`, `Exploration Skills` and `Patron Selection`, and the
 * group is how the Patron is told from the rewards **without this parser
 * knowing any Patron's name** — which is what keeps the reading derived rather
 * than matched against a list written here.
 *
 * `Unleveraged Glory` sits in the subtree with no group at all; it is
 * NewRecruit's own Glory counter rather than something the Warband earned, so
 * it comes back with no group and the caller decides.
 *
 * The text is the roster's own `Rules` characteristic, copied and not
 * paraphrased. Absent where the export ships no profile with the selection.
 */
export function readCampaignGrants(data: unknown): WarbandReward[] {
  const out: WarbandReward[] = [];
  const named = (n: unknown): n is Record<string, unknown> =>
    typeof n === 'object' && n !== null;

  /** The `Rules` characteristic of the selection's own profile, if it has one. */
  const rulesText = (node: Record<string, unknown>): string | undefined => {
    const profiles = node.profiles;
    const list = Array.isArray(profiles) ? profiles : [];
    for (const prof of list) {
      if (!named(prof)) continue;
      const chars = Array.isArray(prof.characteristics) ? prof.characteristics : [];
      for (const c of chars) {
        if (!named(c)) continue;
        const cn = (c.name ?? c['@_name']) as string | undefined;
        const text = (c.$text ?? c['#text']) as string | undefined;
        if (cn && /^rules$/i.test(String(cn).trim()) && text && text.trim() !== '-') {
          return String(text).trim();
        }
      }
    }
    return undefined;
  };

  const collect = (node: unknown) => {
    if (!named(node)) return;
    const kids = node.selections ?? node.selection;
    const list = Array.isArray(kids)
      ? kids
      : named(kids) ? Object.values(kids as object) : [];
    for (const k of list) {
      if (!named(k)) continue;
      const label = String(k.name ?? k['@_name'] ?? '').trim();
      if (!label) continue;
      const group = String(k.group ?? k['@_group'] ?? '').trim();
      out.push({
        name: label,
        ...(group ? { group } : {}),
        ...(rulesText(k) ? { text: rulesText(k) } : {}),
        /* It came in from a file. Not an Exploration result the app watched
           happen, whatever group the roster filed it under. */
        source: { kind: 'import' },
      });
    }
  };

  const find = (node: unknown) => {
    if (!named(node)) return;
    if (Array.isArray(node)) return (node as unknown[]).forEach(find);
    const name = (node.name ?? node['@_name']) as string | undefined;
    if (typeof name === 'string' && /^Enabled$/i.test(name.trim())) collect(node);
    for (const v of Object.values(node)) {
      if (typeof v === 'object' && v !== null) find(v);
    }
  };

  find(data);
  /* First spelling wins, as `readCampaignRules` does with its Set. */
  const seen = new Set<string>();
  return out.filter((r) => {
    const k = r.name.trim().toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * The group NewRecruit files a Patron under.
 *
 * Read from the roster's own structure, not from a Patron's name — see
 * `readCampaignGrants`. Exported so the test can name what it depends on.
 */
export const PATRON_GROUP = 'Patron Selection';

/**
 * The Patron the roster states, if OUR dataset knows it (FD-15).
 *
 * Two conditions, and both matter. The roster has to file something under
 * `Patron Selection`, and that something has to resolve to a Patron in the
 * ruleset this app ships — `dataset.patrons`, the eleven derived from the
 * rulebook and Carcass Front.
 *
 * Unresolved, nothing is written. A `patron` string the dataset cannot place is
 * worse than none: `patronSkillsFor` matches on the name, so it would read as a
 * Patron whose Skills are an empty list, and a Patron Skill result would report
 * "no Patron recorded" for a Warband whose sheet said it had one.
 *
 * The ROSTER's spelling is kept where it resolves. The dataset prints the book's
 * caps (`SUBLIME GATE`) and the export prints `Sublime Gate`; the lookup is
 * case-insensitive, and the player's own sheet says the latter.
 */
export function patronFromGrants(
  grants: readonly WarbandReward[],
  dataset?: Dataset,
): string | undefined {
  const stated = grants.find(
    (g) => (g.group ?? '').trim().toLowerCase() === PATRON_GROUP.toLowerCase());
  if (!stated) return undefined;
  return patronNamed(dataset, stated.name) ? stated.name : undefined;
}

export function importNewRecruitRoster(
  rawInput: string,
  knownUnits: UnitProfile[] = [],
  /**
   * The ruleset, for the rules that read a roster rather than a line of it —
   * today just the Book of Golems (GOLEM-1).
   *
   * Optional, and the importer works without it: `knownUnits` is still what
   * resolves a model. Omitted, nothing is marked and the reason says why,
   * which is the same answer a roster that does not hold the grant gets. That
   * keeps every existing caller and test working unchanged rather than
   * forcing a dataset through paths that have never needed one.
   */
  dataset?: Dataset,
): ImportResult {
  const trimmed = rawInput.trim();
  const allUnits = knownUnits;

  // 1. Try parsing as JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const data = JSON.parse(trimmed);
      return parseNewRecruitJson(data, allUnits, dataset);
    } catch (e) {
      console.warn('Failed JSON parse, trying XML/Text fallback:', e);
    }
  }

  // 2. Try parsing as XML (.ros / BattleScribe / NewRecruit XML)
  if (trimmed.startsWith('<')) {
    try {
      return parseNewRecruitXml(trimmed, allUnits, dataset);
    } catch (e) {
      console.warn('Failed XML parse, trying Text fallback:', e);
    }
  }

  // 3. Fallback: Parse Plaintext Roster
  return parseNewRecruitText(trimmed, allUnits);
}

/*
  The shapes this importer reads.

  Every one of these fields used to be `any` — forty-one of them, in the module
  that turns SOMEBODY ELSE'S FILE into a warband. That is exactly backwards: a
  parser for untrusted input is where a type earns the most, because it is the
  one place the program cannot assume the shape it is handed.

  Everything is optional and nothing is asserted, because a roster export
  genuinely may omit any of it. What the types buy is not trust in the input —
  it is that `sel.profiles` is known to be a list of profiles rather than a
  thing with any property at all, so a typo in a member name is a compile error
  instead of `undefined` flowing into a statline.
*/

/** A `<cost name="Ducats" value="120"/>` entry, after normalisation. */
interface NrCost { name?: string; value?: number }
interface NrCategory { name?: string }
interface NrCharacteristic { name?: string; $text?: string }

/** A profile block: Unit, Weapon, Battlekit or Ability. */
interface NrProfile {
  id?: string;
  name?: string;
  typeName?: string;
  characteristics?: NrCharacteristic[];
}

/** One line of a roster: a model, a weapon on it, an upgrade, a counter. */
interface NrSelection {
  name?: string;
  customName?: string;
  /**
   * What the CATALOGUE calls this line, as a path.
   *
   * The identity the importer resolves on, and the reason this field exists:
   * `name` is what modifiers made of the entry, not what the catalogue calls
   * it. The Iron Sultanate's `Azeb` is written into a roster as `Kavass`, and
   * a promoted one as `Favoured Kavass` — all three are entry
   * `0e7e-9167-f044-9493`. Matching on the name resolved none of them.
   *
   * A path rather than a bare id: `da5c-…::2f82-…` is the chain of `entryLink`
   * ids by which the entry was reached, with its own id last. See
   * `docs/ROSTER-PATHS.md`.
   */
  entryId?: string;
  type?: string;
  number?: number;
  group?: string;
  costs?: NrCost[];
  categories?: NrCategory[];
  profiles?: NrProfile[];
  selections?: NrSelection[];
}

interface NrForce {
  name?: string;
  customName?: string;
  catalogueName?: string;
  selections?: NrSelection[];
}

/**
 * A roster is a force with the document-level fields on top.
 *
 * Extending `NrForce` is not tidiness: the parser falls back to
 * `rosterData.forces?.[0] || rosterData`, so the roster is used AS a force
 * when an export has no `forces` array, and the type has to allow that.
 */
interface NrRoster extends NrForce {
  gameSystemName?: string;
  costLimits?: NrCost[];
  costs?: NrCost[];
  forces?: NrForce[];
}

/** What `JSON.parse` hands over: either the roster, or a wrapper around one. */
type NrDocument = NrRoster & { roster?: NrRoster };

/*
  And the XML side, as fast-xml-parser produces it: attributes prefixed `@_`,
  repeated children wrapped in a named holder, text content under `#text`.
  `xmlSelectionToJson` below is the only thing that reads these.
*/
interface XmlCost { '@_name'?: string; '@_value'?: string | number }
interface XmlCategory { '@_name'?: string }
interface XmlCharacteristic { '@_name'?: string; '#text'?: string }
interface XmlProfile {
  '@_id'?: string;
  '@_name'?: string;
  '@_typeName'?: string;
  characteristics?: { characteristic?: XmlCharacteristic | XmlCharacteristic[] };
}
interface XmlSelection {
  '@_name'?: string;
  '@_customName'?: string;
  /** The catalogue path this line selects. See `NrSelection.entryId`. */
  '@_entryId'?: string;
  '@_type'?: string;
  '@_number'?: string | number;
  '@_group'?: string;
  costs?: { cost?: XmlCost | XmlCost[] };
  categories?: { category?: XmlCategory | XmlCategory[] };
  profiles?: { profile?: XmlProfile | XmlProfile[] };
  selections?: { selection?: XmlSelection | XmlSelection[] };
}
interface XmlForce {
  '@_name'?: string;
  '@_catalogueName'?: string;
  selections?: { selection?: XmlSelection | XmlSelection[] };
}
interface XmlRoster {
  '@_name'?: string;
  '@_gameSystemName'?: string;
  costLimits?: { cost?: XmlCost | XmlCost[] };
  costs?: { cost?: XmlCost | XmlCost[] };
  forces?: { force?: XmlForce | XmlForce[] };
  selections?: { selection?: XmlSelection | XmlSelection[] };
}

/**
 * The catalogue entry a roster line selects, or `undefined`.
 *
 * A roster's `entryId` is a PATH — the chain of `entryLink` ids traversed to
 * reach the entry, with the entry's own id last (`docs/ROSTER-PATHS.md`). The
 * store keys a unit by that last segment: `recruitable` sets
 * `UnitProfile.id` to the dataset's `entryId`, so this is a direct lookup and
 * not a search.
 *
 * Unambiguous, which is the whole point. Five factions field a `Homunculus`
 * and each is a DIFFERENT entry — Iron Sultanate's is `2f82-e47f-c162-9152`,
 * Trench Pilgrims' is `3eda-5baa-29d3-d617` — so an id names one of them and
 * a name names all five. No two units in the ruleset share an entry id.
 */
function unitByEntryId(
  allUnits: UnitProfile[], entryId: string | undefined
): UnitProfile | undefined {
  if (!entryId) return undefined;
  const own = entryId.split('::').pop();
  return own ? allUnits.find((u) => u.id === own) : undefined;
}

/**
 * The same line, resolved by name, for a roster that carries no `entryId`.
 *
 * Kept only as that fallback. It is wrong often enough that it must never run
 * ahead of an id: `"kavass".includes("azeb")` is false, so a renamed entry
 * resolves to nothing; and `"favoured homunculus".includes("homunculus")`
 * matches whichever faction's Homunculus is first in the list, which is a
 * silently wrong model rather than an unresolved one.
 */
function unitByName(
  allUnits: UnitProfile[], selName: string
): UnitProfile | undefined {
  return allUnits.find(
    (p) => p.name.toLowerCase() === selName || selName.includes(p.name.toLowerCase())
  );
}

/**
 * A `unit` wrapper's inner model, where that is what the roster wrote.
 *
 * `Mamluk Faris` is a `unit` entry whose only child is a link to the `model`
 * carrying the profile, and a real export writes both — the wrapper holding
 * the player's `customName` and the child holding the identity and the
 * statline. Treating the wrapper as the model imports a nameless line with no
 * profile; ignoring it loses the name the player typed. So the child is the
 * model and the wrapper contributes its name.
 *
 * Only when the wrapper has no Unit profile of its own: a `unit` entry that
 * carries one is a model in its own right.
 */
function innerModel(sel: NrSelection): NrSelection | undefined {
  if (sel.type !== 'unit') return undefined;
  if (sel.profiles?.some((p) => p.typeName === 'Unit')) return undefined;
  const models = (sel.selections ?? []).filter((c) => c.type === 'model');
  if (models.length !== 1) return undefined;
  return { ...models[0], customName: sel.customName ?? models[0].customName };
}

function parseNewRecruitJson(
  data: NrDocument, allUnits: UnitProfile[], dataset?: Dataset,
): ImportResult {
  const campaignRules = readCampaignRules(data);
  /*
    The same subtree with each entry's group and printed text (FD-12), and the
    Patron the roster states where our own dataset knows it (FD-15).
  */
  const grants = readCampaignGrants(data);
  const patron = patronFromGrants(grants, dataset);
  const rosterData = data.roster || data;
  const force: NrForce = rosterData.forces?.[0] || rosterData;
  const warbandName = force.customName || rosterData.customName || rosterData.name || 'Imported Warband';

  // Faction detection
  let factionId = 'new-antioch';
  const factionSearchStr = `${rosterData.name || ''} ${force.catalogueName || ''} ${force.name || ''} ${rosterData.gameSystemName || ''}`.toLowerCase();
  
  if (factionSearchStr.includes('sultan')) factionId = 'iron-sultanate';
  else if (factionSearchStr.includes('pilgrim')) factionId = 'trench-pilgrims';
  else if (factionSearchStr.includes('heretic')) factionId = 'heretic-legions';
  else if (factionSearchStr.includes('grail')) factionId = 'black-grail';
  else if (factionSearchStr.includes('court') || factionSearchStr.includes('serpent') || factionSearchStr.includes('hell')) factionId = 'court-seven-serpents';

  const ducatsLimit = rosterData.costLimits?.find((c) => c.name === 'Ducats')?.value || 
                      rosterData.costs?.find((c) => c.name === 'Ducats')?.value || 700;
  const gloryPoints = rosterData.costs?.find((c) => c.name === 'Glory Points')?.value || 0;

  const rawSelections: NrSelection[] = force.selections || rosterData.selections || [];
  const units: ActiveUnit[] = [];
  /** Roster lines with no resolvable statline. Reported, not invented. */
  const unmatched: string[] = [];
  const armoryStash: StashedItem[] = [];
  /** Named by the export's Warband Variant node; matched by id or name. */
  let variantId: string | undefined;

  rawSelections.forEach((raw, idx) => {
    /*
      A `unit` wrapper is structure, not a model. Unwrap it first so everything
      below reads the line that actually carries the profile — and so the
      wrapper is never reported as unmatched, which it would be on every
      Mamluk Faris in every Sultanate roster.
    */
    const sel = innerModel(raw) ?? raw;
    const isConfig = (sel.categories || []).some((c) => c.name === 'Configuration');
    const isPileOfStuff = sel.name === 'Pile of Stuff' || sel.customName === 'Pile of Stuff';

    // Parse unassigned storage items into Armory Stash
    if (isPileOfStuff) {
      (sel.selections || []).forEach((stashSel) => {
        const wepProf = stashSel.profiles?.find((p) => p.typeName === 'Weapon');
        const cost = stashSel.costs?.find((c) => c.name === 'Ducats')?.value || 0;
        const group = stashSel.group || '';
        /*
          A nameless stash line is not importable and must not become a blank
          row in somebody's armoury. `any` let `undefined` through into `name`
          silently; skipping it and reporting it is what the rest of this file
          already does with a line it cannot resolve.
        */
        if (!stashSel.name) {
          unmatched.push('An unnamed item in the Pile of Stuff');
          return;
        }
        const stashName = stashSel.name;

        if (wepProf || group.includes('Weapons')) {
          armoryStash.push({
            id: `stash-${Date.now()}-${Math.random()}`,
            name: stashName,
            type: 'Weapon',
            cost,
            quantity: stashSel.number || 1
          });
        } else if (group.includes('Armour') || group.includes('Shield')) {
          armoryStash.push({
            id: `stash-${Date.now()}-${Math.random()}`,
            name: stashName,
            type: 'Armour',
            cost,
            quantity: stashSel.number || 1
          });
        } else if (group.includes('Equipment')) {
          armoryStash.push({
            id: `stash-${Date.now()}-${Math.random()}`,
            name: stashName,
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
    if (isConfig && !sel.profiles?.some((p) => p.typeName === 'Unit')) {
      return;
    }

    // Only process real models / units
    const isModelType = sel.type === 'model' || sel.type === 'unit' || sel.profiles?.some((p) => p.typeName === 'Unit');
    if (!isModelType) {
      return;
    }

    /*
      A model line with no name is not importable.

      Reported rather than imported blank, for the same reason the statline
      guard below reports rather than inventing a `6"` movement: a roster row
      with no name is a row the player cannot identify, and one they can see
      listed as unmatched is strictly better than one that silently became an
      anonymous model in their warband. Untyped, this case was invisible.
    */
    if (!sel.name) {
      unmatched.push('An unnamed model');
      return;
    }
    const selectionName = sel.name;

    // Extract Unit Characteristic Profile
    const unitProfile = sel.profiles?.find((p) => p.typeName === 'Unit');
    const charMap: Record<string, string> = {};
    if (unitProfile?.characteristics) {
      unitProfile.characteristics.forEach((c) => {
        if (c.name) charMap[c.name] = c.$text || c.name;
      });
    }

    // Determine category (Leader, Elite, Trooper, Mercenary)
    let category: 'Leader' | 'Elite' | 'Trooper' | 'Mercenary' = 'Trooper';
    const catNames = (sel.categories || [])
      .map((c) => c.name)
      // A category with no name is not a keyword; it is a hole in the export.
      .filter((n): n is string => Boolean(n));
    /*
      Once, lower-cased, instead of eleven `selName` calls that
      each assumed a name is present. An export CAN omit it, and `any` meant
      the assumption was never stated — the first nameless model would have
      thrown inside the category test rather than being reported as unmatched.
    */
    const selName = selectionName.toLowerCase();
    
    if (catNames.includes('Leader') || selName.includes('leader') || selName.includes('lieutenant') || selName.includes('prophet') || selName.includes('alchemist')) {
      category = catNames.includes('Elite') && !catNames.includes('Leader') ? 'Elite' : 'Leader';
    }
    if (catNames.includes('Elite') || selName.startsWith('favoured')) {
      category = 'Elite';
    } else if (catNames.includes('Mercenary') || selName.includes('mamluk') || selName.includes('sin eater') || selName.includes('trench dog')) {
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
    /*
      FD-12 item 2: a Skill imported from NewRecruit is a Skill with its roll,
      not a bare name in the legacy free-text list.

      The export prints `Point Blank [9]` and files it under
      `Advancement::Skills::Ranged Skills`. Both halves are provenance the app
      had been throwing away: the roll is the only record of the 2D6 total that
      earned the Skill, and the group is the table it came off. `source` says
      `import`, because that is what it is — the dice were rolled at somebody's
      table, not here.
    */
    const skills: NonNullable<ActiveUnit['skills']> = [];
    const injuryRecords: InjuryRecord[] = [];
    let xp = 0;

    function parseSubSelections(subList: NrSelection[] | undefined) {
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
          /*
            `Advancement::Injuries` — an injury, with the D66 that caused it.

            Into BOTH arrays, as `addUnitInjury` does: `injuries` is what every
            other reader uses and `injuryRecords` carries the roll. NOT into
            `scars`, and the difference decides whether the model retires — a
            scar counts towards Unfit for Duty and an injury does not (RC-05).
          */
          if (subGroup.includes('Injuries')) {
            const { name, roll } = splitRecordedRoll(subName);
            injuries.push(subName);
            injuryRecords.push({
              name: subName,
              source: { kind: 'import', ...(roll ? { roll } : {}) },
            });
            /* `name` is the injury without its bracket. Unused here on purpose:
               `injuries` keeps the roster's own spelling, which is what an
               existing roster file and `alreadySuffered` already match on. */
            void name;
            return;
          }

          /*
            `Advancement::Skills::<table> Skills` — a Skill off a named table.

            The group's last segment is the category, in the SOURCE's words. Not
            mapped onto the app's four table ids: the roster said `Ranged
            Skills`, the app calls that table `Marksmanship`, and inventing the
            correspondence here would be this file deciding a rules question.
          */
          const skillGroup = /(?:^|::)Skills::(.+)$/.exec(subGroup);
          if (skillGroup) {
            const { name, roll } = splitRecordedRoll(subName);
            if (!skills.some((sk) => sk.name.toLowerCase() === name.toLowerCase())) {
              skills.push({
                name,
                category: skillGroup[1].trim(),
                ...(roll ? { roll } : {}),
                source: { kind: 'import', ...(roll ? { roll } : {}) },
              });
            }
            return;
          }

          advancements.push(subName);
          return;
        }

        // Weapon profiles
        const wepProf = sub.profiles?.find((p) => p.typeName === 'Weapon');
        if (wepProf || subGroup.includes('Weapons')) {
          const wChars: Record<string, string> = {};
          (wepProf?.characteristics || []).forEach((c) => { wChars[c.name ?? ''] = c.$text || ''; });
          
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
            cost: sub.costs?.find((c) => c.name === 'Ducats')?.value || 0,
            instanceId: `w-inst-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
          });
          return;
        }

        // Armour / Shield profiles
        const bKitProf = sub.profiles?.find((p) => p.typeName === 'Battlekit');
        if (subGroup.includes('Armour') || subGroup.includes('Shields') || bKitProf?.name?.toLowerCase().includes('armour') || bKitProf?.name?.toLowerCase().includes('shield')) {
          const bChars: Record<string, string> = {};
          (bKitProf?.characteristics || []).forEach((c) => { bChars[c.name ?? ''] = c.$text || ''; });

          equippedArmour.push({
            id: `a-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: bKitProf?.name || subName,
            armourModifier: bChars['Keywords']?.includes('INJURY MODIFIER') ? bChars['Keywords'] : '-1 Injury Modifier',
            cost: sub.costs?.find((c) => c.name === 'Ducats')?.value || 0,
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
        const abilityProf = sub.profiles?.find((p) => p.typeName === 'Ability');
        const isWargearGroup = /Weapons|Armour|Shields|Equipment|Battlekit/i.test(subGroup);
        if ((abilityProf && !bKitProf && !isWargearGroup) || OPTION_GROUP.test(subGroup)) {
          specialUpgrades.push({
            id: `su-${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            name: subName,
            cost: sub.costs?.find((c) => c.name === 'Ducats')?.value || 0,
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
          (bKitProf?.characteristics || []).forEach((c) => { bChars[c.name ?? ''] = c.$text || ''; });

          equippedEquipment.push({
            id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: bKitProf?.name || subName,
            // The group is tested three lines above to decide whether to keep
            // this selection, and used to be dropped here. Everything
            // downstream then had to guess from the name.
            group: subGroup || undefined,
            cost: sub.costs?.find((c) => c.name === 'Ducats')?.value || 0,
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
    function getSelectionCost(item: NrSelection): number {
      let sum = 0;
      if (Array.isArray(item.costs)) {
        const dCost = item.costs.find((c) => c.name === 'Ducats');
        if (dCost && typeof dCost.value === 'number') sum += dCost.value;
      }
      if (Array.isArray(item.selections)) {
        item.selections.forEach((sub) => { sum += getSelectionCost(sub); });
      }
      return sum;
    }

    const totalUnitCost = getSelectionCost(sel);

    const isTough = catNames.includes('Tough') || 
                    unitProfile?.characteristics?.some((c) => c.$text?.toLowerCase().includes('tough')) ||
                    advancements.some(a => a.toLowerCase().includes('tough'));
    const maxHp = isTough ? 2 : 1;

    /*
      Identity first, name second.

      The roster states which catalogue entry each line is, and that is the
      only thing in the file that survives a modifier renaming it. Name
      matching stays for a roster that carries no id at all — a plain-text
      paste, or an export old enough to predate the attribute.
    */
    const matchedProfile = unitByEntryId(allUnits, sel.entryId)
      ?? (sel.entryId ? undefined : unitByName(allUnits, selName));

    /*
      The catalogue's name for the entry, not the roster's rendered one, so a
      `Kavass` and a `Favoured Kavass` are both recognisably the `Azeb` they
      are. The player's own name is already kept in `customName`.
    */
    const baseProfileName = matchedProfile?.name || unitProfile?.name || selectionName;

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
      unmatched.push(sel.customName || selectionName);
      return;
    }
    const resolvedStats = stats as { movement: string; ranged: string; melee: string; armour: string };

    /*
      A model no catalogue entry claims is reported, not invented.

      It used to be imported under a slug of the roster's own name —
      `baseProfileId: 'kavass'` — which is an id no entry has and nothing can
      resolve later. The statline came from the export so the import looked
      complete, and `unmatched` stayed empty while three of eleven models were
      untraceable. An export carrying characteristics is still the player's
      roster, but it is not a line this app can reason about, so it is named.
    */
    if (!matchedProfile) {
      unmatched.push(sel.customName || selectionName);
      return;
    }
    const baseProfileId = matchedProfile.id;

    units.push({
      id: `u-imp-${Date.now()}-${idx}`,
      customName: sel.customName || selectionName,
      baseProfileId,
      profileSnapshot: {
        id: baseProfileId,
        name: baseProfileName,
        factionId,
        category,
        /*
          The ENTRY's cost, not this model's total.

          `totalUnitCost` includes every weapon, upgrade and injury on the
          line, so two Jabirean Alchemists off the same profile came in at 194
          and 130. `UnitProfile.baseCost` is read as the entry's own price by
          the recruit sheet and by the validator, both of which then add gear
          on top — so a total here is counted twice.
        */
        baseCost: matchedProfile.baseCost,
        stats: { ...resolvedStats, keywords: catNames },
        innateAbilities: (sel.profiles || [])
          .filter((p) => p.typeName === 'Ability' && Boolean(p.name))
          .map((a) => ({
            // `a.name` is non-null by the filter above; the id falls back to it
            // because a `.ros` export often carries no profile id at all.
            id: a.id || a.name!,
            name: a.name!,
            description: a.characteristics?.find((c) => c.name === 'Description')?.$text || '',
          }))
      },
      equippedWeapons,
      equippedArmour,
      equippedEquipment,
      specialUpgrades,
      xp,
      advancements,
      injuries,
      /* Absent rather than empty where the roster carried none: an empty list
         and no list are the same thing to every reader, and absent is what a
         model with no Skills on its sheet actually has. */
      ...(skills.length ? { skills } : {}),
      /*
        And the rolls those Skills used up (review round 1, finding F).

        `advancementRollsDue` counts the Experience track's circles the model
        has passed and subtracts the rolls it has TAKEN — and import never
        incremented that, so importing the owner's September export handed
        Kasim, who already held three Skills at 6 Experience, two more
        Advancement Rolls, and the warband eight. A Skill on the roster is a
        roll that was made, wherever it was made.

        A plain count, because this builds the model from scratch: NewRecruit
        records no count of rolls taken, so the Skills on the sheet are the
        whole of what the roster says about them.
      */
      ...(skills.length ? { advancementRolls: skills.length } : {}),
      ...(injuryRecords.length ? { injuryRecords } : {}),
      isDead: false,
      totalCost: totalUnitCost,
      currentWounds: maxHp,
      maxWounds: maxHp,
      bloodMarkers: 0,
      status: 'Active',
      hasActedThisTurn: false
    });
  });

  /*
    An import is the player's roster and nothing else.

    This used to run `enrichUnitWithLore` over every model and, for any warband
    whose faction was iron-sultanate or whose NAME merely contained "qarn" or
    "sultanate", hand it one specific player's lore, motto, patron and
    chronicle. It was not hypothetical: a second player's warband reached
    production carrying all four, byte-identical to the file's, plus that
    player's biographies on three of its models.
  */
  return {
    warband: {
      id: `wb-${Date.now()}`,
      name: warbandName,
      factionId,
      variantId,
      ducatLimit: ducatsLimit,
      treasuryDucats: 0,
      gloryPoints,
      units,
      armoryStash,
      chronicleLog: [],
      /* Kept on the Warband, not just returned: the builder's Book of Golems
         action is offered on the strength of it, and until GOLEM-1 nothing
         persisted it at all. */
      campaignRules,
      /* The same grants with their rules text and provenance, which is what the
         Roster Sheet prints beside each one. `campaignRules` stays the names —
         two records of one subtree, neither derived from the other, because a
         name the app cannot place is still a name the roster stated. */
      rewards: grants,
      /* Only where it resolved against `dataset.patrons`. An unresolvable one is
         left unset, which reads as the gap it is rather than as a Patron whose
         Skills are empty. */
      ...(patron ? { patron } : {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    unmatched,
    campaignRules,
    golem: markGolem(dataset, campaignRules, units),
  };
}

/**
 * Mark the model the Book of Golems created, where the roster can say which.
 *
 * The decision is `golemOnImport`'s — which model fits the grant is a rules
 * question and belongs in `rules/golem.ts`. This does the one thing a rules
 * module must not: it writes `grantedBy` onto the model.
 *
 * Mutates the array it is given, which is this function's own freshly built
 * list and nothing else. Where the grant cannot resolve to exactly one model
 * it marks NOTHING and passes the reason back, because a guess here would
 * hand a player a free 50-Ducat allowance on the wrong model and never say so.
 */
function markGolem(
  dataset: Dataset | null | undefined,
  campaignRules: readonly string[],
  units: ActiveUnit[],
): ImportResult['golem'] {
  const verdict = golemOnImport(dataset, campaignRules, units as never);
  if (verdict.index != null && units[verdict.index]) {
    units[verdict.index] = { ...units[verdict.index], grantedBy: GOLEM_GRANTED_BY };
  }
  return { markedIndex: verdict.index, reason: verdict.reason };
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
function xmlSelectionToJson(node: XmlSelection): NrSelection {
  /** One or many or absent, as a list. fast-xml-parser gives all three. */
  const arr = <T,>(x: T | T[] | undefined): T[] =>
    (x == null ? [] : Array.isArray(x) ? x : [x]);
  return {
    name: node['@_name'],
    customName: node['@_customName'],
    entryId: node['@_entryId'],
    type: node['@_type'],
    number: node['@_number'] != null ? Number(node['@_number']) : undefined,
    /*
      `group` where the export states one. A BattleScribe `.ros` carries
      `entryGroupId` — a GUID with no name behind it in the roster file — so
      this is usually absent and the profile type decides instead.
    */
    group: node['@_group'],
    costs: arr(node.costs?.cost).map((c) => ({
      name: c['@_name'],
      value: Number(c['@_value'] ?? 0),
    })),
    categories: arr(node.categories?.category).map((c) => ({ name: c['@_name'] })),
    profiles: arr(node.profiles?.profile).map((pr) => ({
      id: pr['@_id'],
      name: pr['@_name'],
      typeName: pr['@_typeName'],
      characteristics: arr(pr.characteristics?.characteristic).map((ch) => ({
        name: ch['@_name'],
        /*
          `String(...)`, and it is load-bearing.

          fast-xml-parser coerces text content that looks numeric, so a
          characteristic reading `2` arrives as the NUMBER 2 while
          `NrCharacteristic.$text` is declared `string`. `XMLParser` returns
          `any`, so the cast at the top of `parseNewRecruitXml` let that
          through unchecked — and the first `.toLowerCase()` on a statline
          threw inside `parseNewRecruitJson`.

          Which was silent, and total: `importNewRecruitRoster` catches that
          throw and falls through to the PLAIN-TEXT parser, which scans the
          raw XML for anything spelled like a unit name. Every `.ros` import
          produced a warband assembled out of catalogue names — twenty-two
          models for a thirteen-model roster, none with the player's own
          names, including four factions' entries the roster never had.
        */
        $text: String(ch['#text'] ?? ''),
      })),
    })),
    selections: arr(node.selections?.selection).map(xmlSelectionToJson),
  };
}

function parseNewRecruitXml(
  xmlContent: string, allUnits: UnitProfile[], dataset?: Dataset,
): ImportResult {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['selection', 'profile', 'cost', 'characteristic', 'category'].includes(name)
  });

  /*
    The one cast in this file, and it is at the library boundary: XMLParser is
    declared to return `any`, so something has to say what the document is.
    Naming the shape here rather than letting `any` spread is the whole point —
    every field read below is checked against `XmlRoster` from this line on.
  */
  const parsed = parser.parse(xmlContent) as {
    roster?: XmlRoster; gameSystem?: XmlRoster;
  } & XmlRoster;
  const roster: XmlRoster = parsed.roster || parsed.gameSystem || parsed;

  const forceNode = roster.forces?.force;
  const force = Array.isArray(forceNode) ? forceNode[0] : forceNode;
  const rawSelections =
    force?.selections?.selection ?? roster.selections?.selection ?? [];

  /*
    Handed to the JSON parser rather than walked again here.

    That is also why this path reads no `Campaign Rules` subtree of its own:
    the converted document carries it, and the JSON parser reads it there.
    A second read here would be a second answer to the same question.

    That parser reads a selection's CHILDREN — weapons, armour, equipment,
    Alchemical Formulae, Experience, advancements and injuries — and this one
    never did. A `.ros` import produced models carrying nothing at all.
  */
  return parseNewRecruitJson({
    roster: {
      name: roster['@_name'] || 'Imported Roster XML',
      gameSystemName: roster['@_gameSystemName'],
      costLimits: (Array.isArray(roster.costLimits?.cost) ? roster.costLimits.cost : [])
        .map((c: XmlCost) => ({ name: c['@_name'], value: Number(c['@_value'] ?? 0) })),
      costs: (Array.isArray(roster.costs?.cost) ? roster.costs.cost : [])
        .map((c: XmlCost) => ({ name: c['@_name'], value: Number(c['@_value'] ?? 0) })),
      forces: [{
        name: force?.['@_name'],
        catalogueName: force?.['@_catalogueName'],
        selections: (Array.isArray(rawSelections) ? rawSelections : [rawSelections])
          .filter(Boolean)
          .map(xmlSelectionToJson),
      }],
    },
  }, allUnits, dataset);
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
    /* A plain-text roster carries no Campaign Rules subtree to read, so the
       grant cannot be found and nothing is marked. */
    campaignRules: [],
  };
}
