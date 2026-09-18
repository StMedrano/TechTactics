import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import pushRoutes from './routes/pushRoutes.js';

const app = express();
const shouldUseExpressCors = env.appMode !== 'catalyst';
const CATALYST_HOST_SUFFIXES = [
  '.development.catalystserverless.com',
  '.catalystserverless.com'
];
const TRUSTED_CATALYST_HOST_PREFIXES = ['techtacticsportal-'];
const TRUSTED_CUSTOM_CLIENT_HOSTNAMES = ['portal.mytechtactics.com'];

function normalizeOrigin(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function hasCatalystHostedSuffix(hostname) {
  return CATALYST_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

const allowedOrigins = new Set(env.clientOrigins.map(normalizeOrigin).filter(Boolean));
const allowedHostnames = new Set(
  Array.from(allowedOrigins).map((origin) => new URL(origin).hostname)
);

function isAllowedOrigin(origin) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return false;
  }

  if (allowedOrigins.has(normalizedOrigin)) {
    return true;
  }

  try {
    const hostname = new URL(normalizedOrigin).hostname;
    if (TRUSTED_CUSTOM_CLIENT_HOSTNAMES.includes(hostname)) {
      return true;
    }

    if (!hasCatalystHostedSuffix(hostname)) {
      return false;
    }

    if (
      TRUSTED_CATALYST_HOST_PREFIXES.some((prefix) =>
        hostname.startsWith(prefix)
      )
    ) {
      return true;
    }

    return Array.from(allowedHostnames).some((allowedHostname) =>
      hasCatalystHostedSuffix(allowedHostname)
    );
  } catch {
    return false;
  }
}

if (shouldUseExpressCors) {
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          return callback(null, env.clientOrigin);
        }

        const normalizedOrigin = normalizeOrigin(origin);
        if (normalizedOrigin && isAllowedOrigin(normalizedOrigin)) {
          return callback(null, normalizedOrigin);
        }

        return callback(new Error(`Origin not allowed: ${origin}`));
      },
      credentials: true
    })
  );
}
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', mode: env.appMode, utcTime: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/push', pushRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  if (res.headersSent) {
    return;
  }
  const status = Number(error?.status || error?.statusCode || 500);
  res.status(status >= 400 && status < 600 ? status : 500).json({
    message: error?.message || 'Internal server error.'
  });
});

app.listen(env.port, () => {
  console.log(`TechTactics Catalyst server listening on port ${env.port}`);
});
