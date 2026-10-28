import { useEffect, useRef, useState } from 'react'
import { Pause, Play, SkipBack, SkipForward, History, Volume2, Music2 } from 'lucide-react'
import { formatTrackTime, jazzAlbumPath, jazzStandardPath } from '../../data/jazz-types'
import { music, restoreMusic, useMusic } from '../../lib/music-player'
import './floating-music.css'

export default function FloatingMusicPlayer() {
  const player = useMusic()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const orb = useRef<HTMLButtonElement>(null)
  const track = player.queue[player.index]
  useEffect(() => { restoreMusic() }, [])
  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); orb.current?.focus() } }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape) }
  }, [open])
  const trackTitle = track?.title ?? (player.loading ? '正在选曲…' : '从本库随机播放')
  const href = track?.kind === 'standard' ? jazzStandardPath(track.id)
    : track?.albumId ? `${jazzAlbumPath(track.albumId)}?track=${encodeURIComponent(track.id)}` : '/jazz/'
  return <div ref={root} className="music-float" data-playing={player.playing} data-open={open}>
    <section id="global-music-panel" className="music-float__panel" aria-label="全站音乐播放器" aria-hidden={!open} inert={!open}>
      <div className="music-float__controls">
        <button type="button" aria-label="悬浮播放器上一首" disabled={player.index === 0} onClick={music.previous}><SkipBack size={16} /></button>
        <button type="button" className="music-float__play" aria-label={player.playing ? '悬浮播放器暂停' : '悬浮播放器播放'} disabled={player.loading} onClick={music.toggle}>{player.playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button>
        <button type="button" aria-label="悬浮播放器下一首" disabled={player.loading} onClick={music.next}><SkipForward size={16} /></button>
      </div>
      <div className="music-float__timeline">
        <a href={href} onClick={() => setOpen(false)} className="music-float__track"><strong>{trackTitle}</strong><span>{track?.artist ?? 'Jazz library'}</span></a>
        <div className="music-float__progress">
          <span>{formatTrackTime(player.time)}</span>
          <label className="music-float__seek"><span className="sr-only">悬浮播放器进度</span><input type="range" disabled={!track} min="0" max={player.duration || 0} step=".1" value={Math.min(player.time, player.duration || 0)} onChange={(event) => music.seek(Number(event.target.value))} /></label>
          <span>{formatTrackTime(player.duration)}</span>
        </div>
      </div>
      <label className="music-float__volume"><Volume2 size={14} /><span className="sr-only">悬浮播放器音量</span><input type="range" min="0" max="1" step=".05" value={player.volume} onChange={(event) => music.volume(Number(event.target.value))} /></label>
      {player.error && <p role="alert">{player.error}</p>}
      {!!player.history.length && <details className="music-float__history"><summary aria-label="最近播放" title="最近播放"><History size={17} /><span className="sr-only">最近播放</span></summary><ol>{player.history.map((entry) => <li key={entry.track.id}><button type="button" onClick={() => music.resume(entry)}><strong>{entry.track.title}</strong><span>{entry.track.artist} · {formatTrackTime(entry.time)}</span></button></li>)}</ol><button type="button" onClick={music.clearHistory}>清空播放历史</button></details>}
    </section>
    <button type="button" ref={orb} className="music-float__orb" aria-label={`${open ? '收起' : '展开'}音乐播放器：${trackTitle}`} aria-expanded={open} aria-controls="global-music-panel" onClick={() => setOpen((value) => !value)}>
      <span className="music-float__empty" aria-hidden="true" hidden={!!track}><Music2 size={25} /></span>
      {track && <img src={track.thumbnail ?? track.cover} alt="" width="56" height="56" decoding="async" />}
      <span className="music-float__badge" aria-hidden="true">{player.playing ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}</span>
    </button>
  </div>
}
