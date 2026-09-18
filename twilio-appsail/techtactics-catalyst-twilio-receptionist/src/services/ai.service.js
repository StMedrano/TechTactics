const OpenAI = require('openai');

function fromDigit(digit) {
  switch (digit) {
    case '1': return { category: 'emergency', priority: 'emergency', summary: 'Caller selected emergency service.' };
    case '2': return { category: 'new_install', priority: 'normal', summary: 'Caller selected new installation.' };
    case '3': return { category: 'repair', priority: 'normal', summary: 'Caller selected repair.' };
    case '4': return { category: 'billing', priority: 'normal', summary: 'Caller selected billing help.' };
    default: return null;
  }
}

function fallbackClassify(text) {
  const lower = (text || '').toLowerCase();
  if (/(emergency|alarm going off|break.?in|fire|no security|urgent|immediate)/.test(lower)) {
    return { category: 'emergency', priority: 'emergency', summary: text || 'Possible emergency request.' };
  }
  if (/(install|installation|new|quote|estimate|camera|thermostat|switch|audio|wifi|network)/.test(lower)) {
    return { category: 'new_install', priority: 'normal', summary: text || 'New installation or estimate request.' };
  }
  if (/(repair|broken|not working|offline|down|fix|trouble|issue|problem)/.test(lower)) {
    return { category: 'repair', priority: 'normal', summary: text || 'Repair request.' };
  }
  if (/(bill|invoice|payment|paid|charge|refund)/.test(lower)) {
    return { category: 'billing', priority: 'normal', summary: text || 'Billing request.' };
  }
  if (/(remove|cancel|disconnect|take out|take down)/.test(lower)) {
    return { category: 'service_removal', priority: 'normal', summary: text || 'Service removal request.' };
  }
  return { category: 'general', priority: 'normal', summary: text || 'General caller request.' };
}

function cleanJson(raw) {
  return (raw || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function normalizeClassification(parsed, originalText) {
  const allowedCategories = new Set(['emergency', 'new_install', 'repair', 'service_removal', 'billing', 'general']);
  const allowedPriorities = new Set(['emergency', 'high', 'normal', 'low']);

  return {
    category: allowedCategories.has(parsed.category) ? parsed.category : 'general',
    priority: allowedPriorities.has(parsed.priority) ? parsed.priority : 'normal',
    summary: parsed.summary || originalText || 'Caller request.'
  };
}

async function analyzeWithOpenAI(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  const response = await client.responses.create({
    model,
    instructions: [
      'You classify phone calls for TechTactics, a smart home installation and IT support business.',
      'Return only valid JSON. Do not include markdown.',
      'Allowed categories: emergency, new_install, repair, service_removal, billing, general.',
      'Allowed priority values: emergency, high, normal, low.',
      'Keep summary under 160 characters.'
    ].join('\n'),
    input: `Classify this caller request: ${JSON.stringify(text || '')}`,
    temperature: 0.2
  });

  const raw = cleanJson(response.output_text);
  const parsed = JSON.parse(raw);
  return normalizeClassification(parsed, text);
}

async function analyzeCallReason({ speech, digit }) {
  const digitResult = fromDigit(digit);
  if (digitResult) return digitResult;

  try {
    const ai = await analyzeWithOpenAI(speech);
    if (ai) return ai;
  } catch (err) {
    console.warn('OpenAI classification failed; falling back to rules.', err.message);
  }

  return fallbackClassify(speech);
}

module.exports = { analyzeCallReason, fallbackClassify };
