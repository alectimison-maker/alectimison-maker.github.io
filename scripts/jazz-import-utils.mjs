// NFKC handles full-width track numbers and decomposed Japanese filenames.
export const normalizeAlbumTitle = (title) => title.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

export const parseTrackFilename = (filename) => {
  const stem = filename.replace(/\.[^.]+$/, '').normalize('NFKC')
  const suffix = stem.match(/^(.*?)\s*\((\d+)\)$/)
  const prefix = stem.match(/^(\d+)\s+(.+)$/)
  if (suffix) return { number: Number(suffix[2]), title: suffix[1].trim() }
  if (prefix) return { number: Number(prefix[1]), title: prefix[2].trim() }
  throw new Error(`Track number missing: ${filename}`)
}

// Read the standard MP4 movie header; no audio decoding or transcoding needed.
export const m4aDuration = (buffer) => {
  const find = (start, end) => {
    for (let offset = start; offset + 8 <= end;) {
      let size = buffer.readUInt32BE(offset)
      const type = buffer.toString('ascii', offset + 4, offset + 8)
      let header = 8
      if (size === 1) { size = Number(buffer.readBigUInt64BE(offset + 8)); header = 16 }
      if (size === 0) size = end - offset
      if (size < header || offset + size > end) break
      const payload = offset + header
      if (type === 'moov') return find(payload, offset + size)
      if (type === 'mvhd') {
        const version = buffer[payload]
        const scale = buffer.readUInt32BE(payload + (version === 1 ? 20 : 12))
        const ticks = version === 1 ? Number(buffer.readBigUInt64BE(payload + 24)) : buffer.readUInt32BE(payload + 16)
        if (scale) return ticks / scale
      }
      offset += size
    }
    throw new Error('M4A movie duration header not found')
  }
  return find(0, buffer.length)
}
