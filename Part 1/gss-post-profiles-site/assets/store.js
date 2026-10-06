/*
  Storage for review responses.

  Every Agree box, Comment box and added task goes through window.Store.

  1. Answers are written to this browser first (localStorage), so nothing is lost if the connection drops.
  2. If Firebase has loaded, the contributor's whole set of answers is then copied to Firestore:
       collection  GSS_REVIEW_COLLECTION  (set in firebase-config.js)
       document    one per contributor, keyed by an id made on their first visit and kept on their device
       fields      who {name, post}, updated, count, submitted, submittedAt, responsesJson (the answers as text)
  3. "Send my responses" marks the document as submitted and, where Storage allows it, saves a copy of the
     answers as a file in Firebase Storage under <collection>/<id>.json.

  Keys inside the answers look like:
    p06|core|C03        profile 06, core function C03          fields: agree, comment
    p06|duty|t1234      profile 06, draft task 1234
    p06|other           profile 06, added tasks                 field: rows (a list)
    gap|06-G03          gap 03 of profile 06 (shared by the profile page and the gaps page)
    ra|<slug>|H04       risk assessment hazard 4
    _who                the reader's name and post              fields: name, post
*/
(function () {
  var NAME = 'gss-post-profiles-v1', IDKEY = 'gss-post-profiles-id';
  var COLL = window.GSS_REVIEW_COLLECTION || 'gss_org_review';
  var cache = null, listeners = [], statusFns = [], db = null, timer = null, state = 'local', meta = null;

  function read() {
    if (cache) return cache;
    try { cache = JSON.parse(window.localStorage.getItem(NAME) || '{}'); } catch (e) { cache = {}; }
    return cache;
  }
  function writeLocal() { try { window.localStorage.setItem(NAME, JSON.stringify(cache)); return true; } catch (e) { return false; } }
  function myId() {
    var id = null;
    try { id = window.localStorage.getItem(IDKEY); } catch (e) { /* ignore */ }
    if (!id) {
      id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      try { window.localStorage.setItem(IDKEY, id); } catch (e) { /* ignore */ }
    }
    return id;
  }
  function setState(s) { state = s; statusFns.forEach(function (fn) { fn(s); }); }
  function count(d) { return Object.keys(d).filter(function (k) { return k !== '_who'; }).length; }

  function connect() {
    if (db) return db;
    try {
      if (!window.firebase || !window.GSS_FIREBASE_CONFIG) return null;
      if (!(firebase.apps && firebase.apps.length)) firebase.initializeApp(window.GSS_FIREBASE_CONFIG);
      db = firebase.firestore();
    } catch (e) { db = null; }
    return db;
  }
  function record(extra) {
    var d = read(), w = d._who || {};
    var doc = { format: 'gss-post-profile-responses-1', who: { name: (w.name || '').trim(), post: (w.post || '').trim() }, updated: new Date().toISOString(), count: count(d), responsesJson: JSON.stringify(d) };
    if (extra) Object.keys(extra).forEach(function (k) { doc[k] = extra[k]; });
    return doc;
  }
  function push(extra) {
    if (!connect()) { setState('local'); return Promise.resolve(false); }
    setState('saving');
    return db.collection(COLL).doc(myId()).set(record(extra), { merge: true })
      .then(function () { setState('cloud'); return true; })
      .catch(function () { setState('error'); return false; });
  }
  function schedule() { window.clearTimeout(timer); timer = window.setTimeout(function () { push(); }, 1200); }

  window.Store = {
    load: function () { return read(); },
    set: function (key, field, value) {
      var d = read();
      if (!d[key]) d[key] = {};
      var empty = value === '' || value == null || (Array.isArray(value) && !value.length);
      if (empty) { delete d[key][field]; if (Object.keys(d[key]).every(function (f) { return f === '_at'; })) delete d[key]; }
      else { d[key][field] = value; d[key]._at = new Date().toISOString(); }
      var ok = writeLocal();
      listeners.forEach(function (fn) { fn(key, field, value); });
      schedule();
      return ok;
    },
    clear: function () {
      cache = {}; writeLocal();
      if (connect()) return db.collection(COLL).doc(myId()).delete().catch(function () { /* ignore */ });
      return Promise.resolve();
    },
    onChange: function (fn) { listeners.push(fn); },
    onStatus: function (fn) { statusFns.push(fn); fn(state); },
    status: function () { return state; },
    central: function () { return !!connect(); },
    // Mark this contributor's answers as sent, and keep a file copy in Storage where that is allowed.
    submit: function () {
      var now = new Date().toISOString();
      return push({ submitted: true, submittedAt: now }).then(function (ok) {
        if (!ok) return { saved: false, file: false };
        try {
          if (!firebase.storage) return { saved: true, file: false };
          return firebase.storage().ref(COLL + '/' + myId() + '.json')
            .putString(JSON.stringify({ format: 'gss-post-profile-responses-1', who: record().who, exported: now, responses: read() }), 'raw', { contentType: 'application/json' })
            .then(function () { return { saved: true, file: true }; }, function () { return { saved: true, file: false }; });
        } catch (e) { return { saved: true, file: false }; }
      });
    },
    // Everyone's answers, for the Collate responses page.
    loadAll: function () {
      if (!connect()) return Promise.reject(new Error('The central store is not available on this page.'));
      return db.collection(COLL).get().then(function (snap) {
        var out = [];
        snap.forEach(function (doc) {
          var x = doc.data() || {}, r = {};
          try { r = JSON.parse(x.responsesJson || '{}'); } catch (e) { r = {}; }
          out.push({ who: x.who || {}, exported: x.submittedAt || x.updated || '', submitted: !!x.submitted, responses: r });
        });
        return out;
      });
    }
  };
  // Copy anything already on this device up to the central store when a page opens.
  if (connect() && count(read())) schedule(); else setState(connect() ? 'cloud-idle' : 'local');
})();
