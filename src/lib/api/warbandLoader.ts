/**
 * Loading a synced warband out of the database, in one place.
 *
 * `GET /api/warbands` had this inline as `toOwn`, and SH-1 needs the same read
 * for `/w/<token>`: *"The page reads the synced warband through the same loader
 * the sync uses and renders it through the same components; no second rendering
 * path."*
 *
 * That constraint is not decoration. The row is not a `Warband`: nine
 * client-owned fields ride inside the `notes` column as JSON, and reconstructing
 * them is exactly the kind of projection that drifts when it exists twice —
 * `SYNC-1` found six warband fields being silently dropped by a second
 * serialiser. A share page with its own reader would show a roster with no
 * Variant, no ledger and no Patron, and every number on it would be wrong in a
 * way nobody would connect to this file.
 *
 * So there is one `include`, one row type and one mapping, and both callers use
 * them.
 */
import { prisma } from '@/lib/prisma';
import { clientFieldsOf, metadataOf } from './warbandMetadata';

/**
 * The relations a full warband read needs.
 *
 * `user` for the display name — never the address; `campaignMembers` for the
 * record the Campaign Hub ranks on.
 */
export const WARBAND_OWN_INCLUDE = {
  user: { select: { id: true, name: true } },
  campaignMembers: {
    select: {
      campaignId: true, glory: true, rating: true,
      wins: true, losses: true, draws: true, treasury: true,
    },
  },
} as const;

/**
 * The row shape the owner query returns.
 *
 * Named rather than `Record<string, any>`: the `any` meant nothing checked that
 * the fields read below existed, in the one function whose job is to hand a
 * player their whole roster back.
 */
export interface WarbandRow {
  id: string;
  name: string;
  factionId: string;
  ducatLimit: number;
  treasuryDucats: number;
  gloryPoints: number;
  units: unknown;
  armoryStash: unknown;
  visibility: string;
  notes: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string | null } | null;
  campaignMembers: unknown[];
}

/**
 * The full roster, as its owner's device expects it. This is a restore.
 *
 * Unchanged in shape from the `toOwn` it was extracted from, deliberately: the
 * sync merge on the device compares `editedAt` off this object, and a field
 * renamed here is a field lost there.
 */
export function warbandFromRow(wb: WarbandRow) {
  const metadata = metadataOf(wb.notes);
  return {
    id: wb.id,
    name: wb.name,
    factionId: wb.factionId,
    ducatLimit: wb.ducatLimit,
    treasuryDucats: wb.treasuryDucats,
    gloryPoints: wb.gloryPoints,
    units: wb.units,
    armoryStash: wb.armoryStash,
    visibility: wb.visibility,
    notes: (metadata.rawNotes as string) ?? (wb.notes?.startsWith('{') ? '' : wb.notes ?? ''),
    /*
      Every client-owned field, from the one list. `editedAt` is among them —
      the sync merge compares it and nothing else; see services/sync.ts for why
      `updatedAt` could not do that job.

      Deliberately NOT spread into the directory's `toPublic`. That is an
      allowlist and it stays as narrow as it is.
    */
    ...clientFieldsOf(metadata),
    creatorId: wb.userId,
    creatorName: wb.user?.name || 'Crusade Commander',
    campaignMembers: wb.campaignMembers,
    createdAt: wb.createdAt.toISOString(),
    updatedAt: wb.updatedAt.toISOString(),
  };
}

/**
 * The roster a share token names, or `null`.
 *
 * `null` for an unknown token and `null` for a token that was cleared, and the
 * caller answers 404 to both — SH-1: *"An unknown or cleared token is a 404,
 * not an empty sheet."* Clearing the token sets the column to NULL, so a
 * cleared link simply matches nothing, and there is no state in which a
 * stopped share still resolves to a row.
 *
 * An empty or absent token is refused before the query rather than handed to
 * Prisma: `findUnique` on `shareToken: ''` would be a table lookup for a value
 * no row holds, and reading it as "no filter" is the class of bug that turns a
 * missing parameter into a disclosure.
 *
 * No session is consulted. That is the point of the token: presenting it IS the
 * authorisation, which is why it must be random and why the page carries
 * `noindex`.
 */
export async function loadSharedWarband(token: string | null | undefined) {
  const wanted = String(token ?? '').trim();
  if (!wanted) return null;

  const row = await prisma.warband.findUnique({
    where: { shareToken: wanted },
    include: WARBAND_OWN_INCLUDE,
  });
  if (!row) return null;
  return warbandFromRow(row as unknown as WarbandRow);
}
