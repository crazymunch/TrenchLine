import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle } from '@/lib/api/http';
import { readAndParse, text } from '@/lib/api/parse';
import { currentActor, requireAdmin } from '@/lib/api/policy';

/**
 * Bug reports.
 *
 * These lived in a module-level array, which meant every one of the following
 * was true at once:
 *
 *   - **They vanished on restart** and differed between server instances, so
 *     a report filed against one instance was invisible to the next request.
 *   - **They silently capped at 100**, dropping the oldest with no notice.
 *   - **Anyone could read all of them**, unauthenticated, including every
 *     reporter's email address and whatever they wrote in a description.
 *   - **Attribution was spoofable**: `submittedBy` fell back to
 *     `body.userEmail`, so it was whatever the submitter typed.
 *   - **The handler crashed on a valid-looking request.** It logged
 *     `report.description.slice(0, 50)` with no check that `description` was
 *     present or a string, so `POST {}` was a 500 — and the 500 returned
 *     `err?.message`.
 *   - **The body was spread into the stored and returned object**, so a
 *     caller chose which fields came back.
 *
 * It is a table now, listing is admin-only, and identity comes from the
 * session.
 */

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

/**
 * The labels an older client sends.
 *
 * The report modal used to submit its display text — `Minor / Visual`,
 * `Critical / Blocking` — as the severity. It sends the stored value now, but
 * a browser tab that was already open when this deployed still sends the old
 * ones, and rejecting a bug report over a label is a bug report lost.
 *
 * Mapped explicitly rather than coerced with a fallback: an unrecognised value
 * is still a 400, so this does not quietly become "accept anything".
 */
const LEGACY_SEVERITY: Record<string, typeof SEVERITIES[number]> = {
  'Minor / Visual': 'low',
  'Feature Inconvenience': 'medium',
  'Critical / Blocking': 'critical',
};

const Severity = z.preprocess(
  (v) => (typeof v === 'string' && v in LEGACY_SEVERITY ? LEGACY_SEVERITY[v] : v),
  z.enum(SEVERITIES),
);

/**
 * The diagnostic context the report modal collects.
 *
 * Kept — a bug report without the viewport, the view and the ruleset version
 * is a bug report nobody can act on — but as named, bounded fields rather than
 * a spread of whatever the caller sent. `userEmail` is deliberately NOT among
 * them: attribution comes from the session.
 */
const Context = z.object({
  category: text(60).trim().optional(),
  stepsToReproduce: text(4_000).trim().optional(),
  deviceType: text(40).trim().optional(),
  screenResolution: text(20).trim().optional(),
  currentView: text(60).trim().optional(),
  rulesetVersion: text(40).trim().optional(),
  currentTheme: text(40).trim().optional(),
  warbandName: text(120).trim().optional(),
  warbandFaction: text(80).trim().optional(),
}).strict().partial();

const NewReport = z.object({
  title: text(200).trim().min(1).optional(),
  description: text(8_000).trim().min(1),
  severity: Severity.default('medium'),
  area: text(80).trim().optional(),
  context: Context.optional(),
  /*
    Accepted and ignored, so an older client that still sends them is not
    rejected. `userEmail` in particular was the spoofable attribution: taking
    it and discarding it is the point.
  */
  userEmail: z.unknown().optional(),
  timestamp: z.unknown().optional(),
}).and(Context);

/** The context fields when a client sends them flat, as the modal does. */
const pickContext = (body: Record<string, unknown>) => {
  const keys = [
    'category', 'stepsToReproduce', 'deviceType', 'screenResolution',
    'currentView', 'rulesetVersion', 'currentTheme', 'warbandName', 'warbandFaction',
  ] as const;
  return Object.fromEntries(keys.flatMap((k) => (body[k] === undefined ? [] : [[k, body[k]]])));
};

/**
 * File a report.
 *
 * Anonymous reporting is kept: a player who hits a bug before signing in is
 * exactly the person whose report is worth having. What changes is that
 * "anonymous" now means `reporterId: null` rather than a name the submitter
 * chose — nobody can file a report as somebody else.
 */
export async function POST(req: NextRequest) {
  return handle('bug-reports.POST', async () => {
    const body = await readAndParse(req, NewReport);
    const actor = await currentActor();

    /*
      The context is appended to the description rather than given columns of
      its own: it is read by a human triaging a report, never queried, and a
      column per browser field is a schema that changes whenever the modal
      does.
    */
    const context = { ...body.context, ...pickContext(body) };
    const noted = Object.entries(context)
      .filter(([, v]) => typeof v === 'string' && v.trim())
      .map(([k, v]) => `${k}: ${v}`);

    const report = await prisma.bugReport.create({
      data: {
        title: body.title || body.description.slice(0, 80),
        description: noted.length
          ? `${body.description}\n\n---\n${noted.join('\n')}`
          : body.description,
        severity: body.severity,
        area: body.area ?? body.category,
        // From the session, never from the body.
        reporterId: actor?.userId ?? null,
      },
      select: { id: true, createdAt: true },
    });

    /*
      A receipt, not the stored report. The old handler returned everything it
      had built, including the attribution it had just accepted from the
      caller — so the response confirmed a spoof back to whoever sent it.
    */
    return NextResponse.json(
      { id: report.id, receivedAt: report.createdAt.toISOString() },
      { status: 201 },
    );
  });
}

/**
 * List reports. Admin only.
 *
 * This was an unauthenticated read of every report on the server, reporter
 * addresses included.
 */
export async function GET(req: NextRequest) {
  return handle('bug-reports.GET', async () => {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const take = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));
    const status = searchParams.get('status');

    const reports = await prisma.bugReport.findMany({
      where: status ? { status } : undefined,
      select: {
        id: true, title: true, description: true, severity: true,
        area: true, status: true, createdAt: true,
        reporter: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    });

    return NextResponse.json({ bugReports: reports });
  });
}
