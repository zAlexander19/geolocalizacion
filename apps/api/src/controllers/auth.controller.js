import jwt from 'jsonwebtoken'
import { loginSchema } from '../schemas/auth.schemas.js'

export function login(req, res, next) {
  try {
    console.log('Login attempt:', req.body)
    console.log('JWT_SECRET exists?', !!process.env.JWT_SECRET)
    const parsed = loginSchema.parse(req.body)
    const { email, password } = parsed
    if (email === 'admin@unap.cl' && password === '123456') {
      const token = jwt.sign({ email, role: 'admin' }, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: '1h',
      })
      return res.status(200).json({ data: { token, role: 'admin' }, error: null })
    }
    return res.status(401).json({ data: null, error: 'INVALID_CREDENTIALS' })
  } catch (err) {
    if (err.name === 'ZodError') {
      return res
        .status(400)
        .json({ data: null, error: 'VALIDATION_ERROR', details: err.issues })
    }
    next(err)
  }
}
