const apiBase = (process.env.OPENCV_API_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '')
const levels = (process.env.OPENCV_LOAD_LEVELS ?? '10,20,30').split(',').map(Number).filter(Number.isFinite)
const timeoutMs = Number(process.env.OPENCV_LOAD_TIMEOUT_MS ?? 60_000)
const loadTestToken = process.env.OPENCV_LOAD_TEST_TOKEN
const siteUrl = process.env.OPENCV_SITE_URL ?? new URL(apiBase).origin
const code = `cv::Mat process(const cv::Mat& image)
{
  cv::Mat gray;
  cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
  return gray;
}`

const percentile = (values, ratio) => values.slice().sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * ratio) - 1)]

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function monitorSite(isRunning, samples) {
  do {
    const startedAt = performance.now()
    try {
      const response = await fetch(siteUrl, { signal: AbortSignal.timeout(5_000) })
      samples.push({ ok: response.ok, duration: performance.now() - startedAt })
    } catch {
      samples.push({ ok: false, duration: performance.now() - startedAt })
    }
    if (isRunning()) await wait(500)
  } while (isRunning())
}

async function virtualLearner() {
  const startedAt = performance.now()
  const response = await fetch(`${apiBase}/api/opencv/jobs`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(loadTestToken ? { authorization: `Bearer ${loadTestToken}` } : {}),
    },
    body: JSON.stringify({ language: 'cpp', moduleId: 'threshold', code }),
  })
  const cookie = response.headers.get('set-cookie')?.split(';')[0]
  const created = await response.json()
  if (!response.ok) return { ok: false, duration: performance.now() - startedAt, error: created.errorCode ?? response.status }
  while (performance.now() - startedAt < timeoutMs) {
    await wait(300)
    const currentResponse = await fetch(`${apiBase}/api/opencv/jobs/${created.jobId}`, { headers: cookie ? { cookie } : {} })
    const current = await currentResponse.json()
    if (current.status === 'succeeded') return { ok: true, duration: performance.now() - startedAt }
    if (['failed', 'cancelled'].includes(current.status)) return { ok: false, duration: performance.now() - startedAt, error: current.errorCode ?? current.stderr }
  }
  return { ok: false, duration: performance.now() - startedAt, error: 'load_test_timeout' }
}

let gatePassed = false
for (const concurrency of levels) {
  let running = true
  const pageSamples = []
  const siteMonitor = monitorSite(() => running, pageSamples)
  const results = await Promise.all(Array.from({ length: concurrency }, () => virtualLearner()))
  running = false
  await siteMonitor
  const successful = results.filter((result) => result.ok)
  const durations = successful.map((result) => result.duration)
  const report = {
    concurrency,
    successRate: successful.length / results.length,
    p50Ms: durations.length ? Math.round(percentile(durations, 0.5)) : null,
    p95Ms: durations.length ? Math.round(percentile(durations, 0.95)) : null,
    pageAvailable: pageSamples.length > 0 && pageSamples.every((sample) => sample.ok),
    pageP95Ms: pageSamples.length ? Math.round(percentile(pageSamples.map((sample) => sample.duration), 0.95)) : null,
    failures: results.filter((result) => !result.ok).map((result) => result.error),
  }
  console.log(JSON.stringify(report))
  if (concurrency === 20) {
    gatePassed = report.successRate >= 0.99 && report.p95Ms !== null && report.p95Ms <= 15_000 && report.pageAvailable
  }
}

if (!levels.includes(20)) throw new Error('OPENCV_LOAD_LEVELS 必须包含正式门槛 20。')
if (!gatePassed) process.exitCode = 1
