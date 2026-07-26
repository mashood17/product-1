import { Phone } from 'lucide-react'
import { COUNTRY_CODES } from '../../lib/countryCodes'

interface PhoneCountryFieldProps {
  idPrefix: string
  label: string
  countryIso: string
  onCountryChange: (iso: string) => void
  phone: string
  onPhoneChange: (value: string) => void
  onBlur: () => void
  error?: string
  placeholder?: string
  /** Overrides the phone input's default className — used by callers (e.g. the
   * scratch-card offer form) that need the input to match another field's
   * exact styling (text/placeholder color, focus behavior) rather than this
   * component's default light theme. */
  inputClassName?: string
}

/**
 * Country-code dropdown + national-number input, paired as one field — the
 * shared phone input used by every form that collects one (Home/Stay/Events
 * enquiries, the scratch-card offer form). Emits the raw dial-country ISO
 * and digits-only national number separately; callers combine them with
 * `toE164`/`validatePhoneForCountry` from lib/validation.ts.
 */
export function PhoneCountryField({
  idPrefix,
  label,
  countryIso,
  onCountryChange,
  phone,
  onPhoneChange,
  onBlur,
  error,
  placeholder = '98765 43210',
  inputClassName,
}: PhoneCountryFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${idPrefix}-phone`} className="text-caption text-neutral-warm-500">
        {label}
      </label>
      <div className="flex gap-2">
        <select
          id={`${idPrefix}-country`}
          value={countryIso}
          onChange={(e) => onCountryChange(e.target.value)}
          aria-label="Country code"
          className="h-12 w-[5.75rem] shrink-0 rounded-xl border border-[#9e7641]/25 bg-surface-base/60 px-1.5 text-body transition-colors focus-visible:border-[#9e7641] focus-visible:bg-surface-base"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.flag} {c.dialCode}
            </option>
          ))}
        </select>
        <div className="relative flex-1">
          <Phone
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9e7641]/60"
            aria-hidden="true"
          />
          <input
            id={`${idPrefix}-phone`}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, '').slice(0, 14))}
            onBlur={onBlur}
            placeholder={placeholder}
            maxLength={14}
            aria-describedby={error ? `${idPrefix}-phone-error` : undefined}
            className={
              inputClassName ??
              'h-12 w-full rounded-xl border border-[#9e7641]/25 bg-surface-base/60 pl-10 pr-4 text-body transition-colors focus-visible:border-[#9e7641] focus-visible:bg-surface-base'
            }
          />
        </div>
      </div>
      {error && (
        <p id={`${idPrefix}-phone-error`} className="text-caption text-danger" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  )
}
