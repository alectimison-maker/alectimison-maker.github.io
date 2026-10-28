import { normalizeAlbumTitle } from './jazz-import-utils.mjs'

// Editorial browsing shelves, not a claim that every arrangement has one style.
export const standardShelves = {
  'All Of Me': 'swing',
  'All The Things You Are': 'bebop',
  'Autumn Leaves': 'cool-jazz',
  'Blue Bossa': 'latin-and-bossa',
  'Donna Lee': 'bebop',
  'Fly Me To The Moon': 'swing',
  'Just The Two Of Us': 'soul-jazz',
  Misty: 'cool-jazz',
  'My Funny Valentine': 'cool-jazz',
  'Night And Day': 'swing',
  'Satin Doll': 'swing',
  'So What': 'modal-jazz',
  Summertime: 'post-bop',
  'Take The A Rain': 'swing',
  'There Will Never Be Another You': 'bebop',
}

export const parseStandardFilename = (filename) => {
  const stem = filename.replace(/\.[^.]+$/, '').normalize('NFKC')
  const match = stem.match(/^(.*?)\((.*)\)$/)
  if (!match || !match[1].trim() || !match[2].trim()) throw new Error(`Title/artist missing: ${filename}`)
  return { title: match[1].trim(), artist: match[2].trim().replace(/\s+/g, ' ') }
}

export const classifyStandard = (standard, artist) => {
  const shelf = standardShelves[standard]
  if (!shelf) throw new Error(`Add an editorial shelf for: ${standard}`)
  const categories = new Set([shelf])
  if (/Ella Fitzgerald|Billie Holiday|Frank Sinatra|Dinah Washington|Johnny Hartman|Sarah Vaughan|Diana Krall|Laufey|Nat King Cole|Tony Bennett|Lady Gaga|Julie London|Dianne Reeves|Johnny Mathis|Bobby McFerrin|Nina Simone|Stella Cole|Alma Cogan|Lorez Alexandria|Ana Caram|小野リサ|阿川泰子/i.test(artist)) categories.add('vocal-jazz')
  if (/Art Blakey|Jazz Messengers|Joe Henderson|Kenny Dorham|Dexter Gordon|Clifford Brown|Grant Green|Sonny Rollins|Ryo Fukui/i.test(artist)) categories.add('hard-bop')
  if (/Jaco Pastorius|Alain Caron|Jeff Lorber|Cory Henry|Toshiki Soejima|DJ Deckstream|Pandrezz/i.test(artist)) categories.add('fusion')
  return [...categories]
}

export const standardTitleMismatch = (title, standard) => normalizeAlbumTitle(title) !== normalizeAlbumTitle(standard)
