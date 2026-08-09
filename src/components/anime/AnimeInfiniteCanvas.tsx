import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  ANIME_CANVAS_SLOTS,
  ANIME_WORLD_HEIGHT,
  ANIME_WORLD_WIDTH,
  arrangeAnimeItems,
  wrapCanvasOffset,
} from './anime-canvas-layout'
import './anime-infinite-canvas.css'

export interface AnimeCanvasItem {
  id: string
  title: string
  cover: string
  shelves: string[]
  order: number
  character: string
  quote: string
}

interface DragState {
  pointerId: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  lastTime: number
  velocityX: number
  velocityY: number
  moved: boolean
}

const initialCamera = { x: -72, y: -84 }
const tileOffsets = [[0, 0], [1, 0], [0, 1], [1, 1]] as const

const cardImageSource = (source: string) => {
  const decoded = decodeURI(source)
  const extensionIndex = decoded.lastIndexOf('.')
  return encodeURI(`${decoded.slice(0, extensionIndex)}.w480.webp`)
}

const detailImageSource = (source: string) => encodeURI(decodeURI(source).replace(/^\/media\//, '/'))

export default function AnimeInfiniteCanvas({ items }: { items: AnimeCanvasItem[] }) {
  const arrangedItems = useMemo(() => arrangeAnimeItems(items), [items])
  const cards = useMemo(() => arrangedItems.map((item, index) => ({
    item,
    slot: ANIME_CANVAS_SLOTS[index],
  })), [arrangedItems])
  const [selected, setSelected] = useState<AnimeCanvasItem>()
  const [dragging, setDragging] = useState(false)
  const viewportRef = useRef<HTMLElement>(null)
  const planeRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const cameraRef = useRef(initialCamera)
  const dragRef = useRef<DragState | null>(null)
  const inertiaFrameRef = useRef<number | null>(null)
  const suppressClickUntilRef = useRef(0)
  const reducedMotionRef = useRef(false)

  const applyCamera = useCallback((x: number, y: number) => {
    const wrapped = {
      x: wrapCanvasOffset(x, ANIME_WORLD_WIDTH),
      y: wrapCanvasOffset(y, ANIME_WORLD_HEIGHT),
    }
    cameraRef.current = wrapped
    if (planeRef.current) {
      planeRef.current.style.transform = `translate3d(${wrapped.x}px, ${wrapped.y}px, 0)`
    }
  }, [])

  const stopInertia = useCallback(() => {
    if (inertiaFrameRef.current !== null) cancelAnimationFrame(inertiaFrameRef.current)
    inertiaFrameRef.current = null
  }, [])

  const startInertia = useCallback((velocityX: number, velocityY: number) => {
    stopInertia()
    if (reducedMotionRef.current || Math.hypot(velocityX, velocityY) < .08) return
    let lastTime = performance.now()
    const tick = (time: number) => {
      const elapsed = Math.min(32, time - lastTime)
      lastTime = time
      const damping = Math.pow(.9, elapsed / 16.67)
      velocityX *= damping
      velocityY *= damping
      applyCamera(
        cameraRef.current.x + velocityX * elapsed,
        cameraRef.current.y + velocityY * elapsed,
      )
      if (Math.hypot(velocityX, velocityY) < .018) {
        inertiaFrameRef.current = null
        return
      }
      inertiaFrameRef.current = requestAnimationFrame(tick)
    }
    inertiaFrameRef.current = requestAnimationFrame(tick)
  }, [applyCamera, stopInertia])

  useEffect(() => {
    reducedMotionRef.current = matchMedia('(prefers-reduced-motion: reduce)').matches
      || localStorage.getItem('aliouswe-motion') === 'reduced'
    applyCamera(cameraRef.current.x, cameraRef.current.y)
    return stopInertia
  }, [applyCamera, stopInertia])

  useEffect(() => {
    if (!selected) return
    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelected(undefined)
        requestAnimationFrame(() => openerRef.current?.focus())
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected])

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || selected) return
    stopInertia()
    const now = performance.now()
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: now,
      velocityX: 0,
      velocityY: 0,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.lastX
    const deltaY = event.clientY - drag.lastY
    const now = performance.now()
    const elapsed = Math.max(1, now - drag.lastTime)
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6) {
      drag.moved = true
      setDragging(true)
    }
    if (drag.moved) {
      event.preventDefault()
      applyCamera(cameraRef.current.x + deltaX, cameraRef.current.y + deltaY)
      drag.velocityX = drag.velocityX * .58 + deltaX / elapsed * .42
      drag.velocityY = drag.velocityY * .58 + deltaY / elapsed * .42
    }
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    drag.lastTime = now
  }

  const releasePointer = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (drag.moved) {
      suppressClickUntilRef.current = performance.now() + 360
      startInertia(drag.velocityX, drag.velocityY)
    }
    setDragging(false)
  }

  const openDetails = (item: AnimeCanvasItem, opener: HTMLButtonElement) => {
    if (performance.now() < suppressClickUntilRef.current) return
    openerRef.current = opener
    setSelected(item)
  }

  const closeDetails = () => {
    setSelected(undefined)
    requestAnimationFrame(() => openerRef.current?.focus())
  }

  const ensureCardVisible = (card: HTMLButtonElement) => {
    const viewport = viewportRef.current
    if (!viewport) return
    const viewportBounds = viewport.getBoundingClientRect()
    const cardBounds = card.getBoundingClientRect()
    const inset = 24
    const outside = cardBounds.right < viewportBounds.left + inset
      || cardBounds.left > viewportBounds.right - inset
      || cardBounds.bottom < viewportBounds.top + inset
      || cardBounds.top > viewportBounds.bottom - inset
    if (!outside) return
    applyCamera(
      cameraRef.current.x + viewportBounds.left + viewportBounds.width / 2 - (cardBounds.left + cardBounds.width / 2),
      cameraRef.current.y + viewportBounds.top + viewportBounds.height / 2 - (cardBounds.top + cardBounds.height / 2),
    )
  }

  const onCanvasKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    stopInertia()
    const distance = event.shiftKey ? 360 : 120
    const horizontal = event.key === 'ArrowLeft' ? distance : event.key === 'ArrowRight' ? -distance : 0
    const vertical = event.key === 'ArrowUp' ? distance : event.key === 'ArrowDown' ? -distance : 0
    applyCamera(cameraRef.current.x + horizontal, cameraRef.current.y + vertical)
  }

  return (
    <section
      className={`anime-infinite-canvas ${dragging ? 'is-dragging' : ''}`}
      ref={viewportRef}
      aria-label="动画封面无限画布"
      aria-describedby="anime-canvas-instructions"
      tabIndex={0}
      onKeyDown={onCanvasKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
    >
      <p className="sr-only" id="anime-canvas-instructions">
        拖动画布浏览全部动画封面，点击封面查看角色摘句；也可以使用方向键移动画布。
      </p>

      <div
        className="anime-canvas-plane"
        ref={planeRef}
        style={{
          width: ANIME_WORLD_WIDTH,
          height: ANIME_WORLD_HEIGHT,
          transform: `translate3d(${initialCamera.x}px, ${initialCamera.y}px, 0)`,
        }}
      >
        {tileOffsets.map(([tileX, tileY], tileIndex) => (
          <div
            className="anime-canvas-tile"
            key={`${tileX}-${tileY}`}
            aria-hidden={tileIndex === 0 ? undefined : true}
            style={{
              left: tileX * ANIME_WORLD_WIDTH,
              top: tileY * ANIME_WORLD_HEIGHT,
              width: ANIME_WORLD_WIDTH,
              height: ANIME_WORLD_HEIGHT,
            }}
          >
            {cards.map(({ item, slot }, index) => (
              <article
                className="anime-canvas-card"
                key={`${tileIndex}-${item.id}`}
                style={{
                  left: slot.x,
                  top: slot.y,
                  width: slot.width,
                  '--anime-card-index': `'${String(index + 1).padStart(2, '0')}'`,
                } as CSSProperties}
              >
                <button
                  type="button"
                  tabIndex={tileIndex === 0 ? 0 : -1}
                  aria-label={`查看《${item.title}》的角色摘句`}
                  onClick={(event) => openDetails(item, event.currentTarget)}
                  onFocus={(event) => ensureCardVisible(event.currentTarget)}
                >
                  <img
                    src={cardImageSource(item.cover)}
                    alt={`${item.title} 封面`}
                    loading={tileIndex === 0 && index < 4 ? 'eager' : 'lazy'}
                    decoding="async"
                    draggable="false"
                  />
                  <span>{item.title}</span>
                </button>
              </article>
            ))}
          </div>
        ))}
      </div>

      <div className="anime-canvas-chrome" aria-hidden="true">
        <strong>ANIME</strong>
        <span className="anime-canvas-chrome__count">{items.length.toString().padStart(3, '0')}</span>
        <span className="anime-canvas-chrome__drag">DRAG TO ROAM</span>
        <i />
      </div>

      {selected && (
        <div className="anime-detail-layer">
          <div className="anime-detail-scrim" aria-hidden="true" onClick={closeDetails} />
          <aside
            className="anime-detail-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="anime-detail-title"
            onKeyDown={(event) => {
              if (event.key !== 'Tab') return
              event.preventDefault()
              closeButtonRef.current?.focus()
            }}
          >
            <button ref={closeButtonRef} className="anime-detail-close" type="button" onClick={closeDetails}>
              <span>关闭</span> ×
            </button>
            <div className="anime-detail-index">ANIME / {String(selected.order + 1).padStart(3, '0')}</div>
            <img src={detailImageSource(selected.cover)} alt={`${selected.title} 封面`} />
            <div className="anime-detail-copy">
              <p>{selected.shelves.join(' / ')}</p>
              <h2 id="anime-detail-title">{selected.title}</h2>
              <blockquote>
                <p>“{selected.quote}”</p>
                <cite>— {selected.character}</cite>
              </blockquote>
              <small>角色台词主题意译</small>
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}
