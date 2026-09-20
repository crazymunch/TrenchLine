import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma, BattleVisibility } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { badRequest, forbidden, handle, notFound } from '@/lib/api/http';
import { readAndParse, id, count, text } from '@/lib/api/parse';
import { requireActor } from '@/lib/api/policy';

/**
 * The Chronicle of Battles, shared.
 *
 * CHRON-2, and the design is in docs/CHRONICLE.md. A battle used to live in
 * the `localStorage` of the ONE device that ran the tracker, which is the
 * wrong place for it: in a 2v2 the other three players fought the same game
 * and had no record of it at all, and the recording device losing its browser
 * storage lost the lot.
 *
 * ## Why this is not the campaign sync protocol
 *
 * `campaigns/sync/route.ts` takes versioned operations, detects conflicts and
 * hands them to a human. That machinery exists because a roster is edited,
 * repeatedly, from more than one device.
 *
 * A battle record is **written once and never edited** — that is the rule the
 * Chronicle is built on, because a chronicle you can revise is a chronicle
 * nobody trusts. With one writer and no edits there is no conflict to detect,
 * so there is no version column, no merge and no operation log. A repeat write
 * of the same id is the same battle arriving twice, and the primary key says
 * so.
 *
 * ## Who can read what
 *
 * | Reader                        | Sees                                   |
 * |-------------------------------|----------------------------------------|
 * | The recorder                  | Their own battles, at any visibility   |
 * | A player whose warband fought | That battle, unless it is PRIVATE      |
 * | A member of the campaign      | Its battles, unless they are PRIVATE   |
 * | Anyone signed in              | `PUBLIC` battles                       |
 * | Signed out                    | 401 — the Chronicle is local-only then |
 *
 * Participation is resolved SERVER-SIDE from warband ownership when the battle
 * is written (`BattleParticipant`), never from the request body. A client that
 * could name the participants could name anyone, and putting a battle in a
 * stranger's Chronicle is a write to their account by someone else.
 *
 * ## PUBLIC is not reachable yet
 *
 * The enum has it and this route honours it, but nothing in the UI sets it.
 * trenchline.app is still in Safe Browsing review (task SB-1b), and a feed of
 * user-authored titles and free text readable by anyone is the last thing to
 * turn on while that is open. The column costs nothing today and saves a
 * migration when it clears.
 */

/**
 * The largest battle this accepts.
 *
 * A four-side game with a full Deed list and per-turn scores is a few
 * kilobytes. 128 KB is room for a very long game and still refuses a client
 * that has decided a battle record is a place to put a megabyte.
 */
const MAX_RECORD_BYTES = 128 * 1024;

const Side = z.object({
  id: id(),
  name: text(120),
  factionId: text(64),
  wasPlaceholder: z.boolean(),
  coalition: z.enum(['A', 'B']).optional(),
  vp: z.number().int().min(-999).max(9999),
  turnScores: z.record(z.string(), z.number().int().min(-999).max(9999)),
}).strict();

/*
  A Deed, as the Chronicle syncs it.

  `turn` is `text(8)` because a turn number is at most a few characters — and
  that ceiling is how a defect on the client reached the server: the client
  wrote the performer's NAME into `turn`, so a Deed performed by anyone whose
  name runs past eight characters failed validation here, and `.strict()`
  meant the whole battle was rejected rather than the one field. `Entire
  Warband`, the performer picker's own default, is fourteen. The client writes
  the model to `unitId`/`unitName` now; the ceiling stays where it is, because
  it is right for what the field holds.
*/
const Deed = z.object({
  title: text(200),
  description: text(4000),
  sideId: id(),
  sideName: text(120),
  unitId: id().optional(),
  unitName: text(120).optional(),
  turn: text(8).optional(),
}).strict();

const PostBattle = z.object({
  /* Client-minted. The device writes when the match ends, possibly with no
     signal at the table, so a retry must land on an id it already holds. */
  id: id(),
  campaignId: id().optional(),
  visibility: z.enum(['PRIVATE', 'CAMPAIGN', 'PUBLIC']).optional(),
  endedAt: z.string().datetime(),
  scenarioId: text(120),
  scenarioName: text(200),
  turns: count(100),
  /* At least one side. A record with none is not a battle — the same rule
     `battleFromMatch` applies before it writes anything at all. */
  sides: z.array(Side).min(1).max(8),
  deeds: z.array(Deed).max(64).default([]),
  coalitionTotals: z.object({
    A: z.number().int().min(-999).max(9999),
    B: z.number().int().min(-999).max(9999),
  }).strict().optional(),
  weather: z.object({ name: text(120), effect: text(2000) }).strict().optional(),
  campaignMatchId: id().optional(),
}).strict().refine(
  (b) => JSON.stringify(b).length <= MAX_RECORD_BYTES,
  { message: `must serialise to at most ${MAX_RECORD_BYTES} bytes` },
);

/** The row shape both directions agree on, matching `types/battle.ts`. */
const BATTLE_SELECT = {
  id: true, ownerId: true, campaignId: true, visibility: true,
  endedAt: true, scenarioId: true, scenarioName: true, turns: true,
  sides: true, deeds: true, coalitionTotals: true, weather: true,
  owner: { select: { name: true } },
} as const;

type BattleRow = Prisma.BattleGetPayload<{ select: typeof BATTLE_SELECT }>;

/**
 * A row as the client reads it.
 *
 * `version: 1` is stamped here so what comes back is exactly what
 * `parseBattle` accepts — the client re-validates rather than trusting these
 * columns, which is the point: a row written by an older build is precisely
 * the case that function exists for.
 */
function toRecord(row: BattleRow) {
  return {
    version: 1,
    id: row.id,
    endedAt: row.endedAt.toISOString(),
    scenarioId: row.scenarioId,
    scenarioName: row.scenarioName,
    turns: row.turns,
    sides: row.sides,
    deeds: row.deeds,
    ...(row.coalitionTotals ? { coalitionTotals: row.coalitionTotals } : {}),
    ...(row.weather ? { weather: row.weather } : {}),
    /* Not part of the record itself — context about the row, which the view
       uses to say whose it is and whether it may be deleted here. A display
       name or a neutral fallback, NEVER an email address (see the note in
       warbands/route.ts about `creatorName`). */
    cloud: {
      ownerName: row.owner?.name || 'Crusade Commander',
      campaignId: row.campaignId,
      visibility: row.visibility,
    },
  };
}

/**
 * Every battle this account may read.
 *
 * One query with an OR rather than four merged in JavaScript: the union has to
 * be de-duplicated (a battle you recorded in a campaign you are in matches
 * three of the four arms) and the database is where that is free.
 */
export async function GET() {
  return handle('battles.GET', async () => {
    const actor = await requireActor();

    const memberships = await prisma.campaignMember.findMany({
      where: { userId: actor.userId },
      select: { campaignId: true },
    });
    const campaignIds = memberships.map((m) => m.campaignId);

    const rows = await prisma.battle.findMany({
      where: {
        OR: [
          { ownerId: actor.userId },
          { visibility: BattleVisibility.PUBLIC },
          {
            visibility: { not: BattleVisibility.PRIVATE },
            participants: { some: { userId: actor.userId } },
          },
          ...(campaignIds.length
            ? [{
                visibility: { not: BattleVisibility.PRIVATE },
                campaignId: { in: campaignIds },
              }]
            : []),
        ],
      },
      select: BATTLE_SELECT,
      orderBy: { endedAt: 'desc' },
      /* A ceiling, not pagination. The Chronicle is read as a list and a
         player has tens of battles, not thousands; an unbounded findMany is
         the shape that becomes a problem long before anyone notices. */
      take: 500,
    });

    return NextResponse.json({ battles: rows.map(toRecord) });
  });
}

/**
 * Record a battle, or acknowledge one already recorded.
 *
 * Idempotent by primary key: a second POST of the same id returns the row that
 * is already there rather than writing a second copy or failing. That is what
 * makes a retry safe on a phone that lost its signal mid-write, which is the
 * normal condition at a table in a club.
 *
 * It does NOT overwrite. A battle is immutable, so a POST that names an
 * existing id with different contents is a client that has gone wrong, and
 * quietly taking the new version would let a record be revised through the
 * back door.
 */
export async function POST(req: NextRequest) {
  return handle('battles.POST', async () => {
    const actor = await requireActor();
    const body = await readAndParse(req, PostBattle);

    const existing = await prisma.battle.findUnique({
      where: { id: body.id },
      select: BATTLE_SELECT,
    });
    if (existing) {
      /* Someone else's id. Not "already recorded" — that would confirm the id
         exists to a caller guessing at them. */
      if (existing.ownerId !== actor.userId) return forbidden();
      return NextResponse.json({ battle: toRecord(existing), created: false });
    }

    /* A campaign the caller is not in cannot be named. Checked here rather
       than trusted, because `campaignId` decides who else may read the row. */
    if (body.campaignId) {
      const member = await prisma.campaign.findFirst({
        where: {
          id: body.campaignId,
          OR: [{ adminId: actor.userId }, { members: { some: { userId: actor.userId } } }],
        },
        select: { id: true },
      });
      if (!member) return notFound();
    }

    /*
      Who fought, resolved from the warbands this service knows.

      From OWNERSHIP, never from the body. A side whose id matches no warband —
      every placeholder opponent, and any roster that lives only on a device —
      is recorded with a null `userId`: the honest answer, and the reason the
      join is kept rather than the side being dropped.
    */
    const sideIds = body.sides.map((s) => s.id);
    const known = await prisma.warband.findMany({
      where: { id: { in: sideIds } },
      select: { id: true, userId: true },
    });
    const ownerOf = new Map(known.map((w) => [w.id, w.userId]));

    const created = await prisma.battle.create({
      data: {
        id: body.id,
        ownerId: actor.userId,
        campaignId: body.campaignId ?? null,
        visibility: (body.visibility ?? 'CAMPAIGN') as BattleVisibility,
        endedAt: new Date(body.endedAt),
        scenarioId: body.scenarioId,
        scenarioName: body.scenarioName,
        turns: body.turns,
        sides: body.sides as Prisma.InputJsonValue,
        deeds: body.deeds as Prisma.InputJsonValue,
        /* `DbNull`, not `JsonNull`: these columns are nullable, so the absence
           of coalitions is SQL NULL rather than the JSON literal `null`. Both
           read back falsy, but only one of them means "there were none". */
        coalitionTotals: (body.coalitionTotals ?? Prisma.DbNull) as Prisma.InputJsonValue,
        weather: (body.weather ?? Prisma.DbNull) as Prisma.InputJsonValue,
        participants: {
          create: sideIds.map((wid) => ({ warbandId: wid, userId: ownerOf.get(wid) ?? null })),
        },
      },
      select: BATTLE_SELECT,
    });

    return NextResponse.json({ battle: toRecord(created), created: true }, { status: 201 });
  });
}

/**
 * Forget a battle.
 *
 * The recorder only. A player who fought in one can hide it from their own
 * Chronicle locally, but cannot delete the record from under the people who
 * were there — the same reason the record is immutable in the first place.
 */
export async function DELETE(req: NextRequest) {
  return handle('battles.DELETE', async () => {
    const actor = await requireActor();
    const battleId = req.nextUrl.searchParams.get('id');
    if (!battleId) return badRequest('Which battle?');

    const row = await prisma.battle.findUnique({
      where: { id: battleId },
      select: { id: true, ownerId: true },
    });
    /* 404 for a battle that is not the caller's, not 403: a 403 confirms the
       id exists, which is what someone walking the id space wants. */
    if (!row || (row.ownerId !== actor.userId && !actor.isAdmin)) return notFound();

    await prisma.battle.delete({ where: { id: battleId } });
    return NextResponse.json({ deleted: battleId });
  });
}
