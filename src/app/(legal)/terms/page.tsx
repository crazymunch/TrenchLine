import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT, COUNTRY, EFFECTIVE } from '../operator';
import { H2, LI, Mail, P, UL } from '../prose';

export const metadata: Metadata = {
  title: 'Terms of Use | TrenchLine',
  description:
    'The terms for using TrenchLine: a free, unofficial, non-commercial companion '
    + 'app for Trench Crusade, provided as-is by one hobbyist.',
  alternates: { canonical: '/terms' },
};

/**
 * The terms.
 *
 * Short on purpose. This is a free hobby tool with no payment, no contract to
 * renew and no data to monetise, so most of what a standard terms-of-service
 * template covers does not exist here — and a page of boilerplate about
 * subscriptions and arbitration on a site with neither is its own kind of
 * dishonesty. What is left is what actually applies: it is unofficial, it is
 * free, it is as-is, your data is yours, don't attack it.
 */
export default function TermsPage() {
  return (
    <article>
      <h1 className="font-gothic text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
        Terms of Use
      </h1>
      <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.14em] text-theme-muted">
        In effect {EFFECTIVE}
      </p>
      <P>
        TrenchLine is a free, unofficial companion app for the tabletop game{' '}
        <em>Trench Crusade</em>. Using it means accepting what is below. It is
        short because there is not much to it.
      </P>

      <H2 id="unofficial">1. Unofficial, and not a rules authority</H2>
      <P>
        TrenchLine is not made, endorsed, sponsored or reviewed by the creators
        or publishers of <em>Trench Crusade</em>. All game rules, statlines,
        costs, names and setting material remain theirs. The app reads them from
        the published catalogues and rulebooks so that it can show them to you
        while you play.
      </P>
      <P>
        Where the app and the published rules disagree, the published rules win.
        Do not use a card on this screen to settle an argument at the table.
      </P>
      <P>
        If you hold rights in that material and want something changed or taken
        down, write to <Mail address={CONTACT} />. It will be handled promptly
        and without argument.
      </P>

      <H2 id="free">2. Free, and provided as-is</H2>
      <P>
        There is no charge, no subscription and nothing for sale. In return,
        the app is provided as-is and without warranty of any kind. It may
        contain errors, it may be unavailable, and a future change may lose data
        that was only ever stored in one browser.
      </P>
      <P>
        Keep your own record of anything you would be upset to lose. To the
        fullest extent the law allows, the operator is not liable for any loss
        arising from use of the app — including lost rosters, lost campaign
        records, or a game decided on a wrong number. Nothing here limits
        liability for death, personal injury or fraud, which cannot be limited.
      </P>

      <H2 id="account">3. Your account</H2>
      <UL>
        <LI>
          You are responsible for keeping your password to yourself. Tell{' '}
          <Mail address={CONTACT} /> if you think someone else has it.
        </LI>
        <LI>
          One person, one account. Do not create an account for someone else, or
          sign up with an address that is not yours.
        </LI>
        <LI>
          You may ask for your account to be deleted at any time, for any
          reason, and it will be — see the{' '}
          <Link
            href="/privacy"
            className="text-brand-oxblood-ink underline underline-offset-4 hover:text-brand-gold"
          >
            privacy policy
          </Link>
          .
        </LI>
      </UL>

      <H2 id="yours">4. What you make stays yours</H2>
      <P>
        Your warbands, campaigns, notes, mottos and narrative logs are yours.
        No ownership of them is claimed, and they are not used for anything
        other than showing them back to you and to the people you share a
        campaign with.
      </P>
      <P>
        If you publish a warband to the public directory, you are asking for it
        to be displayed publicly, along with your display name — that is what
        the setting does, and it is off unless you turn it on. You can turn it
        off again at any time.
      </P>

      <H2 id="conduct">5. Reasonable use</H2>
      <P>Please do not:</P>
      <UL>
        <LI>
          Publish anything to the directory, a campaign or a bug report that is
          illegal, hateful, harassing, or that you have no right to post.
        </LI>
        <LI>
          Attempt to access another person&rsquo;s account, warbands or
          campaigns.
        </LI>
        <LI>
          Scrape, hammer or otherwise degrade the service for other people. It
          runs on a hobbyist&rsquo;s budget.
        </LI>
        <LI>Attempt to break, probe or disrupt the site or its database.</LI>
      </UL>
      <P>
        Content or accounts that break these may be removed. Given the size of
        this project, that is a judgement call made by one person; if you think
        it was the wrong one, write and say so.
      </P>
      <P>
        Security researchers are welcome. Report a finding to{' '}
        <Mail address={CONTACT} /> before disclosing it, and it will be treated
        as a good-faith report rather than an attack.
      </P>

      <H2 id="availability">6. Availability and changes</H2>
      <P>
        This is a hobby project. It may be changed, interrupted or discontinued.
        If it is ever shut down for good, reasonable notice will be given on the
        site so that you can export what matters to you.
      </P>
      <P>
        These terms may change. The date at the top changes with them, and the
        previous wording remains in this project&rsquo;s public history.
      </P>

      <H2 id="law">7. Law</H2>
      {COUNTRY ? (
        <P>
          These terms are governed by the law of {COUNTRY}, and its courts have
          jurisdiction over any dispute — without affecting any right you have
          to bring a claim where you live.
        </P>
      ) : (
        <P>
          Nothing in these terms takes away a right you have under the consumer
          law of the country you live in. Any dispute is subject to the courts
          available to you there.
        </P>
      )}

      <H2 id="contact">8. Contact</H2>
      <P>
        <Mail address={CONTACT} /> — for anything at all, including the things
        above.
      </P>
    </article>
  );
}
