import { access, cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'
import { m4aDuration } from './jazz-import-utils.mjs'
import { classifyStandard, parseStandardFilename, standardTitleMismatch } from './jazz-standard-utils.mjs'

const exec = promisify(execFile)
const root = path.resolve(import.meta.dirname, '..')
const fingerprint = (buffer) => createHash('sha256').update(buffer).digest('hex')

export async function importJazzStandards(source) {
  const sourceRoot = path.join(path.resolve(source), 'sources/stantard')
  const output = path.join(root, 'public/jazz-local/standards')
  const knownAudio = new Map()
  const albums = JSON.parse(await readFile(path.join(root, 'src/data/jazz-local.json'), 'utf8'))
  for (const track of albums.flatMap((album) => album.tracks)) {
    knownAudio.set(fingerprint(await readFile(path.join(root, 'public', track.audio.src))), track.audio)
  }
  const imageManifest = JSON.parse(await readFile(path.join(root, 'public/image-manifest.json'), 'utf8'))
  const catalog = []
  let reused = 0
  for (const group of (await readdir(sourceRoot, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!group.isDirectory()) continue
    const slug = group.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const groupRoot = path.join(sourceRoot, group.name)
    for (const version of (await readdir(groupRoot, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))) {
      if (!version.isDirectory()) continue
      const directory = path.join(groupRoot, version.name)
      const files = await readdir(directory)
      const audios = files.filter((name) => /\.(m4a|mp3)$/i.test(name))
      const images = files.filter((name) => /\.(jpg|jpeg|png|webp)$/i.test(name)).sort()
      if (!audios.length && !images.length) continue
      if (audios.length !== 1 || !images.length) throw new Error(`Expected one audio and matching artwork: ${group.name}/${version.name}`)
      const file = audios[0]
      const { title, artist } = parseStandardFilename(file)
      const id = `standard-${slug}-${version.name}`
      if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Unsafe resource ID: ${id}`)
      const destination = path.join(output, id)
      const url = `/jazz-local/standards/${id}`
      await mkdir(destination, { recursive: true })
      const input = path.join(directory, file)
      const buffer = await readFile(input)
      let duration
      if (/\.m4a$/i.test(file)) duration = m4aDuration(buffer)
      else {
        // afinfo is built into macOS; ffprobe permits the same import on Linux.
        try {
          const { stdout } = await exec('afinfo', [input])
          duration = Number(stdout.match(/estimated duration:\s*([\d.]+) sec/)?.[1])
        } catch (error) {
          if (error.code !== 'ENOENT') throw error
          const { stdout } = await exec('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', input])
          duration = Number(stdout.trim())
        }
      }
      if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Invalid duration: ${group.name}/${file}`)
      const hash = fingerprint(buffer)
      let audio = knownAudio.get(hash)
      if (audio) reused += 1
      else {
        const extension = path.extname(file).toLowerCase()
        await cp(input, path.join(destination, `audio${extension}`))
        audio = { src: `${url}/audio${extension}`, mimeType: extension === '.mp3' ? 'audio/mpeg' : 'audio/mp4' }
        knownAudio.set(hash, audio)
      }
      const artworks = []
      for (const [index, image] of images.entries()) {
        const name = `artwork-${index + 1}${path.extname(image).toLowerCase()}`
        await cp(path.join(directory, image), path.join(destination, name))
        artworks.push(`${url}/${name}`)
      }
      let coverSource
      try {
        const provenance = JSON.parse(await readFile(path.join(destination, 'cover-source.json'), 'utf8'))
        const imageId = images[0].match(/^(\d{10,})/)?.[1]
        if (provenance.imageId === imageId) {
          await access(path.join(root, 'src/assets/media/images/jazz/standards', `${imageId}.jpg`))
          coverSource = `/media/images/jazz/standards/${imageId}.jpg`
        }
      } catch (error) { if (error.code !== 'ENOENT') throw error }
      await sharp(path.join(directory, images[0])).rotate().resize({ width: 960, withoutEnlargement: true }).webp({ quality: 85 }).toFile(path.join(destination, 'cover.webp'))
      await sharp(path.join(directory, images[0])).rotate().resize({ width: 120, withoutEnlargement: true }).webp({ quality: 75 }).toFile(path.join(destination, 'thumb.webp'))
      const variants = imageManifest[coverSource]?.variants ?? []
      const fallback = variants.findLast((variant) => variant.width <= 1600) ?? variants.at(-1)
      catalog.push({ id, number: Number(version.name), title, artist, standard: group.name, kind: 'standard',
        albumTitle: `${group.name} · 标准曲演绎`, cover: fallback?.webp ?? `${url}/cover.webp`, thumbnail: variants[0]?.webp ?? `${url}/thumb.webp`, artworks,
        ...(coverSource ? { coverSource } : {}),
        categories: classifyStandard(group.name, artist), duration: Math.round(duration * 100) / 100, audio,
        ...(standardTitleMismatch(title, group.name) ? { reviewNote: '文件曲名与原目录不同，待核对' } : {}) })
    }
  }
  await writeFile(path.join(root, 'src/data/jazz-standards.json'), `${JSON.stringify(catalog, null, 2)}\n`)
  console.log(`Imported ${catalog.length} standard performances across ${new Set(catalog.map((track) => track.standard)).size} tunes; ${reused} byte-identical audio files reused; ${catalog.filter((track) => track.reviewNote).length} title mismatches retained for review.`)
  return catalog
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/import-jazz-standards.mjs <jazzy-directory>')
  await importJazzStandards(process.argv[2])
}
