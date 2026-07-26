import { getCollection } from 'astro:content'
import sharp from 'sharp'

const palettes = {
  article: { background: '#f3eee2', text: '#101410', accent: '#ef3038' },
  nonsense: { background: '#04110d', text: '#d9fff3', accent: '#b7ff45' },
  jazz: { background: '#131612', text: '#f3eee2', accent: '#ff654d' },
  anime: { background: '#21409a', text: '#f7f0dd', accent: '#edff31' },
  coffee: { background: '#efe2ce', text: '#2d160e', accent: '#e05232' },
} as const

const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (character) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
})[character]!)

const wrap = (title: string) => {
  const limit = /[\u3400-\u9fff]/.test(title) ? 15 : 24
  const words = title.includes(' ') ? title.split(/\s+/) : [...title]
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = title.includes(' ') ? `${line}${line ? ' ' : ''}${word}` : `${line}${word}`
    if (next.length > limit && line) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines.slice(0, 3)
}

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => !data.draft)
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }))
}

export async function GET({ props }: { props: { post: Awaited<ReturnType<typeof getCollection<'posts'>>>[number] } }) {
  const { post } = props
  const palette = palettes[post.data.space]
  const lines = wrap(post.data.title)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
      <rect width="1200" height="630" fill="${palette.background}"/>
      <g stroke="${palette.accent}" opacity=".24">
        ${Array.from({ length: 13 }, (_, index) => `<line x1="${index * 100}" y1="0" x2="${index * 100}" y2="630"/>`).join('')}
        ${Array.from({ length: 7 }, (_, index) => `<line x1="0" y1="${index * 105}" x2="1200" y2="${index * 105}"/>`).join('')}
      </g>
      <text x="68" y="72" fill="${palette.accent}" font-family="monospace" font-size="18" font-weight="700" letter-spacing="3">${post.data.space.toUpperCase()} / ${post.data.date.getUTCFullYear()}</text>
      <text x="68" y="205" fill="${palette.text}" font-family="serif" font-size="82" font-weight="600">
        ${lines.map((line, index) => `<tspan x="68" dy="${index === 0 ? 0 : 94}">${escapeXml(line)}</tspan>`).join('')}
      </text>
      <line x1="68" y1="548" x2="1132" y2="548" stroke="${palette.accent}" stroke-width="3"/>
      <text x="68" y="590" fill="${palette.text}" font-family="monospace" font-size="18" letter-spacing="2">ALIOUSWE’S NONSENSE</text>
      <circle cx="1112" cy="582" r="9" fill="${palette.accent}"/>
    </svg>`
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' } })
}
