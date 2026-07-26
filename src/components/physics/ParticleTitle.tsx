import { useEffect, useRef, useState } from 'react'
import typePreset from '../../data/p2-particle-type.json'
import { sharedFrameScheduler } from '../../lib/physics-2d/FixedStepScheduler'
import './particle-title.css'

interface ParticleLine {
  text: string
  scale?: number
  color?: string
}

interface Props {
  lines: ParticleLine[]
  density?: 'hero' | 'section'
}

interface Point { x: number; y: number }

const CONFIG = typePreset
const DARK_COLORS = ['#baff58', '#58fbd2', '#d9fff3', '#ff6d91']
const LIGHT_COLORS = ['#173ea5', '#a51d3f', '#006854', '#17140f']

const createGlowSprite = (color: string): HTMLCanvasElement => {
  const sprite = document.createElement('canvas')
  sprite.width = 48
  sprite.height = 48
  const context = sprite.getContext('2d')!
  const gradient = context.createRadialGradient(24, 24, 1, 24, 24, 23)
  gradient.addColorStop(0, color)
  gradient.addColorStop(0.18, color)
  gradient.addColorStop(0.5, `${color}55`)
  gradient.addColorStop(1, `${color}00`)
  context.fillStyle = gradient
  context.fillRect(0, 0, 48, 48)
  return sprite
}

const sampleTextPoints = (text: string, width: number, height: number, gap: number): Point[] => {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(width))
  canvas.height = Math.max(1, Math.floor(height))
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return []

  const safeLines = text
    .split('\n')
    .map((line) => line.trim().slice(0, 18))
    .filter(Boolean)
  if (!safeLines.length) safeLines.push('LUMEN')
  let fontSize = Math.min(height * 0.42, width * 0.2)
  context.font = `800 ${fontSize}px "Bodoni 72", "Iowan Old Style", serif`
  while (safeLines.some((line) => context.measureText(line).width > width * 0.78) && fontSize > 28) {
    fontSize -= 4
    context.font = `800 ${fontSize}px "Bodoni 72", "Iowan Old Style", serif`
  }
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#fff'
  const lineDistance = fontSize * 1.16
  safeLines.forEach((line, index) => {
    const y = height / 2 + (index - (safeLines.length - 1) / 2) * lineDistance
    context.fillText(line, width / 2, y)
  })

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  const stride = Math.max(3, Math.round(gap))
  const points: Point[] = []
  for (let y = 0; y < canvas.height; y += stride) {
    for (let x = 0; x < canvas.width; x += stride) {
      if (pixels[(y * canvas.width + x) * 4 + 3] > 90) points.push({ x, y })
    }
  }
  return points
}

export default function ParticleTitle({ lines }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const text = lines.map((line) => line.text).join('\n').trim() || CONFIG.text

  useEffect(() => {
    const canvas = canvasRef.current
    const host = canvas?.closest<HTMLElement>('[data-particle-host]')
    if (!canvas || !host) return

    const renderingContext = canvas.getContext('2d')
    if (!renderingContext) return
    const context: CanvasRenderingContext2D = renderingContext
    const darkSprites = DARK_COLORS.map(createGlowSprite)
    const lightSprites = LIGHT_COLORS.map(createGlowSprite)

    let width = 1
    let height = 1
    let lightSurface = false
    let active = true
    let visible = true
    let initialized = false
    let accumulator = 0
    let simulationTime = 0
    let pointerX = 0
    let pointerY = 0
    let pointerActive = false
    let pointerVelocityX = 0
    let pointerVelocityY = 0
    let lastPointerX = 0
    let lastPointerY = 0
    let lastPointerTime = performance.now()
    let randomSeed = 2027
    let accelerationX = 0
    let accelerationY = 0

    const count = CONFIG.particleCount
    const x = new Float64Array(count)
    const y = new Float64Array(count)
    const vx = new Float64Array(count)
    const vy = new Float64Array(count)
    const tx = new Float64Array(count)
    const ty = new Float64Array(count)
    const radius = new Float64Array(count)
    const phase = new Float64Array(count)
    const color = new Uint8Array(count)

    canvas.dataset.particles = String(count)
    canvas.dataset.preset = CONFIG.preset
    canvas.dataset.integrator = CONFIG.integrator
    canvas.dataset.glow = String(CONFIG.showGlow)

    const refreshPalette = () => {
      let element: HTMLElement | null = host
      let red = 4
      let green = 17
      let blue = 13
      while (element) {
        const background = getComputedStyle(element).backgroundColor
        const channels = background.match(/[\d.]+/g)?.map(Number)
        if (channels && channels.length >= 3 && (channels[3] === undefined || channels[3] > 0)) {
          ;[red, green, blue] = channels
          break
        }
        element = element.parentElement
      }
      const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255
      lightSurface = luminance > 0.55
      canvas.dataset.palette = lightSurface ? 'light' : 'dark'
    }

    const random = () => {
      randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0
      return randomSeed / 0x100000000
    }

    const setTargets = () => {
      const points = sampleTextPoints(text, width, height, CONFIG.sampleGap)
      if (!points.length) return
      for (let index = 0; index < count; index += 1) {
        const pointIndex = points.length > count
          ? Math.floor(index * points.length / count)
          : index % points.length
        const point = points[pointIndex]
        const cycle = Math.floor(index / points.length)
        const angle = phase[index] + cycle * 2.4
        const jitter = cycle === 0 ? 0 : Math.min(9, cycle * 1.5)
        tx[index] = point.x + Math.cos(angle) * jitter
        ty[index] = point.y + Math.sin(angle) * jitter
      }
    }

    const resetParticles = () => {
      randomSeed = 2027
      for (let index = 0; index < count; index += 1) {
        x[index] = random() * width
        y[index] = random() * height
        vx[index] = (random() - 0.5) * 70
        vy[index] = (random() - 0.5) * 70
        tx[index] = x[index]
        ty[index] = y[index]
        radius[index] = 0.7 + random() * 1.8
        phase[index] = random() * Math.PI * 2
        color[index] = Math.floor(random() * DARK_COLORS.length)
      }
    }

    const resize = () => {
      const rect = host.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      refreshPalette()
      if (!initialized) {
        resetParticles()
        initialized = true
      }
      setTargets()
      draw()
      setReady(true)
      host.classList.add('is-live')
    }

    const calculateAcceleration = (
      index: number,
      positionX: number,
      positionY: number,
      velocityX: number,
      velocityY: number,
      time: number,
    ) => {
      let ax = (tx[index] - positionX) * CONFIG.homeStrength
      let ay = (ty[index] - positionY) * CONFIG.homeStrength
      const spatialX = positionX * 0.008
      const spatialY = positionY * 0.008
      ax += Math.sin(spatialY + time * 0.8 + phase[index]) * CONFIG.turbulence
      ay += Math.cos(spatialX - time * 0.65 + phase[index] * 1.7) * CONFIG.turbulence

      if (pointerActive) {
        const dx = pointerX - positionX
        const dy = pointerY - positionY
        const distance = Math.hypot(dx, dy)
        if (distance > 0.001 && distance < CONFIG.fieldRadius) {
          const nx = dx / distance
          const ny = dy / distance
          const falloff = (1 - distance / CONFIG.fieldRadius) ** 2
          const strength = CONFIG.fieldStrength * falloff
          ax += -ny * strength + nx * strength * 0.16
          ay += nx * strength + ny * strength * 0.16
        }
      }

      ax -= velocityX * CONFIG.drag
      ay -= velocityY * CONFIG.drag
      accelerationX = ax
      accelerationY = ay
    }

    const step = (dt: number) => {
      const subDt = dt / CONFIG.substeps
      for (let substep = 0; substep < CONFIG.substeps; substep += 1) {
        const sampleTime = simulationTime + substep * subDt
        for (let index = 0; index < count; index += 1) {
          const oldX = x[index]
          const oldY = y[index]
          const oldVelocityX = vx[index]
          const oldVelocityY = vy[index]

          calculateAcceleration(index, oldX, oldY, oldVelocityX, oldVelocityY, sampleTime)
          const a0x = accelerationX
          const a0y = accelerationY
          const nextX = oldX + oldVelocityX * subDt + 0.5 * a0x * subDt * subDt
          const nextY = oldY + oldVelocityY * subDt + 0.5 * a0y * subDt * subDt
          const predictedVelocityX = oldVelocityX + a0x * subDt
          const predictedVelocityY = oldVelocityY + a0y * subDt

          calculateAcceleration(
            index,
            nextX,
            nextY,
            predictedVelocityX,
            predictedVelocityY,
            sampleTime + subDt,
          )
          let nextVelocityX = oldVelocityX + 0.5 * (a0x + accelerationX) * subDt
          let nextVelocityY = oldVelocityY + 0.5 * (a0y + accelerationY) * subDt
          const speed = Math.hypot(nextVelocityX, nextVelocityY)
          if (speed > CONFIG.maxSpeed) {
            const scale = CONFIG.maxSpeed / speed
            nextVelocityX *= scale
            nextVelocityY *= scale
          }

          x[index] = nextX
          y[index] = nextY
          vx[index] = nextVelocityX
          vy[index] = nextVelocityY

          const margin = 24
          if (x[index] < -margin) x[index] = width + margin
          else if (x[index] > width + margin) x[index] = -margin
          if (y[index] < -margin) y[index] = height + margin
          else if (y[index] > height + margin) y[index] = -margin
        }
      }
      simulationTime += dt
      pointerVelocityX *= 0.78
      pointerVelocityY *= 0.78
    }

    function draw() {
      context.globalCompositeOperation = 'source-over'
      context.clearRect(0, 0, width, height)

      context.globalCompositeOperation = CONFIG.showGlow && !lightSurface ? 'lighter' : 'source-over'
      const sprites = lightSurface ? lightSprites : darkSprites
      for (let index = 0; index < count; index += 1) {
        const spriteSize = radius[index] * (width < 600 ? 4.5 : 7)
        context.drawImage(
          sprites[color[index]],
          x[index] - spriteSize / 2,
          y[index] - spriteSize / 2,
          spriteSize,
          spriteSize,
        )
      }
      context.globalCompositeOperation = 'source-over'
    }

    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
      || localStorage.getItem('aliouswe-motion') === 'reduced'
    const unsubscribe = reduceMotion ? () => {} : sharedFrameScheduler.subscribe((delta) => {
      if (!active || !visible) return
      accumulator = Math.min(accumulator + delta, 0.1)
      let steps = 0
      while (accumulator >= CONFIG.fixedDt && steps < 10) {
        step(CONFIG.fixedDt)
        accumulator -= CONFIG.fixedDt
        steps += 1
      }
      draw()
    })

    const pointFromEvent = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
    const movePointer = (event: PointerEvent) => {
      const point = pointFromEvent(event)
      const now = performance.now()
      const dt = Math.max(0.008, (now - lastPointerTime) / 1000)
      pointerVelocityX = Math.max(-1800, Math.min(1800, (point.x - lastPointerX) / dt))
      pointerVelocityY = Math.max(-1800, Math.min(1800, (point.y - lastPointerY) / dt))
      pointerX = point.x
      pointerY = point.y
      pointerActive = true
      lastPointerX = point.x
      lastPointerY = point.y
      lastPointerTime = now
    }
    const enterPointer = (event: PointerEvent) => {
      const point = pointFromEvent(event)
      pointerX = point.x
      pointerY = point.y
      pointerVelocityX = 0
      pointerVelocityY = 0
      pointerActive = true
      lastPointerX = point.x
      lastPointerY = point.y
      lastPointerTime = performance.now()
    }
    const leavePointer = () => {
      pointerActive = false
    }
    const downPointer = (event: PointerEvent) => {
      movePointer(event)
      canvas.setPointerCapture(event.pointerId)
    }
    const visibility = () => { active = document.visibilityState === 'visible' }
    const themeObserver = new MutationObserver(() => {
      refreshPalette()
      draw()
    })

    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }, { rootMargin: '100px' })
    observer.observe(host)
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    canvas.addEventListener('pointerenter', enterPointer)
    canvas.addEventListener('pointermove', movePointer)
    canvas.addEventListener('pointerleave', leavePointer)
    canvas.addEventListener('pointerdown', downPointer)
    document.addEventListener('visibilitychange', visibility)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    resize()
    document.fonts?.ready.then(() => {
      if (active) {
        setTargets()
        draw()
      }
    })

    return () => {
      unsubscribe()
      observer.disconnect()
      resizeObserver.disconnect()
      themeObserver.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      canvas.removeEventListener('pointerenter', enterPointer)
      canvas.removeEventListener('pointermove', movePointer)
      canvas.removeEventListener('pointerleave', leavePointer)
      canvas.removeEventListener('pointerdown', downPointer)
      delete canvas.dataset.glow
      delete canvas.dataset.particles
      delete canvas.dataset.preset
      delete canvas.dataset.integrator
      delete canvas.dataset.palette
      host.classList.remove('is-live')
    }
  }, [text])

  return (
    <canvas ref={canvasRef} className={`particle-title-canvas ${ready ? 'ready' : ''}`} aria-hidden="true" />
  )
}
