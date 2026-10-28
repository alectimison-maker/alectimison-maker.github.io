import { beforeEach, afterEach, expect, test, vi } from 'vitest'
import type { JazzQueueTrack } from '../data/jazz-types'

const tracks: JazzQueueTrack[] = [1, 2].map((number) => ({ id: `test-${number}`, title: `Tune ${number}`, number,
  artist: 'Test artist', albumTitle: 'Test album', cover: '/cover.webp', duration: 120, categories: [], audio: { src: `/jazz-local/test/${number}.m4a`, mimeType: 'audio/mp4' } }))
let instances: TestAudio[]
class TestAudio extends EventTarget {
  preload = ''; volume = 1; src = ''; readyState = 0; currentTime = 0; duration = 120; paused = true
  constructor() { super(); instances.push(this) }
  getAttribute(name: string) { return name === 'src' ? this.src : null }
  load() { this.readyState = 1; this.dispatchEvent(new Event('loadedmetadata')) }
  play() { this.paused = false; this.dispatchEvent(new Event('play')); return Promise.resolve() }
  pause() { if (!this.paused) { this.paused = true; this.dispatchEvent(new Event('pause')) } }
}
beforeEach(() => {
  vi.resetModules(); instances = []
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) })
  vi.stubGlobal('window', new EventTarget())
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }))
  vi.stubGlobal('Audio', TestAudio)
})
afterEach(() => vi.unstubAllGlobals())

test('one audio instance controls queue, seek, pause and automatic advance', async () => {
  const { music, getMusicSnapshot } = await import('./music-player')
  music.select(tracks, 0)
  expect(getMusicSnapshot().playing).toBe(true)
  music.seek(35); music.volume(.45)
  expect(instances[0].currentTime).toBe(35)
  expect(instances[0].volume).toBe(.45)
  music.toggle(); expect(getMusicSnapshot().playing).toBe(false)
  music.toggle(); instances[0].dispatchEvent(new Event('ended'))
  expect(instances).toHaveLength(1)
  expect(getMusicSnapshot().index).toBe(1)
  expect(getMusicSnapshot().playing).toBe(true)
  expect(getMusicSnapshot().history.map((entry) => entry.track.id)).toEqual(['test-2', 'test-1'])
})

test('a fresh visit restores queue, time and volume without fetching audio or autoplay', async () => {
  let module = await import('./music-player')
  module.music.select(tracks, 1); module.music.seek(47); module.music.volume(.3)
  window.dispatchEvent(new Event('pagehide'))
  vi.resetModules(); instances = []
  module = await import('./music-player'); module.restoreMusic()
  expect(module.getMusicSnapshot()).toMatchObject({ index: 1, time: 47, volume: .3, playing: false })
  expect(instances).toHaveLength(0)
  module.music.toggle()
  expect(instances[0].currentTime).toBe(47)
  expect(module.getMusicSnapshot().playing).toBe(true)
})

test('history resumes the right track and saved progress, including the current audio', async () => {
  const { music, getMusicSnapshot } = await import('./music-player')
  music.select(tracks, 0); music.seek(31)
  const entry = getMusicSnapshot().history[0]
  music.next(); music.resume(entry)
  expect(getMusicSnapshot()).toMatchObject({ index: 0, time: 31, playing: true })
  music.seek(75); music.resume(entry)
  expect(instances[0].currentTime).toBe(31)
})

test('invalid persisted or external audio never loads', async () => {
  localStorage.setItem('aliouswe-music-v1', JSON.stringify({ version: 1, queue: [{ ...tracks[0], audio: { src: 'https://example.com/audio.mp3' } }], index: 0 }))
  const { music, restoreMusic, getMusicSnapshot } = await import('./music-player')
  restoreMusic(); expect(getMusicSnapshot().queue).toHaveLength(0)
  music.select([{ ...tracks[0], audio: { src: '//example.com/audio.mp3', mimeType: 'audio/mp3' } }], 0)
  expect(instances).toHaveLength(0)
})

test('an empty queue lazily picks from the full library and plays only after a click', async () => {
  const fetchLibrary = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ tracks }) })
  vi.stubGlobal('fetch', fetchLibrary)
  vi.spyOn(Math, 'random').mockReturnValue(0)
  const { music, restoreMusic, getMusicSnapshot } = await import('./music-player')
  restoreMusic()
  expect(fetchLibrary).not.toHaveBeenCalled()
  expect(instances).toHaveLength(0)
  await music.toggle()
  expect(getMusicSnapshot()).toMatchObject({ playing: true, loading: false, index: 0 })
  expect(getMusicSnapshot().queue[0].id).toBe('test-1')
  expect(fetchLibrary).toHaveBeenCalledOnce()
  vi.restoreAllMocks()
})

test('an exhausted queue continues randomly without repeating the current audio or re-fetching the catalog', async () => {
  const fetchLibrary = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ tracks: [...tracks, tracks[0]] }) })
  vi.stubGlobal('fetch', fetchLibrary)
  const { music, getMusicSnapshot } = await import('./music-player')
  music.select([tracks[0]], 0)
  instances[0].dispatchEvent(new Event('ended'))
  await vi.waitFor(() => expect(getMusicSnapshot().queue[0].id).toBe('test-2'))
  await music.next()
  expect(getMusicSnapshot().queue[0].id).toBe('test-1')
  expect(getMusicSnapshot().playing).toBe(true)
  expect(instances).toHaveLength(1)
  expect(fetchLibrary).toHaveBeenCalledOnce()
})

test('a slow random lookup cannot override a newer manual song selection', async () => {
  let resolveCatalog!: (value: unknown) => void
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise((resolve) => { resolveCatalog = resolve })))
  const { music, getMusicSnapshot } = await import('./music-player')
  const pending = music.random()
  music.select(tracks, 1)
  resolveCatalog({ ok: true, json: async () => ({ tracks }) })
  await pending
  expect(getMusicSnapshot().queue[1].id).toBe('test-2')
  expect(getMusicSnapshot()).toMatchObject({ index: 1, playing: true, loading: false })
})

test('catalog failures are retryable without an endless retry loop', async () => {
  const fetchLibrary = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ok: true, json: async () => ({ tracks }) })
  vi.stubGlobal('fetch', fetchLibrary)
  const { music, getMusicSnapshot } = await import('./music-player')
  await music.toggle()
  expect(getMusicSnapshot()).toMatchObject({ playing: false, loading: false })
  expect(getMusicSnapshot().error).not.toBe('')
  await music.toggle()
  expect(getMusicSnapshot()).toMatchObject({ playing: true, loading: false, error: '' })
  expect(fetchLibrary).toHaveBeenCalledTimes(2)
})
