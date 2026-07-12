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
  'Control of Vibration at Work Regs 2005', 'Manual Handling Operations Regs
