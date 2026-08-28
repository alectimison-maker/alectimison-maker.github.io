const variant = (source: string, width: number, extension: 'webp' | 'avif') => {
  const decoded = decodeURI(source)
  const extensionIndex = decoded.lastIndexOf('.')
  return encodeURI(`${decoded.slice(0, extensionIndex)}.w${width}.${extension}`)
}

export const p0CardImageSources = (source: string) => ({
  webp: variant(source, 480, 'webp'),
})

export const p0DetailImageSource = (source: string) => variant(source, 480, 'webp')
