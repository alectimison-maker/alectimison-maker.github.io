import { useEffect, useMemo, useRef, useState } from 'react'
import Matter from 'matter-js'
import { sharedFrameScheduler } from '../../lib/physics-2d/FixedStepScheduler'
import './tension-collection.css'

export interface CollectionRecord {
  id: string
  title: string
  cover: string
  shelves: string[]
  order: number
}

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

export default function TensionCollection({ items, space }: { items: CollectionRecord[]; space: 'jazz' | 'anime' | 'coffee' }) {
  const shelves = useMemo(() => [...new Set(items.flatMap((item) => item.shelves))], [items])
  const [shelf, setShelf] = useState('all')
  const [suspended, setSuspended] = useState(false)
  const [selected, setSelected] = useState<CollectionRecord>()
  const stageRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Array<HTMLElement | null>>([])
  const lineRefs = useRef<Array<SVGLineElement | null>>([])

  const visible = useMemo(
    () => shelf === 'all' ? items : items.filter((item) => item.shelves.includes(shelf)),
    [items, shelf],
  )
  const physicalItems = useMemo(() => visible.slice(0, 18), [visible])

  useEffect(() => {
    const stage = stageRef.current
    if (!suspended || !stage || matchMedia('(prefers-reduced-motion: reduce)').matches || localStorage.getItem('aliouswe-motion') === 'reduced') return

    const width = stage.clientWidth
    const height = stage.clientHeight
    const mobile = width < 700
    const cardWidth = mobile ? 128 : 154
    const cardHeight = mobile ? 184 : 216
    const columns = Math.max(2, Math.floor(width / (cardWidth + 34)))
    const engine = Matter.Engine.create({ gravity: { x: 0, y: .42 } })
    const bodies = physicalItems.map((_item, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      return Matter.Bodies.rectangle(
        (column + .5) * (width / columns),
        155 + row * 28,
        cardWidth,
        cardHeight,
        {
          restitution: .2,
          friction: .32,
          frictionAir: .06,
          density: .0012,
          chamfer: { radius: 3 },
        },
      )
    })
    const constraints = bodies.map((body, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      return Matter.Constraint.create({
        pointA: { x: (column + .5) * (width / columns), y: 28 + row * 11 },
        bodyB: body,
        pointB: { x: 0, y: -cardHeight / 2 },
        length: 95 + (index % 4) * 16,
        stiffness: .085,
        damping: .12,
      })
    })
    const boundaries = [
      Matter.Bodies.rectangle(width / 2, height + 35, width + 100, 70, { isStatic: true }),
      Matter.Bodies.rectangle(-35, height / 2, 70, height * 2, { isStatic: true }),
      Matter.Bodies.rectangle(width + 35, height / 2, 70, height * 2, { isStatic: true }),
    ]
    Matter.Composite.add(engine.world, [...bodies, ...constraints, ...boundaries])

    let dragged: Matter.Body | undefined
    const pointerMove = (event: PointerEvent) => {
      if (!dragged) return
      const rect = stage.getBoundingClientRect()
      Matter.Body.setPosition(dragged, { x: event.clientX - rect.left, y: event.clientY - rect.top })
      Matter.Body.setVelocity(dragged, { x: event.movementX * 1.8, y: event.movementY * 1.8 })
    }
    const pointerUp = () => {
      if (!dragged) return
      Matter.Body.setStatic(dragged, false)
      dragged = undefined
    }
    const handlers = cardRefs.current.map((card, index) => {
      const handle = card?.querySelector<HTMLElement>('[data-tension-handle]')
      const down = () => {
        dragged = bodies[index]
        Matter.Body.setStatic(dragged, true)
      }
      handle?.addEventListener('pointerdown', down)
      return { handle, down }
    })
    window.addEventListener('pointermove', pointerMove)
    window.addEventListener('pointerup', pointerUp)

    const unsubscribe = sharedFrameScheduler.subscribe((delta) => {
      Matter.Engine.update(engine, Math.min(delta, 1 / 30) * 1000)
      bodies.forEach((body, index) => {
        const card = cardRefs.current[index]
        const line = lineRefs.current[index]
        const constraint = constraints[index]
        if (card) card.style.transform = `translate3d(${body.position.x - cardWidth / 2}px, ${body.position.y - cardHeight / 2}px, 0) rotate(${body.angle}rad)`
        if (line) {
          line.setAttribute('x1', String(constraint.pointA?.x ?? 0))
          line.setAttribute('y1', String(constraint.pointA?.y ?? 0))
          line.setAttribute('x2', String(body.position.x))
          line.setAttribute('y2', String(body.position.y - cardHeight / 2))
          const tension = Math.hypot(
            body.position.x - (constraint.pointA?.x ?? 0),
            body.position.y - cardHeight / 2 - (constraint.pointA?.y ?? 0),
          ) - (constraint.length ?? 0)
          line.style.stroke = tension > 38 ? '#ff654d' : tension > 18 ? '#edff31' : 'currentColor'
        }
      })
    })

    return () => {
      unsubscribe()
      window.removeEventListener('pointermove', pointerMove)
      window.removeEventListener('pointerup', pointerUp)
      handlers.forEach(({ handle, down }) => handle?.removeEventListener('pointerdown', down))
      Matter.Engine.clear(engine)
    }
  }, [physicalItems, suspended])

  return (
    <div className={`tension-collection tension-collection--${space} ${suspended ? 'is-suspended' : ''}`}>
      <div className="tension-toolbar">
        <div className="tension-tabs" role="group" aria-label="收藏分组">
          <button className={shelf === 'all' ? 'active' : ''} type="button" onClick={() => setShelf('all')}>全部 <span>{items.length}</span></button>
          {shelves.map((name) => <button className={shelf === name ? 'active' : ''} type="button" onClick={() => setShelf(name)} key={name}>{name}</button>)}
        </div>
        <button className="tension-mode" type="button" onClick={() => setSuspended((value) => !value)}>{suspended ? '网格视图' : '悬挂视图'}</button>
      </div>

      {suspended && visible.length > physicalItems.length && <p className="tension-note">悬挂视图展示当前分组前 {physicalItems.length} 项；全部 {visible.length} 项仍可在网格视图浏览。</p>}

      <div className="tension-stage" ref={stageRef}>
        {suspended && (
          <svg aria-hidden="true">
            {physicalItems.map((item, index) => <line key={item.id} ref={(element) => { lineRefs.current[index] = element }} />)}
          </svg>
        )}
        {(suspended ? physicalItems : visible).map((item, index) => (
          <article key={item.id} ref={(element) => { cardRefs.current[index] = element }} className="tension-card">
            <button className="tension-card__open" type="button" onClick={() => setSelected(item)}>
              <picture>
                <source srcSet={optimizedAvif(item.cover)} type="image/avif" />
                <img src={optimized(item.cover)} alt={`${item.title} 封面`} loading="lazy" decoding="async" />
              </picture>
              <span>{item.title}</span>
            </button>
            {suspended && <button type="button" className="tension-handle" data-tension-handle aria-label={`拖动 ${item.title}`}>⠿</button>}
          </article>
        ))}
      </div>

      {selected && (
        <dialog open className="tension-dialog" onClick={(event) => { if (event.target === event.currentTarget) setSelected(undefined) }}>
          <div>
            <button type="button" className="tension-dialog__close" onClick={() => setSelected(undefined)}>×</button>
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
