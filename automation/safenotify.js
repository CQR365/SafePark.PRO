const admin = require('firebase-admin');
const { Resend } = require('resend');

const PARKS = {
    'Ben Nevis Holiday Park': { email: 'bennevis@highlandholidays.com', slug: 'ben-nevis', short: 'Ben Nevis' },
    'Oban Holiday Park':      { email: 'oban@highlandholidays.com',     slug: 'oban',      short: 'Oban' },
    'Tyndrum Holiday Park':   { email: 'tyndrum@highlandholidays.com',  slug: 'tyndrum',   short: 'Tyndrum' }
};
const OMNIBOSH        = 'safesystems.pro@omnibosh.com';
const FROM_EMAIL      = 'safesystems.pro@omnibosh.com';
const FROM_NAME       = 'SafeNotify.PRO';
const DIRECTORS_EMAIL = 'andrew.campbell@highlandholidays.com';
const INCLUDE_DIRECTORS = process.env.INCLUDE_DIRECTORS === 'true';

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const resend = new Resend(process.env.RESEND_API_KEY);

// ── DATE HELPERS ───────────────────────────────────────────────────────────
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
function isoDate(d) { return d.toISOString().split('T')[0]; }

// ── PARK PROFILE ───────────────────────────────────────────────────────────
const PARK_PROFILE = {
    'Ben Nevis Holiday Park': ['gas','vehicles','fire-ext','fire-detection','fire-panels','hot-tubs','play-parks','accommodation','actions'],
    'Oban Holiday Park':      ['gas','vehicles','fire-ext','fire-detection','hot-tubs','play-parks','accommodation','actions'],
    'Tyndrum Holiday Park':   ['gas','vehicles','fire-ext','fire-detection','hot-tubs','play-parks','accommodation','actions']
};
const CAT_LABELS = {
    'gas':'Gas Appliances','vehicles':'Vehicles','fire-ext':'Fire Extinguishers',
    'fire-detection':'Fire Detection','fire-panels':'Fire Panels',
    'hot-tubs':'Hot Tub Checks','play-parks':'Play Park Inspections',
    'accommodation':'Accommodation Checks','actions':'Open Actions'
};

// ── SCAN ALL DUE ITEMS ─────────────────────────────────────────────────────
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

    try {
        const det = await db.collection('fireDetectionDevices').get();
        console.log('  fireDetectionDevices: '+det.size);
        det.forEach(doc => {
            const d = doc.data(); if (!d.nextTestDue) return;
            const days = daysUntil(d.nextTestDue);
            if (days!==null&&days<=30) items.push({type:'Fire Detection Test',park:d.park||d.parkName||'Unknown',item:(d.type||'Detector')+' - '+(d.code||''),location:d.zone||'',dueDate:d.nextTestDue,days});
        });
    } catch(e) { console.log('  fireDetectionDevices: skipped'); }

    try {
        const panels = await db.collection('firePanels').get();
        console.log('  firePanels: '+panels.size);
        panels.forEach(doc => {
            const d = doc.data(); if (!d.nextServiceDate) return;
            const days = daysUntil(d.nextServiceDate);
            if (days!==null&&days<=30) items.push({type:'Panel Service',park:d.park||'Unknown',item:'Panel '+(d.panelRef||d.reference||'Unknown')+' - '+(d.panelType||''),location:d.location||'',dueDate:d.nextServiceDate,days});
        });
    } catch(e) { console.log('  firePanels: skipped'); }

    console.log('Total due within 30 days: '+items.length);
    return items;
}

// ── BUILD COMPLIANCE SCORE ─────────────────────────────────────────────────
async function buildScore(parkName) {
    const today = new Date(); today.setHours(0,0,0,0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysElapsed = Math.max(1, Math.floor((today - monthStart) / 86400000) + 1);
    const key = parkName.toLowerCase().split(' ')[0];
    const profile = PARK_PROFILE[parkName] || [];
    const scoreMap = {};

    profile.forEach(cat => { scoreMap[cat] = {label:CAT_LABELS[cat],ok:0,total:0,pct:0,noData:true,note:'Not yet configured in SafeSystems.PRO'}; });

    if (profile.includes('gas')) {
        try { const snap = await db.collection('gasAppliances').get(); let total=0,ok=0;
            snap.forEach(doc => { const d=doc.data(); if(!(d.park||'').toLowerCase().includes(key)||d.status!=='active') return; total++; if(daysUntil(d.nextInspectionDue)>=0) ok++; });
            if (total>0) scoreMap['gas']={label:CAT_LABELS['gas'],ok,total,pct:Math.round(ok/total*100),noData:false,note:total+' appliance'+(total!==1?'s':'')}; } catch(e) {}
    }

    if (profile.includes('vehicles')) {
        try { const snap = await db.collection('vehicles').get(); let total=0,ok=0;
            snap.forEach(doc => { const d=doc.data(); if(d.status!=='active'||!(d.parkName||d.location||'').toLowerCase().includes(key)) return; total++;
                const allOk=['mot_expiry','insurance_expiry','tax_expiry','service_due'].every(f=>!d[f]||daysUntil(d[f])>=0); if(allOk) ok++; });
            if (total>0) scoreMap['vehicles']={label:CAT_LABELS['vehicles'],ok,total,pct:Math.round(ok/total*100),noData:false,note:total+' vehicle'+(total!==1?'s':'')}; } catch(e) {}
    }

    if (profile.includes('fire-ext')) {
        try { const snap = await db.collection('fireExtinguishers').get(); let total=0,ok=0;
            snap.forEach(doc => { const d=doc.data(); if(!(d.park||d.parkName||'').toLowerCase().includes(key)) return; total++;
                const due=d.nextServiceDue||d.serviceDue||d.expiryDate; if(due&&daysUntil(due)>=0) ok++; });
            if (total>0) scoreMap['fire-ext']={label:CAT_LABELS['fire-ext'],ok,total,pct:Math.round(ok/total*100),noData:false,note:total+' extinguisher'+(total!==1?'s':'')}; } catch(e) {}
    }

    if (profile.includes('fire-detection')) {
        try { const snap = await db.collection('fireDetectionDevices').get(); let total=0,ok=0;
            snap.forEach(doc => { const d=doc.data(); if(!(d.park||d.parkName||'').toLowerCase().includes(key)) return; total++;
                if(d.nextTestDue&&daysUntil(d.nextTestDue)>=0) ok++; });
            if (total>0) scoreMap['fire-detection']={label:CAT_LABELS['fire-detection'],ok,total,pct:Math.round(ok/total*100),noData:false,note:total+' device'+(total!==1?'s':'')}; } catch(e) {}
    }

    if (profile.includes('fire-panels')) {
        try { const snap = await db.collection('firePanels').get(); let total=0,ok=0;
            snap.forEach(doc => { const d=doc.data(); if(!(d.park||'').toLowerCase().includes(key)) return; total++;
                if(d.nextServiceDate&&daysUntil(d.nextServiceDate)>=0) ok++; });
            if (total>0) scoreMap['fire-panels']={label:CAT_LABELS['fire-panels'],ok,total,pct:Math.round(ok/total*100),noData:false,note:total+' panel'+(total!==1?'s':'')}; } catch(e) {}
    }

    if (profile.includes('hot-tubs')) {
        try { let tubCount=0;
            const cfg = await db.collection('accommodation_config').get();
            cfg.forEach(doc => { const d=doc.data(); if((d.parkName||'').toLowerCase().includes(key)) { const t=d.hotTubs||d.hot_tubs||d.tubCount; if(typeof t==='number'&&t>tubCount) tubCount=t; else if(Array.isArray(t)&&t.length>tubCount) tubCount=t.length; } });
            const snap = await db.collection('hot_tub_inspections').get(); let actual=0; const tubs=new Set();
            snap.forEach(doc => { const d=doc.data();
                const parkVal=(d.park||d.parkName||d.location||d.parkLocation||'').toLowerCase();
                if(!parkVal.includes(key)) return;
                const dt=d.createdAt||d.date||d.inspectionDate; if(!dt) return;
                const dd=parseDate(dt); if(dd&&dd>=monthStart&&dd<=today) { actual++; if(d.hotTubs&&Array.isArray(d.hotTubs)) d.hotTubs.forEach(t=>{if(t)tubs.add(t)}); } });
            if(!tubCount) tubCount=tubs.size;
            const expected=tubCount*daysElapsed;
            if (expected>0) scoreMap['hot-tubs']={label:CAT_LABELS['hot-tubs'],ok:Math.min(actual,expected),total:expected,pct:Math.min(100,Math.round(actual/expected*100)),noData:false,note:tubCount+' tub'+(tubCount!==1?'s':'')+' x '+daysElapsed+'d'}; } catch(e) {}
    }

    if (profile.includes('play-parks')) {
        try {
            const cfgSnap = await db.collection('playParkConfig').get();
            let hasConfig = false;
            cfgSnap.forEach(doc => { const d=doc.data(); if((d.parkName||'').toLowerCase().includes(key)) hasConfig=true; });
            if (!hasConfig) {
                scoreMap['play-parks']={label:CAT_LABELS['play-parks'],ok:0,total:0,pct:0,noData:true,note:'Play park not yet configured in SafePlay.PRO'};
            } else {
                const snap = await db.collection('playParkInspections').get(); let actual=0; const areas=new Set();
                snap.forEach(doc => { const d=doc.data();
                    const parkVal=(d.parkName||d.park||d.location||d.parkLocation||'').toLowerCase();
                    if(!parkVal.includes(key)) return;
                    const dt=d.timestamp||d.createdAt||d.date||d.inspectionDate; if(!dt) return; const dd=parseDate(dt);
                    if(dd&&dd>=monthStart&&dd<=today) { actual++; const a=d.playAreaName||d.playParkName||d.area||''; if(a) areas.add(a); } });
                const areaCount=areas.size||1; const expected=areaCount*daysElapsed;
                scoreMap['play-parks']={label:CAT_LABELS['play-parks'],ok:Math.min(actual,expected),total:expected,pct:actual>0?Math.min(100,Math.round(actual/expected*100)):0,noData:false,note:areaCount+' area'+(areaCount!==1?'s':'')+' x '+daysElapsed+'d'};
            }
        } catch(e) {}
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
            if (expected>0) scoreMap['accommodation']={label:CAT_LABELS['accommodation'],ok:inspected.size,total:expected,pct:Math.min(100,Math.round(inspected.size/expected*100)),noData:false,note:'1 check/unit this month'}; } catch(e) {}
    }

    if (profile.includes('actions')) {
        try { const snap = await db.collection('actions').get(); let total=0,overdue=0;
            const slug=PARKS[parkName]?.slug||'';
            snap.forEach(doc => { const d=doc.data(); if(d.status!=='open'||!d.targetDate) return;
                const ip=(d.location||'').toLowerCase();
                const isAll=ip.includes('all');
                const isThisPark=ip.includes(key)||ip.includes(slug)||(parkName==='Tyndrum Holiday Park'&&ip.includes('overburns'));
                if(!isAll&&!isThisPark) return;
                total++; if(daysUntil(d.targetDate)<0) overdue++; });
            scoreMap['actions']={label:CAT_LABELS['actions'],ok:total-overdue,total:total||0,pct:total>0?Math.round((total-overdue)/total*100):100,noData:false,note:total===0?'No open actions':total+' open'}; } catch(e) {}
    }

    const scores = profile.map(cat => ({...scoreMap[cat], cat}));
    const assessed = scores.filter(s => !s.noData);
    const overall = assessed.length>0 ? Math.round(assessed.reduce((a,s)=>a+s.pct,0)/assessed.length) : null;
    return {scores, overall, daysElapsed, assessedCount:assessed.length, totalCount:scores.length};
}

// ── HISTORICAL SCORES ──────────────────────────────────────────────────────
async function saveScores(parkScores) {
    const today = isoDate(new Date());
    try {
        const record = { date: today, savedAt: new Date().toISOString(), parks: {} };
        parkScores.forEach(ps => { record.parks[ps.parkName] = { overall: ps.scoreData?.overall ?? null }; });
        await db.collection('safeNotifyScores').doc(today).set(record);
        console.log('  Scores saved: '+today);
    } catch(e) { console.warn('  Could not save scores:', e.message); }
}

async function loadHistoricalScore(daysAgo) {
    const target = new Date(); target.setDate(target.getDate() - daysAgo);
    const targetStr = isoDate(target);
    try {
        const doc = await db.collection('safeNotifyScores').doc(targetStr).get();
        if (doc.exists) return doc.data();
        for (let offset=1; offset<=2; offset++) {
            for (const sign of [1,-1]) {
                const d = new Date(target); d.setDate(d.getDate()+sign*offset);
                const nearby = await db.collection('safeNotifyScores').doc(isoDate(d)).get();
                if (nearby.exists) return nearby.data();
            }
        }
    } catch(e) {}
    return null;
}

function scoreDelta(current, historical, parkName) {
    if (!historical || historical.parks?.[parkName]?.overall == null || current == null) return null;
    return current - historical.parks[parkName].overall;
}

function deltaHtml(delta) {
    if (delta === null) return '<span style="color:#aaa;font-size:11px">no prior data</span>';
    if (delta > 0) return '<span style="color:#0d9668;font-weight:700;font-size:12px">&#9650; +'+delta+'%</span>';
    if (delta < 0) return '<span style="color:#e53935;font-weight:700;font-size:12px">&#9660; '+delta+'%</span>';
    return '<span style="color:#888;font-size:12px">&#9644; no change</span>';
}

// ── SCORE CARD HTML ────────────────────────────────────────────────────────
function scoreCardHtml(scoreData, weekDelta, monthDelta) {
    if (!scoreData || scoreData.overall === null) return '';
    const ov = scoreData.overall;
    const ovCol = ov>=90?'#0d9668':ov>=70?'#f59e0b':'#e53935';
    const missing = scoreData.totalCount - scoreData.assessedCount;
    const month = new Date().toLocaleString('en-GB',{month:'long',year:'numeric'});
    let h = '<div style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:8px;padding:16px 20px;margin-bottom:20px">';
    h += '<div style="font-size:12px;font-weight:700;color:#444;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px">Compliance Score — '+month+'</div>';
    h += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:10px;flex-wrap:wrap">';
    h += '<div style="font-size:46px;font-weight:800;color:'+ovCol+';line-height:1">'+ov+'%</div>';
    h += '<div>';
    h += '<div style="font-size:12px;color:#444;margin-bottom:3px">'+scoreData.assessedCount+' of '+scoreData.totalCount+' categories assessed &mdash; '+scoreData.daysElapsed+' days elapsed this month</div>';
    if (missing>0) h += '<div style="font-size:11px;color:#e53935;font-weight:600;margin-bottom:3px">'+missing+' category'+(missing!==1?'s':'')+' not yet configured in SafeSystems.PRO</div>';
    h += '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:#666">';
    h += '<span>vs last week: '+deltaHtml(weekDelta)+'</span>';
    h += '<span>vs last month: '+deltaHtml(monthDelta)+'</span>';
    h += '</div></div></div>';
    h += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
    scoreData.scores.forEach(s => {
        if (s.noData) {
            h += '<tr style="background:#fef2f2"><td style="padding:5px 6px;color:#e53935;font-weight:600;width:175px">'+s.label+'</td>';
            h += '<td style="padding:5px 6px" colspan="3"><span style="color:#e53935;font-size:11px">&#9888; '+s.note+'</span></td></tr>';
        } else {
            const col=s.pct>=90?'#0d9668':s.pct>=70?'#f59e0b':'#e53935';
            const bar=Math.round(s.pct/100*120);
            h += '<tr><td style="padding:4px 6px;color:#555;width:175px">'+s.label+(s.note?'<br><span style="color:#aaa;font-size:10px">'+s.note+'</span>':'')+'</td>';
            h += '<td style="padding:4px 6px"><div style="background:#e0e0e0;border-radius:4px;height:7px;width:120px"><div style="background:'+col+';height:7px;border-radius:4px;width:'+bar+'px"></div></div></td>';
            h += '<td style="padding:4px 6px;font-weight:700;color:'+col+'">'+s.pct+'%</td>';
            h += '<td style="padding:4px 6px;color:#999;font-size:11px">'+s.ok+'/'+s.total+'</td></tr>';
        }
    });
    h += '</table></div>';
    return h;
}

// ── PREAMBLE HTML ──────────────────────────────────────────────────────────
function preambleHtml(isAndrew) {
    let h = '<div style="background:#f0f4ff;border-left:4px solid #1a1a2e;border-radius:0 6px 6px 0;padding:14px 18px;margin-bottom:20px;font-size:13px;color:#333;line-height:1.7">';
    if (isAndrew) {
        h += 'Andrew, this is your automated weekly combined compliance summary from <strong>SafeSystems.PRO</strong> covering all Highland Holidays parks. ';
        h += 'It shows the current compliance score for each park, module setup status, items due within 30 days, and performance compared to this time last week and last month. ';
        h += 'Individual park managers also receive their own digest each Friday. ';
    } else {
        h += 'This is your automated weekly compliance digest from <strong>SafeSystems.PRO</strong>, managed on behalf of Highland Holidays by <strong>Omnibosh Safety Solutions Ltd</strong>. ';
        h += 'It covers compliance items due within the next 30 days, your current module setup status, and your overall compliance score for '+new Date().toLocaleString('en-GB',{month:'long',year:'numeric'})+'. ';
    }
    h += 'For any queries contact Omnibosh Safety Solutions: <a href="mailto:safesystems.pro@omnibosh.com" style="color:#cc5500;font-weight:600">safesystems.pro@omnibosh.com</a>.';
    h += '</div>';
    return h;
}

// ── PARK EMAIL HTML ────────────────────────────────────────────────────────
function buildHtml(parkName, items, scoreData, weekDelta, monthDelta) {
    const now = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
    const oc = items.filter(i=>i.days<0).length;
    let h = '<div style="font-family:Helvetica Neue,Arial,sans-serif;max-width:700px;margin:0 auto;background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">';
    h += '<div style="background:#1a1a2e;padding:24px 28px;color:#fff"><div style="font-size:20px;font-weight:700">Safe<span style="color:#cc5500">Notify</span>.PRO</div>';
    h += '<div style="font-size:13px;color:#aaa;margin-top:4px">Automated Compliance Digest &mdash; Omnibosh Safety Solutions Ltd</div></div>';
    h += '<div style="padding:24px 28px">';
    h += '<div style="font-size:18px;font-weight:700;color:#1a1a2e;margin-bottom:2px">'+parkName+'</div>';
    h += '<div style="font-size:13px;color:#888;margin-bottom:20px">'+now+'</div>';
    h += preambleHtml(false);
    h += scoreCardHtml(scoreData, weekDelta, monthDelta);
    h += '<div style="font-size:13px;color:#888;margin-bottom:14px">'+items.length+' compliance item'+(items.length!==1?'s':'')+' due within 30 days'+(oc>0?' &mdash; <span style="color:#e53935;font-weight:700">'+oc+' OVERDUE</span>':'')+'</div>';
    if (items.length===0) {
        h += '<div style="background:#ecfdf3;border:1px solid #22c55e;border-radius:8px;padding:16px;text-align:center;color:#166534;font-weight:600">No compliance items due within the next 30 days. &#10003;</div>';
    } else {
        h += '<table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#f8f9fa">';
        h += '<th style="text-align:left;padding:8px 10px;color:#666;font-size:11px;text-transform:uppercase;border-bottom:2px solid #e0e0e0">Type</th>';
        h += '<th style="text-align:left;padding:8px 10px;color:#666;font-size:11px;text-transform:uppercase;border-bottom:2px solid #e0e0e0">Item</th>';
        h += '<th style="text-align:left;padding:8px 10px;color:#666;font-size:11px;text-transform:uppercase;border-bottom:2px solid #e0e0e0">Due</th>';
        h += '<th style="text-align:left;padding:8px 10px;color:#666;font-size:11px;text-transform:uppercase;border-bottom:2px solid #e0e0e0">Status</th></tr>';
        items.sort((a,b)=>a.days-b.days).forEach(i => {
            const bg=i.days<0?'#fef2f2':i.days<=7?'#fefce8':'#fff';
            const sc=i.days<0?'#e53935':i.days<=7?'#f59e0b':i.days<=14?'#cc5500':'#3b82f6';
            const st=i.days<0?Math.abs(i.days)+'d overdue':i.days===0?'Today':i.days+'d';
            h += '<tr style="background:'+bg+'"><td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;font-weight:600">'+i.type+'</td>';
            h += '<td style="padding:8px 10px;border-bottom:1px solid #f0f0f0">'+i.item+(i.location?'<br><span style="color:#888;font-size:11px">'+i.location+'</span>':'')+'</td>';
            h += '<td style="padding:8px 10px;border-bottom:1px solid #f0f0f0">'+fmtDate(i.dueDate)+'</td>';
            h += '<td style="padding:8px 10px;border-bottom:1px solid #f0f0f0"><span style="background:'+sc+';color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">'+st+'</span></td></tr>';
        });
        h += '</table>';
        h += '<div style="margin-top:20px;padding:16px;background:#fff8f3;border:1px solid #cc5500;border-radius:8px">';
        h += '<div style="font-weight:700;color:#cc5500;margin-bottom:6px">Action Required</div>';
        h += '<div style="font-size:13px;color:#666;line-height:1.6">All overdue items must be addressed immediately. Items due within 7 days should be scheduled now. Please update SafeSystems.PRO once actions are completed.</div></div>';
    }
    h += '</div><div style="background:#f8f9fa;padding:16px 28px;font-size:11px;color:#888;border-top:1px solid #e0e0e0">';
    h += 'SafeNotify.PRO &mdash; Automated Compliance Notification &mdash; '+now+'<br>Omnibosh Safety Solutions Ltd</div></div>';
    return h;
}

// ── ANDREW COMBINED DIGEST HTML ────────────────────────────────────────────
function buildAndrewHtml(parkScores, weekHistory, monthHistory) {
    const now = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
    const month = new Date().toLocaleString('en-GB',{month:'long',year:'numeric'});
    const totalItems = parkScores.reduce((a,ps)=>a+ps.items.length,0);
    const totalOverdue = parkScores.reduce((a,ps)=>a+ps.items.filter(i=>i.days<0).length,0);
    const notSetUp = parkScores.reduce((a,ps)=>a+(ps.scoreData?.totalCount-(ps.scoreData?.assessedCount||0)||0),0);

    let h = '<div style="font-family:Helvetica Neue,Arial,sans-serif;max-width:820px;margin:0 auto;background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">';
    h += '<div style="background:#1a1a2e;padding:24px 28px;color:#fff"><div style="font-size:20px;font-weight:700">Safe<span style="color:#cc5500">Notify</span>.PRO</div>';
    h += '<div style="font-size:13px;color:#aaa;margin-top:4px">Highland Holidays &mdash; Weekly Compliance Summary &mdash; Omnibosh Safety Solutions Ltd</div></div>';
    h += '<div style="padding:24px 28px">';
    h += '<div style="font-size:18px;font-weight:700;color:#1a1a2e;margin-bottom:2px">Highland Holidays &mdash; All Parks</div>';
    h += '<div style="font-size:13px;color:#888;margin-bottom:20px">'+now+'</div>';
    h += preambleHtml(true);

    // Summary tiles
    h += '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px">';
    h += '<div style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:8px;padding:12px 20px;flex:1;min-width:120px;text-align:center"><div style="font-size:28px;font-weight:800;color:#1a1a2e">'+totalItems+'</div><div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.4px">Items Due (30d)</div></div>';
    h += '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px 20px;flex:1;min-width:120px;text-align:center"><div style="font-size:28px;font-weight:800;color:#e53935">'+totalOverdue+'</div><div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.4px">Overdue</div></div>';
    h += '<div style="background:'+(notSetUp>0?'#fef2f2':'#ecfdf3')+';border:1px solid '+(notSetUp>0?'#fca5a5':'#86efac')+';border-radius:8px;padding:12px 20px;flex:1;min-width:120px;text-align:center"><div style="font-size:28px;font-weight:800;color:'+(notSetUp>0?'#e53935':'#0d9668')+'">'+notSetUp+'</div><div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.4px">Modules Not Set Up</div></div>';
    h += '</div>';

    // Scores comparison table
    h += '<div style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:8px;padding:16px 20px;margin-bottom:24px">';
    h += '<div style="font-size:12px;font-weight:700;color:#444;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px">Compliance Scores &mdash; '+month+'</div>';
    h += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
    h += '<tr style="background:#eee"><th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#666">Park</th>';
    h += '<th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#666">Score</th>';
    h += '<th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#666">vs Last Week</th>';
    h += '<th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#666">vs Last Month</th>';
    h += '<th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#666">Due</th>';
    h += '<th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#666">Overdue</th></tr>';
    parkScores.forEach(ps => {
        const ov=ps.scoreData?.overall; const col=ov>=90?'#0d9668':ov>=70?'#f59e0b':'#e53935';
        const oc=ps.items.filter(i=>i.days<0).length;
        const wDelta=scoreDelta(ov,weekHistory,ps.parkName);
        const mDelta=scoreDelta(ov,monthHistory,ps.parkName);
        h += '<tr style="border-bottom:1px solid #e0e0e0">';
        h += '<td style="padding:10px;font-weight:700;color:#1a1a2e">'+ps.parkName+'</td>';
        h += '<td style="padding:10px"><span style="font-size:22px;font-weight:800;color:'+col+'">'+(ov!==null&&ov!==undefined?ov+'%':'—')+'</span></td>';
        h += '<td style="padding:10px">'+deltaHtml(wDelta)+'</td>';
        h += '<td style="padding:10px">'+deltaHtml(mDelta)+'</td>';
        h += '<td style="padding:10px;color:#444">'+ps.items.length+'</td>';
        h += '<td style="padding:10px"><span style="color:'+(oc>0?'#e53935':'#0d9668');h+=';font-weight:700">'+oc+'</span></td></tr>';
    });
    h += '</table></div>';

    // Per-park detail
    parkScores.forEach(ps => {
        const oc=ps.items.filter(i=>i.days<0).length;
        const wDelta=scoreDelta(ps.scoreData?.overall,weekHistory,ps.parkName);
        const mDelta=scoreDelta(ps.scoreData?.overall,monthHistory,ps.parkName);
        h += '<div style="margin-bottom:28px">';
        h += '<div style="font-size:15px;font-weight:700;color:#1a1a2e;border-bottom:2px solid #cc5500;padding-bottom:6px;margin-bottom:14px">'+ps.parkName+'</div>';

        // Module setup breakdown
        if (ps.scoreData) {
            h += '<div style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:6px;padding:12px 16px;margin-bottom:12px">';
            h += '<div style="font-size:11px;font-weight:700;color:#444;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Module Setup &amp; Compliance Status</div>';
            h += '<table style="width:100%;border-collapse:collapse;font-size:11px">';
            ps.scoreData.scores.forEach(s => {
                if (s.noData) {
                    h += '<tr style="background:#fef2f2"><td style="padding:4px 6px;color:#e53935;font-weight:600;width:180px">'+s.label+'</td>';
                    h += '<td colspan="3" style="padding:4px 6px;color:#e53935">&#9888; '+s.note+'</td></tr>';
                } else {
                    const col=s.pct>=90?'#0d9668':s.pct>=70?'#f59e0b':'#e53935';
                    const bar=Math.round(s.pct/100*100);
                    h += '<tr><td style="padding:3px 6px;color:#555;width:180px">'+s.label+(s.note?'<br><span style="color:#aaa;font-size:9px">'+s.note+'</span>':'')+'</td>';
                    h += '<td style="padding:3px 6px"><div style="background:#e0e0e0;border-radius:3px;height:6px;width:100px"><div style="background:'+col+';height:6px;border-radius:3px;width:'+bar+'px"></div></div></td>';
                    h += '<td style="padding:3px 6px;font-weight:700;color:'+col+'">'+s.pct+'%</td>';
                    h += '<td style="padding:3px 6px;color:#999">'+s.ok+'/'+s.total+'</td></tr>';
                }
            });
            h += '</table>';
            const ov=ps.scoreData.overall;
            const ovCol=ov>=90?'#0d9668':ov>=70?'#f59e0b':'#e53935';
            h += '<div style="margin-top:8px;font-size:11px;color:#666">Overall: <strong style="color:'+ovCol+'">'+(ov!==null&&ov!==undefined?ov+'%':'—')+'</strong>';
            h += ' &nbsp;|&nbsp; vs last week: '+deltaHtml(wDelta)+' &nbsp;|&nbsp; vs last month: '+deltaHtml(mDelta)+'</div>';
            h += '</div>';
        }

        // Due items
        if (ps.items.length===0) {
            h += '<div style="background:#ecfdf3;border:1px solid #22c55e;border-radius:6px;padding:10px 14px;color:#166534;font-weight:600;font-size:12px">No items due within 30 days. &#10003;</div>';
        } else {
            h += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
            h += '<tr style="background:#f8f9fa"><th style="text-align:left;padding:6px 8px;color:#666;font-size:10px;text-transform:uppercase;border-bottom:1px solid #e0e0e0">Type</th>';
            h += '<th style="text-align:left;padding:6px 8px;color:#666;font-size:10px;text-transform:uppercase;border-bottom:1px solid #e0e0e0">Item</th>';
            h += '<th style="text-align:left;padding:6px 8px;color:#666;font-size:10px;text-transform:uppercase;border-bottom:1px solid #e0e0e0">Due</th>';
            h += '<th style="text-align:left;padding:6px 8px;color:#666;font-size:10px;text-transform:uppercase;border-bottom:1px solid #e0e0e0">Status</th></tr>';
            ps.items.sort((a,b)=>a.days-b.days).forEach(i => {
                const bg=i.days<0?'#fef2f2':i.days<=7?'#fefce8':'#fff';
                const sc=i.days<0?'#e53935':i.days<=7?'#f59e0b':'#3b82f6';
                const st=i.days<0?Math.abs(i.days)+'d overdue':i.days===0?'Today':i.days+'d';
                h += '<tr style="background:'+bg+'"><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;font-weight:600">'+i.type+'</td>';
                h += '<td style="padding:6px 8px;border-bottom:1px solid #f0f0f0">'+i.item+'</td>';
                h += '<td style="padding:6px 8px;border-bottom:1px solid #f0f0f0">'+fmtDate(i.dueDate)+'</td>';
                h += '<td style="padding:6px 8px;border-bottom:1px solid #f0f0f0"><span style="background:'+sc+';color:#fff;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:700">'+st+'</span></td></tr>';
            });
            h += '</table>';
        }
        h += '</div>';
    });

    h += '</div><div style="background:#f8f9fa;padding:16px 28px;font-size:11px;color:#888;border-top:1px solid #e0e0e0">';
    h += 'SafeNotify.PRO &mdash; Highland Holidays Weekly Summary &mdash; '+now+'<br>Omnibosh Safety Solutions Ltd</div></div>';
    return h;
}

// ── PLAIN TEXT ─────────────────────────────────────────────────────────────
function buildText(parkName, items, scoreData) {
    const now = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
    let t = 'SAFESYSTEMS.PRO — WEEKLY COMPLIANCE DIGEST\nOmnibosh Safety Solutions Ltd\n\n';
    t += 'This is your automated weekly compliance digest from SafeSystems.PRO, managed on behalf of Highland Holidays by Omnibosh Safety Solutions Ltd.\n\n';
    t += 'Park: '+parkName+'\nDate: '+now+'\n';
    if (scoreData?.overall!==null&&scoreData?.overall!==undefined) t += 'Compliance Score: '+scoreData.overall+'% ('+scoreData.assessedCount+'/'+scoreData.totalCount+' categories assessed)\n';
    t += 'Items Due (30d): '+items.length+'\n\n';
    if (scoreData) {
        t += 'MODULE SETUP STATUS\n';
        scoreData.scores.forEach(s => { t += '  '+s.label+': '+(s.noData?'NOT SET UP - '+s.note:s.pct+'% ('+s.ok+'/'+s.total+')')+'\n'; });
        t += '\n';
    }
    if (items.length===0) { t += 'No items due within 30 days.\n'; }
    else {
        [{l:'OVERDUE',f:i=>i.days<0},{l:'DUE WITHIN 7 DAYS',f:i=>i.days>=0&&i.days<=7},{l:'DUE WITHIN 14 DAYS',f:i=>i.days>7&&i.days<=14},{l:'DUE WITHIN 30 DAYS',f:i=>i.days>14}].forEach(b => {
            const bi=items.filter(b.f); if(bi.length===0) return;
            t += b.l+' ('+bi.length+')\n';
            bi.forEach(i => { t += '  > '+i.type+': '+i.item+'\n    Due: '+fmtDate(i.dueDate)+' ('+(i.days<0?Math.abs(i.days)+' days overdue':i.days+' days')+')\n'; });
            t += '\n';
        });
        t += 'ACTION REQUIRED: All overdue items must be addressed immediately.\n';
    }
    t += '\nSafeNotify.PRO - '+now+' - Omnibosh Safety Solutions Ltd\n';
    return t;
}

// ── SEND PARK DIGEST ───────────────────────────────────────────────────────
async function sendDigest(parkName, items, scoreData, weekDelta, monthDelta) {
    const cfg=PARKS[parkName]; const oc=items.filter(i=>i.days<0).length;
    const subject='SafeSystems.PRO — '+cfg.short+' Weekly Compliance Digest — '+oc+' overdue, '+items.length+' due';
    try {
        await resend.emails.send({from:FROM_NAME+' <'+FROM_EMAIL+'>',to:[cfg.email],cc:[OMNIBOSH],subject,html:buildHtml(parkName,items,scoreData,weekDelta,monthDelta),text:buildText(parkName,items,scoreData)});
        console.log('  OK '+cfg.short+': sent ('+items.length+' items, score: '+(scoreData?.overall??'n/a')+'%)');
        return true;
    } catch(err) { console.error('  FAIL '+cfg.short+': '+err.message); return false; }
}

// ── SEND ANDREW DIGEST ─────────────────────────────────────────────────────
async function sendAndrewDigest(parkScores, weekHistory, monthHistory) {
    const totalItems=parkScores.reduce((a,ps)=>a+ps.items.length,0);
    const totalOverdue=parkScores.reduce((a,ps)=>a+ps.items.filter(i=>i.days<0).length,0);
    const subject='SafeSystems.PRO — Highland Holidays Weekly Summary — '+totalOverdue+' overdue across all parks';
    try {
        await resend.emails.send({from:FROM_NAME+' <'+FROM_EMAIL+'>',to:[DIRECTORS_EMAIL],cc:[OMNIBOSH],subject,
            html:buildAndrewHtml(parkScores,weekHistory,monthHistory),
            text:parkScores.map(ps=>buildText(ps.parkName,ps.items,ps.scoreData)).join('\n\n---\n\n')});
        console.log('  OK Andrew: sent ('+totalItems+' items, '+totalOverdue+' overdue)');
        return true;
    } catch(err) { console.error('  FAIL Andrew: '+err.message); return false; }
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
    console.log('SafeNotify.PRO — Weekly Compliance Scan');
    console.log('Date: '+new Date().toLocaleString('en-GB')+'\n');

    console.log('Loading historical scores...');
    const weekHistory = await loadHistoricalScore(7);
    const monthHistory = await loadHistoricalScore(28);
    console.log('  Last week (7d): '+(weekHistory?'found ('+weekHistory.date+')':'no data yet'));
    console.log('  Last month (28d): '+(monthHistory?'found ('+monthHistory.date+')':'no data yet'));

    const allItems = await scanAll();
    const pd={}; Object.keys(PARKS).forEach(p=>pd[p]=[]);
    allItems.forEach(item => {
        Object.keys(PARKS).forEach(pn => {
            const ip=(item.park||'').toLowerCase();
            if(ip.includes(PARKS[pn].slug)||ip.includes(pn.split(' ')[0].toLowerCase())) pd[pn].push(item);
        });
    });

    console.log('\nBuilding compliance scores...');
    const parkScores=[];
    for (const pn of Object.keys(PARKS)) {
        const scoreData=await buildScore(pn);
        const notSetUp=scoreData.totalCount-scoreData.assessedCount;
        console.log('  '+PARKS[pn].short+': '+(scoreData.overall??'n/a')+'% ('+scoreData.assessedCount+'/'+scoreData.totalCount+' assessed'+(notSetUp>0?', '+notSetUp+' not set up':'')+')');
        parkScores.push({parkName:pn,items:pd[pn],scoreData});
    }

    console.log('\nSaving scores to Firebase...');
    await saveScores(parkScores);

    console.log('\nSending park emails...');
    let sent=0,fail=0;
    for (const ps of parkScores) {
        const wDelta=scoreDelta(ps.scoreData?.overall,weekHistory,ps.parkName);
        const mDelta=scoreDelta(ps.scoreData?.overall,monthHistory,ps.parkName);
        const ok=await sendDigest(ps.parkName,ps.items,ps.scoreData,wDelta,mDelta);
        if(ok)sent++;else fail++;
        await new Promise(r=>setTimeout(r,500));
    }

    console.log('\nSending Andrew combined digest...');
    await sendAndrewDigest(parkScores,weekHistory,monthHistory);

    console.log('\nDone. Park emails: '+sent+' sent, '+fail+' failed');
    process.exit(fail>0?1:0);
}
main().catch(err=>{console.error('FATAL:',err);process.exit(1);});
