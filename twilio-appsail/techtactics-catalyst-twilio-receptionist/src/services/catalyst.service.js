let catalyst;
try {
  catalyst = require('zcatalyst-sdk-node');
} catch (_err) {
  catalyst = null;
}

const inMemoryLeads = [];
const TABLE_NAME = process.env.CATALYST_LEADS_TABLE || 'ReceptionistLeads';

function getErrorMessage(error) {
  return String(error?.message || error || '');
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

function getCatalystApp(req) {
  if (!catalyst) return null;
  try {
    return catalyst.initialize(req);
  } catch (err) {
    console.warn('Catalyst SDK initialization failed; using in-memory fallback.', err.message);
    return null;
  }
}

function leadToRow(lead) {
  return {
    CallSid: lead.callSid || '',
    CallerPhone: lead.callerPhone || '',
    Transcript: lead.transcript || '',
    Category: lead.category || 'general',
    Priority: lead.priority || 'normal',
    Summary: lead.summary || '',
    Status: lead.status || 'new',
    ParentLeadId: lead.parentLeadId || '',
    CreatedAt: new Date().toISOString()
  };
}

function leadToPayloads(lead) {
  const pascal = leadToRow(lead);
  const snake = {
    call_sid: lead.callSid || '',
    caller_phone: lead.callerPhone || '',
    transcript: lead.transcript || '',
    category: lead.category || 'general',
    priority: lead.priority || 'normal',
    summary: lead.summary || '',
    status: lead.status || 'new',
    parent_lead_id: lead.parentLeadId || '',
    created_at: new Date().toISOString()
  };
  const camel = {
    callSid: lead.callSid || '',
    callerPhone: lead.callerPhone || '',
    transcript: lead.transcript || '',
    category: lead.category || 'general',
    priority: lead.priority || 'normal',
    summary: lead.summary || '',
    status: lead.status || 'new',
    parentLeadId: lead.parentLeadId || '',
    createdAt: new Date().toISOString()
  };

  return [
    pascal,
    omitKeys(pascal, ['ParentLeadId']),
    omitKeys(pascal, ['CreatedAt']),
    omitKeys(pascal, ['ParentLeadId', 'CreatedAt']),
    snake,
    omitKeys(snake, ['parent_lead_id']),
    omitKeys(snake, ['created_at']),
    omitKeys(snake, ['parent_lead_id', 'created_at']),
    camel,
    omitKeys(camel, ['parentLeadId']),
    omitKeys(camel, ['createdAt']),
    omitKeys(camel, ['parentLeadId', 'createdAt'])
  ];
}

async function insertLeadWithFallback(table, lead) {
  let lastError = null;
  const queue = uniquePayloads(leadToPayloads(lead));
  const seen = new Set(queue.map(payload => JSON.stringify(payload)));

  while (queue.length) {
    const payload = queue.shift();
    try {
      return await table.insertRow(payload);
    } catch (error) {
      lastError = error;
      if (!isSchemaColumnError(error)) throw error;

      const invalidColumnName = extractInvalidColumnName(error);
      const matchingKeys = Object.keys(payload).filter(
        key => key.toLowerCase() === invalidColumnName.toLowerCase()
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

function saveLeadInMemory(lead) {
  const saved = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...leadToRow(lead)
  };
  inMemoryLeads.unshift(saved);
  return saved;
}

async function saveReceptionistLead(req, lead) {
  const app = getCatalystApp(req);

  if (!app || process.env.USE_MEMORY_STORE === 'true') {
    return saveLeadInMemory(lead);
  }

  const datastore = app.datastore();
  const table = datastore.table(TABLE_NAME);
  try {
    const inserted = await insertLeadWithFallback(table, lead);
    return {
      id: inserted.ROWID || inserted.id || inserted.ID,
      ...inserted
    };
  } catch (error) {
    console.warn('Catalyst lead insert failed; using in-memory fallback.', error.message);
    return saveLeadInMemory(lead);
  }
}

async function listReceptionistLeads(req) {
  const app = getCatalystApp(req);
  if (!app || process.env.USE_MEMORY_STORE === 'true') {
    return inMemoryLeads;
  }

  const zcql = app.zcql();
  const result = await zcql.executeZCQLQuery(`SELECT * FROM ${TABLE_NAME} ORDER BY CREATEDTIME DESC LIMIT 100`);
  return result.map(item => item[TABLE_NAME] || item);
}

module.exports = { saveReceptionistLead, listReceptionistLeads };
