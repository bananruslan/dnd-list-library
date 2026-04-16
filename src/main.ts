import { createSortableList } from './index'
import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('#app missing')

const root = document.createElement('div')
root.style.minHeight = '100vh'
app.appendChild(root)

const items = Array.from({ length: 5 }, (_, i) => {
  const el = document.createElement('div')
  const sizeY = 30 + Math.random() * 150
  el.textContent = `Drag Me ${i}`
  const rand = Math.random() * 40 + 40
  el.style.outline = `1px solid hsl(205, 100%, ${rand}%)`
  el.style.backgroundColor = `hsl(205, 100%, ${rand + 10}%)`
  return { id: String(i), element: el, height: sizeY }
})

createSortableList({
  root,
  items,
  itemWidth: 320,
  onReorder: (ids) => {
    console.log('reorder', ids)
  },
})
