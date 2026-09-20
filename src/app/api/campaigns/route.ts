import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { limitAccountRoute } from '@/lib/api/rateLimit';
import { badRequest, conflict, handle, notFound } from '@/lib/api/http';
import { readAndParse, id, text, count, boundedJson } from '@/lib/api/parse';
import {
  requireActor, requireCampaignAccess, requireCampaignWarband, requireOwnedWarband,
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

/**
 * What a campaign returns to someone who is in it.
 *
 * `admin` is a NAME and nothing else. A member's device needs to say who runs
 * the campaign — the hub prints it — and `adminId` is a cuid that names
 * nobody. Selecting the whole user would hand every member the organiser's
 * email address, which is the leak the warband directory's `creatorName`
 * fallback exists to avoid; the display name is what other players already
 * see each other by.
 */
const FULL = {
  members: true, territories: true, matches: true,
  admin: { select: { name: true } },
} as const;

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

/*
  There is no starting map here any more.

  `STARTING_TERRITORIES` gave every new cloud campaign the same four
  territories — `North Trench Sector A-1`, `Shrine of the Weeping Martyr`,
  `The Iron Foundry Bunker`, `Dead Man's Crater (Center)` — scaffolding the app
  invented, on a campaign the player had just named themselves. They were not
  the map of anything: the classic framework is played on the twelve world
  theatres and Carcass Front on its 32 published zones, so whichever framework
  the campaign turned out to be, these four were wrong and had to be replaced.

  The framework supplies the map, at the moment of creation, in the one place
  that knows which framework was chosen — `createCampaign` in
  `src/store/slices/campaign.ts`. A campaign created through this route has no
  territories until its map is published up or a territory is claimed.

  It also restores the premise `scripts/clear-example-campaigns.mjs` is built
  on. That script offers a campaign for deletion when it carries exactly those
  four names and has no matches, on the stated grounds that "the old API"
  created them — which stayed false for as long as this route went on making
  new ones. It is true again now.
*/

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

/**
 * Spend an invite code: put one of your warbands into somebody's campaign.
 *
 * The code has had a generator worth guessing at, a preview endpoint and a
 * rate limit since AUTH-3, and nothing that consumed it. An organiser could
 * publish a campaign and hand out a code that did nothing — half a feature,
 * and the half that looks finished from the outside.
 *
 * **What comes from the body, and what does not.** The code and the warband
 * are the caller's to choose. `warbandName` and `factionId` are read off the
 * warband row after ownership is verified, never taken from the request: they
 * are what the campaign table displays, and a member who could type them could
 * field a Heretic Legions roster listed as New Antioch.
 *
 * `playerName` IS accepted, and that is not the same mistake `claim_territory`
 * made. There the body named who an ACTION was attributed to, so it could
 * credit anyone. Here it is a label on the caller's own membership row and
 * nowhere else — people use a nickname at a table, and the account's display
 * name is a poor substitute for one. It defaults to the account's name.
 */
const JoinCampaign = z.object({
  action: z.literal('join'),
  inviteCode: text(64).trim().min(1),
  warbandId: id(),
  playerName: text(60).trim().min(1).optional(),
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

const Body = z.discriminatedUnion('action',
  [CreateCampaign, PublishCampaign, JoinCampaign, ClaimTerritory]);

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
            The client's map, verbatim. Not merged with anything and not
            topped up to a minimum: a campaign that has been played on a device
            has the map it has, and adding territories nobody put there would
            be the app inventing part of someone's campaign. The `create`
            action no longer builds four of its own either — see the note above
            where `STARTING_TERRITORIES` used to be.
          */
          territories: { create: body.territories },
        },
        include: FULL,
      });
      return NextResponse.json({ campaign, alreadyPublished: false }, { status: 201 });
    }

    if (body.action === 'join') {
      const actor = await requireActor();

      /*
        Limited on the same bucket as the preview, and by IP.

        A join is a code guess with a side effect, so it must not be the
        cheaper way to walk the space: 75 bits is only unguessable while
        somebody has to pay for each attempt.
      */
      const limited = limitAccountRoute('invite', req.headers, actor.userId);
      if (limited) return limited;

      const campaign = await prisma.campaign.findUnique({
        where: { inviteCode: body.inviteCode },
        select: { id: true },
      });
      /*
        The same message the preview gives, deliberately. A join that failed
        differently for "no such code" and "code exists, something else was
        wrong" would answer the prober's question for them.
      */
      if (!campaign) return notFound('No campaign has that invite code.');

      // Ownership before anything is read off the warband.
      await requireOwnedWarband(body.warbandId, actor);
      const warband = await prisma.warband.findUnique({
        where: { id: body.warbandId },
        select: { name: true, factionId: true },
      });
      if (!warband) return notFound();

      /*
        Already in, two ways, and they are not the same answer.

        The SAME warband is the retry this endpoint has to survive: a lost
        response must not make a second membership, and the unique constraint
        on `[campaignId, warbandId]` would turn one into a 500. So it returns
        the campaign, exactly as a first success does.

        A DIFFERENT warband is a person trying to field two rosters in one
        campaign. That is a rules question with an answer — one player, one
        warband — so it is refused with a message that says which, rather than
        quietly adding a second row nobody would notice until the standings
        listed them twice.
      */
      const mine = await prisma.campaignMember.findFirst({
        where: { campaignId: campaign.id, userId: actor.userId },
        select: { warbandId: true },
      });
      if (mine && mine.warbandId !== body.warbandId) {
        return conflict('You already have a warband in that campaign.');
      }

      if (!mine) {
        await prisma.campaignMember.create({
          data: {
            campaignId: campaign.id,
            userId: actor.userId,
            warbandId: body.warbandId,
            /*
              The account's name when the caller did not choose one. Not the
              email address: the campaign table is shown to every other player
              in it, and an address is not a display name — that is the same
              leak the warband directory's `creatorName` fallback closed.
            */
            playerName: body.playerName ?? actor.email?.split('@')[0] ?? 'Crusade Commander',
            warbandName: warband.name,
            factionId: warband.factionId,
          },
        });
      }

      /*
        The membership is re-checked before the campaign is returned, rather
        than the write's own result being trusted. The caller is a member now,
        so `FULL` is theirs to see — and going through the same policy every
        other read uses means there is no second definition of what a member
        may see, written here, that could drift from the one in `policy.ts`.
      */
      await requireCampaignAccess(campaign.id, 'member');
      const joined = await prisma.campaign.findUnique({
        where: { id: campaign.id },
        include: FULL,
      });
      return NextResponse.json({ campaign: joined, alreadyMember: Boolean(mine) },
        { status: mine ? 200 : 201 });
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
