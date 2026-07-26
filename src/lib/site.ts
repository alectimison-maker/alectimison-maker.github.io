export const SITE = {
  name: 'Aliouswe’s Nonsense',
  description: '我用思考来感觉',
  origin: 'https://aliouswe.com',
  author: 'Aliouswe',
  github: 'https://github.com/alectimison-maker',
  email: 'alec.timison@gmail.com',
} as const

export const SPACE_META = {
  article: { label: 'ARTICLE', description: 'Technical notes, learning systems, and experiments.' },
  nonsense: { label: 'NONSENSE', description: 'Literature talk and stream-of-consciousness writing.' },
  jazz: { label: 'JAZZ', description: 'Midnight records, muted brass, and slow-burning grooves.' },
  anime: { label: 'ANIME', description: 'A visual board of what I am watching and remember.' },
  coffee: { label: 'COFFEE', description: 'Daily tasting records and home barista notes.' },
} as const

export type SpaceName = keyof typeof SPACE_META

export const formatDate = (date: Date): string => date.toLocaleDateString('zh-CN', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export const estimateReadingMinutes = (source = ''): number => {
  const plain = source
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/\s+/g, ' '))
    .replace(/<[^>]+>|[#>*_`[\]()!-]/g, ' ')
  const hanCount = (plain.match(/[\u3400-\u9fff]/g) ?? []).length
  const latinWordCount = (plain.replace(/[\u3400-\u9fff]/g, ' ').match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? []).length
  return Math.max(1, Math.ceil(hanCount / 400 + latinWordCount / 220))
}
