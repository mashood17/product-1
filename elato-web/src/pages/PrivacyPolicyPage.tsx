import { LegalPageLayout, LegalSection } from '../components/legal/LegalPageLayout'
import { businessInfo } from '../content/siteContent'
import { getRouteSeo } from '../lib/routeSeo'

const EFFECTIVE_DATE = 'July 21, 2026'
const seo = getRouteSeo('/privacy-policy')

export function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title={seo.title}
      description={seo.description}
      path={seo.path}
      effectiveDate={EFFECTIVE_DATE}
    >
      <p className="text-body text-neutral-warm-600">
        ELATŌ (&ldquo;ELATŌ&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) respects your privacy. This policy explains what
        information we collect when you visit elato.in or interact with us in person, why we collect it, and the
        choices you have.
      </p>

      <LegalSection title="1. Information We Collect">
        <p>We collect information in three ways:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-secondary-900">Information you give us directly</strong> — your name, phone
            number, email, and message when you submit an enquiry (Stay, Celebré, or Events), make a reservation
            request, or register for a promotional offer through our scratch-card popup.
          </li>
          <li>
            <strong className="text-secondary-900">Information collected automatically</strong> — pages visited,
            approximate location (from IP), device/browser type, and on-site interactions (e.g. which service card
            you clicked), collected via analytics events and cookies/local storage. See our{' '}
            <a href="/cookie-policy" className="text-[#9e7641] underline underline-offset-2">
              Cookie Policy
            </a>{' '}
            for detail.
          </li>
          <li>
            <strong className="text-secondary-900">A random visitor identifier</strong> — stored in your browser&rsquo;s
            local storage (not tied to your name until you register for an offer) — used to prevent the same browser
            from claiming a promotional offer more than once and to avoid showing a claimed offer&rsquo;s scratch card
            again.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How We Use Your Information">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>To respond to enquiries about Stay, Celebré, and Events, including via WhatsApp.</li>
          <li>To process and honor promotional offer registrations, and to verify an offer at the counter.</li>
          <li>To improve our website&rsquo;s content, performance, and layout based on aggregate usage patterns.</li>
          <li>
            To send you promotional offers and updates, but only if you&rsquo;ve explicitly opted in (e.g. the
            consent checkbox on the offer registration form).
          </li>
          <li>To comply with legal obligations and protect against fraud or misuse of our systems.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Who We Share It With">
        <p>We do not sell your personal information. We share it only with:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-secondary-900">WhatsApp</strong> — when you use an &ldquo;Enquire on WhatsApp&rdquo;
            button, your message opens directly in WhatsApp; that conversation is governed by WhatsApp&rsquo;s own
            privacy policy, not this one.
          </li>
          <li>
            <strong className="text-secondary-900">Service providers</strong> — the infrastructure that hosts our
            website, database, and file storage (used solely to operate elato.in, under standard data-processing
            terms).
          </li>
          <li>
            <strong className="text-secondary-900">Legal authorities</strong> — if required by law, court order, or
            to protect ELATŌ&rsquo;s rights and safety.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Data Retention">
        <p>
          Enquiry and offer-registration records are retained as long as reasonably necessary for the purpose they
          were collected for — typically to honor a reservation or offer, and to maintain a business record of
          redemptions. You may request deletion at any time (see Section 6).
        </p>
      </LegalSection>

      <LegalSection title="5. Your Rights">
        <p>
          You may ask us to access, correct, or delete the personal information we hold about you, or to withdraw
          consent for promotional communications, by contacting us using the details in Section 7. We will respond
          within a reasonable time.
        </p>
      </LegalSection>

      <LegalSection title="6. Children&rsquo;s Privacy">
        <p>
          Our website and offers are intended for adults capable of making a reservation or purchase. We do not
          knowingly collect personal information from children under 13.
        </p>
      </LegalSection>

      <LegalSection title="7. Contact Us">
        <p>
          Questions about this policy, or requests regarding your information, can be sent to{' '}
          <a href={`mailto:${businessInfo.email}`} className="text-[#9e7641] underline underline-offset-2">
            {businessInfo.email}
          </a>{' '}
          or {businessInfo.phone}, or in person at {businessInfo.address}.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes to This Policy">
        <p>
          We may update this policy from time to time to reflect changes to our practices or for legal reasons. The
          &ldquo;Effective&rdquo; date at the top of this page will always reflect the latest version.
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
