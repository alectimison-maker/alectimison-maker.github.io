import { useSyncExternalStore } from 'react'
import type { JazzQueueTrack } from '../data/jazz-types'

export type ListeningHistory = { track: JazzQueueTrack; time: number; playedAt: number }
type PlayerState = { queue: JazzQueueTrack[]; index: number; playing: boolean; loading: boolean; time: number; duration: number; volume: number; error: string; history: ListeningHistory[] }
const initial: PlayerState = { queue: [], index: 0, playing: false, loading: false, time: 0, duration: 0, volume: .8, error: '', history: [] }
const STORAGE = 'aliouswe-music-v1'
let state = initial
let audio: HTMLAudioElement | undefined
let restored = false
let pendingSeek = 0
let lastSaved = 0
let library: Promise<JazzQueueTrack[]> | undefined
let selectionRequest = 0
const listeners = new Set<() => void>()
const emit = (patch: Partial<PlayerState>) => { state = { ...state, ...patch }; listeners.forEach((listener) => listener()) }
const validTrack = (track: JazzQueueTrack) => track && typeof track.id === 'string' && typeof track.title === 'string'
  && typeof track.artist === 'string' && typeof track.cover === 'string' && track.cover.startsWith('/') && !track.cover.startsWith('//')
  && typeof track.audio?.src === 'string' && /^\/(jazz-local|media\/audio)\//.test(track.audio.src) && Number.isFinite(track.duration)
const compact = (track: JazzQueueTrack): JazzQueueTrack => {
  const { coverVariants: _variants, artworks: _artworks, ...rest } = track
  return rest
}
const remember = () => {
  const track = state.queue[state.index]
  if (!track) return
  state = { ...state, history: [{ track: compact(track), time: state.time, playedAt: Date.now() }, ...state.history.filter((entry) => entry.track.id !== track.id)].slice(0, 20) }
}
const save = () => {
  remember()
  try { localStorage.setItem(STORAGE, JSON.stringify({ ...state, playing: false, queue: state.queue.map(compact), version: 1 })) } catch { /* Playback also works with unavailable storage. */ }
}
export function restoreMusic() {
  if (restored || typeof window === 'undefined') return
  restored = true
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) ?? 'null')
    if (saved?.version === 1 && Array.isArray(saved.queue) && saved.queue.length <= 500 && saved.queue.every(validTrack)
      && Number.isInteger(saved.index) && saved.index >= 0 && saved.index < saved.queue.length) {
      const track = saved.queue[saved.index]
      const time = Number.isFinite(saved.time) ? Math.max(0, Math.min(saved.time, track.duration)) : 0
      pendingSeek = time
      emit({ queue: saved.queue, index: saved.index, time, duration: track.duration,
        volume: Number.isFinite(saved.volume) ? Math.max(0, Math.min(1, saved.volume)) : .8,
        history: Array.isArray(saved.history) ? saved.history.filter((entry: ListeningHistory) => validTrack(entry?.track) && Number.isFinite(entry.time) && Number.isFinite(entry.playedAt)).slice(0, 20) : [] })
    }
  } catch { /* Ignore stale or damaged history. */ }
  window.addEventListener('pagehide', save)
  document.addEventListener('visibilitychange', () => { if (document.hidden) save() })
}
function getAudio() {
  if (audio) return audio
  audio = new Audio()
  audio.preload = 'none'
  audio.volume = state.volume
  audio.addEventListener('loadedmetadata', () => {
    if (!audio) return
    const duration = Number.isFinite(audio.duration) ? audio.duration : state.duration
    emit({ duration })
    if (pendingSeek) { audio.currentTime = Math.min(pendingSeek, duration); pendingSeek = 0 }
  })
  audio.addEventListener('timeupdate', () => {
    emit({ time: audio?.currentTime ?? 0 })
    if (Date.now() - lastSaved > 5000) { save(); lastSaved = Date.now() }
  })
  audio.addEventListener('play', () => { emit({ playing: true, error: '' }); save() })
  audio.addEventListener('pause', () => { emit({ playing: false }); save() })
  audio.addEventListener('error', () => emit({ playing: false, error: '这首音频暂时无法读取，请重试或选择其他曲目。' }))
  audio.addEventListener('ended', () => {
    save()
    emit({ playing: false })
    void music.next()
  })
  return audio
}
function play() {
  const track = state.queue[state.index]
  if (!track) return
  const element = getAudio()
  if (element.getAttribute('src') !== track.audio.src) { element.src = track.audio.src; element.load() }
  else if (pendingSeek && element.readyState) { element.currentTime = pendingSeek; pendingSeek = 0 }
  emit({ error: '' })
  void element.play().catch((reason: unknown) => {
    if (reason instanceof DOMException && reason.name === 'AbortError') return
    emit({ playing: false, error: '暂时无法播放，请点击重试。' })
  })
}
export const music = {
  select(queue: JazzQueueTrack[], index: number, time = 0) {
    restoreMusic()
    if (!queue[index] || !queue.every(validTrack)) return
    selectionRequest += 1
    emit({ loading: false })
    const same = state.queue[state.index]?.id === queue[index].id && state.queue[state.index]?.audio.src === queue[index].audio.src
    if (same && !time) { emit({ queue, index }); if (state.playing) audio?.pause(); else play(); return }
    save()
    audio?.pause()
    pendingSeek = Math.max(0, Math.min(time, queue[index].duration))
    emit({ queue, index, time: pendingSeek, duration: queue[index].duration, playing: false, error: '' })
    play()
    save()
  },
  toggle() {
    restoreMusic()
    if (state.loading) return
    if (!state.queue[state.index]) return music.random()
    if (state.playing) audio?.pause(); else play()
  },
  next() {
    if (state.index < state.queue.length - 1) music.select(state.queue, state.index + 1)
    else return music.random()
  },
  async random() {
    restoreMusic()
    const request = ++selectionRequest
    emit({ loading: true, error: '' })
    try {
      library ??= fetch('/jazz/audio-library.json', { cache: 'force-cache' }).then(async (response) => {
        if (!response.ok) throw new Error('Library unavailable')
        const payload = await response.json()
        if (!Array.isArray(payload.tracks)) throw new Error('Invalid library')
        const tracks = payload.tracks.filter(validTrack) as JazzQueueTrack[]
        return [...new Map(tracks.map((track) => [track.audio.src, track])).values()]
      }).catch((error: unknown) => { library = undefined; throw error })
      const tracks = await library
      if (request !== selectionRequest) return
      const current = state.queue[state.index]?.audio.src
      const alternatives = tracks.filter((track) => track.audio.src !== current)
      const candidates = alternatives.length ? alternatives : tracks
      if (!candidates.length) throw new Error('Empty library')
      const track = candidates[Math.floor(Math.random() * candidates.length)]
      // Reset a single-track library rather than toggling the just-ended track off.
      if (track.audio.src === current) { music.seek(0); play(); emit({ loading: false }); return }
      music.select([track], 0)
    } catch {
      if (request === selectionRequest) emit({ loading: false, playing: audio ? !audio.paused : false, error: '暂时无法读取曲库，请点击播放重试。' })
    }
  },
  previous() { if (state.index > 0) music.select(state.queue, state.index - 1) },
  seek(time: number) {
    const next = Math.max(0, Math.min(time, state.duration))
    if (audio?.readyState) audio.currentTime = next
    else pendingSeek = next
    emit({ time: next }); save()
  },
  volume(value: number) { const volume = Math.max(0, Math.min(1, value)); if (audio) audio.volume = volume; emit({ volume }); save() },
  resume(entry: ListeningHistory) {
    const index = state.queue.findIndex((track) => track.id === entry.track.id)
    if (index === state.index && index >= 0) { music.seek(entry.time); if (!state.playing) play(); return }
    if (index >= 0) music.select(state.queue, index, entry.time)
    else music.select([entry.track], 0, entry.time)
  },
  clearHistory() { emit({ history: [] }); try { localStorage.removeItem(STORAGE) } catch {} },
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const getMusicSnapshot = () => state
export const useMusic = () => useSyncExternalStore(subscribe, getMusicSnapshot, () => initial)

if (import.meta.hot) import.meta.hot.dispose(() => { if (typeof window !== 'undefined') { save(); audio?.pause() } })
