import { describe, expect, it } from 'vitest'
import {
  canReuseImageSource,
  canReuseImageSourceFromPushDiff,
  shouldRegenerateImageVariants,
} from './image-pipeline-policy.mjs'

describe('incremental image pipeline policy', () => {
  it('reuses complete outputs when the source fingerprint matches', () => {
    expect(canReuseImageSource({
      previousHash: 'same',
      sourceHash: 'same',
      canBootstrapFingerprints: false,
      isMarkedChanged: true,
      outputsExist: true,
    })).toBe(true)
  })

  it('does not reuse changed or incomplete fingerprinted outputs', () => {
    expect(canReuseImageSource({
      previousHash: 'before',
      sourceHash: 'after',
      canBootstrapFingerprints: true,
      isMarkedChanged: false,
      outputsExist: true,
    })).toBe(false)
    expect(canReuseImageSource({
      previousHash: 'same',
      sourceHash: 'same',
      canBootstrapFingerprints: false,
      isMarkedChanged: false,
      outputsExist: false,
    })).toBe(false)
  })

  it('bootstraps legacy manifests only for paths absent from the push diff', () => {
    const base = {
      previousHash: undefined,
      sourceHash: 'current',
      canBootstrapFingerprints: true,
      outputsExist: true,
    }

    expect(canReuseImageSource({ ...base, isMarkedChanged: false })).toBe(true)
    expect(canReuseImageSource({ ...base, isMarkedChanged: true })).toBe(false)
  })

  it('reuses a complete fingerprinted entry when the push diff excludes it', () => {
    const base = {
      hasPreviousHash: true,
      hasPushDiff: true,
      outputsExist: true,
    }

    expect(canReuseImageSourceFromPushDiff({ ...base, isMarkedChanged: false })).toBe(true)
    expect(canReuseImageSourceFromPushDiff({ ...base, isMarkedChanged: true })).toBe(false)
    expect(canReuseImageSourceFromPushDiff({ ...base, hasPreviousHash: false, isMarkedChanged: false })).toBe(false)
    expect(canReuseImageSourceFromPushDiff({ ...base, outputsExist: false, isMarkedChanged: false })).toBe(false)
  })

  it('regenerates variants when an existing source is known to have changed', () => {
    expect(shouldRegenerateImageVariants({
      hasPreviousEntry: true,
      hashMatches: false,
      bootstrapMatches: false,
      isMarkedChanged: true,
    })).toBe(true)
  })
})
