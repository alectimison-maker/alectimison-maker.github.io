export type CoffeeArtwork =
  | 'hows-the-coffee'
  | 'round-to-coffee'
  | 'four-seasons'
  | 'the-room'
  | 'datum'
export type CoffeeImageSide = 'left' | 'right'

export interface CoffeeEditorialConfig {
  sequence: number
  imageSide: CoffeeImageSide
  artwork: CoffeeArtwork
  coverAlt: string
}

export const COFFEE_EDITORIAL_CONFIG = {
  'hows-the-coffee': {
    sequence: 1,
    imageSide: 'right',
    artwork: 'hows-the-coffee',
    coverAlt: "How's the coffee? 咖啡记录封面",
  },
  'round-to-coffee': {
    sequence: 2,
    imageSide: 'left',
    artwork: 'round-to-coffee',
    coverAlt: 'Round To Coffee：绿色玩偶与一杯咖啡',
  },
  'four-seasons': {
    sequence: 3,
    imageSide: 'right',
    artwork: 'four-seasons',
    coverAlt: '四序：木桌上的绿色特调、甜品与咖啡',
  },
  'the-room': {
    sequence: 4,
    imageSide: 'left',
    artwork: 'the-room',
    coverAlt: 'The Room：木杯中的 Off The Sunset 特调与黑胡椒饼干',
  },
  datum: {
    sequence: 5,
    imageSide: 'right',
    artwork: 'datum',
    coverAlt: 'Datum：窗边的重逢特调、小雏菊与咖啡介绍卡',
  },
} as const satisfies Record<string, CoffeeEditorialConfig>

export function getCoffeeEditorialConfig(postId: string): CoffeeEditorialConfig {
  const config = COFFEE_EDITORIAL_CONFIG[postId as keyof typeof COFFEE_EDITORIAL_CONFIG]

  if (!config) {
    throw new Error(
      `Coffee post "${postId}" has no approved editorial cover. `
      + 'Run the design-coffee-editorial-covers skill and obtain approval before publishing.',
    )
  }

  return config
}
