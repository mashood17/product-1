import type { ReactNode } from 'react'
import { Seo } from '../Seo'

interface LegalPageLayoutProps {
  title: string
  description: string
  path: string
  effectiveDate: string
  children: ReactNode
}

/** Shared shell for the three legal pages (Privacy Policy, Terms &
 * Conditions, Cookie Policy) — same premium framing (heading, effective
 * date, glass card) as the rest of the site's editorial pages, so these
 * read as part of ELATŌ rather than a bolted-on boilerplate page. */
export function LegalPageLayout({ title, description, path, effectiveDate, children }: LegalPageLayoutProps) {
  return (
    <main id="main-content" className="relative min-h-screen bg-surface-base pb-24 pt-28 lg:pt-32">
      <Seo title={title} description={description} path={path} breadcrumb={[{ name: title, path }]} />
      <div className="container-elato mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <p className="text-caption text-[#9E7641]">ELATŌ</p>
          <span className="mx-auto mt-2 block h-px w-10 bg-[#E7CAA0]" aria-hidden="true" />
          <h1 className="mt-3 text-[28px] font-bold leading-tight text-[#9E7641] lg:text-[42px]">{title}</h1>
          <p className="mt-2 text-caption text-neutral-warm-500">Effective {effectiveDate}</p>
        </div>
        <div className="flex flex-col gap-9 rounded-[32px] border border-[#9e7641]/15 bg-surface-elevated/80 p-6 shadow-elato-md backdrop-blur-sm sm:p-10 lg:p-14">
          {children}
        </div>
      </div>
    </main>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-h3 mb-3 font-sans font-semibold text-secondary-900">{title}</h2>
      <div className="flex flex-col gap-3 text-body text-neutral-warm-600">{children}</div>
    </section>
  )
}
