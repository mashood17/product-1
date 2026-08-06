import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { viewportOnce } from '../../lib/motion'
import { blogPosts, type RelatedService } from '../../content/blogContent'

const EASE_EDITORIAL = [0.16, 1, 0.3, 1] as const
const MAX_POSTS = 3

export interface FromTheBlogProps {
  /** Only posts that link back to this service page are shown here. */
  servicePath: RelatedService['path']
}

/**
 * Contextual link from a service page into the guides that actually
 * recommend it (blogContent.ts's relatedServices), rather than a generic
 * "latest posts" widget — keeps the internal linking topically relevant in
 * both directions instead of just pointing at /blog.
 */
export function FromTheBlog({ servicePath }: FromTheBlogProps) {
  const posts = blogPosts
    .filter((post) => post.relatedServices.some((s) => s.path === servicePath))
    .slice(0, MAX_POSTS)

  if (posts.length === 0) return null

  return (
    <section className="relative bg-surface-base py-16 font-sans lg:py-20">
      <div className="container-elato">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.7, ease: EASE_EDITORIAL }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-caption text-[#9E7641]">From the ELATŌ Journal</p>
          <span className="mx-auto mt-2 block h-px w-10 bg-[#E7CAA0]" aria-hidden="true" />
          <h2 className="mt-3 text-[24px] font-bold leading-tight text-[#9E7641] lg:text-[32px]">
            Guides Worth Reading
          </h2>
        </motion.div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group rounded-2xl border border-[#9e7641]/20 bg-surface-elevated px-5 py-4 shadow-elato-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-elato-md"
            >
              <p className="text-body font-semibold text-secondary-900 transition-colors duration-300 ease-out group-hover:text-[#9E7641]">
                {post.title}
              </p>
              <span className="mt-2 inline-block text-caption font-semibold text-[#9E7641]">Read the guide →</span>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link to="/blog" className="text-caption font-semibold text-[#9E7641] hover:underline">
            See all guides →
          </Link>
        </div>
      </div>
    </section>
  )
}
