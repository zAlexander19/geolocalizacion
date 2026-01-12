import logger from '../utils/logger.js'

// Middleware to log HTTP requests
export const requestLogger = (req, res, next) => {
  const startTime = Date.now()
  
  // Log incoming request
  logger.logRequest(req)
  
  // Capture response
  res.on('finish', () => {
    const responseTime = Date.now() - startTime
    logger.logResponse(req, res, responseTime)
  })
  
  next()
}

// Error logging middleware
export const errorLogger = (err, req, res, next) => {
  // Log the error
  logger.logError(err, req)
  next(err)
}
