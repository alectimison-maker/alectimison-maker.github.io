import { describe, expect, it } from 'vitest'
import path from 'node:path'
import sharp from 'sharp'
import items from '../../data/anime.json'
import {
  arrangeAnimeItems,
  createAnimeCanvasLayout,
  type AnimeCanvasLayout,
  wrapCanvasOffset,
} from './anime-canvas-layout'

const arrangedItems = arrangeAnimeItems(await Promise.all(items.map(async (item) => {
  const source = path.join(
    process.cwd(),
    'src/assets/media',
    decodeURI(item.cover).replace(/^\/media\//, ''),
  )
  const image = await sharp(source).metadata()
  return {
    ...item,
    imageWidth: image.width ?? 3,
    imageHeight: image.height ?? 4,
  }
})))

const layouts = [
  createAnimeCanvasLayout(arrangedItems, 'desktop'),
  createAnimeCanvasLayout(arrangedItems, 'compact'),
]

const overlapWithGap = (
  layout: AnimeCanvasLayout,
  leftIndex: number,
  rightIndex: number,
  offsetX = 0,
  offsetY = 0,
) => {
  const left = layout.slots[leftIndex]
  const right = layout.slots[rightIndex]
  const leftInset = left.gap / 2
  const rightInset = right.gap / 2
  const horizontalOverlap = Math.min(
    left.x + left.width + leftInset,
    right.x + offsetX + right.width + rightInset,
  ) - Math.max(left.x - leftInset, right.x + offsetX - rightInset)
  const verticalOverlap = Math.min(
    left.y + left.height + leftInset,
    right.y + offsetY + right.height + rightInset,
  ) - Math.max(left.y - leftInset, right.y + offsetY - rightInset)
  return horizontalOverlap > .001 && verticalOverlap > .001
}

const distanceToCard = (
  x: number,
  y: number,
  layout: AnimeCanvasLayout,
  slotIndex: number,
) => {
  const slot = layout.slots[slotIndex]
  let closest = Number.POSITIVE_INFINITY
  for (const offsetX of [-layout.width, 0, layout.width]) {
    for (const offsetY of [-layout.height, 0, layout.height]) {
      const left = slot.x + offsetX
      const top = slot.y + offsetY
      const deltaX = Math.max(left - x, 0, x - (left + slot.width))
      const deltaY = Math.max(top - y, 0, y - (top + slot.height))
      closest = Math.min(closest, Math.hypot(deltaX, deltaY))
    }
  }
  return closest
}

describe('Anime infinite canvas layout', () => {
  it('uses every cover once in a stable, curated order', () => {
    expect(arrangedItems).toHaveLength(items.length)
    expect(new Set(arrangedItems.map((item) => item.id)).size).toBe(items.length)
    expect(arrangedItems.slice(0, 4).map((item) => item.id)).toEqual([
      '星际牛仔',
      'flcl',
      '蓝色巨人',
      'eva',
    ])
    expect(createAnimeCanvasLayout(arrangedItems, 'desktop')).toEqual(layouts[0])
  })

  it.each(layouts)('preserves every cover ratio inside the world', (layout) => {
    expect(layout.slots).toHaveLength(arrangedItems.length)
    layout.slots.forEach((slot, index) => {
      const item = arrangedItems[index]
      expect(slot.width / slot.height).toBeCloseTo(item.imageWidth / item.imageHeight, 8)
      expect(slot.x).toBeGreaterThanOrEqual(0)
      expect(slot.y).toBeGreaterThanOrEqual(0)
      expect(slot.x + slot.width).toBeLessThanOrEqual(layout.width)
      expect(slot.y + slot.height).toBeLessThanOrEqual(layout.height)
      expect(slot.gap).toBeGreaterThanOrEqual(36)
      expect(slot.gap).toBeLessThanOrEqual(52)
    })
    expect(new Set(layout.slots.map((slot) => slot.gap)).size).toBeGreaterThanOrEqual(4)
  })

  it.each(layouts)('keeps the required gap between every pair of covers', (layout) => {
    for (let left = 0; left < layout.slots.length; left += 1) {
      for (let right = left + 1; right < layout.slots.length; right += 1) {
        expect(overlapWithGap(layout, left, right)).toBe(false)
      }
    }
  })

  it.each(layouts)('keeps the required gap across every looping edge', (layout) => {
    const offsets = [-1, 0, 1]
    for (const horizontal of offsets) {
      for (const vertical of offsets) {
        if (horizontal === 0 && vertical === 0) continue
        for (let left = 0; left < layout.slots.length; left += 1) {
          for (let right = 0; right < layout.slots.length; right += 1) {
            expect(overlapWithGap(
              layout,
              left,
              right,
              horizontal * layout.width,
              vertical * layout.height,
            )).toBe(false)
          }
        }
      }
    }
  })

  it.each(layouts)('stays dense without a blank strip at the looping edge', (layout) => {
    const cardArea = layout.slots.reduce((total, slot) => total + slot.width * slot.height, 0)
    expect(cardArea / (layout.width * layout.height)).toBeGreaterThan(.6)

    const edgeGaps = [
      Math.min(...layout.slots.map((slot) => slot.x)),
      Math.min(...layout.slots.map((slot) => layout.width - slot.x - slot.width)),
      Math.min(...layout.slots.map((slot) => slot.y)),
      Math.min(...layout.slots.map((slot) => layout.height - slot.y - slot.height)),
    ]
    expect(Math.max(...edgeGaps)).toBeLessThanOrEqual(layout.maxGap / 2 + 1)

    let largestEmptyRadius = 0
    for (let x = 0; x < layout.width; x += 80) {
      for (let y = 0; y < layout.height; y += 80) {
        const nearestCard = Math.min(...layout.slots.map((_, index) => (
          distanceToCard(x, y, layout, index)
        )))
        largestEmptyRadius = Math.max(largestEmptyRadius, nearestCard)
      }
    }
    expect(largestEmptyRadius).toBeLessThan(245)
  })

  it('uses a smaller but still varied compact composition', () => {
    const [desktop, compact] = layouts
    expect(Math.max(...compact.slots.map((slot) => slot.width))).toBeLessThan(
      Math.max(...desktop.slots.map((slot) => slot.width)),
    )
    expect(new Set(desktop.slots.map((slot) => slot.width)).size).toBeGreaterThanOrEqual(8)
    expect(new Set(compact.slots.map((slot) => slot.width)).size).toBeGreaterThanOrEqual(8)
  })

  it.each(layouts)('staggers the four lead covers at distinct sizes and heights', (layout) => {
    const leadSlots = layout.slots.slice(0, 4)
    expect(new Set(leadSlots.map((slot) => slot.width)).size).toBe(4)
    expect(new Set(leadSlots.map((slot) => slot.y)).size).toBe(4)
  })

  it.each(['desktop', 'compact'] as const)('fills a gap for appended covers without moving existing ones', (mode) => {
    const current = createAnimeCanvasLayout(arrangedItems, mode)
    const withNewCover = createAnimeCanvasLayout([
      ...arrangedItems,
      {
        id: 'future-anime-cover',
        order: Math.max(...arrangedItems.map((item) => item.order)) + 1,
        imageWidth: 900,
        imageHeight: 1350,
      },
    ], mode)

    expect(withNewCover.slots.slice(0, current.slots.length)).toEqual(current.slots)
  })

  it('wraps camera offsets without exposing a canvas edge', () => {
    expect(wrapCanvasOffset(-50, 1000)).toBe(-50)
    expect(wrapCanvasOffset(50, 1000)).toBe(-950)
    expect(wrapCanvasOffset(-1050, 1000)).toBe(-50)
    expect(wrapCanvasOffset(1000, 1000)).toBe(0)
  })
})
