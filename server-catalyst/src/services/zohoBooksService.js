import axios from 'axios';
import catalyst from 'zcatalyst-sdk-node';
import { env } from '../config/env.js';
import { getStore } from './storeFactory.js';

function getCatalystApp(req) {
  return catalyst.initialize(req);
}

export function isZohoBooksConnectionEnabled() {
  return env.appMode === 'catalyst' && Boolean(env.zoho.booksConnectionLinkName);
}

export async function getZohoBooksConnectionCredentials(req) {
  if (!isZohoBooksConnectionEnabled()) {
    return null;
  }

  try {
    const credentials = await getCatalystApp(req)
      .connections()
      .getConnectionCredentials(env.zoho.booksConnectionLinkName);

    return {
      headers: credentials?.headers || {},
      parameters: credentials?.parameters || {}
    };
  } catch {
    return null;
  }
}

export async function resolveZohoBooksAuth(req) {
  const directToken = req.headers['x-zoho-access-token'];
  if (directToken) return directToken;

  if (isZohoBooksConnectionEnabled()) {
    const connectionCredentials = await getZohoBooksConnectionCredentials(req);
    if (connectionCredentials) {
      return connectionCredentials;
    }
  }

  const settings = await getStore().getSettings(req);
  if (!settings.zoho_refresh_token) return null;

  const refreshed = await refreshAccessToken(settings.zoho_refresh_token);
  return refreshed.access_token || null;
}

function buildZohoBooksRequestConfig(auth, overrides = {}) {
  const baseHeaders =
    typeof auth === 'string'
      ? { Authorization: `Zoho-oauthtoken ${auth}` }
      : { ...(auth?.headers || {}) };

  const baseParams = { ...(typeof auth === 'string' ? {} : auth?.parameters || {}) };
  if (env.zoho.organizationId) {
    baseParams.organization_id = env.zoho.organizationId;
  }

  return {
    ...overrides,
    headers: {
      ...baseHeaders,
      ...(overrides.headers || {})
    },
    params: {
      ...baseParams,
      ...(overrides.params || {})
    }
  };
}

export function buildZohoAuthorizeUrl(state = 'techtactics') {
  const params = new URLSearchParams({
    client_id: env.zoho.clientId,
    response_type: 'code',
    redirect_uri: env.zoho.redirectUri,
    scope: env.zoho.booksScope,
    access_type: 'offline',
    prompt: 'consent',
    state
  });
  return `${env.zoho.accountsBaseUrl}/oauth/v2/auth?${params.toString()}`;
}

export function buildZohoSsoAuthorizeUrl(state = 'techtactics_sso') {
  const params = new URLSearchParams({
    client_id: env.zoho.clientId,
    response_type: 'code',
    redirect_uri: env.zoho.ssoRedirectUri,
    scope: env.zoho.ssoScope,
    access_type: 'online',
    prompt: 'consent',
    state
  });
  return `${env.zoho.accountsBaseUrl}/oauth/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.zoho.clientId,
    client_secret: env.zoho.clientSecret,
    redirect_uri: env.zoho.redirectUri,
    code
  });
  const { data } = await axios.post(`${env.zoho.accountsBaseUrl}/oauth/v2/token`, body);
  return data;
}

export async function exchangeSsoCodeForToken(code, accountsServer = env.zoho.accountsBaseUrl) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.zoho.clientId,
    client_secret: env.zoho.clientSecret,
    redirect_uri: env.zoho.ssoRedirectUri,
    code
  });
  const { data } = await axios.post(`${accountsServer}/oauth/v2/token`, body);
  return data;
}

export async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: env.zoho.clientId,
    client_secret: env.zoho.clientSecret,
    refresh_token: refreshToken
  });
  const { data } = await axios.post(`${env.zoho.accountsBaseUrl}/oauth/v2/token`, body);
  return data;
}

export async function listZohoInvoices(auth) {
  const { data } = await axios.get(
    `${env.zoho.apiBaseUrl}${env.zoho.invoicePath}`,
    buildZohoBooksRequestConfig(auth)
  );
  return data;
}

export async function listZohoItems(auth, params = {}) {
  const { data } = await axios.get(
    `${env.zoho.apiBaseUrl}${env.zoho.itemsPath}`,
    buildZohoBooksRequestConfig(auth, { params })
  );
  return data;
}

export async function createZohoInvoice(auth, payload) {
  const { data } = await axios.post(
    `${env.zoho.apiBaseUrl}${env.zoho.invoicePath}`,
    payload,
    buildZohoBooksRequestConfig(auth)
  );
  return data;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + Number(days || 30));
  return nextDate;
}

function toZohoDate(value) {
  return value.toISOString().slice(0, 10);
}

function extractPaymentUrl(data) {
  return String(
    data?.data?.share_link ||
      data?.share_link ||
      data?.payment_url ||
      data?.paymentUrl ||
      data?.invoice?.payment_url ||
      data?.invoice?.payment_link ||
      data?.invoice?.payment_options?.payment_url ||
      ''
  ).trim();
}

export async function getZohoInvoice(auth, invoiceId) {
  const { data } = await axios.get(
    `${env.zoho.apiBaseUrl}${env.zoho.invoicePath}/${invoiceId}`,
    buildZohoBooksRequestConfig(auth)
  );
  return data;
}

export async function markZohoInvoiceAsSent(auth, invoiceId) {
  const { data } = await axios.post(
    `${env.zoho.apiBaseUrl}${env.zoho.invoicePath}/${invoiceId}/status/sent`,
    {},
    buildZohoBooksRequestConfig(auth)
  );
  return data;
}

export async function generateZohoInvoicePaymentLink(auth, invoiceId, options = {}) {
  const expiryDate =
    options.expiryDate ||
    toZohoDate(addDays(new Date(), env.zoho.paymentLinkExpiryDays || 30));
  const { data } = await axios.get(
    `${env.zoho.apiBaseUrl}${env.zoho.paymentLinkPath}`,
    buildZohoBooksRequestConfig(auth, {
      params: {
        transaction_id: invoiceId,
        transaction_type: 'invoice',
        link_type: 'public',
        expiry_time: expiryDate
      }
    })
  );

  return {
    paymentUrl: extractPaymentUrl(data),
    expiresAt: expiryDate,
    raw: data
  };
}

export async function getInvoicePaymentLink(auth, invoiceId) {
  const generatedLink = await generateZohoInvoicePaymentLink(auth, invoiceId).catch(() => null);
  const invoiceData = await getZohoInvoice(auth, invoiceId).catch(() => null);

  return {
    paymentUrl: generatedLink?.paymentUrl || extractPaymentUrl(invoiceData),
    expiresAt: generatedLink?.expiresAt || '',
    invoice: invoiceData?.invoice || null
  };
}

export async function listZohoContacts(auth, params = {}) {
  const { data } = await axios.get(
    `${env.zoho.apiBaseUrl}${env.zoho.contactsPath}`,
    buildZohoBooksRequestConfig(auth, { params })
  );
  return data;
}

export async function findZohoContactByEmail(auth, email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const data = await listZohoContacts(auth, {
    email_contains: normalizedEmail,
    contact_type: 'customer'
  });

  const contacts = Array.isArray(data?.contacts) ? data.contacts : [];
  return (
    contacts.find((contact) => {
      const directEmail = String(contact?.email || '').trim().toLowerCase();
      if (directEmail === normalizedEmail) {
        return true;
      }

      return Array.isArray(contact?.contact_persons)
        ? contact.contact_persons.some(
            (person) => String(person?.email || '').trim().toLowerCase() === normalizedEmail
          )
        : false;
    }) || contacts[0] || null
  );
}

function splitNameParts(name, email) {
  const fallback = String(email || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
  const segments = String(name || fallback)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    firstName: segments[0] || 'TechTactics',
    lastName: segments.slice(1).join(' ')
  };
}

function buildZohoContactPayload(user) {
  const { firstName, lastName } = splitNameParts(user?.name, user?.email);
  const phone = String(user?.phone || '').trim();
  const address = String(user?.address || '').trim();

  const payload = {
    contact_name: String(user?.name || user?.email || 'TechTactics Customer').trim(),
    contact_type: 'customer',
    billing_address: {},
    contact_persons: [
      {
        first_name: firstName,
        last_name: lastName,
        email: String(user?.email || '').trim(),
        phone,
        is_primary_contact: true
      }
    ]
  };

  if (phone) {
    payload.phone = phone;
    payload.mobile = phone;
    payload.billing_address.phone = phone;
  }

  if (address) {
    payload.billing_address.address = address;
  }

  if (!Object.keys(payload.billing_address).length) {
    delete payload.billing_address;
  }

  return payload;
}

export async function createZohoContact(auth, payload) {
  const { data } = await axios.post(
    `${env.zoho.apiBaseUrl}${env.zoho.contactsPath}`,
    payload,
    buildZohoBooksRequestConfig(auth)
  );
  return data;
}

export async function ensureZohoBooksContactForUser(req, user, options = {}) {
  if (!user?.email) {
    return {
      authAvailable: false,
      contactId: '',
      contact: null
    };
  }

  const auth = await resolveZohoBooksAuth(req);
  if (!auth) {
    return {
      authAvailable: false,
      contactId: '',
      contact: null
    };
  }

  if (user.zohoContactId && !options.forceLookup) {
    return {
      authAvailable: true,
      contactId: String(user.zohoContactId),
      contact: null
    };
  }

  const matchedContact = await findZohoContactByEmail(auth, user.email).catch(() => null);
  if (matchedContact?.contact_id) {
    return {
      authAvailable: true,
      contactId: String(matchedContact.contact_id),
      contact: matchedContact
    };
  }

  const created = await createZohoContact(auth, buildZohoContactPayload(user));
  const createdContact = created?.contact || created?.data?.contact || null;

  return {
    authAvailable: true,
    contactId: String(createdContact?.contact_id || ''),
    contact: createdContact
  };
}
