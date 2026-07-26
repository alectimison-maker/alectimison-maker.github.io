import { getCollection } from 'astro:content'
import { SITE, SPACE_META } from '../lib/site'

const xml = (paths: string[]) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <url><loc>${SITE.origin}${path}</loc></url>`).join('\n')}
</urlset>`

export async function GET() {
  const posts = await getCollection('posts', ({ data }) => !data.draft)
  const paths = [
    '/',
    ...Object.keys(SPACE_META).map((space) => `/${space}/`),
    '/archive/',
    '/contact/',
    '/privacy/',
    ...posts.map((post) => `/posts/${post.id}/`),
  ]
  return new Response(xml(paths), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
