import { describe, expect, it } from 'vitest'
import { estimateReadingMinutes, formatDate, SPACE_META } from './site'

describe('site utilities', () => {
  it('formats authored dates in UTC so deploy timezone cannot shift them', () => {
    expect(formatDate(new Date('2026-07-23T23:30:00-07:00'))).toBe('2026/07/24')
  })

  it('estimates mixed Chinese and English reading time', () => {
    expect(estimateReadingMinutes('短文')).toBe(1)
    expect(estimateReadingMinutes('字'.repeat(401))).toBe(2)
    expect(estimateReadingMinutes(Array.from({ length: 221 }, () => 'word').join(' '))).toBe(2)
  })

  it('keeps the five approved content spaces', () => {
    expect(Object.keys(SPACE_META)).toEqual(['article', 'nonsense', 'jazz', 'anime', 'coffee'])
  })
})
