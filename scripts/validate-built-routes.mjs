import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import * as cheerio from 'cheerio'

const dist = path.resolve(import.meta.dirname, '../dist')
const origin = 'https://aliouswe.com'
const retired = /^\/(?:categories|tags|404-lab|about|archives|search|pagefind)(?:\/|\.|$)/
// These are unfinished local work, preserved in source but excluded from releases.
const localOnly = /^\/(?:design-prototype|coffee-3d-prototype|night-wanderer)(?:\/|\.|$)/
const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  }))
  return files.flat()
}
const files = await walk(dist)
const htmlFiles = files.filter((file) => file.endsWith('.html'))
const fail = (message) => {
  console.error(`Built route validation failed: ${message}`)
  process.exitCode = 1
}
if (files.some((file) => path.relative(dist, file).split(path.sep)[0] === 'pagefind')) {
  fail('retired Pagefind search index still emitted')
}
const exists = async (pathname) => {
  const target = path.join(dist, decodeURIComponent(pathname))
  try {
    await access(pathname.endsWith('/') ? path.join(target, 'index.html') : target)
    return true
  } catch {
    return false
  }
}
let links = 0
for (const file of htmlFiles) {
  const relative = path.relative(dist, file)
  const pathname = `/${relative.replace(/index\.html$/, '')}`
  if (retired.test(pathname)) fail(`retired page still emitted: ${pathname}`)
  if (localOnly.test(pathname)) fail(`unfinished local prototype leaked into release: ${pathname}`)
  const $ = cheerio.load(await readFile(file, 'utf8'))
  for (const element of $('a[href]').toArray()) {
    const href = $(element).attr('href')
    if (!href || href.startsWith('#')) continue
    const url = new URL(href, new URL(pathname, origin))
    if (url.origin !== origin) continue
    links += 1
    if (retired.test(url.pathname) || localOnly.test(url.pathname) || !await exists(url.pathname)) {
      fail(`${relative} links to missing, retired, or local-only route: ${href}`)
    }
  }
  if (/^\/20\d{2}\//.test(pathname)) {
    const refresh = $('meta[http-equiv="refresh"]').attr('content') ?? ''
    const destination = refresh.match(/url=(.+)$/i)?.[1]
    if (!destination || !destination.startsWith('/posts/') || !await exists(destination) || $('article').length) {
      fail(`legacy URL must redirect to a real canonical post without duplicating content: ${pathname}`)
    }
  }
}
for (const file of files.filter((file) => /sitemap.*\.(xml|txt)$/.test(path.basename(file)))) {
  const source = await readFile(file, 'utf8')
  const urls = source.match(/https:\/\/aliouswe\.com[^\s<]*/g) ?? []
  for (const value of urls) {
    const url = new URL(value)
    if (retired.test(url.pathname) || localOnly.test(url.pathname) || /^\/20\d{2}\//.test(url.pathname) || /^\/(?:search|404)(?:\/|\.|$)/.test(url.pathname)) {
      fail(`${path.basename(file)} indexes a non-canonical page: ${url.pathname}`)
    }
    if (!await exists(url.pathname)) fail(`${path.basename(file)} references a missing route: ${url.pathname}`)
  }
}
if (!process.exitCode) console.log(`Validated ${htmlFiles.length} HTML files and ${links} internal links; retired routes absent, legacy redirects and sitemaps valid.`)
