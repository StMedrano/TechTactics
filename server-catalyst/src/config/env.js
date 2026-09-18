import dotenv from 'dotenv';
dotenv.config();

function parseOrigins(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeClientAppUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const pathname = url.pathname && url.pathname !== '/' ? url.pathname.replace(/\/+$/, '') : '';
    return `${url.origin}${pathname}`;
  } catch {
    return null;
  }
}

function normalizeClientOrigin(value) {
  const normalizedAppUrl = normalizeClientAppUrl(value);
  if (!normalizedAppUrl) return null;

  try {
    return new URL(normalizedAppUrl).origin;
  } catch {
    return null;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

const defaultClientAppUrl =
  process.env.APP_MODE === 'catalyst'
    ? 'https://portal.mytechtactics.com/app'
    : 'http://localhost:5173';
const configuredClientTargets = parseOrigins(
  process.env.CLIENT_APP_URL ||
    process.env.PUBLIC_CLIENT_APP_URL ||
    process.env.CLIENT_ORIGIN ||
    defaultClientAppUrl
);
const clientAppUrls = unique(configuredClientTargets.map(normalizeClientAppUrl));
const clientOrigins = unique(clientAppUrls.map(normalizeClientOrigin));

if (!clientAppUrls.length) {
  clientAppUrls.push(defaultClientAppUrl);
}

if (!clientOrigins.length) {
  clientOrigins.push(new URL(defaultClientAppUrl).origin);
}

export const env = {
  appMode: process.env.APP_MODE || 'demo',
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || 4000),
  clientAppUrl: clientAppUrls[0] || defaultClientAppUrl,
  clientOrigin: clientOrigins[0] || new URL(defaultClientAppUrl).origin,
  clientAppUrls,
  clientOrigins,
  sessionSecret: process.env.SESSION_SECRET || 'change-me',
  catalyst: {
    projectId: process.env.CATALYST_PROJECT_ID || '',
    projectKey: process.env.CATALYST_PROJECT_KEY || '',
    projectEnv: process.env.CATALYST_PROJECT_ENV || 'Development',
    appClientId: process.env.CATALYST_APP_CLIENT_ID || '',
    appClientSecret: process.env.CATALYST_APP_CLIENT_SECRET || '',
    appRedirectUri: process.env.CATALYST_APP_REDIRECT_URI || ''
  },
  tables: {
    users: process.env.CATALYST_TABLE_USERS || 'Users',
    services: process.env.CATALYST_TABLE_SERVICES || 'Services',
    tickets: process.env.CATALYST_TABLE_TICKETS || 'Tickets',
    timeEntries: process.env.CATALYST_TABLE_TIME_ENTRIES || 'TimeEntries',
    payments: process.env.CATALYST_TABLE_PAYMENTS || 'Payments',
    invoices: process.env.CATALYST_TABLE_INVOICES || 'Invoices',
    settings: process.env.CATALYST_TABLE_SETTINGS || 'Settings'
  },
  zoho: {
    accountsBaseUrl: process.env.ZOHO_ACCOUNTS_BASE_URL || 'https://accounts.zoho.com',
    apiBaseUrl: process.env.ZOHO_API_BASE_URL || 'https://www.zohoapis.com',
    booksConnectionLinkName:
      process.env.ZOHO_BOOKS_CONNECTION_LINK_NAME ||
      process.env.CATALYST_ZOHO_BOOKS_CONNECTION_LINK_NAME ||
      'books',
    clientId: process.env.ZOHO_CLIENT_ID || '',
    clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
    redirectUri: process.env.ZOHO_REDIRECT_URI || '',
    ssoRedirectUri:
      process.env.ZOHO_SSO_REDIRECT_URI || process.env.ZOHO_REDIRECT_URI || '',
    ssoScope: process.env.ZOHO_SSO_SCOPE || 'openid,email,profile',
    organizationId: process.env.ZOHO_ORGANIZATION_ID || '',
    booksScope: process.env.ZOHO_BOOKS_SCOPE || 'ZohoBooks.fullaccess.all',
    invoicePath: process.env.ZOHO_BOOKS_INVOICE_PATH || '/books/v3/invoices',
    contactsPath: process.env.ZOHO_BOOKS_CONTACTS_PATH || '/books/v3/contacts',
    itemsPath: process.env.ZOHO_BOOKS_ITEMS_PATH || '/books/v3/items',
    paymentLinkPath: process.env.ZOHO_BOOKS_PAYMENT_LINK_PATH || '/books/v3/share/paymentlink',
    paymentLinkExpiryDays: Number(process.env.ZOHO_BOOKS_PAYMENT_LINK_EXPIRY_DAYS || 30),
    markInvoiceSent:
      String(process.env.ZOHO_BOOKS_MARK_INVOICE_SENT || 'true').toLowerCase() !== 'false'
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || '',
    statusCallbackUrl: process.env.TWILIO_STATUS_CALLBACK_URL || '',
    defaultCountryCode: process.env.TWILIO_DEFAULT_COUNTRY_CODE || '+1'
  },
  mail: {
    enabled: String(process.env.PORTAL_MAIL_ENABLED || 'true').toLowerCase() !== 'false',
    provider: String(process.env.PORTAL_MAIL_PROVIDER || process.env.MAIL_PROVIDER || 'auto').toLowerCase(),
    fromEmail:
      process.env.CATALYST_MAIL_FROM_EMAIL ||
      process.env.ZOHO_MAIL_FROM_EMAIL ||
      process.env.PORTAL_EMAIL_FROM ||
      'portal@mytechtactics.com',
    displayName:
      process.env.PORTAL_EMAIL_DISPLAY_NAME ||
      process.env.ZOHO_MAIL_DISPLAY_NAME ||
      process.env.CATALYST_MAIL_DISPLAY_NAME ||
      'TechTactics Portal',
    replyTo:
      process.env.CATALYST_MAIL_REPLY_TO ||
      process.env.ZOHO_MAIL_REPLY_TO ||
      process.env.PORTAL_EMAIL_REPLY_TO ||
      'portal@mytechtactics.com',
    portalGroup:
      process.env.PORTAL_EMAIL_GROUP ||
      process.env.CATALYST_MAIL_ADMIN_GROUP ||
      'portal@mytechtactics.com',
    smtp: {
      host: process.env.ZOHO_MAIL_HOST || process.env.SMTP_HOST || 'smtp.zoho.com',
      port: Number(process.env.ZOHO_MAIL_PORT || process.env.SMTP_PORT || 465),
      secure: String(process.env.ZOHO_MAIL_SECURE || process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false',
      user: process.env.ZOHO_MAIL_USER || process.env.SMTP_USER || '',
      pass: process.env.ZOHO_MAIL_PASS || process.env.SMTP_PASS || '',
      from:
        process.env.ZOHO_MAIL_FROM ||
        process.env.SMTP_FROM ||
        process.env.PORTAL_EMAIL_SMTP_FROM ||
        process.env.CATALYST_MAIL_FROM ||
        ''
    }
  },
  push: {
    enabled: String(process.env.DEVICE_PUSH_ENABLED || 'true').toLowerCase() !== 'false',
    vapidPublicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.WEB_PUSH_VAPID_PRIVATE_KEY || '',
    vapidSubject:
      process.env.WEB_PUSH_VAPID_SUBJECT ||
      process.env.CATALYST_MAIL_REPLY_TO ||
      'mailto:portal@mytechtactics.com'
  },
  directory: {
    connectionLinkName:
      process.env.ZOHO_DIRECTORY_CONNECTION_LINK_NAME ||
      process.env.CATALYST_ZOHO_DIRECTORY_CONNECTION_LINK_NAME ||
      'directory',
    apiBaseUrl: process.env.ZOHO_DIRECTORY_API_BASE_URL || 'https://directory.zoho.com',
    orgId: process.env.ZOHO_DIRECTORY_ORG_ID || '',
    clientId: process.env.ZOHO_DIRECTORY_CLIENT_ID || '',
    clientSecret: process.env.ZOHO_DIRECTORY_CLIENT_SECRET || '',
    authUrl: process.env.ZOHO_DIRECTORY_AUTH_URL || '',
    tokenUrl: process.env.ZOHO_DIRECTORY_TOKEN_URL || '',
    userInfoUrl: process.env.ZOHO_DIRECTORY_USERINFO_URL || '',
    redirectUri: process.env.ZOHO_DIRECTORY_REDIRECT_URI || '',
    scope: process.env.ZOHO_DIRECTORY_SCOPE || 'openid email profile',
    samlEntryPoint: process.env.ZOHO_DIRECTORY_SAML_ENTRY_POINT || '',
    samlIdpCert: process.env.ZOHO_DIRECTORY_SAML_IDP_CERT || '',
    samlIssuer: process.env.ZOHO_DIRECTORY_SAML_ISSUER || '',
    samlAudience: process.env.ZOHO_DIRECTORY_SAML_AUDIENCE || '',
    samlCallbackUrl: process.env.ZOHO_DIRECTORY_SAML_CALLBACK_URL || '',
    samlIdentifierFormat: process.env.ZOHO_DIRECTORY_SAML_IDENTIFIER_FORMAT || '',
    samlPrivateKey: process.env.ZOHO_DIRECTORY_SAML_PRIVATE_KEY || '',
    samlPublicCert: process.env.ZOHO_DIRECTORY_SAML_PUBLIC_CERT || ''
  }
};
