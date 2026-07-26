import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import * as cheerio from 'cheerio'
import TurndownService from 'turndown'

const root = path.resolve(import.meta.dirname, '..')
const postsOutput = path.join(root, 'src', 'content', 'posts')
const dataOutput = path.join(root, 'src', 'data')
const execFileAsync = promisify(execFile)

const readLegacy = async (file) => {
  try {
    return await readFile(path.join(root, file), 'utf8')
  } catch {
    const { stdout } = await execFileAsync('git', ['show', `legacy-static:${file}`], { cwd: root, maxBuffer: 64 * 1024 * 1024 })
    return stdout
  }
}

const legacyPosts = [
  { file: "2026/05/25/How's the coffee/index.html", slug: 'hows-the-coffee', space: 'coffee' },
  { file: '2026/05/22/When I am a exile/index.html', slug: 'when-i-am-a-exile', space: 'nonsense' },
  { file: '2026/04/08/everything i kown about PID/index.html', slug: 'everything-i-kown-about-pid', space: 'article' },
  { file: '2026/04/05/everything i should kown before learning control/index.html', slug: 'everything-i-should-kown-before-learning-control', space: 'article' },
  { file: '2026/04/02/everything-i-should-kown-about-control/index.html', slug: 'everything-i-should-kown-about-control', space: 'article' },
  { file: '2026/01/12/的2048aliouswe第眠昼失白/index.html', slug: 'aliouswe-2048-whiteout', space: 'nonsense' },
  { file: '2025/12/07/The-Door/index.html', slug: 'behind-the-door', space: 'nonsense' },
  { file: '2025/12/03/在Hackey纪元8011年，aliouswe拥有了多种时间/index.html', slug: 'hackey-8011-many-times', space: 'nonsense' },
]

const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')

const toMediaPath = (value = '') => {
  const decoded = decodeURI(value)
  if (decoded.startsWith('/media/')) return decoded
  return decoded.startsWith('/') ? `/media${decoded}` : decoded
}

const detectLanguage = (value) => {
  const chinese = (value.match(/[\u3400-\u9fff]/g) ?? []).length
  const latin = (value.match(/[A-Za-z]/g) ?? []).length
  if (chinese > latin * 1.5) return 'zh-CN'
  if (latin > chinese * 2) return 'en'
  return 'mixed'
}

const isoDate = (value, fallback) => {
  const date = value ? new Date(value) : new Date(fallback)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

const yamlString = (value) => JSON.stringify(value)

const turndown = new TurndownService({
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  headingStyle: 'atx',
})

turndown.addRule('removeHeaderAnchors', {
  filter: (node) => node.nodeName === 'A' && node.classList?.contains('headerlink'),
  replacement: () => '',
})

turndown.addRule('mediaImages', {
  filter: 'img',
  replacement: (_content, node) => {
    const source = toMediaPath(node.getAttribute('src') ?? '')
    const alt = node.getAttribute('alt') || '文章图片（待补充说明）'
    const title = node.getAttribute('title')
    return `![${alt}](${encodeURI(source)}${title ? ` ${yamlString(title)}` : ''})`
  },
})

const normalizeArticleHtml = ($, body) => {
  body.find('figure.highlight').each((_index, figure) => {
    const element = $(figure)
    const rawLanguage = (element.attr('class') ?? '')
      .split(/\s+/)
      .find((part) => part !== 'highlight') ?? 'text'
    const language = ({ arduino: 'cpp', abnf: 'text', xl: 'text' })[rawLanguage] ?? rawLanguage
    const lines = element.find('td.code .line').toArray().map((line) => $(line).text())
    element.replaceWith(`<pre><code class="language-${language}">${escapeHtml(lines.join('\n'))}</code></pre>`)
  })
  body.find('img').each((_index, image) => {
    const element = $(image)
    element.attr('src', toMediaPath(element.attr('src')))
  })
  body.find('script, style').remove()
}

const extractPost = async ({ file, slug, space }) => {
  const html = await readLegacy(file)
  const $ = cheerio.load(html)
  const body = $('.post-body').first()
  normalizeArticleHtml($, body)

  const title = $('.post-title').first().text().trim() || $('title').text().split('|')[0].trim()
  const dateElement = $('time[itemprop*="dateCreated"]').first()
  const authoredDate = dateElement.text().trim() || file.slice(0, 10)
  const publishedAt = isoDate(dateElement.attr('datetime'), `${authoredDate}T00:00:00.000Z`)
  const updatedRaw = $('meta[property="article:modified_time"]').attr('content')
  const tags = $('.post-tags a').toArray().map((item) => $(item).text().replace(/^#/, '').trim()).filter(Boolean)
  const description = body.find('p').toArray().map((item) => $(item).text().trim()).find(Boolean)?.slice(0, 180)
  const text = body.text().replace(/\s+/g, ' ').trim()
  const markdown = turndown.turndown(body.html() ?? '').trim()
  const legacyPath = `/${file.replace(/index\.html$/, '')}`

  const frontmatter = [
    '---',
    `title: ${yamlString(title)}`,
    description ? `description: ${yamlString(description)}` : undefined,
    `date: ${yamlString(authoredDate)}`,
    `publishedAt: ${yamlString(publishedAt)}`,
    updatedRaw ? `updatedAt: ${yamlString(isoDate(updatedRaw, publishedAt))}` : undefined,
    `space: ${space}`,
    `tags: ${JSON.stringify(tags)}`,
    `lang: ${detectLanguage(text)}`,
    'draft: false',
    'featured: false',
    `legacyPath: ${yamlString(legacyPath)}`,
    '---',
  ].filter(Boolean).join('\n')

  await writeFile(path.join(postsOutput, `${slug}.mdx`), `${frontmatter}\n\n${markdown}\n`)
  return { slug, title, legacyPath, media: body.find('img').length }
}

const slugify = (value) => value
  .normalize('NFKD')
  .toLowerCase()
  .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
  .replace(/^-|-$/g, '')

const uniqueId = (base, seen) => {
  const current = seen.get(base) ?? 0
  seen.set(base, current + 1)
  return current === 0 ? base : `${base}-${current + 1}`
}

const extractCards = async (file, type, cardSelector, titleSelector, sectionSelector, sectionTitleSelector) => {
  const html = await readLegacy(file)
  const $ = cheerio.load(html)
  const seen = new Map()
  const entries = []

  $(cardSelector).each((index, card) => {
    const element = $(card)
    const title = element.find(titleSelector).first().text().trim() || `Untitled ${index + 1}`
    const cover = toMediaPath(element.find('img').first().attr('src'))
    const shelf = element.closest(sectionSelector).find(sectionTitleSelector).first().text().trim() || 'Unsorted'
    const base = slugify(title) || `${type}-${index + 1}`
    entries.push({
      id: uniqueId(base, seen),
      type,
      title,
      cover,
      shelves: [shelf],
      order: index,
    })
  })

  return entries
}

await mkdir(postsOutput, { recursive: true })
await mkdir(dataOutput, { recursive: true })

const migratedPosts = []
for (const post of legacyPosts) migratedPosts.push(await extractPost(post))

const jazz = await extractCards('jazz/index.html', 'jazz', 'article.jazz-card', '.jazz-album-title', '.jazz-albums', 'h2')
const animeRaw = await extractCards('anime/index.html', 'anime', 'article.anime-card', '.anime-name', '.anime-window', '.anime-window-title')
const coffeeRaw = await extractCards('coffee/index.html', 'coffee', 'article.coffee-card', '.coffee-name', '.coffee-window', '.coffee-window-title')

const mergeDuplicateEntries = (entries) => {
  const merged = new Map()
  for (const entry of entries) {
    const key = entry.title.toLocaleLowerCase()
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, entry)
      continue
    }
    existing.shelves = [...new Set([...existing.shelves, ...entry.shelves])]
    if (!existing.cover && entry.cover) existing.cover = entry.cover
  }
  return [...merged.values()]
}

const anime = mergeDuplicateEntries(animeRaw)
const coffee = mergeDuplicateEntries(coffeeRaw)

await writeFile(path.join(dataOutput, 'jazz.json'), `${JSON.stringify(jazz, null, 2)}\n`)
await writeFile(path.join(dataOutput, 'anime.json'), `${JSON.stringify(anime, null, 2)}\n`)
await writeFile(path.join(dataOutput, 'coffee.json'), `${JSON.stringify(coffee, null, 2)}\n`)
await writeFile(path.join(dataOutput, 'migration-manifest.json'), `${JSON.stringify({
  sourceCommit: '7d20f15',
  posts: migratedPosts,
  sourceCounts: { posts: 8, jazz: 9, anime: 83, coffee: 6, media: 249, collectionSourcePages: 2 },
  normalizedCounts: { posts: migratedPosts.length, jazz: jazz.length, anime: anime.length, coffee: coffee.length },
}, null, 2)}\n`)

console.log(`Migrated ${migratedPosts.length} posts, ${jazz.length} jazz, ${anime.length} anime, and ${coffee.length} coffee records.`)
