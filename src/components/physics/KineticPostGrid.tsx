import { useEffect, useRef } from 'react'
import { sharedFrameScheduler } from '../../lib/physics-2d/FixedStepScheduler'
import { formatDate } from '../../lib/site'
import './kinetic-post-grid.css'

export interface KineticPost {
  id: string
  title: string
  description?: string
  date: string
  space: string
  tags: string[]
  href: string
  readingMinutes: number
}

interface MotionState {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  angularVelocity: number
  mass: number
  dragging: boolean
  pointerX: number
  pointerY: number
}

export default function KineticPostGrid({ posts }: { posts: KineticPost[] }) {
  const cardRefs = useRef<Array<HTMLElement | null>>([])
  const states = useRef<MotionState[]>(posts.map((post) => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    mass: Math.min(2.4, .85 + post.readingMinutes * .12),
    dragging: false,
    pointerX: 0,
    pointerY: 0,
  })))

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce), (max-width: 700px)').matches || localStorage.getItem('aliouswe-motion') === 'reduced') return
    const unsubscribe = sharedFrameScheduler.subscribe((delta) => {
      states.current.forEach((state, index) => {
        if (state.dragging) {
          const targetX = state.pointerX
          const targetY = state.pointerY
          state.vx = (targetX - state.x) / Math.max(delta, .001)
          state.vy = (targetY - state.y) / Math.max(delta, .001)
          state.x = targetX
          state.y = targetY
          state.angle += (targetX * .045 - state.angle) * .16
        } else {
          const stiffness = 46 / state.mass
          const damping = 10 / Math.sqrt(state.mass)
          state.vx += (-state.x * stiffness - state.vx * damping) * delta
          state.vy += (-state.y * stiffness - state.vy * damping) * delta
          state.angularVelocity += (-state.angle * 36 - state.angularVelocity * 9) * delta
          state.x += state.vx * delta
          state.y += state.vy * delta
          state.angle += state.angularVelocity * delta
        }
        const element = cardRefs.current[index]
        if (element) element.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) rotate(${state.angle}deg)`
      })
    })
    return unsubscribe
  }, [])

  const startDrag = (index: number, event: React.PointerEvent<HTMLButtonElement>) => {
    const state = states.current[index]
    state.dragging = true
    state.pointerX = state.x
    state.pointerY = state.y
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDrag = (index: number, event: React.PointerEvent<HTMLButtonElement>) => {
    const state = states.current[index]
    if (!state.dragging) return
    state.pointerX += event.movementX
    state.pointerY += event.movementY
  }

  const stopDrag = (index: number) => {
    states.current[index].dragging = false
  }

  return (
    <div className="kinetic-post-grid">
      {posts.map((post, index) => (
        <article
          key={post.id}
          ref={(element) => { cardRefs.current[index] = element }}
          className="kinetic-post-card"
          data-space={post.space}
          style={{ '--mass': post.readingMinutes } as React.CSSProperties}
        >
          <div className="kinetic-meta"><span>{post.space}</span><time dateTime={post.date}>{formatDate(new Date(post.date))}</time></div>
          <h3><a href={post.href}>{post.title}</a></h3>
          {post.description && <p>{post.description}</p>}
          <footer><span>{post.tags.slice(0, 3).map((tag) => `#${tag}`).join(' · ')}</span><b>{post.readingMinutes} MIN</b></footer>
          <button
            className="kinetic-handle"
            type="button"
            aria-label={`拖动 ${post.title}`}
            onPointerDown={(event) => startDrag(index, event)}
            onPointerMove={(event) => moveDrag(index, event)}
            onPointerUp={() => stopDrag(index)}
            onPointerCancel={() => stopDrag(index)}
          >⠿</button>
        </article>
      ))}
    </div>
  )
}
