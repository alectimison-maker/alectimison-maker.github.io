import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'
import { sharedFrameScheduler } from '../../lib/physics-2d/FixedStepScheduler'
import { formatDate } from '../../lib/site'
import type { KineticPost } from './KineticPostGrid'
import './archive-release.css'

export default function ArchiveRelease({ posts }: { posts: KineticPost[] }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Array<HTMLElement | null>>([])
  const [released, setReleased] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    const stage = stageRef.current
    if (!released || !stage || matchMedia('(prefers-reduced-motion: reduce)').matches || localStorage.getItem('aliouswe-motion') === 'reduced') return

    const width = stage.clientWidth
    const height = stage.clientHeight
    const engine = Matter.Engine.create({ gravity: { x: 0, y: .65 } })
    const cardWidth = Math.min(260, width * .72)
    const cardHeight = 170
    const thickness = 70
    const bodies = posts.map((_post, index) => Matter.Bodies.rectangle(
      80 + (index * 173) % Math.max(180, width - 160),
      70 + Math.floor(index / Math.max(1, Math.floor(width / 280))) * 55,
      cardWidth,
      cardHeight,
      {
        restitution: .28,
        friction: .34,
        frictionAir: .048,
        density: .001 + posts[index].readingMinutes * .00008,
        angle: ((index % 5) - 2) * .035,
      },
    ))
    const bounds = [
      Matter.Bodies.rectangle(width / 2, height + thickness / 2, width + thickness * 2, thickness, { isStatic: true }),
      Matter.Bodies.rectangle(-thickness / 2, height / 2, thickness, height * 2, { isStatic: true }),
      Matter.Bodies.rectangle(width + thickness / 2, height / 2, thickness, height * 2, { isStatic: true }),
    ]
    Matter.Composite.add(engine.world, [...bodies, ...bounds])

    let drag: { body: Matter.Body; index: number; offsetX: number; offsetY: number } | undefined
    const pointerMove = (event: PointerEvent) => {
      if (!drag) return
      const rect = stage.getBoundingClientRect()
      Matter.Body.setPosition(drag.body, {
        x: event.clientX - rect.left - drag.offsetX,
        y: event.clientY - rect.top - drag.offsetY,
      })
      Matter.Body.setVelocity(drag.body, { x: event.movementX * 2.2, y: event.movementY * 2.2 })
    }
    const pointerUp = () => {
      if (!drag) return
      Matter.Body.setStatic(drag.body, false)
      drag = undefined
    }
    const startDrag = (index: number, event: PointerEvent) => {
      const body = bodies[index]
      const rect = stage.getBoundingClientRect()
      drag = {
        body,
        index,
        offsetX: event.clientX - rect.left - body.position.x,
        offsetY: event.clientY - rect.top - body.position.y,
      }
      Matter.Body.setStatic(body, true)
    }
    const handles = cardRefs.current.map((card, index) => {
      const handle = card?.querySelector<HTMLElement>('[data-archive-handle]')
      const listener = (event: PointerEvent) => startDrag(index, event)
      handle?.addEventListener('pointerdown', listener)
      return { handle, listener }
    })
    window.addEventListener('pointermove', pointerMove)
    window.addEventListener('pointerup', pointerUp)

    const unsubscribe = sharedFrameScheduler.subscribe((delta) => {
      Matter.Engine.update(engine, Math.min(delta, 1 / 30) * 1000)
      bodies.forEach((body, index) => {
        const element = cardRefs.current[index]
        if (!element) return
        element.style.transform = `translate3d(${body.position.x - cardWidth / 2}px, ${body.position.y - cardHeight / 2}px, 0) rotate(${body.angle}rad)`
      })
    })

    return () => {
      unsubscribe()
      window.removeEventListener('pointermove', pointerMove)
      window.removeEventListener('pointerup', pointerUp)
      handles.forEach(({ handle, listener }) => handle?.removeEventListener('pointerdown', listener))
      Matter.Engine.clear(engine)
    }
  }, [posts, released, resetKey])

  return (
    <div className={`archive-release ${released ? 'is-released' : ''}`}>
      <div className="archive-release__toolbar">
        <button type="button" onClick={() => setReleased((value) => !value)}>{released ? '恢复时间轴' : '释放归档'}</button>
        {released && <button type="button" onClick={() => setResetKey((value) => value + 1)}>重置碰撞</button>}
        <span>{released ? 'DRAG HANDLES · COLLISION LIVE' : 'CHRONOLOGICAL LIST'}</span>
      </div>
      <div className="archive-release__stage" ref={stageRef}>
        {posts.map((post, index) => (
          <article key={post.id} ref={(element) => { cardRefs.current[index] = element }} className="archive-release__card">
            <div><span>{post.space}</span><time dateTime={post.date}>{formatDate(new Date(post.date))}</time></div>
            <h2><a href={post.href}>{post.title}</a></h2>
            <p>{post.description}</p>
            <footer><span>{post.readingMinutes} MIN</span><button type="button" data-archive-handle aria-label={`拖动 ${post.title}`}>⠿</button></footer>
          </article>
        ))}
      </div>
    </div>
  )
}
