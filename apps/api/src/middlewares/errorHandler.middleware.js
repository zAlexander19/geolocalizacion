import logger from '../utils/logger.js'

// Custom error class for application errors
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

// Error handler middleware
export const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message
  error.stack = err.stack

  // Log error
  logger.logError(err, req)

  // Mongoose/MongoDB bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Recurso no encontrado'
    error = new AppError(message, 404)
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Valor duplicado ingresado'
    error = new AppError(message, 400)
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ')
    error = new AppError(message, 400)
  }

  // PostgreSQL errors
  if (err.code === '23505') {
    const message = 'Ya existe un registro con estos datos'
    error = new AppError(message, 400)
  }

  if (err.code === '23503') {
    const message = 'No se puede realizar la operación debido a referencias existentes'
    error = new AppError(message, 400)
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token inválido. Por favor inicie sesión nuevamente'
    error = new AppError(message, 401)
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Su sesión ha expirado. Por favor inicie sesión nuevamente'
    error = new AppError(message, 401)
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    let message = 'Error al subir archivo'
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'El archivo es demasiado grande. Tamaño máximo: 10MB'
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Tipo de archivo no esperado'
    }
    error = new AppError(message, 400)
  }

  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    error = new AppError('Acceso no permitido desde este origen', 403)
  }

  // Default error response
  const statusCode = error.statusCode || 500
  const message = error.message || 'Error interno del servidor'

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error
    })
  })
}

// Not found handler
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Ruta no encontrada: ${req.originalUrl}`, 404)
  next(error)
}
