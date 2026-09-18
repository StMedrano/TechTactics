const express = require('express');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const { validateTwilioRequest } = require('../middleware/twilio.middleware');
const { analyzeCallReason } = require('../services/ai.service');
const { saveReceptionistLead } = require('../services/catalyst.service');
const { createPortalIntakeFromCall } = require('../services/portal-intake.service');
const { normalizePhone, buildCallbackUrl } = require('../utils/formatters');

const router = express.Router();
const SAFE_TWILIO_VOICES = new Set([
  'alice',
  'Polly.Joanna',
  'Polly.Matthew',
  'Polly.Amy',
  'Polly.Joey',
  'Polly.Joanna-Neural',
  'Polly.Matthew-Neural',
  'Google.en-US-Chirp3-HD-Aoede'
]);

function buildSayOptions() {
  const requestedVoice = String(process.env.TWILIO_VOICE || 'Polly.Joanna').trim() || 'Polly.Joanna';
  const voice = SAFE_TWILIO_VOICES.has(requestedVoice) ? requestedVoice : 'Polly.Joanna';
  const language =
    voice === 'alice'
      ? ''
      : String(process.env.TWILIO_LANGUAGE || 'en-US').trim();
  return {
    voice,
    ...(language ? { language } : {})
  };
}

function say(target, message) {
  target.say(buildSayOptions(), message);
}

function buildFlowQuery(params) {
  return new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = String(value);
      }
      return acc;
    }, {})
  ).toString();
}

function getAnalysisFromQuery(req) {
  return {
    category: req.query.category || 'general',
    priority: req.query.priority || 'normal',
    summary: req.query.summary || 'Phone request.'
  };
}

async function safeSaveReceptionistLead(req, lead) {
  try {
    return await saveReceptionistLead(req, lead);
  } catch (error) {
    console.warn('Receptionist lead save failed; continuing call flow.', error.message);
    return {
      id: `unsaved-${Date.now()}`,
      ...lead
    };
  }
}

async function safeCreatePortalIntake(req, context) {
  try {
    return await createPortalIntakeFromCall(req, context);
  } catch (error) {
    console.warn('Portal customer/ticket intake failed; continuing call flow.', error.message);
    return null;
  }
}

function sendVoiceFallback(res) {
  const twiml = new VoiceResponse();
  say(
    twiml,
    'I am sorry, the TechTactics receptionist is having trouble saving this request right now. Please call again shortly or contact TechTactics directly. Goodbye.'
  );
  twiml.hangup();
  return res.status(200).type('text/xml').send(twiml.toString());
}

router.post('/incoming', validateTwilioRequest, (req, res) => {
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    input: 'speech dtmf',
    timeout: 5,
    speechTimeout: 'auto',
    numDigits: 1,
    action: buildCallbackUrl(req, '/voice/intent'),
    method: 'POST'
  });

  say(gather,
    'Thank you for calling TechTactics, smart solutions and secure connections. ' +
    'Please tell me if you need a new install, a repair, service removal, billing help, or an emergency. ' +
    'You can also press 1 for emergency service, 2 for a new install, 3 for repair, or 4 for billing.'
  );

  twiml.redirect({ method: 'POST' }, buildCallbackUrl(req, '/voice/no-input'));

  res.type('text/xml').send(twiml.toString());
});

router.post('/no-input', validateTwilioRequest, (req, res) => {
  const twiml = new VoiceResponse();
  say(twiml, 'I am sorry, I did not catch that. Let us try one more time.');
  twiml.redirect({ method: 'POST' }, buildCallbackUrl(req, '/voice/incoming'));
  res.type('text/xml').send(twiml.toString());
});

router.post('/intent', validateTwilioRequest, async (req, res, next) => {
  try {
    const callerPhone = normalizePhone(req.body.From);
    const speech = req.body.SpeechResult || '';
    const digit = req.body.Digits || '';
    const callSid = req.body.CallSid || '';

    const analysis = await analyzeCallReason({ speech, digit });

    if (analysis.priority === 'emergency' && process.env.EMERGENCY_FORWARD_NUMBER) {
      const twiml = new VoiceResponse();
      say(twiml, 'I understand this may be urgent. Please hold while I connect you.');
      twiml.dial(process.env.EMERGENCY_FORWARD_NUMBER);
      const portalIntake = await safeCreatePortalIntake(req, {
        callSid,
        callerPhone,
        speech,
        digit,
        analysis,
        detailText: 'Emergency call was forwarded before detailed intake was collected.'
      });
      await safeSaveReceptionistLead(req, {
        callSid,
        callerPhone,
        transcript: speech || `DTMF:${digit}`,
        category: analysis.category,
        priority: analysis.priority,
        summary: analysis.summary,
        status: portalIntake?.ticket ? 'forwarded_emergency_ticket_created' : 'forwarded_emergency'
      });
      return res.type('text/xml').send(twiml.toString());
    }

    const lead = await safeSaveReceptionistLead(req, {
      callSid,
      callerPhone,
      transcript: speech || `DTMF:${digit}`,
      category: analysis.category,
      priority: analysis.priority,
      summary: analysis.summary,
      status: 'new'
    });

    const twiml = new VoiceResponse();
    const flowQuery = buildFlowQuery({
      leadId: lead.id || '',
      category: analysis.category,
      priority: analysis.priority,
      summary: analysis.summary
    });
    const gather = twiml.gather({
      input: 'speech',
      timeout: 8,
      speechTimeout: 'auto',
      action: buildCallbackUrl(req, `/voice/details?${flowQuery}`),
      method: 'POST'
    });

    say(gather,
      `I can help with that ${analysis.category.replace('_', ' ')} request. ` +
      'Please say your full name, email address, service address, best time for a call back, and a short description of what you need.'
    );

    twiml.redirect({ method: 'POST' }, buildCallbackUrl(req, `/voice/finish?${flowQuery}`));
    return res.type('text/xml').send(twiml.toString());
  } catch (err) {
    return next(err);
  }
});

router.post('/details', validateTwilioRequest, async (req, res, next) => {
  try {
    const detailText = req.body.SpeechResult || '';
    const analysis = getAnalysisFromQuery(req);
    const portalIntake = await safeCreatePortalIntake(req, {
      callSid: req.body.CallSid,
      callerPhone: normalizePhone(req.body.From),
      speech: analysis.summary,
      digit: '',
      analysis,
      detailText,
      leadId: req.query.leadId || ''
    });

    await safeSaveReceptionistLead(req, {
      callSid: req.body.CallSid,
      callerPhone: normalizePhone(req.body.From),
      transcript: detailText,
      category: 'caller_details',
      priority: 'normal',
      summary: portalIntake?.ticket
        ? `Portal ticket created: ${portalIntake.ticket?.ROWID || portalIntake.ticket?.id || ''}`
        : 'Caller details captured, but portal ticket creation failed.',
      status: portalIntake?.ticket ? 'ticket_created' : 'ticket_failed',
      parentLeadId: req.query.leadId || ''
    });

    const twiml = new VoiceResponse();
    const confirmation = portalIntake?.ticket
      ? 'Thank you. I created your TechTactics service request and sent it to the admin team for quote review and approval. Someone will follow up as soon as possible. Goodbye.'
      : 'Thank you. I captured your request, but the portal ticket could not be saved automatically. A team member will still follow up as soon as possible. Goodbye.';
    say(
      twiml,
      confirmation
    );
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
  } catch (err) {
    next(err);
  }
});

router.post('/finish', validateTwilioRequest, async (req, res, next) => {
  try {
    const analysis = getAnalysisFromQuery(req);
    await safeCreatePortalIntake(req, {
      callSid: req.body.CallSid,
      callerPhone: normalizePhone(req.body.From),
      speech: analysis.summary,
      digit: '',
      analysis,
      detailText: 'Caller did not provide additional details before the call timed out.',
      leadId: req.query.leadId || ''
    });

    const twiml = new VoiceResponse();
    say(twiml, 'Thank you for calling TechTactics. A team member will review your request and follow up. Goodbye.');
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
  } catch (err) {
    next(err);
  }
});

router.use((err, _req, res, _next) => {
  console.error(err);
  if (res.headersSent) {
    return;
  }
  sendVoiceFallback(res);
});

module.exports = router;
