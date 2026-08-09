import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import {
  canReuseImageSource,
  shouldRegenerateImageVariants,
} from './image-pipeline-policy.mjs'

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

const readManifest = async () => {
  if (!await exists(manifestPath)) return {}
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch {
    return {}
  }
}

const fingerprint = async (target) => createHash('sha256')
  .update(await readFile(target))
  .digest('hex')

const outputPathFromUrl = (url) => {
  const relative = decodeURI(url).replace(/^\/media\//, '')
  return path.join(outputRoot, relative)
}

const entryOutputsExist = async (relative, entry) => {
  if (!entry?.variants?.length) return false
  if (!await exists(path.join(publicRoot, relative))) return false
  for (const variant of entry.variants) {
    if (!await exists(outputPathFromUrl(variant.webp))) return false
    if (variant.avif && !await exists(outputPathFromUrl(variant.avif))) return false
  }
  return true
}

const changedPathsFile = process.env.IMAGE_CHANGED_PATHS_FILE
const changedPaths = changedPathsFile && await exists(changedPathsFile)
  ? new Set(
      (await readFile(changedPathsFile, 'utf8'))
        .split('\0')
        .filter(Boolean)
        .map((entry) => entry.replaceAll('\\', '/').replace(/^src\/assets\/media\//, '')),
    )
  : undefined

const previousManifest = await readManifest()
const canBootstrapFingerprints = changedPaths !== undefined && Object.keys(previousManifest).length > 0

if (process.env.SKIP_IMAGE_OPTIMIZATION === 'true' && await exists(manifestPath)) {
  console.log('Image pipeline: restored from cache.')
  process.exit(0)
}

await mkdir(outputRoot, { recursive: true })

const files = (await walk(sourceRoot)).sort((a, b) => a.localeCompare(b))
const manifest = {}
let generated = 0
let reused = 0
let rebuiltSources = 0
let reusedSources = 0
const requestedConcurrency = Number.parseInt(process.env.IMAGE_PIPELINE_CONCURRENCY ?? '3', 10)
const pipelineConcurrency = Number.isFinite(requestedConcurrency)
  ? Math.min(6, Math.max(1, requestedConcurrency))
  : 3

const processSource = async (source) => {
  const relative = path.relative(sourceRoot, source)
  const normalizedRelative = relative.split(path.sep).join('/')
  const extension = path.extname(relative).toLowerCase()
  const destination = path.join(outputRoot, relative)
  const legacyDestination = path.join(publicRoot, relative)
  await mkdir(path.dirname(destination), { recursive: true })
  await mkdir(path.dirname(legacyDestination), { recursive: true })

  if (passthroughExtensions.has(extension)) {
    await cp(source, destination)
    await cp(source, legacyDestination)
    return
  }
  if (!rasterExtensions.has(extension)) return

  const manifestKey = `/media/${relative.split(path.sep).map(encodeURIComponent).join('/')}`
  const sourceHash = await fingerprint(source)
  const previousEntry = previousManifest[manifestKey]
  const hashMatches = previousEntry?.sourceHash === sourceHash
  const isMarkedChanged = changedPaths?.has(normalizedRelative) ?? false
  const bootstrapMatches = canBootstrapFingerprints
    && previousEntry
    && !previousEntry.sourceHash
    && !isMarkedChanged
  const outputsReady = await entryOutputsExist(relative, previousEntry)

  if (canReuseImageSource({
    previousHash: previousEntry?.sourceHash,
    sourceHash,
    canBootstrapFingerprints,
    isMarkedChanged,
    outputsExist: outputsReady,
  })) {
    manifest[manifestKey] = { ...previousEntry, sourceHash }
    reused += previousEntry.variants.reduce((count, variant) => count + 1 + Number(Boolean(variant.avif)), 0)
    reusedSources += 1
    return
  }

  rebuiltSources += 1
  const regenerateVariants = shouldRegenerateImageVariants({
    hasPreviousEntry: Boolean(previousEntry),
    hashMatches,
    bootstrapMatches,
    isMarkedChanged,
  })

  let metadata
  try {
    metadata = await sharp(source, { animated: false }).metadata()
  } catch {
    await cp(source, destination)
    return
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
  const maximumWidth = Math.min(sourceWidth, widths.at(-1))
  const outputWidths = widths.filter((width) => width < maximumWidth)
  outputWidths.push(maximumWidth)

  const entries = []
  const currentVariantUrls = new Set()
  for (const width of outputWidths) {
    const webpRelative = `${stem}.w${width}.webp`
    const avifRelative = `${stem}.w${width}.avif`
    const webpOutput = path.join(outputRoot, webpRelative)
    const avifOutput = path.join(outputRoot, avifRelative)
    await mkdir(path.dirname(webpOutput), { recursive: true })

    if (regenerateVariants || !await exists(webpOutput)) {
      await sharp(source)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82, alphaQuality: 90, effort: 5, smartSubsample: true })
        .toFile(webpOutput)
      generated += 1
    } else reused += 1

    if (width >= 960 && (regenerateVariants || !await exists(avifOutput))) {
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
    currentVariantUrls.add(`/media/${encodeURI(webpRelative)}`)
    if (width >= 960) currentVariantUrls.add(`/media/${encodeURI(avifRelative)}`)
  }

  for (const variant of previousEntry?.variants ?? []) {
    for (const url of [variant.webp, variant.avif].filter(Boolean)) {
      if (!currentVariantUrls.has(url)) await rm(outputPathFromUrl(url), { force: true })
    }
  }

  manifest[manifestKey] = {
    width: sourceWidth,
    height: sourceHeight,
    sourceHash,
    variants: entries,
  }
}

let nextFile = 0
await Promise.all(Array.from({ length: Math.min(pipelineConcurrency, files.length) }, async () => {
  while (nextFile < files.length) {
    const index = nextFile
    nextFile += 1
    await processSource(files[index])
  }
}))

for (const [key, entry] of Object.entries(previousManifest)) {
  if (manifest[key]) continue
  for (const variant of entry.variants ?? []) {
    for (const url of [variant.webp, variant.avif].filter(Boolean)) {
      await rm(outputPathFromUrl(url), { force: true })
    }
  }
  const legacyRelative = decodeURI(key).replace(/^\/media\//, '')
  await rm(path.join(publicRoot, legacyRelative), { force: true })
}

const sortedManifest = Object.fromEntries(
  Object.entries(manifest).sort(([left], [right]) => left.localeCompare(right)),
)
await writeFile(manifestPath, `${JSON.stringify(sortedManifest, null, 2)}\n`)
console.log(
  `Image pipeline: ${files.length} sources, ${rebuiltSources} rebuilt, ${reusedSources} unchanged, `
  + `${generated} variants generated, ${reused} variants reused, concurrency ${pipelineConcurrency}.`,
)
