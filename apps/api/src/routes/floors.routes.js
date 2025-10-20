import { Router } from 'express'
import * as ctrl from '../controllers/floors.controller.js'
import { adminOnly } from '../middlewares/auth.middleware.js'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const router = Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsPath = path.join(__dirname, '..', '..', 'uploads')
    cb(null, uploadsPath)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, Date.now() + '-' + file.fieldname + ext)
  }
})
const upload = multer({ storage })

router.post('/floors', adminOnly, upload.single('imagen'), ctrl.create)
router.get('/buildings/:id/floors', ctrl.listByBuilding)
router.put('/floors/:id', adminOnly, ctrl.update)
router.delete('/floors/:id', adminOnly, ctrl.remove)

export default router
