import { mailer } from './mail';
import { issueToken } from './authTokens';

/**
 * The two messages this application sends, and the links in them.
 *
 * Separate from the routes so that a route never decides what to send, only
 * that something should be — and so the "same answer whatever the truth" rule
 * in the routes is not tangled up with what the mail says.
 */

const appUrl = () =>
  (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

/**
 * Send a verification link, if this deployment can send mail at all.
 *
 * Returns whether anything was sent. Callers do NOT vary their response on it:
 * a registration that answers differently when mail fails is a membership
 * oracle wearing a different hat.
 */
export async function sendVerification(userId: string, email: string): Promise<boolean> {
  const transport = mailer();
  if (!transport) return false;

  const token = await issueToken(userId, 'EMAIL_VERIFICATION');
  await transport.send({
    to: email,
    subject: 'Verify your TrenchLine address',
    text:
      'Someone asked to create a TrenchLine account with this address.\n\n'
      + `Confirm it: ${appUrl()}/auth/verify?token=${token}\n\n`
      + 'The link works once and expires in 24 hours.\n'
      + 'If this was not you, ignore this message — no account can be used '
      + 'until the address is confirmed.',
  });
  return true;
}

/**
 * Send a password-reset link.
 *
 * Only ever called for an account that exists and has a password. A caller
 * that skips it must still answer the request identically — which is why this
 * returns nothing a route would branch on.
 */
export async function sendPasswordReset(userId: string, email: string): Promise<boolean> {
  const transport = mailer();
  if (!transport) return false;

  const token = await issueToken(userId, 'PASSWORD_RESET');
  await transport.send({
    to: email,
    subject: 'Reset your TrenchLine password',
    text:
      'Someone asked to reset the password for this TrenchLine account.\n\n'
      + `Choose a new one: ${appUrl()}/auth/reset?token=${token}\n\n`
      + 'The link works once and expires in an hour.\n'
      + 'If this was not you, nothing has changed and you can ignore this.',
  });
  return true;
}

/**
 * Tell the address owner that someone tried to register it.
 *
 * The counterpart to answering every registration identically: the caller
 * learns nothing, so this is the only channel where the truth goes. It also
 * warns a real user that somebody is trying their address, which the old 409
 * told the attacker instead.
 *
 * `hasPassword` decides which of two true things to say — that they already
 * have a password, or that they sign in with Google — and neither reaches
 * anyone but the mailbox.
 */
export async function notifyExistingAccount(
  email: string,
  hasPassword: boolean,
): Promise<boolean> {
  const transport = mailer();
  if (!transport) return false;

  await transport.send({
    to: email,
    subject: 'Someone tried to register your TrenchLine address',
    text:
      'Someone just tried to create a TrenchLine account with this address, '
      + 'which already has one.\n\n'
      + (hasPassword
        ? 'Sign in with the password you already chose. If you have forgotten '
          + 'it, use "Forgot password" rather than registering again.\n\n'
        : 'This address signs in with Google — use that button rather than a '
          + 'password.\n\n')
      + 'If this was not you, nothing has changed and no action is needed. '
      + 'Your password has not been altered.',
  });
  return true;
}
