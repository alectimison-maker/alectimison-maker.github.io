export interface AnimeParallaxPoint {
  x: number
  y: number
}

export interface AnimeParallaxAxis {
  position: number
  velocity: number
}

export const ANIME_PARALLAX_MAX_OFFSET = .03

const PARALLAX_RESPONSE_VELOCITY = .48
const PARALLAX_SPRING_STIFFNESS = 120
const PARALLAX_SPRING_DAMPING = 15

const clamp = (value: number, minimum: number, maximum: number) => (
  Math.min(maximum, Math.max(minimum, value))
)

export const parallaxTargetForVelocity = (
  velocityX: number,
  velocityY: number,
): AnimeParallaxPoint => {
  const speed = Math.hypot(velocityX, velocityY)
  if (speed === 0) return { x: 0, y: 0 }

  const magnitude = ANIME_PARALLAX_MAX_OFFSET
    * Math.tanh(speed / PARALLAX_RESPONSE_VELOCITY)
  const scale = -magnitude / speed
  return {
    x: velocityX * scale,
    y: velocityY * scale,
  }
}

export const stepAnimeParallaxAxis = (
  axis: AnimeParallaxAxis,
  target: number,
  elapsedSeconds: number,
): AnimeParallaxAxis => {
  const elapsed = clamp(elapsedSeconds, 0, .032)
  const acceleration = (target - axis.position) * PARALLAX_SPRING_STIFFNESS
    - axis.velocity * PARALLAX_SPRING_DAMPING
  const velocity = axis.velocity + acceleration * elapsed
  return {
    position: clamp(
      axis.position + velocity * elapsed,
      -ANIME_PARALLAX_MAX_OFFSET,
      ANIME_PARALLAX_MAX_OFFSET,
    ),
    velocity,
  }
}
