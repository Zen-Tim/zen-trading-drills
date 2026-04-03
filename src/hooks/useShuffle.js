import { useState, useCallback } from 'react'

function fisherYates(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function weightedShuffle(items) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tier1 = []
  const tier2 = []
  const tier3 = []
  const tier4 = []

  for (const item of items) {
    // Tier 1: flagged (takes priority over stale)
    if (item.flagged) {
      tier1.push(item)
      continue
    }

    // Check staleness
    if (!item.last_drilled) {
      tier2.push(item)
      continue
    }

    const drilled = new Date(item.last_drilled)
    drilled.setHours(0, 0, 0, 0)
    const daysSince = Math.floor((today - drilled) / (1000 * 60 * 60 * 24))

    if (daysSince >= 14) {
      tier2.push(item)
    } else if (daysSince >= 7) {
      tier3.push(item)
    } else {
      tier4.push(item)
    }
  }

  return [
    ...fisherYates(tier1),
    ...fisherYates(tier2),
    ...fisherYates(tier3),
    ...fisherYates(tier4),
  ]
}

export function useShuffle(items, initialOrder, options = {}) {
  const weighted = options.weighted !== false

  const [shuffled, setShuffled] = useState(() => {
    // If resuming a session, restore the saved shuffle order
    if (initialOrder && initialOrder.length > 0) {
      const itemMap = Object.fromEntries(items.map((item) => [item.id, item]))
      const restored = initialOrder.map((id) => itemMap[id]).filter(Boolean)
      // If all items were found, use restored order; otherwise fresh shuffle
      if (restored.length === items.length) return restored
    }
    return weighted ? weightedShuffle(items) : fisherYates(items)
  })

  const reshuffle = useCallback(() => {
    setShuffled(weighted ? weightedShuffle(items) : fisherYates(items))
  }, [items, weighted])

  return { shuffled, reshuffle }
}
