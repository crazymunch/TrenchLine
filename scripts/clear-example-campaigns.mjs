#!/usr/bin/env node
/**
 * Discard the example campaigns the old API created.
 *
 *   node scripts/clear-example-campaigns.mjs             # report only
 *   node scripts/clear-example-campaigns.mjs --yes       # actually delete
 *   node scripts/clear-example-campaigns.mjs --http      # over 443, not 5432
 *
 * ## Why this is a script and not a migration
 *
 * `20260905021934_campaign_sync_expand` adds the columns a real cloud campaign
 * needs and touches no rows. Deleting data is a different kind of act: a
 * migration runs on every deploy, in every environment, with nobody watching,
 * and "the rows were example data" is a fact about ONE database at ONE moment.
 * So the schema change ships on its own and the discard is a deliberate
 * command someone runs, reads the output of, and can decline.
 *
 * ## What it will and will not delete
 *
 * The old `POST /api/campaigns` created every campaign with the same four
 * fixed territories — `North Trench Sector A-1`, `Shrine of the Weeping
 * Martyr`, `The Iron Foundry Bunker`, `Dead Man's Crater (Center)` — while the
 * app creates twelve world theatres or thirty-two Carcass Front zones. That
 * shape is the signature (docs/CAMPAIGN-SYNC.md).
 *
 * A campaign is only offered for deletion when it has that exact territory
 * set AND no match records. A campaign with a match in it has been PLAYED,
 * whatever its territories look like, and this refuses to touch it — it is
 * reported and left alone. The maintainer confirmed the current rows are
 * example data; a future operator running this on a live database should not
 * have to rely on that having stayed true.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const commit = process.argv.includes('--yes');

/** The four the old API created, as it created them. */
const EXAMPLE_TERRITORIES = [
  'North Trench Sector A-1',
  'Shrine of the Weeping Martyr',
  'The Iron Foundry Bunker',
  "Dead Man's Crater (Center)",
];

const sameSet = (a, b) => {
  const x = [...a].sort();
  const y = [...b].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

/**
 * Split campaigns into the ones this may delete and the ones it may not.
 *
 * Exported so the rule can be tested without a database and without deleting
 * anything: the interesting cases are a played campaign that happens to have
 * the example territories, and an unplayed one that does not.
 */
export function classifyCampaigns(campaigns) {
  const disposable = [];
  const keep = [];

  for (const c of campaigns) {
    const names = (c.territories ?? []).map((t) => t.name);
    const isExampleShape = sameSet(names, EXAMPLE_TERRITORIES);
    const matches = c._count?.matches ?? 0;

    /* Played beats shape. A campaign with a match in it has been used,
       whatever its territories look like. */
    if (isExampleShape && matches === 0) disposable.push(c);
    else {
      keep.push({
        campaign: c,
        why: matches > 0
          ? `${matches} match record(s) — it has been played`
          : `${names.length} territories, not the example four`,
      });
    }
  }

  return { disposable, keep };
}

/**
 * The same rows, over Neon's HTTP SQL endpoint instead of port 5432.
 *
 * Some environments can reach the database host on 443 and not on 5432 — a
 * sandbox behind an HTTPS proxy is the case this was written for, where
 * `prisma.campaign.findMany()` fails with "Can't reach database server" while
 * `https://<host>/sql` answers fine.
 *
 * Behind an explicit `--http` flag rather than a fallback on connection
 * error. A transport that silently changes under you is how you end up unsure
 * which database you just deleted rows from, and this script deletes rows.
 *
 * It returns the SAME SHAPE `findMany` returns, so `classifyCampaigns` — the
 * one place the rule lives — does not know or care which path fetched them.
 */
async function fetchOverHttp(sql, params = []) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  const host = new URL(url.replace(/^postgres(ql)?:/, 'https:')).host;

  const res = await fetch(`https://${host}/sql`, {
    method: 'POST',
    headers: { 'Neon-Connection-String': url, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, params }),
  });
  if (!res.ok) {
    // Loudly. A cleanup that cannot read must not go on to decide what to keep.
    throw new Error(`Neon HTTP endpoint returned ${res.status}: ${await res.text()}`);
  }
  return (await res.json()).rows;
}

async function campaignsOverHttp() {
  const rows = await fetchOverHttp(`
    select c.id,
           c.name,
           c."createdAt",
           coalesce(t.names, '{}') as territory_names,
           coalesce(m.n, 0)       as match_count,
           coalesce(p.n, 0)       as member_count
      from "Campaign" c
      left join (select "campaignId", array_agg(name) as names
                   from "TerritoryNode" group by "campaignId") t
             on t."campaignId" = c.id
      left join (select "campaignId", count(*)::int as n
                   from "MatchRecord" group by "campaignId") m
             on m."campaignId" = c.id
      left join (select "campaignId", count(*)::int as n
                   from "CampaignMember" group by "campaignId") p
             on p."campaignId" = c.id
     order by c."createdAt" asc
  `);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: new Date(r.createdAt),
    territories: (r.territory_names ?? []).map((name) => ({ name })),
    _count: { matches: Number(r.match_count), members: Number(r.member_count) },
  }));
}

async function deleteOverHttp(ids) {
  // Cascades from `Campaign` take the territories, members and sync ops.
  await fetchOverHttp('delete from "Campaign" where id = any($1::text[])', [ids]);
}

const overHttp = process.argv.includes('--http');

async function main() {
  const campaigns = overHttp ? await campaignsOverHttp() : await prisma.campaign.findMany({
    include: {
      territories: { select: { name: true } },
      _count: { select: { matches: true, members: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!campaigns.length) {
    console.log('No campaigns in this database. Nothing to do.');
    return;
  }

  const { disposable, keep } = classifyCampaigns(campaigns);

  console.log(`${campaigns.length} campaign(s) in this database.\n`);

  if (keep.length) {
    console.log(`KEPT (${keep.length}) — this script will not touch these:`);
    for (const k of keep) {
      console.log(`  ${k.campaign.id}  "${k.campaign.name}"  — ${k.why}`);
    }
    console.log();
  }

  if (!disposable.length) {
    console.log('Nothing matches the example shape. Nothing to delete.');
    return;
  }

  console.log(`EXAMPLE SHAPE (${disposable.length}) — four fixed territories, never played:`);
  for (const c of disposable) {
    console.log(`  ${c.id}  "${c.name}"  ${c._count.members} member(s), created ${c.createdAt.toISOString().slice(0, 10)}`);
  }
  console.log();

  if (!commit) {
    console.log('Report only. Re-run with --yes to delete the campaigns listed above.');
    console.log('Their territories, members and sync operations go with them (ON DELETE CASCADE).');
    return;
  }

  const ids = disposable.map((c) => c.id);
  if (overHttp) {
    await deleteOverHttp(ids);
    console.log(`Deleted ${ids.length} campaign(s).`);
    return;
  }

  const { count } = await prisma.campaign.deleteMany({ where: { id: { in: ids } } });
  console.log(`Deleted ${count} campaign(s).`);
}

/* Importing this module to test `classifyCampaigns` must not open a database
   connection or delete anything. */
if (process.argv[1]?.endsWith('clear-example-campaigns.mjs')) {
  main()
    .catch((e) => { console.error(e.message); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
