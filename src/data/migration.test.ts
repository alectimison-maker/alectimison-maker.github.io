import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import manifest from './migration-manifest.json'

describe('legacy migration manifest', () => {
  it('accounts for every approved source record', () => {
    expect(manifest.sourceCounts).toEqual({
      posts: 8,
      jazz: 9,
      anime: 83,
      coffee: 6,
      media: 249,
      collectionSourcePages: 2,
    })
  })

  it('retains authored dates separately from publication timestamps', async () => {
    const source = await readFile(new URL('../content/posts/hows-the-coffee.mdx', import.meta.url), 'utf8')
    expect(source).toContain('date: "2026-05-25"')
    expect(source).toContain('publishedAt:')
  })
})
