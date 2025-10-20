export function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path, message: i.message }))
      const err = new Error('VALIDATION_ERROR')
      err.type = 'VALIDATION_ERROR'
      err.details = details
      return next(err)
    }
    req.validated = result.data
    next()
  }
}