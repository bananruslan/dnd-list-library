/**
 * Coalesces work into rAF; re-schedules while callback returns true.
 */
export function createScheduler(onFrame: (now: number) => boolean): {
  schedule: () => void
  dispose: () => void
} {
  let scheduled = false
  let rafId = 0

  function tick(now: number): void {
    scheduled = false
    if (onFrame(now)) schedule()
  }

  function schedule(): void {
    if (scheduled) return
    scheduled = true
    rafId = requestAnimationFrame(tick)
  }

  function dispose(): void {
    cancelAnimationFrame(rafId)
    scheduled = false
  }

  return { schedule, dispose }
}
