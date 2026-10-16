/* Collate responses: merge every contributor's data file into one set, in the browser. Nothing is uploaded anywhere. */
(function () {
  var R = window.Review, sets = [];   // each: { who: {name, post}, exported, responses }
  var $ = function (id) { return document.getElementById(id); };
  // Renames and hides made on this page are kept in this browser only (the central store is not changed).
  var FIXKEY = 'gss-collate-fixes', fixes = {};
  try { fixes = JSON.parse(window.localStorage.getItem(FIXKEY) || '{}'); } catch (e) { fixes = {}; }
  var saveFixes = function () { try { window.localStorage.setItem(FIXKEY, JSON.stringify(fixes)); } catch (e) { /* ignore */ } };
  var keyOf = function (s) { return (s.who.name + '|' + s.who.post).toLowerCase(); };

  function add(obj, label) {
    if (!obj || typeof obj.responses !== 'object') throw new Error(label + ' is not a responses data file');
    var w = obj.who || obj.responses._who || {};
    var fx = obj.id && fixes[obj.id];
    if (fx && fx.hide) return;
    if (fx && fx.name) w = { name: fx.name, post: fx.post || '' };
    var s = { id: obj.id, who: { name: (w.name || 'Unnamed (' + label + ')').trim(), post: (w.post || '').trim() }, exported: obj.exported || '', responses: obj.responses };
    // a later file from the same person replaces their earlier one
    sets = sets.filter(function (x) { return keyOf(x) !== keyOf(s) || (x.exported > s.exported); });
    if (!sets.some(function (x) { return keyOf(x) === keyOf(s); })) sets.push(s);
  }
  function rows() {
    var out = [];
    sets.forEach(function (s) { R.flat(s.responses).forEach(function (r) { r.name = s.who.name; r.post = s.who.post; out.push(r); }); });
    return out.sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : a.name < b.name ? -1 : 1; });
  }
  function draw() {
    var all = rows(), tb = $('cwho').querySelector('tbody'); tb.innerHTML = '';
    sets.forEach(function (s) {
      var mine = all.filter(function (r) { return r.name === s.who.name && r.post === s.who.post; });
      var tr = document.createElement('tr');
      [s.who.name, s.who.post, mine.length, mine.filter(function (r) { return r.agree === 'Y'; }).length, mine.filter(function (r) { return r.agree === 'N'; }).length,
        mine.filter(function (r) { return r.comment; }).length, s.exported ? new Date(s.exported).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : ''].forEach(function (t) { var td = document.createElement('td'); td.textContent = t; tr.appendChild(td); });
      var ta = document.createElement('td');
      if (s.id) {
        var mk = function (label, fn) { var b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = label; b.addEventListener('click', fn); ta.appendChild(b); ta.appendChild(document.createTextNode(' ')); };
        mk('Name this record', function () {
          var nm = window.prompt('Name for this record:', /^Unnamed/.test(s.who.name) ? '' : s.who.name); if (!nm || !nm.trim()) return;
          var po = window.prompt('Post for this record:', s.who.post) || '';
          var w = { name: nm.trim(), post: po.trim() };
          Promise.resolve(Store.fix ? Store.fix(s.id, { adminWho: w }) : Promise.reject(new Error('no central store')))
            .catch(function (e) { fixes[s.id] = w; saveFixes(); window.alert('Could not save this to the central store (' + e.message + '). It is saved on this browser only.'); })
            .then(function () { s.who = w; draw(); });
        });
        mk('Hide', function () {
          if (!window.confirm('Hide this record for everyone who uses this page? The answers stay in the central store.')) return;
          Promise.resolve(Store.fix ? Store.fix(s.id, { hidden: true }) : Promise.reject(new Error('no central store')))
            .catch(function (e) { fixes[s.id] = { hide: true }; saveFixes(); window.alert('Could not save this to the central store (' + e.message + '). It is hidden on this browser only.'); })
            .then(function () { sets = sets.filter(function (x) { return x !== s; }); draw(); });
        });
      }
      tr.appendChild(ta);
      tb.appendChild(tr);
    });
    $('cstatus').textContent = sets.length ? sets.length + ' contributor' + (sets.length === 1 ? '' : 's') + ', ' + all.length + ' responses in all.' : 'No files added yet.';
    var q = $('cq').value.trim().toLowerCase(), show = $('cshow').value, tb2 = $('call').querySelector('tbody'), n = 0; tb2.innerHTML = '';
    all.forEach(function (r) {
      if (show === 'flag' && r.agree !== 'N' && !r.comment) return;
      if (q && (r.where + ' ' + r.line + ' ' + r.comment + ' ' + r.name).toLowerCase().indexOf(q) === -1) return;
      n++; var tr = document.createElement('tr');
      [r.where, r.ref, r.line, r.name + (r.post ? ' (' + r.post + ')' : ''), r.agree, r.comment].forEach(function (t) { var td = document.createElement('td'); td.textContent = t; tr.appendChild(td); });
      tb2.appendChild(tr);
    });
    $('cn').textContent = n + ' shown';
    var sel = $('rp-who'), keep = sel.value; sel.innerHTML = '';
    sets.forEach(function (x, i) { var o = document.createElement('option'); o.value = i; o.textContent = x.who.name + (x.who.post ? ' (' + x.who.post + ')' : ''); sel.appendChild(o); });
    if (keep && sel.querySelector('option[value="' + keep + '"]')) sel.value = keep;
  }
  var stamp = function () { return new Date().toISOString().slice(0, 10); };
  var need = function () { if (sets.length) return true; window.alert('Add at least one contributor file first.'); return false; };

  $('cfiles').addEventListener('change', function (ev) {
    var files = Array.prototype.slice.call(ev.target.files), left = files.length, bad = [];
    if (!left) return;
    files.forEach(function (f) {
      var rd = new FileReader();
      rd.onload = function () { try { add(JSON.parse(rd.result), f.name); } catch (e) { bad.push(f.name); } if (--left === 0) { draw(); if (bad.length) window.alert('These files could not be read as responses data files:\n' + bad.join('\n')); } };
      rd.readAsText(f);
    });
    ev.target.value = '';
  });
  $('c-unfix').addEventListener('click', function () { fixes = {}; saveFixes(); sets = []; draw(); window.alert('Renames and hides cleared. Load the responses again to see every record.'); });
  // Review pack: loads the Word and Excel libraries and the profile wording only when a button is pressed
  var loaded = null;
  var loadJs = function (src) { return new Promise(function (ok, no) { var el = document.createElement('script'); el.src = src; el.onload = ok; el.onerror = function () { no(new Error('Could not load ' + src)); }; document.head.appendChild(el); }); };
  var ensurePack = function () {
    if (loaded) return loaded;
    loaded = loadJs('assets/vendor/docx-8.5.0.umd.js?v=1').then(function () { return loadJs('assets/vendor/xlsx-0.18.5.full.min.js?v=1'); })
      .then(function () { return loadJs('assets/xref.js?v=1'); }).then(function () { return loadJs('assets/reviewpack.js?v=1'); })
      .then(function () { return fetch('assets/gss-logo.png').then(function (r) { return r.arrayBuffer(); }).then(function (b) { return new Uint8Array(b); }, function () { return null; }); });
    loaded.catch(function () { loaded = null; });
    return loaded;
  };
  var saveBlob = function (name, blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
  var safe = function (t) { return String(t || 'person').replace(/[^A-Za-z0-9]+/g, '_'); };
  var pack = function (what) {
    if (!need()) return;
    var msg = $('rp-msg'), idx = parseInt($('rp-who').value, 10), chosen = what === 'all' ? sets : [sets[idx]];
    if (!chosen[0]) { msg.textContent = 'Choose a person first.'; return; }
    msg.textContent = 'Building...';
    ensurePack().then(function (logo) {
      var M = window.ReviewPack.buildModel(chosen, window.XREF);
      if (what === 'word') {
        return window.docx.Packer.toBlob(window.ReviewPack.wordDoc(M[0], window.docx, logo)).then(function (b) { saveBlob('GSS_Post_Review_Sheet_' + safe(M[0].who.name) + '_' + stamp() + '.docx', b); });
      }
      var wb = window.ReviewPack.workbook(M, window.XLSX), out = window.XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      saveBlob('GSS_Action_Register_' + (what === 'all' ? 'ALL' : safe(M[0].who.name)) + '_' + stamp() + '.xlsx', new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    }).then(function () { msg.textContent = 'Downloaded.'; }, function (e) { msg.textContent = 'Could not build the file: ' + e.message; });
  };
  $('rp-word').addEventListener('click', function () { pack('word'); });
  $('rp-one').addEventListener('click', function () { pack('one'); });
  $('rp-all').addEventListener('click', function () { pack('all'); });

  $('c-reset').addEventListener('click', function () { sets = []; draw(); });
  $('cq').addEventListener('input', draw); $('cshow').addEventListener('change', draw);

  $('c-csv').addEventListener('click', function () {
    if (!need()) return;
    var out = [['Contributor', 'Post', 'Where', 'Ref', 'Line', 'Agree', 'Comment', 'Saved', 'Key']];
    rows().forEach(function (r) { out.push([r.name, r.post, r.where, r.ref, r.line, r.agree, r.comment, r.at, r.key]); });
    R.saveFile('GSS_post_profile_responses_ALL_' + stamp() + '.csv', R.csv(out), 'text/csv');
  });
  $('c-sum').addEventListener('click', function () {
    if (!need()) return;
    var by = {}, order = [];
    rows().forEach(function (r) {
      var id = r.key + (r.ref.indexOf('Added') === 0 ? '|' + r.name + '|' + r.ref : '');
      if (!by[id]) { by[id] = { where: r.where, ref: r.ref, line: r.line, y: [], n: [], c: [], key: r.key }; order.push(id); }
      if (r.agree === 'Y') by[id].y.push(r.name); if (r.agree === 'N') by[id].n.push(r.name);
      if (r.ref.indexOf('Added') === 0) by[id].c.push('Added by ' + r.name + (r.post ? ' (' + r.post + ')' : '') + (r.comment ? '. ' + r.comment : ''));
      else if (r.comment) by[id].c.push(r.name + ': ' + r.comment);
    });
    var out = [['Where', 'Ref', 'Line', 'Agreed (Y)', 'Not agreed (N)', 'Agreed by', 'Not agreed by', 'Comments', 'Key']];
    order.forEach(function (id) { var b = by[id]; out.push([b.where, b.ref, b.line, b.y.length, b.n.length, b.y.join('; '), b.n.join('; '), b.c.join(' || '), b.key]); });
    R.saveFile('GSS_post_profile_responses_SUMMARY_' + stamp() + '.csv', R.csv(out), 'text/csv');
  });
  $('c-json').addEventListener('click', function () {
    if (!need()) return;
    R.saveFile('GSS_post_profile_responses_ALL_' + stamp() + '.json', JSON.stringify({ format: 'gss-post-profile-responses-combined-1', combined: new Date().toISOString(), contributors: sets,
      rows: rows().map(function (r) { return { contributor: r.name, post: r.post, where: r.where, ref: r.ref, line: r.line, agree: r.agree, comment: r.comment, saved: r.at, key: r.key }; }) }, null, 1), 'application/json');
  });

  // If the store can return everyone's responses (a central store), offer that as well as files.
  if (window.Store && typeof Store.loadAll === 'function') {
    var b = $('c-live'); b.hidden = false;
    b.addEventListener('click', function () {
      Promise.resolve(Store.loadAll()).then(function (list) { (list || []).forEach(function (o, n) { try { add(o, 'record ' + (n + 1)); } catch (e) { /* skip */ } }); draw(); })
        .catch(function (e) { window.alert('Could not load from the central store: ' + e.message); });
    });
  }
  draw();
})();
