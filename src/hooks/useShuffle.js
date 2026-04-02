import { useState, useCallback } from 'react'

function shuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function useShuffle(items) {
  const [shuffled, setShuffled] = useState(() => shuffle(items))

  const reshuffle = useCallback(() => {
    setShuffled(shuffle(items))
  }, [items])

  return { shuffled, reshuffle }
}
