/**
 * Reading a Trench Companion share link.
 *
 * The only thing this file decides is **which warband id the user meant**, and
 * it is separate from both the route that fetches and the importer that reads
 * the result because all three have to agree on it and only this one is worth
 * testing on its own.
 *
 * See `docs/TRENCH-COMPANION-IMPORT.md` for the endpoint, the etiquette and
 * what the import does and does not map.
 */

/**
 * Where the share page's JSON comes from.
 *
 * `trench-companion.com/warband/detail/<id>` is the page a player pastes into
 * a group chat; this is the endpoint behind it, served without a login. The id
 * is appended by `trenchCompanionUrl`, encoded.
 */
export const TRENCH_COMPANION_ENDPOINT =
  'https://synod.trench-companion.com/wp-json/synod/v1/warband/';

/** The page a share link points at, for the error messages to quote. */
export const TRENCH_COMPANION_SHARE_PREFIX =
  'https://trench-companion.com/warband/detail/';

/**
 * What an id is allowed to look like.
 *
 * Every id measured is decimal, and the share path carries nothing else. The
 * character class is wider than that on purpose — it costs nothing and a
 * non-numeric id would otherwise be rejected by us rather than by their host —
 * but it excludes `/`, `.`, `%` and `:`, so nothing a user pastes can steer
 * the request at a different path or a different host. It is a path segment,
 * and this is what keeps it one.
 */
const ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * The `<id>` out of a share link, or a bare id typed on its own.
 *
 * Accepted, because all of them are what a player has to hand:
 *
 *   https://trench-companion.com/warband/detail/225201
 *   trench-companion.com/warband/detail/225201?whatever
 *   225201
 *
 * Anything else is refused with a sentence that says what was expected, rather
 * than guessed at. A link we half-recognise and silently read the last path
 * segment of is how somebody ends up importing a different warband.
 */
export function parseTrenchCompanionRef(
  input: string,
): { ok: true; id: string } | { ok: false; reason: string } {
  const raw = (input ?? '').trim();
  if (!raw) {
    return { ok: false, reason: 'Paste a Trench Companion share link, or the warband id on its own.' };
  }

  if (ID.test(raw)) return { ok: true, id: raw };

  /*
    Parsed as a URL rather than scanned for digits. A regexp over the whole
    string would happily take the `1` out of `https://example.com/1` and call
    it a Trench Companion warband.
  */
  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return {
      ok: false,
      reason: `'${raw}' is neither a warband id nor a link. A share link looks like `
        + `${TRENCH_COMPANION_SHARE_PREFIX}225201`,
    };
  }

  const host = url.hostname.toLowerCase();
  if (host !== 'trench-companion.com' && !host.endsWith('.trench-companion.com')) {
    return { ok: false, reason: `That link points at ${url.hostname}, not trench-companion.com.` };
  }

  /* The share path, exactly: `/warband/detail/<id>`. */
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.indexOf('detail');
  const id = at >= 0 ? parts[at + 1] : undefined;
  if (!id || !ID.test(id)) {
    return {
      ok: false,
      reason: `That link carries no warband id. A share link looks like `
        + `${TRENCH_COMPANION_SHARE_PREFIX}225201`,
    };
  }
  return { ok: true, id };
}

/** The endpoint for one id. The id is encoded; see `ID` above. */
export const trenchCompanionUrl = (id: string): string =>
  `${TRENCH_COMPANION_ENDPOINT}${encodeURIComponent(id)}`;
