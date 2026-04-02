import { kv } from '@vercel/kv'

export const config = {
  schedule: '0 6 * * *', // Daily at 06:00 UTC
}

export default async function handler(req, res) {
  // Only allow Vercel cron or manual GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify cron secret if set (Vercel sends CRON_SECRET header for cron jobs)
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const snapshot = {}
    let cursor = 0

    // Scan all drills:* keys
    do {
      const [nextCursor, keys] = await kv.scan(cursor, { match: 'drills:*', count: 100 })
      cursor = nextCursor

      for (const key of keys) {
        const value = await kv.get(key)
        snapshot[key] = value
      }
    } while (cursor !== 0)

    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

    // Store backup as a KV entry keyed by date
    await kv.set(`backup:${dateStr}`, snapshot)

    // Keep a rolling list of backup dates (last 30)
    const backupIndex = (await kv.get('backup:index')) || []
    if (!backupIndex.includes(dateStr)) {
      backupIndex.push(dateStr)
    }
    // Prune to last 30 backups
    while (backupIndex.length > 30) {
      const old = backupIndex.shift()
      await kv.del(`backup:${old}`)
    }
    await kv.set('backup:index', backupIndex)

    return res.json({
      ok: true,
      date: dateStr,
      keysBackedUp: Object.keys(snapshot).length,
    })
  } catch (err) {
    console.error('Backup failed:', err)
    return res.status(500).json({ error: 'Backup failed', message: err.message })
  }
}
