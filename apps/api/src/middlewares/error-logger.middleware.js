import logger from '../utils/logger.js'

export function errorLogger(err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }

  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, {
    path: req.originalUrl,
    method: req.method,
    params: req.params,
    query: req.query,
    body: req.body,
    stack: err.stack || err,
  })

  res.status(500).json({ message: 'Ocurrió un error interno. Intenta nuevamente más tarde.' })
}
