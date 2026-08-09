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
  arrangeAnimeItems,
  createAnimeCanvasLayout,
  wrapCanvasOffset,
} from './anime-canvas-layout'
import {
  parallaxTargetForVelocity,
  stepAnimeParallaxAxis,
} from './anime-canvas-parallax'
import './anime-infinite-canvas.css'

export interface AnimeCanvasItem {
  id: string
  title: string
  cover: string
  shelves: string[]
  order: number
  character: string
  quote: string
  imageWidth: number
  imageHeight: number
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

interface ParallaxState {
  positionX: number
  positionY: number
  velocityX: number
  velocityY: number
  targetX: number
  targetY: number
  inputUntil: number
  lastTime: number
}

const initialCamera = { x: -72, y: -84 }
const tileOffsets = [[0, 0], [1, 0], [0, 1], [1, 1]] as const
const parallaxDepths = ['soft', 'medium', 'strong'] as const
const parallaxDepthScale = {
  soft: .86,
  medium: 1,
  strong: 1.14,
} as const

const cardImageSource = (source: string) => {
  const decoded = decodeURI(source)
  const extensionIndex = decoded.lastIndexOf('.')
  return encodeURI(`${decoded.slice(0, extensionIndex)}.w480.webp`)
}

const detailImageSource = (source: string) => encodeURI(decodeURI(source).replace(/^\/media\//, '/'))

export default function AnimeInfiniteCanvas({ items }: { items: AnimeCanvasItem[] }) {
  const arrangedItems = useMemo(() => arrangeAnimeItems(items), [items])
  const layouts = useMemo(() => ({
    desktop: createAnimeCanvasLayout(arrangedItems, 'desktop'),
    compact: createAnimeCanvasLayout(arrangedItems, 'compact'),
  }), [arrangedItems])
  const [compact, setCompact] = useState(false)
  const layout = compact ? layouts.compact : layouts.desktop
  const cards = useMemo(() => arrangedItems.map((item, index) => ({
    item,
    slot: layout.slots[index],
  })), [arrangedItems, layout])
  const [selected, setSelected] = useState<AnimeCanvasItem>()
  const [dragging, setDragging] = useState(false)
  const viewportRef = useRef<HTMLElement>(null)
  const planeRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const cameraRef = useRef(initialCamera)
  const dragRef = useRef<DragState | null>(null)
  const inertiaFrameRef = useRef<number | null>(null)
  const parallaxFrameRef = useRef<number | null>(null)
  const parallaxRef = useRef<ParallaxState>({
    positionX: 0,
    positionY: 0,
    velocityX: 0,
    velocityY: 0,
    targetX: 0,
    targetY: 0,
    inputUntil: 0,
    lastTime: 0,
  })
  const suppressClickUntilRef = useRef(0)
  const reducedMotionRef = useRef(false)

  const applyCamera = useCallback((x: number, y: number) => {
    const wrapped = {
      x: wrapCanvasOffset(x, layout.width),
      y: wrapCanvasOffset(y, layout.height),
    }
    cameraRef.current = wrapped
    if (planeRef.current) {
      planeRef.current.style.transform = `translate3d(${wrapped.x}px, ${wrapped.y}px, 0)`
    }
  }, [layout.height, layout.width])

  const stopInertia = useCallback(() => {
    if (inertiaFrameRef.current !== null) cancelAnimationFrame(inertiaFrameRef.current)
    inertiaFrameRef.current = null
  }, [])

  const paintParallax = useCallback((x: number, y: number) => {
    const plane = planeRef.current
    if (!plane) return
    for (const depth of parallaxDepths) {
      const scale = parallaxDepthScale[depth]
      plane.style.setProperty(`--anime-parallax-${depth}-x`, `${(x * scale * 100).toFixed(3)}%`)
      plane.style.setProperty(`--anime-parallax-${depth}-y`, `${(y * scale * 100).toFixed(3)}%`)
    }
  }, [])

  const startParallax = useCallback(() => {
    if (reducedMotionRef.current || parallaxFrameRef.current !== null) return
    const state = parallaxRef.current
    state.lastTime = performance.now()

    const tick = (time: number) => {
      const elapsed = Math.min(32, time - state.lastTime) / 1000
      state.lastTime = time
      if (time >= state.inputUntil) {
        state.targetX = 0
        state.targetY = 0
      }

      const horizontal = stepAnimeParallaxAxis(
        { position: state.positionX, velocity: state.velocityX },
        state.targetX,
        elapsed,
      )
      const vertical = stepAnimeParallaxAxis(
        { position: state.positionY, velocity: state.velocityY },
        state.targetY,
        elapsed,
      )
      state.positionX = horizontal.position
      state.positionY = vertical.position
      state.velocityX = horizontal.velocity
      state.velocityY = vertical.velocity
      paintParallax(state.positionX, state.positionY)

      const settled = state.targetX === 0
        && state.targetY === 0
        && Math.hypot(state.positionX, state.positionY) < .00002
        && Math.hypot(state.velocityX, state.velocityY) < .0002
      if (settled) {
        state.positionX = 0
        state.positionY = 0
        state.velocityX = 0
        state.velocityY = 0
        paintParallax(0, 0)
        parallaxFrameRef.current = null
        return
      }
      parallaxFrameRef.current = requestAnimationFrame(tick)
    }

    parallaxFrameRef.current = requestAnimationFrame(tick)
  }, [paintParallax])

  const driveParallax = useCallback((velocityX: number, velocityY: number) => {
    if (reducedMotionRef.current) return
    const state = parallaxRef.current
    const target = parallaxTargetForVelocity(velocityX, velocityY)
    state.targetX = target.x
    state.targetY = target.y
    state.inputUntil = performance.now() + 50
    startParallax()
  }, [startParallax])

  const settleParallax = useCallback(() => {
    const state = parallaxRef.current
    state.targetX = 0
    state.targetY = 0
    state.inputUntil = 0
    if (reducedMotionRef.current) {
      state.positionX = 0
      state.positionY = 0
      state.velocityX = 0
      state.velocityY = 0
      paintParallax(0, 0)
      return
    }
    startParallax()
  }, [paintParallax, startParallax])

  const stopParallax = useCallback(() => {
    if (parallaxFrameRef.current !== null) cancelAnimationFrame(parallaxFrameRef.current)
    parallaxFrameRef.current = null
    const state = parallaxRef.current
    state.positionX = 0
    state.positionY = 0
    state.velocityX = 0
    state.velocityY = 0
    state.targetX = 0
    state.targetY = 0
    state.inputUntil = 0
    paintParallax(0, 0)
  }, [paintParallax])

  const startInertia = useCallback((velocityX: number, velocityY: number) => {
    stopInertia()
    if (reducedMotionRef.current || Math.hypot(velocityX, velocityY) < .08) {
      settleParallax()
      return
    }
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
      driveParallax(velocityX, velocityY)
      if (Math.hypot(velocityX, velocityY) < .018) {
        inertiaFrameRef.current = null
        settleParallax()
        return
      }
      inertiaFrameRef.current = requestAnimationFrame(tick)
    }
    inertiaFrameRef.current = requestAnimationFrame(tick)
  }, [applyCamera, driveParallax, settleParallax, stopInertia])

  useEffect(() => {
    const compactQuery = matchMedia('(max-width: 760px)')
    const updateLayoutMode = () => setCompact(compactQuery.matches)
    updateLayoutMode()
    compactQuery.addEventListener('change', updateLayoutMode)
    reducedMotionRef.current = matchMedia('(prefers-reduced-motion: reduce)').matches
      || localStorage.getItem('aliouswe-motion') === 'reduced'
    applyCamera(cameraRef.current.x, cameraRef.current.y)
    return () => {
      compactQuery.removeEventListener('change', updateLayoutMode)
      stopInertia()
      stopParallax()
    }
  }, [applyCamera, stopInertia, stopParallax])

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
      driveParallax(drag.velocityX, drag.velocityY)
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
    driveParallax(horizontal / 300, vertical / 300)
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
          width: layout.width,
          height: layout.height,
          transform: `translate3d(${initialCamera.x}px, ${initialCamera.y}px, 0)`,
        }}
      >
        {tileOffsets.map(([tileX, tileY], tileIndex) => (
          <div
            className="anime-canvas-tile"
            key={`${tileX}-${tileY}`}
            aria-hidden={tileIndex === 0 ? undefined : true}
            style={{
              left: tileX * layout.width,
              top: tileY * layout.height,
              width: layout.width,
              height: layout.height,
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
                  height: slot.height,
                  '--anime-card-index': `'${String(index + 1).padStart(2, '0')}'`,
                } as CSSProperties}
                data-parallax-depth={parallaxDepths[index % parallaxDepths.length]}
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
                    width={item.imageWidth}
                    height={item.imageHeight}
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
