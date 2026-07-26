import { useState, type FormEvent } from 'react'
import { User } from 'lucide-react'
import { PhoneCountryField } from '../ui/PhoneCountryField'
import { DEFAULT_COUNTRY_ISO, dialCodeForIso } from '../../lib/countryCodes'
import { validateName, validatePhoneForCountry } from '../../lib/validation'
import { ApiError, registerForOffer } from '../../lib/offerRepository'
import { getVisitorId } from '../../lib/visitorId'
import { trackEvent } from '../../lib/analytics'

type Errors = Partial<Record<'name' | 'phone' | 'consent' | 'policyConsent', string>>

interface AvailOfferFormProps {
  offerId: string
  buttonText: string
  onSuccess: () => void
  /** A duplicate-registration response means this offer is already claimed
   * (by this phone number) — the parent switches to the same premium
   * "already claimed" stage the popup shows a returning visitor upfront,
   * rather than leaving this form up with an inline error. */
  onAlreadyClaimed: () => void
}

export function AvailOfferForm({ offerId, buttonText, onSuccess, onAlreadyClaimed }: AvailOfferFormProps) {
  const [name, setName] = useState('')
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO)
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [policyConsent, setPolicyConsent] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const validate = (): Errors => ({
    name: validateName(name),
    phone: validatePhoneForCountry(dialCodeForIso(countryIso), phone),
    consent: consent ? undefined : 'Please agree to continue.',
    policyConsent: policyConsent ? undefined : 'Please agree to the Privacy Policy and Terms & Conditions to continue.',
  })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.values(validationErrors).some(Boolean)) return

    setFormError(null)
    setSubmitting(true)
    try {
      await registerForOffer({
        name: name.trim(),
        country_code: dialCodeForIso(countryIso),
        phone_number: phone.trim(),
        consent,
        source: window.location.pathname === '/' ? 'home' : window.location.pathname.replace(/^\//, ''),
        visitor_id: getVisitorId(),
      })
      trackEvent('offer_registered', 'scratch_card', { offer_id: offerId })
      onSuccess()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'duplicate_registration') {
        onAlreadyClaimed()
        return
      } else if (err instanceof ApiError) {
        setFormError(err.message)
      } else {
        setFormError('Something went wrong — please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const inputClasses =
    'h-12 w-full rounded-xl border border-[#E7CAA0]/25 bg-white/5 pl-10 pr-4 text-body text-[#f5ead9] placeholder:text-[#f5ead9]/35 transition-colors focus-visible:border-[#E7CAA0] focus-visible:bg-white/10'
  const iconClasses = 'pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E7CAA0]/60'

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="offer-name" className="text-caption text-[#e7caa0]/70">
          Name
        </label>
        <div className="relative">
          <User className={iconClasses} aria-hidden="true" />
          <input
            id="offer-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setErrors((prev) => ({ ...prev, name: validate().name }))}
            aria-describedby={errors.name ? 'offer-name-error' : undefined}
            className={inputClasses}
          />
        </div>
        {errors.name && (
          <p id="offer-name-error" className="text-caption text-red-300" aria-live="polite">
            {errors.name}
          </p>
        )}
      </div>

      <div className="[&_label]:text-[#e7caa0]/70 [&_input]:h-12 [&_input]:rounded-xl [&_input]:border-[#E7CAA0]/25 [&_input]:bg-white/5 [&_input]:text-[#f5ead9] [&_select]:h-12 [&_select]:rounded-xl [&_select]:border-[#E7CAA0]/25 [&_select]:bg-white/5 [&_select]:text-[#f5ead9] [&_svg]:text-[#E7CAA0]/60 [&_input:-webkit-autofill]:[-webkit-text-fill-color:#f5ead9] [&_input:-webkit-autofill]:[transition:background-color_9999s_ease-in-out_0s] [&_input:-webkit-autofill]:shadow-[0_0_0px_1000px_#2b2116_inset]">
        <PhoneCountryField
          idPrefix="offer"
          label="Phone Number"
          countryIso={countryIso}
          onCountryChange={setCountryIso}
          phone={phone}
          onPhoneChange={setPhone}
          onBlur={() => setErrors((prev) => ({ ...prev, phone: validate().phone }))}
          error={errors.phone}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="flex items-start gap-2.5 text-caption text-[#e7caa0]/70">
            <input
              type="checkbox"
              checked={policyConsent}
              onChange={(e) => {
                setPolicyConsent(e.target.checked)
                setErrors((prev) => ({ ...prev, policyConsent: undefined }))
              }}
              aria-describedby={errors.policyConsent ? 'offer-policy-consent-error' : undefined}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#E7CAA0]/40 bg-transparent text-[#E7CAA0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E7CAA0]"
            />
            <span>
              I agree to the{' '}
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#E7CAA0] underline-offset-2 transition-colors duration-300 ease-out hover:text-[#f0dcb8] hover:underline"
              >
                Privacy Policy
              </a>{' '}
              and{' '}
              <a
                href="/terms-conditions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#E7CAA0] underline-offset-2 transition-colors duration-300 ease-out hover:text-[#f0dcb8] hover:underline"
              >
                Terms &amp; Conditions
              </a>
              .
            </span>
          </label>
          {errors.policyConsent && (
            <p id="offer-policy-consent-error" className="mt-1.5 text-caption text-red-300" aria-live="polite">
              {errors.policyConsent}
            </p>
          )}
        </div>

        <div>
          <label className="flex items-start gap-2.5 text-caption text-[#e7caa0]/70">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked)
                setErrors((prev) => ({ ...prev, consent: undefined }))
              }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#E7CAA0]/40 bg-transparent text-[#E7CAA0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E7CAA0]"
            />
            <span>I agree to receive promotional offers and updates from ELATŌ.</span>
          </label>
          {errors.consent && (
            <p className="mt-1.5 text-caption text-red-300" aria-live="polite">
              {errors.consent}
            </p>
          )}
        </div>
      </div>

      {formError && (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-caption text-red-200" role="alert">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-1 h-12 w-full rounded-xl bg-[#E7CAA0] text-body font-semibold tracking-wide text-[#2b2116] transition-colors hover:bg-[#f0dcb8] disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : buttonText}
      </button>
    </form>
  )
}
