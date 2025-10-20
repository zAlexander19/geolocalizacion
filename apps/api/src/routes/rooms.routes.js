import { Router } from 'express'
import * as ctrl from '../controllers/rooms.controller.js'
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

router.post('/rooms', adminOnly, upload.single('imagen'), ctrl.create)
router.get('/rooms', ctrl.list)
router.get('/rooms/:id', ctrl.getOne)
router.put('/rooms/:id', adminOnly, ctrl.update)
router.delete('/rooms/:id', adminOnly, ctrl.remove)

export default router
