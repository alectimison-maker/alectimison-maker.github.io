export type OpenCVLanguage = 'cpp' | 'python'

export type OpenCVJobState = 'queued' | 'compiling' | 'running' | 'succeeded' | 'failed' | 'cancelled'

export interface OpenCVJob {
  jobId: string
  status: OpenCVJobState
  queuePosition: number
  stdout: string
  stderr: string
  diagnostics: string
  durationMs?: number
  resultUrl?: string
  errorCode?: string
}

export interface OpenCVModuleCopy {
  template: string
  solution: string
  answerHighlights?: Array<{ start: string; end?: string }>
}

export interface OpenCVModule {
  id: string
  title: string
  prompt: string
  hints: [string, string]
  cpp: OpenCVModuleCopy
  python: OpenCVModuleCopy
}
