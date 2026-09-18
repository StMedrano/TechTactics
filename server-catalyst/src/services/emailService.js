import catalyst from 'zcatalyst-sdk-node';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let smtpTransporter = null;

function getCatalystApp(req) {
  return catalyst.initialize(req);
}

function normalizeEmail(value) {
  const email = String(value || '').trim();
  return email && email.includes('@') ? email : '';
}

function normalizeRecipients(value) {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map(normalizeEmail).filter(Boolean))];
}

function redactRecipients(recipients) {
  return normalizeRecipients(recipients).map((email) => {
    const [name, domain] = email.split('@');
    if (!name || !domain) return 'invalid-email';
    return `${name.slice(0, 2)}***@${domain}`;
  });
}

function getConfiguredProvider() {
  return ['auto', 'catalyst', 'smtp'].includes(env.mail.provider) ? env.mail.provider : 'auto';
}

function isCatalystMailConfigured() {
  return env.appMode === 'catalyst' && env.mail.enabled && Boolean(env.mail.fromEmail);
}

function isSmtpMailConfigured() {
  return Boolean(
    env.mail.enabled &&
      env.mail.smtp.host &&
      env.mail.smtp.port &&
      env.mail.smtp.user &&
      env.mail.smtp.pass &&
      env.mail.fromEmail
  );
}

function buildFromHeader() {
  if (env.mail.smtp.from) {
    return env.mail.smtp.from;
  }

  if (env.mail.displayName) {
    return `${env.mail.displayName} <${env.mail.fromEmail}>`;
  }

  return env.mail.fromEmail;
}

function getSmtpTransporter() {
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: env.mail.smtp.host,
      port: env.mail.smtp.port,
      secure: env.mail.smtp.secure,
      auth: {
        user: env.mail.smtp.user,
        pass: env.mail.smtp.pass
      }
    });
  }

  return smtpTransporter;
}

function buildCatalystMail({ toRecipients, ccRecipients, bccRecipients, subject, text, html, replyToRecipients }) {
  const mail = {
    from_email: env.mail.fromEmail,
    to_email: toRecipients,
    subject,
    content: html || text,
    html_mode: Boolean(html)
  };

  if (env.mail.displayName) {
    mail.display_name = env.mail.displayName;
  }

  if (replyToRecipients.length) {
    mail.reply_to = replyToRecipients;
  }

  if (ccRecipients.length) {
    mail.cc = ccRecipients;
  }

  if (bccRecipients.length) {
    mail.bcc = bccRecipients;
  }

  return mail;
}

function buildSmtpMail({ toRecipients, ccRecipients, bccRecipients, subject, text, html, replyToRecipients }) {
  return {
    from: buildFromHeader(),
    to: toRecipients.join(', '),
    cc: ccRecipients.length ? ccRecipients.join(', ') : undefined,
    bcc: bccRecipients.length ? bccRecipients.join(', ') : undefined,
    replyTo: replyToRecipients.length ? replyToRecipients.join(', ') : undefined,
    subject,
    text,
    html
  };
}

async function sendWithCatalyst(req, mailInput) {
  if (!isCatalystMailConfigured()) {
    return {
      provider: 'catalyst',
      sent: false,
      reason: 'catalyst_mail_not_configured'
    };
  }

  const response = await getCatalystApp(req).email().sendMail(buildCatalystMail(mailInput));
  return {
    provider: 'catalyst',
    sent: true,
    response
  };
}

async function sendWithSmtp(mailInput) {
  if (!isSmtpMailConfigured()) {
    return {
      provider: 'smtp',
      sent: false,
      reason: 'smtp_not_configured'
    };
  }

  const response = await getSmtpTransporter().sendMail(buildSmtpMail(mailInput));
  return {
    provider: 'smtp',
    sent: true,
    response: {
      messageId: response.messageId,
      accepted: response.accepted,
      rejected: response.rejected
    }
  };
}

async function safeProviderAttempt(provider, sendFn, details) {
  try {
    return await sendFn();
  } catch (error) {
    console.error('Portal email failed', {
      provider,
      to: redactRecipients(details.toRecipients),
      subject: details.subject,
      message: error?.message || String(error)
    });
    return {
      provider,
      sent: false,
      reason: 'send_failed',
      message: error?.message || String(error),
      code: error?.code || ''
    };
  }
}

export function isPortalMailEnabled() {
  if (!env.mail.enabled || !env.mail.fromEmail) {
    return false;
  }

  const provider = getConfiguredProvider();
  if (provider === 'catalyst') {
    return isCatalystMailConfigured();
  }

  if (provider === 'smtp') {
    return isSmtpMailConfigured();
  }

  return isCatalystMailConfigured() || isSmtpMailConfigured();
}

export function getPortalGroupEmail() {
  return normalizeEmail(env.mail.portalGroup);
}

export function getPortalMailStatus() {
  const missing = [];
  if (!env.mail.fromEmail) missing.push('CATALYST_MAIL_FROM_EMAIL or PORTAL_EMAIL_FROM');
  if (['smtp', 'auto'].includes(getConfiguredProvider())) {
    if (!env.mail.smtp.user) missing.push('ZOHO_MAIL_USER or SMTP_USER');
    if (!env.mail.smtp.pass) missing.push('ZOHO_MAIL_PASS or SMTP_PASS');
  }

  return {
    enabled: env.mail.enabled,
    provider: getConfiguredProvider(),
    ready: isPortalMailEnabled(),
    catalystReady: isCatalystMailConfigured(),
    smtpReady: isSmtpMailConfigured(),
    fromEmail: env.mail.fromEmail,
    displayName: env.mail.displayName,
    replyTo: env.mail.replyTo,
    portalGroup: env.mail.portalGroup,
    smtpHost: env.mail.smtp.host,
    smtpPort: env.mail.smtp.port,
    smtpSecure: env.mail.smtp.secure,
    smtpUserConfigured: Boolean(env.mail.smtp.user),
    smtpPasswordConfigured: Boolean(env.mail.smtp.pass),
    missing
  };
}

export async function sendPortalEmail(req, { to, cc, bcc, subject, text, html, replyTo } = {}) {
  const toRecipients = normalizeRecipients(to);
  const ccRecipients = normalizeRecipients(cc);
  const bccRecipients = normalizeRecipients(bcc);
  const replyToRecipients = normalizeRecipients(replyTo || env.mail.replyTo);
  const messageSubject = String(subject || '').trim();
  const content = String(html || text || '').trim();

  if (!env.mail.enabled || !toRecipients.length || !messageSubject || !content) {
    return {
      sent: false,
      reason: !env.mail.enabled ? 'mail_disabled' : 'missing_email_fields',
      status: getPortalMailStatus()
    };
  }

  const mailInput = {
    toRecipients,
    ccRecipients,
    bccRecipients,
    replyToRecipients,
    subject: messageSubject,
    text: String(text || '').trim() || String(html || '').replace(/<[^>]*>/g, ' '),
    html: String(html || '').trim()
  };

  const provider = getConfiguredProvider();
  const attempts = [];

  if (provider === 'catalyst' || provider === 'auto') {
    attempts.push(await safeProviderAttempt('catalyst', () => sendWithCatalyst(req, mailInput), mailInput));
    if (attempts.at(-1)?.sent || provider === 'catalyst') {
      return {
        ...attempts.at(-1),
        attempts,
        status: getPortalMailStatus()
      };
    }
  }

  if (provider === 'smtp' || provider === 'auto') {
    attempts.push(await safeProviderAttempt('smtp', () => sendWithSmtp(mailInput), mailInput));
    return {
      ...attempts.at(-1),
      attempts,
      status: getPortalMailStatus()
    };
  }

  return {
    sent: false,
    reason: 'mail_not_configured',
    attempts,
    status: getPortalMailStatus()
  };
}
