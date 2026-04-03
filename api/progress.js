import { kv } from '@vercel/kv'

function today() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

export default async function handler(req, res) {
  const { method } = req

  if (method === 'GET') {
    const { token, type, date } = req.query
    if (!token) return res.status(400).json({ error: 'Missing token' })

    const dateStr = date || today()

    if (type === 'streak') {
      const data = await kv.get(`drills:streak:${token}`)
      return res.json(data || { current: 0, lastDate: null })
    }

    if (type === 'heatmap') {
      const data = await kv.get(`drills:heatmap:${token}`)
      return res.json(data || {})
    }

    if (type === 'timer') {
      const data = await kv.get(`drills:timer:${token}:${dateStr}`)
      return res.json(data || { sessionSeconds: 0, items: {} })
    }

    if (type === 'analytics') {
      const data = await kv.get(`drills:analytics:${token}`)
      return res.json(data || { sectionCounts: {}, itemLastDrilled: {} })
    }

    // Default: progress
    const data = await kv.get(`drills:progress:${token}:${dateStr}`)
    return res.json(data || {})
  }

  if (method === 'POST') {
    const { token, type, date, data } = req.body
    if (!token) return res.status(400).json({ error: 'Missing token' })

    const dateStr = date || today()

    if (type === 'streak') {
      await kv.set(`drills:streak:${token}`, data)
      return res.json({ ok: true })
    }

    if (type === 'heatmap') {
      await kv.set(`drills:heatmap:${token}`, data)
      return res.json({ ok: true })
    }

    if (type === 'timer') {
      await kv.set(`drills:timer:${token}:${dateStr}`, data)
      return res.json({ ok: true })
    }

    if (type === 'analytics') {
      await kv.set(`drills:analytics:${token}`, data)
      return res.json({ ok: true })
    }

    // Default: progress
    await kv.set(`drills:progress:${token}:${dateStr}`, data)

    // Update heatmap count — sum all rep counts across sections
    const heatmap = (await kv.get(`drills:heatmap:${token}`)) || {}
    let totalReps = 0
    for (const sectionId in data) {
      const section = data[sectionId]
      if (typeof section === 'object' && !Array.isArray(section)) {
        for (const itemId in section) {
          totalReps += section[itemId]
        }
      } else if (Array.isArray(section)) {
        totalReps += section.length
      }
    }
    heatmap[dateStr] = totalReps
    await kv.set(`drills:heatmap:${token}`, heatmap)

    // Update analytics aggregates
    const analytics = (await kv.get(`drills:analytics:${token}`)) || { sectionCounts: {}, itemLastDrilled: {} }
    for (const sectionId in data) {
      const section = data[sectionId]
      if (typeof section === 'object' && !Array.isArray(section)) {
        const sectionTotal = Object.values(section).reduce((s, c) => s + c, 0)
        analytics.sectionCounts[sectionId] = (analytics.sectionCounts[sectionId] || 0) + sectionTotal
        for (const itemId in section) {
          const prev = analytics.itemLastDrilled[itemId]
          if (!prev || dateStr >= prev) {
            analytics.itemLastDrilled[itemId] = dateStr
          }
        }
      } else if (Array.isArray(section)) {
        analytics.sectionCounts[sectionId] = (analytics.sectionCounts[sectionId] || 0) + section.length
        for (const itemId of section) {
          const prev = analytics.itemLastDrilled[itemId]
          if (!prev || dateStr >= prev) {
            analytics.itemLastDrilled[itemId] = dateStr
          }
        }
      }
    }
    await kv.set(`drills:analytics:${token}`, analytics)

    // Update streak
    const streak = (await kv.get(`drills:streak:${token}`)) || { current: 0, lastDate: null }
    if (totalReps > 0 && streak.lastDate !== dateStr) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = `${yesterday.getFullYear()}${String(yesterday.getMonth() + 1).padStart(2, '0')}${String(yesterday.getDate()).padStart(2, '0')}`

      if (streak.lastDate === yesterdayStr) {
        streak.current += 1
      } else if (streak.lastDate !== dateStr) {
        streak.current = 1
      }
      streak.lastDate = dateStr
      await kv.set(`drills:streak:${token}`, streak)
    }

    return res.json({ ok: true })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
