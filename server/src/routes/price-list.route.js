import express from 'express';
import { getPriceList } from '../controller/price-list.controller.js';

const router = express.Router();

// Public: no auth.
router.get('/', getPriceList);

export default router;
