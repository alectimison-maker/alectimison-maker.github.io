import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { SlidingWindowLimiter, validateSubmission } from '../src/policy.mjs'

describe('runner policy', () => {
  it('expires events outside the sliding window', () => {
    const limiter = new SlidingWindowLimiter()
    limiter.add('ip', 0)
    assert.equal(limiter.count('ip', 1), 1)
    assert.equal(limiter.count('ip', 10 * 60_000 + 1), 0)
  })

  it('accepts only known language/module pairs with bounded code', () => {
    assert.equal(validateSubmission({ language: 'cpp', moduleId: 'mat', code: 'return;' }), undefined)
    assert.equal(validateSubmission({ language: 'python', moduleId: 'morphology', code: 'return image' }), undefined)
    assert.match(validateSubmission({ language: 'ruby', moduleId: 'mat', code: 'x' }), /语言/)
    assert.match(validateSubmission({ language: 'cpp', moduleId: 'mat', code: 'x'.repeat(70_000) }), /64 KiB/)
  })
})
