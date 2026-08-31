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
    /*
      `all=true` is the public Warband Directory, which is a deliberate feature.
      Anything else is "my warbands", and for a signed-out caller that is an
      empty list.

      It used to be the opposite. The where clause was
      `(!fetchAll && userId) ? { userId } : {}`, so with no session `userId` was
      undefined and the query collapsed to `{}` — a signed-out visitor was
      served EVERY warband in the database. The client then merged them into
      local storage as its own and pushed them back. That is how a visitor
      ended up owning other people's rosters.
    */
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

    // No `all=true` and no resolved user: nothing is yours, so nothing comes
    // back. Never the unfiltered table.
    if (!fetchAll && !userId) {
      return NextResponse.json({ warbands: [] });
    }

    const warbands = await prisma.warband.findMany({
      where: fetchAll ? {} : { userId },
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
        // When the player last changed the roster, as against when the row was
        // last written. The sync merge compares this and nothing else — see
        // services/sync.ts for why `updatedAt` could not do the job.
        editedAt: wb.editedAt ? wb.editedAt.toISOString() : undefined,
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
    const userId = (session?.user as any)?.id;
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const isAdmin = isUserAdmin(userEmail);
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
      snapshots,
      editedAt
    } = body;

    if (!name || !factionId) {
      return NextResponse.json({ error: 'Missing required fields: name and factionId are required' }, { status: 400 });
    }

    /*
      Signing in is what enables the cloud. Without it the app is local-only,
      which is a supported way to use it — not a reason to invent an owner.

      This used to upsert a shared `commander@trenchline.org` account and file
      every anonymous warband under it, so unrelated visitors accumulated in one
      bucket and, with the old GET, read each other's rosters back out.
    */
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
      return NextResponse.json(
        { error: 'Sign in to sync a warband to the cloud. Your roster is saved on this device either way.' },
        { status: 401 }
      );
    }

    const warbandId = id || `wb-${Date.now()}`;

    // Check existing warband ownership if updating
    const existingWarband = await prisma.warband.findUnique({
      where: { id: warbandId }
    });

    if (existingWarband && existingWarband.userId && existingWarband.userId !== effectiveUserId && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only edit and update your own warbands.' },
        { status: 403 }
      );
    }

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
        // The client's edit time, not the server's write time. `updatedAt` is
        // Prisma's `@updatedAt` and is rewritten on every push, which is
        // exactly why it could not be the field the merge compares.
        editedAt: editedAt ? new Date(editedAt) : undefined,
        userId: existingWarband ? existingWarband.userId : effectiveUserId,
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
        editedAt: editedAt ? new Date(editedAt) : undefined,
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
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const isAdmin = isUserAdmin(userEmail);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing warband id parameter' }, { status: 400 });
    }

    // Resolve userId if needed
    if (!userId && userEmail) {
      const dbUser = await prisma.user.findUnique({ where: { email: userEmail } });
      if (dbUser) userId = dbUser.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Sign in to delete a warband from the cloud.' },
        { status: 401 }
      );
    }

    const existingWarband = await prisma.warband.findUnique({ where: { id } });
    if (!existingWarband) {
      return NextResponse.json({ success: true, deletedId: id });
    }

    if (existingWarband.userId && existingWarband.userId !== userId && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only delete your own warbands.' },
        { status: 403 }
      );
    }

    await prisma.warband.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('Error deleting warband:', err);
    return NextResponse.json({ error: 'Failed to delete warband' }, { status: 500 });
  }
}
