import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { createOpenCVServer } from '../src/app.mjs'

const servers = []
afterEach(async () => Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve)))))

const start = async (executor, options = {}) => {
  const app = createOpenCVServer({ executor, ...options })
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  servers.push(app.server)
  return { app, base: `http://127.0.0.1:${app.server.address().port}` }
}

const submit = (base, body, cookie, headers = {}) => fetch(`${base}/api/opencv/jobs`, {
  method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...headers }, body: JSON.stringify(body),
})

describe('OpenCV runner API', () => {
  it('fails readiness when the fixed teaching image is unavailable', async () => {
    const executor = {
      readiness: async () => ({ ok: false, message: 'missing image' }),
      execute: async () => ({ status: 'cancelled' }),
      cleanup: async () => {},
    }
    const { base } = await start(executor)
    const response = await fetch(`${base}/healthz`)
    assert.equal(response.status, 503)
    assert.equal((await response.json()).ok, false)
  })

  it('rejects unknown modules before queueing work', async () => {
    const { base } = await start({ execute: async () => {}, cleanup: async () => {} })
    const response = await submit(base, { language: 'cpp', moduleId: 'unknown', code: 'x' })
    assert.equal(response.status, 400)
    assert.equal((await response.json()).errorCode, 'invalid_submission')
  })

  it('queues, runs and exposes a successful result only to the same session', async () => {
    const executor = {
      execute: async (_job, { onState }) => {
        onState('compiling')
        onState('running')
        return { status: 'succeeded', stdout: 'ok', stderr: '', diagnostics: '', resultPath: new URL('fixture.png', import.meta.url) }
      },
      cleanup: async () => {},
    }
    const { base } = await start(executor)
    const createdResponse = await submit(base, { language: 'cpp', moduleId: 'mat', code: 'cv::Mat process(const cv::Mat& image) { return image.clone(); }' })
    assert.equal(createdResponse.status, 202)
    const cookie = createdResponse.headers.get('set-cookie').split(';')[0]
    const created = await createdResponse.json()
    await new Promise((resolve) => setTimeout(resolve, 10))
    const own = await fetch(`${base}/api/opencv/jobs/${created.jobId}`, { headers: { cookie } })
    assert.equal(own.status, 200)
    assert.equal((await own.json()).status, 'succeeded')
    const stranger = await fetch(`${base}/api/opencv/jobs/${created.jobId}`)
    assert.equal(stranger.status, 404)
  })

  it('enforces one active job per anonymous session', async () => {
    let release
    const waiting = new Promise((resolve) => { release = resolve })
    const executor = {
      execute: async (_job, { onState }) => { onState('running'); await waiting; return { status: 'cancelled' } },
      cleanup: async () => {},
    }
    const { base } = await start(executor)
    const first = await submit(base, { language: 'cpp', moduleId: 'mat', code: 'valid' })
    const cookie = first.headers.get('set-cookie').split(';')[0]
    const second = await submit(base, { language: 'cpp', moduleId: 'threshold', code: 'valid' }, cookie)
    assert.equal(second.status, 429)
    assert.equal((await second.json()).errorCode, 'concurrency_limit')
    release()
  })

  it('cancels a queued job and reports its terminal state', async () => {
    let release
    const waiting = new Promise((resolve) => { release = resolve })
    const executor = {
      execute: async (_job, { onState }) => { onState('running'); await waiting; return { status: 'cancelled' } },
      cleanup: async () => {},
    }
    const { base } = await start(executor)
    await submit(base, { language: 'cpp', moduleId: 'mat', code: 'valid' })
    const queuedResponse = await submit(base, { language: 'cpp', moduleId: 'threshold', code: 'valid' })
    const cookie = queuedResponse.headers.get('set-cookie').split(';')[0]
    const queued = await queuedResponse.json()
    assert.equal(queued.queuePosition, 0)

    const cancelled = await fetch(`${base}/api/opencv/jobs/${queued.jobId}`, { method: 'DELETE', headers: { cookie } })
    assert.equal(cancelled.status, 202)
    assert.equal((await cancelled.json()).status, 'cancelled')
    release()
  })

  it('marks the anonymous session cookie Secure in production', async () => {
    const executor = { execute: async () => ({ status: 'cancelled' }), cleanup: async () => {} }
    const { base } = await start(executor, { secureCookie: true })
    const response = await submit(base, { language: 'cpp', moduleId: 'mat', code: 'valid' })
    assert.match(response.headers.get('set-cookie'), /; Secure$/)
  })

  it('allows an authenticated capacity test to bypass only the IP submission limit', async () => {
    let release
    const waiting = new Promise((resolve) => { release = resolve })
    const executor = { execute: async () => { await waiting; return { status: 'cancelled' } }, cleanup: async () => {} }
    const { base } = await start(executor, { loadTestToken: 'test-only-token' })
    const body = { language: 'cpp', moduleId: 'mat', code: 'valid' }

    assert.equal((await submit(base, body)).status, 202)
    assert.equal((await submit(base, body)).status, 202)
    assert.equal((await submit(base, body)).status, 429)
    assert.equal((await submit(base, body, undefined, { authorization: 'Bearer test-only-token' })).status, 202)
    release()
  })
})
