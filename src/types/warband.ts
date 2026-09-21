import type { EarnedClaim } from '@/rules/earnedRecruitment';
import type { LedgerEntry, ExplorationEffect } from '@/rules/campaign';
import type { Cost } from './catalogue';

import { UnitProfile, WeaponProfile, ArmourProfile, EquipmentItem } from './rules';

export interface EquippedWeapon extends WeaponProfile {
  instanceId: string;
}

export interface EquippedArmour extends ArmourProfile {
  instanceId: string;
}

export interface EquippedEquipment extends EquipmentItem {
  instanceId: string;
}

export interface UnitTitleRecord {
  title: string;
  source: 'user' | 'injury' | 'exploration' | 'deed';
  origin?: string;
  active: boolean;
}

export interface ActiveUnit {
  id: string;
  customName: string;
  baseProfileId: string;
  profileSnapshot: UnitProfile;
  equippedWeapons: EquippedWeapon[];
  equippedArmour: EquippedArmour[];
  equippedEquipment: EquippedEquipment[];
  
  // Progression & Campaign
  xp: number;
  isElite?: boolean;
  /**
   * Legacy free-text progression notes.
   *
   * The post-battle wizard used to write the chosen button's label here —
   * `+1 Melee`, `Eagle Eye (Skill)` — so existing rosters carry strings for
   * advances the game does not have and Skills that do not exist. Nothing
   * writes to it any more; a Skill learned from an Advancement Roll goes to
   * `skills`, which records the table and the roll that produced it.
   *
   * Kept, and still displayed, because it is the player's own record of what
   * they did. Clearing it would be a data change, not a fix.
   */
  advancements: string[];
  skills?: { name: string; category: string; roll?: string; effect?: string }[];
  /**
   * The grant that put this model on the roster, where one did.
   *
   * `'Book of Golems'` for a model created by Exploration 17. It is the
   * model's provenance, not a Keyword: GOLEM is what the model is, and this
   * is how it arrived — which is what the grant's standing restrictions key
   * off, so the same entry recruited out of the Armoury is unaffected by
   * them. Absent on every model that was simply hired.
   */
  grantedBy?: string;
  /**
   * How many Advancement Rolls this model has taken.
   *
   * Its own field rather than `skills.length`, because a model can gain a
   * Skill without an Advancement Roll: a Patron grants them, so do some Glory
   * Items and the `65 Bitter Lessons` Trauma result. Counting Skills would
   * quietly cancel a roll the model had earned. See `advancementRollsDue`.
   */
  advancementRolls?: number;
  injuries: string[];
  scars?: { name: string; roll?: string; effect?: string }[];
  /**
   * **Legacy.** Nothing sets this any more; a dead model is moved to
   * `Warband.fallen` instead.
   *
   * The Trauma Table's `11 Dead` says *"Remove the model and its Battlekit
   * from your Warband Roster"*, and a flag is not a removal: it left the model
   * in `units`, where three readers that did not check it went on counting its
   * Ducats, offering it to the builder and deploying it. Six others did check,
   * which is the shape of a rule enforced by remembering rather than by
   * construction.
   *
   * It stays on the type, and `true` on a loaded roster still means what it
   * meant — that is what moves the model to `fallen` on load.
   */
  /**
   * Sitting this game out, by the player's choice.
   *
   * The Threshold Value caps the Ducats a Force may field and Field Strength
   * caps its models (p.97), and the book is explicit that the ROSTER may
   * exceed both:
   *
   * > Your Warband's Threshold Value and/or its Field Strength may mean that
   * > you cannot take all of the models that are on your Warband Roster. When
   * > this is the case any models you do not use will have to sit the game
   * > out; they will not earn any experience and cannot influence the game in
   * > any way.
   *
   * So this is not an error state and never removes a model. It is the
   * player saying which models they are leaving behind, and it is durable
   * because that choice has to survive closing the app between the list and
   * the game.
   *
   * It does two things elsewhere: Play Mode's default deployment skips it,
   * and the post-battle step starts it ticked as having not taken part —
   * "they will not earn any experience" is the same sentence.
   */
  benched?: boolean;
  isDead: boolean;
  /**
   * The match that killed it, where the record knows.
   *
   * Set when the model moves to `fallen`, so the memorial can say which battle
   * it was and the Chronicle record can be found again. Absent on a model
   * moved by the load-time migration, which has a flag and no battle.
   */
  diedInMatchId?: string;
  totalCost: number; // calculated ducats

  /**
   * A model a rule GAVE the Warband, and the rule that gave it.
   *
   * "…and immediately recruit an Amalgam at no cost." The roster prices every
   * model at its catalogue cost, so without this the free model is charged
   * against the budget and the entitlement is worth nothing
   * (docs/RULES-COVERAGE-AUDIT.md RC-08).
   */
  grantedFree?: string;

  // Special Faction Rules & Fireteams
  fireteam?: string;
  specialUpgrades?: { id: string; name: string; cost: number; category: string }[];

  // Narrative Lore & Chronicle
  lore?: string;
  titles?: string[];
  titleRecords?: UnitTitleRecord[];
  deeds?: string[];
  quote?: string;

  // Tabletop Play Mode transient state
  currentWounds: number;
  maxWounds: number;
  bloodMarkers: number;
  /**
   * BLESSING MARKERS.
   *
   * Optional because every warband saved before this existed has none, and a
   * missing pool and an empty one are the same thing here. Not a mirror of
   * `bloodMarkers`: the book caps Blood at 6 and states no cap for Blessing,
   * and it is the opponent who spends Blood while the controller spends
   * Blessing — see `dataset.markers`.
   */
  blessingMarkers?: number;
  status: 'Active' | 'Downed' | 'Out of Action';
  hasActedThisTurn: boolean;
  notes?: string;
}

export interface StashedItem {
  id: string;
  name: string;
  type: 'Weapon' | 'Armour' | 'Equipment';
  cost: number;
  /**
   * Which currency that `cost` is in.
   *
   * The app prices in two — Ducats and Glory — and this held one number with
   * no label, so the Quartermaster debited Ducats for everything. A Glory
   * Item bought from the Arsenal took its price out of the Strongbox's
   * Ducats and left the Glory untouched: the item was free in the currency
   * it is actually priced in, and paid for in one it is not.
   *
   * Optional, because a stash written before this says nothing — and the
   * honest reading of an unlabelled cost is the one the app was already
   * making. `stashCurrency` applies that default in one place rather than
   * every reader guessing.
   */
  currency?: 'ducats' | 'glory';
  /**
   * What the item cost, both currencies, exactly as the Armoury Table row
   * prints it.
   *
   * `currency` is one discriminator and an Armoury row is not: the same row
   * can carry Ducats and Glory together, and one label cannot say so. This
   * carries the row's own `Cost`, which can.
   *
   * Optional, because a stash written before this has only the single number
   * and its label. `stashPrice` reads both encodings in one place, so no
   * caller has to know which one it is holding.
   */
  price?: Cost;
  quantity: number;
}

/**
 * The currency a stashed item is priced in.
 *
 * Ducats where the item does not say, which is what an older stash means:
 * every item in one was bought with Ducats, because that is all the
 * Quartermaster could spend.
 */
export const stashCurrency = (item: Pick<StashedItem, 'currency'>): 'ducats' | 'glory' =>
  item.currency === 'glory' ? 'glory' : 'ducats';

/**
 * What a stashed item cost, whichever way it was written down.
 *
 * The recorded `price` where there is one; otherwise the single `cost` read
 * in the currency its label names, which is all an older stash says. So a
 * pre-`price` Glory item reads as zero Ducats and `cost` Glory, and a
 * pre-`currency` item reads as `cost` Ducats — which is what the
 * Quartermaster did with it at the time.
 */
export const stashPrice = (
  item: Pick<StashedItem, 'cost' | 'currency' | 'price'>,
): Cost => item.price
  ?? (stashCurrency(item) === 'glory'
    ? { ducats: 0, glory: item.cost }
    : { ducats: item.cost, glory: 0 });

export type StashItem = StashedItem;

export interface WarbandSnapshot {
  id: string;
  timestamp: string;
  label: string; // e.g. "Founding Muster", "Post-Battle 1: Victory vs Sorcerer Zortan"
  type: 'founding' | 'post_battle' | 'recruitment' | 'equipment' | 'manual';
  matchId?: string;
  /**
   * The campaign game this post-battle belongs to.
   *
   * Written from `campaignGameOf` at commit, so "has this member played game
   * N" is answerable — which is what decides whether the campaign may move on
   * (FD-09a / RR-17). Counting snapshots would not do it: a member who joined
   * late has fewer, and one who commits twice would have more.
   *
   * Absent on every snapshot written before this, and read STRICTLY because
   * of it: an old snapshot is not evidence for the current game, so an
   * existing campaign waits for a fresh post-battle rather than advancing the
   * moment this ships.
   */
  campaignGame?: number;
  scenarioName?: string;
  outcome?: 'Victory' | 'Defeat' | 'Draw';
  ducatCost: number;
  treasuryDucats: number;
  gloryPoints: number;
  unitCount: number;
  units: ActiveUnit[];
  /**
   * Models removed from the Roster, and not coming back.
   *
   * *"Remove the model and its Battlekit from your Warband Roster"* (Trauma
   * `11 Dead`, p.101) — and an unransomed capture, which the book executes.
   * They are kept rather than deleted because a campaign's dead are the half
   * of its history that a roster alone cannot tell, and because deleting a
   * player's models on their behalf is a data decision the app does not get to
   * make.
   *
   * **They are not in `units`, and that is the point.** A dead model left in
   * `units` behind a flag is a model every reader has to remember to skip, and
   * three of them did not: the builder summed its Ducats into the Warband
   * total, `toRoster` offered it to the legality engine, and Play Mode put it
   * on the table. Moving it makes those correct without a filter.
   *
   * The Battlekit goes with the model. The book removes both, and the
   * Arsenal does not get the gear back.
   */
  fallen?: ActiveUnit[];
  armoryStash: StashedItem[];
  changesSummary: string[]; // Specific diff bullet points
  notes?: string;
}

export interface Warband {
  id: string;
  name: string;
  factionId: string;
  /**
   * The Warband Variant, e.g. 'the-house-of-wisdom'. Seventeen exist and the
   * app previously had no field for one at all, so every variant rule went
   * unenforced. See docs/RULESET-MODEL.md §7a.
   */
  variantId?: string;
  /**
   * Whether this Warband may hire third-party entries.
   *
   * The app's copy of the catalogues' own "Allow Third-Party Mercenaries?"
   * roster option. Absent or false means no, which is the catalogue's default —
   * those entries are `hidden="true"` until the option is taken.
   */
  allowThirdParty?: boolean;
  /**
   * Recruitment bounds earned in play — see `rules/earnedRecruitment.ts`.
   *
   * Optional because every Warband saved before this existed has claimed none,
   * and a missing list and an empty one are the same thing here.
   */
  earnedRecruitment?: EarnedClaim[];
  campaignId?: string;
  creatorId?: string;
  creatorName?: string;
  /**
   * How this warband's budget is governed.
   *
   *   'campaign'     — the published economy. Starts on the book's 700 Ducats
   *                    and 0 Glory, and the per-game cap comes from the Warband
   *                    Threshold Table rather than from a field anyone edits.
   *   'unrestricted' — the player sets Ducats and Glory. For one-off games,
   *                    imports, and testing a list.
   *
   * Either kind may join a campaign, so this records how the warband was
   * founded, not whether it is allowed in.
   */
  forceMode?: 'campaign' | 'unrestricted';
  /**
   * Every movement of Ducats and Glory, with a reason. The Strongbox is the sum
   * of this rather than a stored total, so a purchase can be reversed before the
   * next game and an admin's catch-up allotment says who granted it.
   */
  ledger?: LedgerEntry[];
  /**
   * Exploration Locations this warband has already found. "You can discover a
   * Location only once during the campaign; if you discover it again, treat the
   * roll as a Pillaged result instead." The loot is still collected.
   */
  explorationDiscoveries?: string[];
  /**
   * Exploration Skills this Warband holds, and the Pot of Manna's standing
   * loot, with what granted each and when.
   *
   * A LIST with repeats, because page 115 says *"You can have multiples of any
   * of the Exploration Skills on this list"* — two Map & Document Bags is two
   * Re-rolls. See `ExplorationEffect`.
   */
  explorationEffects?: ExplorationEffect[];
  /**
   * Only meaningful for 'unrestricted'. A campaign warband's cap is derived, and
   * this is ignored — kept because existing saved warbands carry it.
   */
  ducatLimit: number;
  treasuryDucats: number;
  gloryPoints: number;
  /**
   * Promotion Dice rolled in a row without a Promotion.
   *
   * > If you roll all of the dice without a model being Promoted, then make a
   * > note on your Roster of how many dice you have rolled in a row without
   * > getting a Promotion. Once the total reaches 5 dice, then the next roll
   * > (the 6th one), is automatically considered to be a 6.
   *
   * On the WARBAND, not on a model: the book says "on your Roster", and the
   * count runs across models within a step — a die that misses on one Troop
   * brings the next Troop closer to an automatic Promotion. It also survives
   * the step, so five misses spread over three games still make the sixth die
   * a 6. That is a reading of a sentence that does not say either way, and it
   * is the one that makes the rule mean anything: reset per game, a Warband
   * assigning one or two dice a game would never reach five.
   *
   * Only a Promotion clears it. Absent on a Warband that has never rolled.
   */
  promotionMisses?: number;
  units: ActiveUnit[];
  /**
   * Models removed from the Roster, and not coming back.
   *
   * *"Remove the model and its Battlekit from your Warband Roster"* (Trauma
   * `11 Dead`, p.101) — and an unransomed capture, which the book executes.
   * They are kept rather than deleted because a campaign's dead are the half
   * of its history that a roster alone cannot tell, and because deleting a
   * player's models on their behalf is a data decision the app does not get to
   * make.
   *
   * **They are not in `units`, and that is the point.** A dead model left in
   * `units` behind a flag is a model every reader has to remember to skip, and
   * three of them did not: the builder summed its Ducats into the Warband
   * total, `toRoster` offered it to the legality engine, and Play Mode put it
   * on the table. Moving it makes those correct without a filter.
   *
   * The Battlekit goes with the model. The book removes both, and the
   * Arsenal does not get the gear back.
   */
  fallen?: ActiveUnit[];
  armoryStash: StashedItem[];
  
  // Narrative & House Lore
  lore?: string;
  motto?: string;
  patron?: string;
  chronicleLog?: string[];
  notes?: string;

  // Growth Changelog & History
  snapshots?: WarbandSnapshot[];

  createdAt: string;

  /**
   * When this device last wrote the warband, for any reason.
   *
   * Kept for display. It is NOT what sync compares: the store stamps it on
   * every write, including transient Play Mode state, so it moves during a
   * game without the roster having changed.
   */
  updatedAt: string;

  /**
   * When the player last changed the roster itself — recruited, equipped,
   * renamed, spent, advanced.
   *
   * This is what the cloud merge compares, and the only reason it exists as a
   * separate field is that `updatedAt` could not do the job: the server's copy
   * of it is a *push* time (Prisma rewrites `@updatedAt` on every write), so
   * merely opening the app on a second device made that device's copies look
   * newer than the first device's real edits, and the first device's work lost
   * on the next sync. See `services/sync.ts`.
   *
   * Optional because warbands saved before this field existed do not carry it;
   * `mergeWarbands` falls back to `updatedAt` for those.
   */
  editedAt?: string;
}

