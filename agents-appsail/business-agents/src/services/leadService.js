import { env } from '../config/env.js';
import { findRows, insertRow, updateRow } from './catalystStore.js';
import { normalizeEmail, normalizePhone, pick, rowId } from '../utils/records.js';

export function normalizeLead(input = {}) {
  const name =
    input.name ||
    [input.firstName, input.lastName].filter(Boolean).join(' ') ||
    input.customerName ||
    '';

  return {
    name: String(name || '').trim(),
    email: normalizeEmail(input.email),
    phone: normalizePhone(input.phone || input.from || input.caller),
    address: String(input.address || input.serviceAddress || '').trim(),
    source: String(input.source || input.utmSource || 'manual').trim(),
    serviceInterest: String(input.serviceInterest || input.service || input.category || '').trim(),
    urgency: String(input.urgency || '').trim(),
    notes: String(input.notes || input.message || input.description || '').trim()
  };
}

export function scoreLead(lead) {
  let score = 25;
  const text = `${lead.serviceInterest} ${lead.urgency} ${lead.notes}`.toLowerCase();

  if (lead.email) score += 10;
  if (lead.phone) score += 10;
  if (lead.address) score += 10;
  if (lead.serviceInterest) score += 10;
  if (/(today|asap|urgent|emergency|this week|ready|quote|install|camera|alarm|network|wifi|wi-fi)/.test(text)) {
    score += 25;
  }
  if (/(maintenance|upgrade|package|whole-home|business)/.test(text)) score += 10;

  const normalizedScore = Math.min(100, score);
  const label = normalizedScore >= 75 ? 'Hot' : normalizedScore >= 50 ? 'Warm' : 'Cold';
  return { score: normalizedScore, label };
}

export async function upsertLead(req, rawLead) {
  const lead = normalizeLead(rawLead);
  const leadScore = scoreLead(lead);
  const byEmail = lead.email ? await findRows(req, env.tables.leads, 'email', lead.email, 1) : [];
  const byPhone = !byEmail.length && lead.phone ? await findRows(req, env.tables.leads, 'phone', lead.phone, 1) : [];
  const existing = byEmail[0] || byPhone[0] || null;

  const payload = {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    address: lead.address,
    source: lead.source,
    service_interest: lead.serviceInterest,
    urgency: lead.urgency,
    notes: lead.notes,
    status: pick(existing, 'status') || 'new',
    score: leadScore.score,
    score_label: leadScore.label,
    last_contacted_at: pick(existing, 'last_contacted_at') || ''
  };

  const saved = existing
    ? await updateRow(req, env.tables.leads, rowId(existing), payload)
    : await insertRow(req, env.tables.leads, payload);

  return { lead, saved, score: leadScore, isDuplicate: Boolean(existing) };
}
