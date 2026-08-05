import { LegalPageLayout, LegalSection } from '../components/legal/LegalPageLayout'
import { businessInfo } from '../content/siteContent'
import { getRouteSeo } from '../lib/routeSeo'

const EFFECTIVE_DATE = 'July 21, 2026'
const seo = getRouteSeo('/cookie-policy')

export function CookiePolicyPage() {
  return (
    <LegalPageLayout
      title={seo.title}
      description={seo.description}
      path={seo.path}
      effectiveDate={EFFECTIVE_DATE}
    >
      <p className="text-body text-neutral-warm-600">
        This policy explains the cookies and similar browser storage (local storage, session storage) that
        elato.in uses, and why.
      </p>

      <LegalSection title="1. What We Use, and Why">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-secondary-900">Strictly necessary storage</strong> — a random visitor identifier
            saved to your browser&rsquo;s local storage, used only to prevent our promotional scratch-card offer from
            being claimed more than once per browser, and to remember your page-scroll position when you navigate
            back. The site cannot function as designed without this.
          </li>
          <li>
            <strong className="text-secondary-900">Session storage</strong> — remembers your scroll position within
            the current browser tab; cleared automatically when you close the tab.
          </li>
          <li>
            <strong className="text-secondary-900">Analytics</strong> — anonymized, aggregate events (e.g. which
            page was viewed, which button was clicked) sent to our own backend and, if configured, Google Analytics,
            to help us understand how the site is used and improve it.
          </li>
        </ul>
        <p>We do not use third-party advertising or cross-site tracking cookies.</p>
      </LegalSection>

      <LegalSection title="2. Third-Party Cookies">
        <p>
          Embedded content from third parties (an interactive Google Maps location, a WhatsApp chat link, an
          Instagram feed) may set their own cookies once you interact with them. Those are governed by the
          respective third party&rsquo;s own cookie policy, not ours.
        </p>
      </LegalSection>

      <LegalSection title="3. Managing Cookies & Local Storage">
        <p>
          Most browsers let you view, delete, or block cookies and site data through their settings — typically
          under Privacy or Site Settings. Clearing your browser&rsquo;s local storage for elato.in will reset the
          visitor identifier described above, which may allow our promotional offer&rsquo;s scratch card to appear
          again in that browser (duplicate claims by phone number are still prevented by our backend regardless).
        </p>
      </LegalSection>

      <LegalSection title="4. Changes to This Policy">
        <p>
          We may update this policy as our use of cookies and storage evolves. The &ldquo;Effective&rdquo; date at
          the top of this page reflects the latest version.
        </p>
      </LegalSection>

      <LegalSection title="5. Contact Us">
        <p>
          Questions about this policy can be sent to{' '}
          <a href={`mailto:${businessInfo.email}`} className="text-[#9e7641] underline underline-offset-2">
            {businessInfo.email}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
