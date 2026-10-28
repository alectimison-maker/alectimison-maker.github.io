import type { APIRoute } from 'astro'
import { jazzItems, jazzStandards } from '../../lib/jazz-library'
import { albumQueue } from '../../data/jazz-types'

export const prerender = true
export const GET: APIRoute = () => {
  const unique = new Map()
  for (const track of [...jazzItems.flatMap(albumQueue), ...jazzStandards]) {
    if (unique.has(track.audio.src)) continue
    const { coverVariants: _variants, artworks: _artworks, ...entry } = track
    unique.set(track.audio.src, entry)
  }
  return Response.json({ tracks: [...unique.values()] })
}
