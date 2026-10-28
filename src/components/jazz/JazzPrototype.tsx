import { navigate } from 'astro:transitions/client'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, Play, Search, X } from 'lucide-react'
import { jazzCategories, jazzCategoryPath, type JazzCategory, type JazzCategorySlug } from '../../data/jazz-categories'
import JazzCategoryArchive from './JazzCategoryArchive'
import JazzTrackPlayer from './JazzTrackPlayer'
import JazzArtwork from './JazzArtwork'
import { albumQueue, jazzAlbumPath, type JazzItem } from '../../data/jazz-types'
import './jazz-prototype.css'

const coverUrl = (source: string) => encodeURI(source)

const writeAlbumToUrl = (item?: JazzItem) => {
  const url = new URL(window.location.href)
  url.searchParams.delete('variant')
  url.hash = ''
  if (item) url.searchParams.set('album', item.id)
  else url.searchParams.delete('album')
  window.history.replaceState({}, '', url)
}

const itemMeta = (item: JazzItem, index: number) => [
  item.artist,
  item.year?.toString(),
  item.genre ?? item.shelves[0],
  `No. ${String(index + 1).padStart(2, '0')}`,
].filter(Boolean).join(' · ')

const curtainPressure = (index: number, active: number) => {
  const rowOffsets = [0, .5, .25]
  const row = Math.floor(index / 6)
  const column = index % 6
  const activeRow = Math.floor(active / 6)
  const activeColumn = active % 6
  const deltaX = column + (rowOffsets[row] ?? 0) - activeColumn - (rowOffsets[activeRow] ?? 0)
  const deltaY = (row - activeRow) * 1.18
  const distance = Math.hypot(deltaX, deltaY)

  if (index === active || distance === 0 || distance >= 3) {
    return { '--push-x': '0rem', '--push-y': '0rem' } as CSSProperties
  }

  const pressure = 2.2 * (1 - distance / 3)
  return {
    '--push-x': `${(deltaX / distance) * pressure}rem`,
    '--push-y': `${(deltaY / distance) * pressure}rem`,
  } as CSSProperties
}

function CurtainArchive({
  items,
  onSelect,
}: {
  items: JazzItem[]
  onSelect: (index: number) => void
}) {
  const [active, setActive] = useState(Math.min(4, items.length - 1))
  const stageRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const stage = stageRef.current
    const header = document.querySelector<HTMLElement>('[data-header]')
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || localStorage.getItem('aliouswe-motion') === 'reduced'
    if (!stage || !finePointer || reducedMotion) return

    const lens = document.createElement('span')
    lens.className = 'jp-cursor-lens'
    lens.setAttribute('aria-hidden', 'true')
    document.body.append(lens)

    let pointerX = -200
    let pointerY = -200
    let hasPointer = false
    let frame = 0

    const hideLens = () => {
      lens.classList.remove('is-visible')
      document.documentElement.classList.remove('jp-cursor-lens-active')
      document.documentElement.classList.remove('jp-cursor-lens-stage')
    }

    const paintLens = () => {
      const bounds = stage.getBoundingClientRect()
      const headerBottom = header?.getBoundingClientRect().bottom ?? 0
      const lensDiameter = lens.offsetWidth
      const insideStage = hasPointer
        && pointerX >= bounds.left
        && pointerX <= bounds.right
        && pointerY >= bounds.top
        && pointerY <= bounds.bottom
      const insideLens = insideStage && pointerY >= headerBottom

      const clipTop = Math.max(
        0,
        Math.min(lensDiameter, headerBottom - (pointerY - lensDiameter / 2)),
      )

      lens.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0) translate(-50%, -50%)`
      lens.style.setProperty('--lens-clip-top', `${clipTop}px`)
      lens.classList.toggle('is-visible', insideLens)
      document.documentElement.classList.toggle('jp-cursor-lens-active', insideLens)
      document.documentElement.classList.toggle('jp-cursor-lens-stage', insideStage)
      frame = 0
    }

    const schedulePaint = () => {
      if (!frame) frame = requestAnimationFrame(paintLens)
    }

    const moveLens = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      pointerX = event.clientX
      pointerY = event.clientY
      hasPointer = true
      schedulePaint()
    }

    const leaveWindow = () => {
      hasPointer = false
      hideLens()
    }

    window.addEventListener('pointermove', moveLens, { passive: true })
    window.addEventListener('scroll', schedulePaint, { passive: true })
    window.addEventListener('resize', schedulePaint, { passive: true })
    window.addEventListener('blur', leaveWindow)
    document.documentElement.addEventListener('mouseleave', leaveWindow)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', moveLens)
      window.removeEventListener('scroll', schedulePaint)
      window.removeEventListener('resize', schedulePaint)
      window.removeEventListener('blur', leaveWindow)
      document.documentElement.removeEventListener('mouseleave', leaveWindow)
      document.documentElement.classList.remove('jp-cursor-lens-active')
      document.documentElement.classList.remove('jp-cursor-lens-stage')
      lens.remove()
    }
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    let frame = 0
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const bounds = stage.getBoundingClientRect()
        stage.style.setProperty('--pointer-x', `${(event.clientX - bounds.left) / bounds.width - .5}`)
        stage.style.setProperty('--pointer-y', `${(event.clientY - bounds.top) / bounds.height - .5}`)
      })
    }
    stage.addEventListener('pointermove', move)
    return () => {
      cancelAnimationFrame(frame)
      stage.removeEventListener('pointermove', move)
    }
  }, [])

  useEffect(() => {
    if (window.matchMedia('(max-width: 700px)').matches) setActive(0)
  }, [])

  return (
    <section className="jp-hero jp-curtain" ref={stageRef}>
      <div className="jp-hero-kicker">
        <span>JAZZ / CURTAIN ARCHIVE</span>
        <span>{String(items.length).padStart(2, '0')} FEATURED RECORDS</span>
      </div>

      <div className="jp-curtain__strips" role="list" aria-label="精选专辑">
        {items.map((item, index) => (
          <button
            className={`jp-curtain__strip ${index === active ? 'is-active' : ''}`}
            style={{
              '--strip-index': index,
              ...curtainPressure(index, active),
            } as CSSProperties}
            type="button"
            onPointerEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onClick={() => onSelect(index)}
            role="listitem"
            key={item.id}
          >
            <img src={coverUrl(item.cover)} alt="" draggable="false" />
            <span>{String(index + 1).padStart(2, '0')}</span>
          </button>
        ))}
      </div>

      <div className="jp-curtain__caption" aria-live="polite">
        <p>SELECTED LISTENING / EXPLORE THE RECORD</p>
        <h1>{items[active]?.title}</h1>
        <span>{itemMeta(items[active], active)}</span>
      </div>

      <a className="jp-scroll-cue" href="#jazz-categories">
        <ArrowDown size={16} />
        Explore categories
      </a>
    </section>
  )
}

const focusRects = [
  { x: 28, y: 70, width: 118, height: 480 },
  { x: 163, y: 28, width: 118, height: 560 },
  { x: 298, y: 92, width: 118, height: 470 },
  { x: 433, y: 0, width: 118, height: 620 },
  { x: 568, y: 46, width: 118, height: 526 },
  { x: 703, y: 96, width: 118, height: 458 },
  { x: 838, y: 22, width: 118, height: 570 },
]

export function FocusStage({
  item,
  index,
  total,
  onBack,
  onPrevious,
  onNext,
}: {
  item: JazzItem
  index: number
  total: number
  onBack: () => void
  onPrevious: () => void
  onNext: () => void
}) {
  const tracks = useMemo(() => albumQueue(item), [item])

  return (
    <section className="jp-focus">
      <div className="jp-focus__toolbar">
        <button type="button" onClick={onBack}><X size={16} /> {item.kind === 'standard' ? 'Back to collection' : 'Back to featured'}</button>
        <span>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
      </div>

      <div className="jp-focus__canvas">
        <svg viewBox="0 0 1000 620" role="img" aria-label={`${item.title} 封面切片`}>
          <defs>
            <clipPath id="jp-focus-bars">
              {focusRects.map((rect, rectIndex) => (
                <rect
                  {...rect}
                  className="jp-focus__bar"
                  key={rectIndex}
                />
              ))}
            </clipPath>
          </defs>
          <g clipPath="url(#jp-focus-bars)">
            <image
              className="jp-focus__image"
              href={coverUrl(item.cover)}
              x="-14"
              y="-214"
              width="1028"
              height="1028"
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        </svg>

        <div className="jp-focus__title">
          <p>{item.kind === 'standard' ? 'STANDARD IN FOCUS' : 'ALBUM IN FOCUS'}</p>
          <h1>{item.title}</h1>
          <span>{itemMeta(item, index)}</span>
        </div>

        <button
          className="jp-focus__previous"
          type="button"
          aria-label={item.kind === 'standard' ? 'Previous version' : 'Previous album'}
          onClick={onPrevious}
        >
          <ArrowLeft size={19} aria-hidden="true" />
        </button>
        <button
          className="jp-focus__next"
          type="button"
          aria-label={item.kind === 'standard' ? 'Next version' : 'Next album'}
          onClick={onNext}
        >
          <ArrowRight size={19} aria-hidden="true" />
        </button>
      </div>

      {tracks.length > 0 ? (
        <div id="album-tracks" className="jl-album-listening">
          <nav className="jl-album-tags" aria-label={item.kind === 'standard' ? '本曲目的爵士分类' : '本专辑的爵士分类'}>{jazzCategories.filter((category) => item.categories?.includes(category.slug)).map((category) => <a key={category.slug} href={jazzCategoryPath(category.slug)}>{category.title} ↗</a>)}</nav>
          <JazzTrackPlayer tracks={tracks} album={item} title={item.title} description={item.description || item.note} />
        </div>
      ) : <div className="jp-focus__details">
        <div className="jp-focus__player">
          <div className="jp-focus__vinyl" aria-hidden="true">
            <span className="jp-focus__vinyl-label" aria-hidden="true">
              <Play size={18} fill="currentColor" />
            </span>
          </div>
          <img
            className="jp-focus__sleeve"
            src={coverUrl(item.cover)}
            alt={`${item.title} 封面`}
            draggable="false"
          />
        </div>

        <article className="jp-focus__note">
          <span>LISTENING NOTE</span>
          <h2>{item.title}</h2>
          {item.note && <p>{item.note}</p>}
          <dl>
            {item.artist && <><dt>Artist</dt><dd>{item.artist}</dd></>}
            {item.year && <><dt>Year</dt><dd>{item.year}</dd></>}
            <dt>Shelf</dt><dd>{item.shelves.join(' / ')}</dd>
          </dl>
        </article>
      </div>}
      {!!item.artworks?.length && <section className="jl-artworks" aria-label="专辑影像">
        <header><span className="jl-kicker">BEYOND THE SLEEVE</span><h2>Something else</h2><span>{item.artworks.length} IMAGES</span></header>
        <div>{item.artworks.map((image, artworkIndex) => <JazzArtwork key={image} src={image} alt={`${item.title} 专辑相关影像 ${artworkIndex + 1}`} />)}</div>
      </section>}
    </section>
  )
}

function AlbumLibrary({
  items,
  onSelect,
}: {
  items: JazzItem[]
  onSelect: (index: number) => void
}) {
  const [query, setQuery] = useState('')
  const visible = useMemo(() => {
    const value = query.trim().toLocaleLowerCase()
    if (!value) return items.map((item, index) => ({ item, index }))
    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => [item.title, item.artist, item.genre, ...item.shelves, ...(item.tracks ?? []).map((track) => track.title)]
        .filter(Boolean)
        .some((field) => field!.toLocaleLowerCase().includes(value)))
  }, [items, query])

  return (
    <section className="jp-library" id="jazz-library">
      <header className="jp-library__header">
        <div>
          <span>COMPLETE ARCHIVE</span>
          <h2>All records</h2>
        </div>
        <label>
          <Search size={15} />
          <span className="sr-only">搜索专辑</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the archive"
          />
        </label>
      </header>

      <div className="jp-library__summary">
        <span>{String(visible.length).padStart(2, '0')} / {String(items.length).padStart(2, '0')} RECORDS</span>
        <span>SELECT A RECORD · STAY A WHILE</span>
      </div>

      <div className="jp-library__grid">
        {visible.map(({ item, index }) => (
          <button type="button" onClick={() => onSelect(index)} key={item.id}>
            <span className="jp-library__hover-layer jp-library__hover-layer--amber" aria-hidden="true" />
            <span className="jp-library__hover-layer jp-library__hover-layer--coral" aria-hidden="true" />
            <span className="jp-library__hover-layer jp-library__hover-layer--blue" aria-hidden="true" />
            <span className="jp-library__index">{String(index + 1).padStart(2, '0')}</span>
            <img src={coverUrl(item.cover)} alt={`${item.title} 封面`} loading="lazy" decoding="async" />
            <span className="jp-library__copy">
              <strong>{item.title}</strong>
              <i>{itemMeta(item, index)}{item.tracks?.length ? ` · ${item.tracks.length} TRACKS / 可播放` : ''}</i>
            </span>
            <ArrowRight className="jp-library__arrow" size={17} />
          </button>
        ))}
      </div>
    </section>
  )
}

export default function JazzPrototype({ items, standardTrackCounts }: { items: JazzItem[]; standardTrackCounts?: Record<string, number> }) {
  const ordered = useMemo(() => [...items].sort((a, b) => a.order - b.order), [items])
  const featured = useMemo(() => {
    const selected = ordered.filter((item) => item.featured !== false)
    return selected.slice(0, 18)
  }, [ordered])
  const [focusedIndex, setFocusedIndex] = useState<number>()

  useEffect(() => {
    const albumId = new URLSearchParams(window.location.search).get('album')
    const albumIndex = albumId ? ordered.findIndex((item) => item.id === albumId) : -1
    if (albumIndex >= 0) setFocusedIndex(albumIndex)
  }, [ordered])

  const selectFeatured = (index: number) => {
    void navigate(jazzAlbumPath(featured[index].id))
  }

  const selectLibrary = (index: number) => {
    void navigate(jazzAlbumPath(ordered[index].id))
  }

  const moveFocus = (direction: number) => {
    setFocusedIndex((current) => {
      const next = current === undefined
        ? 0
        : (current + direction + ordered.length) % ordered.length
      writeAlbumToUrl(ordered[next])
      return next
    })
  }

  const clearFocus = () => {
    setFocusedIndex(undefined)
    writeAlbumToUrl()
  }

  const selectCategory = (category: JazzCategory) => {
    void navigate(jazzCategoryPath(category.slug as JazzCategorySlug))
  }

  return (
    <div className="jp-root">
      {focusedIndex === undefined ? (
        <>
          <CurtainArchive items={featured} onSelect={selectFeatured} />
          <JazzCategoryArchive items={ordered} standardTrackCounts={standardTrackCounts} onSelectCategory={selectCategory} />
          <AlbumLibrary items={ordered} onSelect={selectLibrary} />
        </>
      ) : (
        <FocusStage
          item={ordered[focusedIndex]}
          index={focusedIndex}
          total={ordered.length}
          onBack={clearFocus}
          onPrevious={() => moveFocus(-1)}
          onNext={() => moveFocus(1)}
        />
      )}
    </div>
  )
}
