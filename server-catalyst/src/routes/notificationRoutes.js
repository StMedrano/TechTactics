import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead
} from '../services/inAppNotificationService.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const unreadOnly = String(req.query.unreadOnly || '').toLowerCase() === 'true';
  res.json(await listNotificationsForUser(req, req.user, { unreadOnly }));
}));

router.patch('/:notificationId/read', requireAuth, asyncHandler(async (req, res) => {
  const notification = await markNotificationRead(req, req.user, req.params.notificationId);
  if (!notification) {
    return res.status(404).json({ message: 'Notification not found.' });
  }

  res.json(notification);
}));

router.patch('/read-all', requireAuth, asyncHandler(async (req, res) => {
  const notifications = await markAllNotificationsRead(req, req.user);
  res.json({
    notifications,
    unreadCount: 0
  });
}));

export default router;
