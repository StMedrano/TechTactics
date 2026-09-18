import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/requireAuth.js';
import { getStore } from '../services/storeFactory.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/paychecks', requireAuth, requireRole('employee'), asyncHandler(async (req, res) => {
  res.json(await getStore().listPayments(req, req.user));
}));

export default router;
