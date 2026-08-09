export const COMMENT_PAGE_SIZE = 10
export const COMMENT_MAX_LENGTH = 2_000

export const normalizeCommentServerUrl = (value?: string): string =>
  value?.trim().replace(/\/+$/, '') ?? ''

export const commentKey = (postId: string): string => `post:${encodeURIComponent(postId.trim())}`
