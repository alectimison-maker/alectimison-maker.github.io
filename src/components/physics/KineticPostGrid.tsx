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

interface MagnetState {
  x: number
  y: number
  vx: number
  vy: number
  targetX: number
  targetY: number
}

const MAGNET_STIFFNESS = 120
const MAGNET_DAMPING = 18
const MAGNET_MASS = 1
const MAGNETIC_STRENGTH = 0.32
const MAGNETIC_RADIUS = 180
const MAGNET_FIXED_DT = 1 / 60
const MAGNET_SUBSTEPS = 2

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
  const magnets = useRef<MagnetState[]>(posts.map(() => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    targetX: 0,
    targetY: 0,
  })))

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce), (max-width: 700px)').matches || localStorage.getItem('aliouswe-motion') === 'reduced') return
    let magnetAccumulator = 0

    const trackPointer = (event: PointerEvent) => {
      magnets.current.forEach((magnet, index) => {
        const card = cardRefs.current[index]
        if (!card) return
        const rect = card.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2 - magnet.x
        const centerY = rect.top + rect.height / 2 - magnet.y
        const dx = event.clientX - centerX
        const dy = event.clientY - centerY
        const distance = Math.hypot(dx, dy)
        if (distance < MAGNETIC_RADIUS) {
          const falloff = 1 - distance / MAGNETIC_RADIUS
          magnet.targetX = dx * MAGNETIC_STRENGTH * falloff
          magnet.targetY = dy * MAGNETIC_STRENGTH * falloff
        } else {
          magnet.targetX = 0
          magnet.targetY = 0
        }
      })
    }
    const releaseMagnets = () => {
      magnets.current.forEach((magnet) => {
        magnet.targetX = 0
        magnet.targetY = 0
      })
    }

    const unsubscribe = sharedFrameScheduler.subscribe((delta) => {
      magnetAccumulator = Math.min(magnetAccumulator + delta, 0.1)
      while (magnetAccumulator >= MAGNET_FIXED_DT) {
        const subDt = MAGNET_FIXED_DT / MAGNET_SUBSTEPS
        for (let substep = 0; substep < MAGNET_SUBSTEPS; substep += 1) {
          magnets.current.forEach((magnet) => {
            const forceX = -MAGNET_STIFFNESS * (magnet.x - magnet.targetX) - MAGNET_DAMPING * magnet.vx
            const forceY = -MAGNET_STIFFNESS * (magnet.y - magnet.targetY) - MAGNET_DAMPING * magnet.vy
            magnet.vx += forceX / MAGNET_MASS * subDt
            magnet.vy += forceY / MAGNET_MASS * subDt
            magnet.x += magnet.vx * subDt
            magnet.y += magnet.vy * subDt
          })
        }
        magnetAccumulator -= MAGNET_FIXED_DT
      }

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
        const magnet = magnets.current[index]
        if (element && magnet) {
          element.style.transform = `translate3d(${state.x + magnet.x}px, ${state.y + magnet.y}px, 0) rotate(${state.angle}deg)`
          element.dataset.magnetOffset = `${magnet.x.toFixed(1)},${magnet.y.toFixed(1)}`
        }
      })
    })
    window.addEventListener('pointermove', trackPointer, { passive: true })
    window.addEventListener('blur', releaseMagnets)
    document.documentElement.addEventListener('mouseleave', releaseMagnets)
    return () => {
      unsubscribe()
      window.removeEventListener('pointermove', trackPointer)
      window.removeEventListener('blur', releaseMagnets)
      document.documentElement.removeEventListener('mouseleave', releaseMagnets)
    }
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
