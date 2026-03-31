const admin = require('firebase-admin');
const { Resend } = require('resend');

const PARKS = {
    'Ben Nevis Holiday Park': { email: 'bennevis@highlandholidays.com', slug: 'ben-nevis', short: 'Ben Nevis' },
    'Oban Holiday Park': { email: 'oban@highlandholidays.com', slug: 'oban', short: 'Oban' },
    'Tyndrum Holiday Park': { email: 'tyndrum@highlandholidays.com', slug: 'tyndrum', short: 'Tyndrum' }
};
const OMNIBOSH = 'safesystems.pro@omnibosh.com';
const FROM_EMAIL = 'safesystems.pro@omnibosh.com';
const FROM_NAME = 'SafeNotify.PRO';
const DIRECTORS_EMAIL = '';
const INCLUDE_DIRECTORS = process.env.INCLUDE_DIRECTORS === 'true';

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const resend = new Resend(process.env.RESEND_API_KEY);

function parseDate(v) {
    if (!v) return null;
    if (v.toDate) return v.toDate();
    if (v._seconds) return new Date(v._seconds * 1000);
    if (typeof v === 'string') {
        if (/^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v + 'T00:00:00');
        if (/^\d{2}\/\d{2}\/\d{4}/.test(v)) { const p = v.split('/'); return new Date(p[2]+'-'+p[1]+'-'+p[0]+'T00:00:00'); }
    }
    return null;
}
function daysUntil(ds) { const d = parseDate(ds); if (!d||isNaN(d)) return null; const n = new Date(); n.setHours(0,0,0,0); return Math.floor((d-n)/86400000); }
function fmtDate(v) { const d = parseDate(v); if (!d||isNaN(d)) return '-'; return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }

async function scanAll() {
    const items = [];
    console.log('Scanning Firebase...');

    const gas = await db.collection('gasAppliances').get();
    console.log('  gasAppliances: '+gas.size);
    gas.forEach(doc => {
        const d = doc.data();
        if (d.status==='active' && d.nextInspectionDue) {
            const days = daysUntil(d.nextInspectionDue);
            if (days!==null && days<=30) items.push({type:'Gas Inspection',park:d.park||'Unknown',item:(d.type||'Gas')+' - '+(d.makeModel||'Unknown'),location:d.accommodationUnit||'',dueDate:d.nextInspectionDue,days});
        }
    });

    const veh = await db.collection('vehicles').get();
    console.log('  vehicles: '+veh.size);
    veh.forEach(doc => {
        const d = doc.data(); if (d.status!=='active') return;
        const vn = (d.make||'')+' '+(d.model||'')+' ('+(d.registration||'')+')';
        const pk = d.parkName||d.location||'Unknown';
        [{f:'mot_expiry',l:'MOT Expiry',r:d.mot_required},{f:'insurance_expiry',l:'Insurance Expiry',r:d.insurance_required},{f:'tax_expiry',l:'Tax Expiry',r:d.tax_required},{f:'service_due',l:'Service Due',r:true}].forEach(c => {
            if (d[c.f] && c.r!==false) { const days=daysUntil(d[c.f]); if (days!==null&&days<=30) items.push({type:c.l,park:pk,item:vn+' - '+c.l,location:pk,dueDate:d[c.f],days}); }
        });
    });

    const act = await db.collection('actions').get();
    console.log('  actions: '+act.size);
    act.forEach(doc => {
        const d = doc.data(); if (d.status!=='open'||!d.targetDate) return;
        const days = daysUntil(d.targetDate); if (days===null||days>30) return;
        let pk = 'Unknown';
        Object.keys(PARKS).forEach(pn => { if ((d.location||'').includes(PARKS[pn].slug)) pk=pn; });
        if ((d.location||'').includes('overburns')) pk='Tyndrum Holiday Park';
        items.push({type:'Open Action',park:pk,item:(d.reference||'Action')+' - '+(d.description||'').substring(0,80),location:d.assignedTo?'Assigned: '+d.assignedTo:'',dueDate:d.targetDate,days});
    });

    try {
        const fire = await db.collection('fireExtinguishers').get();
        console.log('  fireExtinguishers: '+fire.size);
        fire.forEach(doc => {
            const d = doc.data(); const due = d.nextServiceDue||d.serviceDue||d.expiryDate;
            if (due) { const days=daysUntil(due); if (days!==null&&days<=30) items.push({type:'Fire Ext. Service',park:d.park||d.parkName||'Unknown',item:(d.type||'Extinguisher')+' - '+(d.location||''),location:'',dueDate:due,days}); }
        });
    } catch(e) { console.log('  fireExtinguishers: skipped'); }

    console.log('Total due within 30 days: '+items.length);
    return items;
}

function buildHtml(parkName, items) {
    const now = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
    const oc = items.filter(i=>i.days<0).length;
    let h = '<div style="font-family:Helvetica Neue,Arial,sans-serif;max-width:700px;margin:0 auto;background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">';
    h += '<div style="background:#1a1a2e;padding:24px 28px;color:#fff"><div style="font-size:20px;font-weight:700">Safe<span style="color:#cc5500">Notify</span>.PRO</div><div style="font-size:13px;color:#aaa;margin-top:4px">Compliance Notification \u2014 Omnibosh Safety Solutions</div></div>';
    h += '<div style="padding:24px 28px"><div style="font-size:16px;font-weight:700;color:#1a1a2e;margin-bottom:4px">'+parkName+'</div>';
    h += '<div style="font-size:13px;color:#888;margin-bottom:20px">'+now+' \u2014 '+items.length+' items'+(oc>0?' \u2014 <span style="color:#e53935;font-weight:700">'+oc+' OVERDUE</span>':'')+'</div>';

    if (items.length===0) {
        h += '<div style="background:#ecfdf3;border:1px solid #22c55e;border-radius:8px;padding:16px;text-align:center;color:#166534;font-weight:600">No compliance items due within the next 30 days.</div>';
    } else {
        h += '<table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#f8f9fa"><th style="text-align:left;padding:8px 10px;color:#666;font-size:11px;text-transform:uppercase;border-bottom:2px solid #e0e0e0">Type</th><th style="text-align:left;padding:8px 10px;color:#666;font-size:11px;text-transform:uppercase;border-bottom:2px solid #e0e0e0">Item</th><th style="text-align:left;padding:8px 10px;color:#666;font-size:11px;text-transform:uppercase;border-bottom:2px solid #e0e0e0">Due</th><th style="text-align:left;padding:8px 10px;color:#666;font-size:11px;text-transform:uppercase;border-bottom:2px solid #e0e0e0">Status</th></tr>';
        items.sort((a,b)=>a.days-b.days).forEach(i => {
            const bg = i.days<0?'#fef2f2':i.days<=7?'#fefce8':'#fff';
            const sc = i.days<0?'#e53935':i.days<=7?'#f59e0b':i.days<=14?'#cc5500':'#3b82f6';
            const st = i.days<0?Math.abs(i.days)+'d overdue':i.days===0?'Today':i.days+'d';
            h += '<tr style="background:'+bg+'"><td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;font-weight:600">'+i.type+'</td><td style="padding:8px 10px;border-bottom:1px solid #f0f0f0">'+i.item+(i.location?'<br><span style="color:#888;font-size:11px">'+i.location+'</span>':'')+'</td><td style="padding:8px 10px;border-bottom:1px solid #f0f0f0">'+fmtDate(i.dueDate)+'</td><td style="padding:8px 10px;border-bottom:1px solid #f0f0f0"><span style="background:'+sc+';color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">'+st+'</span></td></tr>';
        });
        h += '</table>';
        h += '<div style="margin-top:20px;padding:16px;background:#fff8f3;border:1px solid #cc5500;border-radius:8px"><div style="font-weight:700;color:#cc5500;margin-bottom:6px">Action Required</div><div style="font-size:13px;color:#666;line-height:1.6">All overdue items must be addressed immediately. Items due within 7 days should be scheduled now. Please update SafeSystems.PRO once actions are completed.</div></div>';
    }
    h += '</div><div style="background:#f8f9fa;padding:16px 28px;font-size:11px;color:#888;border-top:1px solid #e0e0e0">SafeNotify.PRO \u2014 Automated Compliance Notification \u2014 '+now+'<br>Omnibosh Safety Solutions Ltd</div></div>';
    return h;
}

function buildText(parkName, items) {
    const now = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
    let t = 'SAFESYSTEMS.PRO - COMPLIANCE NOTIFICATION\nOmnibosh Safety Solutions Ltd\n\nPark: '+parkName+'\nDate: '+now+'\nItems: '+items.length+'\n\n';
    if (items.length===0) { t += 'No items due within 30 days.\n'; }
    else {
        [{l:'OVERDUE',f:i=>i.days<0},{l:'DUE WITHIN 7 DAYS',f:i=>i.days>=0&&i.days<=7},{l:'DUE WITHIN 14 DAYS',f:i=>i.days>7&&i.days<=14},{l:'DUE WITHIN 30 DAYS',f:i=>i.days>14}].forEach(b => {
            const bi = items.filter(b.f); if (bi.length===0) return;
            t += '\n'+b.l+' ('+bi.length+')\n';
            bi.forEach(i => { t += '  > '+i.type+': '+i.item+'\n    Due: '+fmtDate(i.dueDate)+' ('+(i.days<0?Math.abs(i.days)+' days overdue':i.days+' days')+')\n'; });
        });
        t += '\nACTION REQUIRED\nAll overdue items must be addressed immediately.\n';
    }
    t += '\nSafeNotify.PRO - '+now+' - Omnibosh Safety Solutions Ltd\n';
    return t;
}

async function sendDigest(parkName, items) {
    const cfg = PARKS[parkName]; const oc = items.filter(i=>i.days<0).length;
    const subject = 'SafeSystems.PRO - '+cfg.short+' Compliance Notification - '+oc+' overdue, '+items.length+' total';
    const to = [cfg.email]; const cc = [OMNIBOSH];
    if (INCLUDE_DIRECTORS && DIRECTORS_EMAIL) cc.push(DIRECTORS_EMAIL);
    try {
        const result = await resend.emails.send({from:FROM_NAME+' <'+FROM_EMAIL+'>',to,cc,subject,html:buildHtml(parkName,items),text:buildText(parkName,items)});
        console.log('  OK '+cfg.short+': sent ('+items.length+' items, '+oc+' overdue)');
        return true;
    } catch(err) { console.error('  FAIL '+cfg.short+': '+err.message); return false; }
}

async function main() {
    console.log('SafeNotify.PRO - Weekly Compliance Scan');
    console.log('Date: '+new Date().toLocaleString('en-GB'));
    console.log('Directors: '+INCLUDE_DIRECTORS+'\n');
    const allItems = await scanAll();
    const pd = {}; Object.keys(PARKS).forEach(p=>pd[p]=[]);
    allItems.forEach(item => { Object.keys(PARKS).forEach(pn => { const ip=(item.park||'').toLowerCase(); if (ip.includes(PARKS[pn].slug)||ip.includes(pn.split(' ')[0].toLowerCase())) pd[pn].push(item); }); });
    console.log('\nSending...');
    let sent=0,fail=0;
    for (const pn of Object.keys(PARKS)) {
        const items = pd[pn];
        if (items.length===0) { console.log('  SKIP '+PARKS[pn].short+': no items'); continue; }
        const ok = await sendDigest(pn,items); if(ok)sent++;else fail++;
        await new Promise(r=>setTimeout(r,500));
    }
    console.log('\nDone. Sent: '+sent+', Failed: '+fail);
    process.exit(fail>0?1:0);
}
main().catch(err=>{console.error('FATAL:',err);process.exit(1);});
