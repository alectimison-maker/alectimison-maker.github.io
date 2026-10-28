export type JazzImageVariant = { width: number; webp: string; avif?: string }

export type JazzLocalTrack = {
  id: string
  number: number
  title: string
  duration: number
  categories: string[]
  audio: { src: string; mimeType: string }
}

export type JazzItem = {
  id: string
  type: string
  title: string
  cover: string
  shelves: string[]
  order: number
  featured?: boolean
  artist?: string
  year?: number
  genre?: string
  categories?: string[]
  note?: string
  tracks?: JazzLocalTrack[]
  artworks?: string[]
  tags?: string[]
  description?: string
  kind?: 'standard'
  standard?: string
  coverVariants?: JazzImageVariant[]
}

export type JazzQueueTrack = JazzLocalTrack & {
  albumId?: string
  albumTitle: string
  artist: string
  cover: string
  kind?: 'standard'
  coverSource?: string
  coverVariants?: JazzImageVariant[]
  standard?: string
  thumbnail?: string
  artworks?: string[]
  reviewNote?: string
}

export const jazzAlbumPath = (id: string) => `/jazz/albums/${id}/`
export const jazzStandardPath = (id: string) => `/jazz/standards/${id}/`
export const albumQueue = (album: JazzItem): JazzQueueTrack[] => (album.tracks ?? []).map((track) => ({
  ...track, albumId: album.kind === 'standard' ? undefined : album.id,
  kind: album.kind, standard: album.standard,
  albumTitle: album.kind === 'standard' ? `${album.standard} · 标准曲演绎` : album.title,
  artist: album.artist ?? '', cover: album.cover,
  coverVariants: album.coverVariants, thumbnail: album.coverVariants?.[0]?.webp ?? album.cover,
}))
export const formatTrackTime = (seconds: number) => {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
