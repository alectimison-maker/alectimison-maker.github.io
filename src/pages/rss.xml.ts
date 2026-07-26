import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import { SITE } from '../lib/site'

export async function GET(context: { site: URL }) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/posts/${post.id}/`,
      categories: [post.data.space, ...post.data.tags],
    })),
  })
}
