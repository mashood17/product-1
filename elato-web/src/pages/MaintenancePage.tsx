import { Helmet } from 'react-helmet-async'
import elatoWordmark from '../assets/logos/elato-wordmark.webp'

export function MaintenancePage() {
  return (
    <main className="relative flex min-h-screen items-center overflow-hidden bg-surface-base pt-20">
      <Helmet>
        <title>Under Maintenance | ELATŌ</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="container-elato relative flex flex-col items-center gap-6 py-24 text-center">
        <img src={elatoWordmark} alt="ELATŌ" className="h-[7.5rem] w-auto" />
        <h1 className="text-h1 text-secondary-900">We'll be back shortly</h1>
        <p className="text-body-lg max-w-md text-neutral-warm-500">
          ELATŌ is currently undergoing scheduled maintenance. Thank you for your patience — please check back soon.
        </p>
      </div>
    </main>
  )
}
