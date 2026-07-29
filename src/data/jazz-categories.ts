export type JazzTrack = {
  id: string
  title: string
  artist?: string
  audio?: {
    src: string
    mimeType?: string
  }
}

export type JazzCategory = {
  slug: string
  title: string
  color: string
  ink: string
  fontFamily: string
  quote: string
  author: string
  work: string
  tracks?: JazzTrack[]
}

export const jazzCategories = [
  {
    slug: 'swing',
    title: 'Swing',
    color: '#c86354',
    ink: '#171713',
    fontFamily: '"Jazz Limelight"',
    quote: 'If music be the food of love, play on.',
    author: 'William Shakespeare',
    work: 'Twelfth Night',
  },
  {
    slug: 'bebop',
    title: 'Bebop',
    color: '#d5b83f',
    ink: '#171713',
    fontFamily: '"Jazz Bangers"',
    quote: 'Lightness for me goes with precision and determination.',
    author: 'Italo Calvino',
    work: 'Six Memos for the Next Millennium',
  },
  {
    slug: 'cool-jazz',
    title: 'Cool Jazz',
    color: '#8fa5a5',
    ink: '#171713',
    fontFamily: '"Jazz Gelasio"',
    quote: 'The excitement of beauty calls forth strong fellow feelings.',
    author: 'Yasunari Kawabata',
    work: 'Japan, the Beautiful and Myself',
  },
  {
    slug: 'hard-bop',
    title: 'Hard Bop',
    color: '#934943',
    ink: '#f2eadb',
    fontFamily: '"Jazz Luckiest Guy"',
    quote: 'Pain and suffering are always inevitable for a large intelligence and a deep heart.',
    author: 'Fyodor Dostoevsky',
    work: 'Crime and Punishment',
  },
  {
    slug: 'modal-jazz',
    title: 'Modal Jazz',
    color: '#6379ad',
    ink: '#f2eadb',
    fontFamily: '"Jazz Fascinate"',
    quote: 'Listen better!',
    author: 'Hermann Hesse',
    work: 'Siddhartha',
  },
  {
    slug: 'free-jazz',
    title: 'Free Jazz',
    color: '#80608d',
    ink: '#f2eadb',
    fontFamily: '"Jazz Kranky"',
    quote: 'Arrange whatever pieces come your way.',
    author: 'Virginia Woolf',
    work: 'A Writer’s Diary',
  },
  {
    slug: 'fusion',
    title: 'Fusion',
    color: '#557b68',
    ink: '#f2eadb',
    fontFamily: '"Jazz Asset"',
    quote: 'There’s no such thing as perfect writing, just like there’s no such thing as perfect despair.',
    author: 'Haruki Murakami',
    work: 'Hear the Wind Sing',
  },
  {
    slug: 'vocal-jazz',
    title: 'Vocal Jazz',
    color: '#b66d91',
    ink: '#171713',
    fontFamily: '"Jazz Felipa"',
    quote: 'All people at root are time optimists.',
    author: 'Fredrik Backman',
    work: 'A Man Called Ove',
  },
  {
    slug: 'latin-and-bossa',
    title: 'Latin & Bossa',
    color: '#c57e4e',
    ink: '#171713',
    fontFamily: '"Jazz Henny Penny"',
    quote: 'What matters in life is not what happens to you but what you remember and how you remember it.',
    author: 'Gabriel García Márquez',
    work: 'Living to Tell the Tale',
  },
  {
    slug: 'soul-jazz',
    title: 'Soul Jazz',
    color: '#a28b4d',
    ink: '#171713',
    fontFamily: '"Jazz Edu Hand"',
    quote: 'My soul is a hidden orchestra. I know myself only as a symphony.',
    author: 'Fernando Pessoa',
    work: 'The Book of Disquiet',
  },
  {
    slug: 'post-bop',
    title: 'Post-Bop',
    color: '#706d68',
    ink: '#f2eadb',
    fontFamily: '"Jazz Schoolbell"',
    quote: 'In the midst of winter, I found there was, within me, an invincible summer.',
    author: 'Albert Camus',
    work: 'Return to Tipasa',
  },
] as const satisfies readonly JazzCategory[]

export type JazzCategorySlug = (typeof jazzCategories)[number]['slug']

export const jazzCategoryPath = (slug: JazzCategorySlug) => `/jazz/${slug}/`
