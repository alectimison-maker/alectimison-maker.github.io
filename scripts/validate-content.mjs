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
  if (mediaFiles.length !== manifest.sourceCounts.media) fail(`expected ${manifest.sourceCounts.media} media assets, found ${mediaFiles.length}`)

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
  }

  for (const name of ['jazz', 'anime', 'coffee']) {
    const entries = JSON.parse(await readFile(path.join(root, 'src', 'data', `${name}.json`), 'utf8'))
    if (entries.length !== manifest.normalizedCounts[name]) fail(`${name} normalized count changed`)
    for (const entry of entries) {
      if (!entry.title || !entry.cover || !entry.shelves?.length) fail(`${name}/${entry.id} is incomplete`)
      await validateMediaPath(entry.cover, `${name}/${entry.id}`)
    }
  }

  await access(path.join(root, 'public', 'CNAME'))
  console.log(`Validated ${posts.length} posts, ${mediaFiles.length} media assets, and all collection manifests.`)
} catch (error) {
  fail(error.message)
}
