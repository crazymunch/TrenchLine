import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireActor } from '@/lib/api/policy';
import { abort, badRequest, handle } from '@/lib/api/http';
import { readJson } from '@/lib/api/parse';

/**
 * Deleting your own account.
 *
 * `/privacy` used to say, in as many words, that there was no self-service
 * delete and that mailing the maintainer was the route. That sentence was
 * accurate and it was describing a gap: a policy that promises erasure and an
 * application with no way to perform it puts the whole obligation on one
 * person remembering to run SQL, which is the arrangement that quietly stops
 * happening.
 *
 * ## Two calls, not one
 *
 * `GET` reports what deletion would destroy. `DELETE` performs it. They are
 * separate because the consequences are not guessable from outside: a person
 * who has run a campaign for six months does not necessarily know that the
 * campaign is theirs to lose, and a confirmation dialog that says "are you
 * sure?" without saying *what* is not consent to anything.
 *
 * The summary is generated from the same relations the delete cascades
 * through, so it cannot describe a different deletion than the one that runs.
 *
 * ## Why the campaigns go too
 *
 * `Campaign.adminId` cascades from `User`. Deleting an organiser therefore
 * deletes the campaign, its matches, its territory map and everybody's
 * membership of it — other people's records, removed by someone else's choice.
 *
 * That is a real consequence and the honest thing is to NAME it rather than
 * silence it. So the summary counts each campaign the caller administers and
 * how many other players are in it, and `DELETE` refuses unless the caller
 * confirms that number back. Refusing outright would be worse: there is no
 * hand-over feature yet, so "you may not delete your account while you run a
 * campaign" is a policy promise the application cannot keep.
 *
 * A campaign is not silently rescued, either. Transferring it to an arbitrary
 * remaining member is a decision being made on the organiser's behalf, and
 * this file does not make decisions on people's behalf.
 *
 * ## What survives
 *
 * Bug reports. `BugReport.reporterId` is `onDelete: SetNull`, so a report
 * outlives its reporter as an anonymous one. That is deliberate: the report is
 * about the software, the maintainer may still be working on it, and erasing
 * the person's link to it is what erasure actually requires.
 *
 * ## The session afterwards
 *
 * Nothing to do. The JWT callback in `src/lib/auth.ts` looks the user up by id
 * on every request and clears `token.sub` when the row is gone, so a token
 * that outlives its account stops authenticating on the next call. Signing out
 * client-side is a courtesy, not the control.
 */

/** What `DELETE` would destroy, for the confirmation screen. */
export interface DeletionSummary {
  email: string | null;
  warbands: number;
  /** Campaigns this account ADMINISTERS. These are destroyed with it. */
  administeredCampaigns: { name: string; otherMembers: number }[];
  /** Campaigns this account merely plays in. Only the membership is removed. */
  memberships: number;
  customRules: number;
  /** Reports that stay, unlinked. Named so the summary is not a half-truth. */
  bugReportsKeptAnonymously: number;
}

async function summarise(userId: string, email: string | null): Promise<DeletionSummary> {
  const [warbands, administered, memberships, customRules, bugReports] = await Promise.all([
    prisma.warband.count({ where: { userId } }),
    prisma.campaign.findMany({
      where: { adminId: userId },
      select: { name: true, _count: { select: { members: true } }, members: { where: { userId }, select: { id: true } } },
    }),
    prisma.campaignMember.count({ where: { userId, campaign: { adminId: { not: userId } } } }),
    prisma.customRuleOverride.count({ where: { userId } }),
    prisma.bugReport.count({ where: { reporterId: userId } }),
  ]);

  return {
    email,
    warbands,
    administeredCampaigns: administered.map((c) => ({
      name: c.name,
      // The organiser's own membership is not an "other member". Counting it
      // would tell a solo organiser that one other player loses their records.
      otherMembers: Math.max(0, c._count.members - c.members.length),
    })),
    memberships,
    customRules,
    bugReportsKeptAnonymously: bugReports,
  };
}

export async function GET() {
  return handle('account:summary', async () => {
    const actor = await requireActor();
    return NextResponse.json({ summary: await summarise(actor.userId, actor.email) });
  });
}

/**
 * The word the caller types to confirm.
 *
 * A typed word rather than a checkbox: this is the one irreversible action in
 * the application, and a click is something a thumb does by accident on a
 * phone. Compared case-sensitively — "delete" is what you type when you are
 * dismissing a dialog, "DELETE" is what you type when you mean it.
 */
export const CONFIRMATION = 'DELETE';

export async function DELETE(req: NextRequest) {
  return handle('account:delete', async () => {
    const actor = await requireActor();
    const body = await readJson(req);
    const { confirm, acknowledgeCampaigns } =
      (body ?? {}) as { confirm?: unknown; acknowledgeCampaigns?: unknown };

    if (confirm !== CONFIRMATION) {
      abort(badRequest(`Type ${CONFIRMATION} to confirm deleting this account.`));
    }

    const summary = await summarise(actor.userId, actor.email);

    /*
      The second gate, and only when there is something to gate.

      An account that runs no campaign never sees it. One that runs a campaign
      with other players in it has to send back the number of campaigns it is
      destroying — read off the summary, so a client that skipped the summary
      cannot supply it. Equality, not truthiness: `true` is what a client sends
      by accident, a matching count is what it sends having been told.
    */
    if (summary.administeredCampaigns.length > 0
      && acknowledgeCampaigns !== summary.administeredCampaigns.length) {
      abort(badRequest(
        `Deleting this account also deletes ${summary.administeredCampaigns.length} campaign(s) `
        + 'you run, for every player in them. Confirm that count to proceed.'));
    }

    /*
      One statement. Every relation that must go cascades from this row —
      accounts, sessions, auth tokens, warbands, campaigns administered,
      memberships, custom rules — and doing it in one delete means there is no
      state where half an account exists.
    */
    await prisma.user.delete({ where: { id: actor.userId } });

    return NextResponse.json({ deleted: true, summary });
  });
}
