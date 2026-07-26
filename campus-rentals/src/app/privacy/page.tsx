import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Campus Rentals LLC collects, uses, and protects the information you share when you inquire about a home, request a tour, or join a waitlist.',
  alternates: { canonical: 'https://campusrentalsllc.com/privacy' },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="July 23, 2026"
      intro="We collect the minimum we need to answer you and show you homes. We do not sell your information."
    >
      <div>
        <h2>What we collect</h2>
        <p>When you contact us, request a tour, or join a waitlist, we collect what you type into the form:</p>
        <ul>
          <li>Your name, email address, and phone number if you give it</li>
          <li>The property you asked about and any message or notes you include</li>
          <li>For a tour, the date and time you requested</li>
        </ul>
        <p>
          We also receive standard analytics information — pages viewed, approximate region, browser and
          device type — through Google Analytics and Google Ads, which use cookies. This is aggregate
          traffic data, not something we use to identify you personally.
        </p>
      </div>

      <div>
        <h2>How we use it</h2>
        <ul>
          <li>To reply to your question and schedule or confirm a tour</li>
          <li>To tell you about availability, pricing, and move-in dates for homes you asked about</li>
          <li>To improve the website and understand which pages people find useful</li>
        </ul>
        <p>We do not sell, rent, or trade your personal information to anyone.</p>
      </div>

      <div>
        <h2>Who else sees it</h2>
        <p>Only the service providers we need to operate:</p>
        <ul>
          <li>
            <strong>Abodingo</strong> — the leasing platform where tours, inquiries, applications, and
            rent are managed. Tour and inquiry requests are delivered there.
          </li>
          <li>
            <strong>Google</strong> (Analytics and Ads) — website traffic measurement.
          </li>
          <li>
            <strong>Amazon Web Services</strong> and <strong>Resend</strong> — hosting, file storage,
            and transactional email.
          </li>
        </ul>
        <p>We also disclose information if the law requires it.</p>
      </div>

      <div>
        <h2>Investor portal</h2>
        <p>
          If you have an account in our private investor portal, that data — your holdings,
          distributions, tax documents, and any files shared with you — is visible only to you and to
          Campus Rentals administrators. Access is checked on every request.
        </p>
      </div>

      <div>
        <h2>Your choices</h2>
        <ul>
          <li>Ask us what we hold about you, or ask us to correct or delete it</li>
          <li>Tell us to stop contacting you, at any time — just reply and say so</li>
          <li>Block or clear cookies in your browser, or use your browser&apos;s Do Not Track setting</li>
        </ul>
        <p>
          To make any of these requests, email{' '}
          <a href="mailto:rovnerproperties@gmail.com">rovnerproperties@gmail.com</a> or call{' '}
          <a href="tel:5043834552">(504) 383-4552</a>.
        </p>
      </div>

      <div>
        <h2>Children</h2>
        <p>
          This site is intended for adults seeking housing. We do not knowingly collect information
          from anyone under 13.
        </p>
      </div>

      <div>
        <h2>Changes</h2>
        <p>
          If we update this policy we will change the date at the top of this page. Material changes
          will be noted here.
        </p>
      </div>

      <div>
        <h2>Contact</h2>
        <p>
          Campus Rentals LLC · New Orleans, LA and Boca Raton, FL
          <br />
          <a href="mailto:rovnerproperties@gmail.com">rovnerproperties@gmail.com</a> ·{' '}
          <a href="tel:5043834552">(504) 383-4552</a>
        </p>
      </div>
    </LegalPage>
  );
}
