/**
 * What the landing page's three previews actually show.
 *
 * The page's own claim, three paragraphs above them, is that nothing in the
 * app is typed in by hand. Previews of that app that were typed in by hand
 * would be the one place on the site that breaks the promise it makes — so
 * every rule, cost, statline and keyword below is read out of the generated
 * dataset, and a lookup that misses throws at build time rather than
 * rendering something plausible.
 *
 * ## Why this is not a client module
 *
 * `trenchline.generated.ts` is 2.7 MB. Importing it into `page.tsx` would put
 * the entire catalogue into the bundle a first-time visitor downloads before
 * they have decided whether they want the app at all. It is imported by the
 * SERVER component instead, which picks out the two dozen strings the
 * previews need and passes those across as props.
 */
import DATASET from '@/data/generated/trenchline.generated';
import { buildArsenal } from '@/rules/arsenal';

export interface KeywordQuote {
  name: string;
  /** 'Tag' or 'Effect' — the glossary's own distinction. */
  type: string;
  /** The published text, verbatim and entire. */
  description: string;
}

export interface ArmouryRow {
  name: string;
  /** As printed, curly inch marks and all. */
  range: string;
  keywords: string[];
  ducats: number;
  glory: number;
}

export interface LandingPreviews {
  /** A model the app can actually recruit, for the combat HUD. */
  warrior: string;
  keyword: KeywordQuote;
  /** Published Carcass Front zones, for the campaign chronicle. */
  territories: [string, string];
  armoury: { faction: string; rows: ArmouryRow[] };
}

/**
 * The keyword the HUD preview quotes.
 *
 * BLOOD MARKER because its published entry is 80 characters — a complete rule
 * that fits in a popover. The design asked for BLAST (X”) as well; its real
 * entry runs to 200 words, and the only ways to fit that in a preview are to
 * shorten it, which is a paraphrase of a rule, or to write a shorter one,
 * which is worse. So the preview shows the rule that is genuinely short.
 */
const QUOTED_KEYWORD = 'BLOOD MARKER';

/** A real New Antioch profile, so the HUD is showing a model you can field. */
const WARRIOR = 'Sniper Priest';

/**
 * The armoury the codex preview quotes, and the reason it is named on screen.
 *
 * Wargear is priced *per faction* — an Automatic Rifle is 40 Ducats in the New
 * Antioch table and 2 Glory in the Heretic Legions'. A price column with no
 * armoury over it is the exact error `src/rules/arsenal.ts` exists to prevent,
 * so the panel says whose table it is.
 *
 * The Heretic Legions, specifically, because theirs is the table that prices
 * in both currencies: three of its thirteen ranged weapons cost Glory. An
 * armoury with an empty Glory column would demonstrate nothing.
 */
const QUOTED_ARMOURY = 'heretic-legions';
const ARMOURY_ROWS = 5;

/*
  A function declaration, not an arrow const: TypeScript only treats a call as
  terminating control flow — which is what lets the checks below narrow — when
  the callee is a declaration or a `const` with an explicit type annotation.
*/
function fail(what: string): never {
  throw new Error(
    `The landing page previews cannot be built: ${what}. `
    + 'Fix the lookup or remove the preview — do not substitute a placeholder.',
  );
}

export function landingPreviews(): LandingPreviews {
  const keyword = DATASET.keywords.find((k) => k.name === QUOTED_KEYWORD)
    ?? fail(`no keyword named "${QUOTED_KEYWORD}" in the glossary`);
  /*
    The glossary carries `type` and `description` as optional, because some
    entries are cross-references with neither. The preview quotes a rule, so an
    entry missing either is not one it can show — and showing the name over an
    empty quote box would be the placeholder this file exists to refuse.
  */
  if (!keyword.type || !keyword.description) {
    return fail(`the glossary entry for ${QUOTED_KEYWORD} has no rule text to quote`);
  }

  const warrior = DATASET.units.find((u) => u.name === WARRIOR)
    ?? fail(`no unit profile named "${WARRIOR}"`);

  const zones = (DATASET.carcassFrontMap?.zones ?? []).map((z) => z.name);
  const [held, lost] = zones;
  if (held === undefined || lost === undefined) {
    /*
      `return fail(...)`, not a bare call. `tsconfig.json` sets
      `noUncheckedIndexedAccess`, so these are `string | undefined` until the
      compiler is shown that this branch cannot fall through — and returning a
      `never` says that without relying on control-flow analysis of the call.
    */
    return fail(
      `the Carcass Front map yields ${zones.length} named zones, and the preview shows two`,
    );
  }

  const arsenal = buildArsenal(DATASET);
  const rows = arsenal
    .filter((item) => item.section === 'Ranged Weapons')
    .flatMap((item) => {
      const offer = item.offers.find((o) => o.factionId === QUOTED_ARMOURY);
      return offer
        ? [{
          name: item.name,
          range: item.range ?? '—',
          keywords: item.keywords,
          ducats: offer.cost.ducats,
          glory: offer.cost.glory,
        }]
        : [];
    });
  if (rows.length < ARMOURY_ROWS) {
    return fail(
      `the ${QUOTED_ARMOURY} armoury stocks only ${rows.length} ranged weapons; `
      + `the preview shows ${ARMOURY_ROWS}`,
    );
  }

  /*
    Glory-priced rows first, so the column the design colours oxblood has
    something in it above the fold of a five-row panel. Alphabetical within
    each group, which is the order the Armoury Tables print.
  */
  const ordered = [...rows].sort((a, b) =>
    (b.glory > 0 ? 1 : 0) - (a.glory > 0 ? 1 : 0) || a.name.localeCompare(b.name));

  /* The armoury's own display name, taken from an offer rather than spelled here. */
  const faction = arsenal
    .flatMap((item) => item.offers)
    .find((o) => o.factionId === QUOTED_ARMOURY)?.faction
    ?? fail(`no display name for the ${QUOTED_ARMOURY} armoury`);

  return {
    warrior: warrior.name,
    keyword: { name: keyword.name, type: keyword.type, description: keyword.description },
    territories: [held, lost],
    armoury: { faction, rows: ordered.slice(0, ARMOURY_ROWS) },
  };
}
