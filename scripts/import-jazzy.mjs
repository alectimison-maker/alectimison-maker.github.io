import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { m4aDuration, normalizeAlbumTitle, parseTrackFilename } from './jazz-import-utils.mjs'
import { importJazzStandards } from './import-jazz-standards.mjs'

const source = process.argv[2]
if (!source) throw new Error('Usage: node scripts/import-jazzy.mjs <jazzy-directory>')
const root = path.resolve(import.meta.dirname, '..')
const albumsRoot = path.join(path.resolve(source), 'albums')
const output = path.join(root, 'public/jazz-local')
const records = JSON.parse(await readFile(path.join(root, 'src/data/jazz.json'), 'utf8'))
const catalog = []
const unmatched = []
for (const entry of await readdir(albumsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const directory = path.join(albumsRoot, entry.name)
  const metadata = JSON.parse(await readFile(path.join(directory, 'metadata.json'), 'utf8'))
  const candidates = records.filter((record) => normalizeAlbumTitle(record.title) === normalizeAlbumTitle(metadata.title))
  if (candidates.length !== 1) { unmatched.push(metadata.title); continue }
  const record = candidates[0]
  const destination = path.join(output, record.id)
  const url = `/jazz-local/${record.id}`
  await mkdir(destination, { recursive: true })
  await cp(path.join(directory, 'cover.jpg'), path.join(destination, 'cover.jpg'))
  const tracks = []
  const numbers = new Set()
  for (const file of await readdir(path.join(directory, 'tracks'))) {
    if (!/\.m4a$/i.test(file)) continue
    const { number, title } = parseTrackFilename(file)
    if (numbers.has(number)) throw new Error(`Duplicate track number: ${record.id}/${number}`)
    numbers.add(number)
    const name = `${String(number).padStart(2, '0')}.m4a`
    const input = path.join(directory, 'tracks', file)
    const duration = m4aDuration(await readFile(input))
    await cp(input, path.join(destination, name))
    tracks.push({ id: `${record.id}-${number}`, number, title, duration: Math.round(duration * 100) / 100,
      categories: record.categories ?? [], audio: { src: `${url}/${name}`, mimeType: 'audio/mp4' } })
  }
  tracks.sort((a, b) => a.number - b.number)
  const artworks = []
  try {
    for (const file of (await readdir(path.join(directory, 'artworks'))).sort()) {
      if (!/\.(jpg|jpeg|png|webp)$/i.test(file)) continue
      const name = `artwork-${artworks.length + 1}${path.extname(file).toLowerCase()}`
      await cp(path.join(directory, 'artworks', file), path.join(destination, name))
      artworks.push(`${url}/${name}`)
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  let description = ''
  try { description = (await readFile(path.join(directory, 'description.md'), 'utf8')).trim() }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  catalog.push({ id: record.id, artist: metadata.artist, year: Number(metadata.year) || undefined,
    tags: metadata.tags ?? [], cover: `${url}/cover.jpg`, description, artworks, tracks })
}
catalog.sort((a, b) => records.findIndex((record) => record.id === a.id) - records.findIndex((record) => record.id === b.id))
await writeFile(path.join(root, 'src/data/jazz-local.json'), `${JSON.stringify(catalog, null, 2)}\n`)
console.log(`Imported ${catalog.length} matching albums, ${catalog.reduce((count, album) => count + album.tracks.length, 0)} tracks, ${catalog.reduce((count, album) => count + album.artworks.length, 0)} artworks. Unmatched: ${unmatched.join(', ') || 'none'}.`)
await importJazzStandards(source)
