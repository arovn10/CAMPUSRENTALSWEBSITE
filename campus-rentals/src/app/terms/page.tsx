import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description:
    'The terms that apply when you use the Campus Rentals LLC website, including listing accuracy, tour requests, and the limits of what this site does.',
  alternates: { canonical: 'https://campusrentalsllc.com/terms' },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      updated="July 23, 2026"
      intro="Plain terms for using this website. They do not replace your lease — a signed lease always controls."
    >
      <div>
        <h2>Using this site</h2>
        <p>
          You may browse our listings and contact us about them. Please do not scrape the site, try to
          break into any account or system, submit false information, or use the forms to send
          unsolicited commercial messages.
        </p>
      </div>

      <div>
        <h2>Listings are informational</h2>
        <p>
          We work to keep availability, pricing, photos, and descriptions accurate, but they can change
          and errors happen. Nothing on this site is an offer or a binding commitment to lease. Square
          footage, layouts, and finishes are approximate, and photos may show a similar unit rather than
          the exact one available. Terms are confirmed in writing before you sign.
        </p>
      </div>

      <div>
        <h2>Tours and inquiries</h2>
        <p>
          Requesting a tour submits a request, not a confirmed appointment. A tour is only scheduled once
          we confirm it with you. Tours and applications are managed on the Abodingo platform, which has
          its own terms and privacy policy.
        </p>
      </div>

      <div>
        <h2>Under-construction projects</h2>
        <p>
          Pages describing developments that are not yet built — including Maple Street Plaza — show
          plans and renderings from an approved permit set. Layouts, dimensions, finishes, unit counts,
          timelines, and commercial tenants are subject to change during construction. Joining a
          waitlist does not reserve a unit or set a price.
        </p>
      </div>

      <div>
        <h2>Investor portal</h2>
        <p>
          The investor portal is private and for authorized users only. Information there is reported for
          your convenience and is not an offer to sell a security, tax advice, or a guarantee of
          performance. Official records and your governing agreements control.
        </p>
      </div>

      <div>
        <h2>Third-party links</h2>
        <p>
          We link to services we use, including Abodingo. We are not responsible for the content or
          practices of sites we do not operate.
        </p>
      </div>

      <div>
        <h2>Disclaimer and limits</h2>
        <p>
          This site is provided &ldquo;as is,&rdquo; without warranties. To the extent the law allows,
          Campus Rentals LLC is not liable for indirect or consequential damages arising from your use of
          the site. Nothing here limits rights you have under Louisiana or Florida landlord-tenant law or
          under fair housing law.
        </p>
      </div>

      <div>
        <h2>Governing law</h2>
        <p>These terms are governed by the laws of the State of Louisiana.</p>
      </div>

      <div>
        <h2>Contact</h2>
        <p>
          Questions about these terms:{' '}
          <a href="mailto:arovner@campusrentalsllc.com">arovner@campusrentalsllc.com</a> ·{' '}
          <a href="tel:5043834552">(504) 383-4552</a>
        </p>
      </div>
    </LegalPage>
  );
}
