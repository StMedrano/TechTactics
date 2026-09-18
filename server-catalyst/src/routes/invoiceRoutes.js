import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/requireAuth.js';
import { getStore } from '../services/storeFactory.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  buildZohoAuthorizeUrl,
  listZohoInvoices,
  listZohoItems,
  createZohoInvoice,
  exchangeCodeForToken,
  getInvoicePaymentLink,
  markZohoInvoiceAsSent,
  getZohoBooksConnectionCredentials,
  ensureZohoBooksContactForUser,
  resolveZohoBooksAuth
} from '../services/zohoBooksService.js';
import { env } from '../config/env.js';
import {
  notifyAdminsOfInvoicePaid,
  notifyCustomerOfInvoice
} from '../services/workflowNotificationService.js';

const router = Router();

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function isInvoicePaid(invoice) {
  const status = normalizeStatus(invoice?.status);
  const amount = toNumber(invoice?.amount);
  const balance = toNumber(invoice?.balance);
  return ['paid', 'closed'].includes(status) || (amount > 0 && balance <= 0);
}

function canRoleCreateInvoice(req, ticket) {
  if (req.user.role === 'admin') return true;
  if (req.user.role !== 'employee') return false;
  return String(ticket?.employeeId || '') === String(req.user.id);
}

function canRoleReadBooksItems(req) {
  return ['admin', 'employee'].includes(req.user?.role);
}

function normalizeBooksItem(item = {}) {
  const itemId = item.item_id || item.itemId || item.id || '';
  const rate = toNumber(item.rate || item.sales_rate || item.salesRate || item.price);
  const cost = toNumber(item.purchase_rate || item.purchaseRate || item.cost_rate || item.cost);

  return {
    id: String(itemId),
    itemId: String(itemId),
    name: String(item.name || item.item_name || 'Zoho Books item').trim(),
    description: String(item.description || item.sales_description || '').trim(),
    rate,
    cost,
    unit: String(item.unit || '').trim(),
    type: String(item.item_type || item.product_type || '').trim(),
    status: String(item.status || '').trim()
  };
}

function normalizeInvoiceItems(rawItems = []) {
  return (Array.isArray(rawItems) ? rawItems : [])
    .map((item) => {
      const itemId = item.itemId || item.item_id || item.id || '';
      const quantity = Math.max(toNumber(item.quantity || 1), 1);
      const rate = toNumber(item.rate || item.amount);
      const name = String(item.name || item.type || 'Service item').trim();
      const normalized = {
        description: String(item.description || '').trim(),
        quantity,
        rate
      };

      if (itemId) {
        normalized.item_id = String(itemId);
      } else {
        normalized.name = name;
      }

      return normalized;
    })
    .filter((item) => (item.item_id || item.name) && item.rate > 0);
}

function getZohoBooksErrorMessage(error) {
  const data = error?.response?.data;
  if (!data) {
    return error?.message || 'Zoho Books rejected the invoice.';
  }

  if (typeof data === 'string') {
    return data;
  }

  const candidates = [
    data.message,
    data.error,
    data.error_description,
    data.details?.message
  ].filter(Boolean);

  if (Array.isArray(data.errors)) {
    candidates.push(
      ...data.errors
        .map((entry) => entry?.message || entry?.error || entry?.field || '')
        .filter(Boolean)
    );
  }

  return candidates.join(' ') || error?.message || 'Zoho Books rejected the invoice.';
}

function getZohoBooksStatus(error) {
  const status = Number(error?.response?.status || error?.status || 502);
  return status >= 400 && status < 600 ? status : 502;
}

function isInvalidBooksCustomerError(error) {
  const message = getZohoBooksErrorMessage(error).toLowerCase();
  return (
    message.includes('select customer') ||
    (message.includes('customer') && message.includes('invalid')) ||
    (message.includes('customer_id') && message.includes('invalid'))
  );
}

async function refreshCustomerBooksContact(req, store, customer) {
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

async function findStoredInvoice(store, req, invoiceId) {
  const invoices = await store.listInvoices(req, req.user);
  return (
    invoices.find((invoice) => String(invoice.id) === String(invoiceId)) ||
    invoices.find((invoice) => String(invoice.zohoInvoiceId) === String(invoiceId)) ||
    invoices.find((invoice) => String(invoice.ticketId) === String(invoiceId)) ||
    null
  );
}

async function resolveInvoiceContext(req, payload = {}) {
  const store = getStore();
  const ticketId = String(payload.ticketId || '').trim();
  const customerId = String(payload.customerId || '').trim();

  const ticket = ticketId ? await store.getTicketById(req, ticketId) : null;
  const resolvedCustomerId = ticket?.customerId || customerId;
  const customer = resolvedCustomerId ? await store.getUserById(req, resolvedCustomerId) : null;

  return {
    store,
    ticket,
    customer
  };
}

function buildInvoicePayload({ ticket, customer, amount, notes, items }) {
  const description =
    String(notes || '').trim() ||
    ticket?.description ||
    ticket?.title ||
    ticket?.type ||
    'TechTactics service request';

  const lineItems = normalizeInvoiceItems(items);

  return {
    customer_id: customer.zohoContactId,
    reference_number: ticket?.id ? `TT-${ticket.id}` : undefined,
    notes: description,
    line_items: lineItems.length
      ? lineItems
      : [
          {
            name: ticket?.title || ticket?.type || 'Service request',
            description,
            quantity: 1,
            rate: amount
          }
        ]
  };
}

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json(await getStore().listInvoices(req, req.user));
}));

router.get('/zoho/authorize-url', requireAuth, asyncHandler(async (req, res) => {
  const connectionCredentials = await getZohoBooksConnectionCredentials(req);
  if (connectionCredentials) {
    return res.json({
      usingConnection: true,
      connectionLinkName: env.zoho.booksConnectionLinkName,
      message: 'Zoho Books is configured through Catalyst Connections. No manual token exchange is required.'
    });
  }

  res.json({ authorizeUrl: buildZohoAuthorizeUrl() });
}));

router.get('/zoho/list', requireAuth, asyncHandler(async (req, res) => {
  const auth = await resolveZohoBooksAuth(req);
  if (!auth) return res.status(400).json({ message: 'No Zoho Books connection or access token is available.' });
  res.json(await listZohoInvoices(auth));
}));

router.get('/zoho/items', requireAuth, asyncHandler(async (req, res) => {
  if (!canRoleReadBooksItems(req)) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  const auth = await resolveZohoBooksAuth(req);
  if (!auth) return res.status(400).json({ message: 'No Zoho Books connection or access token is available.' });

  const searchText = String(req.query.search || req.query.name || '').trim();
  const params = {
    per_page: 200
  };
  if (searchText) {
    params.search_text = searchText;
  }

  const data = await listZohoItems(auth, params);
  const rawItems = Array.isArray(data?.items) ? data.items : [];
  const items = rawItems.map(normalizeBooksItem).filter((item) => item.id && item.name);

  res.json({
    ...data,
    items
  });
}));

router.post('/zoho/token', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const connectionCredentials = await getZohoBooksConnectionCredentials(req);
  if (connectionCredentials) {
    return res.json({
      usingConnection: true,
      message: 'Catalyst Connections is active for Zoho Books. Manual token exchange is not required.'
    });
  }

  const tokenResult = await exchangeCodeForToken(req.body.code);
  if (tokenResult.refresh_token) {
    await getStore().saveSettings(req, { zoho_refresh_token: tokenResult.refresh_token });
  }
  res.json(tokenResult);
}));

router.post('/zoho/create', requireAuth, asyncHandler(async (req, res) => {
  if (!['admin', 'employee'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  const auth = await resolveZohoBooksAuth(req);
  if (!auth) return res.status(400).json({ message: 'No Zoho Books connection or access token is available.' });

  const { store, ticket, customer } = await resolveInvoiceContext(req, req.body || {});
  if (!ticket) {
    return res.status(400).json({ message: 'Select a portal request before creating an invoice.' });
  }

  if (!canRoleCreateInvoice(req, ticket)) {
    return res.status(403).json({ message: 'Employees can only invoice tickets assigned to them.' });
  }

  if (['pending_approval', 'quote_sent', 'quote_rejected', 'deposit_pending', 'rejected'].includes(normalizeStatus(ticket.status))) {
    return res.status(409).json({ message: 'Create invoices only after the customer approves the quote and the job is assigned.' });
  }

  if (!customer) {
    return res.status(404).json({ message: 'The customer for this request could not be found.' });
  }

  if (!customer.zohoContactId) {
    const contactResult = await ensureZohoBooksContactForUser(req, customer).catch(() => null);
    if (contactResult?.contactId) {
      customer.zohoContactId = contactResult.contactId;
      await store.updateUser(req, customer.id, { zoho_contact_id: contactResult.contactId });
    }
  }

  if (!customer.zohoContactId) {
    return res.status(409).json({
      message: 'This customer does not have a Zoho Books contact ID yet.'
    });
  }

  const items = normalizeInvoiceItems(req.body?.items || req.body?.lineItems || []);
  const itemTotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const amount = itemTotal || toNumber(req.body?.amount || ticket.quoteAmount);
  if (amount <= 0) {
    return res.status(400).json({ message: 'Enter a valid invoice amount greater than zero.' });
  }

  let payload = buildInvoicePayload({
    ticket,
    customer,
    amount,
    notes: req.body?.notes || req.body?.description || '',
    items
  });

  let zohoResponse;
  try {
    zohoResponse = await createZohoInvoice(auth, payload);
  } catch (error) {
    if (isInvalidBooksCustomerError(error)) {
      const refreshedContactId = await refreshCustomerBooksContact(req, store, customer);
      if (refreshedContactId) {
        payload = buildInvoicePayload({
          ticket,
          customer,
          amount,
          notes: req.body?.notes || req.body?.description || '',
          items
        });

        try {
          zohoResponse = await createZohoInvoice(auth, payload);
        } catch (retryError) {
          return res.status(getZohoBooksStatus(retryError)).json({
            message: `Zoho Books rejected the invoice after refreshing the customer: ${getZohoBooksErrorMessage(retryError)}`,
            zohoError: retryError?.response?.data || null
          });
        }
      }
    }

  if (zohoResponse) {
      // The retry succeeded after refreshing the customer's Zoho Books contact.
    } else {
      return res.status(getZohoBooksStatus(error)).json({
        message: `Zoho Books rejected the invoice: ${getZohoBooksErrorMessage(error)}`,
        zohoError: error?.response?.data || null
      });
    }
  }

  const invoice = zohoResponse?.invoice || {};
  let invoiceStatus = invoice.status || 'draft';
  if (invoice.invoice_id && env.zoho.markInvoiceSent) {
    const sentResult = await markZohoInvoiceAsSent(auth, invoice.invoice_id).catch(() => null);
    if (sentResult?.code === 0) {
      invoiceStatus = 'sent';
    }
  }
  const paymentPage = invoice.invoice_id
    ? await getInvoicePaymentLink(auth, invoice.invoice_id).catch(() => ({ paymentUrl: '' }))
    : { paymentUrl: '' };
  const latestInvoice = paymentPage.invoice || {};
  const existingInvoice = invoice.invoice_id ? await findStoredInvoice(store, req, invoice.invoice_id) : null;
  const stored = await store.upsertInvoice(req, {
    id: existingInvoice?.id || '',
    ticketId: ticket.id || '',
    customerId: customer.id || '',
    zohoInvoiceId: invoice.invoice_id || '',
    invoiceNumber: invoice.invoice_number || '',
    status: latestInvoice.status || invoiceStatus,
    amount: Number(latestInvoice.total || invoice.total || amount || 0),
    balance: Number(latestInvoice.balance || invoice.balance || invoice.total || amount || 0),
    paymentLink: paymentPage.paymentUrl || '',
    description: payload.notes || ''
  });

  await notifyCustomerOfInvoice(req, stored).catch(() => null);

  res.status(201).json({ ...zohoResponse, storedInvoice: stored });
}));

router.get('/:invoiceId/payment-link', requireAuth, asyncHandler(async (req, res) => {
  const auth = await resolveZohoBooksAuth(req);
  if (!auth) return res.status(400).json({ message: 'No Zoho Books connection or access token is available.' });
  const store = getStore();
  const storedInvoice = await findStoredInvoice(store, req, req.params.invoiceId);
  const zohoInvoiceId = storedInvoice?.zohoInvoiceId || req.params.invoiceId;
  const paymentLink = await getInvoicePaymentLink(auth, zohoInvoiceId);
  const latestInvoice = paymentLink.invoice || {};

  if (storedInvoice?.id) {
    const wasPaid = isInvoicePaid(storedInvoice);
    const updatedInvoice = await store.upsertInvoice(req, {
      ...storedInvoice,
      paymentLink: paymentLink.paymentUrl || storedInvoice.paymentLink,
      status: latestInvoice.status || storedInvoice.status,
      amount: Number(latestInvoice.total || storedInvoice.amount || 0),
      balance: Number(latestInvoice.balance || storedInvoice.balance || storedInvoice.amount || 0)
    });

    if (!wasPaid && isInvoicePaid(updatedInvoice)) {
      await notifyAdminsOfInvoicePaid(req, updatedInvoice).catch(() => null);
    }
  }

  res.json({
    paymentUrl: paymentLink.paymentUrl || storedInvoice?.paymentLink || '',
    expiresAt: paymentLink.expiresAt || '',
    status: latestInvoice.status || storedInvoice?.status || '',
    amount: Number(latestInvoice.total || storedInvoice?.amount || 0),
    balance: Number(latestInvoice.balance || storedInvoice?.balance || storedInvoice?.amount || 0)
  });
}));

export default router;
