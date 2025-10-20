import * as ctrl from '../controllers/buildings.controller.js'
import { adminOnly } from '../middlewares/auth.middleware.js'

import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

import { Router } from 'express'
const router = Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		// Desde routes/ subir a api/ y entrar a uploads/
		const uploadsPath = path.join(__dirname, '..', '..', 'uploads')
		cb(null, uploadsPath)
	},
	filename: (req, file, cb) => {
		const ext = path.extname(file.originalname)
		cb(null, Date.now() + '-' + file.fieldname + ext)
	}
})
const upload = multer({ storage })

router.post('/buildings', adminOnly, upload.single('imagen'), ctrl.create)
router.get('/buildings', ctrl.list)
router.get('/buildings/:id', ctrl.getOne)
router.put('/buildings/:id', adminOnly, ctrl.update)
router.delete('/buildings/:id', adminOnly, ctrl.remove)

export default router
