/** ms/step for spring simulation (decoupled from display framerate). */
export const msPerAnimationStep = 4

export type Spring = {
  pos: number
  dest: number
  v: number
  k: number
  b: number
}

export function spring(
  pos: number,
  v = 0,
  k = 290,
  b = 24,
): Spring {
  return { pos, dest: pos, v, k, b }
}

export function springStep(config: Spring): void {
  const t = msPerAnimationStep / 1000
  const { pos, dest, v, k, b } = config
  const Fspring = -k * (pos - dest)
  const Fdamper = -b * v
  const a = Fspring + Fdamper
  const newV = v + a * t
  const newPos = pos + newV * t
  config.pos = newPos
  config.v = newV
}

export function springGoToEnd(config: Spring): void {
  config.pos = config.dest
  config.v = 0
}
