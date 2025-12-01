import { v2 as cloudinary } from 'cloudinary'

// Configurar Cloudinary con la URL del .env
cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL
})

export default cloudinary
