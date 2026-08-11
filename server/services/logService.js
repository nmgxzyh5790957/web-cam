import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { readJSON, writeJSON, DATA_DIR } from './dataService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOGS_FILE = path.join(DATA_DIR, 'operation_logs.json')
const MAX_LOGS = 10000

function ensureLogFile() {
  if (!fs.existsSync(LOGS_FILE)) {
    writeJSON(LOGS_FILE, [])
  }
}

export function addLog(log) {
  ensureLogFile()
  const logs = readJSON(LOGS_FILE) || []
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    timestamp: new Date().toISOString(),
    ...log
  }
  logs.unshift(entry)
  if (logs.length > MAX_LOGS) {
    logs.length = MAX_LOGS
  }
  writeJSON(LOGS_FILE, logs)
  return entry
}

export function getLogs({ page = 1, pageSize = 50, type, module, search, startDate, endDate, username } = {}) {
  ensureLogFile()
  let logs = readJSON(LOGS_FILE) || []

  if (type) {
    logs = logs.filter(l => l.type === type)
  }
  if (module) {
    logs = logs.filter(l => l.module === module)
  }
  if (username) {
    logs = logs.filter(l => l.username?.includes(username))
  }
  if (search) {
    const kw = search.toLowerCase()
    logs = logs.filter(l =>
      l.action?.toLowerCase().includes(kw) ||
      l.target?.toLowerCase().includes(kw) ||
      l.details?.toLowerCase().includes(kw)
    )
  }
  if (startDate) {
    const start = new Date(startDate).toISOString()
    logs = logs.filter(l => l.timestamp >= start)
  }
  if (endDate) {
    const end = new Date(endDate + 'T23:59:59').toISOString()
    logs = logs.filter(l => l.timestamp <= end)
  }

  const total = logs.length
  const start = (page - 1) * pageSize
  const items = logs.slice(start, start + pageSize)

  return { items, total, page, pageSize }
}

export function clearLogs() {
  writeJSON(LOGS_FILE, [])
  return { success: true }
}

export function getLogStats() {
  ensureLogFile()
  const logs = readJSON(LOGS_FILE) || []
  const today = new Date().toDateString()
  const todayCount = logs.filter(l => new Date(l.timestamp).toDateString() === today).length
  const typeCounts = {}
  logs.forEach(l => {
    typeCounts[l.type] = (typeCounts[l.type] || 0) + 1
  })
  const moduleCounts = {}
  logs.forEach(l => {
    moduleCounts[l.module] = (moduleCounts[l.module] || 0) + 1
  })
  return {
    total: logs.length,
    todayCount,
    typeCounts,
    moduleCounts
  }
}
