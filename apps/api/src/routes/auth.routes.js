import express from 'express'
import { 
  login, 
  getCurrentUser, 
  changePassword,
  resetUserPassword,
  getAllUsers,
  createUser,
  updateUserStatus,
  updateUser
} from '../controllers/auth.controller.js'
import { verifyToken, requireAdminPrimario } from '../middlewares/auth.middleware.js'

const router = express.Router()

// Rutas públicas
router.post('/login', login)

// Rutas protegidas (requieren autenticación)
router.get('/me', verifyToken, getCurrentUser)
router.post('/change-password', verifyToken, changePassword)

// Rutas solo para admin primario
router.get('/users', verifyToken, requireAdminPrimario, getAllUsers)
router.post('/users', verifyToken, requireAdminPrimario, createUser)
router.put('/users/:userId', verifyToken, requireAdminPrimario, updateUser)
router.post('/users/:userId/reset-password', verifyToken, requireAdminPrimario, resetUserPassword)
router.patch('/users/:userId/status', verifyToken, requireAdminPrimario, updateUserStatus)

export default router
