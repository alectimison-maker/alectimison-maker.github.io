export const MODULE_IDS = new Set(['mat', 'roi-resize', 'channels', 'filters', 'gaussian-params', 'threshold', 'morphology', 'contours', 'lightbars', 'pairing'])
export const LANGUAGES = new Set(['cpp', 'python'])

export const LIMITS = Object.freeze({
  bodyBytes: 256 * 1024,
  codeBytes: 64 * 1024,
  outputBytes: 64 * 1024,
  compileMs: 10_000,
  runMs: 3_000,
  totalMs: 15_000,
  resultTtlMs: 10 * 60_000,
  rateWindowMs: 10 * 60_000,
  challengeAfter: 10,
  hardRateLimit: 20,
  ipConcurrency: 2,
  sessionConcurrency: 1,
})

export class SlidingWindowLimiter {
  #entries = new Map()

  count(key, now = Date.now()) {
    const cutoff = now - LIMITS.rateWindowMs
    const current = (this.#entries.get(key) ?? []).filter((value) => value > cutoff)
    this.#entries.set(key, current)
    return current.length
  }

  add(key, now = Date.now()) {
    const count = this.count(key, now)
    this.#entries.get(key).push(now)
    return count + 1
  }
}

export function validateSubmission(body) {
  if (!body || typeof body !== 'object') return '请求体必须是 JSON 对象。'
  if (!LANGUAGES.has(body.language)) return '不支持的运行语言。'
  if (!MODULE_IDS.has(body.moduleId)) return '未知实验模块。'
  if (typeof body.code !== 'string' || !body.code.trim()) return '代码不能为空。'
  if (Buffer.byteLength(body.code) > LIMITS.codeBytes) return '代码超过 64 KiB 限制。'
  return undefined
}
