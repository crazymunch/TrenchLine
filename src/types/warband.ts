import type { EarnedClaim } from '@/rules/earnedRecruitment';
import type { LedgerEntry, ExplorationEffect } from '@/rules/campaign';
import type { Cost } from './catalogue';

import { UnitProfile, WeaponProfile, ArmourProfile, EquipmentItem } from './rules';

/**
 * How a model or a Warband came to hold something (FD-12 item 2).
 *
 * Five kinds, and the distinction between them is the whole point: a Skill the
 * dice gave is a different record from one a player typed in because their
 * campaign started before this app existed, and a screen that counts
 * Advancement Rolls has to be able to tell.
 *
 *   `advancement`    an Advancement Roll. Carries the game and the 2D6 total.
 *   `trauma`         the Trauma Step. Carries the game and the D66 roll.
 *   `exploration`    an Exploration result. Carries the game and the Location.
 *   `import`         came in from a roster file or another app's export.
 *   `manual`         the player recorded it by hand, in a game the app was
 *                    already keeping. Carries the game.
 *   `manual-pre-app` the player's own record of something that happened BEFORE
 *                    the app held the Warband, with their note.
 *
 * `manual` and `manual-pre-app` are two different claims and were one for a
 * while (review round 1, finding E): every hand entry was written
 * `manual-pre-app`, so a scar a player typed in mid-campaign — because they
 * rolled it at the table rather than in the app — was labelled as predating an
 * app that had been holding the Warband for six games. Which of the two it is
 * is now the player's to say.
 *
 * **Nothing is back-filled with a guess.** An entry written before this field
 * existed has no `source`, and `provenanceOf` reads it as `import` — never as
 * a roll that did not happen. See `src/rules/provenance.ts`.
 */
export type ProvenanceKind =
  | 'advancement'
  | 'trauma'
  | 'exploration'
  | 'import'
  | 'manual'
  | 'manual-pre-app';

export interface Provenance {
  kind: ProvenanceKind;
  /**
   * The campaign game it happened in, where the record knows. Absent on an
   * imported or pre-app entry, which is the honest answer rather than 1.
   */
  game?: number;
  /**
   * The roll that produced it, exactly as it was recorded: `9` for a 2D6
   * Skill, `31` for a D66 injury. A STRING because NewRecruit prints it as
   * one — `Point Blank [9]` — and because a ranged Trauma row (`41-63`) is
   * reached by more than one total.
   */
  roll?: string;
  /** The Exploration Location that granted it, as the book spells it. */
  location?: string;
  /** The player's own words. Only meaningful for the two manual kinds. */
  note?: string;
}

/**
 * An injury the model carries, with how it got it.
 *
 * A parallel record rather than a change to `injuries: string[]`, which is the
 * shape `titles` and `titleRecords` already use on this type: every reader of
 * `injuries` keeps working, and the provenance is available to the ones that
 * ask for it. `injuriesHeld` in `src/rules/provenance.ts` joins the two.
 */
export interface InjuryRecord {
  name: string;
  source?: Provenance;
}

/**
 * Something the WARBAND holds that a rule gave it: an Exploration reward, a
 * Patron, a standing Skill.
 *
 * `Warband.campaignRules` already carries the NAMES the import read out of a
 * roster's `Campaign Rules > Enabled` subtree (GOLEM-1). This carries what the
 * sheet has to print beside each one — the rule's own text and how the Warband
 * came by it — which a bare name cannot.
 *
 * The text is never written here by hand: it is the roster's own printed rules
 * text on an import, or the Exploration Location's text from the dataset.
 */
export interface WarbandReward {
  /** As the source spells it — `Book of Golems`, `Ransacked Alchemist Workshop`. */
  name: string;
  /**
   * The group the source filed it under, where it stated one: NewRecruit's
   * `Exploration Rewards`, `Exploration Skills`, `Patron Selection`. Kept
   * because it is how the Patron is told from the rewards without matching
   * names against a list written here.
   */
  group?: string;
  /** The rule as printed. Absent where the source carried none. */
  text?: string;
  source?: Provenance;
}

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
  /**
   * Skills the model holds, and how each was earned.
   *
   * `source` is FD-12 item 2. A Skill with none reads as `import` — see
   * `provenanceOf` — because that is what a Skill with no record actually is:
   * a name that arrived from somewhere, not a roll anybody made.
   */
  skills?: {
    name: string; category: string; roll?: string; effect?: string;
    source?: Provenance;
  }[];
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
  /**
   * The same injuries, with their provenance (FD-12 item 2).
   *
   * Parallel to `injuries` rather than replacing it, exactly as `titleRecords`
   * is parallel to `titles`: `injuries` is read in a dozen places and by every
   * roster file ever written, and a shape change there would be a migration
   * for no gain. `injuriesHeld` joins them.
   */
  injuryRecords?: InjuryRecord[];
  scars?: { name: string; roll?: string; effect?: string; source?: Provenance }[];
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
   * Killed in the post-battle sequence, with a Re-creation offer outstanding.
   *
   * Two entries let you pay rather than lose the model — Warbands L5324 to
   * L5327 for the Takwin Homunculus, the Book of Golems find for the Golem —
   * and both say the payment happens AFTER the post-battle sequence: "in the
   * following Quartermaster Step" for one, "at any time between battles" for
   * the other. The Quartermaster Step is the builder, not the wizard, so the
   * model cannot go to `fallen` when the wizard closes and cannot simply be
   * alive either. This is that gap, written down.
   *
   * `isDead` stays FALSE while this is set: the model is still on the roster,
   * which is what "you do not have to remove it from your roster" means, and
   * `removeFromRoster` keys on `isDead`. Resolving the offer either clears
   * this field or sets `isDead` and lets the model fall.
   *
   * Absent on every model that has not been killed, and on one killed with no
   * such offer — absent is "nothing outstanding", never "unknown".
   */
  awaitingRecreation?: {
    /** The ability that grants the offer, as printed. */
    ability: string;
    /** What it costs to take. Read from the sentence, not assumed Ducats. */
    cost: Cost;
    /**
     * `quartermaster` lapses when the campaign moves past `sinceGame`;
     * `between-battles` does not lapse at all. The two are printed
     * differently and the difference is the whole of why this is stored
     * rather than recomputed.
     */
    deadline: 'quartermaster' | 'between-battles';
    /** The campaign game the model was killed in, from `campaignGameOf`. */
    sinceGame: number;
  };
  /**
   * The match that killed it, where the record knows.
   *
   * Set when the model moves to `fallen`, so the memorial can say which battle
   * it was and the Chronicle record can be found again. Absent on a model
   * moved by the load-time migration, which has a flag and no battle.
   */
  diedInMatchId?: string;
  /**
   * Sent home rather than killed — the Quartermaster Step's Retire Injured
   * Models (p.123).
   *
   * Set on the way to `fallen`, beside the `isDead` that `removeFromRoster`
   * writes. Both are true of a retired model in the only sense the roster
   * cares about — it is off the roster — and this is what lets a memorial say
   * which of the two happened. A Warband that has lost six models and retired
   * two has lost six, and a screen that cannot tell them apart says eight.
   *
   * Absent on every model that left the roster any other way.
   */
  retired?: boolean;
  /** The campaign game the model was retired in, from `campaignGameOf`. */
  retiredAtGame?: number;
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
  /**
   * What the roster's `Campaign Rules > Enabled` subtree said the Warband has
   * earned — the Book of Golems, a Ransacked Alchemist Workshop, a Reroll.
   *
   * GOLEM-1. The importer has read this subtree since #95 and returned it in
   * `ImportResult`, and the Warband then dropped it on the floor: nothing
   * persisted it, so the moment the import modal closed the app no longer
   * knew the Warband held the Book. The builder's Book of Golems action
   * cannot be offered without it.
   *
   * Names only, exactly as the roster spells them. What each one MEANS is a
   * rules question the rules modules answer — `golemGrant` matches the Book
   * by the sentence its Exploration row prints, never by this string.
   */
  campaignRules?: string[];
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
  /**
   * Which ruleset this warband is built and checked against.
   *
   * RV-1. The app's ruleset was a per-BROWSER setting in `localStorage` and
   * nothing else, so a warband built under TrenchLine Rules and opened on a
   * device set to Latest GitHub was read against the other one silently — a
   * Brazen Bull 15 Ducats cheaper with no explanation, which
   * `docs/RULESET-MODEL.md` §8 says must never happen. The warband now
   * carries its own answer, which is what lets the builder notice the
   * mismatch and offer either to switch the app or to convert the warband.
   *
   * Optional, because every warband saved before this has none — and absent
   * means "not recorded", NOT "the default". A warband with no recorded
   * ruleset shows no mismatch bar, because there is no mismatch to show: we
   * do not know what it was built against, and guessing would put a
   * conversion in front of a player who needs none.
   */
  rulesetId?: string;
  /**
   * Campaign state carried in from another app's record, as that record
   * stated it.
   *
   * CI-1. Trench Companion's share page carries a campaign round and a
   * Campaign Victory Points total. Neither has a home among our own fields
   * and that is deliberate: our CVP is DERIVED from the win/loss/draw record
   * a campaign keeps (`campaignVictoryPoints`), never stored, so writing an
   * imported total into it would mean either inventing a results record to
   * justify the number or having two answers to the same question.
   *
   * So it is kept as what it is — a fact about somebody else's record — and
   * applied to a campaign only when the warband joins one, at which point a
   * person decides what it means. Absent on every warband that was not
   * imported from such a record.
   */
  importedCampaign?: {
    /** Which app the state came from. One today; named so it stays honest. */
    source: 'trench-companion';
    /**
     * Their campaign round at the moment of the import.
     *
     * Optional, and absent where their record did not state one. It used to
     * default to 1, which put a fact about somebody's campaign on the record
     * that their record never asserted — and a player reading it here would
     * take it for their own.
     */
    round?: number;
    /** Their Campaign Victory Points total. Not ours, not derived, not defaulted. */
    victoryPoints?: number;
  };
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
   * Exploration rewards, the Patron and any other standing grant the Warband
   * holds, with the rule's text and how it came by each (FD-12 item 2).
   *
   * `campaignRules` is the names; this is the record. The two are written
   * together by the importer and neither is derived from the other: a name
   * with no matching reward is still a name the roster stated, and a reward
   * whose name the app cannot place is still a rule the player holds.
   */
  rewards?: WarbandReward[];
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

