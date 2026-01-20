import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createLogger, format, transports } from 'winston'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const logsDir = path.resolve(__dirname, '../../logs')

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

const errorLogPath = path.join(logsDir, 'error.log')

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) => {
      const prefix = `${timestamp} [${level.toUpperCase()}]`
      const base = `${prefix} ${message}`
      return stack ? `${base}\n${stack}` : base
    })
  ),
  transports: [
    new transports.Console({ level: 'info', handleExceptions: true }),
    new transports.File({
      filename: errorLogPath,
      level: 'error',
      handleExceptions: true,
    }),
  ],
  exitOnError: false,
})

function formatArgs(args) {
  return args
    .map((value) => {
      if (value instanceof Error) {
        return value.stack || value.message
      }
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value)
        } catch (err) {
          return String(err)
        }
      }
      return String(value)
    })
    .join(' ')
}

let consoleBound = false

function bindConsole() {
  if (consoleBound) return
  consoleBound = true

  const patch = (method, level) => {
    const original = console[method]
    console[method] = (...args) => {
      const formatted = formatArgs(args) || 'console message'
      logger[level](formatted)
      original(...args)
    }
  }

  patch('log', 'info')
  patch('info', 'info')
  patch('warn', 'warn')
  patch('error', 'error')
}

logger.stream = {
  write: (message) => {
    logger.info(message.trim())
  },
}
logger.bindConsole = bindConsole

export default logger
