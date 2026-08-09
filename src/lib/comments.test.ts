import { describe, expect, it } from 'vitest'
import {
  COMMENT_MAX_LENGTH,
  COMMENT_PAGE_SIZE,
  commentKey,
  normalizeCommentServerUrl,
} from './comments'

describe('comment configuration', () => {
  it('uses a stable article id instead of the current URL', () => {
    expect(commentKey('round-to-coffee')).toBe('post:round-to-coffee')
    expect(commentKey(' 中文文章 ')).toBe('post:%E4%B8%AD%E6%96%87%E6%96%87%E7%AB%A0')
  })

  it('normalizes the Waline endpoint for client requests', () => {
    expect(normalizeCommentServerUrl(' https://comments.aliouswe.com/// ')).toBe('https://comments.aliouswe.com')
    expect(normalizeCommentServerUrl()).toBe('')
  })

  it('keeps the agreed display limits', () => {
    expect(COMMENT_PAGE_SIZE).toBe(10)
    expect(COMMENT_MAX_LENGTH).toBe(2_000)
  })
})
