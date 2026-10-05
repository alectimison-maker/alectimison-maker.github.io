import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { LIMITS, SlidingWindowLimiter, validateSubmission } from './policy.mjs'

const json = (response, status, body, headers = {}) => {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers })
  response.end(JSON.stringify(body))
}

const publicJob = (job, jobs) => ({
  jobId: job.id,
  status: job.status,
  queuePosition: job.status === 'queued'
    ? Math.max(0, jobs.filter((candidate) => candidate.status === 'queued').indexOf(job))
    : 0,
  stdout: job.stdout ?? '',
  stderr: job.stderr ?? '',
  diagnostics: job.diagnostics ?? '',
  durationMs: job.finishedAt ? job.finishedAt - job.createdAt : undefined,
  resultUrl: job.status === 'succeeded' ? `/api/opencv/jobs/${job.id}/result` : undefined,
  errorCode: job.errorCode,
})

const readBody = async (request) => {
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > LIMITS.bodyBytes) throw Object.assign(new Error('请求体过大。'), { status: 413 })
    chunks.push(chunk)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw Object.assign(new Error('请求体不是合法 JSON。'), { status: 400 }) }
}

const cookies = (request) => Object.fromEntries((request.headers.cookie ?? '').split(';').filter(Boolean).map((pair) => {
  const index = pair.indexOf('=')
  return [pair.slice(0, index).trim(), decodeURIComponent(pair.slice(index + 1))]
}))

const verifyTurnstile = async (token, ip, secret) => {
  if (!secret || !token) return false
  const body = new URLSearchParams({ secret, response: token, remoteip: ip })
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
  return Boolean((await response.json()).success)
}

export function createOpenCVServer({
  executor,
  concurrency = Number(process.env.OPENCV_RUNNER_CONCURRENCY ?? 1),
  maxQueue = Number(process.env.OPENCV_MAX_QUEUE ?? 30),
  trustProxy = process.env.TRUST_PROXY === 'true',
  turnstileSecret = process.env.TURNSTILE_SECRET_KEY,
  loadTestToken = process.env.OPENCV_LOAD_TEST_TOKEN,
  secureCookie = process.env.NODE_ENV === 'production',
  now = () => Date.now(),
} = {}) {
  if (!executor) throw new Error('executor is required')
  const jobs = new Map()
  const limiter = new SlidingWindowLimiter()
  let active = 0

  const cleanupJob = async (job) => {
    await executor.cleanup?.(job.directory)
    jobs.delete(job.id)
  }

  const pump = () => {
    while (active < concurrency) {
      const job = [...jobs.values()].find((candidate) => candidate.status === 'queued')
      if (!job) return
      active += 1
      const controller = new AbortController()
      job.controller = controller
      void executor.execute(job, {
        signal: controller.signal,
        onState: (state) => { job.status = state },
      }).then((result) => {
        Object.assign(job, result, { finishedAt: now() })
        if (result.status === 'cancelled') setTimeout(() => void cleanupJob(job), 1_000).unref()
        else setTimeout(() => void cleanupJob(job), LIMITS.resultTtlMs).unref()
      }).catch((error) => {
        Object.assign(job, { status: 'failed', stderr: error.message, errorCode: 'runner_failed', finishedAt: now() })
        setTimeout(() => void cleanupJob(job), LIMITS.resultTtlMs).unref()
      }).finally(() => {
        active -= 1
        pump()
      })
    }
  }

  const server = createServer(async (request, response) => {
    const origin = request.headers.origin
    if (origin) response.setHeader('vary', 'Origin')
    const url = new URL(request.url, 'http://runner.local')
    const ip = trustProxy ? (request.headers['x-forwarded-for']?.split(',')[0].trim() ?? request.socket.remoteAddress) : request.socket.remoteAddress
    const existingSession = cookies(request).opencv_session
    const sessionId = existingSession || randomUUID()
    const cookieHeader = existingSession ? {} : {
      'set-cookie': `opencv_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secureCookie ? '; Secure' : ''}`,
    }

    try {
      if (request.method === 'GET' && url.pathname === '/healthz') {
        const readiness = await executor.readiness?.() ?? { ok: true }
        return json(response, readiness.ok ? 200 : 503, {
          ok: readiness.ok,
          message: readiness.message,
          active,
          queued: [...jobs.values()].filter((job) => job.status === 'queued').length,
        })
      }

      if (request.method === 'POST' && url.pathname === '/api/opencv/jobs') {
        const body = await readBody(request)
        const validationError = validateSubmission(body)
        if (validationError) return json(response, 400, { message: validationError, errorCode: 'invalid_submission' }, cookieHeader)

        const allJobs = [...jobs.values()]
        const isLoadTest = Boolean(loadTestToken) && request.headers.authorization === `Bearer ${loadTestToken}`
        const sessionActive = allJobs.filter((job) => job.sessionId === sessionId && ['queued', 'compiling', 'running'].includes(job.status)).length
        const ipActive = allJobs.filter((job) => job.ip === ip && ['queued', 'compiling', 'running'].includes(job.status)).length
        if (sessionActive >= LIMITS.sessionConcurrency || (!isLoadTest && ipActive >= LIMITS.ipConcurrency)) {
          return json(response, 429, { message: '已有任务正在运行。', errorCode: 'concurrency_limit' }, cookieHeader)
        }
        if (allJobs.filter((job) => job.status === 'queued').length >= maxQueue) {
          return json(response, 503, { message: '运行队列已满，请稍后重试。', errorCode: 'queue_full' }, cookieHeader)
        }

        if (!isLoadTest) {
          const recent = limiter.count(ip, now())
          if (recent >= LIMITS.hardRateLimit) return json(response, 429, { message: '提交过于频繁，请稍后再试。', errorCode: 'rate_limited' }, cookieHeader)
          if (recent >= LIMITS.challengeAfter && !await verifyTurnstile(body.turnstileToken, ip, turnstileSecret)) {
            return json(response, 429, { message: '需要完成人机验证。', errorCode: 'challenge_required' }, cookieHeader)
          }
          limiter.add(ip, now())
        }
        const job = {
          id: randomUUID(), language: body.language, moduleId: body.moduleId, code: body.code,
          status: 'queued', createdAt: now(), sessionId, ip,
        }
        jobs.set(job.id, job)
        pump()
        return json(response, 202, publicJob(job, [...jobs.values()]), cookieHeader)
      }

      const match = url.pathname.match(/^\/api\/opencv\/jobs\/([0-9a-f-]+)(?:\/(result))?$/)
      if (match) {
        const job = jobs.get(match[1])
        if (!job || job.sessionId !== sessionId) return json(response, 404, { message: '任务不存在或已过期。', errorCode: 'not_found' }, cookieHeader)
        if (request.method === 'GET' && match[2] === 'result') {
          if (job.status !== 'succeeded' || !job.resultPath) return json(response, 404, { message: '结果尚不可用。', errorCode: 'result_unavailable' }, cookieHeader)
          const data = await readFile(job.resultPath)
          response.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'private, no-store' })
          return response.end(data)
        }
        if (request.method === 'GET' && !match[2]) return json(response, 200, publicJob(job, [...jobs.values()]), cookieHeader)
        if (request.method === 'DELETE' && !match[2]) {
          if (job.status === 'queued') {
            Object.assign(job, { status: 'cancelled', finishedAt: now() })
            setTimeout(() => void cleanupJob(job), 1_000).unref()
          }
          else job.controller?.abort()
          return json(response, 202, publicJob(job, [...jobs.values()]), cookieHeader)
        }
      }

      return json(response, 404, { message: 'Not found' })
    } catch (error) {
      return json(response, error.status ?? 500, { message: error.message ?? 'Internal error', errorCode: 'request_failed' }, cookieHeader)
    }
  })

  return { server, jobs, pump }
}
