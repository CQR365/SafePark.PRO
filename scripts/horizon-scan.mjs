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

const SYSTEM = `You are a UK QHSE compliance horizon-scanning assistant. You research UK legislation and standards for a marine civils, commercial diving and boatyard business (GSS Marine Services & Silvers Marine). You have a web search tool; use it as needed. When you have finished researching, your FINAL message must contain ONLY a single JSON object and nothing else — no explanation, no preamble, no markdown, no code fences. Do not describe your plan; just do the research using the tool, then output the JSON.`;

const PROMPT = `Today is ${new Date().toISOString().slice(0,10)}.
For EACH item below, check for any recent update, amendment, revision, new edition, consultation outcome or replacement (last ~12 months and anything imminent). Use web search as needed.

When done, output ONLY this JSON object (exact shape):
{"summary":"one sentence overview of what needs attention","items":[{"name":"<exact item name>","status":"Current|Monitor|Update available|Action required|Superseded","finding":"one concise sentence with dates"}]}

Rules: use the EXACT item names. Keep every value on one line. Escape any double-quotes inside text. "Action required" = the business must actively do something (e.g. transition a certificate, comply by a date). "Update available" = a change is published/imminent but not yet mandatory. "Monitor" = stable or only under consultation.

Items:
${ITEMS.map((x,i)=>`${i+1}. ${x}`).join('\n')}`;

// Find and return the LAST complete balanced {...} object in a string,
// tolerating prose, code fences or tool chatter anywhere around it.
function extractJsonObject(text) {
  let best = null;
  for (let s = 0; s < text.length; s++) {
    if (text[s] !== '{') continue;
    let depth = 0, inStr = false, esc = false;
    for (let i = s; i < text.length; i++) {
      const c = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
      } else {
        if (c === '"') inStr = true;
        else if (c === '{') depth++;
        else if (c === '}') {
          depth--;
          if (depth === 0) {
            const cand = text.slice(s, i + 1);
            if (cand.includes('"items"')) best = cand; // prefer the findings object
            break;
          }
        }
      }
    }
  }
  return best;
}

// Run a short tool-use conversation: keep replying to tool_use until the model
// stops using tools, then return its final text.
async function callClaude() {
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 12 }];
  const messages = [{ role: 'user', content: PROMPT }];
  let finalText = '';
  for (let turn = 0; turn < 8; turn++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 6000, system: SYSTEM, tools, messages })
    });
    if (!res.ok) throw new Error('Anthropic API ' + res.status + ': ' + (await res.text()).slice(0, 800));
    const data = await res.json();
    finalText = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    if (data.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: data.content });
      messages.push({ role: 'user', content: 'Continue. When finished, reply with ONLY the JSON object.' });
      continue;
    }
    break;
  }
  const json = extractJsonObject(finalText);
  if (!json) throw new Error('No JSON object found in model response. First 600 chars:\n' + finalText.slice(0, 600));
  try { return JSON.parse(json); }
  catch (e) { console.error('JSON parse failed; candidate:\n' + json.slice(0, 1500)); throw e; }
}

async function main() {
  const parsed = await callClaude();
  const payload = {
    scannedAt: new Date().toISOString(),
    summary: (parsed && parsed.summary) || '',
    items: (parsed && Array.isArray(parsed.items)) ? parsed.items : []
  };
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(SA)) });
  await admin.firestore().collection('gss_state').doc('horizon')
    .set({ payload: JSON.stringify(payload), scannedAt: payload.scannedAt });
  console.log('Horizon scan written:', payload.items.length, 'items @', payload.scannedAt);
  console.log('Summary:', payload.summary);
}

main().catch(e => { console.error(e); process.exit(1); });
