import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Matter from 'matter-js'
import p0 from '../../data/p0.json'
import { sharedFrameScheduler } from '../../lib/physics-2d/FixedStepScheduler'
import type { CollectionRecord } from './TensionCollection'
import './p0-album-world.css'

const optimized = (source: string, width = 480) => {
  const decoded = decodeURI(source)
  const extensionIndex = decoded.lastIndexOf('.')
  return encodeURI(`${decoded.slice(0, extensionIndex)}.w${width}.webp`)
}

const optimizedAvif = (source: string, width = 960) => {
  const decoded = decodeURI(source)
  const extensionIndex = decoded.lastIndexOf('.')
  return encodeURI(`${decoded.slice(0, extensionIndex)}.w${width}.avif`)
}

const createRandom = (seed = 1947) => () => {
  seed |= 0
  seed = seed + 0x6d2b79f5 | 0
  let value = Math.imul(seed ^ seed >>> 15, 1 | seed)
  value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value
  return ((value ^ value >>> 14) >>> 0) / 4294967296
}

const cardMetrics = (width: number, height: number, count: number, compact: boolean) => {
  if (compact) {
    const targetArea = width * height * .38 / Math.max(1, count)
    const fluidWidth = Math.sqrt(targetArea / 1.42)
    const minimum = width < 520 ? 38 : 56
    const maximum = width < 520 ? 54 : width < 860 ? 72 : 88
    const cardWidth = Math.max(minimum, Math.min(maximum, fluidWidth))
    return { cardWidth, cardHeight: cardWidth * 1.42 }
  }
  if (width < 520) {
    const cardWidth = Math.max(82, Math.min(106, width * .27))
    return { cardWidth, cardHeight: cardWidth * 1.42 }
  }
  if (width < 860) return { cardWidth: 124, cardHeight: 176 }
  return { cardWidth: 154, cardHeight: 216 }
}

interface P0AlbumWorldProps {
  items: CollectionRecord[]
  compact?: boolean
  allowStaticView?: boolean
}

export default function P0AlbumWorld({ items, compact = false, allowStaticView = false }: P0AlbumWorldProps) {
  const shelves = useMemo(() => [...new Set(items.flatMap((item) => item.shelves))], [items])
  const [shelf, setShelf] = useState('all')
  const [selected, setSelected] = useState<CollectionRecord>()
  const [motionAllowed, setMotionAllowed] = useState(false)
  const [physicsMode, setPhysicsMode] = useState(!allowStaticView)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const [resetRevision, setResetRevision] = useState(0)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cardRefs = useRef<Record<string, HTMLElement | null>>({})
  const disturbRef = useRef<() => void>(() => undefined)
  const suppressClickRef = useRef(new Set<string>())

  const visible = useMemo(
    () => shelf === 'all' ? items : items.filter((item) => item.shelves.includes(shelf)),
    [items, shelf],
  )
  const live = physicsMode && motionAllowed
  const metrics = cardMetrics(stageSize.width, stageSize.height, visible.length, compact)
  const stageStyle = {
    '--p0-card-width': `${metrics.cardWidth}px`,
    '--p0-card-height': `${metrics.cardHeight}px`,
  } as CSSProperties

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
      || localStorage.getItem('aliouswe-motion') === 'reduced'
    setMotionAllowed(!reduced)
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const measure = () => {
      const next = { width: Math.round(stage.clientWidth), height: Math.round(stage.clientHeight) }
      setStageSize((current) => current.width === next.width && current.height === next.height ? current : next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    const width = stageSize.width
    const height = stageSize.height
    if (!live || !stage || !canvas || !width || !height || !visible.length) return

    const random = createRandom(1947 + resetRevision)
    const { cardWidth, cardHeight } = cardMetrics(width, height, visible.length, compact)
    const engine = Matter.Engine.create()
    engine.gravity.x = 0
    engine.gravity.y = 1
    engine.gravity.scale = p0.gravity / 1_000_000

    const frictionAir = 1 - Math.exp(-p0.airDamping / 60)
    const columns = Math.max(2, Math.floor((width - 24) / (cardWidth + 18)))
    const rows = Math.ceil(visible.length / columns)
    const rowGap = Math.max(36, Math.min(cardHeight * .38, (height * .46) / Math.max(1, rows)))
    const bodies = visible.map((_item, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const cellWidth = (width - cardWidth - 32) / Math.max(1, columns - 1)
      const body = Matter.Bodies.rectangle(
        16 + cardWidth / 2 + column * cellWidth + (random() - .5) * Math.min(24, cellWidth * .2),
        22 + cardHeight / 2 + row * rowGap + random() * 18,
        cardWidth,
        cardHeight,
        {
          restitution: p0.restitution,
          friction: p0.surfaceFriction,
          frictionStatic: p0.surfaceFriction,
          frictionAir,
          density: .0011,
          chamfer: { radius: 2 },
        },
      )
      Matter.Body.setVelocity(body, {
        x: (random() - .5) * 3.15,
        y: (random() - .5) * 1.15,
      })
      Matter.Body.setAngularVelocity(body, (random() - .5) * .055)
      Matter.Body.setAngle(body, (random() - .5) * .22)
      return body
    })

    const wallSize = 120
    const walls = [
      Matter.Bodies.rectangle(width / 2, -wallSize / 2, width + wallSize * 2, wallSize, { isStatic: true }),
      Matter.Bodies.rectangle(width / 2, height + wallSize / 2, width + wallSize * 2, wallSize, { isStatic: true }),
      Matter.Bodies.rectangle(-wallSize / 2, height / 2, wallSize, height + wallSize * 2, { isStatic: true }),
      Matter.Bodies.rectangle(width + wallSize / 2, height / 2, wallSize, height + wallSize * 2, { isStatic: true }),
    ]
    Matter.Composite.add(engine.world, [...bodies, ...walls])

    const pixelRatio = Math.min(devicePixelRatio, 2)
    canvas.width = Math.round(width * pixelRatio)
    canvas.height = Math.round(height * pixelRatio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const context = canvas.getContext('2d')
    context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

    let drag:
      | {
        body: Matter.Body
        item: CollectionRecord
        pointerId: number
        startX: number
        startY: number
        moved: boolean
        constraint: Matter.Constraint
      }
      | undefined

    const pointerPosition = (event: PointerEvent) => {
      const bounds = stage.getBoundingClientRect()
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
    }
    const pointerMove = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return
      const position = pointerPosition(event)
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5) drag.moved = true
      drag.constraint.pointA = position
    }
    const releaseDrag = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return
      if (drag.moved) suppressClickRef.current.add(drag.item.id)
      Matter.Composite.remove(engine.world, drag.constraint)
      drag = undefined
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId)
    }
    const handlers = visible.map((item, index) => {
      const card = cardRefs.current[item.id]
      const pointerDown = (event: PointerEvent) => {
        if (!matchMedia('(pointer: fine)').matches || event.button !== 0 || drag) return
        event.preventDefault()
        const point = pointerPosition(event)
        const body = bodies[index]
        const localPoint = Matter.Vector.rotate(Matter.Vector.sub(point, body.position), -body.angle)
        const constraint = Matter.Constraint.create({
          pointA: point,
          bodyB: body,
          pointB: localPoint,
          stiffness: .22,
          damping: .12,
          length: 0,
        })
        drag = {
          body,
          item,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          moved: false,
          constraint,
        }
        Matter.Composite.add(engine.world, constraint)
        stage.setPointerCapture(event.pointerId)
      }
      card?.addEventListener('pointerdown', pointerDown)
      return { card, pointerDown }
    })
    stage.addEventListener('pointermove', pointerMove)
    stage.addEventListener('pointerup', releaseDrag)
    stage.addEventListener('pointercancel', releaseDrag)

    disturbRef.current = () => {
      bodies.forEach((body, index) => {
        Matter.Body.setVelocity(body, {
          x: (index % 2 ? -1 : 1) * (4 + random() * 5),
          y: -5 - random() * 6,
        })
        Matter.Body.setAngularVelocity(body, (random() - .5) * .16)
      })
    }

    const renderBodies = () => {
      bodies.forEach((body, index) => {
        const card = cardRefs.current[visible[index].id]
        if (!card) return
        card.style.transform = `translate3d(${body.position.x - cardWidth / 2}px, ${body.position.y - cardHeight / 2}px, 0) rotate(${body.angle}rad)`
      })
    }
    renderBodies()

    let accumulator = 0
    const fixedDt = p0.fixedDt
    const unsubscribe = sharedFrameScheduler.subscribe((frameDelta) => {
      accumulator += Math.min(frameDelta, p0.maxFrameDelta) * p0.timeScale
      let steps = 0
      while (accumulator >= fixedDt && steps < 12) {
        for (let substep = 0; substep < p0.substeps; substep += 1) {
          Matter.Engine.update(engine, fixedDt * 1000 / p0.substeps)
        }
        accumulator -= fixedDt
        steps += 1
      }
      if (steps === 12 && accumulator >= fixedDt) accumulator %= fixedDt

      if (context && p0.showTrails) {
        context.globalCompositeOperation = 'destination-out'
        context.fillStyle = 'rgba(0,0,0,.13)'
        context.fillRect(0, 0, width, height)
        context.globalCompositeOperation = 'source-over'
        bodies.forEach((body, index) => {
          context.save()
          context.translate(body.position.x, body.position.y)
          context.rotate(body.angle)
          context.strokeStyle = index % 3 === 0
            ? 'rgba(42,82,225,.18)'
            : index % 3 === 1
              ? 'rgba(245,48,55,.15)'
              : 'rgba(0,116,90,.15)'
          context.lineWidth = 1
          context.strokeRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight)
          context.restore()
        })
      }
      renderBodies()
    })

    return () => {
      disturbRef.current = () => undefined
      unsubscribe()
      handlers.forEach(({ card, pointerDown }) => card?.removeEventListener('pointerdown', pointerDown))
      visible.forEach((item) => cardRefs.current[item.id]?.style.removeProperty('transform'))
      stage.removeEventListener('pointermove', pointerMove)
      stage.removeEventListener('pointerup', releaseDrag)
      stage.removeEventListener('pointercancel', releaseDrag)
      Matter.Engine.clear(engine)
      if (context) context.clearRect(0, 0, width, height)
    }
  }, [compact, live, resetRevision, stageSize, visible])

  return (
    <div className={`p0-album-world ${compact ? 'is-compact' : ''} ${live ? 'is-live' : 'is-static'}`}>
      <div className="p0-album-toolbar">
        <div className="p0-album-tabs" role="group" aria-label="专辑分组">
          <button className={shelf === 'all' ? 'active' : ''} type="button" onClick={() => setShelf('all')}>
            全部 <span>{items.length}</span>
          </button>
          {shelves.map((name) => (
            <button className={shelf === name ? 'active' : ''} type="button" onClick={() => setShelf(name)} key={name}>{name}</button>
          ))}
        </div>
        <div className="p0-album-controls">
          {allowStaticView && (
            <button
              className="p0-album-mode"
              type="button"
              onClick={() => setPhysicsMode((value) => !value)}
            >
              {physicsMode ? '直接查看' : 'P0 碰撞'}
            </button>
          )}
          {(!allowStaticView || live) && (
            <span>P0 / {p0.preset.toUpperCase()} · {(p0.fixedDt * 1000).toFixed(2)} MS · {p0.substeps.toString().padStart(2, '0')} SUBSTEPS</span>
          )}
          {live && <button type="button" onClick={() => setResetRevision((value) => value + 1)}>重置</button>}
          {live && <button type="button" onClick={() => disturbRef.current()}>扰动</button>}
        </div>
      </div>

      <div className="p0-album-stage" ref={stageRef} data-show-bounds={p0.showBounds} style={stageStyle}>
        <canvas ref={canvasRef} aria-hidden="true" />
        <div className="p0-album-stage__label" aria-hidden="true">
          <span>P0 / CARD BODY WORLD</span>
          <span>{visible.length.toString().padStart(2, '0')} ACTIVE / {p0.particleCount} PRESET CAP.</span>
        </div>
        {visible.map((item) => (
          <article
            key={item.id}
            ref={(element) => { cardRefs.current[item.id] = element }}
            className="p0-album-card"
          >
            <button
              className="p0-album-card__open"
              type="button"
              onClick={() => {
                if (suppressClickRef.current.delete(item.id)) return
                setSelected(item)
              }}
            >
              <picture>
                <source srcSet={optimizedAvif(item.cover)} type="image/avif" />
                <img src={optimized(item.cover)} alt={`${item.title} 封面`} loading="lazy" decoding="async" draggable="false" />
              </picture>
              <span>{item.title}</span>
            </button>
          </article>
        ))}
      </div>

      {selected && (
        <dialog open className="p0-album-dialog" onClick={(event) => { if (event.target === event.currentTarget) setSelected(undefined) }}>
          <div>
            <button type="button" className="p0-album-dialog__close" onClick={() => setSelected(undefined)}>×</button>
            <picture>
              <source srcSet={optimizedAvif(selected.cover)} type="image/avif" />
              <img src={optimized(selected.cover, 960)} alt={`${selected.title} 封面`} />
            </picture>
            <h2>{selected.title}</h2>
            <p>{selected.shelves.join(' / ')}</p>
          </div>
        </dialog>
      )}
    </div>
  )
}
