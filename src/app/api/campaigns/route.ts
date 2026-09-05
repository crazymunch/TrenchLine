import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { limitAccountRoute } from '@/lib/api/rateLimit';
import { badRequest, handle, notFound } from '@/lib/api/http';
import { readAndParse, id, text, count } from '@/lib/api/parse';
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

const Body = z.discriminatedUnion('action', [CreateCampaign, ClaimTerritory]);

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
