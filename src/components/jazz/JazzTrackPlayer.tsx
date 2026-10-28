import { useEffect, useMemo, useState } from 'react'
import { Pause, Play, Search, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { formatTrackTime, type JazzQueueTrack, type JazzItem } from '../../data/jazz-types'
import './jazz-listening.css'
import JazzCover from './JazzCover'
import { music, restoreMusic, useMusic } from '../../lib/music-player'

export default function JazzTrackPlayer({ tracks, title, description, album }: {
  tracks: JazzQueueTrack[]
  title: string
  description?: string
  album?: JazzItem
}) {
  const player = useMusic()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [query, setQuery] = useState('')
  const activeIndex = tracks.findIndex((entry) => entry.id === player.queue[player.index]?.id)
  const index = activeIndex >= 0 ? activeIndex : selectedIndex
  const active = activeIndex >= 0
  const track = tracks[index]
  const playing = active && player.playing
  const time = active ? player.time : 0
  const duration = active ? player.duration : track?.duration ?? 0
  const volume = player.volume
  const error = active ? player.error : ''
  const visible = useMemo(() => {
    const search = query.trim().normalize('NFKC').toLocaleLowerCase()
    return tracks.map((entry, row) => ({ entry, row })).filter(({ entry }) =>
      !search || [entry.title, entry.artist, entry.standard ?? '', entry.albumTitle].some((value) => value.normalize('NFKC').toLocaleLowerCase().includes(search)))
  }, [tracks, query])

  const select = (next: number) => {
    if (!tracks[next]) return
    setSelectedIndex(next)
    music.select(tracks, next)
  }
  useEffect(() => {
    restoreMusic()
    const id = new URLSearchParams(window.location.search).get('track')
    const initial = tracks.findIndex((candidate) => candidate.id === id)
    if (initial >= 0) setSelectedIndex(initial)
  }, [tracks])

  if (!track) return null
  return (
    <section className="jl-listening" aria-label={`${title} 曲目播放器`}>
      <div className="jp-focus__details jl-original-player">
        <div className="jl-player-column">
          <div className={`jp-focus__player ${playing ? 'is-playing' : ''}`}>
            <button className="jp-focus__vinyl" type="button" onClick={() => select(index)} aria-label={`${playing ? '暂停' : '播放'} ${track.title}`}>
              <span className="jp-focus__vinyl-label" aria-hidden="true">
                {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </span>
            </button>
            <JazzCover className="jp-focus__sleeve" src={track.cover} variants={track.coverVariants} alt={`${track.albumTitle} 封面`} sizes="(max-width: 800px) 78vw, 35vw" width={400} height={400} />
            <span className="jp-focus__source-status">{playing ? 'NOW PLAYING' : 'CLICK VINYL TO LISTEN'}</span>
          </div>
          <div className="jl-now" aria-live="polite"><strong>{track.title}</strong><span>{track.artist} · {track.albumTitle}</span></div>
        <label className="jl-seek"><span className="sr-only">播放进度</span>
          <input type="range" min="0" max={Number.isFinite(duration) ? duration : 0} step=".1" value={Math.min(time, duration || 0)}
            onChange={(event) => { if (active) music.seek(Number(event.target.value)) }} disabled={!active} />
        </label>
        <div className="jl-time"><span>{formatTrackTime(time)}</span><span>{formatTrackTime(duration)}</span></div>
        <div className="jl-controls">
          <button type="button" aria-label="上一首" disabled={index === 0} onClick={() => select(index - 1)}><SkipBack size={19} /></button>
          <button type="button" className="jl-controls__main" aria-label={playing ? '暂停' : '播放'} onClick={() => select(index)}>{playing ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}</button>
          <button type="button" aria-label="下一首" disabled={index === tracks.length - 1} onClick={() => select(index + 1)}><SkipForward size={19} /></button>
          <label className="jl-volume"><Volume2 size={15} /><span className="sr-only">音量</span><input type="range" min="0" max="1" step=".05" value={volume} onChange={(event) => music.volume(Number(event.target.value))} /></label>
        </div>
        {error && <p className="jl-error" role="alert">{error}</p>}
        </div>
        <article className="jp-focus__note">
          <span>LISTENING NOTE</span>
          <h2>{title}</h2>
          <p className="jl-description">{description || '从一首开始，慢慢听完这张唱片。'}</p>
          <dl>
            <dt>Artist</dt><dd>{album?.artist ?? track.artist}</dd>
            {album?.year && <><dt>Year</dt><dd>{album.year}</dd></>}
            {album && <><dt>Shelf</dt><dd>{album.shelves.join(' / ')}</dd></>}
            <dt>Tracks</dt><dd>{tracks.length}</dd>
          </dl>
        </article>
      </div>
      <div className="jl-tracklist">
        <header><div><span className="jl-kicker">THE LISTENING ROOM</span><h2>{title}</h2></div><span>{tracks.length} TRACKS<br />{Math.round(tracks.reduce((total, entry) => total + entry.duration, 0) / 60)} MIN</span></header>
        {tracks.length > 10 && <label className="jl-track-search"><Search size={16} /><span className="sr-only">搜索曲目或演奏者</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索曲目 / 演奏者" /><span>{visible.length} / {tracks.length}</span></label>}
        <div className="jl-tracklist__columns"><span>曲目 / TITLE</span><span>时长</span></div>
        <ol>
          {visible.map(({ entry, row }) => <li className={row === index ? 'is-current' : ''} key={entry.id}>
            <button className="jl-track" type="button" aria-current={row === index ? 'true' : undefined} aria-label={`${row === index && playing ? '暂停' : '播放'} ${entry.title}`} onClick={() => select(row)}>
              <span className="jl-track__number">{row === index && playing ? <span className="jl-equalizer" aria-hidden="true"><i /><i /><i /></span> : String(row + 1).padStart(2, '0')}</span>
              <span className="jl-track__copy"><strong>{entry.title}</strong><small>{entry.artist} · {entry.albumTitle}</small>{entry.reviewNote && <small className="jl-track__review">{entry.reviewNote}</small>}</span>
              <span className="jl-track__duration">{formatTrackTime(entry.duration)}</span>
              <span className="jl-track__action" aria-hidden="true">{row === index && playing ? <Pause size={15} /> : <Play size={15} />}</span>
            </button>
            {!entry.albumId && <span className="jl-track__art"><img src={entry.thumbnail ?? entry.cover} alt="" width="28" height="28" loading="lazy" decoding="async" /></span>}
          </li>)}
        </ol>
        {!visible.length && <p className="jl-search-empty">没有找到这个曲目或演奏者。</p>}
      </div>
    </section>
  )
}
