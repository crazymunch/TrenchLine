import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ overrides: [] });
    }

    const overrides = await prisma.customRuleOverride.findMany({
      where: { userId },
    });

    return NextResponse.json({ overrides });
  } catch (err: any) {
    console.error('Error fetching custom rules:', err);
    return NextResponse.json({ error: 'Failed to fetch custom rules' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const body = await req.json();

    const { ruleType, ruleId, name, data } = body;

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

    const override = await prisma.customRuleOverride.upsert({
      where: {
        userId_ruleType_ruleId: {
          userId: effectiveUserId,
          ruleType: ruleType || 'unit',
          ruleId,
        },
      },
      update: {
        name,
        data,
      },
      create: {
        userId: effectiveUserId,
        ruleType: ruleType || 'unit',
        ruleId,
        name,
        data,
      },
    });

    return NextResponse.json({ override });
  } catch (err: any) {
    console.error('Error saving custom rule:', err);
    return NextResponse.json({ error: 'Failed to save custom rule' }, { status: 500 });
  }
}
