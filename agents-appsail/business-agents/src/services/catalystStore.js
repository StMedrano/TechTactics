import { env } from '../config/env.js';
import { escapeZcql, nowIso, rowId } from '../utils/records.js';

const memory = {
  rows: new Map()
};

function tableRows(tableName) {
  if (!memory.rows.has(tableName)) memory.rows.set(tableName, []);
  return memory.rows.get(tableName);
}

function unwrapRows(result, tableName) {
  return (result || []).map((entry) => entry?.[tableName] || entry).filter(Boolean);
}

function getCatalystApp(req) {
  return import('zcatalyst-sdk-node').then((module) => {
    const catalyst = module.default || module;
    return catalyst.initialize(req);
  });
}

async function getTable(req, tableName) {
  const app = await getCatalystApp(req);
  return app.datastore().table(tableName);
}

function shouldUseCatalyst() {
  return env.appMode === 'catalyst';
}

function isSchemaColumnError(error) {
  const message = String(error?.message || error || '');
  return message.includes('Invalid input value for column name') || message.includes('column name');
}

function extractInvalidColumnName(error) {
  const message = String(error?.message || error || '');
  const match = message.match(/column name\s*["'`]?([A-Za-z0-9_]+)["'`]?/i);
  return match?.[1] || '';
}

function omit(source, key) {
  const clone = { ...source };
  delete clone[key];
  return clone;
}

async function insertWithFallback(table, payload) {
  let current = { ...payload };
  let lastError = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await table.insertRow(current);
    } catch (error) {
      lastError = error;
      if (!isSchemaColumnError(error)) throw error;

      const invalidColumn = extractInvalidColumnName(error);
      if (!invalidColumn || current[invalidColumn] === undefined) break;
      current = omit(current, invalidColumn);
    }
  }

  throw lastError;
}

export async function listRows(req, tableName, { where = '', limit = 200 } = {}) {
  if (!shouldUseCatalyst()) {
    const rows = tableRows(tableName);
    return rows.slice(0, limit);
  }

  const query = `SELECT * FROM ${tableName}${where ? ` WHERE ${where}` : ''} LIMIT ${Number(limit) || 200}`;
  const app = await getCatalystApp(req);
  const response = await app.zcql().executeZCQLQuery(query);
  return unwrapRows(response, tableName);
}

export async function findRows(req, tableName, column, value, limit = 25) {
  if (!value) return [];
  return listRows(req, tableName, {
    where: `${column} = '${escapeZcql(value)}'`,
    limit
  });
}

export async function insertRow(req, tableName, payload) {
  const withAudit = {
    ...payload,
    created_at: payload.created_at || nowIso(),
    updated_at: payload.updated_at || nowIso()
  };

  if (!shouldUseCatalyst()) {
    const row = {
      ROWID: `${Date.now()}${Math.floor(Math.random() * 10000)}`,
      ...withAudit
    };
    tableRows(tableName).push(row);
    return row;
  }

  return insertWithFallback(await getTable(req, tableName), withAudit);
}

export async function updateRow(req, tableName, id, payload) {
  const withAudit = {
    ROWID: String(id),
    ...payload,
    updated_at: payload.updated_at || nowIso()
  };

  if (!shouldUseCatalyst()) {
    const rows = tableRows(tableName);
    const index = rows.findIndex((row) => rowId(row) === String(id));
    if (index < 0) return null;
    rows[index] = { ...rows[index], ...withAudit };
    return rows[index];
  }

  return (await getTable(req, tableName)).updateRow(withAudit);
}

export async function createTask(req, task) {
  return insertRow(req, env.tables.agentTasks, {
    agent_key: task.agentKey,
    task_type: task.type,
    status: task.status || 'needs_approval',
    priority_level: task.priorityLevel || 'normal',
    assigned_to: task.assignedTo || 'admin',
    related_table: task.relatedTable || '',
    related_record_id: task.relatedRecordId || '',
    summary: task.summary,
    details_json: JSON.stringify(task.details || {}),
    due_at: task.dueAt || '',
    approval_required: task.approvalRequired === false ? 'false' : 'true'
  });
}

export async function logActivity(req, entry) {
  return insertRow(req, env.tables.agentActivityLog, {
    agent_key: entry.agentKey || 'system',
    action: entry.action,
    status: entry.status || 'ok',
    related_table: entry.relatedTable || '',
    related_record_id: entry.relatedRecordId || '',
    details_json: JSON.stringify(entry.details || {})
  });
}

export async function safeListRows(req, tableName, options) {
  try {
    return { rows: await listRows(req, tableName, options), error: '' };
  } catch (error) {
    return { rows: [], error: error?.message || `Unable to read ${tableName}.` };
  }
}
