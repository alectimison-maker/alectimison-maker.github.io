import CodeMirror from '@uiw/react-codemirror'
import { cpp } from '@codemirror/lang-cpp'
import { python } from '@codemirror/lang-python'
import { EditorView } from '@codemirror/view'
import { ChevronDown, Lightbulb, Play, RotateCcw, Square, Terminal as TerminalIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { OPEN_CV_MODULES } from './modules'
import type { OpenCVJob, OpenCVLanguage } from './types'
import './opencv-lab.css'

interface Props {
  moduleId: string
  imageSrc?: string
  apiBase?: string
}

interface TurnstileApi {
  render: (container: HTMLElement, options: {
    sitekey: string
    callback: (token: string) => void
    'error-callback': () => void
    theme: 'auto'
  }) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const POLL_INTERVAL_MS = 450
const terminalText = (job?: OpenCVJob) => {
  if (!job) return ''
  const phases: Record<OpenCVJob['status'], string> = {
    queued: `[runner] job queued${job.queuePosition > 0 ? ` · ${job.queuePosition} ahead` : ''}`,
    compiling: '[build] compiling…',
    running: '[runner] process started…',
    succeeded: `[runner] process exited successfully${job.durationMs ? ` · ${job.durationMs} ms` : ''}`,
    failed: '[error] task failed',
    cancelled: '[runner] task stopped',
  }
  const stderr = job.errorCode === 'request_failed'
    ? job.stderr.replace(/提交失败（HTTP (\d+)）/, 'submission failed (HTTP $1)')
    : job.stderr
  return [phases[job.status], job.diagnostics, job.stdout, stderr].filter(Boolean).join('\n')
}

const findAnswerLinesForTodos = (
  template: string,
  solution: string,
  answerHighlights?: Array<{ start: string; end?: string }>,
) => {
  const templateLines = template.replace(/\r\n/g, '\n').split('\n')
  const solutionLines = solution.replace(/\r\n/g, '\n').split('\n')
  if (answerHighlights?.length) {
    const highlighted = Array(solutionLines.length).fill(false) as boolean[]
    let searchFrom = 0
    for (const marker of answerHighlights) {
      const start = solutionLines.findIndex((line, index) => index >= searchFrom && line.includes(marker.start))
      if (start < 0) continue
      const end = marker.end
        ? solutionLines.findIndex((line, index) => index > start && line.includes(marker.end!))
        : start
      const last = end > start ? end : start
      for (let index = start; index <= last; index += 1) highlighted[index] = true
      searchFrom = last + 1
    }
    return { lines: solutionLines, highlighted }
  }

  const isWritableLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//')) return false
    if (trimmed.startsWith('#') && !/^#\s*(include|define|if|ifdef|ifndef|elif|else|endif|pragma|undef|error|line)\b/.test(trimmed)) return false
    return true
  }
  const lcs = Array.from(
    { length: templateLines.length + 1 },
    () => new Uint32Array(solutionLines.length + 1),
  )

  for (let i = templateLines.length - 1; i >= 0; i -= 1) {
    for (let j = solutionLines.length - 1; j >= 0; j -= 1) {
      lcs[i][j] = templateLines[i] === solutionLines[j]
        ? lcs[i + 1][j + 1] + 1
        : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const highlighted = Array(solutionLines.length).fill(false) as boolean[]
  let i = 0
  let j = 0
  while (i < templateLines.length && j < solutionLines.length) {
    if (templateLines[i] === solutionLines[j]) {
      i += 1
      j += 1
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      i += 1
    } else {
      highlighted[j] = isWritableLine(solutionLines[j])
      j += 1
    }
  }
  while (j < solutionLines.length) {
    highlighted[j] = isWritableLine(solutionLines[j])
    j += 1
  }

  return { lines: solutionLines, highlighted }
}

export default function OpenCVLab({
  moduleId,
  imageSrc = '/media/images/opencv/armor-field.w1280.webp',
  apiBase = import.meta.env.PUBLIC_OPENCV_RUNNER_URL ?? '',
}: Props) {
  const module = OPEN_CV_MODULES[moduleId]
  const [language, setLanguage] = useState<OpenCVLanguage>('cpp')
  const [code, setCode] = useState(module?.cpp.template ?? '')
  const [hintCount, setHintCount] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [job, setJob] = useState<OpenCVJob>()
  const [imageUnavailable, setImageUnavailable] = useState(false)
  const [challengeRequired, setChallengeRequired] = useState(false)
  const [challengeToken, setChallengeToken] = useState<string>()
  const inputImage = useRef<HTMLImageElement>(null)
  const turnstileHost = useRef<HTMLDivElement>(null)
  const pollAbort = useRef<AbortController | undefined>(undefined)
  const isBusy = job && ['queued', 'compiling', 'running'].includes(job.status)
  const siteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY
  const storageKey = `opencv-lab:opencv-auto-aim-basics:${moduleId}:${language}`
  const languageCopy = module?.[language]
  const hasResult = Boolean(job?.resultUrl && job.status === 'succeeded')
  const solutionDisplay = useMemo(
    () => languageCopy
      ? findAnswerLinesForTodos(languageCopy.template, languageCopy.solution, languageCopy.answerHighlights)
      : undefined,
    [languageCopy],
  )

  const extensions = useMemo(
    () => language === 'cpp'
      ? [cpp(), EditorView.lineWrapping]
      : [python(), EditorView.lineWrapping],
    [language],
  )

  useEffect(() => {
    if (!module) return
    try {
      setCode(localStorage.getItem(storageKey) ?? module[language].template)
    } catch {
      setCode(module[language].template)
    }
    setJob(undefined)
    setShowSolution(false)
    setHintCount(0)
    setDrawerOpen(false)
  }, [language, module, storageKey])

  useEffect(() => {
    if (!module) return
    const timeout = window.setTimeout(() => {
      try { localStorage.setItem(storageKey, code) } catch {}
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [code, module, storageKey])

  useEffect(() => () => pollAbort.current?.abort(), [])

  useEffect(() => {
    const image = inputImage.current
    if (image?.complete && image.naturalWidth === 0) setImageUnavailable(true)
  }, [])

  useEffect(() => {
    if (!challengeRequired || !siteKey || !turnstileHost.current) return
    let widgetId: string | undefined
    const render = () => {
      if (!window.turnstile || !turnstileHost.current) return
      widgetId = window.turnstile.render(turnstileHost.current, {
        sitekey: siteKey,
        callback: (token) => setChallengeToken(token),
        'error-callback': () => setJob({
          jobId: '', status: 'failed', queuePosition: 0, stdout: '', diagnostics: '',
          stderr: '人机验证加载失败，请稍后再试。', errorCode: 'challenge_failed',
        }),
        theme: 'auto',
      })
    }
    if (window.turnstile) render()
    else {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.onload = render
      document.head.append(script)
    }
    return () => { if (widgetId && window.turnstile) window.turnstile.remove(widgetId) }
  }, [challengeRequired, siteKey])

  if (!module || !languageCopy) return <p role="alert">未知实验模块：{moduleId}</p>

  const endpoint = (pathname: string) => `${apiBase.replace(/\/$/, '')}${pathname}`

  const poll = async (jobId: string) => {
    pollAbort.current?.abort()
    const controller = new AbortController()
    pollAbort.current = controller
    while (!controller.signal.aborted) {
      const response = await fetch(endpoint(`/api/opencv/jobs/${jobId}`), {
        credentials: 'include',
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`查询任务失败（HTTP ${response.status}）`)
      const next = await response.json() as OpenCVJob
      setJob(next)
      if (!['queued', 'compiling', 'running'].includes(next.status)) return
      await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS))
    }
  }

  const run = async () => {
    setDrawerOpen(true)
    setJob({ jobId: '', status: 'queued', queuePosition: 0, stdout: '', stderr: '', diagnostics: '' })
    try {
      const response = await fetch(endpoint('/api/opencv/jobs'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ language, moduleId, code, turnstileToken: challengeToken }),
      })
      const body = await response.json().catch(() => ({})) as Partial<OpenCVJob> & { message?: string }
      if (response.status === 429 && body.errorCode === 'challenge_required') {
        setChallengeRequired(true)
        setJob({ jobId: '', status: 'failed', queuePosition: 0, stdout: '', diagnostics: '', stderr: '提交频率较高，请完成人机验证后再次运行。', errorCode: body.errorCode })
        return
      }
      if (!response.ok || !body.jobId) throw new Error(body.message ?? `提交失败（HTTP ${response.status}）`)
      const created = body as OpenCVJob
      setJob(created)
      setChallengeRequired(false)
      setChallengeToken(undefined)
      await poll(created.jobId)
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      setJob({
        jobId: '', status: 'failed', queuePosition: 0, stdout: '', diagnostics: '',
        stderr: error instanceof Error ? error.message : '实验环境连接失败。', errorCode: 'request_failed',
      })
    }
  }

  const stop = async () => {
    pollAbort.current?.abort()
    if (job?.jobId) {
      await fetch(endpoint(`/api/opencv/jobs/${job.jobId}`), { method: 'DELETE', credentials: 'include' }).catch(() => undefined)
    }
    setJob((current) => current ? { ...current, status: 'cancelled' } : current)
  }

  const reset = () => {
    pollAbort.current?.abort()
    setCode(languageCopy.template)
    setJob(undefined)
    setHintCount(0)
    setShowSolution(false)
    setDrawerOpen(false)
    try { localStorage.removeItem(storageKey) } catch {}
  }

  const resultSrc = hasResult && job?.resultUrl
    ? new URL(job.resultUrl, apiBase || window.location.origin).toString()
    : undefined

  return (
    <section className="opencv-lab" data-opencv-lab={moduleId}>
      <header className="opencv-lab__header">
        <h3>{module.title}</h3>
        <p>{module.prompt}</p>
      </header>

      <div className="opencv-lab__shell">
        <div className="opencv-lab__toolbar">
          <div className="opencv-lab__languages" aria-label="运行语言">
            {(['cpp', 'python'] as const).map((value) => (
              <button key={value} type="button" aria-pressed={language === value} onClick={() => setLanguage(value)}>
                <span>{value === 'cpp' ? 'main.cpp' : 'main.py'}</span>
              </button>
            ))}
          </div>
          <div className="opencv-lab__actions">
            <button type="button" onClick={reset}><RotateCcw size={15} aria-hidden="true" />重置</button>
            <button type="button" onClick={stop} disabled={!isBusy}><Square size={14} aria-hidden="true" />停止</button>
            <button type="button" className="is-primary" onClick={run} disabled={Boolean(isBusy) || imageUnavailable}>
              <Play size={15} fill="currentColor" aria-hidden="true" />{isBusy ? '运行中' : '运行'}
            </button>
          </div>
        </div>

        <div className="opencv-lab__workspace">
          <div className="opencv-lab__editor-pane">
            <CodeMirror
              value={code}
              height="29rem"
              extensions={extensions}
              onChange={setCode}
              theme="light"
              basicSetup={{ autocompletion: true, bracketMatching: true, lineNumbers: true, foldGutter: false }}
              aria-label={`${module.title} ${language === 'cpp' ? 'C++' : 'Python'} 代码编辑器`}
            />
          </div>

          <div className="opencv-lab__preview-pane">
            <div className="opencv-lab__preview-heading"><span>图像预览</span><span>{hasResult ? '输入 / 输出' : '固定输入'}</span></div>
            <div className={`opencv-lab__preview${hasResult ? ' has-result' : ''}`}>
              <figure>
                <figcaption>输入</figcaption>
                {!imageUnavailable
                  ? <img ref={inputImage} src={imageSrc} alt="RoboMaster 赛场中的装甲板目标" onError={() => setImageUnavailable(true)} />
                  : <div className="opencv-lab__missing"><strong>等待原始图片</strong><span>armor-field.jpg 尚未加入仓库</span></div>}
              </figure>
              {hasResult && <figure>
                <figcaption>输出</figcaption>
                {resultSrc && <img src={resultSrc} alt="当前代码生成的 OpenCV 处理结果" />}
              </figure>}
            </div>
          </div>
        </div>

        <div className="opencv-lab__mobile-code">
          <p>移动端为只读模板；请在桌面端编辑与运行。</p>
          <pre><code>{code}</code></pre>
        </div>

        <button className="opencv-lab__drawer-toggle" type="button" aria-expanded={drawerOpen} onClick={() => setDrawerOpen((open) => !open)}>
          <span><TerminalIcon size={16} aria-hidden="true" />控制台与提示</span>
          <ChevronDown size={18} aria-hidden="true" />
        </button>

        {drawerOpen && <div className="opencv-lab__drawer">
          <div className="opencv-lab__help">
            <button type="button" onClick={() => setHintCount((count) => Math.min(2, count + 1))} disabled={hintCount >= 2}>
              <Lightbulb size={15} aria-hidden="true" />{hintCount === 0 ? '显示提示' : hintCount === 1 ? '再给一个提示' : '提示已全部显示'}
            </button>
            <button type="button" onClick={() => setShowSolution((shown) => !shown)}>{showSolution ? '隐藏参考答案' : '查看参考答案'}</button>
          </div>
          {hintCount > 0 && <ol className="opencv-lab__hints">{module.hints.slice(0, hintCount).map((hint) => <li key={hint}>{hint}</li>)}</ol>}
          {showSolution && solutionDisplay && <pre className="opencv-lab__solution"><code>{solutionDisplay.lines.map((line, index) => <span
            key={index}
            className={`opencv-lab__solution-line${solutionDisplay.highlighted[index] ? ' is-todo' : ''}`}
          >{line || '\u200b'}</span>)}</code></pre>}

          {challengeRequired && siteKey && <div className="opencv-lab__challenge" ref={turnstileHost} />}
          {job && <div className={`opencv-lab__terminal is-${job.status}`} aria-live="polite">
            <div><span>TERMINAL</span><span>{job.status.toUpperCase()}</span></div>
            <pre>{terminalText(job)}</pre>
          </div>}
        </div>}
      </div>
    </section>
  )
}
