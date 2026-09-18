import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/requireAuth.js';
import { getStore } from '../services/storeFactory.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  ensureReviewRequest,
  getCustomerReviewRequests,
  getPublishedReviews,
  submitCustomerReview
} from '../utils/reviews.js';

const router = Router();

router.get('/public', asyncHandler(async (req, res) => {
  const settings = await getStore().getSettings(req);
  res.json(getPublishedReviews(settings));
}));

router.get('/pending', requireAuth, requireRole('customer'), asyncHandler(async (req, res) => {
  const settings = await getStore().getSettings(req);
  res.json(getCustomerReviewRequests(settings, req.user.id));
}));

router.post('/:ticketId', requireAuth, requireRole('customer'), asyncHandler(async (req, res) => {
  const store = getStore();
  const ticket = await store.getTicketById(req, req.params.ticketId);

  if (!ticket || String(ticket.customerId) !== String(req.user.id)) {
    return res.status(404).json({ message: 'Review request not found.' });
  }

  if (String(ticket.status).toLowerCase() !== 'completed') {
    return res.status(409).json({ message: 'Reviews can only be submitted for completed jobs.' });
  }

  const quote = String(req.body?.quote || '').trim();
  if (!quote) {
    return res.status(400).json({ message: 'A review message is required.' });
  }

  const settings = await store.getSettings(req);
  const seededSettings = ensureReviewRequest(settings, {
    ...ticket,
    customerName: req.user.name
  });
  const submitted = submitCustomerReview(seededSettings, req.user, ticket, req.body);
  await store.saveSettings(req, { customer_reviews: submitted.customer_reviews });

  res.status(201).json(submitted.review);
}));

export default router;
