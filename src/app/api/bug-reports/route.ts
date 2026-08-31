import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// In-memory / file cache for bug reports
const bugReports: any[] = [];

export async function GET(_req: NextRequest) {
  return NextResponse.json({ bugReports });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();

    const report = {
      id: `bug-${Date.now()}`,
      ...body,
      submittedBy: session?.user?.email || body.userEmail || 'Anonymous',
      createdAt: new Date().toISOString()
    };

    bugReports.unshift(report);
    if (bugReports.length > 100) bugReports.pop();

    console.log('[TRENCHLINE BUG REPORT LOGGED]:', report.id, report.category, report.description.slice(0, 50));

    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to record bug report', details: err?.message }, { status: 500 });
  }
}
