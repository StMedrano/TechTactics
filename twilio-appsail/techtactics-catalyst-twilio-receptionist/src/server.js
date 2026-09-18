require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const voiceRoutes = require('./routes/voice.routes');
const adminRoutes = require('./routes/admin.routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

// Twilio posts application/x-www-form-urlencoded webhook payloads.
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(helmet());
app.use(cors());

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'TechTactics AI Receptionist' });
});

app.use('/voice', voiceRoutes);
app.use('/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

// Catalyst AppSail injects this port at runtime. Local dev falls back to 3000.
const port = process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`TechTactics AI Receptionist listening on port ${port}`);
});
