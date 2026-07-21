// Nightly horizon scan for SafeMarine.PRO  (rebuilt)
// ---------------------------------------------------------------------------
// Uses the Anthropic API (Claude) with the web_search tool to check UK
// legislation, standards, marine notices and assurance schemes for updates,
// then writes the findings to Firestore at gss_state/horizon. The SafeMarine
// module reads that document and overlays each finding onto its watchlist BY
// EXACT NAME, so the canonical names below MUST match the module HORIZON keys.
//
// What changed vs the previous version:
//   1. ONE canonical WATCHLIST is the single source of truth. Names match the
//      module exactly, so findings actually reach the screen (the old list had
//      ~14 name mismatches whose findings were silently dropped).
//   2. Gap items added (MCA marine notices, marine H&S / MED / load line /
//      carriage of DG / ISM / categorisation of waters, IMCA & eCMID, DMAC,
//      DSEAR, PSSR, First-Aid, Gas/LPG, Special Waste Scotland, marine
//      licensing, Cyber Essentials, DEFCON 658, the assurance schemes, etc.).
//   3. Scanning is CHUNKED BY GROUP so each item gets real research budget
//      instead of ~1 search per 3 items across the whole run.
//   4. A DISCOVERY pass asks the model to surface NEW instruments / notices
//      that are not yet on the list (catches unknown-unknowns).
//   5. Each finding carries a sourceUrl and the run is resilient: one failing
//      group no longer aborts the whole scan.
//   6. The payload also writes the full `watchlist`, so the module can later
//      render straight from it and the two lists can never drift again.
// ---------------------------------------------------------------------------

import admin from 'firebase-admin';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL             = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const SA                = process.env.FIREBASE_SERVICE_ACCOUNT;
const SEARCHES_PER_GROUP = Number(process.env.HZ_SEARCHES_PER_GROUP || 18);

if (!ANTHROPIC_API_KEY) { console.error('Missing ANTHROPIC_API_KEY secret'); process.exit(1); }
if (!SA)                { console.error('Missing FIREBASE_SERVICE_ACCOUNT secret'); process.exit(1); }

// ---------------------------------------------------------------------------
// CANONICAL WATCHLIST  —  names here MUST equal the module HORIZON keys.
// url is the baseline link; the nightly scan may return a better sourceUrl.
// ---------------------------------------------------------------------------
const WATCHLIST = [
  { group: 'ISO & assurance schemes', items: [
    { name: 'ISO 9001 Quality',                 url: 'https://www.iso.org/iso-9001-quality-management.html' },
    { name: 'ISO 14001 Environmental',          url: 'https://www.iso.org/iso-14001-environmental-management.html' },
    { name: 'ISO 45001 OH&S',                   url: 'https://www.iso.org/iso-45001-occupational-health-and-safety.html' },
    { name: 'ISO/IEC 17021 (certification bodies)', url: 'https://www.iso.org/standard/61651.html' },
    { name: 'SSIP core criteria',               url: 'https://ssip.org.uk/' },
    { name: 'SafeContractor (Alcumus)',         url: 'https://www.safecontractor.com/' },
    { name: 'Constructionline',                 url: 'https://www.constructionline.co.uk/' },
    { name: 'JOSCAR (Hellios)',                 url: 'https://www.hellios.com/joscar/' },
    { name: 'Cyber Essentials (IASME)',         url: 'https://www.ncsc.gov.uk/cyberessentials/overview' },
    { name: 'DEFCON 658 / Def Stan 05-138 (MOD cyber)', url: 'https://www.gov.uk/government/publications/knowledge-in-defence-cyber' }
  ]},
  { group: 'Marine', items: [
    { name: 'Workboat Code',                    url: 'https://www.gov.uk/government/publications/the-workboat-code-edition-3' },
    { name: 'MCA Marine Notices (MGN/MIN/MSN)', url: 'https://www.gov.uk/topic/ships-cargoes/m-notices' },
    { name: 'Merchant Shipping Act 1995',       url: 'https://www.legislation.gov.uk/ukpga/1995/21' },
    { name: 'Merchant Shipping (Health & Safety at Work) Regs 1997', url: 'https://www.legislation.gov.uk/uksi/1997/2962' },
    { name: 'Merchant Shipping (Marine Equipment) Regs 2016', url: 'https://www.gov.uk/government/publications/marine-equipment-regulations' },
    { name: 'Merchant Shipping (Load Line) Regs 1998', url: 'https://www.legislation.gov.uk/uksi/1998/2241' },
    { name: 'Merchant Shipping (Accident Reporting & Investigation) Regs 2026', url: 'https://www.legislation.gov.uk/uksi/2026/430/contents/made' },
    { name: 'Merchant Shipping (Carriage of Dangerous Goods) Regs', url: 'https://www.gov.uk/government/collections/carriage-of-dangerous-goods' },
    { name: 'ISM Code',                         url: 'https://www.gov.uk/government/publications/international-safety-management-ism-code' },
    { name: 'Categorisation of Waters (MSN 1837)', url: 'https://www.gov.uk/government/publications/msn-1837-amendment-2-categorisation-of-waters' },
    { name: 'COSWP',                            url: 'https://www.gov.uk/government/publications/code-of-safe-working-practices-for-merchant-seafarers' },
    { name: 'MARPOL',                           url: 'https://www.imo.org/en/about/Conventions/Pages/International-Convention-for-the-Prevention-of-Pollution-from-Ships-(MARPOL).aspx' },
    { name: 'Marine (Scotland) Act 2010 & marine licensing', url: 'https://www.legislation.gov.uk/asp/2010/5' }
  ]},
  { group: 'Diving', items: [
    { name: 'Diving at Work Regs 1997',         url: 'https://www.hse.gov.uk/diving/acop.htm' },
    { name: 'IMCA guidance & eCMID/CMID',       url: 'https://www.imca-int.com/' },
    { name: 'DMAC diving medical guidance',     url: 'https://www.dmac-diving.org/' }
  ]},
  { group: 'Health & safety law', items: [
    { name: 'HSWA 1974',                        url: 'https://www.legislation.gov.uk/ukpga/1974/37' },
    { name: 'Management Regs 1999',             url: 'https://www.legislation.gov.uk/uksi/1999/3242' },
    { name: 'COSHH 2002',                       url: 'https://www.hse.gov.uk/coshh/basics/exposurelimits.htm' },
    { name: 'DSEAR 2002',                       url: 'https://www.hse.gov.uk/fireandexplosion/dsear.htm' },
    { name: 'Pressure Systems Safety Regs 2000 (PSSR)', url: 'https://www.legislation.gov.uk/uksi/2000/128' },
    { name: 'LOLER 1998',                       url: 'https://www.hse.gov.uk/work-equipment-machinery/loler.htm' },
    { name: 'PUWER 1998',                       url: 'https://www.legislation.gov.uk/uksi/1998/2306' },
    { name: 'Work at Height Regs 2005',         url: 'https://www.legislation.gov.uk/uksi/2005/735' },
    { name: 'Confined Spaces Regs 1997',        url: 'https://www.legislation.gov.uk/uksi/1997/1713' },
    { name: 'Noise Regs 2005',                  url: 'https://www.legislation.gov.uk/uksi/2005/1643' },
    { name: 'Vibration Regs 2005',              url: 'https://www.legislation.gov.uk/uksi/2005/1093' },
    { name: 'Manual Handling Regs 1992',        url: 'https://www.legislation.gov.uk/uksi/1992/2793' },
    { name: 'RIDDOR 2013',                      url: 'https://www.legislation.gov.uk/uksi/2013/1471' },
    { name: 'CDM 2015',                         url: 'https://www.hse.gov.uk/construction/cdm/2015/' },
    { name: 'Electricity at Work Regs 1989',    url: 'https://www.legislation.gov.uk/uksi/1989/635' },
    { name: 'Control of Asbestos Regs 2012',    url: 'https://www.hse.gov.uk/asbestos/' },
    { name: 'PPE at Work Regs',                 url: 'https://www.legislation.gov.uk/uksi/2022/8' },
    { name: 'First-Aid Regs 1981',             url: 'https://www.legislation.gov.uk/uksi/1981/917' },
    { name: 'Gas Safety (Installation & Use) Regs & LPG', url: 'https://www.legislation.gov.uk/uksi/1998/2451' }
  ]},
  { group: 'Environmental, fire & governance', items: [
    { name: 'Environmental Protection Act 1990', url: 'https://www.legislation.gov.uk/ukpga/1990/43' },
    { name: 'Waste (Scotland) & Duty of Care',  url: 'https://www.sepa.org.uk/' },
    { name: 'Special Waste (Scotland) Regs 1996', url: 'https://www.legislation.gov.uk/uksi/1996/972' },
    { name: 'CAR (Scotland) 2011',              url: 'https://www.legislation.gov.uk/ssi/2011/209' },
    { name: 'Fire (Scotland) Act 2005',         url: 'https://www.legislation.gov.uk/asp/2005/5' },
    { name: 'Fire Safety (Scotland) Regs 2006', url: 'https://www.legislation.gov.uk/ssi/2006/456' },
    { name: 'Corporate Manslaughter Act 2007',  url: 'https://www.legislation.gov.uk/ukpga/2007/19' },
    { name: 'Equality Act 2010',                url: 'https://www.legislation.gov.uk/ukpga/2010/15' },
    { name: 'Modern Slavery Act 2015',          url: 'https://www.legislation.gov.uk/ukpga/2015/30' },
    { name: 'Bribery Act 2010',                 url: 'https://www.legislation.gov.uk/ukpga/2010/23' },
    { name: 'Data Protection Act 2018 / UK GDPR', url: 'https://www.legislation.gov.uk/ukpga/2018/12' },
    { name: 'Working Time Regs 1998',           url: 'https://www.legislation.gov.uk/uksi/1998/1833' },
    { name: "Martyn\u2019s Law (Terrorism (Protection of Premises) Act 2025)", url: 'https://www.legislation.gov.uk/ukpga/2025/8' }
  ]}
];

const ALL_ITEMS   = WATCHLIST.flatMap(g => g.items.map(it => ({ ...it, group: g.group })));
const norm        = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const NAME_BY_NORM = new Map(ALL_ITEMS.map(it => [norm(it.name), it]));

const TODAY = new Date().toISOString().slice(0, 10);
const BUSINESS = 'a UK marine civils, commercial diving and boatyard business (GSS Marine Services & Silvers Marine)';

const SYSTEM = `You are a UK QHSE compliance horizon-scanning assistant researching legislation, standards, marine notices and assurance schemes for ${BUSINESS}. You have a web search tool; use it. When finished, your FINAL message must contain ONLY a single JSON object and nothing else: no explanation, no preamble, no markdown, no code fences. Do the research with the tool, then output the JSON.`;

// ---------------------------------------------------------------------------
// Extract the last complete balanced {...} object that contains a given key,
// tolerating prose, code fences or tool chatter around it.
// ---------------------------------------------------------------------------
function extractJsonObject(text, requiredKey) {
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
            if (!requiredKey || cand.includes(requiredKey)) best = cand;
            break;
          }
        }
      }
    }
  }
  return best;
}

// Run a tool-use conversation until the model stops calling tools, then parse.
async function callClaude(prompt, requiredKey, maxUses) {
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: maxUses }];
  const messages = [{ role: 'user', content: prompt }];
  let finalText = '';
  for (let turn = 0; turn < 10; turn++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 4000, system: SYSTEM, tools, messages })
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
  const json = extractJsonObject(finalText, requiredKey);
  if (!json) throw new Error('No JSON object found. First 500 chars:\n' + finalText.slice(0, 500));
  return JSON.parse(json);
}

// Scan one group of the watchlist.
async function scanGroup(group) {
  const names = group.items.map(it => it.name);
  const prompt = `Today is ${TODAY}.
For EACH item below, use web search to check for any update, amendment, revision, new edition, consultation outcome or replacement in the last ~12 months, plus anything imminent, relevant to ${BUSINESS}.

Output ONLY this JSON (exact shape):
{"items":[{"name":"<exact item name>","status":"Current|Monitor|Update available|Action required|Superseded","finding":"one concise sentence with dates","url":"most relevant source URL"}]}

Rules: use the EXACT item names given. One line per value. Escape any double-quotes inside text. "Action required" = the business must actively do something by a date; "Update available" = a change is published or imminent but not yet mandatory; "Monitor" = stable or only under consultation.

Items:
${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}`;
  const parsed = await callClaude(prompt, '"items"', SEARCHES_PER_GROUP);
  return Array.isArray(parsed.items) ? parsed.items : [];
}

// Discovery pass: find NEW instruments / notices not already on the list.
async function discover() {
  const known = ALL_ITEMS.map(it => it.name).join('; ');
  const prompt = `Today is ${TODAY}.
Search UK sources (legislation.gov.uk, HSE, the MCA marine notices index for MGN/MIN/MSN, SEPA, gov.uk) for NEW or newly changed instruments, Approved Codes of Practice, Marine Notices, standards or consultations in the last ~4 months that affect ${BUSINESS} and are NOT already covered by this list:
${known}

Output ONLY this JSON (exact shape):
{"discoveries":[{"title":"short name","status":"Action required|Update available|Monitor","finding":"one concise sentence with dates","url":"source URL"}]}

If nothing genuinely new is found, return {"discoveries":[]}.`;
  const parsed = await callClaude(prompt, '"discoveries"', SEARCHES_PER_GROUP);
  return Array.isArray(parsed.discoveries) ? parsed.discoveries : [];
}

async function main() {
  const items = [];
  const errors = [];

  for (const group of WATCHLIST) {
    try {
      const found = await scanGroup(group);
      for (const x of found) {
        const canon = NAME_BY_NORM.get(norm(x.name));   // map back to a canonical name
        const base = canon || { name: x.name, group: group.group, url: x.url || '' };
        items.push({
          name: base.name,
          group: base.group || group.group,
          url: base.url || x.url || '',
          sourceUrl: x.url || '',
          status: x.status || 'Monitor',
          finding: x.finding || ''
        });
      }
      console.log('Scanned group:', group.group, '(' + found.length + ' findings)');
    } catch (e) {
      errors.push(group.group + ': ' + e.message);
      console.error('Group failed:', group.group, '-', e.message);
    }
  }

  let discoveries = [];
  try {
    discoveries = await discover();
    console.log('Discovery pass:', discoveries.length, 'new item(s)');
  } catch (e) {
    errors.push('discovery: ' + e.message);
    console.error('Discovery failed:', e.message);
  }

  const nAction = items.filter(i => i.status === 'Action required').length;
  const nUpdate = items.filter(i => i.status === 'Update available').length;
  const summary =
    `${nAction} item(s) need action, ${nUpdate} have updates available` +
    (discoveries.length ? `, ${discoveries.length} new item(s) discovered` : '') +
    (errors.length ? ` (${errors.length} scan warning(s))` : '') + '.';

  const payload = {
    scannedAt: new Date().toISOString(),
    summary,
    items,
    discoveries,
    watchlist: WATCHLIST,   // full canonical list, so the module can render straight from it
    errors
  };

  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(SA)) });
  await admin.firestore().collection('gss_state').doc('horizon')
    .set({ payload: JSON.stringify(payload), scannedAt: payload.scannedAt });

  console.log('Horizon scan written:', items.length, 'findings,', discoveries.length, 'discoveries @', payload.scannedAt);
  console.log('Summary:', summary);
  if (errors.length) console.log('Warnings:', errors.join(' | '));
}

main().catch(e => { console.error(e); process.exit(1); });
