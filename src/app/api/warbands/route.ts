import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isUserAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const isAdmin = isUserAdmin(userEmail);

    const { searchParams } = new URL(req.url);
    const fetchAll = searchParams.get('all') === 'true' || isAdmin;

    // If userId not found by session.id, look up user by email
    if (!userId && userEmail) {
      const dbUser = await prisma.user.findUnique({
        where: { email: userEmail }
      });
      if (dbUser) {
        userId = dbUser.id;
      }
    }

    // Claim default or orphaned warbands if user is admin
    if (userId && isAdmin) {
      await prisma.warband.updateMany({
        where: {
          OR: [
            { id: 'wb-al-qarn' },
            { name: { contains: 'Al-Qarn' } },
            { name: { contains: 'Bayt al-Nahas' } }
          ]
        },
        data: {
          userId
        }
      });
    }

    const warbands = await prisma.warband.findMany({
      where: (!fetchAll && userId) ? { userId } : {},
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        campaignMembers: {
          select: {
            campaignId: true,
            glory: true,
            rating: true,
            wins: true,
            losses: true,
            draws: true,
            treasury: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
    });

    const mappedWarbands = warbands.map((wb: any) => {
      let parsedMetadata: any = {};
      let rawNotes = wb.notes || '';
      
      if (rawNotes.startsWith('{') && rawNotes.endsWith('}')) {
        try {
          parsedMetadata = JSON.parse(rawNotes);
          rawNotes = parsedMetadata.rawNotes || '';
        } catch {
          // Keep rawNotes as is
        }
      }

      return {
        id: wb.id,
        name: wb.name,
        factionId: wb.factionId,
        ducatLimit: wb.ducatLimit,
        treasuryDucats: wb.treasuryDucats,
        gloryPoints: wb.gloryPoints,
        units: wb.units,
        armoryStash: wb.armoryStash,
        notes: rawNotes,
        lore: parsedMetadata.lore || undefined,
        motto: parsedMetadata.motto || undefined,
        patron: parsedMetadata.patron || undefined,
        chronicleLog: parsedMetadata.chronicleLog || undefined,
        snapshots: parsedMetadata.snapshots || undefined,
        creatorId: wb.userId,
        creatorName: wb.user?.name || wb.user?.email || 'Crusade Commander',
        campaignMembers: wb.campaignMembers,
        createdAt: wb.createdAt.toISOString(),
        updatedAt: wb.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ warbands: mappedWarbands });
  } catch (err: any) {
    console.error('Error fetching warbands:', err);
    return NextResponse.json({ error: 'Failed to fetch warbands', warbands: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const body = await req.json();

    const { 
      id, 
      name, 
      factionId, 
      ducatLimit, 
      treasuryDucats, 
      gloryPoints, 
      units, 
      armoryStash, 
      notes,
      lore,
      motto,
      patron,
      chronicleLog,
      snapshots
    } = body;

    if (!name || !factionId) {
      return NextResponse.json({ error: 'Missing required fields: name and factionId are required' }, { status: 400 });
    }

    // Resolve or upsert user in database
    let effectiveUserId = userId;
    if (!effectiveUserId && userEmail) {
      const user = await prisma.user.upsert({
        where: { email: userEmail },
        update: {},
        create: {
          email: userEmail,
          name: session?.user?.name || userEmail.split('@')[0],
        }
      });
      effectiveUserId = user.id;
    }

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

    const warbandId = id || `wb-${Date.now()}`;

    // Pack metadata (lore, motto, patron, chronicleLog, snapshots) into notes JSON
    const metadataPayload = JSON.stringify({
      rawNotes: notes || '',
      lore: lore || '',
      motto: motto || '',
      patron: patron || '',
      chronicleLog: chronicleLog || [],
      snapshots: snapshots || []
    });

    const warband = await prisma.warband.upsert({
      where: { id: warbandId },
      update: {
        name,
        factionId,
        ducatLimit: Number(ducatLimit) || 700,
        treasuryDucats: Number(treasuryDucats) || 0,
        gloryPoints: Number(gloryPoints) || 0,
        units: units || [],
        armoryStash: armoryStash || [],
        notes: metadataPayload,
        userId: effectiveUserId,
      },
      create: {
        id: warbandId,
        name,
        factionId,
        ducatLimit: Number(ducatLimit) || 700,
        treasuryDucats: Number(treasuryDucats) || 0,
        gloryPoints: Number(gloryPoints) || 0,
        units: units || [],
        armoryStash: armoryStash || [],
        notes: metadataPayload,
        userId: effectiveUserId,
      },
    });

    return NextResponse.json({ warband });
  } catch (err: any) {
    console.error('Error saving warband to PostgreSQL:', err);
    return NextResponse.json({ error: 'Failed to save warband', details: err?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing warband id parameter' }, { status: 400 });
    }

    await prisma.warband.deleteMany({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('Error deleting warband:', err);
    return NextResponse.json({ error: 'Failed to delete warband' }, { status: 500 });
  }
}
