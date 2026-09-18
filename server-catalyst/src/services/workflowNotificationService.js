import { getStore } from './storeFactory.js';
import { getPortalGroupEmail, sendPortalEmail } from './emailService.js';
import { sendDevicePushToUsers } from './devicePushService.js';
import { createNotificationsForUsers } from './inAppNotificationService.js';
import { getPortalUrl, getSmsCapablePhone, sendBulkTwilioSms, sendTwilioSms } from './twilioService.js';
import { applyEffectiveRole } from '../utils/users.js';

function formatStatus(value) {
  return String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : '$0.00';
}

function truncate(value, maxLength = 140) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getUserEmail(user) {
  const email = String(user?.email || '').trim();
  return email && email.includes('@') ? email : '';
}

function uniqueEmails(values) {
  return [...new Set((values || []).map((value) => String(value || '').trim()).filter((value) => value.includes('@')))];
}

function buildEmailContent({ title, lines, actionLabel, actionUrl }) {
  const cleanLines = (lines || []).map((line) => String(line || '').trim()).filter(Boolean);
  const doNotReply = 'Please do not reply to this email. This mailbox is not monitored for support requests.';
  const textParts = [title, '', doNotReply, '', ...cleanLines];

  if (actionUrl) {
    textParts.push('', `${actionLabel || 'Open portal'}: ${actionUrl}`);
  }

  const htmlLines = cleanLines
    .map((line) => `<p style="margin:0 0 12px;color:#243044;line-height:1.5;">${escapeHtml(line)}</p>`)
    .join('');
  const button = actionUrl
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#dba544;color:#101820;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">${escapeHtml(actionLabel || 'Open portal')}</a></p>`
    : '';

  const html = [
    '<div style="font-family:Arial,sans-serif;background:#f6f1e6;padding:24px;">',
    '<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e0d4bd;border-radius:16px;padding:28px;">',
    `<h1 style="margin:0 0 18px;color:#101820;font-size:24px;">${escapeHtml(title)}</h1>`,
    `<p style="margin:0 0 18px;color:#8a5a13;font-weight:700;line-height:1.5;">${escapeHtml(doNotReply)}</p>`,
    htmlLines,
    button,
    '<p style="margin:28px 0 0;color:#657083;font-size:13px;">TechTactics Portal notification. For help, open the portal or contact TechTactics directly.</p>',
    '</div>',
    '</div>'
  ].join('');

  return {
    text: textParts.join('\n'),
    html
  };
}

async function sendWorkflowEmail(req, { to, subject, title, lines, actionLabel, actionUrl }) {
  const recipients = uniqueEmails(Array.isArray(to) ? to : [to]);
  if (!recipients.length) {
    return { sent: false, reason: 'no_email_recipients' };
  }

  const content = buildEmailContent({
    title: title || subject,
    lines,
    actionLabel,
    actionUrl
  });

  return sendPortalEmail(req, {
    to: recipients,
    subject,
    text: content.text,
    html: content.html
  });
}

async function getUsersByIds(req, ids) {
  const store = getStore();
  const uniqueIds = [...new Set((ids || []).map((value) => String(value || '').trim()).filter(Boolean))];
  const users = await Promise.all(uniqueIds.map((id) => store.getUserById(req, id).catch(() => null)));
  return users.filter(Boolean);
}

async function getActiveAdmins(req) {
  const store = getStore();
  const [users, settings] = await Promise.all([store.getUsers(req), store.getSettings(req)]);
  return users
    .map((user) => applyEffectiveRole(user, settings))
    .filter((user) => user?.isActive !== false && String(user.role || '').toLowerCase() === 'admin');
}

async function getAdminNotificationEmails(req) {
  const admins = await getActiveAdmins(req).catch(() => []);
  return uniqueEmails([getPortalGroupEmail(), ...admins.map(getUserEmail)]);
}

async function sendAdminWorkflowEmail(req, { subject, title, lines, actionLabel, actionUrl }) {
  return sendWorkflowEmail(req, {
    to: await getAdminNotificationEmails(req),
    subject,
    title,
    lines,
    actionLabel,
    actionUrl
  });
}

async function notifyUsersInPortal(req, users, payload) {
  const activeUsers = (users || []).filter(Boolean);
  const inApp = await createNotificationsForUsers(req, activeUsers, payload);
  const push = await sendDevicePushToUsers(req, activeUsers, {
    title: payload.title,
    body: payload.body,
    url: payload.link ? getPortalUrl(payload.link, req) : getPortalUrl('/', req),
    tag: `${payload.type || 'portal'}-${payload.metadata?.ticketId || payload.metadata?.invoiceId || 'update'}`,
    data: payload.metadata || {}
  }).catch((error) => ({
    sent: false,
    reason: error?.message || 'device_push_failed',
    results: []
  }));

  return { inApp, push };
}

export async function notifyAdminsOfNewRequest(req, ticket) {
  const admins = await getActiveAdmins(req);
  const smsRecipients = admins.map((user) => getSmsCapablePhone(user.phone)).filter(Boolean);
  const adminUrl = getPortalUrl('/portal/admin/tickets', req);
  const serviceTitle = ticket.title || ticket.type || 'service request';

  const sms = smsRecipients.length
    ? await sendBulkTwilioSms(
        smsRecipients,
        `TechTactics new request from ${truncate(ticket.customerName || 'customer', 40)} for ${truncate(serviceTitle, 55)}. Review: ${adminUrl}`
      )
    : [];

  const email = await sendAdminWorkflowEmail(req, {
    subject: 'New TechTactics service request',
    title: 'New service request needs review',
    lines: [
      `Customer: ${ticket.customerName || 'Customer'}`,
      `Service: ${serviceTitle}`,
      ticket.address ? `Address: ${ticket.address}` : '',
      ticket.description ? `Details: ${truncate(ticket.description, 400)}` : '',
      'Review the request, add a quote, and send it to the customer for approval.'
    ],
    actionLabel: 'Review request',
    actionUrl: adminUrl
  });

  const portal = await notifyUsersInPortal(req, admins, {
    title: 'New service request',
    body: `${ticket.customerName || 'Customer'} requested ${serviceTitle}.`,
    type: 'ticket',
    link: '/portal/admin/tickets',
    metadata: { ticketId: ticket.id || '' }
  });

  return { sms, email, ...portal };
}

export async function notifyCustomerOfApprovalDecision(req, ticket, { approved, quote, assigneeName }) {
  const [customer] = await getUsersByIds(req, [ticket.customerId]);
  const phone = getSmsCapablePhone(customer?.phone);
  const portalUrl = getPortalUrl('/portal/customer', req);
  const serviceTitle = ticket.title || ticket.type || 'service';

  const smsBody = approved
    ? `TechTactics approved your request for ${truncate(serviceTitle, 50)}.${quote ? ` Quote: ${truncate(quote, 40)}.` : ''}${assigneeName ? ` ${truncate(assigneeName, 55)}.` : ''} Track updates: ${portalUrl}`
    : `TechTactics reviewed your request for ${truncate(serviceTitle, 50)}. Please check the portal for the latest details: ${portalUrl}`;

  const sms = phone ? await sendTwilioSms({ to: phone, body: smsBody }) : null;

  const email = await sendWorkflowEmail(req, {
    to: getUserEmail(customer),
    subject: approved ? 'Your TechTactics quote is ready' : 'TechTactics request update',
    title: approved ? 'Your quote is ready for approval' : 'Your request was reviewed',
    lines: approved
      ? [
          `Request: ${serviceTitle}`,
          quote ? `Quote: ${quote}` : '',
          assigneeName || 'After you approve the quote, a 50% deposit invoice will be created before scheduling.',
          'Open the portal to review and approve the quote.'
        ]
      : [
          `Request: ${serviceTitle}`,
          'Please open the portal to review the latest request update.'
        ],
    actionLabel: approved ? 'Review quote' : 'Open portal',
    actionUrl: portalUrl
  });

  const portal = await notifyUsersInPortal(req, customer ? [customer] : [], {
    title: approved ? 'Quote ready' : 'Request reviewed',
    body: approved
      ? `Your quote for ${serviceTitle} is ready to review.`
      : `Your request for ${serviceTitle} was reviewed.`,
    type: approved ? 'quote' : 'ticket',
    link: '/portal/customer',
    metadata: { ticketId: ticket.id || '' }
  });

  return { sms, email, ...portal };
}

export async function notifyAdminsOfQuoteApproval(req, ticket, depositInvoice) {
  const admins = await getActiveAdmins(req);
  const email = await sendAdminWorkflowEmail(req, {
    subject: 'Customer approved a TechTactics quote',
    title: 'Customer approved quote',
    lines: [
      `Customer: ${ticket.customerName || 'Customer'}`,
      `Request: ${ticket.title || ticket.type || 'Service request'}`,
      `Quote total: ${formatCurrency(ticket.quoteAmount)}`,
      `Deposit invoice: ${depositInvoice?.invoiceNumber || depositInvoice?.zohoInvoiceId || 'created'}`,
      `Deposit amount: ${formatCurrency(depositInvoice?.amount)}`,
      'The customer must pay the 50% deposit before choosing an install date.'
    ],
    actionLabel: 'Open service tickets',
    actionUrl: getPortalUrl('/portal/admin/tickets', req)
  });
  const portal = await notifyUsersInPortal(req, admins, {
    title: 'Customer approved quote',
    body: `${ticket.customerName || 'Customer'} approved ${ticket.title || ticket.type || 'a service quote'}. Deposit invoice ${depositInvoice?.invoiceNumber || 'created'}.`,
    type: 'quote',
    link: '/portal/admin/tickets',
    metadata: {
      ticketId: ticket.id || '',
      invoiceId: depositInvoice?.id || depositInvoice?.zohoInvoiceId || ''
    }
  });

  return { email, ...portal };
}

export async function notifyAdminsOfDepositPaid(req, ticket, depositInvoice, assignedUser) {
  const admins = await getActiveAdmins(req);
  const email = await sendAdminWorkflowEmail(req, {
    subject: 'TechTactics deposit paid and install scheduled',
    title: 'Deposit paid - install scheduled',
    lines: [
      `Customer: ${ticket.customerName || 'Customer'}`,
      `Request: ${ticket.title || ticket.type || 'Service request'}`,
      `Deposit invoice: ${depositInvoice?.invoiceNumber || depositInvoice?.zohoInvoiceId || 'paid'}`,
      `Install date: ${ticket.scheduledDate || 'Not set'}`,
      assignedUser?.name ? `Assigned to: ${assignedUser.name}` : '',
      'The assigned staff member has been notified.'
    ],
    actionLabel: 'Open dispatch queue',
    actionUrl: getPortalUrl('/portal/admin/jobs', req)
  });
  const portal = await notifyUsersInPortal(req, admins, {
    title: 'Deposit paid and scheduled',
    body: `${ticket.customerName || 'Customer'} paid the deposit and scheduled ${ticket.scheduledDate || 'an install date'}.`,
    type: 'payment',
    link: '/portal/admin/jobs',
    metadata: {
      ticketId: ticket.id || '',
      invoiceId: depositInvoice?.id || depositInvoice?.zohoInvoiceId || '',
      assignedUserId: assignedUser?.id || ''
    }
  });

  return { email, ...portal };
}

export async function notifyAdminsOfInvoicePaid(req, invoice) {
  const [customer] = await getUsersByIds(req, [invoice.customerId]);
  const admins = await getActiveAdmins(req);
  const email = await sendAdminWorkflowEmail(req, {
    subject: 'TechTactics invoice marked paid',
    title: 'Invoice payment detected',
    lines: [
      `Customer: ${customer?.name || invoice.customerName || 'Customer'}`,
      `Invoice: ${invoice.invoiceNumber || invoice.zohoInvoiceId || invoice.id || 'Invoice'}`,
      `Amount: ${formatCurrency(invoice.amount)}`,
      `Balance: ${formatCurrency(invoice.balance)}`,
      'This payment status was refreshed from Zoho Books.'
    ],
    actionLabel: 'Open invoices',
    actionUrl: getPortalUrl('/portal/admin/invoices', req)
  });
  const portal = await notifyUsersInPortal(req, admins, {
    title: 'Invoice paid',
    body: `${customer?.name || invoice.customerName || 'Customer'} paid invoice ${invoice.invoiceNumber || invoice.zohoInvoiceId || invoice.id || ''}.`,
    type: 'payment',
    link: '/portal/admin/invoices',
    metadata: {
      invoiceId: invoice.id || invoice.zohoInvoiceId || '',
      ticketId: invoice.ticketId || ''
    }
  });

  return { email, ...portal };
}

export async function notifyAssigneeOfDispatch(req, ticket, assigneeId) {
  const [assignee] = await getUsersByIds(req, [assigneeId]);
  const phone = getSmsCapablePhone(assignee?.phone);
  const dispatchPath = assignee?.role === 'admin' ? '/portal/admin/jobs' : '/portal/employee/jobs';
  const dispatchUrl = getPortalUrl(dispatchPath, req);
  const serviceTitle = ticket.title || ticket.type || 'service request';

  const sms = phone
    ? await sendTwilioSms({
        to: phone,
        body: `New TechTactics assignment: ${truncate(ticket.customerName || 'customer', 35)} - ${truncate(serviceTitle, 55)}. Open dispatches: ${dispatchUrl}`
      })
    : null;

  const email = await sendWorkflowEmail(req, {
    to: getUserEmail(assignee),
    subject: 'New TechTactics assignment',
    title: 'You have a new dispatch assignment',
    lines: [
      `Customer: ${ticket.customerName || 'Customer'}`,
      `Service: ${serviceTitle}`,
      ticket.scheduledDate ? `Install date: ${ticket.scheduledDate}` : '',
      ticket.address ? `Address: ${ticket.address}` : '',
      'Open the dispatch queue to review the ticket and update status.'
    ],
    actionLabel: 'Open dispatch',
    actionUrl: dispatchUrl
  });

  const portal = await notifyUsersInPortal(req, assignee ? [assignee] : [], {
    title: 'New dispatch assignment',
    body: `${ticket.customerName || 'Customer'} - ${serviceTitle}`,
    type: 'dispatch',
    link: dispatchPath,
    metadata: { ticketId: ticket.id || '' }
  });

  return { sms, email, ...portal };
}

export async function notifyCustomerOfDispatchStatus(req, ticket, actorName) {
  const [customer] = await getUsersByIds(req, [ticket.customerId]);
  const phone = getSmsCapablePhone(customer?.phone);
  const portalUrl = getPortalUrl('/portal/customer', req);
  const serviceTitle = ticket.title || ticket.type || 'service request';
  const statusLabel = formatStatus(ticket.status);

  const sms = phone
    ? await sendTwilioSms({
        to: phone,
        body: `TechTactics update: ${truncate(serviceTitle, 42)} is now ${statusLabel}.${actorName ? ` Technician: ${truncate(actorName, 24)}.` : ''}${ticket.note ? ` ${truncate(ticket.note, 80)}` : ''} Portal: ${portalUrl}`
      })
    : null;

  const email = await sendWorkflowEmail(req, {
    to: getUserEmail(customer),
    subject: `TechTactics ticket update: ${statusLabel}`,
    title: `Your service ticket is ${statusLabel}`,
    lines: [
      `Request: ${serviceTitle}`,
      actorName ? `Updated by: ${actorName}` : '',
      ticket.note ? `Note: ${ticket.note}` : '',
      'You can track the latest status in your portal.'
    ],
    actionLabel: 'View ticket',
    actionUrl: portalUrl
  });

  const portal = await notifyUsersInPortal(req, customer ? [customer] : [], {
    title: `Ticket ${statusLabel}`,
    body: `${serviceTitle} is now ${statusLabel}.`,
    type: 'ticket',
    link: '/portal/customer/services',
    metadata: { ticketId: ticket.id || '' }
  });

  return { sms, email, ...portal };
}

export async function notifyCustomerOfInvoice(req, invoice) {
  const [customer] = await getUsersByIds(req, [invoice.customerId]);
  const phone = getSmsCapablePhone(customer?.phone);
  const link = invoice.paymentLink || getPortalUrl('/portal/customer/payments', req);
  const isDeposit = String(invoice.description || '').toLowerCase().includes('deposit');
  const invoiceLabel = isDeposit ? 'deposit invoice' : 'invoice';

  const sms = phone
    ? await sendTwilioSms({
        to: phone,
        body: `Your TechTactics ${invoiceLabel} ${truncate(invoice.invoiceNumber || '', 20)} is ready.${invoice.amount ? ` Amount: ${formatCurrency(invoice.amount)}.` : ''} Pay here: ${link}`
      })
    : null;

  const email = await sendWorkflowEmail(req, {
    to: getUserEmail(customer),
    subject: isDeposit ? 'Your TechTactics 50% deposit invoice is ready' : 'Your TechTactics invoice is ready',
    title: isDeposit ? 'Your 50% deposit invoice is ready' : 'Your invoice is ready',
    lines: [
      invoice.invoiceNumber ? `Invoice number: ${invoice.invoiceNumber}` : '',
      `Amount: ${formatCurrency(invoice.amount)}`,
      Number(invoice.balance || 0) > 0 ? `Balance due: ${formatCurrency(invoice.balance)}` : '',
      isDeposit
        ? 'Once the deposit is paid, return to the portal to choose your install date.'
        : 'You can pay securely through the portal using the Zoho Books payment link.'
    ],
    actionLabel: 'Pay invoice',
    actionUrl: link
  });

  const portal = await notifyUsersInPortal(req, customer ? [customer] : [], {
    title: isDeposit ? 'Deposit invoice ready' : 'Invoice ready',
    body: `${isDeposit ? 'Deposit invoice' : 'Invoice'} ${invoice.invoiceNumber || ''} is ready. Amount: ${formatCurrency(invoice.amount)}.`,
    type: isDeposit ? 'deposit' : 'invoice',
    link: '/portal/customer/payments',
    metadata: {
      invoiceId: invoice.id || invoice.zohoInvoiceId || '',
      ticketId: invoice.ticketId || ''
    }
  });

  return { sms, email, ...portal };
}

export async function notifyCustomerOfReviewRequest(req, ticket) {
  const [customer] = await getUsersByIds(req, [ticket.customerId]);
  const phone = getSmsCapablePhone(customer?.phone);
  const portalUrl = getPortalUrl('/portal/customer', req);
  const serviceTitle = ticket.title || ticket.type || 'service';

  const sms = phone
    ? await sendTwilioSms({
        to: phone,
        body: `Your TechTactics job ${truncate(serviceTitle, 45)} is complete. Please review the work in your portal: ${portalUrl}`
      })
    : null;

  const email = await sendWorkflowEmail(req, {
    to: getUserEmail(customer),
    subject: 'How did TechTactics do?',
    title: 'Your service is complete',
    lines: [
      `Completed job: ${serviceTitle}`,
      'Please open the portal and leave a review when you have a moment.'
    ],
    actionLabel: 'Leave a review',
    actionUrl: portalUrl
  });

  const portal = await notifyUsersInPortal(req, customer ? [customer] : [], {
    title: 'Review requested',
    body: `${serviceTitle} is complete. Please leave a review when you have a moment.`,
    type: 'review',
    link: '/portal/customer',
    metadata: { ticketId: ticket.id || '' }
  });

  return { sms, email, ...portal };
}
