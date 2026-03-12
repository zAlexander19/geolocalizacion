import express from 'express';
import { submitRating, getRatings } from '../controllers/appRatings.controller.js';

const router = express.Router();

router.post('/', submitRating);
router.get('/', getRatings); // Should protect with admin-only middleware in reality

export default router;
