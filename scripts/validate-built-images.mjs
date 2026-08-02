import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import * as cheerio from 'cheerio'

const root = path.resolve(import.meta.dirname, '..')
const distRoot = path.join(root, 'dist')

const fail = (message) => {
  console.error(`Built image validation failed: ${message}`)
  process.exitCode = 1
}

const walk = async (directory) => {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(target))
    else files.push(target)
  }
  return files
}

const localUrls = (value, isSrcset = false) => {
  if (!value) return []
  const candidates = isSrcset
    ? value.split(',').map((candidate) => candidate.trim().split(/\s+/)[0])
    : [value]
  return candidates.filter((candidate) => candidate.startsWith('/'))
}

const htmlFiles = (await walk(distRoot)).filter((file) => file.endsWith('.html'))
let checked = 0

for (const htmlFile of htmlFiles) {
  const $ = cheerio.load(await readFile(htmlFile, 'utf8'))
  const elements = $('img[src], img[srcset], img[data-src], source[srcset]').toArray()
  for (const element of elements) {
    for (const attribute of ['src', 'srcset', 'data-src']) {
      for (const url of localUrls($(element).attr(attribute), attribute === 'srcset')) {
        const pathname = decodeURI(url.split(/[?#]/)[0])
        checked += 1
        try {
          await access(path.join(distRoot, pathname))
        } catch {
          fail(`${path.relative(distRoot, htmlFile)} references missing image ${url}`)
        }
      }
    }
  }
}

if (!process.exitCode) {
  console.log(`Validated ${checked} local image references across ${htmlFiles.length} built pages.`)
}
