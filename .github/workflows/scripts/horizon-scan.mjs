// Nightly horizon scan for SafeMarine.PRO
// Uses the Anthropic API (with web search) to check UK legislation / standards
// for updates, then writes the findings to Firestore at gss_state/horizon.
// The SafeMarine module reads that document and shows the results.

import admin from 'firebase-admin';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const SA = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!ANTHROPIC_API_KEY) { console.error('Missing ANTHROPIC_API_KEY secret'); process.exit(1); }
if (!SA) { console.error('Missing FIREBASE_SERVICE_ACCOUNT secret'); process.exit(1); }

// The items to horizon-scan. Keep names identical to the module's Horizon tab
// so findings line up. Add/remove freely.
const ITEMS = [
  'ISO 9001 Quality', 'ISO 14001 Environmental', 'ISO 45001 OH&S',
  'Workboat Code (MCA, small workboats & pilot boats)',
  'Diving at Work Regulations 1997', 'Merchant Shipping Act 1995', 'MARPOL',
  'Health and Safety at Work etc. Act 1974', 'Management of H&S at Work Regs 1999',
  'COSHH 2002 (and EH40 workplace exposure limits)', 'LOLER 1998', 'PUWER 1998',
  'Work at Height Regs 2005', 'Control of Noise at Work Regs 2005',
  'Control of Vibration at Work Regs 2005', 'Manual Handling Operations Regs 1992',
  'Confined Spaces Regs 1997', 'RIDDOR 2013', 'CDM 2015',
  'Electricity at Work Regs 1989', 'Control of Asbestos Regs 2012',
  'PPE at Work Regs (1992 & 2022 amendment)',
  'Environmental Protection Act 1990', 'Waste (Scotland) Regulations & Duty of Care',
  'Water Environment (Controlled Activities) (Scotland) Regs (CAR) 2011',
  'Fire (Scotland) Act 2005', 'Corporate Manslaughter & Corporate Homicide Act 2007',
  'Equality Act 2010', 'Modern Slavery Act 2015', 'Bribery Act 2010',
  'UK GDPR / Data Protection Act 2018', 'Working Time Regs 1998',
  'Terrorism (Protection of Premises) Act 2025 (Martyn\u2019s Law)'
];

const PROMPT = `You are a UK QHSE compliance horizon-scanning assistant for a marine civils, commercial diving and boatyard business (GSS Marine Services & Silvers Marine).
Today is ${new Date().toISOString().slice(0,10)}.
For EACH item below, use web search to check for any recent update, amendment, revision, new edition, consultation outcome or replacement (focus on the last ~12 months and anything imminent).
Return your answer as a single JSON object and NOTHING else, in this exact shape:
{"summary":"one sentence overview of what needs attention","items":[{"name":"<exact item name>","status":"Current|Monitor|Update available|Action required|Superseded","finding":"one concise sentence; include dates"}]}
Rules: use the EXACT item names given. status "Action required" only when the business must actively do something (e.g. transition a certificate, comply by a date). "Update available" when a change is published/imminent but not yet mandatory. "Monitor" when stable or only under consultation. Keep findings factual and dated.

Items:
${ITEMS.map((x,i)=>`${i+1}. ${x}`).join('\n')}`;

async function callClaude() {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }],
      messages: [{ role: 'user', content: PROMPT }]
    })
  });
  if (!res.ok) throw new Error('Anthropic API ' + res.status + ': ' + (await res.text()).slice(0, 500));
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in model response');
  return JSON.parse(match[0]);
}

async function main() {
  const parsed = await callClaude();
  const payload = {
    scannedAt: new Date().toISOString(),
    summary: parsed.summary || '',
    items: Array.isArray(parsed.items) ? parsed.items : []
  };

  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(SA)) });
  await admin.firestore().collection('gss_state').doc('horizon')
    .set({ payload: JSON.stringify(payload), scannedAt: payload.scannedAt });

  console.log('Horizon scan written:', payload.items.length, 'items @', payload.scannedAt);
  console.log('Summary:', payload.summary);
}

main().catch(e => { console.error(e); process.exit(1); });
