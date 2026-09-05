/**
 * Who runs this, and how to reach them.
 *
 * One module, because the three legal pages must not disagree about it — and
 * because this is the only content in the app that cannot be derived from the
 * code or the catalogues. It is a fact about a person, so it is supplied here
 * rather than invented anywhere else.
 *
 * ## Why the name is nullable and has no placeholder
 *
 * A privacy policy that names a made-up operator is a lie on the page whose
 * whole job is to be true, and "TODO" shipped to production is the same lie
 * with worse grammar. So the pages are written to read correctly with the name
 * absent: they describe the project honestly as a one-person, non-commercial
 * build and give an address that answers. Set `NAME` and `COUNTRY` and the
 * pages say more; leave them null and nothing on the page is false.
 *
 * Rule 2 in CLAUDE.md, applied to prose.
 */

/**
 * The contact address. Reaches a person.
 *
 * This must be a MAILBOX THAT ACCEPTS MAIL before the pages are of any use:
 * an address in a privacy policy that bounces is worse than no policy, both
 * for the reader and for a Safe Browsing reviewer checking whether the site
 * has an operator at all.
 */
export const CONTACT = 'admin@trenchline.app';

/**
 * The operator's name or handle, or null if they would rather not be named.
 *
 * Null is a supported state and not a defect — see the note above.
 */
export const NAME: string | null = null;

/**
 * The country the operator is in, or null.
 *
 * Only used to say where a dispute would be heard and which authority a data
 * complaint goes to. Both sentences are omitted when it is null, because a
 * guessed jurisdiction is worse than a silent one.
 */
export const COUNTRY: string | null = null;

/** The day the current text took effect. Bump it when the wording changes. */
export const EFFECTIVE = '5 September 2026';
