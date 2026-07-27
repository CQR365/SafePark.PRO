/**
 * SafeMarine.PRO — weekly safety alerts scan
 *
 * Companion to horizon-scan.mjs. Deliberately a SEPARATE feed, because the two
 * answer different questions:
 *
 *   horizon-scan  : is the law or standard I rely on still current?
 *   safety-alerts : this happened to someone else, does it apply to us?
 *
 * Writes to  gss_state/alerts  as { payload: <JSON string>, updated: <ms> },
 * mirroring exactly how horizon-scan writes gss_state/horizon, so the module
 * reads it the same way and the existing Firestore rules already cover it.
 *
 * Node 20+ (uses global fetch). Deps: firebase-admin (already installed by the workflow).
 *
 * Env:
 *   ANTHROPIC_API_KEY          required
 *   FIREBASE_SERVICE_ACCOUNT   required, JSON string
 *   ANTHROPIC_MODEL            optional, defaults below
 *   ALERTS_LOOKBACK_DAYS       optional, default 120 — how far back to keep items
 *   ALERTS_MAX_ITEMS           optional, default 250 — hard cap on stored items
 */

import admin from 'firebase-admin';
import crypto from 'node:crypto';

const MODEL       = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const LOOKBACK    = Number(process.env.ALERTS_LOOKBACK_DAYS || 120);
const MAX_ITEMS   = Number(process.env.ALERTS_MAX_ITEMS || 250);
const COLLECTION  = 'gss_state';
const DOC         = 'alerts';

/* ------------------------------------------------------------------ sources
   relevance: what this source is good for, passed to the model so it can judge
   applicability against a marine civils / workboat / inshore diving operator. */
const SOURCES = [
  { id: 'imca',  name: 'IMCA Safety Flash',
    urls: ['https://www.imca-int.com/resources/safety/safety-flashes/'],
    note: 'Offshore and marine contracting incidents. Each flash usually contains several separate incidents; treat each incident as its own item.' },
  { id: 'msf',   name: 'Marine Safety Forum',
    urls: ['https://www.marinesafetyforum.org/all-safety-alerts/',
           'https://www.marinesafetyforum.org/',
           'https://www.marinesafetyforum.org/safety-alerts/'],
    note: 'Offshore support vessel operations. Deck, lifting, mooring, small craft and vessel handling.' },
  { id: 'mca',   name: 'MCA Technical Safety Alert',
    urls: ['https://www.gov.uk/government/collections/maritime-and-coastguard-agency-mca-technical-safety-alerts'],
    note: 'UK flag state technical alerts. Directly applicable to UK coded vessels.' },
  { id: 'maib',  name: 'MAIB Safety Bulletin / Digest',
    urls: ['https://www.gov.uk/government/organisations/marine-accident-investigation-branch'],
    note: 'UK marine accident investigation. Highest quality causal analysis available and free.' },
  { id: 'hse',   name: 'HSE Safety Alerts & Notices',
    urls: ['https://www.hse.gov.uk/safetybulletins/recent-bulletins.htm'],
    note: 'HSE safety alerts and notices across all industries. Filter hard for relevance: most will not apply, but equipment and plant failures often do.' },
  { id: 'hsedv', name: 'HSE Diving Information Sheets',
    urls: ['https://www.hse.gov.uk/pubns/diveindx.htm'],
    note: 'Index of HSE diving information sheets with revision dates. Not incident alerts: report an item only where the revision looks new or recently changed, because a new revision means the guidance moved.' }
];

/* --------------------------------------------------------------- utilities */
const log = (...a) => console.log('[alerts]', ...a);

function stableId(source, title, date) {
  return source + '_' + crypto.createHash('sha1')
    .update((title || '').toLowerCase().replace(/\s+/g, ' ').trim() + '|' + (date || ''))
    .digest('hex').slice(0, 12);
}

/** Crude but dependency-free HTML to text. Good enough to feed a model. */
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#8217;|&rsquo;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/* Two header profiles. The polite one identifies us honestly and most sites are
   happy with it. Some sites sit behind a filter that rejects anything that does
   not look like a browser: Marine Safety Forum returned 415 Unsupported Media
   Type to the polite profile, which is a content-negotiation refusal rather than
   a missing page. So we fall back to a browser profile before giving up. */
const HEADERS_POLITE = {
  'User-Agent': 'SafeMarine.PRO compliance scan (Omnibosh Safety)',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9'
};
const HEADERS_BROWSER = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
  'Cache-Control': 'no-cache'
};

async function fetchOnce(url, headers) {
  const res = await fetch(url, { headers, redirect: 'follow' });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
  const body = await res.text();
  const text = htmlToText(body).slice(0, 60000);
  if (text.length < 400) throw new Error('page returned almost no text');
  return text;
}

/** Try each candidate URL, politely first then as a browser. Report every failure. */
async function fetchText(source) {
  const tried = [];
  for (const url of source.urls) {
    for (const [label, headers] of [['polite', HEADERS_POLITE], ['browser', HEADERS_BROWSER]]) {
      try {
        const text = await fetchOnce(url, headers);
        if (label === 'browser') log('  (needed browser headers for ' + url + ')');
        else if (url !== source.urls[0]) log('  (used fallback URL ' + url + ')');
        return text;
      } catch (e) {
        tried.push(url + ' [' + label + '] ' + e.message);
      }
    }
  }
  throw new Error('all ' + source.urls.length + ' URL(s) failed: ' + tried.join(' ; '));
}

/* ------------------------------------------------------------------- model */
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function extractItems(source, text, attempt = 0) {
  const prompt =
`You are reviewing a safety alert index page for a UK marine contractor.

The operator: GSS Marine Services and Silvers Marine. Workboats and multicats up to 24m
under the UK Workboat Code, inshore and offshore commercial diving with sub-contract
divers, marine civils, aids to navigation, offshore renewables support, a boatyard with
a 40 tonne hoist and spray shop, and occasional overseas barge work.

SOURCE: ${source.name}
CONTEXT: ${source.note}

From the page text below, extract every distinct safety alert or incident published in
roughly the last 6 months. Return STRICT JSON only, no prose, no markdown fence:

{"items":[{
  "title": "short factual title, max 90 chars",
  "date": "YYYY-MM-DD or empty string if not stated",
  "summary": "2 to 3 sentences: what happened, why, and the lesson. Plain English.",
  "url": "direct link if one is visible in the text, else empty string",
  "topics": ["lifting","diving","vessel-ops","deck","mooring","enclosed-space","electrical","fire","ppe","dropped-object","small-craft","environment","other"],
  "relevance": "high | medium | low",
  "why": "one sentence on why it is or is not relevant to THIS operator"
}]}

Rules:
- relevance high  = the operator does this exact activity with this equipment type
- relevance medium= adjacent activity, or a general lesson worth a toolbox talk
- relevance low   = deepwater, saturation diving, drilling or other work they do not do
- If the page text does not contain real alerts, return {"items":[]}
- Never invent an alert. Only extract what is actually present.
- Maximum 25 items.

PAGE TEXT:
${text}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 400);
    const err = new Error('Anthropic HTTP ' + res.status + ' ' + body);
    // Credit exhaustion, bad key and permission problems are account-level: every
    // subsequent call will fail the same way, so flag it and let the caller stop.
    if (res.status === 401 || res.status === 403 ||
        (res.status === 400 && /credit balance|billing/i.test(body))) err.fatal = true;
    throw err;
  }
  const data = await res.json();
  const txt = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
  const clean = txt.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = clean.indexOf('{'), end = clean.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('no JSON object in model reply');
  const parsed = JSON.parse(clean.slice(start, end + 1));
  return Array.isArray(parsed.items) ? parsed.items : [];
}

/* -------------------------------------------------------------------- main */
async function main() {
  if (!process.env.ANTHROPIC_API_KEY)        throw new Error('ANTHROPIC_API_KEY is not set');
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');

  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
  const db = admin.firestore();

  // Existing items, so an alert already triaged in the module is never re-added as new.
  let existing = [];
  try {
    const snap = await db.collection(COLLECTION).doc(DOC).get();
    if (snap.exists && snap.data().payload) existing = JSON.parse(snap.data().payload).items || [];
    log('loaded', existing.length, 'existing item(s)');
  } catch (e) { log('no existing payload:', e.message); }
  const known = new Set(existing.map(x => x.id));

  const fresh = [], errors = [];
  let fatal = null;
  for (const src of SOURCES) {
    try {
      log('fetching', src.name);
      const text = await fetchText(src);
      let items;
      for (let attempt = 0; ; attempt++) {
        try { items = await extractItems(src, text); break; }
        catch (err) {
          if (err.fatal) throw err;
          const transient = /HTTP (429|500|502|503|529)/.test(err.message);
          if (!transient || attempt >= 2) throw err;
          const wait = 5000 * (attempt + 1);
          log('  retrying in ' + (wait / 1000) + 's after: ' + err.message.slice(0, 80));
          await sleep(wait);
        }
      }
      log('  ->', items.length, 'item(s) extracted');
      for (const it of items) {
        if (!it.title) continue;
        const id = stableId(src.id, it.title, it.date);
        if (known.has(id)) continue;
        known.add(id);
        fresh.push({
          id,
          source: src.name,
          sourceId: src.id,
          sourceUrl: src.urls[0],
          title: String(it.title).slice(0, 140),
          date: it.date || '',
          summary: String(it.summary || '').slice(0, 700),
          url: it.url || src.urls[0],
          topics: Array.isArray(it.topics) ? it.topics.slice(0, 5) : [],
          relevance: ['high', 'medium', 'low'].includes(it.relevance) ? it.relevance : 'medium',
          why: String(it.why || '').slice(0, 300),
          firstSeen: new Date().toISOString().slice(0, 10)
        });
      }
    } catch (e) {
      if (e.fatal) {
        fatal = 'Anthropic API unavailable at account level — ' +
                (/credit balance|billing/i.test(e.message)
                  ? 'credit balance too low. Top up at Console > Plans & Billing.'
                  : 'check ANTHROPIC_API_KEY.');
        log('  !! FATAL: ' + fatal);
        log('  skipping remaining sources, no point retrying them');
        break;
      }
      log('  !! ' + src.name + ': ' + e.message);
      errors.push(src.name + ': ' + e.message.slice(0, 200));
    }
  }

  // Merge, drop anything older than the lookback, newest first, then cap.
  const cutoff = new Date(Date.now() - LOOKBACK * 86400000).toISOString().slice(0, 10);
  const merged = existing.concat(fresh)
    .filter(x => !x.date || x.date >= cutoff || (x.firstSeen && x.firstSeen >= cutoff))
    .sort((a, b) => (b.date || b.firstSeen || '').localeCompare(a.date || a.firstSeen || ''))
    .slice(0, MAX_ITEMS);

  const payload = {
    scannedAt: new Date().toISOString(),
    newThisRun: fresh.length,
    sources: SOURCES.map(s => ({ id: s.id, name: s.name, url: s.urls[0] })),
    errors: fatal ? [fatal].concat(errors) : errors,
    fatal,
    summary: fatal ? fatal : fresh.length
      ? fresh.length + ' new alert(s) this week' + (errors.length ? ', ' + errors.length + ' source(s) failed' : '')
      : 'No new alerts this week' + (errors.length ? ', ' + errors.length + ' source(s) failed' : ''),
    items: merged
  };

  await db.collection(COLLECTION).doc(DOC).set(
    { payload: JSON.stringify(payload), updated: Date.now() }, { merge: true }
  );

  log('wrote', merged.length, 'item(s),', fresh.length, 'new.');
  if (fatal)        log('RESULT: FAILED — ' + fatal);
  else if (errors.length) log('RESULT: PARTIAL — ' + errors.length + ' of ' + SOURCES.length + ' source(s) failed: ' + errors.join(' | '));
  else              log('RESULT: OK — all ' + SOURCES.length + ' sources scanned');

  // Go red in Actions if nothing could be processed. A silent green on a dead
  // scan is worse than a failure, because an empty feed looks like a quiet week.
  if (fatal || errors.length === SOURCES.length) process.exit(1);
}

main().catch(e => { console.error('[alerts] FATAL', e); process.exit(1); });
