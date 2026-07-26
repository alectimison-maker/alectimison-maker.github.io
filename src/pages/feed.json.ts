import { getCollection } from 'astro:content'
import { SITE } from '../lib/site'

export async function GET() {
  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
  return Response.json({
    version: 'https://jsonfeed.org/version/1.1',
    title: SITE.name,
    home_page_url: SITE.origin,
    feed_url: `${SITE.origin}/feed.json`,
    description: SITE.description,
    authors: [{ name: SITE.author, url: SITE.github, avatar: `${SITE.origin}/avatar.webp` }],
    items: posts.map((post) => ({
      id: `${SITE.origin}/posts/${post.id}/`,
      url: `${SITE.origin}/posts/${post.id}/`,
      title: post.data.title,
      summary: post.data.description,
      date_published: post.data.date.toISOString(),
      date_modified: post.data.updatedAt?.toISOString(),
      tags: [post.data.space, ...post.data.tags],
    })),
  })
}
