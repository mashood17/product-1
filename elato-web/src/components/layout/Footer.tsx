import { Link, useLocation } from 'react-router-dom'
import { Mail, Phone } from 'lucide-react'
import { LogoImage } from '../brand/LogoImage'
import { businessInfo } from '../../content/siteContent'
import { buildWhatsAppLink } from '../../lib/whatsapp'
import { trackEvent } from '../../lib/analytics'

function InstagramIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function WhatsAppIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.45 1.33 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2Zm5.84 14.24c-.24.68-1.4 1.3-1.93 1.35-.5.05-1.02.24-3.42-.72-2.9-1.16-4.77-4.12-4.92-4.32-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.13 1.02-2.42.27-.29.58-.36.78-.36.2 0 .4 0 .57.01.18.01.43-.07.68.51.24.58.83 2 .9 2.15.07.15.12.32.02.51-.1.2-.15.32-.3.5-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.3.75 1.25 1.62 2.02 1.11.99 2.05 1.3 2.35 1.44.3.15.47.13.65-.08.17-.2.72-.85.92-1.14.2-.29.4-.24.66-.15.27.1 1.7.8 1.99.94.29.15.48.22.55.34.07.13.07.71-.17 1.39Z" />
    </svg>
  )
}

const socialLinkClass =
  'group inline-flex items-center gap-2.5 text-primary-50 transition-colors duration-300 ease-out hover:text-[#E7CAA0]'
const socialIconClass =
  'h-5 w-5 shrink-0 text-[#9E7641] transition-all duration-300 ease-out group-hover:scale-110 group-hover:text-[#E7CAA0]'

export function Footer() {
  const year = new Date().getFullYear()
  const location = useLocation()
  const isHome = location.pathname === '/'
  const homeHash = (hash: string) => (isHome ? hash : `/${hash}`)

  return (
    <footer className="bg-surface-inverse text-primary-50">
      <div className="container-elato grid grid-cols-1 gap-12 py-16 md:grid-cols-2 lg:grid-cols-4 lg:py-24">
        <div className="flex flex-col gap-4">
          <Link to="/" className="w-fit">
            <LogoImage />
          </Link>
          <p className="text-body text-primary-100">Where Every Celebration Begins</p>
        </div>

        <div>
          <p className="text-caption mb-4 text-[#9E7641]">Explore</p>
          <ul className="flex flex-col gap-2 text-body">
            <li><a href={homeHash('#home')} className="text-primary-100 transition-colors duration-300 ease-out hover:text-[#E7CAA0]">Home</a></li>
            <li><Link to="/elato-stay" className="text-primary-100 transition-colors duration-300 ease-out hover:text-[#E7CAA0]">Stay</Link></li>
            <li><Link to="/elato-celebre" className="text-primary-100 transition-colors duration-300 ease-out hover:text-[#E7CAA0]">Celebré</Link></li>
            <li><Link to="/elato-events" className="text-primary-100 transition-colors duration-300 ease-out hover:text-[#E7CAA0]">Events</Link></li>
            <li><a href={homeHash('#faq')} className="text-primary-100 transition-colors duration-300 ease-out hover:text-[#E7CAA0]">FAQ</a></li>
          </ul>
        </div>

        <div>
          <p className="text-caption mb-4 text-[#9E7641]">Visit</p>
          <ul className="flex flex-col gap-1 text-body text-primary-100">
            <li>ELATŌ CELEBRÉ,</li>
            <li>Near Mandovi Motors,</li>
            <li>Melkar,</li>
            <li>Panemangalore,</li>
            <li>Bantwal,</li>
            <li>Karnataka 574231</li>
          </ul>
          <div className="mt-4">
            <p className="text-caption text-[#E7CAA0]">Daily</p>
            <p className="text-body text-primary-100">11:00 AM – 11:30 PM</p>
          </div>
        </div>

        <div>
          <p className="text-caption mb-4 text-[#9E7641]">Contact</p>
          <ul className="flex flex-col gap-3 text-body">
            <li>
              <a
                href={`tel:+${businessInfo.whatsappNumber}`}
                onClick={() => trackEvent('call_click', 'footer')}
                className={socialLinkClass}
              >
                <Phone className={socialIconClass} aria-hidden="true" />
                <span>{businessInfo.phone}</span>
              </a>
            </li>
            <li>
              <a
                href={buildWhatsAppLink(businessInfo.whatsappNumber, 'Hi Elato!')}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent('whatsapp_click', 'footer')}
                className={socialLinkClass}
              >
                <WhatsAppIcon className={socialIconClass} />
                <span>{businessInfo.phone}</span>
              </a>
            </li>
            <li>
              <a href={businessInfo.instagramUrl} target="_blank" rel="noreferrer" className={socialLinkClass}>
                <InstagramIcon className={socialIconClass} />
                <span>{businessInfo.instagramHandle}</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${businessInfo.email}`} className={socialLinkClass}>
                <Mail className={socialIconClass} aria-hidden="true" />
                <span>{businessInfo.email}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[#9E7641]/30">
        <div className="container-elato flex flex-col items-center justify-between gap-3 py-6 text-[11px] text-primary-100 md:flex-row">
          <span>&copy; {year} ELATŌ. All rights reserved.</span>
          <nav aria-label="Legal" className="flex items-center gap-4">
            <Link to="/privacy-policy" className="transition-colors duration-300 ease-out hover:text-[#E7CAA0]">
              Privacy Policy
            </Link>
            <Link to="/terms-conditions" className="transition-colors duration-300 ease-out hover:text-[#E7CAA0]">
              Terms & Conditions
            </Link>
            <Link to="/cookie-policy" className="transition-colors duration-300 ease-out hover:text-[#E7CAA0]">
              Cookie Policy
            </Link>
          </nav>
          <span>
            Crafted by <span className="text-[#E7CAA0]">NoorGenesis</span>
          </span>
        </div>
      </div>
    </footer>
  )
}
