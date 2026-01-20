import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const logsDir = path.resolve(__dirname, '../../logs')
const errorLogPath = path.join(logsDir, 'error.log')

const router = Router()

const entryPattern = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[([^\]]+)\] (.*)$/

router.get('/', async (req, res) => {
  try {
    const raw = await fs.promises.readFile(errorLogPath, 'utf-8').catch(() => '')
    const lines = raw.split(/\r?\n/).filter(Boolean)

    const fromDate = req.query.from ? new Date(req.query.from) : null
    const toDate = req.query.to ? new Date(req.query.to) : null
    const levels = req.query.level
      ? req.query.level
          .split(',')
          .map((level) => level.trim().toUpperCase())
          .filter(Boolean)
      : null
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 1000)

    const entries = []
    let current = null

    lines.forEach((line) => {
      const match = line.match(entryPattern)
      if (match) {
        if (current) {
          entries.push(current)
        }
        current = {
          timestamp: new Date(match[1]),
          level: match[2].toUpperCase(),
          message: match[3],
          stack: [],
        }
      } else if (current) {
        current.stack.push(line)
      }
    })

    if (current) {
      entries.push(current)
    }

    const summaryMode = req.query.summary === 'true'
    const uniqueMode = req.query.unique === 'true'

    const filtered = entries
      .filter((entry) => {
        if (levels && levels.length > 0 && !levels.includes(entry.level)) {
          return false
        }
        if (fromDate && entry.timestamp < fromDate) {
          return false
        }
        if (toDate && entry.timestamp > toDate) {
          return false
        }
        return true
      })
      .sort((a, b) => b.timestamp - a.timestamp)

    const deduped = uniqueMode
      ? filtered.filter((entry, index, array) => {
          return array.findIndex((next) => next.level === entry.level && next.message === entry.message) === index
        })
      : filtered

    const rows = deduped.slice(0, limit).map((entry) => ({
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      message: entry.message,
      stack: summaryMode ? entry.stack.slice(0, 1) : entry.stack,
    }))

    res.json({
      total: deduped.length,
      limit,
      data: rows,
    })
  } catch (error) {
    console.error('Error reading logs:', error)
    res.status(500).json({ message: 'No se pudieron leer los logs' })
  }
})

export default router
