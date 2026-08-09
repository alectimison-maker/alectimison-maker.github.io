import { describe, expect, it } from 'vitest'
import items from '../../data/anime.json'
import {
  ANIME_CANVAS_SLOTS,
  ANIME_WORLD_HEIGHT,
  ANIME_WORLD_WIDTH,
  arrangeAnimeItems,
  wrapCanvasOffset,
} from './anime-canvas-layout'

describe('Anime infinite canvas layout', () => {
  it('provides a deliberate multi-scale slot for every cover', () => {
    expect(ANIME_CANVAS_SLOTS.length).toBeGreaterThanOrEqual(items.length)
    expect(new Set(ANIME_CANVAS_SLOTS.map((slot) => slot.width)).size).toBeGreaterThanOrEqual(4)
    expect(ANIME_CANVAS_SLOTS.every((slot) => (
      slot.x >= 0
      && slot.x < ANIME_WORLD_WIDTH
      && slot.y >= 0
      && slot.y < ANIME_WORLD_HEIGHT
    ))).toBe(true)
  })

  it('keeps the collage dense enough to avoid broad empty zones', () => {
    const slotsPerMillionPixels = (
      ANIME_CANVAS_SLOTS.length
      / (ANIME_WORLD_WIDTH * ANIME_WORLD_HEIGHT)
      * 1_000_000
    )

    expect(slotsPerMillionPixels).toBeGreaterThan(5)
  })

  it('curates all covers exactly once instead of randomly placing them', () => {
    const arranged = arrangeAnimeItems(items)
    expect(arranged).toHaveLength(items.length)
    expect(new Set(arranged.map((item) => item.id)).size).toBe(items.length)
    expect(arranged.slice(0, 4).map((item) => item.id)).toEqual([
      '星际牛仔',
      'flcl',
      '蓝色巨人',
      'eva',
    ])
  })

  it('wraps camera offsets without exposing a canvas edge', () => {
    expect(wrapCanvasOffset(-50, 1000)).toBe(-50)
    expect(wrapCanvasOffset(50, 1000)).toBe(-950)
    expect(wrapCanvasOffset(-1050, 1000)).toBe(-50)
    expect(wrapCanvasOffset(1000, 1000)).toBe(0)
  })
})
