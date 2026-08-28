import imageManifest from '../../../public/image-manifest.json'

interface ImageVariant {
  width: number
  webp: string
}

interface ImageEntry {
  variants: ImageVariant[]
}

const variant = (source: string, width: number, extension: 'webp' | 'avif') => {
  const decoded = decodeURI(source)
  const extensionIndex = decoded.lastIndexOf('.')
  return encodeURI(`${decoded.slice(0, extensionIndex)}.w${width}.${extension}`)
}

export const p0CardImageSources = (source: string) => ({
  webp: variant(source, 480, 'webp'),
})

export const p0DetailImageSource = (source: string) => {
  const key = decodeURI(source).split('/').map(encodeURIComponent).join('/')
  const variants = (imageManifest as Record<string, ImageEntry>)[key]?.variants ?? []
  return variants.at(-1)?.webp ?? encodeURI(source)
}
