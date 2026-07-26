import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const output = path.join(root, 'public', 'avatar.webp')
const fallback = path.join(root, 'images', 'alec.jpg')
const avatarUrl = 'https://avatars.githubusercontent.com/u/225559157?v=4'

await mkdir(path.dirname(output), { recursive: true })

let source
try {
  const response = await fetch(avatarUrl, { signal: AbortSignal.timeout(8_000) })
  if (!response.ok) throw new Error(`GitHub avatar returned ${response.status}`)
  source = Buffer.from(await response.arrayBuffer())
} catch (error) {
  source = await readFile(fallback)
  console.warn(`Avatar sync used the legacy fallback: ${error.message}`)
}

const optimized = await sharp(source)
  .rotate()
  .resize(384, 384, { fit: 'cover' })
  .webp({ quality: 86, effort: 5 })
  .toBuffer()

await writeFile(output, optimized)
console.log('Synced public/avatar.webp')
