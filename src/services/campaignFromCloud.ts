import type {
  Campaign, CampaignFramework, CampaignHouseRules, CampaignMember,
  MatchRecord, TerritoryNode,
} from '../types/campaign';

/**
 * A campaign the server holds, turned into one this device can play.
 *
 * SYNC-5. Campaign sync has been push-only: `syncCampaignWithCloud` sends an
 * outbox and reads back a version, and `fetchCampaignFromCloud` returns
 * `{ id, version }` and nothing else. So a player who spent an invite code
 * (SYNC-4) got a real membership the organiser could see, and a device that
 * never showed them the campaign.
 *
 * This is the other direction, and it is deliberately a PURE function of the
 * response rather than a method on the store: mapping one shape to another is
 * the part worth testing exhaustively, and it needs no browser, no fetch and
 * no Zustand to do it.
 *
 * ## Rule 2 applies to every field here
 *
 * A response missing a field it should carry is not a campaign with a sensible
 * default — it is a response this code does not understand. `parseCampaign`
 * THROWS on anything structural (no id, no name, members that are not a list)
 * and the caller turns that into a visible failure. The fields it does default
 * are the ones the schema itself makes optional: `framework` is absent on
 * campaigns saved before the choice existed, `houseRules` on the ones that
 * play it straight.
 *
 * The cost of getting this wrong is a campaign that looks like it downloaded
 * and quietly has nobody in it.
 */

/** The territory id THIS DEVICE will use. See the note in the function. */
function territoryId(row: { id: string; localId?: string | null }): string {
  /*
    The local id when the server has one, else the primary key.

    Not cosmetic. The store queues `entityId: territory.id` for every
    `territory.perk` and `territory.claim`, and the sync route resolves that
    against the primary key OR `localId` within the campaign — so either works
    on the way back. Preferring `localId` keeps a pulled copy addressing the
    map by the same strings the organiser's device does (`wt-*`, `th-*`,
    `cf-<slug>`), which is what makes two devices' outboxes describe the same
    territory rather than two.

    A campaign the API created for itself has no `localId`, and there the
    primary key IS what every device knows it by.
  */
  return row.localId ?? row.id;
}

function asString(v: unknown, field: string): string {
  if (typeof v !== 'string' || !v) throw new Error(`the campaign came back without ${field}`);
  return v;
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function asList(v: unknown, field: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(`the campaign came back without ${field}`);
  return v;
}

/** One row of the campaign table. */
function member(raw: unknown, adminId: string): CampaignMember {
  const m = raw as Record<string, unknown>;
  return {
    userId: asString(m.userId, 'a member id'),
    playerName: asString(m.playerName, 'a player name'),
    /*
      Derived from `Campaign.adminId`, not read from the row.

      `CampaignMember` has no admin column — the campaign's creator is the
      admin, and that is a property of the campaign. Trusting a flag on the
      member row would mean the server had to send one, and a client that
      received one could not tell an organiser from a member who had been
      handed a doctored payload.
    */
    isAdmin: m.userId === adminId,
    warbandId: asString(m.warbandId, 'a warband id'),
    warbandName: asString(m.warbandName, 'a warband name'),
    factionId: asString(m.factionId, 'a faction'),
    glory: asNumber(m.glory, 0),
    rating: asNumber(m.rating, 0),
    wins: asNumber(m.wins, 0),
    losses: asNumber(m.losses, 0),
    draws: asNumber(m.draws, 0),
    treasury: asNumber(m.treasury, 0),
  };
}

function territory(raw: unknown): TerritoryNode {
  const t = raw as Record<string, unknown>;
  const perkSource = t.perkSource === 'published' || t.perkSource === 'campaign'
    ? t.perkSource
    : undefined;
  return {
    id: territoryId(t as { id: string; localId?: string | null }),
    name: asString(t.name, 'a territory name'),
    type: asString(t.type, 'a territory type'),
    version: asNumber(t.version, 1),
    controlledByWarbandId: typeof t.controlledByWarbandId === 'string'
      ? t.controlledByWarbandId : undefined,
    controlledByPlayerName: typeof t.controlledByPlayerName === 'string'
      ? t.controlledByPlayerName : undefined,
    perk: typeof t.perk === 'string' ? t.perk : '',
    /*
      Carried, never re-derived. `published` is the book's own Outpost Bonus
      and is writable by nobody; a pulled copy that forgot which perks were
      published would let this device offer to edit one, and the store is where
      that refusal is enforced on the way out.
    */
    perkSource,
    description: typeof t.description === 'string' ? t.description : '',
  };
}

function match(raw: unknown, campaignId: string): MatchRecord {
  const m = raw as Record<string, unknown>;
  return {
    id: asString(m.id, 'a match id'),
    campaignId,
    date: typeof m.date === 'string' ? m.date : '',
    scenarioId: typeof m.scenarioId === 'string' ? m.scenarioId : '',
    scenarioName: typeof m.scenarioName === 'string' ? m.scenarioName : '',
    /* Stored as JSON, so its shape is the writer's. Kept as a list rather than
       validated field by field: this device only displays it. */
    participants: Array.isArray(m.participants) ? m.participants as MatchRecord['participants'] : [],
    narrativeLog: typeof m.narrativeLog === 'string' ? m.narrativeLog : '',
  };
}

/**
 * Turn the API's campaign payload into a local `Campaign`.
 *
 * Throws when the response is not one. The caller — `storage`'s `request` —
 * turns a throw into a `server` failure, which is how a malformed response
 * becomes a message on screen instead of an empty campaign on the map.
 */
export function parseCampaign(raw: unknown): Campaign {
  const c = (raw ?? {}) as Record<string, unknown>;
  const cloudId = asString(c.id, 'an id');
  const adminId = typeof c.adminId === 'string' ? c.adminId : '';

  const members = asList(c.members, 'its members').map((m) => member(m, adminId));

  /*
    The organiser's name, in the order that gets it right most often.

    Their own membership row first — that is a name they chose for THIS
    campaign, and it is what every other player sees them called. Then the
    account's display name, which the API sends for exactly this. Then
    `Commander`, which is what `createCampaign` already puts on a campaign
    made locally: the app's existing word for "no name recorded", not a new
    invention here, and it appears only where a person really has neither.
  */
  const adminMember = members.find((m) => m.userId === adminId);
  const adminAccountName = (c.admin as { name?: unknown } | undefined)?.name;
  const adminName = adminMember?.playerName
    || (typeof adminAccountName === 'string' && adminAccountName ? adminAccountName : '')
    || 'Commander';

  const framework = c.framework === 'classic' || c.framework === 'carcass-front'
    ? c.framework as CampaignFramework
    : undefined;

  return {
    /*
      The cloud id is the local id too.

      A campaign made on this device gets `camp-<timestamp>`; one that arrived
      from the server already has an identifier every device agrees on, and
      minting a second would mean this copy and the organiser's disagree about
      what to call the same campaign in every log and every outbox key.
    */
    id: cloudId,
    cloudId,
    name: asString(c.name, 'a name'),
    inviteCode: typeof c.inviteCode === 'string' ? c.inviteCode : '',
    adminName,
    status: c.status === 'archived' ? 'archived' : 'active',
    framework,
    currentTurn: asNumber(c.currentTurn, 1),
    houseRules: (c.houseRules ?? undefined) as CampaignHouseRules | undefined,
    /* The version this copy matches, so the first operation this device sends
       states the version it was made against rather than guessing 1. */
    version: asNumber(c.version, 1),
    maxWarbandDucats: asNumber(c.maxWarbandDucats, 700),
    gloryVictoryThreshold: asNumber(c.gloryVictoryThreshold, 25),
    members,
    matches: asList(c.matches, 'its matches').map((m) => match(m, cloudId)),
    territories: asList(c.territories, 'its territories').map(territory),
    /*
      Not carried. `Campaign.chronicleLogs` is a JSON column the server keeps
      and no operation writes, so what it holds is whatever a campaign had
      before sync existed. Starting a pulled copy empty is honest; filling it
      from a column nothing maintains would put a history on screen that does
      not match the matches beside it.
    */
    chronicleLogs: [],
  };
}
