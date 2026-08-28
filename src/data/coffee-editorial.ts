export type CoffeeArtwork =
  | 'hows-the-coffee'
  | 'round-to-coffee'
  | 'four-seasons'
  | 'the-room'
  | 'datum'
  | 'golden-caffe'
  | 'dongbei-lingdan'
  | 'never-say-uncle'
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
  'golden-caffe': {
    sequence: 6,
    imageSide: 'left',
    artwork: 'golden-caffe',
    coverAlt: 'Golden caffe：绿鲤鱼与驴特调、雏菊与甜点',
  },
  'dongbei-lingdan': {
    sequence: 7,
    imageSide: 'right',
    artwork: 'dongbei-lingdan',
    coverAlt: '東北灵丹：黑芝麻维也纳与香芋维也纳',
  },
  'never-say-uncle': {
    sequence: 8,
    imageSide: 'left',
    artwork: 'never-say-uncle',
    coverAlt: 'Never Say Uncle：KenYa 咖啡与店内一景',
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
