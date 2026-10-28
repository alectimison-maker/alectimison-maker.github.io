import { useEffect, useRef } from 'react'
import { sharedFrameScheduler } from '../../lib/physics-2d/FixedStepScheduler'

export default function JazzArtwork({ src, alt }: { src: string; alt: string }) {
  const frame = useRef<HTMLDivElement>(null)
  const image = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const element = frame.current
    const picture = image.current
    if (!element || !picture || matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches
      || localStorage.getItem('aliouswe-motion') === 'reduced') return
    let x = 0, y = 0, vx = 0, vy = 0, targetX = 0, targetY = 0
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const rect = element.getBoundingClientRect()
      targetX = ((event.clientX - rect.left) / rect.width - .5) * 28
      targetY = ((event.clientY - rect.top) / rect.height - .5) * 28
    }
    const release = () => { targetX = 0; targetY = 0 }
    const unsubscribe = sharedFrameScheduler.subscribe((delta) => {
      if (Math.abs(x - targetX) + Math.abs(y - targetY) + Math.abs(vx) + Math.abs(vy) < .01) return
      const dt = Math.min(delta, 1 / 30)
      vx += ((targetX - x) * 150 - vx * 24) * dt
      vy += ((targetY - y) * 150 - vy * 24) * dt
      x += vx * dt
      y += vy * dt
      picture.style.transform = `translate3d(${x}px, ${y}px, 0)`
    })
    element.addEventListener('pointermove', move, { passive: true })
    element.addEventListener('pointerleave', release)
    window.addEventListener('blur', release)
    return () => {
      unsubscribe()
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerleave', release)
      window.removeEventListener('blur', release)
    }
  }, [src])

  return <div className="jl-artwork" ref={frame}><img ref={image} src={src} alt={alt} loading="lazy" /></div>
}
