import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('avatar update policy', () => {
  it('never syncs the avatar during default development or build commands', async () => {
    const root = path.resolve(import.meta.dirname, '../..')
    const packageJson = JSON.parse(
      await readFile(path.join(root, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> }

    expect(packageJson.scripts.predev ?? '').not.toContain('sync:avatar')
    expect(packageJson.scripts.prebuild ?? '').not.toContain('sync:avatar')
  })
})
