import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { limitAccountRoute } from '@/lib/api/rateLimit';
import { badRequest, conflict, handle, notFound } from '@/lib/api/http';
import { readAndParse, id, text, count, boundedJson } from '@/lib/api/parse';
import {
  requireActor, requireCampaignAccess, requireCampaignWarband,
} from '@/lib/api/policy';

/**
 * Campaigns.
 *
 * This route had no authorization at all. `GET` returned any campaign by ID or
 * invite code, and with no selector returned the ten most recent — members,
 * territories and matches included — to any caller on the internet. `POST`
 * gave signed-out callers a shared identity to write as, and its
 * `claim_territory` action updated **any** territory ID with no session, no
 * membership check, no campaign-admin check, and no verification that the
 * warband being planted belonged to the caller or was even in that campaign.
 *
 * Every operation now names the role it needs, and `src/lib/api/policy.ts`
 * decides. A campaign the caller may not see is a 404, not a 403: a 403
 * confirms it exists.
 */

/**
 * The invite code.
 *
 * It used to be `TRENCH-${1000 + Math.random() * 9000}` — nine thousand
 * possibilities, from a generator that is not for anything security-bearing.
 * A capability that grants entry to a campaign has to be worth guessing at,
 * and 9,000 tries is not a guess, it is a loop.
 *
 * 15 base32 characters from `randomBytes` is ~75 bits. Crockford's alphabet
 * omits I, L, O and U so a code can be read aloud and typed back.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 15;

function inviteCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `TRENCH-${out}`;
}

/** What a campaign returns to someone who is in it. */
const FULL = { members: true, territories: true, matches: true } as const;

/**
 * What an invite code returns to someone who is not in it yet.
 *
 * A name and a size, so a player can tell they have the right campaign before
 * they join. Not the members, not the map, not the match history: holding an
 * invite code is not membership, and the code is the one thing about a
 * campaign that travels through channels nobody here controls.
 */
const PREVIEW = {
  id: true, name: true, status: true, currentTurn: true,
  maxWarbandDucats: true, gloryVictoryThreshold: true,
  _count: { select: { members: true } },
} as const;

export async function GET(req: NextRequest) {
  return handle('campaigns.GET', async () => {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const campaignId = searchParams.get('id');

    /*
      An invite lookup is the one read that does not require membership —
      that is what an invite is for — so it returns the preview only, and
      joining is a separate, explicit act.
    */
    if (code) {
      /*
        Limited by IP. An invite code is short enough to guess given enough
        attempts, and this is the one read that needs no membership — so it is
        the surface that would be walked.

        No subject: the code names a campaign the caller may have no
        relationship with, and keying on it would let anyone lock a real
        invite out of use.
      */
      const limited = limitAccountRoute('invite', req.headers, null);
      if (limited) return limited;

      const campaign = await prisma.campaign.findUnique({
        where: { inviteCode: code },
        select: PREVIEW,
      });
      return campaign ? NextResponse.json({ campaign }) : notFound('No campaign has that invite code.');
    }

    if (campaignId) {
      await requireCampaignAccess(campaignId, 'member');
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: FULL,
      });
      return NextResponse.json({ campaign });
    }

    /*
      The list is the caller's own campaigns. It used to be "the ten most
      recent campaigns on this server, in full, to anybody".
    */
    const actor = await requireActor();
    const campaigns = await prisma.campaign.findMany({
      where: {
        OR: [{ adminId: actor.userId }, { members: { some: { userId: actor.userId } } }],
      },
      include: FULL,
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({ campaigns });
  });
}

/**
 * The starting map.
 *
 * Four fixed territories, as before. These are the app's own scaffolding for a
 * new campaign rather than anything the rulebook publishes, which is why they
 * are here and not in the generated dataset.
 *
 * And why every `perk` is empty: each carried an invented mechanical effect
 * (`+5 Ducats supply bonus per round`, `+2 Glory on Victory when defending`)
 * shown in the campaign hub as a "Strategic Territory Perk" beside rules the
 * pipeline derives, with nothing to tell a player which was which. See
 * `src/store/seed.ts` for the same fix on the twelve world theatres.
 */
const STARTING_TERRITORIES = [
  {
    name: 'North Trench Sector A-1',
    type: 'Trench Line',
    perk: '',
    description: 'Heavily fortified firing step overlooking the crater field.',
  },
  {
    name: 'Shrine of the Weeping Martyr',
    type: 'Ruined Shrine',
    perk: '',
    description: 'Shattered marble chapel providing divine reassurance.',
  },
  {
    name: 'The Iron Foundry Bunker',
    type: 'Munitions Bunker',
    perk: '',
    description: 'Underground armory depot filled with unexploded ordinance.',
  },
  {
    name: "Dead Man's Crater (Center)",
    type: "No Man's Land",
    perk: '',
    description: 'Contested central wasteland strewn with barbed wire and ruined tanks.',
  },
];

const CreateCampaign = z.object({
  action: z.literal('create'),
  name: text(120).trim().min(1).optional(),
  /* Bounded rather than `|| 700`, which turned a deliberate 0 into 700. */
  maxWarbandDucats: count(100_000).optional(),
  gloryVictoryThreshold: count(1_000).optional(),
}).strict();

/**
 * The largest map this will accept.
 *
 * Not a round number picked for comfort. The biggest map the app can build is
 * the published Carcass Front campaign's 32 Special Zones; its own classic map
 * is twelve theatres. 64 leaves room for a supplement twice the size of the
 * largest one printed, and still refuses a client that has decided to send
 * ten thousand rows.
 */
const MAX_TERRITORIES = 64;

const PublishTerritory = z.object({
  /*
    The id this territory has on the device — `wt-*`, `th-*`, `cf-<slug>`.
    Stable and meaningful, and NOT unique across campaigns, which is why it is
    carried beside the primary key rather than as it.
  */
  localId: id(),
  name: text(120).trim().min(1),
  type: text(60).trim().min(1),
  perk: text(2_000),
  /*
    `published` is accepted HERE and nowhere else.

    The authority table in docs/CAMPAIGN-SYNC.md says a published perk is
    writable by nobody, and `territory.perk` in the sync route refuses one. But
    a Carcass Front map legitimately arrives carrying the book's own Outpost
    Bonuses, and this is the single moment they are written — after which they
    are frozen. Refusing them here would mean publishing a Carcass Front
    campaign silently dropped the rules half of its map.
  */
  perkSource: z.enum(['published', 'campaign']).optional(),
  description: text(2_000),
}).strict();

/**
 * Publish a campaign this app made, under an id the CLIENT minted.
 *
 * `POST /api/campaigns` with `action: 'create'` builds a campaign of the
 * server's own: four fixed territories, no framework, no house rules. A
 * campaign in this app has never been that campaign — twelve theatres or 32
 * published zones, a framework fixed at creation, and perks that know whether
 * a book or the organiser wrote them — so nothing the app made could be
 * represented in the database at all. That is the gap SYNC-2 closes.
 *
 * **The id comes from the client, and that is the point.** Publishing sends
 * the whole map in one request; if the response is lost, the retry must not
 * produce a second campaign. A server-assigned id cannot give that — the
 * client has nothing to retry WITH — and "upsert by name" is how two devices
 * editing one campaign produced two. So the primary key is the idempotency,
 * exactly as `CampaignSyncOp.opId` already is.
 *
 * A uuid rather than free text: it is what the client can mint offline without
 * coordinating, and it is unguessable, which matters because a client-supplied
 * primary key can always be aimed at a row that already exists. Aiming it at
 * someone else's campaign gets a 409 and nothing else — see the handler.
 */
const PublishCampaign = z.object({
  action: z.literal('publish'),
  cloudId: z.string().uuid(),
  name: text(120).trim().min(1),
  framework: z.enum(['classic', 'carcass-front']).optional(),
  houseRules: boundedJson(8 * 1024).optional(),
  currentTurn: count(1_000).optional(),
  maxWarbandDucats: count(100_000).optional(),
  gloryVictoryThreshold: count(1_000).optional(),
  territories: z.array(PublishTerritory).max(MAX_TERRITORIES),
}).strict();

const ClaimTerritory = z.object({
  action: z.literal('claim_territory'),
  territoryId: id(),
  warbandId: id(),
  /*
    `playerName` is no longer taken from the body. It used to be whatever the
    caller typed, so a claim could be attributed to anyone; it is read from the
    campaign membership that the policy check has already verified.
  */
}).strict();

const Body = z.discriminatedUnion('action', [CreateCampaign, PublishCampaign, ClaimTerritory]);

export async function POST(req: NextRequest) {
  return handle('campaigns.POST', async () => {
    const body = await readAndParse(req, Body);

    if (body.action === 'create') {
      const actor = await requireActor();
      const campaign = await prisma.campaign.create({
        data: {
          name: body.name || 'New Trench Crusade Campaign',
          inviteCode: inviteCode(),
          adminId: actor.userId,
          maxWarbandDucats: body.maxWarbandDucats ?? 700,
          gloryVictoryThreshold: body.gloryVictoryThreshold ?? 25,
          territories: { create: STARTING_TERRITORIES },
        },
        include: FULL,
      });
      return NextResponse.json({ campaign }, { status: 201 });
    }

    if (body.action === 'publish') {
      const actor = await requireActor();

      /*
        Already published, or aimed at somebody else's row.

        A client-supplied primary key can always name a row that exists, so
        this is checked before anything is written rather than left to the
        insert to discover. Two outcomes, and they are different:

        - It is the caller's own campaign. This is the retry the id exists to
          make safe — the first attempt landed and the response was lost — so
          the existing campaign is returned unchanged. NOT re-created and not
          re-written: a retry that overwrote the server copy would undo every
          edit made between the two attempts, which is the "last writer wins"
          failure the whole protocol is built to avoid.
        - It is not. 409, with a message that says only that the id is taken.
          Confirming whose it is would turn a guessed uuid into a membership
          oracle, and the campaign routes already answer "not yours" with 404
          for the same reason.
      */
      const existing = await prisma.campaign.findUnique({
        where: { id: body.cloudId },
        select: { id: true, adminId: true },
      });
      if (existing) {
        if (existing.adminId !== actor.userId) {
          return conflict('That campaign id is already in use.');
        }
        const campaign = await prisma.campaign.findUnique({
          where: { id: body.cloudId },
          include: FULL,
        });
        return NextResponse.json({ campaign, alreadyPublished: true });
      }

      /*
        One local id per campaign, checked here as well as by the constraint.

        The unique index is the real guarantee; this exists so a map with a
        duplicate in it comes back as a 400 naming the problem, rather than as
        a 500 from a constraint the caller cannot see.
      */
      const localIds = body.territories.map((t) => t.localId);
      if (new Set(localIds).size !== localIds.length) {
        return badRequest('Two territories in that map share a local id.');
      }

      const campaign = await prisma.campaign.create({
        data: {
          id: body.cloudId,
          name: body.name,
          inviteCode: inviteCode(),
          adminId: actor.userId,
          framework: body.framework,
          houseRules: (body.houseRules ?? undefined) as Prisma.InputJsonValue | undefined,
          currentTurn: body.currentTurn ?? 1,
          maxWarbandDucats: body.maxWarbandDucats ?? 700,
          gloryVictoryThreshold: body.gloryVictoryThreshold ?? 25,
          /*
            The client's map, verbatim. Not merged with STARTING_TERRITORIES
            and not topped up to a minimum: a campaign that has been played on
            a device has the map it has, and adding four territories nobody
            put there would be the app inventing part of someone's campaign.
          */
          territories: { create: body.territories },
        },
        include: FULL,
      });
      return NextResponse.json({ campaign, alreadyPublished: false }, { status: 201 });
    }

    /*
      A claim needs four things to be true, and none of them was checked:
      the caller is signed in, the territory belongs to a campaign they are
      in, the warband is theirs, and that warband is fielded in that campaign.
    */
    const territory = await prisma.territoryNode.findUnique({
      where: { id: body.territoryId },
      select: { id: true, campaignId: true },
    });
    if (!territory) return notFound();

    const { actor } = await requireCampaignAccess(territory.campaignId, 'member');
    await requireCampaignWarband(territory.campaignId, body.warbandId, actor);

    const member = await prisma.campaignMember.findFirst({
      where: { campaignId: territory.campaignId, warbandId: body.warbandId },
      select: { playerName: true },
    });
    if (!member) return badRequest('That warband is not in this campaign.');

    const updated = await prisma.territoryNode.update({
      where: { id: territory.id },
      data: {
        controlledByWarbandId: body.warbandId,
        controlledByPlayerName: member.playerName,
      },
    });
    return NextResponse.json({ territory: updated });
  });
}
