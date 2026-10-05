import { createHash } from 'node:crypto'
import { access, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const sourceKey = '/media/images/opencv/armor-field.jpg'
const sourcePath = path.join(root, 'src/assets/media/images/opencv/armor-field.jpg')
const variantPath = path.join(root, 'public/media/images/opencv/armor-field.w1280.webp')
const manifestPath = path.join(root, 'public/image-manifest.json')
const lockPath = path.join(root, 'src/assets/media/images/opencv/armor-field.webp.sha256')
const shouldWriteLock = process.argv.includes('--write-lock')

const fail = (message) => {
  console.error(`OpenCV asset validation failed: ${message}`)
  process.exit(1)
}

try {
  await access(sourcePath)
  await access(variantPath)
} catch {
  fail('请先加入 armor-field.jpg 并运行 npm run optimize:images。')
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const entry = manifest[sourceKey]
if (!entry) fail(`图片清单缺少 ${sourceKey}。`)
if (entry.width !== 1280 || entry.height !== 768) fail(`原图必须是 1280 × 768，当前为 ${entry.width} × ${entry.height}。`)
if (!entry.variants?.some((variant) => variant.width === 1280 && variant.webp === '/media/images/opencv/armor-field.w1280.webp')) {
  fail('图片清单缺少固定的 1280px WebP 变体。')
}

const digest = createHash('sha256').update(await readFile(variantPath)).digest('hex')
if (shouldWriteLock) {
  await writeFile(lockPath, `${digest}\n`)
  console.log(`Locked OpenCV sandbox image: ${digest}`)
  process.exit(0)
}

let expected
try {
  expected = (await readFile(lockPath, 'utf8')).trim()
} catch {
  fail('缺少 WebP 哈希锁；确认原图后运行 npm run lock:opencv-asset。')
}
if (digest !== expected) fail('固定 WebP 的 SHA-256 与锁文件不一致；请检查图片或 Sharp 配置是否发生变化。')
console.log(`Validated OpenCV sandbox image: 1280 × 768, sha256 ${digest}`)
