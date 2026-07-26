import { getCollection } from 'astro:content'
import { SITE } from '../lib/site'

const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (character) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
})[character]!)

export async function GET() {
  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
  const updated = posts[0]?.data.updatedAt ?? posts[0]?.data.date ?? new Date()
  const entries = posts.map((post) => `
    <entry>
      <title>${escapeXml(post.data.title)}</title>
      <id>${SITE.origin}/posts/${post.id}/</id>
      <link href="${SITE.origin}/posts/${post.id}/"/>
      <updated>${(post.data.updatedAt ?? post.data.date).toISOString()}</updated>
      <published>${post.data.date.toISOString()}</published>
      <summary>${escapeXml(post.data.description ?? '')}</summary>
    </entry>`).join('')
  return new Response(`<?xml version="1.0" encoding="utf-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <title>${escapeXml(SITE.name)}</title>
    <id>${SITE.origin}/</id>
    <link href="${SITE.origin}/atom.xml" rel="self"/>
    <link href="${SITE.origin}/"/>
    <updated>${updated.toISOString()}</updated>
    ${entries}
  </feed>`, { headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' } })
}
