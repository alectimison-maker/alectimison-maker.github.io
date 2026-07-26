import { getCollection } from 'astro:content'
import { SITE, SPACE_META } from '../lib/site'

export async function GET() {
  const posts = await getCollection('posts', ({ data }) => !data.draft)
  const paths = [
    '/',
    ...Object.keys(SPACE_META).map((space) => `/${space}/`),
    '/archive/',
    ...posts.map((post) => `/posts/${post.id}/`),
  ]
  return new Response(paths.map((path) => `${SITE.origin}${path}`).join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
