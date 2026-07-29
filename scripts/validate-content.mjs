import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const manifestPath = path.join(root, 'src', 'data', 'migration-manifest.json')

const fail = (message) => {
  console.error(`Content validation failed: ${message}`)
  process.exitCode = 1
}

try {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const posts = (await readdir(path.join(root, 'src', 'content', 'posts'))).filter((file) => /\.mdx?$/.test(file))
  if (posts.length !== manifest.sourceCounts.posts) fail(`expected ${manifest.sourceCounts.posts} posts, found ${posts.length}`)

  const mediaRoot = path.join(root, 'src', 'assets', 'media')
  const walk = async (directory) => {
    const files = []
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) files.push(...await walk(target))
      else files.push(target)
    }
    return files
  }
  const mediaFiles = await walk(mediaRoot)
  if (mediaFiles.length < manifest.sourceCounts.media) {
    fail(`expected at least ${manifest.sourceCounts.media} media assets, found ${mediaFiles.length}`)
  }

  const validateMediaPath = async (source, owner) => {
    const relative = decodeURI(source).replace(/^\/media\//, '')
    try {
      await access(path.join(mediaRoot, relative))
    } catch {
      fail(`${owner} references missing media: ${source}`)
    }
  }

  for (const postFile of posts) {
    const content = await readFile(path.join(root, 'src', 'content', 'posts', postFile), 'utf8')
    for (const match of content.matchAll(/\]\((\/media\/[^)\s]+)/g)) await validateMediaPath(match[1], postFile)

    const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
    let fenced = false
    for (const [index, line] of body.split(/\r?\n/).entries()) {
      if (/^\s*(```|~~~)/.test(line)) {
        fenced = !fenced
        continue
      }
      if (!fenced && /^#\s/.test(line)) {
        fail(`${postFile}:${index + 1} contains a body-level H1; the page title is already H1`)
      }
    }
  }

  const jazzCategorySlugs = new Set([
    'swing',
    'bebop',
    'cool-jazz',
    'hard-bop',
    'modal-jazz',
    'free-jazz',
    'fusion',
    'vocal-jazz',
    'latin-and-bossa',
    'soul-jazz',
    'post-bop',
  ])

  for (const name of ['jazz', 'anime', 'coffee']) {
    const entries = JSON.parse(await readFile(path.join(root, 'src', 'data', `${name}.json`), 'utf8'))
    if (entries.length < manifest.normalizedCounts[name]) fail(`${name} lost normalized records`)
    for (const entry of entries) {
      if (!entry.title || !entry.cover || !entry.shelves?.length) fail(`${name}/${entry.id} is incomplete`)
      if (name === 'jazz' && entry.categories?.some((slug) => !jazzCategorySlugs.has(slug))) {
        fail(`jazz/${entry.id} references an unknown jazz category`)
      }
      await validateMediaPath(entry.cover, `${name}/${entry.id}`)
    }
  }

  await access(path.join(root, 'public', 'CNAME'))
  if (!process.exitCode) {
    console.log(`Validated ${posts.length} posts, ${mediaFiles.length} media assets, and all collection manifests.`)
  }
} catch (error) {
  fail(error.message)
}
