import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, PartyPopper, CalendarDays, Users, MessageSquare, MessageCircle, type LucideIcon } from 'lucide-react'
import { Button } from '../ui/Button'
import sectionBackground from '../../assets/newbg/bg2.webp'
import sectionBackgroundMobile from '../../assets/newbg/bg-mb2.webp'
import { SectionBackground } from '../ui/SectionBackground'
import { SiteImage } from '../ui/SiteImage'
import { PhoneCountryField } from '../ui/PhoneCountryField'
import { businessInfo } from '../../content/siteContent'
import { buildWhatsAppLink } from '../../lib/whatsapp'
import { sectionReveal, viewportOnce } from '../../lib/motion'
import {
  validateName,
  validatePhoneForCountry,
  validateEmail,
  validateMessage,
  validateFutureDate,
  validateGuests,
  toE164,
} from '../../lib/validation'
import { DEFAULT_COUNTRY_ISO, dialCodeForIso } from '../../lib/countryCodes'
import { persistEnquiry } from '../../lib/enquiryRepository'
import { trackEvent } from '../../lib/analytics'
import { useSiteImage } from '../../lib/useSiteImage'

const EVENT_TYPES = [
  'Wedding',
  'Engagement',
  'Birthday Party',
  'Naming Ceremony',
  'Corporate Event',
  'Family Gathering',
  'Cultural Event',
  'Anniversary Celebration',
] as const

const GUEST_MIN = 1
const GUEST_MAX = 300

type Errors = Partial<
  Record<'name' | 'phone' | 'email' | 'date' | 'guests' | 'message', string>
>

export function EventsEnquiry() {
  const [name, setName] = useState('')
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [eventType, setEventType] = useState<(typeof EVENT_TYPES)[number]>(EVENT_TYPES[0])
  const [date, setDate] = useState('')
  const [guests, setGuests] = useState(GUEST_MIN)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const planImage = useSiteImage('events_plan_image', '')

  const validate = (): Errors => ({
    name: validateName(name),
    phone: validatePhoneForCountry(dialCodeForIso(countryIso), phone),
    email: validateEmail(email),
    date: validateFutureDate(date),
    guests: validateGuests(guests, GUEST_MIN, GUEST_MAX),
    message: validateMessage(message),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.values(validationErrors).some(Boolean)) return

    setSubmitting(true)
    setTimeout(() => {
      const fullPhone = toE164(dialCodeForIso(countryIso), phone)
      const waMessage =
        `Hi Elato! My name is ${name.trim()}. I'd like to enquire about hosting a ${eventType} ` +
        `for ${guests} guest${guests > 1 ? 's' : ''} on ${date}. Contact: ${fullPhone}. ${message.trim()}`.trim()
      persistEnquiry({
        source_page: 'events',
        name: name.trim(),
        phone: fullPhone,
        email: email.trim() || undefined,
        message: `Event type: ${eventType}. ${message.trim()}`.trim(),
        guests,
        preferred_date: date || undefined,
      })
      trackEvent('enquiry_submitted', 'events', { eventType, guests })
      window.open(buildWhatsAppLink(businessInfo.whatsappNumber, waMessage), '_blank', 'noreferrer')
      trackEvent('whatsapp_click', 'events', { eventType, guests })
      setSubmitting(false)
      setSubmitted(true)
    }, 400)
  }

  return (
    <motion.section id="events-enquiry" className="relative overflow-hidden py-16 lg:py-32">
      <SectionBackground image={sectionBackground} mobileImage={sectionBackgroundMobile} />
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={sectionReveal}
        className="container-elato relative mx-auto max-w-2xl lg:max-w-6xl"
      >
        <div className="mb-10 text-center">
          <p className="text-caption text-secondary-500">Plan Your Celebration</p>
          <h2 className="text-h2 mt-2 font-sans font-bold text-[#9e7641]">Let&rsquo;s Create Something Memorable</h2>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-stretch lg:gap-10">
        <div className="relative">
          <div className="absolute -inset-3 rounded-[44px] bg-primary-50/80" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-[36px] border-[10px] border-secondary-900 ring-4 ring-surface-elevated bg-surface-elevated/95 p-6 shadow-elato-lg backdrop-blur-sm lg:rounded-[48px] lg:border-[14px] lg:p-10">
          {submitted ? (
            <p className="text-body text-success" role="status">
              Thank you — your enquiry has been sent, and WhatsApp should have opened with the details pre-filled.
            </p>
          ) : (
            <>
              <div className="mb-6 border-b border-[#9e7641]/15 pb-5">
                <p className="text-caption text-[#9e7641]">Enquiry Form</p>
                <p className="text-body mt-1 text-neutral-warm-500">
                  Share a few details and we'll help you plan the celebration on WhatsApp.
                </p>
              </div>

              <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field
                    id="events-name"
                    label="Full Name"
                    type="text"
                    icon={User}
                    value={name}
                    onChange={setName}
                    onBlur={() => setErrors((prev) => ({ ...prev, name: validate().name }))}
                    error={errors.name}
                  />
                  <PhoneCountryField
                    idPrefix="events"
                    label="Phone Number"
                    countryIso={countryIso}
                    onCountryChange={setCountryIso}
                    phone={phone}
                    onPhoneChange={setPhone}
                    onBlur={() => setErrors((prev) => ({ ...prev, phone: validate().phone }))}
                    error={errors.phone}
                  />
                </div>

                <Field
                  id="events-email"
                  label="Email"
                  type="email"
                  icon={Mail}
                  value={email}
                  onChange={setEmail}
                  onBlur={() => setErrors((prev) => ({ ...prev, email: validate().email }))}
                  error={errors.email}
                />

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="events-type" className="text-caption text-neutral-warm-500">
                    Event Type
                  </label>
                  <div className="relative">
                    <PartyPopper
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9e7641]/60"
                      aria-hidden="true"
                    />
                    <select
                      id="events-type"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as (typeof EVENT_TYPES)[number])}
                      className="h-12 w-full rounded-xl border border-[#9e7641]/25 bg-surface-base/60 pl-10 pr-4 text-body transition-colors focus-visible:border-[#9e7641] focus-visible:bg-surface-base"
                    >
                      {EVENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field
                    id="events-date"
                    label="Preferred Date"
                    type="date"
                    icon={CalendarDays}
                    value={date}
                    onChange={setDate}
                    onBlur={() => setErrors((prev) => ({ ...prev, date: validate().date }))}
                    error={errors.date}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="events-guests" className="text-caption text-neutral-warm-500">
                      Number of Guests
                    </label>
                    <div className="relative">
                      <Users
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9e7641]/60"
                        aria-hidden="true"
                      />
                      <input
                        id="events-guests"
                        type="number"
                        min={GUEST_MIN}
                        max={GUEST_MAX}
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                        onBlur={() => setErrors((prev) => ({ ...prev, guests: validate().guests }))}
                        aria-describedby={errors.guests ? 'events-guests-error' : undefined}
                        className="h-12 w-full rounded-xl border border-[#9e7641]/25 bg-surface-base/60 pl-10 pr-4 text-body transition-colors focus-visible:border-[#9e7641] focus-visible:bg-surface-base"
                      />
                    </div>
                    {errors.guests && (
                      <p id="events-guests-error" className="text-caption text-danger" aria-live="polite">
                        {errors.guests}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="events-message" className="text-caption text-neutral-warm-500">
                    Message
                  </label>
                  <div className="relative">
                    <MessageSquare
                      className="pointer-events-none absolute left-3.5 top-4 h-4 w-4 text-[#9e7641]/60"
                      aria-hidden="true"
                    />
                    <textarea
                      id="events-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onBlur={() => setErrors((prev) => ({ ...prev, message: validate().message }))}
                      rows={4}
                      maxLength={500}
                      aria-describedby={errors.message ? 'events-message-error' : undefined}
                      className="w-full rounded-xl border border-[#9e7641]/25 bg-surface-base/60 py-3 pl-10 pr-4 text-body transition-colors focus-visible:border-[#9e7641] focus-visible:bg-surface-base"
                    />
                  </div>
                  {errors.message && (
                    <p id="events-message-error" className="text-caption text-danger" aria-live="polite">
                      {errors.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="whatsapp"
                  icon={<MessageCircle className="h-4 w-4" />}
                  disabled={submitting}
                  className="w-full !rounded-xl !bg-[#9e7641] tracking-wide hover:!bg-[#8a6636]"
                >
                  {submitting ? 'Sending…' : 'Enquire on WhatsApp'}
                </Button>
              </form>
            </>
          )}
          </div>
        </div>

        <div className="relative">
          <div
            className="absolute -inset-3 rounded-[44px] rounded-br-[130px] bg-primary-50/80"
            aria-hidden="true"
          />
          <div className="relative aspect-4/5 w-full max-w-sm overflow-hidden rounded-[36px] rounded-br-[110px] border-[10px] border-secondary-900 ring-4 ring-surface-elevated shadow-elato-lg mx-auto lg:mx-0 lg:aspect-auto lg:h-full lg:max-w-none lg:rounded-[48px] lg:rounded-br-[150px] lg:border-[14px]">
            <SiteImage
              src={planImage}
              alt="An event hosted at ELATŌ"
              className="h-full w-full object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-secondary-900/90 via-secondary-900/25 to-transparent"
              aria-hidden="true"
            />
            <div className="absolute inset-x-0 bottom-16 p-8">
              <p className="text-caption font-bold text-primary-100/80">ELATŌ Events</p>
              <p className="text-h3 mt-2 font-sans font-normal text-[#e7caa0]">
                A hall dressed for the celebration you're planning
              </p>
            </div>
          </div>
        </div>
        </div>
      </motion.div>
    </motion.section>
  )
}

function Field({
  id,
  label,
  type,
  icon: Icon,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
}: {
  id: string
  label: string
  type: string
  icon?: LucideIcon
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  error?: string
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-caption text-neutral-warm-500">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9e7641]/60"
            aria-hidden="true"
          />
        )}
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-12 w-full rounded-xl border border-[#9e7641]/25 bg-surface-base/60 pr-4 text-body transition-colors focus-visible:border-[#9e7641] focus-visible:bg-surface-base ${Icon ? 'pl-10' : 'pl-4'}`}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-caption text-danger" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  )
}
