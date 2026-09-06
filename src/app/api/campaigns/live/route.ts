import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { badRequest, conflict, forbidden, handle, notFound } from '@/lib/api/http';
import { readAndParse, id, count, boundedJson } from '@/lib/api/parse';
import { requireActor, requireCampaignAccess } from '@/lib/api/policy';

/**
 * A match in progress, as ONE device holds it.
 *
 * LIVE-1, designed in `docs/LIVE-MODE.md` before any of this was written. The
 * whole feature is: the player running the game owns the board, and everyone
 * else in the campaign may watch it a couple of seconds behind.
 *
 * ## Why this is not the campaign sync protocol
 *
 * `sync/route.ts` takes operations with client-generated ids, checks a version
 * per entity, and hands a conflict back to a human to resolve. That is right
 * for a campaign — a handful of edits an evening, latency-tolerant, and
 * "ask the organiser" is an acceptable answer.
 *
 * It is wrong for a game in progress. Dozens of small changes a minute, both
 * players watching, and a dialogue asking someone to resolve a conflict during
 * their shooting phase is not a feature. So this endpoint takes **snapshots**:
 * the host says what the board IS, not how it got there.
 *
 * That choice removes the hard parts rather than reimplementing them. A
 * dropped update is repaired by the next one. Out-of-order arrival is settled
 * by `revision` alone. There is no replay, no idempotency key and no merge —
 * because a later snapshot is simply the truth, and an earlier one is simply
 * stale.
 *
 * ## Authority
 *
 * One writer, named on the row. `hostId` is set from the SESSION on the first
 * write and never from the body, and every later write must come from that
 * account. Watchers are the campaign's members and get read access only. That
 * is one line of the authority table in `docs/CAMPAIGN-SYNC.md` and needs no
 * new concepts.
 *
 * ## Polling, not websockets
 *
 * Vercel's functions cannot hold a socket open, so a push channel means a
 * realtime vendor: a bill, a dependency, and a company that would see live
 * game state — which, since `docs/LEGAL.md`, is a privacy-policy change too.
 * The `revision` served as an ETag is what makes polling cheap: a watcher
 * looking at a quiet table gets a 304 and no body.
 */

/**
 * The largest board this accepts.
 *
 * A squad is a handful of models carrying five small fields each, so a real
 * snapshot is a few kilobytes. 64 KB is room for a very large game and still
 * refuses a client that has decided to send a megabyte every two seconds —
 * which, at this write rate, is the payload size that actually matters.
 */
const MAX_STATE_BYTES = 64 * 1024;

const PutSnapshot = z.object({
  /* Client-minted, like a campaign's cloud id: the host writes before it knows
     the server heard, so a lost response is retried under an id it already
     holds rather than starting a second match. */
  matchId: z.string().uuid(),
  campaignId: id(),
  /* The revision this snapshot was made against, or 0 for the first write.
     Not used to reject — see the handler — but recorded so a host can tell it
     was overtaken. */
  baseRevision: count(1_000_000).optional(),
  state: boundedJson(MAX_STATE_BYTES),
}).strict();

/** What a watcher is told about a match without opening it. */
const SUMMARY = {
  id: true, hostId: true, revision: true, startedAt: true, updatedAt: true,
} as const;

/**
 * Write the board.
 *
 * `PUT`, not `POST`: the same snapshot sent twice leaves the same state, which
 * is the definition of the verb and the reason a retry needs no idempotency
 * key of its own.
 */
export async function PUT(req: NextRequest) {
  return handle('live.PUT', async () => {
    const body = await readAndParse(req, PutSnapshot);

    /*
      Membership first. A live match belongs to a campaign, so the right to
      host one is the right to be in it — and a campaign the caller cannot see
      is a 404 rather than a 403, the same enumeration rule the rest of these
      routes follow.
    */
    const { actor } = await requireCampaignAccess(body.campaignId, 'member');

    const existing = await prisma.liveMatch.findUnique({
      where: { id: body.matchId },
      select: { hostId: true, campaignId: true, revision: true },
    });

    if (existing) {
      /*
        One writer, and it is whoever started the match.

        A client-minted primary key can always be aimed at a row that exists,
        so this is checked before anything is written. Taking over somebody
        else's table is not a feature this has — handover is a
        conflict-resolution problem wearing a different hat, and LIVE-MODE.md
        says why it waits.
      */
      if (existing.hostId !== actor.userId) {
        return forbidden('Another device is running that match.');
      }
      /* And it must stay in the campaign it started in: a match id moved
         between campaigns would carry its watchers with it. */
      if (existing.campaignId !== body.campaignId) {
        return conflict('That match belongs to another campaign.');
      }
    }

    /*
      Last write wins, deliberately.

      This is the one place the campaign protocol's answer would be actively
      wrong. There is a single writer, so two snapshots in flight are the same
      device's — the later one is simply the truth, and refusing it because it
      names an older `baseRevision` would leave the board frozen behind a
      dialogue nobody can answer mid-game.

      `revision` still increments, because a WATCHER needs it: it is the ETag,
      and it is how a slow poll can tell it already has the newest board.
    */
    const state = body.state as Prisma.InputJsonValue;
    const saved = existing
      ? await prisma.liveMatch.update({
          where: { id: body.matchId },
          data: { state, revision: { increment: 1 } },
          select: SUMMARY,
        })
      : await prisma.liveMatch.create({
          data: {
            id: body.matchId,
            campaignId: body.campaignId,
            // From the session. A body that could name the host could hand a
            // stranger's account the only writable seat at the table.
            hostId: actor.userId,
            state,
          },
          select: SUMMARY,
        });

    return NextResponse.json({ match: saved }, { status: existing ? 200 : 201 });
  });
}

/**
 * Read the board, or list what is live.
 *
 * `?id=` returns one match's snapshot; `?campaignId=` lists the campaign's,
 * newest first. Both require membership of the campaign — an invite code is
 * not a ticket to watch, and a match id is not either.
 */
export async function GET(req: NextRequest) {
  return handle('live.GET', async () => {
    /*
      A session before a query, always.

      Both branches below end up requiring campaign membership, so this changes
      no permission — what it changes is that an UNAUTHENTICATED caller can no
      longer make the database look anything up. Guessing match ids should not
      be a way to spend somebody else's query budget, and "sign in" is a better
      answer to a caller with no credentials than "not found", which is what
      the lookup-first order gave them.
    */
    await requireActor();

    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('id');
    const campaignId = searchParams.get('campaignId');

    if (campaignId) {
      await requireCampaignAccess(campaignId, 'member');
      const matches = await prisma.liveMatch.findMany({
        where: { campaignId },
        select: { ...SUMMARY, host: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      });
      /* A display name and nothing else — handing every member the host's
         email is the leak the directory's `creatorName` fallback closed. */
      return NextResponse.json({
        matches: matches.map(({ host, ...m }) => ({ ...m, hostName: host?.name ?? null })),
      });
    }

    if (!matchId) return badRequest('Name a match or a campaign.');

    const match = await prisma.liveMatch.findUnique({
      where: { id: matchId },
      select: { ...SUMMARY, campaignId: true, state: true },
    });
    /* Not found rather than forbidden, before membership is even consulted:
       distinguishing "no such match" from "not yours" would turn a guessed id
       into an oracle. */
    if (!match) return notFound();
    await requireCampaignAccess(match.campaignId, 'member');

    /*
      The revision as an ETag, which is what makes polling affordable.

      A watcher on a two-second loop over a table where nobody has moved gets
      a 304 with no body. Weak, because this is not a byte-for-byte guarantee
      about a representation — it is a statement that the board has not
      changed, which is exactly what `revision` means.
    */
    const etag = `W/"${match.revision}"`;
    if (req.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    return NextResponse.json({ match }, { headers: { ETag: etag } });
  });
}

/**
 * End the match.
 *
 * The host's to end, and nobody else's. A watcher closing their tab does not
 * stop the game, and a member cannot stop somebody else's.
 */
export async function DELETE(req: NextRequest) {
  return handle('live.DELETE', async () => {
    const actor = await requireActor();
    const matchId = new URL(req.url).searchParams.get('id');
    if (!matchId) return badRequest('Name the match to end.');

    const match = await prisma.liveMatch.findUnique({
      where: { id: matchId },
      select: { hostId: true },
    });
    if (!match) return notFound();
    if (match.hostId !== actor.userId) return forbidden('Only the host can end that match.');

    await prisma.liveMatch.delete({ where: { id: matchId } });
    return NextResponse.json({ ended: true });
  });
}
