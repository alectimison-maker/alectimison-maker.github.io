export type FrameCallback = (deltaSeconds: number, elapsedSeconds: number) => void

class SharedFrameScheduler {
  private callbacks = new Set<FrameCallback>()
  private frame = 0
  private previous = 0
  private elapsed = 0

  subscribe(callback: FrameCallback): () => void {
    this.callbacks.add(callback)
    if (!this.frame) {
      this.previous = performance.now()
      this.frame = requestAnimationFrame(this.tick)
    }
    return () => {
      this.callbacks.delete(callback)
      if (this.callbacks.size === 0 && this.frame) {
        cancelAnimationFrame(this.frame)
        this.frame = 0
      }
    }
  }

  private tick = (now: number): void => {
    const delta = Math.min((now - this.previous) / 1000, 0.05)
    this.previous = now
    this.elapsed += delta
    for (const callback of this.callbacks) callback(delta, this.elapsed)
    this.frame = this.callbacks.size > 0 ? requestAnimationFrame(this.tick) : 0
  }
}

export const sharedFrameScheduler = new SharedFrameScheduler()
