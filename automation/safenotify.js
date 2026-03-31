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
const DIRECTORS_EMAIL = 'andrew.campbell@highlandholidays.com';
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

    // FIRE DETECTION DEVICES
    try {
        const detDocs = await db.collection('fireDetectionDevices').get();
        console.log('  fireDetectionDevices: '+detDocs.size);
        detDocs.forEach(doc => {
            const d = doc.data();
            if (d.nextTestDue) {
                const days = daysUntil(d.nextTestDue);
                if (days!==null && days<=30) items.push({type:'Fire Detection Service',park:d.park||d.parkName||'Unknown',item:(d.type||'Device')+' - '+(d.code||d.locationDescription||''),location:d.locationDescription||'',dueDate:d.nextTestDue,days});
            }
        });
    } catch(e) { console.log('  fireDetectionDevices: skipped'); }

    // FIRE PANELS
    try {
        const panelDocs = await db.collection('firePanels').get();
        console.log('  firePanels: '+panelDocs.size);
        panelDocs.forEach(doc => {
            const d = doc.data();
            if (d.nextServiceDate) {
                const days = daysUntil(d.nextServiceDate);
                if (days!==null && days<=30) items.push({type:'Fire Panel Service',park:d.park||'Unknown',item:(d.panelRef||'Panel')+' - '+(d.panelType||''),location:d.locationDescription||'',dueDate:d.nextServiceDate,days});
            }
        });
    } catch(e) { console.log('  firePanels: skipped'); }

    console.log('Total due within 30 days: '+items.length);
    return items;
}

// Park profile — defines which categories each park is expected to have
const PARK_PROFILE = {
    'Ben Nevis Holiday Park': ['gas','vehicles','fire-ext','fire-detection','fire-panels','hot-tubs','play-parks','accommodation','actions'],
    'Oban Holiday Park':      ['gas','vehicles','fire-ext','fire-detection','hot-tubs','play-parks','accommodation','actions'],
    'Tyndrum Holiday Park':   ['gas','vehicles','fire-ext','fire-detection','hot-tubs','play-parks','accommodation','actions']
};
const CAT_LABELS = {
    'gas':'Gas Appliances','vehicles':'Vehicles','fire-ext':'Fire Extinguishers',
    'fire-detection':'Fire Detection','fire-panels':'Fire Panels',
    'hot-tubs':'Hot Tub Checks','play-parks':'Play Park Checks',
    'accommodation':'Accommodation','actions':'Open Actions'
};

async function buildScore(parkName) {
    const today = new Date(); today.setHours(0,0,0,0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysElapsed = Math.max(1, Math.floor((today - monthStart) / 86400000) + 1);
    const key = parkName.toLowerCase().split(' ')[0];
    const profile = PARK_PROFILE[parkName] || [];
    const scoreMap = {};

    // Initialise all expected categories as no-data
    profile.forEach(cat => { scoreMap[cat] = {label:CAT_LABELS[cat],ok:0,total:0,pct:0,noData:true,note:''}; });

    if (profile.includes('gas')) {
        try { const snap = await db.collection('gasAppliances').get(); let total=0,ok=0;
            snap.forEach(doc => { const d=doc.data(); if(!(d.park||'').toLowerCase().includes(key)||d.status!=='active') return; total++; if(daysUntil(d.nextInspectionDue)>=0) ok++; });
            if (total>0) scoreMap['gas']={label:'Gas Appliances',ok,total,pct:Math.round(ok/total*100),noData:false,note:''}; } catch(e) {}
    }

    if (profile.includes('vehicles')) {
        try { const snap = await db.collection('vehicles').get(); let total=0,ok=0;
            snap.forEach(doc => { const d=doc.data(); if(d.status!=='active'||!(d.parkName||d.location||'').toLowerCase().includes(key)) return; total++;
                const allOk=['mot_expiry','insurance_expiry','tax_expiry','service_due'].every(f=>!d[f]||daysUntil(d[f])>=0); if(allOk) ok++; });
            if (total>0) scoreMap['vehicles']={label:'Vehicles',ok,total,pct:Math.round(ok/total*100),noData:false,note:''}; } catch(e) {}
    }

    if (profile.includes('fire-ext')) {
        try { const snap = await db.collection('fireExtinguishers').get(); let total=0,ok=0;
            snap.forEach(doc => { const d=doc.data(); if(!(d.park||d.parkName||'').toLowerCase().includes(key)) return; total++;
                const due=d.nextServiceDue||d.serviceDue||d.expiryDate; if(due&&daysUntil(due)>=0) ok++; });
            if (total>0) scoreMap['fire-ext']={label:'Fire Extinguishers',ok,total,pct:Math.round(ok/total*100),noData:false,note:''}; } catch(e) {}
    }

    if (profile.includes('fire-detection')) {
        try { const snap = await db.collection('fireDetectionDevices').get(); let total=0,ok=0;
            snap.forEach(doc => { const d=doc.data(); if(!(d.park||d.parkName||'').toLowerCase().includes(key)) return; total++;
                if(d.nextTestDue&&daysUntil(d.nextTestDue)>=0) ok++; });
            if (total>0) scoreMap['fire-detection']={label:'Fire Detection',ok,total,pct:Math.round(ok/total*100),noData:false,note:''}; } catch(e) {}
    }

    if (profile.includes('fire-panels')) {
        try { const snap = await db.collection('firePanels').get(); let total=0,ok=0;
            snap.forEach(doc => { const d=doc.data(); if(!(d.park||'').toLowerCase().includes(key)) return; total++;
                if(d.nextServiceDate&&daysUntil(d.nextServiceDate)>=0) ok++; });
            if (total>0) scoreMap['fire-panels']={label:'Fire Panels',ok,total,pct:Math.round(ok/total*100),noData:false,note:''}; } catch(e) {}
    }

    if (profile.includes('hot-tubs')) {
        try { let tubCount=0;
            const cfg = await db.collection('accommodation_config').get();
            cfg.forEach(doc => { const d=doc.data(); if((d.parkName||'').toLowerCase().includes(key)) { const t=d.hotTubs||d.hot_tubs||d.tubCount; if(typeof t==='number'&&t>tubCount) tubCount=t; else if(Array.isArray(t)&&t.length>tubCount) tubCount=t.length; } });
            const snap = await db.collection('hot_tub_inspections').get(); let actual=0;
            snap.forEach(doc => { const d=doc.data(); if(!(d.park||d.parkName||d.location||'').toLowerCase().includes(key)) return;
                const dt=d.date||d.inspectionDate||d.createdAt; if(!dt) return; const dd=parseDate(dt); if(dd&&dd>=monthStart&&dd<=today) actual++; });
            if (!tubCount) { const tubs=new Set(); snap.forEach(doc => { const d=doc.data(); if((d.park||'').toLowerCase().includes(key)&&d.hotTubName) tubs.add(d.hotTubName); }); tubCount=tubs.size; }
            const expected = tubCount*daysElapsed;
            if (expected>0) scoreMap['hot-tubs']={label:'Hot Tub Checks',ok:Math.min(actual,expected),total:expected,pct:Math.min(100,Math.round(actual/expected*100)),noData:false,note:tubCount+' tubs x '+daysElapsed+'d'}; } catch(e) {}
    }

    if (profile.includes('play-parks')) {
        try { const snap = await db.collection('playParkInspections').get(); let actual=0; const areas=new Set();
            snap.forEach(doc => { const d=doc.data(); if(!(d.park||d.parkName||d.location||'').toLowerCase().includes(key)) return;
                const dt=d.date||d.inspectionDate||d.createdAt; if(!dt) return; const dd=parseDate(dt);
                if(dd&&dd>=monthStart&&dd<=today) { actual++; const a=d.playParkName||d.area||''; if(a) areas.add(a); } });
            const areaCount=areas.size||1; const expected=areaCount*daysElapsed;
            if (actual>0) scoreMap['play-parks']={label:'Play Park Checks',ok:Math.min(actual,expected),total:expected,pct:Math.min(100,Math.round(actual/expected*100)),noData:false,note:areaCount+' area(s) x '+daysElapsed+'d'}; } catch(e) {}
    }

    if (profile.includes('accommodation')) {
        try { let unitCount=0;
            const cfg = await db.collection('accommodation_config').get();
            cfg.forEach(doc => { const d=doc.data(); if((d.parkName||'').toLowerCase().includes(key)) { const t=typeof d.totalUnits==='number'?d.totalUnits:(d.units||[]).length; if(t>unitCount) unitCount=t; } });
            const snap = await db.collection('accommodation_inspections').get(); const inspected=new Set();
            snap.forEach(doc => { const d=doc.data(); if(!(d.parkName||d.park||'').toLowerCase().includes(key)) return;
                const dt=d.date||d.submittedAt||d.createdAt; if(!dt) return; const dd=parseDate(dt);
                if(dd&&dd>=monthStart&&dd<=today&&d.accommodationUnit) inspected.add(d.accommodationUnit); });
            const expected=unitCount||inspected.size;
            if (expected>0) scoreMap['accommodation']={label:'Accommodation',ok:inspected.size,total:expected,pct:Math.min(100,Math.round(inspected.size/expected*100)),noData:false,note:'1 check/unit this month'}; } catch(e) {}
    }

    if (profile.includes('actions')) {
        try { const snap = await db.collection('actions').get(); let total=0,overdue=0;
            snap.forEach(doc => { const d=doc.data(); if(d.status!=='open'||!d.targetDate) return;
                const ip=(d.location||'').toLowerCase(); if(!ip.includes(key)&&!ip.includes(PARKS[parkName]?.slug||'')) return;
                total++; if(daysUntil(d.targetDate)<0) overdue++; });
            scoreMap['actions']={label:'Open Actions',ok:total-overdue,total:total||0,pct:total>0?Math.round((total-overdue)/total*100):100,noData:false,note:total===0?'No open actions':''}; } catch(e) {}
    }

    const scores = profile.map(cat => ({...scoreMap[cat], cat}));
    const assessed = scores.filter(s => !s.noData);
    const overall = assessed.length>0 ? Math.round(assessed.reduce((a,s)=>a+s.pct,0)/assessed.length) : null;
    return {scores, overall, daysElapsed, assessedCount:assessed.length, totalCount:scores.length};
}

function buildHtml(parkName, items, scoreData) {
    const now = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
    const oc = items.filter(i=>i.days<0).length;
    let h = '<div style="font-family:Helvetica Neue,Arial,sans-serif;max-width:700px;margin:0 auto;background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">';
    h += '<div style="background:#1a1a2e;padding:24px 28px;color:#fff"><div style="font-size:20px;font-weight:700">Safe<span style="color:#cc5500">Notify</span>.PRO</div><div style="font-size:13px;color:#aaa;margin-top:4px">Compliance Notification \u2014 Omnibosh Safety Solutions</div></div>';
    h += '<div style="padding:24px 28px"><div style="font-size:16px;font-weight:700;color:#1a1a2e;margin-bottom:4px">'+parkName+'</div>';
    h += '<div style="font-size:13px;color:#888;margin-bottom:20px">'+now+' \u2014 '+items.length+' items'+(oc>0?' \u2014 <span style="color:#e53935;font-weight:700">'+oc+' OVERDUE</span>':'')+'</div>';

    // Compliance scorecard
    if (scoreData && scoreData.overall !== null) {
        const ov = scoreData.overall;
        const ovCol = ov>=90?'#0d9668':ov>=70?'#f59e0b':'#e53935';
        const missing = scoreData.totalCount - scoreData.assessedCount;
        h += '<div style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:8px;padding:16px 20px;margin-bottom:20px">';
        h += '<div style="font-size:13px;font-weight:700;color:#444;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px">Compliance Score — '+new Date().toLocaleString('en-GB',{month:'long',year:'numeric'})+'</div>';
        h += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:14px">';
        h += '<div style="font-size:48px;font-weight:800;color:'+ovCol+';line-height:1">'+ov+'%</div>';
        h += '<div style="font-size:13px;color:#666;line-height:1.6">Overall compliance score<br>';
        h += '<span style="font-size:11px;color:#999">'+scoreData.assessedCount+' of '+scoreData.totalCount+' categories assessed \u2014 '+scoreData.daysElapsed+' days elapsed this month</span>';
        if (missing>0) h += '<br><span style="font-size:11px;color:#e53935;font-weight:600">'+missing+' category'+(missing>1?'s':'')+' not yet set up</span>';
        h += '</div></div>';
        h += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
        scoreData.scores.forEach(s => {
            if (s.noData) {
                h += '<tr style="background:#fef2f2"><td style="padding:5px 0;color:#e53935;font-weight:600;width:160px">'+s.label+'</td>';
                h += '<td style="padding:5px 8px" colspan="3"><span style="color:#e53935;font-size:11px">No assets registered \u2014 setup required</span></td></tr>';
            } else {
                const col = s.pct>=90?'#0d9668':s.pct>=70?'#f59e0b':'#e53935';
                const bar = Math.round(s.pct/100*120);
                h += '<tr><td style="padding:4px 0;color:#555;width:160px">'+s.label+(s.note?'<br><span style="color:#aaa;font-size:10px">'+s.note+'</span>':'')+'</td>';
                h += '<td style="padding:4px 8px"><div style="background:#e0e0e0;border-radius:4px;height:8px;width:120px"><div style="background:'+col+';height:8px;border-radius:4px;width:'+bar+'px"></div></div></td>';
                h += '<td style="padding:4px 0;font-weight:700;color:'+col+'">'+s.pct+'%</td>';
                h += '<td style="padding:4px 0;color:#999;font-size:11px;padding-left:8px">'+s.ok+'/'+s.total+'</td></tr>';
            }
        });
        h += '</table></div>';
    }

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

async function sendDigest(parkName, items, scoreData) {
    const cfg = PARKS[parkName]; const oc = items.filter(i=>i.days<0).length;
    const subject = 'SafeSystems.PRO - '+cfg.short+' Compliance Notification - '+oc+' overdue, '+items.length+' total';
    const to = [cfg.email]; const cc = [OMNIBOSH];
    try {
        const result = await resend.emails.send({from:FROM_NAME+' <'+FROM_EMAIL+'>',to,cc,subject,html:buildHtml(parkName,items,scoreData),text:buildText(parkName,items)});
        console.log('  OK '+cfg.short+': sent ('+items.length+' items, '+oc+' overdue, score: '+(scoreData?.overall??'n/a')+'%)');
        return true;
    } catch(err) { console.error('  FAIL '+cfg.short+': '+err.message); return false; }
}

function buildAndrewHtml(parkScores) {
    const now = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
    const month = new Date().toLocaleString('en-GB',{month:'long',year:'numeric'});
    let h = '<div style="font-family:Helvetica Neue,Arial,sans-serif;max-width:800px;margin:0 auto;background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">';
    h += '<div style="background:#1a1a2e;padding:24px 28px;color:#fff"><div style="font-size:20px;font-weight:700">Safe<span style="color:#cc5500">Notify</span>.PRO</div><div style="font-size:13px;color:#aaa;margin-top:4px">Highland Holidays \u2014 Weekly Compliance Summary \u2014 Omnibosh Safety Solutions</div></div>';
    h += '<div style="padding:24px 28px">';
    h += '<div style="font-size:16px;font-weight:700;color:#1a1a2e;margin-bottom:4px">Highland Holidays \u2014 All Parks</div>';
    h += '<div style="font-size:13px;color:#888;margin-bottom:24px">'+now+'</div>';

    // Overall scores summary table
    h += '<div style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:8px;padding:16px 20px;margin-bottom:24px">';
    h += '<div style="font-size:13px;font-weight:700;color:#444;margin-bottom:14px;text-transform:uppercase;letter-spacing:.5px">Compliance Scores \u2014 '+month+'</div>';
    h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
    h += '<tr style="background:#eee"><th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#666">Park</th><th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#666">Overall Score</th><th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#666">Items Due</th><th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#666">Overdue</th></tr>';
    parkScores.forEach(ps => {
        const ov = ps.scoreData?.overall;
        const col = ov>=90?'#0d9668':ov>=70?'#f59e0b':'#e53935';
        const oc = ps.items.filter(i=>i.days<0).length;
        h += '<tr style="border-bottom:1px solid #e0e0e0">';
        h += '<td style="padding:10px;font-weight:700;color:#1a1a2e">'+ps.parkName+'</td>';
        h += '<td style="padding:10px"><span style="font-size:20px;font-weight:800;color:'+col+'">'+(ov!==null?ov+'%':'—')+'</span></td>';
        h += '<td style="padding:10px;color:#444">'+ps.items.length+'</td>';
        h += '<td style="padding:10px"><span style="color:'+(oc>0?'#e53935':'#0d9668');h+=';font-weight:700">'+oc+'</span></td></tr>';
    });
    h += '</table></div>';

    // Per-park detail sections
    parkScores.forEach(ps => {
        const oc = ps.items.filter(i=>i.days<0).length;
        h += '<div style="margin-bottom:24px"><div style="font-size:15px;font-weight:700;color:#1a1a2e;border-bottom:2px solid #cc5500;padding-bottom:6px;margin-bottom:12px">'+ps.parkName+'</div>';
        if (ps.items.length===0) {
            h += '<div style="background:#ecfdf3;border:1px solid #22c55e;border-radius:8px;padding:12px;color:#166534;font-weight:600;font-size:13px">No items due within 30 days.</div>';
        } else {
            h += '<table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="background:#f8f9fa"><th style="text-align:left;padding:6px 8px;color:#666;font-size:10px;text-transform:uppercase;border-bottom:1px solid #e0e0e0">Type</th><th style="text-align:left;padding:6px 8px;color:#666;font-size:10px;text-transform:uppercase;border-bottom:1px solid #e0e0e0">Item</th><th style="text-align:left;padding:6px 8px;color:#666;font-size:10px;text-transform:uppercase;border-bottom:1px solid #e0e0e0">Due</th><th style="text-align:left;padding:6px 8px;color:#666;font-size:10px;text-transform:uppercase;border-bottom:1px solid #e0e0e0">Status</th></tr>';
            ps.items.sort((a,b)=>a.days-b.days).forEach(i => {
                const bg=i.days<0?'#fef2f2':i.days<=7?'#fefce8':'#fff';
                const sc=i.days<0?'#e53935':i.days<=7?'#f59e0b':'#3b82f6';
                const st=i.days<0?Math.abs(i.days)+'d overdue':i.days===0?'Today':i.days+'d';
                h += '<tr style="background:'+bg+'"><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;font-weight:600">'+i.type+'</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0">'+i.item+'</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0">'+fmtDate(i.dueDate)+'</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0"><span style="background:'+sc+';color:#fff;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:700">'+st+'</span></td></tr>';
            });
            h += '</table>';
        }
        h += '</div>';
    });

    h += '</div><div style="background:#f8f9fa;padding:16px 28px;font-size:11px;color:#888;border-top:1px solid #e0e0e0">SafeNotify.PRO \u2014 Highland Holidays Weekly Summary \u2014 '+now+'<br>Omnibosh Safety Solutions Ltd</div></div>';
    return h;
}

async function sendAndrewDigest(parkScores) {
    const now = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
    const totalItems = parkScores.reduce((a,ps)=>a+ps.items.length,0);
    const totalOverdue = parkScores.reduce((a,ps)=>a+ps.items.filter(i=>i.days<0).length,0);
    const subject = 'SafeSystems.PRO \u2014 Highland Holidays Weekly Summary \u2014 '+totalOverdue+' overdue across all parks';
    try {
        await resend.emails.send({
            from: FROM_NAME+' <'+FROM_EMAIL+'>',
            to: [DIRECTORS_EMAIL],
            cc: [OMNIBOSH],
            subject,
            html: buildAndrewHtml(parkScores),
            text: parkScores.map(ps => buildText(ps.parkName, ps.items)).join('\n\n---\n\n')
        });
        console.log('  OK Andrew: combined digest sent ('+totalItems+' items, '+totalOverdue+' overdue)');
        return true;
    } catch(err) { console.error('  FAIL Andrew: '+err.message); return false; }
}

async function main() {
    console.log('SafeNotify.PRO - Weekly Compliance Scan');
    console.log('Date: '+new Date().toLocaleString('en-GB'));
    console.log('Directors: '+INCLUDE_DIRECTORS+'\n');
    const allItems = await scanAll();
    const pd = {}; Object.keys(PARKS).forEach(p=>pd[p]=[]);
    allItems.forEach(item => { Object.keys(PARKS).forEach(pn => { const ip=(item.park||'').toLowerCase(); if (ip.includes(PARKS[pn].slug)||ip.includes(pn.split(' ')[0].toLowerCase())) pd[pn].push(item); }); });

    console.log('\nBuilding compliance scores...');
    const parkScores = [];
    for (const pn of Object.keys(PARKS)) {
        const scoreData = await buildScore(pn);
        console.log('  '+PARKS[pn].short+': '+scoreData.overall+'% overall');
        parkScores.push({ parkName: pn, items: pd[pn], scoreData });
    }

    console.log('\nSending park emails...');
    let sent=0,fail=0;
    for (const ps of parkScores) {
        if (ps.items.length===0) { console.log('  SKIP '+PARKS[ps.parkName].short+': no items due'); continue; }
        const ok = await sendDigest(ps.parkName, ps.items, ps.scoreData); if(ok)sent++;else fail++;
        await new Promise(r=>setTimeout(r,500));
    }

    console.log('\nSending Andrew combined digest...');
    await sendAndrewDigest(parkScores);

    console.log('\nDone. Park emails sent: '+sent+', Failed: '+fail);
    process.exit(fail>0?1:0);
}
main().catch(err=>{console.error('FATAL:',err);process.exit(1);});
