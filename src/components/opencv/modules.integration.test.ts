import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { DockerExecutor } from '../../../opencv-runner/src/runtime.mjs'
import { OPEN_CV_MODULES } from './modules'

const runDockerTests = process.env.OPENCV_DOCKER_INTEGRATION === 'true'

const countColorComponents = async (resultPath: string, color: [number, number, number]) => {
  const { data, info } = await sharp(resultPath).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const mask = new Uint8Array(info.width * info.height)
  for (let index = 0; index < mask.length; index += 1) {
    const offset = index * 3
    if (data[offset] === color[0] && data[offset + 1] === color[1] && data[offset + 2] === color[2]) mask[index] = 1
  }
  let components = 0
  const stack: number[] = []
  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] !== 1) continue
    components += 1
    mask[start] = 2
    stack.push(start)
    while (stack.length > 0) {
      const current = stack.pop()!
      const x = current % info.width
      for (const next of [current - info.width, current + info.width, current - 1, current + 1]) {
        if (next < 0 || next >= mask.length || mask[next] !== 1) continue
        if ((next === current - 1 && x === 0) || (next === current + 1 && x === info.width - 1)) continue
        mask[next] = 2
        stack.push(next)
      }
    }
  }
  return components
}

describe.skipIf(!runDockerTests)('OpenCV tutorial Docker integration', () => {
  it('runs every reference solution and all filter choices in both languages', async () => {
    const executor = new DockerExecutor({
      image: process.env.OPENCV_RUNNER_IMAGE ?? 'aliouswe/opencv-runner:4.5.4',
      inputImage: path.resolve('src/assets/media/images/opencv/armor-field.jpg'),
    })

    for (const module of Object.values(OPEN_CV_MODULES)) {
      for (const language of ['cpp', 'python'] as const) {
        const variants = module.id === 'filters'
          ? ['mean', 'gaussian', 'median', 'bilateral'].map((filter) => ({
              name: filter,
              code: language === 'cpp'
                ? module.cpp.solution.replace(
                    'constexpr FilterType filterType = FilterType::Gaussian;',
                    `constexpr FilterType filterType = FilterType::${filter[0].toUpperCase()}${filter.slice(1)};`,
                  )
                : module.python.solution.replace('filter_type = "gaussian"', `filter_type = "${filter}"`),
            }))
          : [{ name: 'solution', code: module[language].solution }]

        for (const variant of variants) {
          const result = await executor.execute(
            {
              id: `${module.id}-${language}-${variant.name}-${process.pid}`,
              moduleId: module.id,
              language,
              code: variant.code,
            },
            { signal: undefined, onState: () => undefined },
          )
          try {
            expect(result.status, `${module.id}/${language}/${variant.name}: ${result.diagnostics || result.stderr}`).toBe('succeeded')
            const expectedSize = module.id === 'roi-resize' ? '640 × 384' : '1280 × 768'
            expect(result.stdout).toContain(`process returned ${expectedSize}`)
            if (module.id === 'lightbars' || module.id === 'pairing') {
              if (!result.resultPath) throw new Error(`${module.id}/${language} did not produce an image`)
              if (module.id === 'lightbars') {
                expect(await countColorComponents(result.resultPath, [255, 0, 0])).toBe(2)
                expect(await countColorComponents(result.resultPath, [0, 0, 255])).toBe(2)
              } else {
                expect(await countColorComponents(result.resultPath, [0, 255, 0])).toBe(2)
              }
            }
          } finally {
            await executor.cleanup(result.directory)
          }
        }
      }
    }
  }, 30_000)
})
