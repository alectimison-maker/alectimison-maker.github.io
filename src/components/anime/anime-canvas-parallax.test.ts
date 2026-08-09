import { describe, expect, it } from 'vitest'
import {
  ANIME_PARALLAX_MAX_OFFSET,
  parallaxTargetForVelocity,
  stepAnimeParallaxAxis,
} from './anime-canvas-parallax'

describe('Anime canvas cover parallax', () => {
  it('lags behind camera movement and preserves diagonal direction', () => {
    expect(parallaxTargetForVelocity(1, 0).x).toBeLessThan(0)
    expect(parallaxTargetForVelocity(0, -1).y).toBeGreaterThan(0)

    const diagonal = parallaxTargetForVelocity(1, 1)
    expect(diagonal.x).toBeCloseTo(diagonal.y)
  })

  it('responds to speed without exceeding the crop-safe offset', () => {
    const slow = parallaxTargetForVelocity(.08, 0)
    const fast = parallaxTargetForVelocity(8, 0)

    expect(Math.abs(slow.x)).toBeGreaterThan(0)
    expect(Math.abs(fast.x)).toBeGreaterThan(Math.abs(slow.x))
    expect(Math.hypot(fast.x, fast.y)).toBeLessThanOrEqual(ANIME_PARALLAX_MAX_OFFSET)
  })

  it('settles a displaced image back through the centre with light damping', () => {
    let axis = { position: -.02, velocity: 0 }
    let crossedCentre = false

    for (let frame = 0; frame < 180; frame += 1) {
      axis = stepAnimeParallaxAxis(axis, 0, 1 / 60)
      if (axis.position > 0) crossedCentre = true
    }

    expect(crossedCentre).toBe(true)
    expect(axis.position).toBeCloseTo(0, 5)
    expect(axis.velocity).toBeCloseTo(0, 5)
  })
})
