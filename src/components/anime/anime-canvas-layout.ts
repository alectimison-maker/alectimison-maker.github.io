export type AnimeCanvasMode = 'desktop' | 'compact'

export interface AnimeLayoutItem {
  id: string
  order: number
  imageWidth: number
  imageHeight: number
}

export interface AnimeCanvasSlot {
  x: number
  y: number
  width: number
  height: number
  gap: number
}

export interface AnimeCanvasLayout {
  width: number
  height: number
  minGap: number
  maxGap: number
  slots: AnimeCanvasSlot[]
}

interface PackingBox {
  itemIndex: number
  id: string
  width: number
  height: number
  gap: number
  x: number
  y: number
}

interface PackingSpace {
  x: number
  y: number
  width: number
  height: number
}

interface Point {
  x: number
  y: number
}

const spotlightIds = [
  '星际牛仔',
  'flcl',
  '蓝色巨人',
  'eva',
  '葬送的芙莉莲-第二季',
  '赛博朋克-边缘行者',
  '终将成为你',
  '无头骑士异闻录',
  '进击的巨人',
  '异国日记',
  '春物-第二季',
  'jojo的奇妙冒险-黄金之风',
] as const

const spotlightSet = new Set<string>(spotlightIds)
const leadSpotlightSet = new Set<string>(spotlightIds.slice(0, 4))

const layoutConfig = {
  desktop: {
    gaps: [36, 40, 44, 48, 52],
    packingWidth: 4000,
    spotlightWidths: [360, 388, 416],
    leadSpotlightWidths: [440, 360, 416, 388],
    leadSpotlightYOffsets: [96, 0, 144, 48],
    regularWidths: [240, 266, 292, 318],
    fillerWidths: [150, 170, 190, 210],
    packingHeight: 12000,
  },
  compact: {
    gaps: [36, 40, 44, 48, 52],
    packingWidth: 2900,
    spotlightWidths: [270, 288, 306],
    leadSpotlightWidths: [320, 270, 306, 288],
    leadSpotlightYOffsets: [64, 0, 96, 32],
    regularWidths: [178, 196, 214, 232],
    fillerWidths: [132, 144, 156, 168],
    packingHeight: 9000,
  },
} as const

const stableHash = (value: string) => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const cardWidth = (id: string, mode: AnimeCanvasMode) => {
  const config = layoutConfig[mode]
  const leadIndex = spotlightIds.findIndex((candidate) => candidate === id)
  if (leadIndex >= 0 && leadIndex < 4) return config.leadSpotlightWidths[leadIndex]

  const hash = stableHash(id)
  if (spotlightSet.has(id)) {
    return config.spotlightWidths[hash % config.spotlightWidths.length]
  }

  const widths = hash % 5 < 2 ? config.fillerWidths : config.regularWidths
  return widths[hash % widths.length]
}

const cardGap = (id: string, mode: AnimeCanvasMode) => {
  const gaps = layoutConfig[mode].gaps
  return gaps[stableHash(`${mode}:${id}:gap`) % gaps.length]
}

const intersects = (left: PackingSpace, right: PackingSpace) => (
  left.x < right.x + right.width
  && left.x + left.width > right.x
  && left.y < right.y + right.height
  && left.y + left.height > right.y
)

const contains = (outer: PackingSpace, inner: PackingSpace) => (
  inner.x >= outer.x
  && inner.y >= outer.y
  && inner.x + inner.width <= outer.x + outer.width
  && inner.y + inner.height <= outer.y + outer.height
)

const occupySpace = (spaces: PackingSpace[], used: PackingSpace) => {
  const additions: PackingSpace[] = []
  for (let index = spaces.length - 1; index >= 0; index -= 1) {
    const space = spaces[index]
    if (!intersects(space, used)) continue
    spaces.splice(index, 1)

    if (used.x > space.x) {
      additions.push({ ...space, width: used.x - space.x })
    }
    if (used.x + used.width < space.x + space.width) {
      additions.push({
        ...space,
        x: used.x + used.width,
        width: space.x + space.width - used.x - used.width,
      })
    }
    if (used.y > space.y) {
      additions.push({ ...space, height: used.y - space.y })
    }
    if (used.y + used.height < space.y + space.height) {
      additions.push({
        ...space,
        y: used.y + used.height,
        height: space.y + space.height - used.y - used.height,
      })
    }
  }
  spaces.push(...additions.filter((space) => space.width > 0 && space.height > 0))

  for (let left = spaces.length - 1; left >= 0; left -= 1) {
    for (let right = spaces.length - 1; right >= 0; right -= 1) {
      if (left === right || !contains(spaces[right], spaces[left])) continue
      spaces.splice(left, 1)
      break
    }
  }
}

const anchorPoint = (
  anchorIndex: number,
  boxes: PackingBox[],
  mode: AnimeCanvasMode,
): Point => {
  const leadWidth = boxes.slice(0, anchorIndex).reduce((total, candidate) => total + candidate.width, 0)
  return { x: leadWidth, y: layoutConfig[mode].leadSpotlightYOffsets[anchorIndex] }
}

const packBoxes = (sourceBoxes: PackingBox[], width: number, height: number, mode: AnimeCanvasMode) => {
  const boxes = sourceBoxes.map((box) => ({ ...box, x: 0, y: 0 }))
  const spaces: PackingSpace[] = [{ x: 0, y: 0, width, height }]
  const anchored = boxes.filter((box) => leadSpotlightSet.has(box.id))

  for (let index = 0; index < anchored.length; index += 1) {
    const box = anchored[index]
    const point = anchorPoint(index, anchored, mode)
    const used = { x: point.x, y: point.y, width: box.width, height: box.height }
    if (
      used.x < 0
      || used.y < 0
      || used.x + used.width > width
      || used.y + used.height > height
      || anchored.slice(0, index).some((candidate) => intersects(candidate, used))
    ) return undefined
    box.x = used.x
    box.y = used.y
    occupySpace(spaces, used)
  }

  const remainder = boxes
    .filter((box) => !leadSpotlightSet.has(box.id))
    .sort((left, right) => left.itemIndex - right.itemIndex)

  for (const box of remainder) {
    let best: { x: number; y: number; shortSide: number; longSide: number } | undefined
    for (const space of spaces) {
      if (box.width > space.width || box.height > space.height) continue
      const remainingX = space.width - box.width
      const remainingY = space.height - box.height
      const candidate = {
        x: space.x,
        y: space.y,
        shortSide: Math.min(remainingX, remainingY),
        longSide: Math.max(remainingX, remainingY),
      }
      if (
        !best
        || candidate.y < best.y
        || (candidate.y === best.y && candidate.shortSide < best.shortSide)
        || (candidate.y === best.y && candidate.shortSide === best.shortSide && candidate.longSide < best.longSide)
        || (
          candidate.y === best.y
          && candidate.shortSide === best.shortSide
          && candidate.longSide === best.longSide
          && candidate.x < best.x
        )
      ) best = candidate
    }
    if (!best) return undefined
    box.x = best.x
    box.y = best.y
    occupySpace(spaces, box)
  }

  return boxes
}

export const createAnimeCanvasLayout = (
  items: AnimeLayoutItem[],
  mode: AnimeCanvasMode,
): AnimeCanvasLayout => {
  const config = layoutConfig[mode]
  const boxes = items.map((item, itemIndex) => {
    const width = cardWidth(item.id, mode)
    const gap = cardGap(item.id, mode)
    const aspectRatio = item.imageWidth > 0 && item.imageHeight > 0
      ? item.imageWidth / item.imageHeight
      : 3 / 4
    const height = width / aspectRatio
    return {
      itemIndex,
      id: item.id,
      width: width + gap,
      height: height + gap,
      gap,
      x: 0,
      y: 0,
    }
  })

  const minGap = Math.min(...config.gaps)
  const maxGap = Math.max(...config.gaps)
  if (boxes.length === 0) return { width: 1, height: 1, minGap, maxGap, slots: [] }

  let packingHeight = config.packingHeight
  let packed = packBoxes(boxes, config.packingWidth, packingHeight, mode)
  while (!packed) {
    packingHeight *= 2
    packed = packBoxes(boxes, config.packingWidth, packingHeight, mode)
  }

  const width = Math.ceil(Math.max(...packed.map((box) => box.x + box.width)))
  const height = Math.ceil(Math.max(...packed.map((box) => box.y + box.height)))
  const slots = Array.from<AnimeCanvasSlot>({ length: items.length })

  for (const box of packed) {
    const inset = box.gap / 2
    slots[box.itemIndex] = {
      x: box.x + inset,
      y: box.y + inset,
      width: box.width - box.gap,
      height: box.height - box.gap,
      gap: box.gap,
    }
  }

  return { width, height, minGap, maxGap, slots }
}

export const arrangeAnimeItems = <T extends { id: string; order: number }>(items: T[]) => {
  const byId = new Map(items.map((item) => [item.id, item]))
  const spotlights = spotlightIds.flatMap((id) => {
    const item = byId.get(id)
    return item ? [item] : []
  })
  const arrangedSpotlights = new Set(spotlights.map((item) => item.id))
  const remainder = items
    .filter((item) => !arrangedSpotlights.has(item.id))
    .sort((left, right) => left.order - right.order)
  return [...spotlights, ...remainder]
}

export const wrapCanvasOffset = (offset: number, size: number) => {
  const remainder = offset % size
  return remainder > 0 ? remainder - size : remainder
}
