import catalyst from 'zcatalyst-sdk-node';
import { env } from '../config/env.js';

function escapeValue(value) {
  return String(value ?? '').replace(/'/g, "''");
}

function pick(row, ...keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }
  return undefined;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return ['true', '1', 'yes', 'y'].includes(String(value).toLowerCase());
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeNumericPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : undefined;
}

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function unwrapRows(result, tableName) {
  return (result || []).map((entry) => entry?.[tableName] || entry).filter(Boolean);
}

function mapUser(row) {
  const name =
    pick(row, 'name') ||
    [pick(row, 'first_name', 'firstName'), pick(row, 'last_name', 'lastName')].filter(Boolean).join(' ');

  return {
    id: String(pick(row, 'ROWID', 'rowid', 'id') || ''),
    rowId: String(pick(row, 'ROWID', 'rowid', 'id') || ''),
    email: pick(row, 'email') || '',
    name: name || '',
    role: String(pick(row, 'role') || 'customer').toLowerCase(),
    phone: pick(row, 'phone') || '',
    isActive: toBoolean(pick(row, 'is_active', 'isActive'), true),
    passwordHash: pick(row, 'password_hash', 'passwordHash', 'password') || '',
    zohoContactId: pick(row, 'zoho_contact_id', 'zohoContactId') || '',
    address: pick(row, 'address', 'service_address', 'serviceAddress') || '',
    payType: pick(row, 'pay_type', 'payType') || 'Hourly',
    hourlyRate: toNumber(pick(row, 'hourly_rate', 'hourlyRate')),
    annualSalary: toNumber(pick(row, 'annual_salary', 'annualSalary')),
    weeklyHours: toNumber(pick(row, 'weekly_hours', 'weeklyHours')),
    isClockedIn: toBoolean(pick(row, 'is_clocked_in', 'isClockedIn', 'clocked_in', 'clockedIn')),
    maxActiveJobs: toNumber(pick(row, 'max_active_jobs', 'maxActiveJobs')),
    firstName: pick(row, 'first_name', 'firstName') || '',
    lastName: pick(row, 'last_name', 'lastName') || '',
    directoryGroups: pick(row, 'directory_groups', 'directoryGroups') || '',
    directoryDepartment: pick(row, 'directory_department', 'directoryDepartment') || ''
  };
}

function mapService(row) {
  return {
    id: String(pick(row, 'ROWID', 'id') || ''),
    customerId: String(pick(row, 'customer_id', 'customerId') || ''),
    serviceName: pick(row, 'service_name', 'serviceName', 'name', 'title') || '',
    category: pick(row, 'category') || '',
    status: pick(row, 'status') || 'Active',
    startedAt: pick(row, 'started_at', 'startedAt', 'CREATEDTIME') || '',
    monthlyPrice: toNumber(pick(row, 'monthly_price', 'monthlyPrice', 'price'))
  };
}

function mapTicket(row) {
  const dispatchHistory = parseJson(
    pick(row, 'dispatch_history_json', 'dispatchHistoryJson', 'dispatch_history', 'dispatchHistory'),
    []
  );
  const latestQuoteEntry = [...dispatchHistory]
    .reverse()
    .find((entry) => entry?.quote || entry?.quoteText || entry?.quoteAmount || entry?.scheduledDate);

  return {
    id: String(pick(row, 'ROWID', 'id') || ''),
    customerId: String(pick(row, 'customer_id', 'customerId') || ''),
    employeeId: String(pick(row, 'employee_id', 'employeeId') || ''),
    customerName: pick(row, 'customer_name', 'customerName') || '',
    assignedEmployee: pick(row, 'assigned_employee', 'assignedEmployee') || '',
    type: pick(row, 'service_type', 'serviceType', 'type') || '',
    category: pick(row, 'category') || '',
    title: pick(row, 'title') || '',
    address: pick(row, 'address') || '',
    description: pick(row, 'description') || '',
    status: pick(row, 'status') || 'new',
    note: pick(row, 'required_notes', 'requiredNotes', 'note') || '',
    quoteText: pick(row, 'quote_text', 'quoteText', 'quote') || latestQuoteEntry?.quoteText || latestQuoteEntry?.quote || '',
    quoteAmount: toNumber(pick(row, 'quote_amount', 'quoteAmount'), toNumber(latestQuoteEntry?.quoteAmount)),
    quoteItems: parseJson(
      pick(row, 'quote_items_json', 'quoteItemsJson', 'quote_items', 'quoteItems'),
      latestQuoteEntry?.quoteItems || []
    ),
    customerQuoteStatus:
      pick(row, 'customer_quote_status', 'customerQuoteStatus') || latestQuoteEntry?.customerQuoteStatus || '',
    scheduledDate: pick(row, 'scheduled_date', 'scheduledDate', 'install_date', 'installDate') || latestQuoteEntry?.scheduledDate || '',
    quoteSentAt: pick(row, 'quote_sent_at', 'quoteSentAt') || latestQuoteEntry?.quoteSentAt || '',
    quoteApprovedAt: pick(row, 'quote_approved_at', 'quoteApprovedAt') || latestQuoteEntry?.quoteApprovedAt || '',
    dispatchHistory,
    updatedAt: pick(row, 'updated_at', 'updatedAt', 'MODIFIEDTIME') || '',
    createdAt: pick(row, 'created_at', 'createdAt', 'CREATEDTIME') || ''
  };
}

function toTicketRowPayload(ticket) {
  const payload = {};

  if (ticket.customerId !== undefined) payload.customer_id = ticket.customerId;
  if (ticket.employeeId !== undefined) payload.employee_id = ticket.employeeId || '';
  if (ticket.type !== undefined) payload.service_type = ticket.type;
  if (ticket.category !== undefined) payload.category = ticket.category;
  if (ticket.title !== undefined) payload.title = ticket.title;
  if (ticket.address !== undefined) payload.address = ticket.address;
  if (ticket.description !== undefined) payload.description = ticket.description;
  if (ticket.note !== undefined) payload.required_notes = ticket.note || '';
  if (ticket.dispatchHistory !== undefined) {
    payload.dispatch_history_json = JSON.stringify(ticket.dispatchHistory || []);
  }
  if (ticket.quoteText !== undefined) payload.quote_text = ticket.quoteText || '';
  if (ticket.quoteAmount !== undefined) payload.quote_amount = toNumber(ticket.quoteAmount);
  if (ticket.quoteItems !== undefined) payload.quote_items_json = JSON.stringify(ticket.quoteItems || []);
  if (ticket.customerQuoteStatus !== undefined) payload.customer_quote_status = ticket.customerQuoteStatus || '';
  if (ticket.scheduledDate !== undefined) payload.scheduled_date = ticket.scheduledDate || '';
  if (ticket.quoteSentAt !== undefined) payload.quote_sent_at = ticket.quoteSentAt || '';
  if (ticket.quoteApprovedAt !== undefined) payload.quote_approved_at = ticket.quoteApprovedAt || '';
  if (ticket.status !== undefined) payload.status = ticket.status;
  if (ticket.createdAt !== undefined) payload.created_at = ticket.createdAt;
  if (ticket.updatedAt !== undefined) payload.updated_at = ticket.updatedAt;

  return payload;
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
  return payloads.filter((payload) => {
    const signature = JSON.stringify(payload);
    if (seen.has(signature)) {
      return false;
    }
    seen.add(signature);
    return true;
  });
}

function normalizeIdentifier(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeColumnKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

function getUserIdentifiers(user) {
  return [
    user?.id,
    user?.rowId,
    user?.email,
    user?.zohoContactId
  ].map(normalizeIdentifier).filter(Boolean);
}

function rowMatchesUser(row, user, keys) {
  const identifiers = getUserIdentifiers(user);
  if (!identifiers.length) {
    return false;
  }

  return keys.some((key) => {
    const value = pick(row, key);
    return value !== undefined && value !== null && identifiers.includes(normalizeIdentifier(value));
  });
}

function isSchemaColumnError(error) {
  const message = String(error?.message || error || '');
  return message.includes('Invalid input value for column name');
}

function extractInvalidColumnName(error) {
  const message = String(error?.message || error || '');
  const patterns = [
    /Invalid input value for column name\s*["'`]?([A-Za-z0-9_]+)["'`]?/i,
    /column name\s*["'`]?([A-Za-z0-9_]+)["'`]?/i,
    /column\s*["'`]?([A-Za-z0-9_]+)["'`]?\s*(?:does not exist|is invalid|is unsupported)/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return '';
}

const COLUMN_ALIAS_GROUPS = [
  ['customer_id', 'customerId'],
  [
    'employee_id',
    'employeeId',
    'user_id',
    'userId',
    'staff_id',
    'staffId',
    'portal_user_id',
    'portalUserId',
    'assigned_employee_id',
    'assignedEmployeeId'
  ],
  ['service_type', 'serviceType', 'type', 'service_name', 'serviceName'],
  ['required_notes', 'requiredNotes', 'note'],
  ['dispatch_history_json', 'dispatchHistoryJson'],
  ['created_at', 'createdAt'],
  ['updated_at', 'updatedAt'],
  ['quote_text', 'quoteText', 'quote'],
  ['quote_amount', 'quoteAmount'],
  ['quote_items_json', 'quoteItemsJson', 'quote_items', 'quoteItems'],
  ['customer_quote_status', 'customerQuoteStatus'],
  ['scheduled_date', 'scheduledDate', 'install_date', 'installDate'],
  ['quote_sent_at', 'quoteSentAt'],
  ['quote_approved_at', 'quoteApprovedAt'],
  ['role_key', 'roleKey', 'role'],
  ['started_at', 'startedAt', 'clock_in_at', 'clockInAt'],
  ['ended_at', 'endedAt', 'clock_out_at', 'clockOutAt'],
  ['is_active', 'isActive', 'active'],
  ['total_miles', 'totalMiles', 'mileage_miles', 'mileageMiles'],
  ['last_latitude', 'lastLatitude', 'latitude'],
  ['last_longitude', 'lastLongitude', 'longitude'],
  ['path_json', 'pathJson', 'gps_path', 'gpsPath'],
  ['is_clocked_in', 'isClockedIn'],
  ['max_active_jobs', 'maxActiveJobs'],
  ['pay_type', 'payType'],
  ['hourly_rate', 'hourlyRate'],
  ['annual_salary', 'annualSalary'],
  ['weekly_hours', 'weeklyHours'],
  ['first_name', 'firstName'],
  ['last_name', 'lastName'],
  ['directory_groups', 'directoryGroups'],
  ['directory_department', 'directoryDepartment'],
  ['zoho_contact_id', 'zohoContactId'],
  ['password_hash', 'passwordHash', 'password'],
  ['address'],
  ['title'],
  ['description'],
  ['category'],
  ['status']
];

function buildSchemaRelaxedPayloads(payload, invalidColumnName) {
  const normalizedInvalid = normalizeColumnKey(invalidColumnName);
  if (!normalizedInvalid) {
    return Object.keys(payload)
      .map((key) => omitKeys(payload, [key]))
      .filter((nextPayload) => Object.keys(nextPayload).length > 0);
  }

  const keysToDrop = new Set(
    Object.keys(payload).filter((key) => normalizeColumnKey(key) === normalizedInvalid)
  );

  const relatedGroup = COLUMN_ALIAS_GROUPS.find((group) =>
    group.some((key) => normalizeColumnKey(key) === normalizedInvalid)
  );

  if (relatedGroup) {
    for (const key of Object.keys(payload)) {
      if (relatedGroup.some((groupKey) => normalizeColumnKey(groupKey) === normalizeColumnKey(key))) {
        keysToDrop.add(key);
      }
    }
  }

  return Array.from(keysToDrop)
    .reduce((payloads, key) => {
      payloads.push(omitKeys(payload, [key]));
      payloads.push(omitKeys(payload, Array.from(keysToDrop)));
      return payloads;
    }, [])
    .filter((nextPayload) => Object.keys(nextPayload).length > 0);
}

async function insertRowWithFallback(table, payloads) {
  let lastError = null;
  const queue = [...uniquePayloads(payloads)];
  const seen = new Set(queue.map((payload) => JSON.stringify(payload)));

  while (queue.length) {
    const payload = queue.shift();
    try {
      return await table.insertRow(payload);
    } catch (error) {
      lastError = error;
      if (!isSchemaColumnError(error)) {
        throw error;
      }

      const invalidColumnName = extractInvalidColumnName(error);
      const relaxedPayloads = buildSchemaRelaxedPayloads(payload, invalidColumnName);
      for (const nextPayload of relaxedPayloads) {
        const signature = JSON.stringify(nextPayload);
        if (seen.has(signature)) {
          continue;
        }

        seen.add(signature);
        queue.push(nextPayload);
      }
    }
  }

  throw lastError;
}

async function updateRowWithFallback(table, rowId, payloads) {
  let lastError = null;
  const queue = [...uniquePayloads(payloads)];
  const seen = new Set(queue.map((payload) => JSON.stringify(payload)));

  while (queue.length) {
    const payload = queue.shift();
    try {
      return await table.updateRow({
        ROWID: String(rowId),
        ...payload
      });
    } catch (error) {
      lastError = error;
      if (!isSchemaColumnError(error)) {
        throw error;
      }

      const invalidColumnName = extractInvalidColumnName(error);
      const relaxedPayloads = buildSchemaRelaxedPayloads(payload, invalidColumnName);
      for (const nextPayload of relaxedPayloads) {
        const signature = JSON.stringify(nextPayload);
        if (seen.has(signature)) {
          continue;
        }

        seen.add(signature);
        queue.push(nextPayload);
      }
    }
  }

  throw lastError;
}

function buildTicketInsertPayloads(ticket) {
  const base = toTicketRowPayload(ticket);
  const withoutNotes = omitKeys(base, ['required_notes']);
  const withoutTitle = omitKeys(base, ['title']);
  const withoutAddress = omitKeys(base, ['address']);
  const withoutDispatchHistory = omitKeys(base, ['dispatch_history_json']);
  const withoutAuditColumns = omitKeys(base, ['dispatch_history_json', 'created_at', 'updated_at']);
  const noteAlias = {
    ...omitKeys(base, ['required_notes']),
    ...(ticket.note !== undefined ? { note: ticket.note || '' } : {})
  };
  const plainType = {
    ...omitKeys(base, ['service_type']),
    ...(ticket.type !== undefined ? { type: ticket.type } : {})
  };
  const serviceNameAlias = {
    ...omitKeys(base, ['service_type']),
    ...(ticket.type !== undefined ? { service_name: ticket.type } : {})
  };
  const camelCase = {
    ...(ticket.customerId !== undefined ? { customerId: ticket.customerId } : {}),
    ...(ticket.employeeId !== undefined ? { employeeId: ticket.employeeId || '' } : {}),
    ...(ticket.type !== undefined ? { serviceType: ticket.type } : {}),
    ...(ticket.category !== undefined ? { category: ticket.category } : {}),
    ...(ticket.title !== undefined ? { title: ticket.title } : {}),
    ...(ticket.address !== undefined ? { address: ticket.address } : {}),
    ...(ticket.description !== undefined ? { description: ticket.description } : {}),
    ...(ticket.note !== undefined ? { note: ticket.note || '' } : {}),
    ...(ticket.dispatchHistory !== undefined
      ? { dispatchHistoryJson: JSON.stringify(ticket.dispatchHistory || []) }
      : {}),
    ...(ticket.quoteText !== undefined ? { quoteText: ticket.quoteText || '' } : {}),
    ...(ticket.quoteAmount !== undefined ? { quoteAmount: toNumber(ticket.quoteAmount) } : {}),
    ...(ticket.quoteItems !== undefined ? { quoteItemsJson: JSON.stringify(ticket.quoteItems || []) } : {}),
    ...(ticket.customerQuoteStatus !== undefined
      ? { customerQuoteStatus: ticket.customerQuoteStatus || '' }
      : {}),
    ...(ticket.scheduledDate !== undefined ? { scheduledDate: ticket.scheduledDate || '' } : {}),
    ...(ticket.quoteSentAt !== undefined ? { quoteSentAt: ticket.quoteSentAt || '' } : {}),
    ...(ticket.quoteApprovedAt !== undefined ? { quoteApprovedAt: ticket.quoteApprovedAt || '' } : {}),
    ...(ticket.status !== undefined ? { status: ticket.status } : {}),
    ...(ticket.createdAt !== undefined ? { createdAt: ticket.createdAt } : {}),
    ...(ticket.updatedAt !== undefined ? { updatedAt: ticket.updatedAt } : {})
  };
  const minimalSnake = {
    customer_id: base.customer_id,
    ...(base.employee_id !== undefined ? { employee_id: base.employee_id } : {}),
    service_type: base.service_type,
    category: base.category,
    description: base.description,
    status: base.status
  };
  const sparseSnake = {
    ...(base.customer_id !== undefined ? { customer_id: base.customer_id } : {}),
    ...(base.employee_id !== undefined ? { employee_id: base.employee_id } : {}),
    ...(base.status !== undefined ? { status: base.status } : {}),
    description: [ticket.title, ticket.type, ticket.category, ticket.address, ticket.description]
      .filter(Boolean)
      .join(' | ')
  };
  const sparseCamel = {
    ...(ticket.customerId !== undefined ? { customerId: ticket.customerId } : {}),
    ...(ticket.employeeId !== undefined ? { employeeId: ticket.employeeId || '' } : {}),
    ...(ticket.status !== undefined ? { status: ticket.status } : {}),
    description: [ticket.title, ticket.type, ticket.category, ticket.address, ticket.description]
      .filter(Boolean)
      .join(' | ')
  };
  const minimalCamel = {
    customerId: ticket.customerId,
    ...(ticket.employeeId !== undefined ? { employeeId: ticket.employeeId || '' } : {}),
    serviceType: ticket.type,
    category: ticket.category,
    description: ticket.description,
    status: ticket.status
  };

  return [
    base,
    withoutDispatchHistory,
    withoutAuditColumns,
    noteAlias,
    withoutNotes,
    withoutTitle,
    withoutAddress,
    omitKeys(base, ['required_notes', 'title']),
    omitKeys(base, ['required_notes', 'address']),
    omitKeys(withoutAuditColumns, ['required_notes', 'title', 'address']),
    plainType,
    serviceNameAlias,
    camelCase,
    minimalSnake,
    sparseSnake,
    sparseCamel,
    minimalCamel
  ];
}

function buildTicketUpdatePayloads(updates) {
  const base = toTicketRowPayload(updates);
  const withoutDispatchHistory = omitKeys(base, ['dispatch_history_json']);
  const noteAlias = {
    ...omitKeys(base, ['required_notes']),
    ...(updates.note !== undefined ? { note: updates.note || '' } : {})
  };
  const plainType = {
    ...omitKeys(base, ['service_type']),
    ...(updates.type !== undefined ? { type: updates.type } : {})
  };
  const camelCase = {
    ...(updates.customerId !== undefined ? { customerId: updates.customerId } : {}),
    ...(updates.employeeId !== undefined ? { employeeId: updates.employeeId || '' } : {}),
    ...(updates.type !== undefined ? { serviceType: updates.type } : {}),
    ...(updates.category !== undefined ? { category: updates.category } : {}),
    ...(updates.title !== undefined ? { title: updates.title } : {}),
    ...(updates.address !== undefined ? { address: updates.address } : {}),
    ...(updates.description !== undefined ? { description: updates.description } : {}),
    ...(updates.note !== undefined ? { note: updates.note || '' } : {}),
    ...(updates.dispatchHistory !== undefined
      ? { dispatchHistoryJson: JSON.stringify(updates.dispatchHistory || []) }
      : {}),
    ...(updates.quoteText !== undefined ? { quoteText: updates.quoteText || '' } : {}),
    ...(updates.quoteAmount !== undefined ? { quoteAmount: toNumber(updates.quoteAmount) } : {}),
    ...(updates.quoteItems !== undefined ? { quoteItemsJson: JSON.stringify(updates.quoteItems || []) } : {}),
    ...(updates.customerQuoteStatus !== undefined
      ? { customerQuoteStatus: updates.customerQuoteStatus || '' }
      : {}),
    ...(updates.scheduledDate !== undefined ? { scheduledDate: updates.scheduledDate || '' } : {}),
    ...(updates.quoteSentAt !== undefined ? { quoteSentAt: updates.quoteSentAt || '' } : {}),
    ...(updates.quoteApprovedAt !== undefined ? { quoteApprovedAt: updates.quoteApprovedAt || '' } : {}),
    ...(updates.status !== undefined ? { status: updates.status } : {}),
    ...(updates.createdAt !== undefined ? { createdAt: updates.createdAt } : {}),
    ...(updates.updatedAt !== undefined ? { updatedAt: updates.updatedAt } : {})
  };

  return [
    base,
    withoutDispatchHistory,
    noteAlias,
    omitKeys(base, ['required_notes']),
    omitKeys(base, ['updated_at']),
    omitKeys(base, ['required_notes', 'updated_at']),
    plainType,
    camelCase
  ];
}

function buildUserUpdatePayloads(updates) {
  const base = { ...updates };
  const camelCase = {
    ...(updates.is_clocked_in !== undefined ? { isClockedIn: updates.is_clocked_in } : {}),
    ...(updates.is_active !== undefined ? { isActive: updates.is_active } : {}),
    ...(updates.max_active_jobs !== undefined ? { maxActiveJobs: updates.max_active_jobs } : {}),
    ...(updates.pay_type !== undefined ? { payType: updates.pay_type } : {}),
    ...(updates.hourly_rate !== undefined ? { hourlyRate: updates.hourly_rate } : {}),
    ...(updates.annual_salary !== undefined ? { annualSalary: updates.annual_salary } : {}),
    ...(updates.weekly_hours !== undefined ? { weeklyHours: updates.weekly_hours } : {}),
    ...(updates.first_name !== undefined ? { firstName: updates.first_name } : {}),
    ...(updates.last_name !== undefined ? { lastName: updates.last_name } : {}),
    ...(updates.directory_groups !== undefined ? { directoryGroups: updates.directory_groups } : {}),
    ...(updates.directory_department !== undefined ? { directoryDepartment: updates.directory_department } : {}),
    ...(updates.zoho_contact_id !== undefined ? { zohoContactId: updates.zoho_contact_id } : {}),
    ...(updates.password_hash !== undefined ? { passwordHash: updates.password_hash } : {}),
    ...(updates.email !== undefined ? { email: updates.email } : {}),
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.role !== undefined ? { role: updates.role } : {}),
    ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
    ...(updates.address !== undefined ? { address: updates.address } : {})
  };
  const clockAliases = {
    ...(updates.is_clocked_in !== undefined ? { isClockedIn: updates.is_clocked_in } : {}),
    ...(updates.is_clocked_in !== undefined ? { clocked_in: updates.is_clocked_in } : {}),
    ...(updates.is_clocked_in !== undefined ? { clockedIn: updates.is_clocked_in } : {})
  };
  const withoutClock = omitKeys(base, ['is_clocked_in', 'isClockedIn']);

  return [
    base,
    camelCase,
    clockAliases,
    omitKeys(base, ['is_clocked_in']),
    omitKeys(camelCase, ['isClockedIn']),
    { ...(updates.is_clocked_in !== undefined ? { is_clocked_in: updates.is_clocked_in } : {}) },
    { ...(updates.is_clocked_in !== undefined ? { isClockedIn: updates.is_clocked_in } : {}) },
    { ...(updates.is_clocked_in !== undefined ? { clocked_in: updates.is_clocked_in } : {}) },
    { ...(updates.is_clocked_in !== undefined ? { clockedIn: updates.is_clocked_in } : {}) },
    withoutClock,
    omitKeys(camelCase, ['isClockedIn']),
    omitKeys(base, ['directory_groups']),
    omitKeys(base, ['first_name', 'last_name']),
    omitKeys(base, ['directory_groups', 'first_name', 'last_name'])
  ];
}

function toTimeEntryRowPayload(entry) {
  const payload = {};

  if (entry.employeeId !== undefined) payload.employee_id = entry.employeeId;
  if (entry.roleKey !== undefined) payload.role_key = entry.roleKey;
  if (entry.startedAt !== undefined) payload.started_at = entry.startedAt;
  if (entry.endedAt !== undefined) payload.ended_at = entry.endedAt;
  if (entry.isActive !== undefined) payload.is_active = entry.isActive;
  if (entry.totalMiles !== undefined) payload.total_miles = entry.totalMiles;
  if (entry.lastLatitude !== undefined) payload.last_latitude = entry.lastLatitude;
  if (entry.lastLongitude !== undefined) payload.last_longitude = entry.lastLongitude;
  if (entry.path !== undefined) payload.path_json = JSON.stringify(entry.path || []);
  if (entry.createdAt !== undefined) payload.created_at = entry.createdAt;
  if (entry.updatedAt !== undefined) payload.updated_at = entry.updatedAt;

  return payload;
}

function buildTimeEntryIdentityPayloads(entry, startedKey = 'started_at', activeKey = 'is_active') {
  const userKeys = [
    'employee_id',
    'employeeId',
    'user_id',
    'userId',
    'staff_id',
    'staffId',
    'portal_user_id',
    'portalUserId',
    'assigned_employee_id',
    'assignedEmployeeId'
  ];

  return userKeys.map((userKey) => ({
    ...(entry.employeeId !== undefined ? { [userKey]: entry.employeeId } : {}),
    ...(entry.startedAt !== undefined ? { [startedKey]: entry.startedAt } : {}),
    ...(entry.isActive !== undefined ? { [activeKey]: entry.isActive } : {})
  }));
}

function buildTimeEntryInsertPayloads(entry) {
  const base = toTimeEntryRowPayload(entry);
  const clockAliases = {
    ...(entry.employeeId !== undefined ? { employee_id: entry.employeeId } : {}),
    ...(entry.roleKey !== undefined ? { role: entry.roleKey } : {}),
    ...(entry.startedAt !== undefined ? { clock_in_at: entry.startedAt } : {}),
    ...(entry.endedAt !== undefined ? { clock_out_at: entry.endedAt } : {}),
    ...(entry.isActive !== undefined ? { active: entry.isActive } : {}),
    ...(entry.totalMiles !== undefined ? { mileage_miles: entry.totalMiles } : {}),
    ...(entry.lastLatitude !== undefined ? { latitude: entry.lastLatitude } : {}),
    ...(entry.lastLongitude !== undefined ? { longitude: entry.lastLongitude } : {}),
    ...(entry.path !== undefined ? { gps_path: JSON.stringify(entry.path || []) } : {}),
    ...(entry.createdAt !== undefined ? { created_at: entry.createdAt } : {}),
    ...(entry.updatedAt !== undefined ? { updated_at: entry.updatedAt } : {})
  };
  const camelCase = {
    ...(entry.employeeId !== undefined ? { employeeId: entry.employeeId } : {}),
    ...(entry.roleKey !== undefined ? { roleKey: entry.roleKey } : {}),
    ...(entry.startedAt !== undefined ? { startedAt: entry.startedAt } : {}),
    ...(entry.endedAt !== undefined ? { endedAt: entry.endedAt } : {}),
    ...(entry.isActive !== undefined ? { isActive: entry.isActive } : {}),
    ...(entry.totalMiles !== undefined ? { totalMiles: entry.totalMiles } : {}),
    ...(entry.lastLatitude !== undefined ? { lastLatitude: entry.lastLatitude } : {}),
    ...(entry.lastLongitude !== undefined ? { lastLongitude: entry.lastLongitude } : {}),
    ...(entry.path !== undefined ? { pathJson: JSON.stringify(entry.path || []) } : {}),
    ...(entry.createdAt !== undefined ? { createdAt: entry.createdAt } : {}),
    ...(entry.updatedAt !== undefined ? { updatedAt: entry.updatedAt } : {})
  };
  const userIdSnake = {
    ...omitKeys(base, ['employee_id']),
    ...(entry.employeeId !== undefined ? { user_id: entry.employeeId } : {})
  };
  const userIdCamel = {
    ...omitKeys(camelCase, ['employeeId']),
    ...(entry.employeeId !== undefined ? { userId: entry.employeeId } : {})
  };
  const staffIdSnake = {
    ...omitKeys(base, ['employee_id']),
    ...(entry.employeeId !== undefined ? { staff_id: entry.employeeId } : {})
  };
  const portalUserIdSnake = {
    ...omitKeys(base, ['employee_id']),
    ...(entry.employeeId !== undefined ? { portal_user_id: entry.employeeId } : {})
  };
  const assignedEmployeeIdSnake = {
    ...omitKeys(base, ['employee_id']),
    ...(entry.employeeId !== undefined ? { assigned_employee_id: entry.employeeId } : {})
  };

  return [
    base,
    userIdSnake,
    userIdCamel,
    staffIdSnake,
    portalUserIdSnake,
    assignedEmployeeIdSnake,
    omitKeys(base, ['path_json']),
    omitKeys(base, ['last_latitude', 'last_longitude']),
    omitKeys(base, ['path_json', 'last_latitude', 'last_longitude']),
    omitKeys(base, ['path_json', 'last_latitude', 'last_longitude', 'created_at', 'updated_at']),
    clockAliases,
    omitKeys(clockAliases, ['gps_path']),
    omitKeys(clockAliases, ['latitude', 'longitude']),
    omitKeys(clockAliases, ['gps_path', 'latitude', 'longitude']),
    omitKeys(clockAliases, ['gps_path', 'latitude', 'longitude', 'created_at', 'updated_at']),
    camelCase,
    omitKeys(camelCase, ['pathJson']),
    omitKeys(camelCase, ['lastLatitude', 'lastLongitude']),
    omitKeys(camelCase, ['pathJson', 'lastLatitude', 'lastLongitude']),
    ...buildTimeEntryIdentityPayloads(entry, 'started_at', 'is_active'),
    ...buildTimeEntryIdentityPayloads(entry, 'clock_in_at', 'active'),
    ...buildTimeEntryIdentityPayloads(entry, 'startedAt', 'isActive')
  ];
}

function buildTimeEntryUpdatePayloads(updates) {
  const base = toTimeEntryRowPayload(updates);
  const clockAliases = {
    ...(updates.employeeId !== undefined ? { employee_id: updates.employeeId } : {}),
    ...(updates.roleKey !== undefined ? { role: updates.roleKey } : {}),
    ...(updates.startedAt !== undefined ? { clock_in_at: updates.startedAt } : {}),
    ...(updates.endedAt !== undefined ? { clock_out_at: updates.endedAt } : {}),
    ...(updates.isActive !== undefined ? { active: updates.isActive } : {}),
    ...(updates.totalMiles !== undefined ? { mileage_miles: updates.totalMiles } : {}),
    ...(updates.lastLatitude !== undefined ? { latitude: updates.lastLatitude } : {}),
    ...(updates.lastLongitude !== undefined ? { longitude: updates.lastLongitude } : {}),
    ...(updates.path !== undefined ? { gps_path: JSON.stringify(updates.path || []) } : {}),
    ...(updates.createdAt !== undefined ? { created_at: updates.createdAt } : {}),
    ...(updates.updatedAt !== undefined ? { updated_at: updates.updatedAt } : {})
  };
  const camelCase = {
    ...(updates.employeeId !== undefined ? { employeeId: updates.employeeId } : {}),
    ...(updates.roleKey !== undefined ? { roleKey: updates.roleKey } : {}),
    ...(updates.startedAt !== undefined ? { startedAt: updates.startedAt } : {}),
    ...(updates.endedAt !== undefined ? { endedAt: updates.endedAt } : {}),
    ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
    ...(updates.totalMiles !== undefined ? { totalMiles: updates.totalMiles } : {}),
    ...(updates.lastLatitude !== undefined ? { lastLatitude: updates.lastLatitude } : {}),
    ...(updates.lastLongitude !== undefined ? { lastLongitude: updates.lastLongitude } : {}),
    ...(updates.path !== undefined ? { pathJson: JSON.stringify(updates.path || []) } : {}),
    ...(updates.createdAt !== undefined ? { createdAt: updates.createdAt } : {}),
    ...(updates.updatedAt !== undefined ? { updatedAt: updates.updatedAt } : {})
  };
  const userIdSnake = {
    ...omitKeys(base, ['employee_id']),
    ...(updates.employeeId !== undefined ? { user_id: updates.employeeId } : {})
  };
  const userIdCamel = {
    ...omitKeys(camelCase, ['employeeId']),
    ...(updates.employeeId !== undefined ? { userId: updates.employeeId } : {})
  };
  const staffIdSnake = {
    ...omitKeys(base, ['employee_id']),
    ...(updates.employeeId !== undefined ? { staff_id: updates.employeeId } : {})
  };
  const portalUserIdSnake = {
    ...omitKeys(base, ['employee_id']),
    ...(updates.employeeId !== undefined ? { portal_user_id: updates.employeeId } : {})
  };
  const assignedEmployeeIdSnake = {
    ...omitKeys(base, ['employee_id']),
    ...(updates.employeeId !== undefined ? { assigned_employee_id: updates.employeeId } : {})
  };

  return [
    base,
    userIdSnake,
    userIdCamel,
    staffIdSnake,
    portalUserIdSnake,
    assignedEmployeeIdSnake,
    omitKeys(base, ['path_json']),
    omitKeys(base, ['last_latitude', 'last_longitude']),
    omitKeys(base, ['path_json', 'last_latitude', 'last_longitude']),
    omitKeys(base, ['path_json', 'last_latitude', 'last_longitude', 'updated_at']),
    clockAliases,
    omitKeys(clockAliases, ['gps_path']),
    omitKeys(clockAliases, ['latitude', 'longitude']),
    omitKeys(clockAliases, ['gps_path', 'latitude', 'longitude']),
    omitKeys(clockAliases, ['gps_path', 'latitude', 'longitude', 'updated_at']),
    camelCase,
    omitKeys(camelCase, ['pathJson']),
    omitKeys(camelCase, ['lastLatitude', 'lastLongitude']),
    omitKeys(camelCase, ['pathJson', 'lastLatitude', 'lastLongitude']),
    omitKeys(camelCase, ['pathJson', 'lastLatitude', 'lastLongitude', 'updatedAt']),
    {
      ...(updates.endedAt !== undefined ? { ended_at: updates.endedAt } : {}),
      ...(updates.isActive !== undefined ? { is_active: updates.isActive } : {}),
      ...(updates.totalMiles !== undefined ? { total_miles: updates.totalMiles } : {})
    },
    {
      ...(updates.endedAt !== undefined ? { clock_out_at: updates.endedAt } : {}),
      ...(updates.isActive !== undefined ? { active: updates.isActive } : {}),
      ...(updates.totalMiles !== undefined ? { mileage_miles: updates.totalMiles } : {})
    },
    {
      ...(updates.endedAt !== undefined ? { endedAt: updates.endedAt } : {}),
      ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
      ...(updates.totalMiles !== undefined ? { totalMiles: updates.totalMiles } : {})
    },
    {
      ...(updates.endedAt !== undefined ? { ended_at: updates.endedAt } : {}),
      ...(updates.isActive !== undefined ? { is_active: updates.isActive } : {})
    },
    {
      ...(updates.endedAt !== undefined ? { clock_out_at: updates.endedAt } : {}),
      ...(updates.isActive !== undefined ? { active: updates.isActive } : {})
    },
    {
      ...(updates.endedAt !== undefined ? { ended_at: updates.endedAt } : {})
    },
    {
      ...(updates.endedAt !== undefined ? { clock_out_at: updates.endedAt } : {})
    },
    {
      ...(updates.isActive !== undefined ? { is_active: updates.isActive } : {})
    },
    {
      ...(updates.isActive !== undefined ? { active: updates.isActive } : {})
    },
    ...buildTimeEntryIdentityPayloads(updates, 'started_at', 'is_active'),
    ...buildTimeEntryIdentityPayloads(updates, 'clock_in_at', 'active'),
    ...buildTimeEntryIdentityPayloads(updates, 'startedAt', 'isActive')
  ];
}

function mapInvoice(row) {
  const total = toNumber(pick(row, 'total', 'amount'));
  const balance = toNumber(pick(row, 'balance'), total);
  return {
    id: String(pick(row, 'ROWID', 'id') || ''),
    ticketId: String(pick(row, 'ticket_id', 'ticketId', 'request_id', 'requestId') || ''),
    customerId: String(pick(row, 'customer_id', 'customerId') || ''),
    invoiceNumber: pick(row, 'invoice_number', 'invoiceNumber') || '',
    status: pick(row, 'status') || 'draft',
    amount: total,
    balance,
    paymentLink: pick(row, 'payment_url', 'paymentLink') || '',
    description: pick(row, 'description', 'notes') || '',
    zohoInvoiceId: pick(row, 'zoho_invoice_id', 'zohoInvoiceId') || ''
  };
}

function mapPayment(row) {
  return {
    id: String(pick(row, 'ROWID', 'id') || ''),
    employeeId: String(pick(row, 'employee_id', 'employeeId') || ''),
    period: pick(row, 'period') || '',
    gross: toNumber(pick(row, 'gross')),
    net: toNumber(pick(row, 'net')),
    status: pick(row, 'status') || 'Pending'
  };
}

function mapTimeEntry(row) {
  const endedAt = pick(row, 'ended_at', 'endedAt', 'clock_out_at', 'clockOutAt') || '';
  return {
    id: String(pick(row, 'ROWID', 'id') || ''),
    employeeId: String(
      pick(
        row,
        'employee_id',
        'employeeId',
        'user_id',
        'userId',
        'staff_id',
        'staffId',
        'portal_user_id',
        'portalUserId',
        'assigned_employee_id',
        'assignedEmployeeId'
      ) || ''
    ),
    roleKey: pick(row, 'role_key', 'roleKey', 'role') || '',
    startedAt: pick(row, 'started_at', 'startedAt', 'clock_in_at', 'clockInAt') || '',
    endedAt,
    isActive: toBoolean(pick(row, 'is_active', 'isActive', 'active'), !endedAt),
    totalMiles: toNumber(pick(row, 'total_miles', 'totalMiles', 'mileage_miles', 'mileageMiles')),
    lastLatitude: toNumber(pick(row, 'last_latitude', 'lastLatitude'), 0),
    lastLongitude: toNumber(pick(row, 'last_longitude', 'lastLongitude'), 0),
    path: parseJson(pick(row, 'path_json', 'pathJson', 'gps_path', 'gpsPath'), []),
    createdAt: pick(row, 'created_at', 'createdAt', 'CREATEDTIME') || '',
    updatedAt: pick(row, 'updated_at', 'updatedAt', 'MODIFIEDTIME') || ''
  };
}

function getCatalystApp(req) {
  return catalyst.initialize(req);
}

function getTable(req, tableName) {
  return getCatalystApp(req).datastore().table(tableName);
}

async function runQuery(req, query, tableName) {
  const response = await getCatalystApp(req).zcql().executeZCQLQuery(query);
  return unwrapRows(response, tableName);
}

async function listAll(req, tableName, mapper) {
  const rows = await runQuery(req, `SELECT * FROM ${tableName}`, tableName);
  return rows.map(mapper);
}

async function getSettingsMap(req) {
  const rows = await runQuery(req, `SELECT * FROM ${env.tables.settings}`, env.tables.settings);
  return rows.reduce((acc, row) => {
    const key = pick(row, 'key1', 'key');
    if (key) {
      acc[key] = parseJson(pick(row, 'value_json', 'valueJson'), pick(row, 'value_json', 'valueJson'));
    }
    return acc;
  }, {});
}

export const catalystStore = {
  async getUsers(req) {
    return listAll(req, env.tables.users, mapUser);
  },

  async getEmployees(req) {
    const rows = await runQuery(
      req,
      `SELECT * FROM ${env.tables.users} WHERE role = 'employee'`,
      env.tables.users
    );
    return rows.map(mapUser);
  },

  async getUserById(req, userId) {
    const rows = await runQuery(
      req,
      `SELECT * FROM ${env.tables.users} WHERE ROWID = '${escapeValue(userId)}'`,
      env.tables.users
    );
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async getUserByEmail(req, email) {
    const rows = await runQuery(
      req,
      `SELECT * FROM ${env.tables.users} WHERE email = '${escapeValue(email)}'`,
      env.tables.users
    );
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async createUser(req, user) {
    const table = getTable(req, env.tables.users);
    const payload = {
      email: user.email,
      name: user.name,
      role: user.role || 'customer',
      password_hash: user.passwordHash,
      is_active: user.isActive ?? true
    };

    const phoneNumber = normalizeNumericPhone(user.phone);
    if (phoneNumber !== undefined) {
      payload.phone = phoneNumber;
    }

    const optionalFields = {
      address: user.address || '',
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      directory_groups: Array.isArray(user.directoryGroups)
        ? JSON.stringify(user.directoryGroups)
        : user.directoryGroups || ''
    };

    for (const [key, value] of Object.entries(optionalFields)) {
      if (value !== '') {
        payload[key] = value;
      }
    }

    const row = await table.insertRow(payload);
    return mapUser(row);
  },

  async updateUser(req, userId, updates) {
    const table = getTable(req, env.tables.users);
    const row = await updateRowWithFallback(table, userId, buildUserUpdatePayloads(updates));
    return mapUser(row);
  },

  async deleteUser(req, userId) {
    const table = getTable(req, env.tables.users);
    await table.deleteRow(String(userId));
    return true;
  },

  async listServices(req, user) {
    const rows = await runQuery(req, `SELECT * FROM ${env.tables.services}`, env.tables.services);
    if (user?.role === 'customer') {
      return rows
        .filter((row) =>
          rowMatchesUser(row, user, [
            'customer_id',
            'customerId',
            'user_id',
            'userId',
            'email',
            'customer_email',
            'customerEmail',
            'zoho_contact_id',
            'zohoContactId'
          ])
        )
        .map(mapService);
    }
    return rows.map(mapService);
  },

  async listTickets(req, user) {
    const rows = await runQuery(req, `SELECT * FROM ${env.tables.tickets}`, env.tables.tickets);
    const filteredRows =
      user?.role === 'customer'
        ? rows.filter((row) =>
            rowMatchesUser(row, user, [
              'customer_id',
              'customerId',
              'user_id',
              'userId',
              'customer_email',
              'customerEmail',
              'email'
            ])
          )
        : user?.role === 'employee'
          ? rows.filter((row) =>
              rowMatchesUser(row, user, [
                'employee_id',
                'employeeId',
                'assigned_employee_id',
                'assignedEmployeeId',
                'employee_email',
                'employeeEmail'
              ])
            )
          : rows;
    const users = await this.getUsers(req);
    const usersById = new Map(users.map((item) => [item.id, item]));
    return filteredRows.map((row) => {
      const ticket = mapTicket(row);
      ticket.customerName = ticket.customerName || usersById.get(ticket.customerId)?.name || '';
      ticket.assignedEmployee =
        ticket.assignedEmployee || usersById.get(ticket.employeeId)?.name || '';
      return ticket;
    });
  },

  async createTicket(req, ticket) {
    const table = getTable(req, env.tables.tickets);
    const row = await insertRowWithFallback(table, buildTicketInsertPayloads(ticket));
    return mapTicket(row);
  },

  async getTicketById(req, ticketId) {
    const rows = await runQuery(
      req,
      `SELECT * FROM ${env.tables.tickets} WHERE ROWID = '${escapeValue(ticketId)}'`,
      env.tables.tickets
    );
    return rows[0] ? mapTicket(rows[0]) : null;
  },

  async updateTicket(req, ticketId, updates) {
    const table = getTable(req, env.tables.tickets);
    const row = await updateRowWithFallback(table, ticketId, buildTicketUpdatePayloads(updates));
    return mapTicket(row);
  },

  async listInvoices(req, user) {
    let query = `SELECT * FROM ${env.tables.invoices}`;
    if (user?.role === 'customer') {
      query += ` WHERE customer_id = '${escapeValue(user.id)}'`;
    }
    const rows = await runQuery(req, query, env.tables.invoices);
    return rows.map(mapInvoice);
  },

  async upsertInvoice(req, invoice) {
    const table = getTable(req, env.tables.invoices);
    if (invoice.id) {
      const row = await table.updateRow({
        ROWID: invoice.id,
        ticket_id: invoice.ticketId,
        customer_id: invoice.customerId,
        zoho_invoice_id: invoice.zohoInvoiceId,
        invoice_number: invoice.invoiceNumber,
        status: invoice.status,
        total: invoice.amount,
        balance: invoice.balance,
        payment_url: invoice.paymentLink,
        description: invoice.description
      });
      return mapInvoice(row);
    }

    const row = await table.insertRow({
      ticket_id: invoice.ticketId,
      customer_id: invoice.customerId,
      zoho_invoice_id: invoice.zohoInvoiceId,
      invoice_number: invoice.invoiceNumber,
      status: invoice.status,
      total: invoice.amount,
      balance: invoice.balance,
      payment_url: invoice.paymentLink,
      description: invoice.description
    });
    return mapInvoice(row);
  },

  async listPayments(req, user) {
    if (user?.role !== 'employee') return [];
    const rows = await runQuery(
      req,
      `SELECT * FROM ${env.tables.payments} WHERE employee_id = '${escapeValue(user.id)}'`,
      env.tables.payments
    );
    return rows.map(mapPayment);
  },

  async listTimeEntries(req, userId) {
    const rows = await runQuery(req, `SELECT * FROM ${env.tables.timeEntries}`, env.tables.timeEntries);
    return rows
      .map(mapTimeEntry)
      .filter((entry) => !userId || String(entry.employeeId) === String(userId));
  },

  async getActiveTimeEntry(req, userId) {
    const entries = await this.listTimeEntries(req, userId);
    return entries.find((entry) => entry.isActive) || null;
  },

  async createTimeEntry(req, entry) {
    const table = getTable(req, env.tables.timeEntries);
    const row = await insertRowWithFallback(table, buildTimeEntryInsertPayloads(entry));
    return mapTimeEntry(row);
  },

  async updateTimeEntry(req, entryId, updates) {
    const table = getTable(req, env.tables.timeEntries);
    const row = await updateRowWithFallback(table, entryId, buildTimeEntryUpdatePayloads(updates));
    return mapTimeEntry(row);
  },

  async getSettings(req) {
    return getSettingsMap(req);
  },

  async saveSettings(req, settings) {
    const table = getTable(req, env.tables.settings);
    const existingRows = await runQuery(req, `SELECT * FROM ${env.tables.settings}`, env.tables.settings);
    const byKey = new Map(existingRows.map((row) => [pick(row, 'key1', 'key'), row]));

    const persisted = {};
    for (const [key, value] of Object.entries(settings)) {
      const existing = byKey.get(key);
      const payload = {
        key1: key,
        value_json: JSON.stringify(value ?? null)
      };
      const row = existing?.ROWID
        ? await table.updateRow({ ROWID: existing.ROWID, ...payload })
        : await table.insertRow(payload);
      persisted[key] = parseJson(row.value_json, row.value_json);
    }

    return persisted;
  }
};
