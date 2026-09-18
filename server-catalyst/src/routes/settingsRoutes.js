import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/requireAuth.js';
import { getStore } from '../services/storeFactory.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPortalGroupEmail, getPortalMailStatus, sendPortalEmail } from '../services/emailService.js';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const settings = await getStore().getSettings(req);
  res.json(settings);
}));

router.post('/', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const saved = await getStore().saveSettings(req, req.body);
  res.json(saved);
}));

router.get('/mail/status', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => {
  res.json(getPortalMailStatus());
}));

router.post('/mail/test', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const requestedRecipient = String(req.body?.to || '').trim();
  const to = requestedRecipient || req.user.email || getPortalGroupEmail();
  const groupEmail = getPortalGroupEmail();
  const cc = groupEmail && groupEmail !== to ? [groupEmail] : [];
  const result = await sendPortalEmail(req, {
    to,
    cc,
    subject: 'TechTactics Portal test email',
    text: [
      'This is a test email from the TechTactics Portal.',
      'Please do not reply to this email. This mailbox is not monitored for support requests.',
      `Sent at: ${new Date().toISOString()}`
    ].join('\n\n'),
    html: [
      '<div style="font-family:Arial,sans-serif;line-height:1.5;">',
      '<h2>TechTactics Portal test email</h2>',
      '<p>This is a test email from the TechTactics Portal.</p>',
      '<p><strong>Please do not reply to this email. This mailbox is not monitored for support requests.</strong></p>',
      `<p>Sent at: ${new Date().toISOString()}</p>`,
      '</div>'
    ].join('')
  });

  res.status(result.sent ? 200 : 502).json(result);
}));

export default router;
