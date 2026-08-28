import { describe, expect, it } from 'vitest'
import imageManifest from '../../../public/image-manifest.json'
import { p0CardImageSources, p0DetailImageSource } from './p0-image-sources'

describe('P0AlbumWorld image sources', () => {
  it('uses the guaranteed WebP card variant instead of an optional AVIF source', () => {
    const sources = p0CardImageSources('/media/anime/example.webp')

    expect(sources).toEqual({ webp: '/media/anime/example.w480.webp' })
  })

  it('uses the largest responsive WebP variant in the detail dialog', () => {
    const source = '/media/anime/%E5%90%AF%E8%92%99%E7%95%AA/%E6%98%A5%E7%89%A9%20%EF%BC%88%E7%AC%AC%E4%B8%80%E5%AD%A3%EF%BC%89.png'
    const variants = imageManifest[source].variants

    expect(p0DetailImageSource(decodeURI(source))).toBe(variants.at(-1)?.webp)
  })
})
