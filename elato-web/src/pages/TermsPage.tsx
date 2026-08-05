import { LegalPageLayout, LegalSection } from '../components/legal/LegalPageLayout'
import { businessInfo } from '../content/siteContent'
import { getRouteSeo } from '../lib/routeSeo'

const EFFECTIVE_DATE = 'July 21, 2026'
const seo = getRouteSeo('/terms-conditions')

export function TermsPage() {
  return (
    <LegalPageLayout
      title={seo.title}
      description={seo.description}
      path={seo.path}
      effectiveDate={EFFECTIVE_DATE}
    >
      <p className="text-body text-neutral-warm-600">
        These Terms & Conditions govern your use of elato.in and any reservation enquiry, order, or promotional
        offer made through it. By using this website, you agree to these terms.
      </p>

      <LegalSection title="1. About ELATŌ">
        <p>
          ELATŌ CELEBRÉ operates a café, ice cream parlour, event hall, and serviced stay at{' '}
          {businessInfo.address}. References to &ldquo;Stay&rdquo;, &ldquo;Celebré&rdquo;, and &ldquo;Events&rdquo;
          refer to these three services.
        </p>
      </LegalSection>

      <LegalSection title="2. Enquiries & Reservations">
        <p>
          Submitting an enquiry form (Stay, Celebré, or Events) or messaging us on WhatsApp is a request for
          availability, not a confirmed booking. A reservation is confirmed only once our team responds directly to
          confirm date, time, and details. We reserve the right to decline any booking request.
        </p>
      </LegalSection>

      <LegalSection title="3. Promotional Offers">
        <p>The scratch-card offer on our website is subject to the following conditions:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Only one offer is active at any given time, as configured by ELATŌ.</li>
          <li>Every visitor who claims the currently active offer receives the same reward — the scratch card is an interaction, not a randomizer.</li>
          <li>Each phone number may register for a given active offer only once; duplicate registrations are not accepted.</li>
          <li>Offers must be redeemed in person at ELATŌ CELEBRÉ by presenting the name and phone number used at registration.</li>
          <li>Offers have no cash value, cannot be exchanged for cash, and cannot be combined with other promotions unless stated otherwise.</li>
          <li>ELATŌ may modify, suspend, or end any offer at any time without prior notice.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Acceptable Use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Submit false, misleading, or fraudulent information in any form on this site.</li>
          <li>Attempt to claim a promotional offer multiple times by circumventing our duplicate-prevention checks.</li>
          <li>Interfere with, disrupt, or attempt unauthorized access to the website, its data, or its underlying systems.</li>
          <li>Use the website for any unlawful purpose, or in a way that could damage or impair its operation.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Intellectual Property">
        <p>
          The ELATŌ name, logo, wordmark, and all content on this website (text, photography, video, design) are the
          property of ELATŌ or its licensors and may not be reproduced, distributed, or used commercially without
          our prior written consent.
        </p>
      </LegalSection>

      <LegalSection title="6. Third-Party Links & Services">
        <p>
          This website links to third-party services (WhatsApp, Instagram, Google Maps, Booking.com). We are not
          responsible for the content, availability, or privacy practices of those third-party services.
        </p>
      </LegalSection>

      <LegalSection title="7. Limitation of Liability">
        <p>
          ELATŌ provides this website &ldquo;as is&rdquo;. While we take reasonable care to keep information
          accurate and the site available, we do not guarantee uninterrupted access and are not liable for indirect
          or consequential loss arising from your use of the site, to the fullest extent permitted by law.
        </p>
      </LegalSection>

      <LegalSection title="8. Governing Law">
        <p>
          These terms are governed by the laws of India, and any disputes are subject to the exclusive jurisdiction
          of the courts having jurisdiction over Bantwal, Karnataka.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes to These Terms">
        <p>
          We may revise these terms from time to time. Continued use of the website after a change constitutes
          acceptance of the updated terms.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact Us">
        <p>
          Questions about these terms can be sent to{' '}
          <a href={`mailto:${businessInfo.email}`} className="text-[#9e7641] underline underline-offset-2">
            {businessInfo.email}
          </a>{' '}
          or {businessInfo.phone}.
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
