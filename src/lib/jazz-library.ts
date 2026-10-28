import records from '../data/jazz.json'
import localAlbums from '../data/jazz-local.json'
import standards from '../data/jazz-standards.json'
import imageManifest from '../../public/image-manifest.json'
import type { JazzImageVariant, JazzItem, JazzQueueTrack } from '../data/jazz-types'
import { jazzCategories } from '../data/jazz-categories'

type ImageEntry = { variants?: JazzImageVariant[] }
const local = new Map(localAlbums.map((album) => [album.id, album]))

export const jazzItems: JazzItem[] = records.map((record) => {
  const imported = local.get(record.id)
  const key = decodeURI(record.cover).split('/').map(encodeURIComponent).join('/')
  const variants = (imageManifest as Record<string, ImageEntry>)[key]?.variants ?? []
  return { ...record, ...imported, genre: record.genre ?? imported?.tags[0], cover: variants.at(-1)?.webp ?? record.cover, coverVariants: variants }
}).sort((a, b) => a.order - b.order)

export const jazzStandards: JazzQueueTrack[] = standards.map((track): JazzQueueTrack => {
  const coverSource = 'coverSource' in track ? String(track.coverSource) : undefined
  const variants = coverSource ? (imageManifest as Record<string, ImageEntry>)[coverSource]?.variants ?? [] : []
  const fallback = variants.findLast((variant) => variant.width <= 1600) ?? variants.at(-1)
  return { ...track, kind: 'standard', coverSource, cover: fallback?.webp ?? track.cover, coverVariants: variants }
})
export const standardTrackCounts = Object.fromEntries(jazzCategories.map((category) => [
  category.slug, jazzStandards.filter((track) => track.categories.includes(category.slug)).length,
]))

export const jazzStandardItems: JazzItem[] = jazzStandards.map((track, index) => ({
  id: track.id, type: 'jazz', kind: 'standard', standard: track.standard,
  title: track.title, artist: track.artist, cover: track.cover, order: index,
  coverVariants: track.coverVariants,
  shelves: ['Standards', track.standard ?? track.title], categories: track.categories,
  tracks: [track],
  description: track.reviewNote ?? `${track.artist} · ${track.standard ?? track.title}`,
}))
