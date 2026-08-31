/**
 * A short code for a warband, to search by and to read out loud.
 *
 * Derived from the warband's id rather than stored on it, which is what makes
 * it work at all here: every warband that already exists gets one immediately,
 * offline, with no migration and no backfill, and the code never changes for
 * the life of the roster. A stored field would have needed all three, and a
 * warband whose code went missing in a sync would have been unfindable by the
 * code someone had already written down.
 *
 * Five characters from a 32-letter alphabet is 33.5 million codes. The alphabet
 * leaves out `0`, `O`, `1` and `I` because the point of a short code is that
 * someone reads it across a table and someone else types it in.
 */

/** No 0/O or 1/I: this gets read aloud and typed in by hand. */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const CODE_LENGTH = 5;

/**
 * FNV-1a, 32-bit. Not for security — for a stable, well-spread mapping from an
 * arbitrary id string to five characters, that gives the same answer in every
 * browser and on the server.
 */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** The code for a warband id. Stable, and the same everywhere. */
export function warbandCode(id: string): string {
  // Two rounds, so the 25 bits a five-character code needs are not just the
  // low end of one hash — ids differing only in their last digit (`wb-1730...1`
  // and `wb-...2`) would otherwise land next to each other.
  const a = hash(id);
  const b = hash(`${id}:${a}`);
  let n = (a ^ (b << 13)) >>> 0;

  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out = ALPHABET[n % ALPHABET.length] + out;
    n = Math.floor(n / ALPHABET.length);
    if (n === 0) n = hash(`${id}:${i}`);
  }
  return out;
}

/**
 * Normalise what someone typed.
 *
 * Anything that is not a code character is dropped, so `al-qarn` and `ALQARN`
 * and `al qarn` all reduce the same way, and a pasted `#7K3M9` finds the code.
 */
export function normaliseCode(input: string): string {
  return input.toUpperCase().replace(new RegExp(`[^${ALPHABET}]`, 'g'), '');
}

/** Is this string shaped like a code someone is trying to look up? */
export function looksLikeCode(input: string): boolean {
  const n = normaliseCode(input);
  return n.length === CODE_LENGTH && n === input.toUpperCase().replace(/[\s#-]/g, '');
}

export interface Searchable {
  id: string;
  name: string;
  factionId?: string;
}

/**
 * Does this warband match what was typed — by name, by faction, or by code?
 *
 * The code is matched on a prefix as well as in full, so typing the first two
 * characters narrows the list rather than showing nothing until the fifth.
 */
export function matchesWarband(warband: Searchable, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  if (warband.name.toLowerCase().includes(q)) return true;
  if (warband.factionId?.toLowerCase().includes(q)) return true;

  const asCode = normaliseCode(query);
  return asCode.length > 0 && warbandCode(warband.id).startsWith(asCode);
}

/**
 * Codes that are not unique in this set.
 *
 * Derived codes can in principle collide, and a duplicate would make one of the
 * two warbands unreachable by code. Rare enough not to design around, common
 * enough that the UI should be able to say so rather than quietly show the
 * wrong roster.
 */
export function collidingCodes(warbands: Searchable[]): Set<string> {
  const seen = new Map<string, string>();
  const clashes = new Set<string>();
  for (const w of warbands) {
    const code = warbandCode(w.id);
    const first = seen.get(code);
    if (first !== undefined && first !== w.id) clashes.add(code);
    else seen.set(code, w.id);
  }
  return clashes;
}
