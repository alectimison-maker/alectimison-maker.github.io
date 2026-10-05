import { describe, expect, it } from 'vitest'
import { OPEN_CV_MODULES } from './modules'

describe('OpenCV tutorial modules', () => {
  it('provides the ordered exercises in both languages', () => {
    expect(Object.keys(OPEN_CV_MODULES)).toEqual(['mat', 'roi-resize', 'channels', 'filters', 'gaussian-params', 'threshold', 'morphology', 'contours', 'lightbars', 'pairing'])
    for (const module of Object.values(OPEN_CV_MODULES)) {
      expect(module.hints).toHaveLength(2)
      expect(module.cpp.template).toContain('TODO')
      expect(module.cpp.solution).not.toContain('TODO')
      expect(module.python.template).toContain('TODO')
      expect(module.python.solution).not.toContain('TODO')
    }
  })

  it('keeps the public function contract stable', () => {
    for (const module of Object.values(OPEN_CV_MODULES)) {
      expect(module.cpp.template).toContain('cv::Mat process(const cv::Mat& image)')
      expect(module.python.template).toContain('def process(image):')
    }
  })
})
