import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Seo } from '../components/Seo'
import { getRouteSeo } from '../lib/routeSeo'
import { blogHeading, blogPosts } from '../content/blogContent'

const seo = getRouteSeo('/blog')

/**
 * Blog index — card grid + a real client-side search box. The search box
 * isn't decorative: it's what legitimately backs the `SearchAction` in
 * websiteJsonLd() (see jsonLd.ts), which targets `/blog?q={search_term}`.
 * Reads the initial query from the URL so that deep link actually works,
 * not just the on-page input.
 */
export function BlogIndexPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return blogPosts
    return blogPosts.filter(
      (post) =>
        post.title.toLowerCase().includes(q) ||
        post.metaDescription.toLowerCase().includes(q) ||
        post.sections.some((s) => s.heading.toLowerCase().includes(q)),
    )
  }, [query])

  const onQueryChange = (value: string) => {
    setQuery(value)
    setSearchParams(value ? { q: value } : {}, { replace: true })
  }

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
        <div className="container-elato">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-caption text-[#9E7641]">{blogHeading.overline}</p>
            <span className="mx-auto mt-2 block h-px w-10 bg-[#E7CAA0]" aria-hidden="true" />
            <h1 className="mt-3 text-[28px] font-bold leading-tight text-[#9E7641] lg:text-[42px]">
              {blogHeading.title}
            </h1>
            <p className="text-body mt-3 text-neutral-warm-500">{blogHeading.description}</p>
          </div>

          <div className="mx-auto mt-8 max-w-md">
            <label htmlFor="blog-search" className="sr-only">
              Search guides
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9E7641]"
                aria-hidden="true"
              />
              <input
                id="blog-search"
                type="search"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search guides — cafés, weddings, stays…"
                className="w-full rounded-full border border-[#9e7641]/25 bg-surface-elevated py-3 pl-11 pr-4 text-body text-secondary-900 shadow-elato-sm outline-none transition-shadow duration-300 ease-out placeholder:text-neutral-warm-400 focus:shadow-elato-md"
              />
            </div>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
            {filtered.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="group flex flex-col rounded-2xl border border-[#9e7641]/20 bg-surface-elevated p-6 shadow-elato-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-elato-md"
              >
                <h2 className="text-body-lg font-semibold text-secondary-900 transition-colors duration-300 ease-out group-hover:text-[#9E7641]">
                  {post.title}
                </h2>
                <p className="text-body mt-2 flex-1 text-neutral-warm-500">{post.metaDescription}</p>
                <span className="mt-4 text-caption font-semibold text-[#9E7641]">Read the guide →</span>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="mt-12 text-center text-body text-neutral-warm-500">
              No guides match “{query}” yet — try a different search.
            </p>
          )}
        </div>
      </main>
    </>
  )
}
