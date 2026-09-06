import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT, COUNTRY, EFFECTIVE } from '../operator';
import { H2, H3, LI, Mail, P, Term, UL } from '../prose';

export const metadata: Metadata = {
  title: 'Privacy Policy | TrenchLine',
  description:
    'Exactly what TrenchLine stores, where it stores it, who else can see it, '
    + 'and how to have it deleted. No analytics, no advertising, no tracking.',
  alternates: { canonical: '/privacy' },
};

/**
 * The privacy policy, written from the schema rather than from a template.
 *
 * Every claim below is checkable in this repository, and the checks are named
 * so a later change that falsifies one is findable:
 *
 *   "no analytics"          package.json has no analytics dependency, and no
 *                           component imports one. `src/app/layout.tsx` loads
 *                           three fonts through `next/font/google`, which
 *                           downloads them AT BUILD TIME — no visitor IP
 *                           reaches Google to render a page.
 *   the account fields      `model User` in prisma/schema.prisma.
 *   the Google fields       `model Account`, populated by NextAuth.
 *   the token handling      `model AuthToken` — SHA-256 at rest, single use.
 *   the sync fields         `model Warband`, `model Campaign` and friends.
 *   the directory fields    `PUBLIC_SELECT` and `toPublic` in
 *                           src/app/api/warbands/route.ts. That list is the
 *                           whole public projection.
 *   the bug report fields   `model BugReport`. `reporterId` comes from the
 *                           session, never from the request body.
 *   "we never sell it"      there is nowhere to sell it to: the only outbound
 *                           calls this app makes are to its own database.
 *
 * If you change one of those and not this page, the page becomes false. See
 * CLAUDE.md rule 4, and `src/app/(legal)/__tests__/legal.test.tsx`, which
 * pins the directory field list to the code.
 */
export default function PrivacyPage() {
  return (
    <article>
      <h1 className="font-gothic text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
        Privacy Policy
      </h1>
      <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.14em] text-theme-muted">
        In effect {EFFECTIVE}
      </p>

      <H2 id="short">The short version</H2>
      <UL>
        <LI>There is no analytics, no advertising and no tracking of any kind.</LI>
        <LI>
          No third-party script runs on this site. The fonts are compiled into
          the site at build time, so loading a page contacts nobody but this
          server.
        </LI>
        <LI>
          Without an account, your warbands never leave your browser. Nothing is
          sent anywhere.
        </LI>
        <LI>
          With an account, the only personal detail stored is your email
          address — used to sign you in, and nothing else.
        </LI>
        <LI>Your data is never sold, rented, or shared for anyone&rsquo;s marketing.</LI>
        <LI>
          Ask at <Mail address={CONTACT} /> and your account and everything
          attached to it will be deleted.
        </LI>
      </UL>

      <H2 id="no-account">If you never make an account</H2>
      <P>
        You can build warbands, run a campaign and use the combat companion
        without signing in. All of it is stored by your own browser, in local
        storage, under keys beginning <code className="font-mono text-[14px] text-brand-plate">tc_</code>{' '}
        — your warbands, the active one, your campaign, any custom units or
        wargear, your theme and your ruleset choice.
      </P>
      <P>
        None of that is transmitted. It is on your device, it is readable by you
        and by anything else with access to that browser profile, and clearing
        your site data deletes it permanently. There is no copy elsewhere to
        restore from, which is the trade for not having to trust anyone with it.
      </P>

      <H2 id="account">If you make an account</H2>
      <H3>What is stored about you</H3>
      <UL>
        <LI>
          <Term>Email address</Term> — your identifier. It is what you sign in
          with and where a password-reset link would go. It is never shown to
          other users and never used for marketing.
        </LI>
        <LI>
          <Term>Password</Term> — stored only as a bcrypt hash. The password
          itself is never written down, and it cannot be recovered from the
          hash. If you sign in with Google, there is no password at all.
        </LI>
        <LI>
          <Term>Display name and avatar</Term> — only if Google supplies them,
          or you set them. The display name is the credit shown beside a warband
          you publish to the directory.
        </LI>
        <LI>
          <Term>Account housekeeping</Term> — when the account was created and
          last updated, whether the address has been verified, a counter used to
          sign you out everywhere after a password reset, and whether the
          account is an administrator.
        </LI>
      </UL>

      <H3>Signing in with Google</H3>
      <P>
        Google sign-in is optional; email and password works without it. If you
        use it, Google tells this site your Google account id, your email
        address, and your name and profile picture if you have them, and the
        site stores those together with the access tokens Google issues so the
        sign-in can be completed. Nothing is ever read from or written to your
        Google account beyond that, and this site sends Google nothing about
        what you do here.
      </P>

      <H3>Email we send you</H3>
      <P>
        Address verification and password reset, and nothing else. There is no
        newsletter and no announcement list. A reset or verification link is
        stored only as a SHA-256 hash with an expiry, so someone reading the
        database — a backup, a log — cannot use it to take an account. Links
        expire and work once.
      </P>

      <H2 id="sync">What you choose to sync</H2>
      <P>
        Syncing is a thing you do, not a thing that happens. When you sync a
        warband or publish a campaign, a copy is stored on the server against
        your account:
      </P>
      <UL>
        <LI>
          <Term>Warbands</Term> — the roster: its name, faction, ducat limit,
          treasury, glory, every model with its wargear and advances, the
          armoury stash, and your notes on it.
        </LI>
        <LI>
          <Term>Campaigns</Term> — the campaign name and settings, its invite
          code, the members and their warband names, the territory map, the
          match records, and any narrative log your group writes into it.
        </LI>
        <LI>
          <Term>Custom rules</Term> — any unit, weapon, armour or equipment you
          define yourself, if you sync it.
        </LI>
      </UL>
      <P>
        A campaign is shared by design: other members of a campaign you join can
        see your warband name, faction, glory, rating and results, because that
        is what a campaign table is. They cannot see your email address.
      </P>

      <H2 id="directory">The public directory</H2>
      <P>
        A synced warband is <strong>private by default</strong>. It appears in
        the public directory only if you change its visibility to public
        yourself. When it does, exactly these fields are published and no
        others: the warband name, its faction, its ducat limit, its glory, the
        number of models in it, its motto if you wrote one, the date it was
        created, and your display name — or &ldquo;Crusade Commander&rdquo; if
        you have not set one.
      </P>
      <P>
        Your email address is not in that list and cannot be reached through it.
        Set the warband back to private and it leaves the directory.
      </P>

      <H2 id="bugs">Bug reports</H2>
      <P>
        The in-app bug reporter sends a title, a description, a severity and
        the area of the app. If you are signed in it is linked to your account,
        so a follow-up is possible; if you are not, it is anonymous. Whatever
        you type into the description is what gets stored — so please do not
        paste anything into it that you would not want kept.
      </P>

      <H2 id="cookies">Cookies</H2>
      <P>
        One cookie, set only after you sign in: the session cookie that keeps
        you signed in. It is set by the server, marked HTTP-only and secure, and
        it holds nothing but your signed session. There are no advertising,
        analytics or preference cookies — your theme and settings are kept in
        local storage on your own device, not in a cookie, and are never sent.
      </P>

      <H2 id="others">Who else can see it</H2>
      <P>
        Three companies, each because the site cannot run without them, and each
        seeing only what that role requires:
      </P>
      <UL>
        <LI>
          <Term>Vercel</Term> — hosts the site. Serving a page necessarily means
          Vercel handles the request, including your IP address, as any web host
          would.
        </LI>
        <LI>
          <Term>Neon</Term> — hosts the database, so it holds the account and
          sync data described above, encrypted in transit.
        </LI>
        <LI>
          <Term>Google</Term> — only if you choose Google sign-in, and only for
          that sign-in.
        </LI>
      </UL>
      <P>
        Nobody else. Your data is not sold, not rented, not shared with
        advertisers or data brokers, and not used to train anything. It would be
        disclosed only if a valid legal order required it.
      </P>

      <H2 id="retention">How long it is kept, and how to delete it</H2>
      <P>
        Account data is kept for as long as the account exists. Delete a
        warband or a campaign in the app and the server copy goes with it.
      </P>
      <P>
        <strong>Delete account</strong> is in the account menu, at the top
        right. It shows you exactly what will be destroyed before you confirm —
        your warbands, your custom rules, the campaigns you play in, and any
        campaign you <em>run</em>, which is deleted for every player in it —
        and then does it immediately. There is no waiting period and no
        recovery: a warband you had published to the directory leaves it at the
        same moment.
      </P>
      <P>
        Bug reports are the one exception, and they survive without you: the
        report stays so the problem can still be fixed, with the link to your
        account removed. Nothing in it identifies you unless you typed
        something identifying into the description.
      </P>
      <P>
        If you would rather not do it yourself, or the button will not work for
        you, mail <Mail address={CONTACT} /> from the address on the account and
        it will be done for you.
      </P>

      <H2 id="rights">Your rights</H2>
      <P>
        You can ask for a copy of what is stored about you, ask for it to be
        corrected, or ask for it to be erased. Mail <Mail address={CONTACT} />{' '}
        from the account address. There is no charge and no account is closed
        or degraded for asking.
      </P>
      {COUNTRY ? (
        <P>
          If you are in the UK or the EEA and are not satisfied with the
          response, you may complain to your national data protection
          authority. The operator of this site is in {COUNTRY}.
        </P>
      ) : (
        <P>
          If you are in the UK or the EEA and are not satisfied with the
          response, you may complain to your national data protection authority.
        </P>
      )}

      <H2 id="children">Children</H2>
      <P>
        This site is not directed at children under 13, and accounts are not
        knowingly created for them. If you believe a child has made an account,
        write to <Mail address={CONTACT} /> and it will be removed.
      </P>

      <H2 id="security">Security</H2>
      <UL>
        <LI>Every connection is HTTPS, enforced by HSTS for two years.</LI>
        <LI>Passwords are bcrypt-hashed; verification and reset links are stored hashed and expire.</LI>
        <LI>
          Every request for a warband or campaign is checked against the account
          that owns it, on the server, on every call.
        </LI>
        <LI>Account and invite endpoints are rate-limited.</LI>
      </UL>
      <P>
        No system is perfect and this one is maintained by one person. If you
        find a security problem, please report it to <Mail address={CONTACT} />{' '}
        rather than publicly, and you will get a reply.
      </P>

      <H2 id="changes">Changes</H2>
      <P>
        If this policy changes in a way that matters, the date at the top
        changes with it and the previous wording stays in this project&rsquo;s
        public history. Continuing to use the site after a change means the new
        version applies.
      </P>
      <P>
        The companion document is the{' '}
        <Link
          href="/terms"
          className="text-brand-oxblood-ink underline underline-offset-4 hover:text-brand-gold"
        >
          terms of use
        </Link>
        .
      </P>
    </article>
  );
}
