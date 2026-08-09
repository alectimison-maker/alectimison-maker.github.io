export const ANIME_WORLD_WIDTH = 4400
export const ANIME_WORLD_HEIGHT = 3600

const HORIZONTAL_DENSITY = .78
const VERTICAL_DENSITY = .72

export interface AnimeCanvasSlot {
  x: number
  y: number
  width: number
}

const curatedRows: Array<{ y: number; cards: Array<[x: number, yOffset: number, width: number]> }> = [
  {
    y: 100,
    cards: [
      [80, 0, 380], [560, 180, 170], [930, 40, 250], [1380, 240, 150],
      [1700, 10, 320], [2200, 150, 210], [2620, -10, 400], [3190, 210, 180],
      [3550, 60, 270], [4020, 260, 160], [4360, 20, 360], [4930, 170, 220],
    ],
  },
  {
    y: 700,
    cards: [
      [120, 160, 190], [480, -40, 330], [1010, 220, 160], [1320, 30, 420],
      [1940, 180, 210], [2330, -70, 280], [2780, 210, 170], [3090, 0, 350],
      [3650, 170, 230], [4070, -50, 300], [4540, 220, 150], [4850, 30, 410],
    ],
  },
  {
    y: 1300,
    cards: [
      [40, 20, 300], [520, 240, 160], [840, -80, 390], [1430, 150, 200],
      [1800, -20, 270], [2250, 230, 180], [2580, 50, 430], [3220, 200, 160],
      [3540, -40, 320], [4040, 170, 220], [4450, 0, 380], [5010, 240, 170],
    ],
  },
  {
    y: 1900,
    cards: [
      [180, 190, 170], [510, -60, 420], [1130, 220, 210], [1500, 20, 290],
      [1980, 180, 150], [2310, -30, 370], [2860, 230, 190], [3200, 40, 260],
      [3640, 180, 410], [4260, -50, 180], [4580, 210, 270], [5050, 20, 320],
    ],
  },
  {
    y: 2500,
    cards: [
      [30, -20, 400], [610, 210, 180], [950, 40, 260], [1400, 230, 160],
      [1720, -50, 350], [2240, 180, 210], [2620, 10, 300], [3100, 250, 170],
      [3440, 40, 390], [4030, 200, 190], [4380, -60, 280], [4840, 140, 420],
    ],
  },
  {
    y: 3100,
    cards: [
      [140, 180, 220], [530, -40, 310], [1010, 230, 150], [1310, 10, 380],
      [1870, 170, 190], [2220, -70, 420], [2820, 210, 160], [3150, 20, 290],
      [3610, 180, 230], [4020, -40, 360], [4570, 230, 170], [4900, 10, 300],
    ],
  },
  {
    y: 3700,
    cards: [
      [40, 20, 340], [560, 190, 160], [870, -60, 430], [1490, 170, 190],
      [1850, 10, 300], [2330, 230, 150], [2640, -40, 380], [3210, 180, 220],
      [3600, 0, 280], [4070, 230, 170], [4410, -50, 410], [5010, 160, 190],
    ],
  },
]

export const ANIME_CANVAS_SLOTS: AnimeCanvasSlot[] = curatedRows.flatMap((row) => (
  row.cards.map(([x, yOffset, width]) => ({
    x: Math.round(x * HORIZONTAL_DENSITY),
    y: Math.round((row.y + yOffset) * VERTICAL_DENSITY),
    width,
  }))
))

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
]

export const arrangeAnimeItems = <T extends { id: string; order: number }>(items: T[]) => {
  const byId = new Map(items.map((item) => [item.id, item]))
  const spotlights = spotlightIds.flatMap((id) => {
    const item = byId.get(id)
    return item ? [item] : []
  })
  const spotlightSet = new Set(spotlights.map((item) => item.id))
  const remainder = items
    .filter((item) => !spotlightSet.has(item.id))
    .sort((left, right) => (left.order * 31 % 997) - (right.order * 31 % 997))
  return [...spotlights, ...remainder]
}

export const wrapCanvasOffset = (offset: number, size: number) => {
  const remainder = offset % size
  return remainder > 0 ? remainder - size : remainder
}
