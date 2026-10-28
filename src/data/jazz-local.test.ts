import { stat } from 'node:fs/promises'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import catalog from './jazz-local.json'
import records from './jazz.json'
import standards from './jazz-standards.json'
import { jazzCategories } from './jazz-categories'
import coverQuality from './jazz-cover-quality.json'
import imageManifest from '../../public/image-manifest.json'
import { albumQueue, formatTrackTime } from './jazz-types'

describe('imported Jazz library', () => {
  it('matches existing records and preserves ordered, unique tracks with real media files', async () => {
    expect(catalog).toHaveLength(9)
    expect(catalog.flatMap((album) => album.tracks)).toHaveLength(86)
    for (const album of catalog) {
      const record = records.find((candidate) => candidate.id === album.id)
      expect(record).toBeDefined()
      expect(album.tracks.map((track) => track.number)).toEqual([...album.tracks.map((track) => track.number)].sort((a, b) => a - b))
      expect(new Set(album.tracks.map((track) => track.id)).size).toBe(album.tracks.length)
      for (const track of album.tracks) {
        expect(track.duration).toBeGreaterThan(0)
        expect(track.categories).toEqual(record?.categories)
        expect((await stat(new URL(`../../public${track.audio.src}`, import.meta.url))).size).toBeGreaterThan(1000)
      }
      for (const image of [album.cover, ...album.artworks]) {
        expect((await stat(new URL(`../../public${image}`, import.meta.url))).size).toBeGreaterThan(0)
      }
      expect(albumQueue({ ...record!, ...album })).toHaveLength(album.tracks.length)
    }
  })

  it('formats progress and guards non-finite media duration values', () => {
    expect(formatTrackTime(562.99)).toBe('9:22')
    expect(formatTrackTime(NaN)).toBe('0:00')
    expect(formatTrackTime(Infinity)).toBe('0:00')
  })

  it('includes all standalone performances, matching images, MP3/M4A and valid browsing shelves', async () => {
    expect(standards).toHaveLength(305)
    expect(new Set(standards.map((track) => track.standard)).size).toBe(15)
    expect(new Set(standards.map((track) => track.id)).size).toBe(305)
    const valid = new Set<string>(jazzCategories.map((category) => category.slug))
    for (const track of standards) {
      expect(track.duration).toBeGreaterThan(0)
      expect(track.artist).not.toBe('')
      expect(track.categories.length).toBeGreaterThan(0)
      expect(track.categories.every((category) => valid.has(category))).toBe(true)
      expect(['audio/mpeg', 'audio/mp4']).toContain(track.audio.mimeType)
      for (const source of [track.audio.src, track.cover, track.thumbnail, ...track.artworks]) {
        expect((await stat(new URL(`../../public${source}`, import.meta.url))).size).toBeGreaterThan(0)
      }
    }
    const duplicated = standards.find((track) => track.title === 'So What' && track.artist === 'Miles Davis')
    expect(duplicated?.audio.src).toBe('/jazz-local/kind-of-blue/01.m4a')
    const review = standards.filter((track) => 'reviewNote' in track)
    expect(review.map((track) => track.title)).toEqual(['All Of Us'])
  })

  it('restores genuine higher-resolution covers and uses the site responsive compression manifest', async () => {
    expect(coverQuality).toHaveLength(305)
    expect(coverQuality.every((entry) => entry.status === 'restored')).toBe(true)
    type Entry = { width: number; variants: { width: number; webp: string; avif?: string }[] }
    const manifest: Record<string, Entry> = imageManifest
    for (const track of standards) {
      expect('coverSource' in track).toBe(true)
      const source = String('coverSource' in track ? track.coverSource : '')
      const entry = manifest[source]
      expect(entry).toBeDefined()
      const native = await sharp(new URL(`../assets/media${source.replace(/^\/media/, '')}`, import.meta.url).pathname).metadata()
      expect(native.width).toBeGreaterThan(177)
      expect(entry.variants[0].width).toBe(Math.min(480, native.width ?? 0))
      expect(entry.variants.every((variant) => variant.width <= Math.min(2560, native.width ?? 0))).toBe(true)
      expect(track.cover.endsWith('.webp')).toBe(true)
      for (const variant of entry.variants) {
        expect((await stat(new URL(`../../public${variant.webp}`, import.meta.url))).size).toBeGreaterThan(0)
        if (variant.width >= 960) expect(variant.avif).toBeDefined()
      }
    }
  })
})
