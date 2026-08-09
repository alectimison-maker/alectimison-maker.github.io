import { describe, expect, it } from 'vitest'
import items from './anime.json'
import details from './anime-details.json'

describe('Anime detail excerpts', () => {
  it('provides one attributed philosophical excerpt for every cover', () => {
    expect(Object.keys(details).sort()).toEqual(items.map((item) => item.id).sort())
    for (const detail of Object.values(details)) {
      expect(detail.character.trim().length).toBeGreaterThan(0)
      expect(detail.quote.trim().length).toBeGreaterThan(6)
      expect(detail.quote.length).toBeLessThan(72)
    }
  })
})
