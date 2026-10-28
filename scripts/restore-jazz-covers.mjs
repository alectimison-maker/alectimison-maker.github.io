import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { spawn } from 'node:child_process'
import sharp from 'sharp'

const source = process.argv[2]
if (!source) throw new Error('Usage: node scripts/restore-jazz-covers.mjs <jazzy-directory>')
const root = path.resolve(import.meta.dirname, '..')
const catalogPath = path.join(root, 'src/data/jazz-standards.json')
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'))
const sourceRoot = path.join(path.resolve(source), 'sources/stantard')
const report = []
const cache = new Map()

// Public image-address derivation used by the provider; no login/API key needed.
const imageUrl = (id) => {
  const salt = Buffer.from('3go8&$8*3*3h0k(2)2')
  const value = Buffer.from(id)
  const xor = Buffer.from(value.map((byte, index) => byte ^ salt[index % salt.length]))
  const digest = createHash('md5').update(xor).digest('base64').replaceAll('/', '_').replaceAll('+', '-')
  return `https://p1.music.126.net/${digest}/${id}.jpg`
}

const download = async (url) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, { headers: { Referer: 'https://music.163.com/', 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return Buffer.from(await response.arrayBuffer())
    } catch (error) { if (attempt) throw error }
  }
}

const restore = async (track) => {
  const folder = path.join(sourceRoot, track.standard, String(track.number))
  const originalName = (await readdir(folder)).filter((name) => /\.(jpg|jpeg|png|webp)$/i.test(name)).sort()[0]
  const id = originalName?.match(/^(\d{10,})/)?.[1]
  if (!id) return { id: track.id, status: 'unresolved', reason: 'Original image ID missing' }
  const directory = path.join(root, 'public/jazz-local/standards', track.id)
  const original = path.join(directory, 'original-hd.jpg')
  const mediaSource = path.join(root, 'src/assets/media/images/jazz/standards', `${id}.jpg`)
  const coverSource = `/media/images/jazz/standards/${id}.jpg`
  const low = await sharp(path.join(folder, originalName)).rotate().resize(32, 32).removeAlpha().raw().toBuffer()
  const url = imageUrl(id)
  try {
    let buffer
    try {
      const provenance = JSON.parse(await readFile(path.join(directory, 'cover-source.json'), 'utf8'))
      if (provenance.imageId === id) {
        try { buffer = await readFile(mediaSource) } catch { buffer = await readFile(original) }
      }
    } catch {}
    if (!buffer) {
      if (!cache.has(url)) cache.set(url, download(url))
      buffer = await cache.get(url)
    }
    const metadata = await sharp(buffer).metadata()
    const sourceMetadata = await sharp(path.join(folder, originalName)).metadata()
    const small = await sharp(buffer).rotate().resize(32, 32).removeAlpha().raw().toBuffer()
    if (small.length !== low.length) throw new Error('Image channels differ')
    const difference = low.reduce((sum, byte, index) => sum + Math.abs(byte - small[index]), 0) / low.length
    if (difference > 18) throw new Error(`Artwork identity check needs review (${difference.toFixed(2)})`)
    if (Math.min(metadata.width, metadata.height) <= Math.min(sourceMetadata.width, sourceMetadata.height)) throw new Error('Provider original has no additional detail')
    await mkdir(path.dirname(mediaSource), { recursive: true })
    await writeFile(mediaSource, buffer)
    const provenance = { imageId: id, url, width: metadata.width, height: metadata.height, coverSource }
    await writeFile(path.join(directory, 'cover-source.json'), JSON.stringify(provenance, null, 2) + '\n')
    track.coverSource = coverSource
    delete track.cardCover
    delete track.coverWidth
    delete track.cardWidth
    return { id: track.id, status: 'restored', before: [sourceMetadata.width, sourceMetadata.height], after: [metadata.width, metadata.height], identityDifference: Math.round(difference * 100) / 100 }
  } catch (error) { return { id: track.id, status: 'unresolved', reason: error.message } }
}

let cursor = 0
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < catalog.length) {
    const track = catalog[cursor++]
    report.push(await restore(track))
    if (report.length % 25 === 0) console.log(`Checked ${report.length}/${catalog.length} covers`)
  }
}))
report.sort((a, b) => a.id.localeCompare(b.id))
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [path.join(root, 'scripts/optimize-images.mjs')], { cwd: root, stdio: 'inherit' })
  child.on('error', reject)
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Site image pipeline exited ${code}`)))
})
const manifest = JSON.parse(await readFile(path.join(root, 'public/image-manifest.json'), 'utf8'))
for (const track of catalog) {
  const variants = manifest[track.coverSource]?.variants ?? []
  const fallback = variants.findLast((variant) => variant.width <= 1600) ?? variants.at(-1)
  if (fallback) { track.cover = fallback.webp; track.thumbnail = variants[0].webp }
}
await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n')
await writeFile(path.join(root, 'src/data/jazz-cover-quality.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ restored: report.filter((entry) => entry.status === 'restored').length, unresolved: report.filter((entry) => entry.status !== 'restored') }, null, 2))
