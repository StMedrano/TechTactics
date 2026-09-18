const crypto = require('crypto');
const OpenAI = require('openai');

let catalyst;
try {
  catalyst = require('zcatalyst-sdk-node');
} catch (_err) {
  catalyst = null;
}

const TABLES = {
  users: process.env.CATALYST_TABLE_USERS || 'Users',
  tickets: process.env.CATALYST_TABLE_TICKETS || 'Tickets'
};

const BOOKS = {
  connectionLinkName:
    process.env.ZOHO_BOOKS_CONNECTION_LINK_NAME ||
    process.env.CATALYST_ZOHO_BOOKS_CONNECTION_LINK_NAME ||
    'books',
  apiBaseUrl: process.env.ZOHO_API_BASE_URL || 'https://www.zohoapis.com',
  contactsPath: process.env.ZOHO_BOOKS_CONTACTS_PATH || '/books/v3/contacts',
  organizationId: process.env.ZOHO_ORGANIZATION_ID || ''
};

function getCatalystApp(req) {
  if (!catalyst) {
    throw new Error('Catalyst SDK is not available.');
  }
  return catalyst.initialize(req);
}

function escapeValue(value) {
  return String(value ?? '').replace(/'/g, "''");
}

function pick(row, ...keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null) {
      return row[key];
    }
  }
  return undefined;
}

function unwrapRows(result, tableName) {
  return (result || []).map((entry) => entry?.[tableName] || entry).filter(Boolean);
}

async function runQuery(req, query, tableName) {
  const response = await getCatalystApp(req).zcql().executeZCQLQuery(query);
  return unwrapRows(response, tableName);
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return ['true', '1', 'yes', 'y'].includes(String(value).toLowerCase());
}

function normalizeNumericPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? Number(digits) : undefined;
}

function normalizePhoneText(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `+1${digits}`;
  return digits.startsWith('1') && digits.length === 11 ? `+${digits}` : `+${digits}`;
}

function splitName(name = '') {
  const segments = String(name).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: segments[0] || '',
    lastName: segments.slice(1).join(' ')
  };
}

function hashPassword(password, iterations = 100000) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

function buildLockedPasswordHash() {
  return hashPassword(crypto.randomBytes(32).toString('hex'));
}

function normalizeSpokenEmail(text) {
  const normalized = String(text || '')
    .toLowerCase()
    .replace(/\s+at\s+/g, '@')
    .replace(/\s+dot\s+/g, '.')
    .replace(/\s+period\s+/g, '.')
    .replace(/\s+underscore\s+/g, '_')
    .replace(/\s+dash\s+/g, '-')
    .replace(/\s+hyphen\s+/g, '-')
    .replace(/\s+plus\s+/g, '+')
    .replace(/\s*@\s*/g, '@')
    .replace(/\s*\.\s*/g, '.')
    .replace(/\s+/g, '');

  const match = normalized.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return match ? match[0] : '';
}

function normalizeEmail(value) {
  const direct = String(value || '').trim().toLowerCase();
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(direct)) {
    return direct;
  }
  return normalizeSpokenEmail(value);
}

function buildPlaceholderEmail(phone, callSid) {
  const suffix = String(phone || callSid || crypto.randomUUID()).replace(/[^a-z0-9]/gi, '').slice(-24);
  return `voice-${suffix || Date.now()}@voice-intake.mytechtactics.com`.toLowerCase();
}

function isPlaceholderEmail(email) {
  return String(email || '').toLowerCase().endsWith('@voice-intake.mytechtactics.com');
}

function getErrorMessage(error) {
  return String(error?.message || error?.response?.data?.message || error || '');
}

function isSchemaColumnError(error) {
  return getErrorMessage(error).includes('Invalid input value for column name');
}

function extractInvalidColumnName(error) {
  const message = getErrorMessage(error);
  const patterns = [
    /Invalid input value for column name\s*["'`]?([A-Za-z0-9_]+)["'`]?/i,
    /column name\s*["'`]?([A-Za-z0-9_]+)["'`]?/i,
    /column\s*["'`]?([A-Za-z0-9_]+)["'`]?\s*(?:does not exist|is invalid|is unsupported)/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }
  return '';
}

function omitKeys(source, keys) {
  const clone = { ...source };
  for (const key of keys) {
    delete clone[key];
  }
  return clone;
}

function uniquePayloads(payloads) {
  const seen = new Set();
  return payloads
    .filter((payload) => payload && Object.keys(payload).length)
    .filter((payload) => {
      const signature = JSON.stringify(payload);
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    });
}

async function insertRowWithFallback(table, payloads) {
  let lastError = null;
  const queue = uniquePayloads(payloads);
  const seen = new Set(queue.map((payload) => JSON.stringify(payload)));

  while (queue.length) {
    const payload = queue.shift();
    try {
      return await table.insertRow(payload);
    } catch (error) {
      lastError = error;
      if (!isSchemaColumnError(error)) throw error;

      const invalidColumnName = extractInvalidColumnName(error);
      const matchingKeys = Object.keys(payload).filter(
        (key) => key.toLowerCase() === invalidColumnName.toLowerCase()
      );
      for (const key of matchingKeys) {
        const nextPayload = omitKeys(payload, [key]);
        const signature = JSON.stringify(nextPayload);
        if (!seen.has(signature) && Object.keys(nextPayload).length) {
          seen.add(signature);
          queue.push(nextPayload);
        }
      }
    }
  }

  throw lastError;
}

async function updateRowWithFallback(table, rowId, payloads) {
  let lastError = null;
  const queue = uniquePayloads(payloads);
  const seen = new Set(queue.map((payload) => JSON.stringify(payload)));

  while (queue.length) {
    const payload = queue.shift();
    try {
      return await table.updateRow({ ROWID: String(rowId), ...payload });
    } catch (error) {
      lastError = error;
      if (!isSchemaColumnError(error)) throw error;

      const invalidColumnName = extractInvalidColumnName(error);
      const matchingKeys = Object.keys(payload).filter(
        (key) => key.toLowerCase() === invalidColumnName.toLowerCase()
      );
      for (const key of matchingKeys) {
        const nextPayload = omitKeys(payload, [key]);
        const signature = JSON.stringify(nextPayload);
        if (!seen.has(signature) && Object.keys(nextPayload).length) {
          seen.add(signature);
          queue.push(nextPayload);
        }
      }
    }
  }

  throw lastError;
}

function mapUser(row) {
  return {
    id: String(pick(row, 'ROWID', 'rowid', 'id') || ''),
    email: String(pick(row, 'email') || ''),
    name: String(pick(row, 'name') || ''),
    role: String(pick(row, 'role') || 'customer').toLowerCase(),
    phone: String(pick(row, 'phone') || ''),
    address: String(pick(row, 'address', 'service_address', 'serviceAddress') || ''),
    isActive: toBoolean(pick(row, 'is_active', 'isActive'), true),
    zohoContactId: String(pick(row, 'zoho_contact_id', 'zohoContactId') || '')
  };
}

function buildUserPayloads(customer) {
  const { firstName, lastName } = splitName(customer.name);
  const phoneNumber = normalizeNumericPhone(customer.phone);
  const base = {
    email: customer.email,
    name: customer.name,
    first_name: firstName,
    last_name: lastName,
    role: 'customer',
    password_hash: buildLockedPasswordHash(),
    is_active: true,
    address: customer.address || '',
    directory_groups: ''
  };
  if (phoneNumber !== undefined) {
    base.phone = phoneNumber;
  }

  return [
    base,
    omitKeys(base, ['directory_groups']),
    omitKeys(base, ['first_name', 'last_name', 'directory_groups']),
    omitKeys(base, ['address', 'directory_groups']),
    omitKeys(base, ['first_name', 'last_name', 'address', 'directory_groups'])
  ];
}

function buildUserUpdatePayloads(customer) {
  const { firstName, lastName } = splitName(customer.name);
  const phoneNumber = normalizeNumericPhone(customer.phone);
  const base = {};
  if (customer.name) base.name = customer.name;
  if (firstName) base.first_name = firstName;
  if (lastName) base.last_name = lastName;
  if (phoneNumber !== undefined) base.phone = phoneNumber;
  if (customer.address) base.address = customer.address;

  return [
    base,
    omitKeys(base, ['first_name', 'last_name']),
    omitKeys(base, ['address']),
    omitKeys(base, ['first_name', 'last_name', 'address'])
  ];
}

function fallbackExtractIntake(detailText, callerPhone, callSid) {
  const text = String(detailText || '').trim();
  const email = normalizeEmail(text);
  const phoneMatch = text.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/);
  const phone = normalizePhoneText(phoneMatch?.[0] || callerPhone);
  const addressMatch = text.match(/(?:address|located at|service address)\s*(?:is|:)?\s*([^.;]+(?:street|st|road|rd|avenue|ave|drive|dr|lane|ln|court|ct|circle|cir|boulevard|blvd|way|trail|trl|place|pl)[^.;]*)/i);
  const nameMatch = text.match(/(?:my name is|name is|this is|i am|i'm)\s+([^,.;]+)/i);
  const callbackMatch = text.match(/(?:call back|callback|best time|available)\s*(?:is|:)?\s*([^.;]+)/i);

  return {
    name: String(nameMatch?.[1] || '').trim() || 'Phone Intake Customer',
    email: email || buildPlaceholderEmail(phone, callSid),
    phone,
    address: String(addressMatch?.[1] || '').trim(),
    preferredCallbackTime: String(callbackMatch?.[1] || '').trim(),
    notes: text,
    emailWasCaptured: Boolean(email)
  };
}

function cleanJson(raw) {
  return String(raw || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

async function extractIntakeWithOpenAI(detailText, callerPhone) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    instructions: [
      'Extract customer intake information for TechTactics from a phone transcript.',
      'Return only valid JSON. Do not include markdown.',
      'Fields: name, email, phone, address, preferredCallbackTime, notes.',
      'If an email is spoken as "at" or "dot", normalize it into a valid email address when possible.',
      'If a field is missing, return an empty string.'
    ].join('\n'),
    input: JSON.stringify({ transcript: detailText || '', callerPhone: callerPhone || '' }),
    temperature: 0.1
  });

  const parsed = JSON.parse(cleanJson(response.output_text));
  return {
    name: String(parsed.name || '').trim(),
    email: normalizeEmail(parsed.email || ''),
    phone: normalizePhoneText(parsed.phone || callerPhone),
    address: String(parsed.address || '').trim(),
    preferredCallbackTime: String(parsed.preferredCallbackTime || '').trim(),
    notes: String(parsed.notes || detailText || '').trim(),
    emailWasCaptured: Boolean(normalizeEmail(parsed.email || ''))
  };
}

async function extractCallerIntake({ detailText, callerPhone, callSid }) {
  try {
    const ai = await extractIntakeWithOpenAI(detailText, callerPhone);
    if (ai) {
      return {
        ...ai,
        name: ai.name || 'Phone Intake Customer',
        email: ai.email || buildPlaceholderEmail(ai.phone || callerPhone, callSid),
        phone: ai.phone || normalizePhoneText(callerPhone),
        emailWasCaptured: Boolean(ai.email)
      };
    }
  } catch (error) {
    console.warn('OpenAI intake extraction failed; falling back to rules.', error.message);
  }

  return fallbackExtractIntake(detailText, callerPhone, callSid);
}

async function findUserByEmail(req, email) {
  if (!email) return null;
  const rows = await runQuery(
    req,
    `SELECT * FROM ${TABLES.users} WHERE email = '${escapeValue(email)}'`,
    TABLES.users
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

async function findUserByPhone(req, phone) {
  const numericPhone = normalizeNumericPhone(phone);
  if (numericPhone === undefined) return null;
  const rows = await runQuery(
    req,
    `SELECT * FROM ${TABLES.users} WHERE phone = ${numericPhone}`,
    TABLES.users
  ).catch(() => []);
  return rows[0] ? mapUser(rows[0]) : null;
}

async function upsertPortalCustomer(req, intake) {
  const table = getCatalystApp(req).datastore().table(TABLES.users);
  const existing =
    (!isPlaceholderEmail(intake.email) ? await findUserByEmail(req, intake.email).catch(() => null) : null) ||
    (await findUserByPhone(req, intake.phone).catch(() => null));

  if (existing?.id) {
    const updated = await updateRowWithFallback(table, existing.id, buildUserUpdatePayloads(intake));
    return mapUser({ ...existing, ...updated });
  }

  const inserted = await insertRowWithFallback(table, buildUserPayloads(intake));
  return mapUser(inserted);
}

async function getBooksAuth(req) {
  try {
    const credentials = await getCatalystApp(req)
      .connections()
      .getConnectionCredentials(BOOKS.connectionLinkName);

    if (!credentials) return null;
    return {
      headers: credentials.headers || {},
      parameters: credentials.parameters || {}
    };
  } catch (error) {
    console.warn('Zoho Books connection is unavailable.', error.message);
    return null;
  }
}

function buildBooksUrl(path, auth, params = {}) {
  const url = new URL(`${BOOKS.apiBaseUrl}${path}`);
  const query = {
    ...(auth?.parameters || {}),
    ...(BOOKS.organizationId ? { organization_id: BOOKS.organizationId } : {}),
    ...params
  };

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function booksRequest(auth, path, options = {}) {
  const response = await fetch(buildBooksUrl(path, auth, options.params), {
    method: options.method || 'GET',
    headers: {
      ...(auth?.headers || {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok || (payload.code && Number(payload.code) !== 0)) {
    throw new Error(payload.message || `Zoho Books request failed with ${response.status}.`);
  }
  return payload;
}

function buildZohoContactPayload(customer) {
  const { firstName, lastName } = splitName(customer.name);
  const realEmail = !isPlaceholderEmail(customer.email) ? customer.email : '';
  const contactPerson = {
    first_name: firstName || 'Phone',
    last_name: lastName || 'Customer',
    phone: customer.phone || '',
    is_primary_contact: true
  };

  if (realEmail) {
    contactPerson.email = realEmail;
  }

  const payload = {
    contact_name: customer.name || customer.email || 'Phone Intake Customer',
    contact_type: 'customer',
    contact_persons: [contactPerson]
  };

  if (customer.phone) {
    payload.phone = customer.phone;
    payload.mobile = customer.phone;
  }

  if (customer.address) {
    payload.billing_address = {
      address: customer.address,
      phone: customer.phone || ''
    };
  }

  return payload;
}

async function findZohoContactByEmail(auth, email) {
  if (!email || isPlaceholderEmail(email)) return null;
  const data = await booksRequest(auth, BOOKS.contactsPath, {
    params: {
      email_contains: email,
      contact_type: 'customer'
    }
  });
  const contacts = Array.isArray(data?.contacts) ? data.contacts : [];
  return (
    contacts.find((contact) => String(contact?.email || '').toLowerCase() === email.toLowerCase()) ||
    contacts[0] ||
    null
  );
}

async function ensureZohoBooksContact(req, customer) {
  const auth = await getBooksAuth(req);
  if (!auth) {
    return { authAvailable: false, contactId: '', contact: null };
  }

  const matched = await findZohoContactByEmail(auth, customer.email).catch(() => null);
  if (matched?.contact_id) {
    return { authAvailable: true, contactId: String(matched.contact_id), contact: matched };
  }

  const created = await booksRequest(auth, BOOKS.contactsPath, {
    method: 'POST',
    body: buildZohoContactPayload(customer)
  });
  const contact = created?.contact || created?.data?.contact || null;
  return {
    authAvailable: true,
    contactId: String(contact?.contact_id || ''),
    contact
  };
}

async function updateCustomerContactId(req, customerId, contactId) {
  if (!customerId || !contactId) return null;
  const table = getCatalystApp(req).datastore().table(TABLES.users);
  return updateRowWithFallback(table, customerId, [{ zoho_contact_id: contactId }]).catch(() => null);
}

function mapServiceType(category) {
  switch (String(category || '').toLowerCase()) {
    case 'new_install':
      return 'New Install';
    case 'repair':
      return 'Repair';
    case 'service_removal':
      return 'Service Removal';
    case 'billing':
      return 'Billing';
    case 'emergency':
      return 'Emergency';
    default:
      return 'Phone Intake';
  }
}

async function getReviewAssignee(req) {
  const rows = await runQuery(req, `SELECT * FROM ${TABLES.users}`, TABLES.users).catch(() => []);
  const users = rows.map(mapUser).filter((user) => user.isActive !== false);
  const admins = users.filter((user) => user.role === 'admin');
  const employees = users.filter((user) => user.role === 'employee');
  return admins[0] || employees[0] || null;
}

function buildTicketDescription({ intake, analysis, detailText, speech, digit, booksResult }) {
  const parts = [
    'Source: Twilio phone intake.',
    'No portal password was collected from this caller.',
    `Customer name: ${intake.name || 'Not captured'}`,
    `Customer email: ${intake.emailWasCaptured ? intake.email : 'Not captured by voice'}`,
    `Customer phone: ${intake.phone || 'Not captured'}`,
    `Service address: ${intake.address || 'Not captured'}`,
    `Preferred callback time: ${intake.preferredCallbackTime || 'Not captured'}`,
    `Request type: ${mapServiceType(analysis?.category)}`,
    `Priority: ${analysis?.priority || 'normal'}`,
    `Summary: ${analysis?.summary || 'Phone request'}`,
    `Zoho Books contact: ${booksResult?.contactId || (booksResult?.authAvailable ? 'not created' : 'connection unavailable')}`,
    `Initial caller request: ${speech || digit || 'Not captured'}`,
    `Customer details transcript: ${detailText || 'Not captured'}`
  ];

  return parts.join('\n');
}

function buildTicketPayloads(ticket) {
  const base = {
    customer_id: ticket.customerId,
    employee_id: ticket.employeeId || '',
    service_type: ticket.type,
    category: ticket.category,
    title: ticket.title,
    address: ticket.address || '',
    description: ticket.description,
    required_notes: ticket.note,
    dispatch_history_json: JSON.stringify(ticket.dispatchHistory || []),
    status: ticket.status,
    created_at: ticket.createdAt,
    updated_at: ticket.updatedAt
  };

  return [
    base,
    omitKeys(base, ['dispatch_history_json']),
    omitKeys(base, ['required_notes']),
    omitKeys(base, ['title']),
    omitKeys(base, ['address']),
    omitKeys(base, ['created_at', 'updated_at']),
    {
      customerId: ticket.customerId,
      employeeId: ticket.employeeId || '',
      serviceType: ticket.type,
      category: ticket.category,
      title: ticket.title,
      address: ticket.address || '',
      description: ticket.description,
      note: ticket.note,
      dispatchHistoryJson: JSON.stringify(ticket.dispatchHistory || []),
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt
    }
  ];
}

async function createApprovalTicket(req, customer, intake, analysis, context, booksResult) {
  const assignee = await getReviewAssignee(req);
  const now = new Date().toISOString();
  const ticket = {
    customerId: customer.id,
    employeeId: assignee?.id || '',
    type: mapServiceType(analysis?.category),
    category: analysis?.category || 'phone_intake',
    title: `Phone request: ${analysis?.summary || mapServiceType(analysis?.category)}`,
    address: intake.address || customer.address || '',
    description: buildTicketDescription({
      intake,
      analysis,
      detailText: context.detailText,
      speech: context.speech,
      digit: context.digit,
      booksResult
    }),
    note: 'Phone intake awaiting admin approval and quote.',
    status: 'pending_approval',
    dispatchHistory: [
      {
        status: 'pending_approval',
        note: 'Created by Twillio voice intake for admin approval.',
        updatedBy: 'Twillio Receptionist',
        actorRole: 'system',
        occurredAt: now
      }
    ],
    createdAt: now,
    updatedAt: now
  };

  const table = getCatalystApp(req).datastore().table(TABLES.tickets);
  return insertRowWithFallback(table, buildTicketPayloads(ticket));
}

async function createPortalIntakeFromCall(req, context) {
  const callerPhone = normalizePhoneText(context.callerPhone);
  const intake = await extractCallerIntake({
    detailText: context.detailText || context.speech || '',
    callerPhone,
    callSid: context.callSid
  });

  const customer = await upsertPortalCustomer(req, intake);
  const booksResult = await ensureZohoBooksContact(req, {
    ...intake,
    email: customer.email || intake.email,
    name: customer.name || intake.name,
    phone: customer.phone || intake.phone,
    address: customer.address || intake.address
  }).catch((error) => ({
    authAvailable: true,
    contactId: '',
    contact: null,
    error: error.message
  }));

  if (booksResult?.contactId) {
    await updateCustomerContactId(req, customer.id, booksResult.contactId);
  }

  const ticket = await createApprovalTicket(
    req,
    {
      ...customer,
      address: customer.address || intake.address
    },
    intake,
    context.analysis || {},
    context,
    booksResult
  );

  return {
    customer,
    intake,
    books: booksResult,
    ticket
  };
}

module.exports = { createPortalIntakeFromCall };
