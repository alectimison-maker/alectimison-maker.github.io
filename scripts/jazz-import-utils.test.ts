import { describe, expect, it } from 'vitest'
import { m4aDuration, normalizeAlbumTitle, parseTrackFilename } from './jazz-import-utils.mjs'

describe('Jazzy resource import', () => {
  it('matches punctuation, case, and Unicode variants without confusing album titles', () => {
    expect(normalizeAlbumTitle("Moanin’")).toBe(normalizeAlbumTitle("MOANIN'"))
    expect(normalizeAlbumTitle('ＬＯＶＥ ALL SERVE ALL')).toBe(normalizeAlbumTitle('love all serve all'))
    expect(normalizeAlbumTitle('LOVE ALL COVER ALL')).not.toBe(normalizeAlbumTitle('LOVE ALL SERVE ALL'))
  })

  it('preserves numeric order and Japanese names across both source naming conventions', () => {
    expect(parseTrackFilename('01 So What.m4a')).toEqual({ number: 1, title: 'So What' })
    expect(parseTrackFilename('青春病（10）.m4a')).toEqual({ number: 10, title: '青春病' })
    expect(parseTrackFilename('ガーデン（06）.m4a')).toEqual({ number: 6, title: 'ガーデン' })
    expect(() => parseTrackFilename('unknown.m4a')).toThrow('Track number missing')
  })

  it.each([0, 1])('reads MP4 movie durations with version %s headers', (version) => {
    const header = Buffer.alloc(version === 1 ? 32 : 20)
    header[0] = version
    header.writeUInt32BE(1000, version === 1 ? 20 : 12)
    if (version === 1) header.writeBigUInt64BE(562991n, 24)
    else header.writeUInt32BE(562991, 16)
    const box = (type: string, data: Buffer) => {
      const prefix = Buffer.alloc(8)
      prefix.writeUInt32BE(data.length + 8)
      prefix.write(type, 4)
      return Buffer.concat([prefix, data])
    }
    expect(m4aDuration(box('moov', box('mvhd', header)))).toBe(562.991)
    expect(() => m4aDuration(Buffer.alloc(8))).toThrow('M4A movie duration header not found')
  })
})
