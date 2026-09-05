import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, notFound, forbidden, abort } from '@/lib/api/http';
import { readAndParse, id, text, count } from '@/lib/api/parse';
import { requireCampaignAccess, requireCampaignWarband, type CampaignAccess } from '@/lib/api/policy';

/**
 * Campaign synchronisation.
 *
 * The design is `docs/CAMPAIGN-SYNC.md`; this is the server half of it. Five
 * properties, and each one is here because its absence caused something:
 *
 * **Operations, not object PUTs.** A whole-campaign PUT means the last device
 * to speak wins and silently discards what the other one did. Every mutation
 * is one operation, named, with its own id.
 *
 * **Idempotent.** `CampaignSyncOp.opId` is a PRIMARY KEY, so a replay is a
 * constraint violation rather than a second write — and the record is inserted
 * in the SAME transaction as the change it describes, so a crash between the
 * two cannot leave one without the other. The code this replaces called create
 * on every attempt, which is how one campaign became several.
 *
 * **Never create-as-update.** There is no op that creates a campaign. Creation
 * is `POST /api/campaigns`, explicitly; an "upsert by name" is how two devices
 * editing one campaign produced two campaigns.
 *
 * **Conflicts on the version the edit was MADE against.** Each entity carries
 * a monotonic `version` and each op states the `baseVersion` it saw. Arrival
 * order is a property of the network, not of the work: on one flaky connection
 * the slower device would otherwise silently win.
 *
 * **Every operation re-checks policy.** A sync endpoint is not a trusted back
 * door. `requireCampaignAccess` runs for the request, and each op re-checks
 * what IT needs on top — an organiser-only change attempted by a member is
 * refused even though the member legitimately reached this route.
 *
 * What no operation can touch: membership, `inviteCode`, `adminId`, user
 * identity. Those are server-owned, and the enforcement is that no op kind
 * exists for them rather than a filter that could be forgotten.
 */

/** Settings the organiser owns. */
const SettingsOp = z.object({
  kind: z.literal('campaign.settings'),
  opId: id(),
  baseVersion: count(1_000_000),
  data: z.object({
    name: text(120).trim().min(1).optional(),
    currentTurn: count(10_000).optional(),
    currentGame: count(10_000).optional(),
    maxWarbandDucats: count(100_000).optional(),
    gloryVictoryThreshold: count(1_000).optional(),
    framework: z.enum(['classic', 'carcass-front']).optional(),
    /*
      One key per relaxed rule, matching `CampaignHouseRules`. Not free-form
      JSON: a house rule the app ACTS on has to be something the app can read,
      and an open bag here is an open bag in the client too.
    */
    houseRules: z.object({
      reinforcementsKeepExploration: z.boolean().optional(),
    }).strict().optional(),
  }).strict(),
}).strict();

/** A territory's house rule. The organiser's, and nobody else's. */
const PerkOp = z.object({
  kind: z.literal('territory.perk'),
  opId: id(),
  entityId: id(),
  baseVersion: count(1_000_000),
  data: z.object({ perk: text(500) }).strict(),
}).strict();

/** A player planting their warband on the map. */
const ClaimOp = z.object({
  kind: z.literal('territory.claim'),
  opId: id(),
  entityId: id(),
  baseVersion: count(1_000_000),
  /*
    `playerName` is deliberately absent. It is read from the membership the
    policy check verified — taking it from the body is how a claim could be
    attributed to anyone.
  */
  data: z.object({ warbandId: id() }).strict(),
}).strict();

const Body = z.object({
  campaignId: id(),
  /* Bounded: a sync is a batch, not a bulk import, and an unbounded array is
     a transaction that holds locks for as long as a client cares to make it. */
  ops: z.array(z.discriminatedUnion('kind', [SettingsOp, PerkOp, ClaimOp])).min(1).max(100),
}).strict();

type Op = z.infer<typeof Body>['ops'][number];

/** What the caller is told about one operation. */
type Outcome =
  | { opId: string; state: 'applied' }
  | { opId: string; state: 'skipped' }
  | { opId: string; state: 'conflict'; server: unknown; reason?: 'op-id-reused' };

/** Postgres' unique violation, which here means "already applied". */
const isDuplicate = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

/**
 * Apply one operation, or say why not.
 *
 * The whole thing — the policy re-check, the version comparison, the write and
 * the `CampaignSyncOp` record — happens inside one transaction, so two devices
 * racing on the same entity cannot both read version 3 and both write version
 * 4. The version comparison is part of the UPDATE's `where`, not a read
 * followed by a write, for the same reason.
 */
async function applyOp(op: Op, access: CampaignAccess): Promise<Outcome> {
  const { actor, campaignId, role } = access;

  /* Organiser-only kinds, re-checked per operation rather than once per
     request: reaching this route proves membership, not authority. */
  if (op.kind === 'campaign.settings' || op.kind === 'territory.perk') {
    if (role !== 'admin') return abort(forbidden('Only the campaign organiser can change that.'));
  }

  /* A claim needs the warband to be the caller's AND fielded in this campaign.
     Checked before the transaction because it reads other tables and its
     answer cannot change under us within one request. */
  let playerName: string | undefined;
  if (op.kind === 'territory.claim') {
    await requireCampaignWarband(campaignId, op.data.warbandId, actor);
    const member = await prisma.campaignMember.findFirst({
      where: { campaignId, warbandId: op.data.warbandId },
      select: { playerName: true },
    });
    if (!member) return abort(forbidden('That warband is not in this campaign.'));
    playerName = member.playerName;
  }

  try {
    return await prisma.$transaction(async (tx) => {
      /* The record goes in FIRST. If it violates the primary key the operation
         has already been applied and the transaction rolls back having changed
         nothing — which is what makes a retry safe rather than merely
         unlikely to hurt. */
      await tx.campaignSyncOp.create({
        data: { opId: op.opId, campaignId, kind: op.kind, actorId: actor.userId },
      });

      if (op.kind === 'campaign.settings') {
        const { count: n } = await tx.campaign.updateMany({
          where: { id: campaignId, version: op.baseVersion },
          data: { ...op.data, version: { increment: 1 } },
        });
        if (n === 1) return { opId: op.opId, state: 'applied' as const };
        const server = await tx.campaign.findUnique({
          where: { id: campaignId },
          select: {
            version: true, name: true, currentTurn: true, framework: true,
            maxWarbandDucats: true, gloryVictoryThreshold: true, houseRules: true,
          },
        });
        throw new Conflict({ opId: op.opId, state: 'conflict', server });
      }

      const territory = await tx.territoryNode.findFirst({
        where: { id: op.entityId, campaignId },
        select: { id: true, version: true, perkSource: true },
      });
      /* Scoped to THIS campaign: a territory id from another campaign is not
         found rather than forbidden, which tells a prober nothing. */
      if (!territory) return abort(notFound());

      if (op.kind === 'territory.perk' && territory.perkSource === 'published') {
        /*
          The one row of the authority table owned by nobody. These carry the
          book's own text — the Carcass Front Special Zones' Outpost Bonus —
          and an organiser overwriting one would put a house rule behind a
          published label. Refused here as well as in the store, because the
          store is not a security boundary.
        */
        return abort(forbidden('That territory carries a published rule, which nobody may overwrite.'));
      }

      const data = op.kind === 'territory.perk'
        ? {
            perk: op.data.perk.trim(),
            /* Cleared rather than left saying "campaign" over an empty string,
               which would render as a house rule with no text. */
            perkSource: op.data.perk.trim() ? 'campaign' : null,
          }
        : { controlledByWarbandId: op.data.warbandId, controlledByPlayerName: playerName };

      const { count: n } = await tx.territoryNode.updateMany({
        where: { id: territory.id, campaignId, version: op.baseVersion },
        data: { ...data, version: { increment: 1 } },
      });
      if (n === 1) return { opId: op.opId, state: 'applied' as const };

      const server = await tx.territoryNode.findUnique({
        where: { id: territory.id },
        select: {
          version: true, perk: true, perkSource: true,
          controlledByWarbandId: true, controlledByPlayerName: true,
        },
      });
      throw new Conflict({ opId: op.opId, state: 'conflict', server });
    });
  } catch (e) {
    if (e instanceof Conflict) return e.outcome;
    if (isDuplicate(e)) return await duplicateOutcome(op, access);
    throw e;
  }
}

/**
 * What a primary-key violation on `CampaignSyncOp` actually means.
 *
 * Usually: two deliveries of one operation racing each other. The loser
 * applied nothing and "already applied" is exactly right.
 *
 * But `opId` is the primary key GLOBALLY, not per campaign, and the route used
 * to answer `skipped` to every violation without looking. So an id already
 * used in ANOTHER campaign was acknowledged as a successful retry of an
 * operation this campaign had never seen — and `skipped` clears the client's
 * outbox exactly as `applied` does (`campaignSync.ts`), so the edit was
 * dropped on both sides and reported as a success. That is the failure the
 * `Conflict` class below exists to prevent, arriving by a different door.
 *
 * So the prior record is read and compared. Same campaign, same kind, same
 * actor is a retry. Anything else is an id that has been reused, which is a
 * client fault this cannot repair — and the one thing it must not do is
 * pretend the edit landed.
 *
 * It comes back as a CONFLICT rather than a fourth outcome because of what the
 * client does with each: `applied` and `skipped` clear the outbox, conflicts
 * do not. A conflict keeps the operation, which is the only correct answer
 * when nothing was written. `server` is null — there is no server copy of this
 * entity to merge against, the operation simply did not run — and the guards
 * on the client already return null rather than defaulting when a payload is
 * not the shape they expect.
 */
async function duplicateOutcome(op: Op, access: CampaignAccess): Promise<Outcome> {
  const prior = await prisma.campaignSyncOp.findUnique({
    where: { opId: op.opId },
    select: { campaignId: true, kind: true, actorId: true },
  });

  const isRetry = prior
    && prior.campaignId === access.campaignId
    && prior.kind === op.kind
    && prior.actorId === access.actor.userId;

  if (isRetry) return { opId: op.opId, state: 'skipped' };
  return { opId: op.opId, state: 'conflict', server: null, reason: 'op-id-reused' };
}

/**
 * A conflict, thrown so the transaction rolls back.
 *
 * Returning it instead would COMMIT the `CampaignSyncOp` record for an
 * operation that changed nothing — and the client's retry, once it had merged,
 * would then be skipped as a duplicate and its edit lost silently. That is the
 * worst failure this protocol can have, so a conflict must unwind.
 */
class Conflict extends Error {
  constructor(readonly outcome: Outcome) { super('conflict'); }
}

export async function POST(req: NextRequest) {
  return handle('campaigns.sync.POST', async () => {
    const body = await readAndParse(req, Body);

    /* Membership for the request; each op re-checks what it needs on top. */
    const access = await requireCampaignAccess(body.campaignId, 'member');

    /*
      Sequential, not `Promise.all`. The operations in one batch may touch the
      same entity — a perk edit and a claim on one territory — and running them
      concurrently would make the batch's own outcome depend on scheduling.
    */
    const outcomes: Outcome[] = [];
    for (const op of body.ops) outcomes.push(await applyOp(op, access));

    return NextResponse.json({
      applied: outcomes.filter((o) => o.state === 'applied').map((o) => o.opId),
      /* A success: the server had already applied that opId. */
      skipped: outcomes.filter((o) => o.state === 'skipped').map((o) => o.opId),
      conflicts: outcomes.filter((o) => o.state === 'conflict'),
    });
  });
}
