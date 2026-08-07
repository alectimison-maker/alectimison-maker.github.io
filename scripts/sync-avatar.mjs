import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const output = path.join(root, 'public', 'avatar.webp')
const avatarUrl = 'https://avatars.githubusercontent.com/u/225559157?v=4'

await mkdir(path.dirname(output), { recursive: true })

let response
try {
  response = await fetch(avatarUrl, { signal: AbortSignal.timeout(8_000) })
} catch (error) {
  throw new Error(`Avatar sync failed; existing avatar preserved: ${error.message}`, {
    cause: error,
  })
}

if (!response.ok) {
  throw new Error(
    `Avatar sync failed; existing avatar preserved: GitHub returned ${response.status}`,
  )
}

const source = Buffer.from(await response.arrayBuffer())

const optimized = await sharp(source)
  .rotate()
  .resize(384, 384, { fit: 'cover' })
  .webp({ quality: 86, effort: 5 })
  .toBuffer()

await writeFile(output, optimized)
console.log('Synced public/avatar.webp')
