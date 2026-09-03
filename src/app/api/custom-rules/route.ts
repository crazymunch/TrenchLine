import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, notFound } from '@/lib/api/http';
import { readAndParse, id, text, boundedJson } from '@/lib/api/parse';
import { currentActor, requireActor } from '@/lib/api/policy';

/**
 * A player's own overrides of published rules.
 *
 * `POST` used to file every SIGNED-OUT write under one shared account —
 * `commander@trenchline.org`, upserted on demand — keyed by
 * `(userId, ruleType, ruleId)`. Unrelated anonymous visitors therefore wrote
 * to the same rows and silently overwrote each other's work, which is the
 * exact failure already found and removed from `/api/warbands`.
 *
 * It was also worse than a data-integrity bug. That address was on the
 * hard-coded admin list, so this endpoint was how a stranger brought an
 * **admin account into existence** with no password, for the sign-in bypass to
 * then walk into. The account is created nowhere now, and the address is not
 * an admin address under any configuration.
 *
 * Anonymous customisation still works exactly as before: it is local-only, and
 * the cloud says 401. That is the same contract `/api/warbands` already has.
 */

/** The kinds of entry a player may override, as the schema's comment lists. */
const RULE_TYPES = ['unit', 'weapon', 'armour', 'equipment'] as const;

/**
 * The override payload.
 *
 * `data` stays free-form — it mirrors whichever entry is being overridden, and
 * pinning its shape here would mean this file had to change every time the
 * dataset's did. It is bounded instead: an override is a patch to one entry,
 * so 64KB is generous, and it is not a place to park a megabyte.
 */
const Override = z.object({
  ruleType: z.enum(RULE_TYPES),
  ruleId: id(),
  name: text(200).trim().min(1),
  data: boundedJson(64 * 1024),
}).strict();

const DeleteOverride = z.object({
  ruleType: z.enum(RULE_TYPES),
  ruleId: id(),
}).strict();

export async function GET(_req: NextRequest) {
  return handle('custom-rules.GET', async () => {
    const actor = await currentActor();
    // Signed out is not an error here: there is simply nothing in the cloud
    // for a caller with no account, and the client falls back to local state.
    if (!actor) return NextResponse.json({ overrides: [] });

    const overrides = await prisma.customRuleOverride.findMany({
      where: { userId: actor.userId },
    });
    return NextResponse.json({ overrides });
  });
}

export async function POST(req: NextRequest) {
  return handle('custom-rules.POST', async () => {
    const body = await readAndParse(req, Override);
    const actor = await requireActor();

    /*
      Scoped to the acting user by the unique key itself, so there is no path
      that writes someone else's row — not "checked first and then written",
      which is a race as well as a habit that gets forgotten.
    */
    const override = await prisma.customRuleOverride.upsert({
      where: {
        userId_ruleType_ruleId: {
          userId: actor.userId,
          ruleType: body.ruleType,
          ruleId: body.ruleId,
        },
      },
      update: { name: body.name, data: body.data as object },
      create: {
        userId: actor.userId,
        ruleType: body.ruleType,
        ruleId: body.ruleId,
        name: body.name,
        data: body.data as object,
      },
    });

    return NextResponse.json({ override });
  });
}

/**
 * Remove one of the caller's own overrides.
 *
 * There was no delete at all, so a player could add an override and never take
 * it off. Scoped by the same composite key, so it can only ever reach a row
 * the caller owns.
 */
export async function DELETE(req: NextRequest) {
  return handle('custom-rules.DELETE', async () => {
    const body = await readAndParse(req, DeleteOverride);
    const actor = await requireActor();

    const { count } = await prisma.customRuleOverride.deleteMany({
      where: { userId: actor.userId, ruleType: body.ruleType, ruleId: body.ruleId },
    });

    return count ? NextResponse.json({ deleted: true }) : notFound();
  });
}
