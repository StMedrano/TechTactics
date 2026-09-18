import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getStore } from '../services/storeFactory.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json(await getStore().listServices(req, req.user));
}));

export default router;
