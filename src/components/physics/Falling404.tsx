import { useEffect, useRef } from 'react'
import { sharedFrameScheduler } from '../../lib/physics-2d/FixedStepScheduler'

interface Body { x: number; y: number; vx: number; vy: number; radius: number; color: string }

export default function Falling404() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const host = canvas?.parentElement
    const renderingContext = canvas?.getContext('2d')
    if (!canvas || !host || !renderingContext) return
    const context: CanvasRenderingContext2D = renderingContext
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || localStorage.getItem('aliouswe-motion') === 'reduced') return

    let width = 1
    let height = 1
    const bodies: Body[] = Array.from({ length: 16 }, (_, index) => ({
      x: 30 + (index * 83) % 900,
      y: -40 - index * 48,
      vx: ((index % 5) - 2) * 18,
      vy: 0,
      radius: 8 + (index % 4) * 5,
      color: ['#2350dc', '#ef3038', '#b7ff45', '#62f7d2'][index % 4],
    }))
    const resize = () => {
      const rect = host.getBoundingClientRect()
      width = rect.width
      height = rect.height
      const dpr = Math.min(devicePixelRatio, 1.5)
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()
    const unsubscribe = sharedFrameScheduler.subscribe((delta) => {
      context.clearRect(0, 0, width, height)
      for (const body of bodies) {
        body.vy += 720 * delta
        body.x += body.vx * delta
        body.y += body.vy * delta
        if (body.y + body.radius > height) {
          body.y = height - body.radius
          body.vy *= -.72
          body.vx *= .98
        }
        if (body.x < body.radius || body.x > width - body.radius) {
          body.x = Math.max(body.radius, Math.min(width - body.radius, body.x))
          body.vx *= -.82
        }
        context.fillStyle = body.color
        context.beginPath()
        context.arc(body.x, body.y, body.radius, 0, Math.PI * 2)
        context.fill()
      }
    })
    return () => { unsubscribe(); observer.disconnect() }
  }, [])
  return <canvas ref={canvasRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
}
