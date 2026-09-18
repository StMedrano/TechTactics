import { Router } from 'express';
import { randomUUID } from 'crypto';
import { requireAuth } from '../middleware/requireAuth.js';
import { getStore } from '../services/storeFactory.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ensureReviewRequest } from '../utils/reviews.js';
import { applyEffectiveRole } from '../utils/users.js';
import {
  notifyAdminsOfNewRequest,
  notifyAdminsOfDepositPaid,
  notifyAdminsOfQuoteApproval,
  notifyAssigneeOfDispatch,
  notifyCustomerOfApprovalDecision,
  notifyCustomerOfDispatchStatus,
  notifyCustomerOfInvoice,
  notifyCustomerOfReviewRequest
} from '../services/workflowNotificationService.js';
import {
  createZohoInvoice,
  ensureZohoBooksContactForUser,
  getInvoicePaymentLink,
  markZohoInvoiceAsSent,
  resolveZohoBooksAuth
} from '../services/zohoBooksService.js';

const router = Router();
const INTERNAL_TICKET_STATUSES = new Set([
  'open',
  'dispatched',
  'quoted',
  'quote_sent',
  'quote_rejected',
  'deposit_pending',
  'awaiting_equipment',
  'pending',
  'completed'
]);
const ACTIVE_ASSIGNMENT_STATUSES = new Set([
  'open',
  'dispatched',
  'quoted',
  'awaiting_equipment',
  'pending'
]);
const SCHEDULE_BLOCKING_STATUSES = new Set([
  'open',
  'dispatched',
  'quoted',
  'awaiting_equipment',
  'pending',
  'quote_sent'
]);
const APPROVAL_REVIEW_STATUSES = new Set([
  'pending_approval',
  'pending',
  'requested',
  'new'
]);

function normalizeStatus(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function pickRandomItem(items) {
  if (!items.length) return null;
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

async function getStaffedUsers(req) {
  const store = getStore();
  const [users, settings] = await Promise.all([store.getUsers(req), store.getSettings(req)]);

  return users
    .map((user) => applyEffectiveRole(user, settings))
    .filter((user) => user?.isActive !== false && (user.role === 'admin' || user.role === 'employee'));
}

function getReviewQueueAssignee(staffedUsers) {
  const admins = staffedUsers.filter((user) => user.role === 'admin');
  return pickRandomItem(admins.length ? admins : staffedUsers);
}

function buildDispatchHistoryEntry({ status, note, actorName, actorRole, occurredAt, quote }) {
  return {
    status,
    note: String(note || '').trim(),
    quote: String(quote || '').trim(),
    updatedBy: actorName,
    actorRole,
    occurredAt
  };
}

function buildWorkflowHistoryEntry({
  status,
  note,
  actorName,
  actorRole,
  occurredAt,
  quoteText,
  quoteAmount,
  quoteItems,
  scheduledDate,
  customerQuoteStatus
}) {
  return {
    ...buildDispatchHistoryEntry({
      status,
      note,
      actorName,
      actorRole,
      occurredAt,
      quote: quoteText
    }),
    quoteText: String(quoteText || '').trim(),
    quoteAmount: Number(quoteAmount || 0),
    quoteItems: Array.isArray(quoteItems) ? quoteItems : [],
    scheduledDate: String(scheduledDate || '').trim(),
    customerQuoteStatus: String(customerQuoteStatus || '').trim()
  };
}

function appendDispatchHistory(ticket, entry) {
  const history = Array.isArray(ticket?.dispatchHistory) ? ticket.dispatchHistory : [];
  return [...history, entry];
}

function buildActiveLoadByUserId(tickets) {
  return (tickets || []).reduce((acc, ticket) => {
    const status = normalizeStatus(ticket?.status);
    if (!ACTIVE_ASSIGNMENT_STATUSES.has(status)) {
      return acc;
    }

    const employeeId = String(ticket?.employeeId || '').trim();
    if (!employeeId) {
      return acc;
    }

    acc.set(employeeId, (acc.get(employeeId) || 0) + 1);
    return acc;
  }, new Map());
}

function filterUsersWithCapacity(users, activeLoadByUserId) {
  return users.filter((user) => {
    const maxActiveJobs = Number(user?.maxActiveJobs || 0);
    if (!Number.isFinite(maxActiveJobs) || maxActiveJobs <= 0) {
      return true;
    }

    return (activeLoadByUserId.get(String(user.id)) || 0) < maxActiveJobs;
  });
}

function getDispatchAssignee(staffedUsers, tickets) {
  const activeLoadByUserId = buildActiveLoadByUserId(tickets);
  const withCapacity = filterUsersWithCapacity(staffedUsers, activeLoadByUserId);
  const candidates = withCapacity.length ? withCapacity : staffedUsers;
  const clockedInEmployees = candidates.filter((user) => user.role === 'employee' && user.isClockedIn);
  const clockedInStaff = candidates.filter((user) => user.isClockedIn);
  const employees = candidates.filter((user) => user.role === 'employee');
  const admins = candidates.filter((user) => user.role === 'admin');

  return (
    pickRandomItem(clockedInEmployees) ||
    pickRandomItem(clockedInStaff) ||
    pickRandomItem(employees) ||
    pickRandomItem(admins) ||
    pickRandomItem(candidates)
  );
}

function getPendingApprovalNote() {
  return 'Awaiting admin approval and quote.';
}

function getStatusLabel(status) {
  return String(status || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toMoneyAmount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isDepositInvoice(invoice) {
  const description = String(invoice?.description || '').toLowerCase();
  return description.includes('50% deposit') || description.includes('deposit invoice');
}

function isInvoicePaid(invoice) {
  const status = normalizeStatus(invoice?.status);
  const amount = toMoneyAmount(invoice?.amount);
  const balance = toMoneyAmount(invoice?.balance);
  return ['paid', 'closed'].includes(status) || (amount > 0 && balance <= 0);
}

function getDepositAmount(ticket) {
  return Math.round((toMoneyAmount(ticket?.quoteAmount) * 0.5 + Number.EPSILON) * 100) / 100;
}

function buildDepositDescription(ticket, depositAmount) {
  return [
    `50% deposit for ticket #${ticket.id}.`,
    `Quote total: $${toMoneyAmount(ticket.quoteAmount).toFixed(2)}.`,
    `Deposit required before scheduling: $${depositAmount.toFixed(2)}.`,
    ticket.quoteText ? `Quote details: ${ticket.quoteText}` : ''
  ].filter(Boolean).join(' ');
}

async function ensureBooksCustomerForDeposit(req, store, customer) {
  const contactResult = await ensureZohoBooksContactForUser(
    req,
    {
      ...customer,
      zohoContactId: ''
    },
    { forceLookup: true }
  ).catch(() => null);

  if (!contactResult?.contactId) {
    return '';
  }

  customer.zohoContactId = contactResult.contactId;
  await store.updateUser(req, customer.id, { zoho_contact_id: contactResult.contactId }).catch(() => null);
  return contactResult.contactId;
}

async function createDepositInvoiceForTicket(req, store, ticket) {
  const auth = await resolveZohoBooksAuth(req);
  if (!auth) {
    const error = new Error('Zoho Books is required to create the 50% deposit invoice before scheduling.');
    error.status = 409;
    throw error;
  }

  const customer = await store.getUserById(req, ticket.customerId);
  if (!customer) {
    const error = new Error('The customer for this quote could not be found.');
    error.status = 404;
    throw error;
  }

  const contactId = await ensureBooksCustomerForDeposit(req, store, customer);
  if (!contactId) {
    const error = new Error('Unable to create or match this customer in Zoho Books for the deposit invoice.');
    error.status = 409;
    throw error;
  }

  const depositAmount = getDepositAmount(ticket);
  if (depositAmount <= 0) {
    const error = new Error('The quote amount must be greater than zero before creating a deposit invoice.');
    error.status = 400;
    throw error;
  }

  const description = buildDepositDescription(ticket, depositAmount);
  const zohoResponse = await createZohoInvoice(auth, {
    customer_id: contactId,
    reference_number: `TT-${ticket.id}-DEP`,
    notes: description,
    line_items: [
      {
        name: '50% Deposit',
        description,
        quantity: 1,
        rate: depositAmount
      }
    ]
  });

  const invoice = zohoResponse?.invoice || {};
  if (invoice.invoice_id) {
    await markZohoInvoiceAsSent(auth, invoice.invoice_id).catch(() => null);
  }

  const paymentPage = invoice.invoice_id
    ? await getInvoicePaymentLink(auth, invoice.invoice_id).catch(() => ({ paymentUrl: '', invoice: null }))
    : { paymentUrl: '', invoice: null };
  const latestInvoice = paymentPage.invoice || invoice;
  const stored = await store.upsertInvoice(req, {
    ticketId: ticket.id || '',
    customerId: customer.id || '',
    zohoInvoiceId: invoice.invoice_id || '',
    invoiceNumber: invoice.invoice_number || '',
    status: latestInvoice.status || invoice.status || 'sent',
    amount: Number(latestInvoice.total || invoice.total || depositAmount),
    balance: Number(latestInvoice.balance || invoice.balance || depositAmount),
    paymentLink: paymentPage.paymentUrl || '',
    description
  });

  await notifyCustomerOfInvoice(req, stored).catch(() => null);
  return stored;
}

async function getDepositInvoiceState(req, store, ticketId) {
  const invoices = await store.listInvoices(req, { role: 'admin' });
  const depositInvoice = invoices.find(
    (invoice) => String(invoice.ticketId) === String(ticketId) && isDepositInvoice(invoice)
  );

  if (!depositInvoice) {
    return { invoice: null, paid: false };
  }

  let latestInvoice = depositInvoice;
  if (depositInvoice.zohoInvoiceId) {
    const auth = await resolveZohoBooksAuth(req).catch(() => null);
    if (auth) {
      const paymentState = await getInvoicePaymentLink(auth, depositInvoice.zohoInvoiceId).catch(() => null);
      if (paymentState?.invoice) {
        latestInvoice = {
          ...depositInvoice,
          status: paymentState.invoice.status || depositInvoice.status,
          amount: Number(paymentState.invoice.total || depositInvoice.amount || 0),
          balance: Number(paymentState.invoice.balance || depositInvoice.balance || depositInvoice.amount || 0),
          paymentLink: paymentState.paymentUrl || depositInvoice.paymentLink
        };
        await store.upsertInvoice(req, latestInvoice).catch(() => null);
      }
    }
  }

  return {
    invoice: latestInvoice,
    paid: isInvoicePaid(latestInvoice)
  };
}

function getApprovalNote({ status, quote, assignedUser, note }) {
  if (status === 'open') {
    const parts = [];

    if (quote) {
      parts.push(`Quote: ${quote}.`);
    }

    parts.push('Approved by admin.');

    if (assignedUser?.name) {
      parts.push(`Assigned to ${assignedUser.name}.`);
    }

    return parts.join(' ');
  }

  return note || 'Rejected by admin. Please review the request details and resubmit if needed.';
}

function buildDispatchNote(status, actorName, note, occurredAt) {
  const segments = [`${getStatusLabel(status)} by ${actorName} on ${occurredAt}.`];
  if (note) {
    segments.push(`Note: ${note}`);
  }
  return segments.join(' ');
}

function normalizeDateOnly(value) {
  const raw = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return '';
  }
  return raw;
}

function isScheduleBlockingTicket(ticket, currentTicketId = '') {
  if (currentTicketId && String(ticket?.id) === String(currentTicketId)) {
    return false;
  }

  return SCHEDULE_BLOCKING_STATUSES.has(normalizeStatus(ticket?.status));
}

async function ensureInstallDateAvailable(req, scheduledDate, ticketId = '') {
  const store = getStore();
  const allTickets = await store.listTickets(req, { role: 'admin' });
  const conflict = allTickets.find(
    (ticket) =>
      normalizeDateOnly(ticket.scheduledDate) === scheduledDate &&
      isScheduleBlockingTicket(ticket, ticketId)
  );

  if (conflict) {
    const label = conflict.customerName || conflict.title || `ticket #${conflict.id}`;
    const error = new Error(`Only one install can be scheduled per day. ${scheduledDate} is already reserved for ${label}.`);
    error.status = 409;
    throw error;
  }
}

router.get('/', requireAuth, asyncHandler(async (_req, res) => {
  res.json(await getStore().listTickets(_req, _req.user));
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const isCustomerRequest = req.user.role === 'customer';
  const staffedUsers = await getStaffedUsers(req);
  const fallbackAssignee = getReviewQueueAssignee(staffedUsers);
  const requestedEmployeeId = String(req.body.employeeId || '').trim();

  if (!requestedEmployeeId && !fallbackAssignee?.id) {
    return res.status(409).json({
      message: 'No active admin or employee accounts are available to receive new requests.'
    });
  }

  const ticket = {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: isCustomerRequest ? 'pending_approval' : 'open',
    customerId: isCustomerRequest ? req.user.id : req.body.customerId,
    employeeId: requestedEmployeeId || fallbackAssignee.id,
    type: req.body.serviceType || req.body.type || 'New Install',
    category: req.body.category || '',
    title: req.body.title || req.body.serviceType || req.body.type || 'Service request',
    address: req.body.address || '',
    description: req.body.description || '',
    note: req.body.note || (isCustomerRequest ? getPendingApprovalNote() : ''),
    dispatchHistory: [
      buildDispatchHistoryEntry({
        status: isCustomerRequest ? 'pending_approval' : 'open',
        note: req.body.note || (isCustomerRequest ? getPendingApprovalNote() : 'Request created.'),
        actorName: req.user.name || 'Portal User',
        actorRole: req.user.role,
        occurredAt: new Date().toISOString()
      })
    ]
  };
  if (!ticket.customerId) {
    ticket.customerId = randomUUID();
  }
  const saved = await getStore().createTicket(req, ticket);
  await notifyAdminsOfNewRequest(req, {
    ...saved,
    customerName: req.user.name || saved.customerName
  }).catch(() => null);
  res.status(201).json(saved);
}));

router.patch('/:ticketId/approval', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  const nextStatus = normalizeStatus(req.body?.status);
  if (!['approved', 'rejected'].includes(nextStatus)) {
    return res.status(400).json({ message: 'Approval status must be approved or rejected.' });
  }

  const store = getStore();
  const existingTicket = await store.getTicketById(req, req.params.ticketId);
  if (!existingTicket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }

  if (!APPROVAL_REVIEW_STATUSES.has(normalizeStatus(existingTicket.status))) {
    return res.status(409).json({ message: 'Only pending approval requests can be reviewed.' });
  }

  const quote = String(req.body?.quote || '').trim();
  const reviewNote = String(req.body?.note || '').trim();
  let assignedUser = null;
  let employeeId = existingTicket.employeeId;
  const storedStatus = nextStatus === 'approved' ? 'open' : 'rejected';
  const allTickets = await store.listTickets(req, req.user);

  if (nextStatus === 'approved') {
    const staffedUsers = await getStaffedUsers(req);
    assignedUser = getDispatchAssignee(staffedUsers, allTickets);

    if (!assignedUser?.id) {
      return res.status(409).json({
        message: 'No active admin or employee accounts are available for assignment.'
      });
    }

    employeeId = assignedUser.id;
  }

  const occurredAt = new Date().toISOString();
  const approvalNote = getApprovalNote({
    status: storedStatus,
    quote,
    assignedUser,
    note: reviewNote
  });
  const updatedTicket = await store.updateTicket(req, req.params.ticketId, {
    status: storedStatus,
    employeeId,
    note: approvalNote,
    dispatchHistory: appendDispatchHistory(
      existingTicket,
      buildDispatchHistoryEntry({
        status: storedStatus,
        note: approvalNote,
        quote,
        actorName: req.user.name || 'Admin',
        actorRole: req.user.role,
        occurredAt
      })
    ),
    updatedAt: occurredAt
  });

  const ticketForNotifications = {
    ...existingTicket,
    ...updatedTicket,
    customerName: existingTicket.customerName || updatedTicket.customerName || ''
  };

  await notifyCustomerOfApprovalDecision(req, ticketForNotifications, {
    approved: storedStatus === 'open',
    quote,
    assigneeName: assignedUser?.name || updatedTicket.assignedEmployee || ''
  }).catch(() => null);

  if (storedStatus === 'open' && assignedUser?.id) {
    await notifyAssigneeOfDispatch(req, ticketForNotifications, assignedUser.id).catch(() => null);
  }

  res.json({
    ...updatedTicket,
    assignedEmployee: assignedUser?.name || updatedTicket.assignedEmployee
  });
}));

router.patch('/:ticketId/quote', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  const store = getStore();
  const existingTicket = await store.getTicketById(req, req.params.ticketId);
  if (!existingTicket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }

  const currentStatus = normalizeStatus(existingTicket.status);
  if (!APPROVAL_REVIEW_STATUSES.has(currentStatus) && currentStatus !== 'quote_sent') {
    return res.status(409).json({ message: 'Quotes can only be created for requests awaiting review.' });
  }

  const quoteText = String(req.body?.quoteText || req.body?.quote || '').trim();
  const quoteAmount = Number(req.body?.quoteAmount || req.body?.amount || 0);
  const quoteItems = Array.isArray(req.body?.quoteItems) ? req.body.quoteItems : [];

  if (!quoteText) {
    return res.status(400).json({ message: 'Add quote details before sending this to the customer.' });
  }

  if (!Number.isFinite(quoteAmount) || quoteAmount <= 0) {
    return res.status(400).json({ message: 'Enter a quote amount greater than zero.' });
  }

  const occurredAt = new Date().toISOString();
  const note = `Quote sent to customer for approval: ${quoteText}`;
  const updatedTicket = await store.updateTicket(req, req.params.ticketId, {
    status: 'quote_sent',
    quoteText,
    quoteAmount,
    quoteItems,
    customerQuoteStatus: 'sent',
    quoteSentAt: occurredAt,
    note,
    dispatchHistory: appendDispatchHistory(
      existingTicket,
      buildWorkflowHistoryEntry({
        status: 'quote_sent',
        note,
        quoteText,
        quoteAmount,
        quoteItems,
        customerQuoteStatus: 'sent',
        actorName: req.user.name || 'Admin',
        actorRole: req.user.role,
        occurredAt
      })
    ),
    updatedAt: occurredAt
  });

  await notifyCustomerOfApprovalDecision(req, {
    ...existingTicket,
    ...updatedTicket,
    customerName: existingTicket.customerName || updatedTicket.customerName || ''
  }, {
    approved: true,
    quote: `${quoteText} Estimate: $${quoteAmount.toFixed(2)}`,
    assigneeName: 'Pending 50% deposit before scheduling'
  }).catch(() => null);

  res.json(updatedTicket);
}));

router.patch('/:ticketId/quote-response', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ message: 'Only customers can respond to quotes.' });
  }

  const store = getStore();
  const existingTicket = await store.getTicketById(req, req.params.ticketId);
  if (!existingTicket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }

  if (String(existingTicket.customerId) !== String(req.user.id)) {
    return res.status(403).json({ message: 'This quote is not assigned to your account.' });
  }

  if (normalizeStatus(existingTicket.status) !== 'quote_sent') {
    return res.status(409).json({ message: 'This request is not waiting on customer quote approval.' });
  }

  const quoteDecision = normalizeStatus(req.body?.status || req.body?.decision || '');
  if (!['approved', 'rejected'].includes(quoteDecision)) {
    return res.status(400).json({ message: 'Quote response must be approved or rejected.' });
  }

  const occurredAt = new Date().toISOString();

  if (quoteDecision === 'rejected') {
    const note = 'Quote rejected by customer.';
    const updatedTicket = await store.updateTicket(req, req.params.ticketId, {
      status: 'quote_rejected',
      customerQuoteStatus: 'rejected',
      note,
      dispatchHistory: appendDispatchHistory(
        existingTicket,
        buildWorkflowHistoryEntry({
          status: 'quote_rejected',
          note,
          quoteText: existingTicket.quoteText,
          quoteAmount: existingTicket.quoteAmount,
          quoteItems: existingTicket.quoteItems,
          customerQuoteStatus: 'rejected',
          actorName: req.user.name || 'Customer',
          actorRole: req.user.role,
          occurredAt
        })
      ),
      updatedAt: occurredAt
    });

    return res.json(updatedTicket);
  }

  const depositInvoice = await createDepositInvoiceForTicket(req, store, existingTicket);
  const depositAmount = Number(depositInvoice?.amount || getDepositAmount(existingTicket));
  const note = `Quote approved by customer. A 50% deposit invoice for $${depositAmount.toFixed(2)} was created. Deposit must be paid before scheduling.`;
  const updatedTicket = await store.updateTicket(req, req.params.ticketId, {
    status: 'deposit_pending',
    scheduledDate: '',
    customerQuoteStatus: 'deposit_pending',
    quoteApprovedAt: occurredAt,
    note,
    dispatchHistory: appendDispatchHistory(
      existingTicket,
      buildWorkflowHistoryEntry({
        status: 'deposit_pending',
        note,
        quoteText: existingTicket.quoteText,
        quoteAmount: existingTicket.quoteAmount,
        quoteItems: existingTicket.quoteItems,
        scheduledDate: '',
        customerQuoteStatus: 'deposit_pending',
        actorName: req.user.name || 'Customer',
        actorRole: req.user.role,
        occurredAt
      })
    ),
    updatedAt: occurredAt
  });

  await notifyAdminsOfQuoteApproval(req, {
    ...existingTicket,
    ...updatedTicket,
    customerName: existingTicket.customerName || updatedTicket.customerName || req.user.name || ''
  }, depositInvoice).catch(() => null);

  res.json({
    ...updatedTicket,
    depositInvoice
  });
}));

router.patch('/:ticketId/schedule', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ message: 'Only customers can schedule approved quotes.' });
  }

  const store = getStore();
  const existingTicket = await store.getTicketById(req, req.params.ticketId);
  if (!existingTicket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }

  if (String(existingTicket.customerId) !== String(req.user.id)) {
    return res.status(403).json({ message: 'This request is not assigned to your account.' });
  }

  if (normalizeStatus(existingTicket.status) !== 'deposit_pending') {
    return res.status(409).json({ message: 'This request is not waiting for deposit payment and scheduling.' });
  }

  const depositState = await getDepositInvoiceState(req, store, req.params.ticketId);
  if (!depositState.invoice) {
    return res.status(409).json({ message: 'No 50% deposit invoice was found for this quote yet.' });
  }

  if (!depositState.paid) {
    return res.status(409).json({
      message: `Pay the 50% deposit invoice before scheduling. Current deposit balance: $${Number(depositState.invoice.balance || 0).toFixed(2)}.`
    });
  }

  const scheduledDate = normalizeDateOnly(req.body?.scheduledDate || req.body?.installDate);
  if (!scheduledDate) {
    return res.status(400).json({ message: 'Choose an install date after the 50% deposit is paid.' });
  }

  await ensureInstallDateAvailable(req, scheduledDate, req.params.ticketId);

  const staffedUsers = await getStaffedUsers(req);
  const allTickets = await store.listTickets(req, { role: 'admin' });
  const assignedUser = getDispatchAssignee(staffedUsers, allTickets);
  if (!assignedUser?.id) {
    return res.status(409).json({
      message: 'No active admin or employee accounts are available for assignment.'
    });
  }

  const occurredAt = new Date().toISOString();
  const note = `50% deposit paid. Install scheduled for ${scheduledDate}. Assigned to ${assignedUser.name || 'staff'}.`;
  const updatedTicket = await store.updateTicket(req, req.params.ticketId, {
    status: 'open',
    employeeId: assignedUser.id,
    scheduledDate,
    customerQuoteStatus: 'approved',
    note,
    dispatchHistory: appendDispatchHistory(
      existingTicket,
      buildWorkflowHistoryEntry({
        status: 'open',
        note,
        quoteText: existingTicket.quoteText,
        quoteAmount: existingTicket.quoteAmount,
        quoteItems: existingTicket.quoteItems,
        scheduledDate,
        customerQuoteStatus: 'approved',
        actorName: req.user.name || 'Customer',
        actorRole: req.user.role,
        occurredAt
      })
    ),
    updatedAt: occurredAt
  });

  await notifyAssigneeOfDispatch(req, {
    ...existingTicket,
    ...updatedTicket,
    customerName: existingTicket.customerName || updatedTicket.customerName || req.user.name || ''
  }, assignedUser.id).catch(() => null);

  await notifyAdminsOfDepositPaid(req, {
    ...existingTicket,
    ...updatedTicket,
    customerName: existingTicket.customerName || updatedTicket.customerName || req.user.name || ''
  }, depositState.invoice, assignedUser).catch(() => null);

  res.json({
    ...updatedTicket,
    assignedEmployee: assignedUser.name || updatedTicket.assignedEmployee
  });
}));

router.patch('/:ticketId/dispatch', requireAuth, asyncHandler(async (req, res) => {
  if (!['admin', 'employee'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  const nextStatus = normalizeStatus(req.body?.status);
  if (!INTERNAL_TICKET_STATUSES.has(nextStatus)) {
    return res.status(400).json({
      message: 'Dispatch status must be Open, Dispatched, Quoted, Awaiting Equipment, Pending, or Completed.'
    });
  }

  const store = getStore();
  const existingTicket = await store.getTicketById(req, req.params.ticketId);
  if (!existingTicket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }

  const assignedToRequester = String(existingTicket.employeeId || '') === String(req.user.id);
  if (req.user.role === 'employee' && !assignedToRequester) {
    return res.status(403).json({ message: 'Employees can only dispatch their assigned tickets.' });
  }

  if (nextStatus !== 'open' && assignedToRequester && !req.user.isClockedIn) {
    return res.status(409).json({ message: 'Clock in before dispatching or updating this ticket.' });
  }

  const note = String(req.body?.note || '').trim();
  if (!note) {
    return res.status(400).json({ message: 'Add a dispatch note whenever you change a ticket status.' });
  }

  const occurredAt = new Date().toISOString();
  const statusNote = buildDispatchNote(nextStatus, req.user.name || 'Staff', note, occurredAt);
  const updatedTicket = await store.updateTicket(req, req.params.ticketId, {
    status: nextStatus,
    note: statusNote,
    dispatchHistory: appendDispatchHistory(
      existingTicket,
      buildDispatchHistoryEntry({
        status: nextStatus,
        note,
        actorName: req.user.name || 'Staff',
        actorRole: req.user.role,
        occurredAt
      })
    ),
    updatedAt: occurredAt
  });

  if (nextStatus === 'completed') {
    const settings = await store.getSettings(req);
    const nextSettings = ensureReviewRequest(settings, {
      ...updatedTicket,
      customerName: existingTicket.customerName
    });
    await store.saveSettings(req, nextSettings);
    await notifyCustomerOfReviewRequest(req, {
      ...existingTicket,
      ...updatedTicket
    }).catch(() => null);
  }

  await notifyCustomerOfDispatchStatus(req, {
    ...existingTicket,
    ...updatedTicket,
    note,
    customerName: existingTicket.customerName || updatedTicket.customerName || ''
  }, req.user.name || 'Staff').catch(() => null);

  res.json(updatedTicket);
}));

router.patch('/:ticketId/status', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  const nextStatus = normalizeStatus(req.body?.status);
  if (!nextStatus) {
    return res.status(400).json({ message: 'A status value is required.' });
  }

  const store = getStore();
  const existingTicket = await store.getTicketById(req, req.params.ticketId);
  if (!existingTicket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }

  let note = String(req.body?.note || '').trim();
  if (!note && nextStatus === 'completed') {
    note = 'Completed. Review request sent to customer.';
  }

  const updatedTicket = await store.updateTicket(req, req.params.ticketId, {
    status: nextStatus,
    note: note || existingTicket.note || '',
    dispatchHistory: appendDispatchHistory(
      existingTicket,
      buildDispatchHistoryEntry({
        status: nextStatus,
        note: note || existingTicket.note || '',
        actorName: req.user.name || 'Admin',
        actorRole: req.user.role,
        occurredAt: new Date().toISOString()
      })
    ),
    updatedAt: new Date().toISOString()
  });

  if (nextStatus === 'completed') {
    const settings = await store.getSettings(req);
    const nextSettings = ensureReviewRequest(settings, {
      ...updatedTicket,
      customerName: existingTicket.customerName
    });
    await store.saveSettings(req, nextSettings);
    await notifyCustomerOfReviewRequest(req, {
      ...existingTicket,
      ...updatedTicket
    }).catch(() => null);
  }

  await notifyCustomerOfDispatchStatus(req, {
    ...existingTicket,
    ...updatedTicket,
    customerName: existingTicket.customerName || updatedTicket.customerName || ''
  }, req.user.name || 'Admin').catch(() => null);

  res.json(updatedTicket);
}));

export default router;
