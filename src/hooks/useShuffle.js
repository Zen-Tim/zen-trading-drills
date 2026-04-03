import { useState, useCallback } from 'react'

function shuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function useShuffle(items, initialOrder) {
  const [shuffled, setShuffled] = useState(() => {
    // If resuming a session, restore the saved shuffle order
    if (initialOrder && initialOrder.length > 0) {
      const itemMap = Object.fromEntries(items.map((item) => [item.id, item]))
      const restored = initialOrder.map((id) => itemMap[id]).filter(Boolean)
      // If all items were found, use restored order; otherwise fresh shuffle
      if (restored.length === items.length) return restored
    }
    return shuffle(items)
  })

  const reshuffle = useCallback(() => {
    setShuffled(shuffle(items))
  }, [items])

  return { shuffled, reshuffle }
}
