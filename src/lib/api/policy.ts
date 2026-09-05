import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { abort, forbidden, notFound, unauthorized } from './http';

/**
 * Who is asking, and what they are allowed to do.
 *
 * Authorization used to be written inline, differently, in each handler — and
 * three of them did not write it at all. `POST /api/campaigns` accepted a
 * `claim_territory` for any territory ID from any caller, signed in or not,
 * with no check that the territory belonged to a campaign they were in or
 * that the warband they claimed it for was theirs.
 *
 * These functions exist so that a route cannot forget: each returns the actor
 * it verified, and throws the response otherwise, so there is no way to use
 * the result without having passed the check.
 */

export interface Actor {
  userId: string;
  email: string | null;
  isAdmin: boolean;
}

/** The session's actor, or null when signed out. */
export async function currentActor(): Promise<Actor | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as
    { id?: string; email?: string | null; isAdmin?: boolean } | undefined;
  if (!user?.id) return null;
  /*
    Taken from the SESSION, which the JWT callback resolved from the user's
    persisted role — not recomputed from the email here.

    Recomputing from the address would reinstate exactly what `adminRole.ts`
    exists to remove: two places deciding authority, one of them from a mutable
    field, and a revocation that only half applies.
  */
  return { userId: user.id, email: user.email ?? null, isAdmin: Boolean(user.isAdmin) };
}

/**
 * Require a signed-in caller.
 *
 * Signed-out callers used to be given a shared identity —
 * `commander@trenchline.org`, upserted on demand — so that strangers wrote to
 * one row and overwrote each other, and so that an account existed for the
 * sign-in bypass to walk into. Anonymous use is still supported everywhere it
 * was: it is local-only, and the cloud says 401.
 */
export async function requireActor(): Promise<Actor> {
  const actor = await currentActor();
  return actor ?? abort(unauthorized());
}

export async function requireAdmin(): Promise<Actor> {
  const actor = await requireActor();
  return actor.isAdmin ? actor : abort(forbidden());
}

export type CampaignRole = 'admin' | 'member';

export interface CampaignAccess {
  actor: Actor;
  campaignId: string;
  role: CampaignRole;
}

/**
 * Require that the caller may act on a campaign in the given role.
 *
 * `admin` is the campaign's own creator (`Campaign.adminId`), not an
 * application admin: running a campaign is not the same authority as
 * operating the service, and conflating them would let the site operator
 * silently rewrite other people's games.
 *
 * A campaign the caller may not see returns **404, not 403**. A 403 confirms
 * the campaign exists, which is exactly what an enumerator wants from an
 * invite code short enough to guess.
 */
export async function requireCampaignAccess(
  campaignId: string,
  need: CampaignRole,
): Promise<CampaignAccess> {
  const actor = await requireActor();

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, adminId: true, members: { where: { userId: actor.userId }, select: { id: true } } },
  });
  if (!campaign) return abort(notFound());

  const role: CampaignRole | null = campaign.adminId === actor.userId
    ? 'admin'
    : campaign.members.length
      ? 'member'
      : null;

  if (!role) return abort(notFound());
  if (need === 'admin' && role !== 'admin') return abort(forbidden());

  return { actor, campaignId: campaign.id, role };
}

/**
 * Require that a warband belongs to the caller.
 *
 * The territory claim took a `warbandId` from the body and wrote it onto a
 * territory without checking whose it was, so a player could plant someone
 * else's warband on a map — or their own on a campaign they had never joined.
 */
export async function requireOwnedWarband(warbandId: string, actor: Actor): Promise<string> {
  const warband = await prisma.warband.findUnique({
    where: { id: warbandId },
    select: { id: true, userId: true },
  });
  if (!warband) return abort(notFound());
  if (warband.userId !== actor.userId && !actor.isAdmin) return abort(forbidden());
  return warband.id;
}

/**
 * Require that a warband is fielded in a campaign.
 *
 * Ownership alone is not enough: a claim has to be made by a warband that is
 * actually in the campaign whose map it is changing.
 */
export async function requireCampaignWarband(
  campaignId: string,
  warbandId: string,
  actor: Actor,
): Promise<string> {
  await requireOwnedWarband(warbandId, actor);
  const member = await prisma.campaignMember.findFirst({
    where: { campaignId, warbandId },
    select: { id: true },
  });
  return member ? warbandId : abort(forbidden('That warband is not in this campaign.'));
}
