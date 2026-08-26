import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const id = searchParams.get('id');

    if (code) {
      const campaign = await prisma.campaign.findUnique({
        where: { inviteCode: code },
        include: {
          members: true,
          territories: true,
          matches: true,
        },
      });
      return NextResponse.json({ campaign });
    }

    if (id) {
      const campaign = await prisma.campaign.findUnique({
        where: { id },
        include: {
          members: true,
          territories: true,
          matches: true,
        },
      });
      return NextResponse.json({ campaign });
    }

    const campaigns = await prisma.campaign.findMany({
      include: {
        members: true,
        territories: true,
        matches: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({ campaigns });
  } catch (err: any) {
    console.error('Error fetching campaign:', err);
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const body = await req.json();

    const { action } = body;

    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const defaultUser = await prisma.user.upsert({
        where: { email: 'commander@trenchline.org' },
        update: {},
        create: {
          email: 'commander@trenchline.org',
          name: 'Crusade Commander',
        },
      });
      effectiveUserId = defaultUser.id;
    }

    // ACTION: Create new campaign
    if (action === 'create') {
      const { name, maxWarbandDucats, gloryVictoryThreshold } = body;

      const campaign = await prisma.campaign.create({
        data: {
          name: name || 'New Trench Crusade Campaign',
          inviteCode: `TRENCH-${Math.floor(1000 + Math.random() * 9000)}`,
          adminId: effectiveUserId,
          maxWarbandDucats: maxWarbandDucats || 700,
          gloryVictoryThreshold: gloryVictoryThreshold || 25,
          territories: {
            create: [
              {
                name: 'North Trench Sector A-1',
                type: 'Trench Line',
                perk: '+5 Ducats supply bonus per round',
                description: 'Heavily fortified firing step overlooking the crater field.',
              },
              {
                name: 'Shrine of the Weeping Martyr',
                type: 'Ruined Shrine',
                perk: 'Reroll 1 failed Morale check per match',
                description: 'Shattered marble chapel providing divine reassurance.',
              },
              {
                name: 'The Iron Foundry Bunker',
                type: 'Munitions Bunker',
                perk: 'Free Frag Grenade in Warband Stash after each game',
                description: 'Underground armory depot filled with unexploded ordinance.',
              },
              {
                name: "Dead Man's Crater (Center)",
                type: "No Man's Land",
                perk: '+2 Glory on Victory when defending',
                description: 'Contested central wasteland strewn with barbed wire and ruined tanks.',
              },
            ],
          },
        },
        include: {
          members: true,
          territories: true,
          matches: true,
        },
      });

      return NextResponse.json({ campaign });
    }

    // ACTION: Claim territory
    if (action === 'claim_territory') {
      const { territoryId, warbandId, playerName } = body;
      const updated = await prisma.territoryNode.update({
        where: { id: territoryId },
        data: {
          controlledByWarbandId: warbandId,
          controlledByPlayerName: playerName,
        },
      });
      return NextResponse.json({ territory: updated });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in campaign endpoint:', err);
    return NextResponse.json({ error: 'Failed to process campaign action' }, { status: 500 });
  }
}
