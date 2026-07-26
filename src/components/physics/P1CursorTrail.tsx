import { useEffect, useRef } from 'react'
import './p1-cursor-trail.css'

interface Point {
  x: number
  y: number
}

class SpringPoint {
  position: Point
  velocity: Point = { x: 0, y: 0 }

  constructor(position: Point) {
    this.position = { ...position }
  }

  step(dt: number, target: Point, stiffness: number, damping: number, mass: number, substeps: number) {
    const iterations = Math.max(1, Math.round(substeps))
    const subDt = dt / iterations
    const safeMass = Math.max(0.001, mass)

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const displacementX = this.position.x - target.x
      const displacementY = this.position.y - target.y
      const forceX = -stiffness * displacementX - damping * this.velocity.x
      const forceY = -stiffness * displacementY - damping * this.velocity.y
      this.velocity.x += forceX / safeMass * subDt
      this.velocity.y += forceY / safeMass * subDt
      this.position.x += this.velocity.x * subDt
      this.position.y += this.velocity.y * subDt
    }
  }
}

class FixedStepClock {
  private previousTimeMs: number | null = null
  private accumulator = 0

  update(nowMs: number, onStep: (dt: number) => void) {
    if (this.previousTimeMs === null) {
      this.previousTimeMs = nowMs
      return
    }
    const rawDelta = Math.max(0, (nowMs - this.previousTimeMs) / 1000)
    this.previousTimeMs = nowMs
    this.accumulator += Math.min(rawDelta, 0.1)
    let steps = 0
    while (this.accumulator >= 1 / 60 && steps < 12) {
      onStep(1 / 60)
      this.accumulator -= 1 / 60
      steps += 1
    }
    if (steps === 12 && this.accumulator >= 1 / 60) this.accumulator = 0
  }
}

const NODE_COUNT = 5
const STIFFNESS = 120
const DAMPING = 18
const MASS = 1
const SUBSTEPS = 2

export default function P1CursorTrail() {
  const nodesRef = useRef<Array<HTMLSpanElement | null>>([])

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!finePointer || reducedMotion) return

    const springs = Array.from({ length: NODE_COUNT }, () => new SpringPoint({ x: -100, y: -100 }))
    const pointer = { x: -100, y: -100 }
    const clock = new FixedStepClock()
    let frameId = 0
    let visible = false

    const move = (event: PointerEvent) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
      visible = !(event.target instanceof Element && event.target.closest('[data-particle-host]'))
    }
    const leave = () => { visible = false }

    const tick = (now: number) => {
      clock.update(now, (dt) => {
        springs.forEach((spring, index) => {
          const target = index === 0 ? pointer : springs[index - 1].position
          const stiffnessScale = Math.max(0.42, 1 - index * 0.12)
          spring.step(
            dt,
            target,
            STIFFNESS * stiffnessScale,
            DAMPING,
            MASS + index * 0.08,
            SUBSTEPS,
          )
        })
      })
      springs.forEach((spring, index) => {
        const node = nodesRef.current[index]
        if (!node) return
        node.style.opacity = visible ? String(1 - index * 0.16) : '0'
        node.style.transform = `translate3d(${spring.position.x}px, ${spring.position.y}px, 0) translate(-50%, -50%)`
      })
      frameId = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('mouseleave', leave)
    frameId = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('mouseleave', leave)
      cancelAnimationFrame(frameId)
    }
  }, [])

  return (
    <div className="p1-cursor-trail" data-p1-cursor aria-hidden="true">
      {Array.from({ length: NODE_COUNT }, (_, index) => (
        <span key={index} ref={(node) => { nodesRef.current[index] = node }} data-node={index} />
      ))}
    </div>
  )
}
