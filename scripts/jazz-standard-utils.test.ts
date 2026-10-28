import { describe, expect, it } from 'vitest'
import { classifyStandard, parseStandardFilename, standardTitleMismatch } from './jazz-standard-utils.mjs'

describe('standalone standard resources', () => {
  it('parses artists from mixed-width parentheses and preserves actual track titles', () => {
    expect(parseStandardFilename('All Of Me(龙登杰）.m4a')).toEqual({ title: 'All Of Me', artist: '龙登杰' })
    expect(parseStandardFilename('Donna Lee(Chet Baker,  René Thomas).mp3')).toEqual({ title: 'Donna Lee', artist: 'Chet Baker, René Thomas' })
    expect(parseStandardFilename('All Of Us(Paul Whiteman).mp3').title).toBe('All Of Us')
    expect(standardTitleMismatch('All Of Us', 'All Of Me')).toBe(true)
    expect(() => parseStandardFilename('unknown.mp3')).toThrow('Title/artist missing')
  })

  it('keeps theme shelves and adds only explicit initial performer tags', () => {
    expect(classifyStandard('Blue Bossa', 'Joe Henderson')).toEqual(['latin-and-bossa', 'hard-bop'])
    expect(classifyStandard('All Of Me', 'Ella Fitzgerald')).toEqual(['swing', 'vocal-jazz'])
    expect(classifyStandard('Donna Lee', 'Jaco Pastorius')).toEqual(['bebop', 'fusion'])
    expect(() => classifyStandard('Unknown', 'Unknown')).toThrow('editorial shelf')
  })
})
