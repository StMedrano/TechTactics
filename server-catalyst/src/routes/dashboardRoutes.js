import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/requireAuth.js';
import { getStore } from '../services/storeFactory.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getCustomerReviewRequests } from '../utils/reviews.js';

const router = Router();

router.get('/customer', requireAuth, requireRole('customer'), asyncHandler(async (req, res) => {
  const store = getStore();
  const [services, requests, invoices, settings] = await Promise.all([
    store.listServices(req, req.user),
    store.listTickets(req, req.user),
    store.listInvoices(req, req.user),
    store.getSettings(req)
  ]);
  res.json({
    services: services || [],
    requests: requests || [],
    invoices: invoices || [],
    reviewRequests: getCustomerReviewRequests(settings, req.user.id)
  });
}));

router.get('/employee', requireAuth, requireRole('employee'), asyncHandler(async (req, res) => {
  const store = getStore();
  const [profile, jobs, paychecks, timeEntries, activeTimeEntry] = await Promise.all([
    store.getUserById(req, req.user.id),
    store.listTickets(req, req.user),
    store.listPayments(req, req.user),
    store.listTimeEntries(req, req.user.id),
    store.getActiveTimeEntry(req, req.user.id)
  ]);
  res.json({
    profile: {
      ...(profile || {}),
      activeTimeEntry: activeTimeEntry || null
    },
    jobs: jobs || [],
    paychecks: paychecks || [],
    timeEntries: timeEntries || []
  });
}));

router.get('/admin', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const store = getStore();
  const [users, employees, requests, invoices] = await Promise.all([
    store.getUsers(req),
    store.getEmployees(req),
    store.listTickets(req, req.user),
    store.listInvoices(req, req.user)
  ]);
  res.json({
    users: users || [],
    employees: employees || [],
    requests: requests || [],
    invoices: invoices || []
  });
}));

export default router;
