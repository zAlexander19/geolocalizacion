import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  url: process.env.CLOUDINARY_URL,
  secure: true,
});

export default cloudinary;
