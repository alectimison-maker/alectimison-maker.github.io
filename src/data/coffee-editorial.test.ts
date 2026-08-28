import { describe, expect, it } from 'vitest'
import { COFFEE_EDITORIAL_CONFIG, getCoffeeEditorialConfig } from './coffee-editorial'

describe('coffee editorial cards', () => {
  it('keeps a stable chronological left-right alternation', () => {
    const ordered = Object.values(COFFEE_EDITORIAL_CONFIG)
      .sort((a, b) => a.sequence - b.sequence)

    expect(ordered.map((card) => card.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(ordered.map((card) => card.imageSide)).toEqual([
      'right', 'left', 'right', 'left', 'right', 'left', 'right', 'left',
    ])
  })

  it('blocks publishing an unapproved Coffee cover', () => {
    expect(() => getCoffeeEditorialConfig('not-yet-approved')).toThrow(
      'has no approved editorial cover',
    )
  })
})
