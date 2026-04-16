import { createScheduler } from './scheduler'
import {
  msPerAnimationStep,
  spring,
  springGoToEnd,
  springStep,
  type Spring,
} from './spring'

export type SortableListItem = {
  id: string
  element: HTMLElement
  /** px; default: measured `offsetHeight` at init */
  height?: number
}

export type SortableListOptions = {
  root: HTMLElement
  items: SortableListItem[]
  /** px; default: first item `offsetWidth` or 320 */
  itemWidth?: number
  paddingTop?: number
  spring?: { k?: number; b?: number }
  /**
   * Horizontal drag eased toward column center: `x + (center - x) / blend`.
   * Default 1.5 matches the original demo.
   */
  horizontalDragBlend?: number
  onReorder?: (ids: string[]) => void
}

export type SortableListHandle = {
  destroy: () => void
  getOrder: () => string[]
  setOrder: (ids: string[]) => void
}

type Row = {
  id: string
  sizeY: number
  x: Spring
  y: Spring
  scale: Spring
  node: HTMLElement
}

type Dragged = { id: string; deltaX: number; deltaY: number }

type PointerSample = { x: number; y: number; time: number }

type BatchedEvents = {
  mouseup: MouseEvent | null
  touchend: TouchEvent | null
  mousemove: MouseEvent | null
  touchmove: TouchEvent | null
  pointerdown: PointerEvent | null
}

type PointerState = 'down' | 'up' | 'firstDown'

function center(containee: number, container: number): number {
  return (container - containee) / 2
}

function pointerInRoot(root: HTMLElement, clientX: number, clientY: number): PointerSample {
  const rect = root.getBoundingClientRect()
  return {
    x: clientX - rect.left + root.scrollLeft,
    y: clientY - rect.top + root.scrollTop,
    time: performance.now(),
  }
}

function hitTest(
  rows: Row[],
  pointer: PointerSample,
  itemWidth: number,
): Row | undefined {
  for (const d of rows) {
    const { x, y, sizeY } = d
    if (
      x.pos <= pointer.x &&
      pointer.x < x.pos + itemWidth &&
      y.pos <= pointer.y &&
      pointer.y < y.pos + sizeY
    ) {
      return d
    }
  }
}

export function createSortableList(options: SortableListOptions): SortableListHandle {
  const {
    root,
    items,
    paddingTop = 50,
    horizontalDragBlend = 1.5,
    onReorder,
  } = options
  const k = options.spring?.k ?? 290
  const b = options.spring?.b ?? 24

  const computedRoot = getComputedStyle(root)
  if (computedRoot.position === 'static') {
    root.style.position = 'relative'
  }

  let itemWidth =
    options.itemWidth ??
    (items[0]?.element.offsetWidth > 0 ? items[0].element.offsetWidth : 320)

  const data: Row[] = items.map((item) => {
    const node = item.element
    node.classList.add('sortable-list__item')
    if (!root.contains(node)) root.appendChild(node)
    const sizeY = item.height ?? node.offsetHeight
    node.style.width = `${itemWidth}px`
    node.style.height = `${sizeY}px`
    const windowSizeX = root.clientWidth
    return {
      id: item.id,
      sizeY,
      x: spring(center(itemWidth, windowSizeX), 0, k, b),
      y: spring(0, 0, k, b),
      scale: spring(1, 0, k, b),
      node,
    }
  })

  let animatedUntilTime: number | null = null
  let dragged: Dragged | null = null
  let lastDragged: Dragged | null = null
  let pointerState: PointerState = 'up'
  let pointer: PointerSample[] = [{ x: 0, y: 0, time: 0 }]
  const events: BatchedEvents = {
    mouseup: null,
    touchend: null,
    mousemove: null,
    touchmove: null,
    pointerdown: null,
  }

  let lastNotifiedOrder = data.map((d) => d.id).join('\0')

  function springForEach(fn: (s: Spring) => void): void {
    for (const d of data) {
      fn(d.x)
      fn(d.y)
      fn(d.scale)
    }
  }

  function render(now: number): boolean {
    if (events.mouseup || events.touchend) pointerState = 'up'
    if (events.mousemove) {
      pointer.push(
        pointerInRoot(root, events.mousemove.clientX, events.mousemove.clientY),
      )
    }
    if (events.touchmove && events.touchmove.touches.length > 0) {
      const t = events.touchmove.touches[0]!
      pointer.push(pointerInRoot(root, t.clientX, t.clientY))
    }
    if (events.pointerdown) {
      pointerState = 'firstDown'
      pointer.push(
        pointerInRoot(
          root,
          events.pointerdown.clientX,
          events.pointerdown.clientY,
        ),
      )
    }

    const windowSizeX = root.clientWidth
    const pointerLast = pointer.at(-1)!

    let newDragged: Dragged | null | undefined
    if (pointerState === 'down') {
      newDragged = dragged
    } else if (pointerState === 'up') {
      const released = dragged
      if (released != null) {
        const dragIdx = data.findIndex((d) => d.id === released.id)
        if (dragIdx >= 0) {
          let i = pointer.length - 1
          while (i >= 0 && now - pointer[i]!.time <= 100) i--
          let deltaTime = now - pointer[i]!.time
          if (deltaTime < 1) deltaTime = 1
          const vx = ((pointerLast.x - pointer[i]!.x) / deltaTime) * 1000
          const vy = ((pointerLast.y - pointer[i]!.y) / deltaTime) * 1000
          data[dragIdx]!.x.v += vx
          data[dragIdx]!.y.v += vy
        }
      }
      newDragged = null
    } else {
      const hit = hitTest(data, pointerLast, itemWidth)
      if (hit) {
        newDragged = {
          id: hit.id,
          deltaX: pointerLast.x - hit.x.pos,
          deltaY: pointerLast.y - hit.y.pos,
        }
      }
    }

    if (newDragged) {
      let dragIdx = data.findIndex((d) => d.id === newDragged!.id)
      const d = data[dragIdx]!
      const x = pointerLast.x - newDragged.deltaX
      const y = pointerLast.y - newDragged.deltaY
      const colCenter = center(itemWidth, windowSizeX)
      d.x.pos = d.x.dest = x + (colCenter - x) / horizontalDragBlend
      d.y.pos = d.y.dest = y
      d.scale.dest = 1.1
      while (
        dragIdx > 0 &&
        pointerLast.y < data[dragIdx - 1]!.y.dest + data[dragIdx - 1]!.sizeY / 2
      ) {
        ;[data[dragIdx], data[dragIdx - 1]] = [data[dragIdx - 1]!, data[dragIdx]!]
        dragIdx--
      }
      while (
        dragIdx < data.length - 1 &&
        pointerLast.y > data[dragIdx + 1]!.y.dest + data[dragIdx + 1]!.sizeY / 2
      ) {
        ;[data[dragIdx], data[dragIdx + 1]] = [data[dragIdx + 1]!, data[dragIdx]!]
        dragIdx++
      }
    }

    let top = paddingTop
    for (const d of data) {
      if (newDragged && d.id === newDragged.id) {
        // positions already set for dragged row
      } else {
        d.x.dest = center(itemWidth, windowSizeX)
        d.y.dest = top
        d.scale.dest = 1
      }
      top += d.sizeY
    }

    const cursor = newDragged
      ? 'grabbing'
      : hitTest(data, pointerLast, itemWidth)
        ? 'grab'
        : 'auto'

    let newAnimatedUntilTime = animatedUntilTime ?? now
    const steps = Math.floor((now - newAnimatedUntilTime) / msPerAnimationStep)
    newAnimatedUntilTime += steps * msPerAnimationStep
    let stillAnimating = false
    springForEach((s) => {
      for (let i = 0; i < steps; i++) springStep(s)
      if (Math.abs(s.v) < 0.01 && Math.abs(s.dest - s.pos) < 0.01) {
        springGoToEnd(s)
      } else {
        stillAnimating = true
      }
    })

    for (let i = 0; i < data.length; i++) {
      const d = data[i]!
      const style = d.node.style
      style.transform = `translate3d(${d.x.pos}px,${d.y.pos}px,0) scale(${d.scale.pos})`
      style.zIndex = String(
        newDragged && d.id === newDragged.id
          ? data.length + 2
          : lastDragged && d.id === lastDragged.id
            ? data.length + 1
            : i,
      )
      if (newDragged && d.id === newDragged.id) {
        style.boxShadow = 'rgba(0, 0, 0, 0.2) 0px 16px 32px 0px'
        style.opacity = '0.7'
      } else {
        style.boxShadow = 'rgba(0, 0, 0, 0.2) 0px 1px 2px 0px'
        style.opacity = '1'
      }
    }
    root.style.cursor = cursor

    const orderKey = data.map((d) => d.id).join('\0')
    if (onReorder && orderKey !== lastNotifiedOrder) {
      lastNotifiedOrder = orderKey
      onReorder(data.map((d) => d.id))
    }

    if (pointerState === 'firstDown') pointerState = 'down'
    if (dragged && newDragged == null) lastDragged = dragged
    dragged = newDragged ?? null
    animatedUntilTime = stillAnimating ? newAnimatedUntilTime : null
    if (pointerState === 'up') pointer = [{ x: 0, y: 0, time: 0 }]
    if (pointer.length > 20) pointer.shift()
    events.mouseup =
      events.touchend =
      events.mousemove =
      events.touchmove =
      events.pointerdown =
        null

    return stillAnimating
  }

  const { schedule, dispose } = createScheduler(render)

  const onResize = (): void => schedule()
  const onMouseUp = (e: MouseEvent): void => {
    events.mouseup = e
    schedule()
  }
  const onTouchEnd = (e: TouchEvent): void => {
    events.touchend = e
    schedule()
  }
  const onMouseMove = (e: MouseEvent): void => {
    events.mousemove = e
    schedule()
  }
  const onTouchMove = (e: TouchEvent): void => {
    events.touchmove = e
    schedule()
  }
  const onPointerDown = (e: PointerEvent): void => {
    events.pointerdown = e
    schedule()
  }

  window.addEventListener('resize', onResize)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('touchend', onTouchEnd)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('touchmove', onTouchMove)
  window.addEventListener('pointerdown', onPointerDown)

  schedule()

  return {
    destroy() {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('pointerdown', onPointerDown)
      dispose()
      root.style.cursor = ''
    },
    getOrder() {
      return data.map((d) => d.id)
    },
    setOrder(ids) {
      const byId = new Map(data.map((d) => [d.id, d]))
      if (ids.length !== byId.size) return
      const next: Row[] = []
      for (const id of ids) {
        const row = byId.get(id)
        if (!row) return
        next.push(row)
      }
      data.length = 0
      data.push(...next)
      lastNotifiedOrder = data.map((d) => d.id).join('\0')
      schedule()
    },
  }
}
