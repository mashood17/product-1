import { Link, useParams } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { getRouteSeo } from '../lib/routeSeo'
import { getBlogPost } from '../content/blogContent'
import { NotFoundPage } from './NotFoundPage'

const SERVICE_LABELS: Record<string, string> = {
  '/elato-celebre': 'Elato Celebré',
  '/elato-events': 'Elato Events',
  '/elato-stay': 'Elato Stay',
}

export function BlogPostPage() {
  const { slug = '' } = useParams()
  const post = getBlogPost(slug)

  // Unknown slug — same 404 the router falls back to for any other bad
  // URL, rather than throwing (getRouteSeo throws for paths that were
  // never registered, which a mistyped/old blog link always will be).
  if (!post) return <NotFoundPage />

  const seo = getRouteSeo(`/blog/${post.slug}`)
  const publishedDisplay = new Date(post.publishedDate).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.description}
        path={seo.path}
        breadcrumb={seo.breadcrumb}
        jsonLd={seo.jsonLd()}
      />
      <main id="main-content" className="bg-surface-base pb-20 pt-32 font-sans lg:pb-28 lg:pt-40">
        <article className="container-elato">
          <nav aria-label="Breadcrumb" className="mx-auto max-w-2xl text-caption text-neutral-warm-500">
            <Link to="/blog" className="text-[#9E7641] hover:underline">
              The ELATŌ Journal
            </Link>
            <span aria-hidden="true"> / </span>
            <span>{post.title}</span>
          </nav>

          <header className="mx-auto mt-4 max-w-2xl">
            <h1 className="text-[28px] font-bold leading-tight text-[#9E7641] lg:text-[42px]">{post.title}</h1>
            <p className="mt-3 text-caption text-neutral-warm-500">
              <time dateTime={post.publishedDate}>{publishedDisplay}</time>
            </p>
          </header>

          <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-10">
            {post.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-h3 font-sans font-bold text-secondary-900">{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-body mt-3 text-neutral-warm-500">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>

          {post.relatedServices.length > 0 && (
            <div className="mx-auto mt-14 max-w-2xl rounded-2xl border border-[#9e7641]/20 bg-surface-elevated p-6 shadow-elato-sm">
              <p className="text-caption font-semibold text-[#9E7641]">Continue Exploring</p>
              <ul className="mt-3 flex flex-wrap gap-3">
                {post.relatedServices.map((service) => (
                  <li key={service.path}>
                    <Link
                      to={service.path}
                      className="inline-flex items-center rounded-full border border-[#9e7641]/30 bg-surface-base px-4 py-2 text-caption font-semibold text-[#9E7641] transition-colors duration-300 ease-out hover:bg-[#9E7641] hover:text-white"
                    >
                      {service.label ?? SERVICE_LABELS[service.path]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      </main>
    </>
  )
}
