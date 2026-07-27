import { describe, expect, it } from 'vitest'
import { p0CardImageSources, p0DetailImageSource } from './p0-image-sources'

describe('P0AlbumWorld image sources', () => {
  it('uses the guaranteed WebP card variant instead of an optional AVIF source', () => {
    const sources = p0CardImageSources('/media/anime/example.webp')

    expect(sources).toEqual({ webp: '/media/anime/example.w480.webp' })
  })

  it('uses the optimized full-resolution baseline in the detail dialog', () => {
    expect(p0DetailImageSource('/media/anime/my 2025/example.webp'))
      .toBe('/anime/my%202025/example.webp')
  })
})
