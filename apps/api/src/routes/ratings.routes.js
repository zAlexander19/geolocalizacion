import express from 'express';
import { submitRating, getRatings } from '../controllers/ratings.controller.js';

const router = express.Router();

router.post('/', submitRating);
router.get('/:entity_type/:entity_id', getRatings);

export default router;
