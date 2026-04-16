# dnd-list

**Languages:** English (this file) · [Русский — README-ru.md](README-ru.md)

A small library for vertical drag-and-drop lists with spring motion and mouse / touch input.

## Installation

```bash
npm install dnd-list
```

## Quick start

1. Import styles (class `.sortable-list__item`). Published entry points:

```ts
import "dnd-list/style.css";
```

When developing **inside this repo**, CSS is also loaded if you import from [`src/index.ts`](src/index.ts); the source file lives at [`src/lib/sortable-list.css`](src/lib/sortable-list.css).

2. Provide a `root` element; the library forces `position: relative` when the computed style is `static`.

3. Create the list:

```ts
import "dnd-list/style.css";
import { createSortableList } from "dnd-list";

const list = createSortableList({
  root: document.getElementById("list-root")!,
  items: [
    { id: "a", element: elA },
    { id: "b", element: elB, height: 80 },
  ],
  itemWidth: 320,
  paddingTop: 50,
  spring: { k: 290, b: 24 },
  horizontalDragBlend: 1.5,
  onReorder(ids) {
    console.log("new order:", ids);
  },
});

list.getOrder();
list.setOrder(["b", "a"]);
list.destroy();
```

## API

### Exported symbols

| Name | Kind | Description |
|------|------|-------------|
| `createSortableList` | function | Builds a controller, wires listeners, starts the animation loop. |
| `SortableListOptions` | `type` | Options object passed to `createSortableList`. |
| `SortableListItem` | `type` | One logical row: stable `id`, DOM `element`, optional `height`. |
| `SortableListHandle` | `type` | Controller instance: read/update order and tear down. |

### `createSortableList(options)`

| | |
|--|--|
| **Signature** | `(options: SortableListOptions) => SortableListHandle` |
| **Behavior** | Adds `sortable-list__item` to each `element`, appends nodes to `root` if missing, sets inline width/height, initializes springs, registers global `window` listeners (`resize`, mouse, touch, `pointerdown`), and schedules rendering. |

### `SortableListOptions`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `root` | `HTMLElement` | — | **Required.** Layout container. If computed `position` is `static`, it is set to `relative`. Row `translate` values are in this element’s coordinate space (with `scrollLeft` / `scrollTop`). |
| `items` | `SortableListItem[]` | — | **Required.** Initial stack, top → bottom. Order in the array is the initial visual order. |
| `itemWidth` | `number` (px) | first item’s `offsetWidth` when positive, otherwise `320` | Fixed width for each row: horizontal centering, hit-testing, and `element.style.width`. |
| `paddingTop` | `number` (px) | `50` | Distance from the top of `root`’s content box to the first row’s **rest** position (`y.dest` when not dragged). |
| `spring` | `{ k?: number; b?: number }` | each key falls back separately: `k = 290`, `b = 24` | Stiffness `k` and damping `b` for the internal spring on **x**, **y**, and **scale** for every row. Partial objects merge with these defaults. |
| `horizontalDragBlend` | `number` | `1.5` | During drag, row X is set to `x + (columnCenter - x) / blend`, i.e. eased toward the column center. **Larger** `blend` ⇒ weaker centering (more horizontal freedom). |
| `onReorder` | `(ids: string[]) => void` | — | Fired when the internal top→bottom `id` order **changes**. Not called on startup for the initial order. After a user-driven reorder, `ids` matches `getOrder()`. |

**Spring tuning:** defaults match the original demo; for intuition see Cheng Lou’s [react-motion](https://github.com/chenglou/react-motion) spring tooling and [parameter chooser](https://chenglou.me/react-motion/demos/demo5-spring-parameters-chooser/).

| `spring` field | Default | Role |
|----------------|---------|------|
| `k` | `290` | Stiffness — higher values snap to `dest` faster. |
| `b` | `24` | Damping — higher values reduce overshoot / oscillation. |

### `SortableListItem`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | yes | Stable identifier; must be **unique** within `items`. Used in `getOrder`, `setOrder`, and `onReorder`. |
| `element` | `HTMLElement` | yes | The visible row. If not already inside `root`, it is **appended** to `root`. |
| `height` | `number` (px) | no | Row height. If omitted, read **once** from `element.offsetHeight` at creation time and stored; changing DOM height later does not auto-update unless you recreate the list. |

### `SortableListHandle`

| Member | Type | Description |
|--------|------|-------------|
| `getOrder` | `() => string[]` | Returns current ids from **top to bottom** (visual stack order). |
| `setOrder` | `(ids: string[]) => void` | Reorders rows to match `ids`. **No-op** if `ids.length` ≠ number of rows, if any id is missing, or if ids are not exactly the same multiset as current rows. Updates internal state and schedules a frame. **`onReorder` is not called** after a successful `setOrder` (the internal “last notified” sequence is aligned to the new order; react yourself if you need a side effect). |
| `destroy` | `() => void` | Removes all `window` listeners, cancels the rAF scheduler, clears `root.style.cursor`. **Does not** remove row elements from the DOM — you own the nodes. |

## Limitations

- One vertical column; item width is treated as fixed for layout and hit-testing.
- Global listeners on `window` for `resize`, mouse, touch, and `pointerdown`.

## Credits

Spring stepping and default **stiffness / damping values** are **inspired by Cheng Lou’s** [demo_drag](https://github.com/chenglou/chenglou.github.io/tree/master/demo_drag).

## License

[MIT](LICENSE)
