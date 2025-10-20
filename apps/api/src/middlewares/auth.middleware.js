import jwt from 'jsonwebtoken'

export function adminOnly(req, res, next) {
  const header = req.headers['authorization'] || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ data: null, error: 'UNAUTHORIZED' })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload?.role !== 'admin') {
      return res.status(403).json({ data: null, error: 'FORBIDDEN' })
    }
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ data: null, error: 'UNAUTHORIZED' })
  }
}