import { useEffect, useRef } from 'react'
import { sharedFrameScheduler } from '../../lib/physics-2d/FixedStepScheduler'
import './magnetic-space-grid.css'

export interface MagneticSpace {
  href: string
  number: string
  label: string
  description: string
}

interface MagnetState {
  x: number
  y: number
  vx: number
  vy: number
  targetX: number
  targetY: number
}

const STIFFNESS = 120
const DAMPING = 18
const MASS = 1
const MAGNETIC_STRENGTH = 0.32
const INFLUENCE_RADIUS = 180
const FIXED_DT = 1 / 60
const SUBSTEPS = 2

export default function MagneticSpaceGrid({ spaces }: { spaces: MagneticSpace[] }) {
  const cardRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const magnets = useRef<MagnetState[]>(spaces.map(() => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    targetX: 0,
    targetY: 0,
  })))

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches) return
    let accumulator = 0

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

        if (distance < INFLUENCE_RADIUS) {
          const falloff = 1 - distance / INFLUENCE_RADIUS
          magnet.targetX = dx * MAGNETIC_STRENGTH * falloff
          magnet.targetY = dy * MAGNETIC_STRENGTH * falloff
        } else {
          magnet.targetX = 0
          magnet.targetY = 0
        }
      })
    }

    const release = () => {
      magnets.current.forEach((magnet) => {
        magnet.targetX = 0
        magnet.targetY = 0
      })
    }

    const unsubscribe = sharedFrameScheduler.subscribe((delta) => {
      accumulator = Math.min(accumulator + delta, 0.1)
      while (accumulator >= FIXED_DT) {
        const subDt = FIXED_DT / SUBSTEPS
        for (let substep = 0; substep < SUBSTEPS; substep += 1) {
          magnets.current.forEach((magnet) => {
            const forceX = -STIFFNESS * (magnet.x - magnet.targetX) - DAMPING * magnet.vx
            const forceY = -STIFFNESS * (magnet.y - magnet.targetY) - DAMPING * magnet.vy
            magnet.vx += forceX / MASS * subDt
            magnet.vy += forceY / MASS * subDt
            magnet.x += magnet.vx * subDt
            magnet.y += magnet.vy * subDt
          })
        }
        accumulator -= FIXED_DT
      }

      magnets.current.forEach((magnet, index) => {
        const card = cardRefs.current[index]
        if (!card) return
        card.style.setProperty('--magnet-x', `${magnet.x.toFixed(2)}px`)
        card.style.setProperty('--magnet-y', `${magnet.y.toFixed(2)}px`)
        card.dataset.offset = `${magnet.x.toFixed(1)},${magnet.y.toFixed(1)}`
      })
    })

    window.addEventListener('pointermove', trackPointer, { passive: true })
    window.addEventListener('blur', release)
    document.documentElement.addEventListener('mouseleave', release)
    return () => {
      unsubscribe()
      window.removeEventListener('pointermove', trackPointer)
      window.removeEventListener('blur', release)
      document.documentElement.removeEventListener('mouseleave', release)
    }
  }, [])

  return (
    <div className="magnetic-space-grid">
      {spaces.map((space, index) => (
        <a
          key={space.href}
          ref={(element) => { cardRefs.current[index] = element }}
          className="magnetic-space-card"
          href={space.href}
        >
          <span>{space.number}</span>
          <h3>{space.label}</h3>
          <p>{space.description}</p>
          <b aria-hidden="true">↗</b>
        </a>
      ))}
    </div>
  )
}
