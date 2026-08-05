import { Helmet } from 'react-helmet-async'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/brand/Logo'

export function NotFoundPage() {
  return (
    <main id="main-content" className="relative flex min-h-screen items-center overflow-hidden bg-surface-base pt-20">
      <Helmet>
        <title>Page Not Found | ELATŌ</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="container-elato relative flex flex-col items-center gap-6 py-24 text-center">
        <Logo className="text-4xl" />
        <h1 className="text-h1 text-secondary-900">This page hasn't been set</h1>
        <p className="text-body-lg max-w-md text-neutral-warm-500">
          The page you're looking for doesn't exist, or the link may be out of date. Let's get you back to somewhere real.
        </p>
        <Button as="a" href="/" variant="primary">
          Back to Home
        </Button>
      </div>
    </main>
  )
}
