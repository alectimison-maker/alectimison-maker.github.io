import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const sourceRoot = path.join(root, 'src', 'assets', 'media')
const outputRoot = path.join(root, 'public', 'media')
const publicRoot = path.join(root, 'public')
const manifestPath = path.join(root, 'public', 'image-manifest.json')
const rasterExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'])
const passthroughExtensions = new Set(['.svg', '.ico'])
const widths = [480, 960, 1600, 2560]

const walk = async (directory) => {
  const output = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) output.push(...await walk(fullPath))
    else output.push(fullPath)
  }
  return output
}

const exists = async (target) => {
  try {
    await stat(target)
    return true
  } catch {
    return false
  }
}

await mkdir(outputRoot, { recursive: true })

const files = await walk(sourceRoot)
const manifest = {}
let generated = 0
let reused = 0

for (const source of files) {
  const relative = path.relative(sourceRoot, source)
  const extension = path.extname(relative).toLowerCase()
  const destination = path.join(outputRoot, relative)
  const legacyDestination = path.join(publicRoot, relative)
  await mkdir(path.dirname(destination), { recursive: true })
  await mkdir(path.dirname(legacyDestination), { recursive: true })

  if (passthroughExtensions.has(extension)) {
    await cp(source, destination)
    await cp(source, legacyDestination)
    continue
  }
  if (!rasterExtensions.has(extension)) continue

  let metadata
  try {
    metadata = await sharp(source, { animated: false }).metadata()
  } catch {
    await cp(source, destination)
    continue
  }

  const baseline = sharp(source, { animated: false }).rotate().resize({ width: 2560, withoutEnlargement: true })
  if (extension === '.jpg' || extension === '.jpeg') {
    await baseline.jpeg({ quality: 82, mozjpeg: true }).toFile(destination)
  } else if (extension === '.png') {
    await baseline.png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 90 }).toFile(destination)
  } else if (extension === '.webp') {
    await baseline.webp({ quality: 82, alphaQuality: 90, effort: 5 }).toFile(destination)
  } else if (extension === '.avif') {
    await baseline.avif({ quality: 58, effort: 5 }).toFile(destination)
  } else {
    await cp(source, destination)
  }
  await cp(destination, legacyDestination)
  // Runtime pages use the responsive variants below. Keep only the optimized
  // legacy-path copy of the baseline raster to avoid duplicating it in the artifact.
  await rm(destination, { force: true })

  const sourceWidth = metadata.width ?? 1600
  const sourceHeight = metadata.height ?? 1200
  const stem = relative.slice(0, -extension.length)
  const outputWidths = widths

  const entries = []
  for (const width of outputWidths) {
    const webpRelative = `${stem}.w${width}.webp`
    const avifRelative = `${stem}.w${width}.avif`
    const webpOutput = path.join(outputRoot, webpRelative)
    const avifOutput = path.join(outputRoot, avifRelative)
    await mkdir(path.dirname(webpOutput), { recursive: true })

    if (!await exists(webpOutput)) {
      await sharp(source)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82, alphaQuality: 90, effort: 5, smartSubsample: true })
        .toFile(webpOutput)
      generated += 1
    } else reused += 1

    if (width >= 960 && !await exists(avifOutput)) {
      await sharp(source)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .avif({ quality: 58, effort: 5, chromaSubsampling: '4:2:0' })
        .toFile(avifOutput)
      generated += 1
    } else if (width >= 960) reused += 1

    entries.push({
      width,
      webp: `/media/${encodeURI(webpRelative)}`,
      avif: width >= 960 ? `/media/${encodeURI(avifRelative)}` : undefined,
    })
  }

  manifest[`/media/${relative.split(path.sep).map(encodeURIComponent).join('/')}`] = {
    width: sourceWidth,
    height: sourceHeight,
    variants: entries,
  }
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Image pipeline: ${files.length} sources, ${generated} generated, ${reused} reused.`)
