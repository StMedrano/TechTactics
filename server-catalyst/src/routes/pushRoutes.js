import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  deleteDevicePushSubscription,
  getDevicePushConfig,
  saveDevicePushSubscription
} from '../services/devicePushService.js';

const router = Router();

router.get('/config', requireAuth, asyncHandler(async (_req, res) => {
  res.json(getDevicePushConfig());
}));

router.post('/subscriptions', requireAuth, asyncHandler(async (req, res) => {
  const subscription = await saveDevicePushSubscription(req, req.user, req.body?.subscription || req.body);
  res.status(201).json(subscription);
}));

router.delete('/subscriptions', requireAuth, asyncHandler(async (req, res) => {
  const deleted = await deleteDevicePushSubscription(req, req.user, req.body?.endpoint || '');
  res.json({ deleted });
}));

export default router;
