import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      // Return empty or demo warbands if not authenticated
      return NextResponse.json({ warbands: [] });
    }

    const warbands = await prisma.warband.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ warbands });
  } catch (err: any) {
    console.error('Error fetching warbands:', err);
    return NextResponse.json({ error: 'Failed to fetch warbands' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const body = await req.json();

    const { id, name, factionId, ducatLimit, treasuryDucats, gloryPoints, units, armoryStash, notes } = body;

    if (!name || !factionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Default guest user ID if running unauthenticated
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

    const warband = await prisma.warband.upsert({
      where: { id: id || 'temp-id' },
      update: {
        name,
        factionId,
        ducatLimit: ducatLimit || 700,
        treasuryDucats: treasuryDucats || 0,
        gloryPoints: gloryPoints || 0,
        units: units || [],
        armoryStash: armoryStash || [],
        notes,
      },
      create: {
        ...(id ? { id } : {}),
        name,
        factionId,
        ducatLimit: ducatLimit || 700,
        treasuryDucats: treasuryDucats || 0,
        gloryPoints: gloryPoints || 0,
        units: units || [],
        armoryStash: armoryStash || [],
        notes,
        userId: effectiveUserId,
      },
    });

    return NextResponse.json({ warband });
  } catch (err: any) {
    console.error('Error saving warband:', err);
    return NextResponse.json({ error: 'Failed to save warband' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing warband id' }, { status: 400 });
    }

    await prisma.warband.deleteMany({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting warband:', err);
    return NextResponse.json({ error: 'Failed to delete warband' }, { status: 500 });
  }
}
