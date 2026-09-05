/**
 * Sending mail, behind an adapter.
 *
 * AUTH-2 says to "choose and document a mail provider" and not to "embed a
 * provider-specific client throughout route handlers". The provider is a
 * product and billing decision this repository cannot make, so what it ships
 * is the seam and two transports that need no account. Adding a real one is a
 * new `Transport` and a case in `mailer()` — nothing in a route changes.
 *
 * ## What a deployment must choose
 *
 * `MAIL_TRANSPORT` is explicit. There is no default, because each possible
 * default is wrong somewhere:
 *
 *   `log`   Writes the message to the server log and reports success. For
 *           development. It prints the LINK but never the address, so a log
 *           does not become a list of who has an account here.
 *   `none`  No mail is sent, and the application knows it. Verification is
 *           then NOT required to sign in — see below.
 *
 * Unset is treated as `none`, loudly: `mailer()` returns null and the routes
 * that would have sent mail say so in the server log once per process.
 *
 * ## Why `none` does not simply block sign-in
 *
 * Requiring a verified address with no way to verify one locks every account
 * out permanently, including the maintainer's. That is a worse failure than
 * the one it is guarding, so the requirement is tied to the CAPABILITY: a
 * deployment that can send mail requires verification, one that cannot does
 * not, and `authRequiresVerification()` is the single place that decides.
 *
 * That is a real, stated limitation rather than a silent one.
 */

export interface MailMessage {
  to: string;
  subject: string;
  /** Plain text. No HTML, so there is no link-rewriting or tracking surface. */
  text: string;
}

export interface Transport {
  readonly name: string;
  send(message: MailMessage): Promise<void>;
}

/**
 * Development transport.
 *
 * Deliberately does NOT log `to`. An address in a log is a membership record,
 * and the enumeration this whole package exists to close should not be
 * reopened by the thing that implements it.
 */
const logTransport: Transport = {
  name: 'log',
  async send(message) {
    console.info(
      `[mail:log] would send "${message.subject}" to a registered address.\n`
      + message.text.split('\n').map((l) => `  | ${l}`).join('\n'));
  },
};

let warned = false;

/**
 * The configured transport, or null when the deployment cannot send mail.
 *
 * Null is a supported state, not an error: the application degrades to "no
 * verification required" rather than to "nobody can sign in".
 */
export function mailer(): Transport | null {
  const choice = (process.env.MAIL_TRANSPORT ?? '').trim().toLowerCase();

  if (choice === 'log') return logTransport;
  if (choice === 'none' || choice === '') {
    if (!warned) {
      warned = true;
      console.warn(
        '[mail] MAIL_TRANSPORT is not set. No verification or password-reset mail '
        + 'will be sent, and email verification is therefore NOT required to sign '
        + 'in. Set MAIL_TRANSPORT=log in development, or add a real transport in '
        + 'src/lib/mail.ts before inviting public sign-ups.');
    }
    return null;
  }

  /*
    An unknown value is a configuration mistake and fails loudly. Falling back
    to `none` would silently disable verification on a deployment that believed
    it had configured a mailer — the quiet wrong answer this codebase's second
    rule is about.
  */
  throw new Error(
    `MAIL_TRANSPORT="${choice}" is not a transport this build knows. `
    + 'Use "log", "none", or add one in src/lib/mail.ts.');
}

/**
 * Does this deployment require a verified address before a credentials
 * sign-in?
 *
 * Tied to the capability, for the reason in the header: requiring proof nobody
 * can produce locks everyone out.
 */
export function authRequiresVerification(): boolean {
  return mailer() !== null;
}

/** Reset the once-per-process warning. Tests only. */
export function resetMailWarning(): void {
  warned = false;
}
