import axios from 'axios';
import { env } from '../config/env.js';

function normalizePhoneNumber(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  if (raw.startsWith('+')) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    const defaultCountryCode = String(env.twilio.defaultCountryCode || '+1').replace(/[^\d+]/g, '');
    const normalizedCountryCode = defaultCountryCode.startsWith('+')
      ? defaultCountryCode
      : `+${defaultCountryCode}`;
    return `${normalizedCountryCode}${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

function normalizeClientAppUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return '';
    }

    const pathname = url.pathname && url.pathname !== '/' ? url.pathname.replace(/\/+$/, '') : '';
    return `${url.origin}${pathname}`;
  } catch {
    return '';
  }
}

function getRequestClientAppUrl(req) {
  const explicitUrl = normalizeClientAppUrl(req?.headers?.['x-client-app-url']);
  if (explicitUrl) {
    return explicitUrl;
  }

  const referer = normalizeClientAppUrl(req?.headers?.referer || req?.headers?.referrer);
  if (referer) {
    try {
      const url = new URL(referer);
      const appIndex = url.pathname.toLowerCase().indexOf('/app');
      if (appIndex >= 0) {
        return `${url.origin}${url.pathname.slice(0, appIndex + 4)}`;
      }
      return url.origin;
    } catch {
      return referer;
    }
  }

  return env.clientAppUrl;
}

function buildPortalHashUrl(path = '/login', req = null) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getRequestClientAppUrl(req)}/#${normalizedPath}`;
}

export function isTwilioEnabled() {
  return Boolean(
    env.twilio.accountSid &&
      env.twilio.authToken &&
      (env.twilio.fromNumber || env.twilio.messagingServiceSid)
  );
}

export function getSmsCapablePhone(value) {
  const normalized = normalizePhoneNumber(value);
  return normalized || '';
}

export function getPortalUrl(path, req = null) {
  return buildPortalHashUrl(path, req);
}

export async function sendTwilioSms({ to, body }) {
  const destination = normalizePhoneNumber(to);
  const messageBody = String(body || '').trim();

  if (!destination || !messageBody || !isTwilioEnabled()) {
    return null;
  }

  const payload = new URLSearchParams({
    To: destination,
    Body: messageBody
  });

  if (env.twilio.messagingServiceSid) {
    payload.set('MessagingServiceSid', env.twilio.messagingServiceSid);
  } else {
    payload.set('From', env.twilio.fromNumber);
  }

  if (env.twilio.statusCallbackUrl) {
    payload.set('StatusCallback', env.twilio.statusCallbackUrl);
  }

  const auth = Buffer.from(
    `${env.twilio.accountSid}:${env.twilio.authToken}`,
    'utf8'
  ).toString('base64');

  const { data } = await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(env.twilio.accountSid)}/Messages.json`,
    payload.toString(),
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return data;
}

export async function sendBulkTwilioSms(recipients, body) {
  const jobs = Array.from(new Set((recipients || []).map(getSmsCapablePhone).filter(Boolean))).map((to) =>
    sendTwilioSms({ to, body })
  );

  if (!jobs.length) {
    return [];
  }

  return Promise.allSettled(jobs);
}
