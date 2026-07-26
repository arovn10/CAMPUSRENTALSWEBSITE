import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Fair Housing & Accessibility',
  description:
    'Campus Rentals LLC is an Equal Housing Opportunity provider. We rent without regard to race, color, religion, sex, disability, familial status, or national origin.',
  alternates: { canonical: 'https://campusrentalsllc.com/fair-housing' },
  robots: { index: true, follow: true },
};

export default function FairHousingPage() {
  return (
    <LegalPage
      title="Fair Housing & Accessibility"
      updated="July 23, 2026"
      intro="Campus Rentals LLC is an Equal Housing Opportunity provider."
    >
      <div>
        <h2>Our commitment</h2>
        <p>
          We comply with the federal Fair Housing Act and all applicable state and local fair housing
          laws. We rent, advertise, and manage our homes without regard to race, color, religion, sex,
          disability, familial status, or national origin — and we do not tolerate discrimination by
          anyone acting on our behalf.
        </p>
        <p>
          Every applicant is evaluated using the same criteria, applied consistently and in the order
          applications are received.
        </p>
      </div>

      <div>
        <h2>Reasonable accommodations and modifications</h2>
        <p>
          If you have a disability, you may request a reasonable accommodation in our rules, policies, or
          services, or a reasonable modification to a unit or common area. Ask us — there is no special
          form and no fee to make a request. Call{' '}
          <a href="tel:5043834552">(504) 383-4552</a> or email{' '}
          <a href="mailto:rovnerproperties@gmail.com">rovnerproperties@gmail.com</a> and we will respond
          promptly.
        </p>
        <p>
          Assistance animals are not pets. Requests involving assistance animals are handled under fair
          housing law, not our pet policy.
        </p>
      </div>

      <div>
        <h2>Website accessibility</h2>
        <p>
          We want this site to be usable by everyone, and we work toward WCAG 2.1 Level AA. If any part
          of this website is difficult for you to use, or you need listing information in another format,
          tell us and we will get you what you need and fix the page.
        </p>
        <p>
          Report an accessibility problem:{' '}
          <a href="mailto:rovnerproperties@gmail.com">rovnerproperties@gmail.com</a> ·{' '}
          <a href="tel:5043834552">(504) 383-4552</a>
        </p>
      </div>

      <div>
        <h2>If you believe you have been treated unfairly</h2>
        <p>
          Please contact us first — we want to know. You also have the right to file a complaint directly
          with the U.S. Department of Housing and Urban Development at{' '}
          <a href="https://www.hud.gov/fairhousing" target="_blank" rel="noopener noreferrer">
            hud.gov/fairhousing
          </a>{' '}
          or by calling 1-800-669-9777.
        </p>
      </div>
    </LegalPage>
  );
}
