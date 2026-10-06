/* Wires the Agree and Comment boxes, added task rows, page filters and the My responses page to window.Store. */
(function () {
  var data = Store.load();
  var q = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Agree, Comment and name fields
  q('[data-k][data-f]').forEach(function (el) {
    if (el.closest('.addrows')) return;
    var k = el.getAttribute('data-k'), f = el.getAttribute('data-f');
    if (data[k] && data[k][f] != null) el.value = data[k][f];
    var ev = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(ev, function () { Store.set(k, f, el.value.trim ? el.value.trim() === '' ? '' : el.value : el.value); });
  });

  // "Other tasks" rows
  q('.addrows').forEach(function (box) {
    var k = box.getAttribute('data-k');
    var rows = (data[k] && data[k].rows) || [];
    function save() {
      var out = q('.row', box).map(function (r) { return q('input', r).map(function (i) { return i.value; }); })
        .filter(function (r) { return r.join('').trim() !== ''; });
      Store.set(k, 'rows', out);
    }
    function add(vals) {
      var r = document.createElement('div'); r.className = 'row';
      ['Task', 'How often', 'Document or record it relies on, if any'].forEach(function (ph, n) {
        var i = document.createElement('input'); i.type = 'text'; i.placeholder = ph; i.setAttribute('aria-label', ph); i.value = (vals && vals[n]) || '';
        i.addEventListener('input', save); r.appendChild(i);
      });
      var x = document.createElement('button'); x.type = 'button'; x.className = 'btn'; x.textContent = 'Remove';
      x.addEventListener('click', function () { r.remove(); save(); }); r.appendChild(x);
      box.appendChild(r);
    }
    rows.forEach(add);
    if (!rows.length) add();
    q('.addrow[data-target="' + k + '"]').forEach(function (b) { b.addEventListener('click', function () { add(); }); });
  });

  // Home page: find a post
  var pq = document.getElementById('pq');
  if (pq) pq.addEventListener('input', function () {
    var v = pq.value.trim().toLowerCase();
    q('table.posts tbody tr').forEach(function (tr) { tr.hidden = v !== '' && tr.getAttribute('data-title').indexOf(v) === -1; });
  });

  // Gaps page: filters
  var gt = document.getElementById('gaps');
  if (gt) {
    var gq = document.getElementById('gq'), gp = document.getElementById('gp'), gb = document.getElementById('gb'), gty = document.getElementById('gt'), gn = document.getElementById('gn');
    var apply = function () {
      var v = gq.value.trim().toLowerCase(), n = 0;
      q('tbody tr', gt).forEach(function (tr) {
        var ok = (!gp.value || tr.getAttribute('data-post') === gp.value) && (!gb.value || tr.getAttribute('data-band') === gb.value) &&
          (!gty.value || tr.getAttribute('data-type') === gty.value) && (!v || tr.textContent.toLowerCase().indexOf(v) !== -1);
        tr.hidden = !ok; if (ok) n++;
      });
      gn.textContent = n + ' shown';
    };
    [gq, gp, gb, gty].forEach(function (el) { el.addEventListener('input', apply); el.addEventListener('change', apply); });
    apply();
  }

  // Save indicator
  var ss = document.getElementById('savestate');
  if (ss && Store.onStatus) Store.onStatus(function (st) {
    ss.textContent = { local: 'Answers save on this device.', saving: 'Saving...', cloud: 'Answers saved.', 'cloud-idle': '', error: 'Could not reach the central store. Answers are saved on this device.' }[st] || '';
  });

  // Shared helpers: turn a storage key into words a person can read
  var ITEMS = window.ITEMS || {}, TITLES = window.TITLES || {}, RAT = window.RATITLES || {}, SECT = window.SECT || {};
  var where = function (k) {
    var p = k.split('|');
    if (p[0] === 'gap') return (TITLES['p' + p[1].slice(0, 2)] || 'Profile ' + p[1].slice(0, 2)) + ': gap';
    if (p[0] === 'ra') return 'Risk assessment: ' + (RAT[p[1]] || p[1].replace(/_/g, ' ')) + (p[2] && p[2].charAt(0) === 'H' ? ': hazard' : ': point to confirm');
    return (TITLES[p[0]] || p[0]) + ': ' + (p[1] === 'other' ? 'added task' : (SECT[p[1]] || p[1] || ''));
  };
  var ref = function (k) { var p = k.split('|'); return p[0] === 'gap' ? p[1] : p[p.length - 1]; };
  var flat = function (d) {
    var out = [];
    Object.keys(d).sort().forEach(function (k) {
      if (k === '_who') return;
      if (d[k].rows) d[k].rows.forEach(function (r, n) { out.push({ key: k, where: where(k), ref: 'Added ' + (n + 1), line: r[0] || '', agree: '', comment: [r[1] ? 'How often: ' + r[1] : '', r[2] ? 'Relies on: ' + r[2] : ''].filter(Boolean).join('. '), at: d[k]._at || '' }); });
      if (d[k].agree || d[k].comment) out.push({ key: k, where: where(k), ref: ref(k), line: ITEMS[k] || '', agree: d[k].agree || '', comment: d[k].comment || '', at: d[k]._at || '' });
    });
    return out;
  };
  var saveFile = function (name, text, type) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  };
  var csv = function (rows) { return '﻿' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n'); };
  window.Review = { where: where, ref: ref, flat: flat, saveFile: saveFile, csv: csv };

  // My responses page
  var rt = document.getElementById('rtable');
  if (rt && !document.getElementById('call')) {
    var draw = function () {
      var rows = flat(Store.load()), tb = rt.querySelector('tbody'); tb.innerHTML = '';
      rows.forEach(function (r) {
        var tr = document.createElement('tr');
        [r.where, r.ref, r.line, r.agree, r.comment].forEach(function (t) { var td = document.createElement('td'); td.textContent = t; tr.appendChild(td); });
        tb.appendChild(tr);
      });
      document.getElementById('rcount').textContent = rows.length + ' response' + (rows.length === 1 ? '' : 's') + ' saved on this device.';
    };
    var who = function () { var w = Store.load()._who || {}; return { name: (w.name || '').trim(), post: (w.post || '').trim() }; };
    var named = function () {
      var w = who();
      if (w.name && w.post) return true;
      window.alert('Please enter your name and your post first, so your answers can be told apart from other people\'s.');
      document.getElementById(w.name ? 'who-post' : 'who-name').focus(); return false;
    };
    var stamp = function () { return new Date().toISOString().slice(0, 10); };
    var tag = function () { return who().name.replace(/[^A-Za-z0-9]+/g, '_'); };
    document.getElementById('dl-csv').addEventListener('click', function () {
      if (!named()) return;
      var w = who(), rows = [['Name', 'Post', 'Where', 'Ref', 'Line', 'Agree', 'Comment', 'Saved', 'Key']];
      flat(Store.load()).forEach(function (r) { rows.push([w.name, w.post, r.where, r.ref, r.line, r.agree, r.comment, r.at, r.key]); });
      saveFile('GSS_post_profile_responses_' + tag() + '_' + stamp() + '.csv', csv(rows), 'text/csv');
    });
    document.getElementById('dl-json').addEventListener('click', function () {
      if (!named()) return;
      saveFile('GSS_post_profile_responses_' + tag() + '_' + stamp() + '.json', JSON.stringify({ format: 'gss-post-profile-responses-1', who: who(), exported: new Date().toISOString(), responses: Store.load() }, null, 1), 'application/json');
    });
    document.getElementById('clear').addEventListener('click', function () {
      if (window.confirm('Clear every response of yours, on this device and in the central store? This cannot be undone.')) { Promise.resolve(Store.clear()).then(function () { window.location.reload(); }); }
    });
    document.getElementById('send').addEventListener('click', function () {
      if (!named()) return;
      var msg = document.getElementById('sendmsg'); msg.hidden = false; msg.textContent = 'Sending...';
      Promise.resolve(Store.submit ? Store.submit() : { saved: false }).then(function (r) {
        msg.textContent = r.saved ? 'Sent. ' + flat(Store.load()).length + (flat(Store.load()).length === 1 ? ' response from ' : ' responses from ') + who().name + ' (' + who().post + ') are with the Risk and Compliance Manager. You can keep answering and send again; the latest set replaces the earlier one.'
          : 'The central store could not be reached, so nothing was sent. Your answers are still saved on this device. Download the data file and send it to the Risk and Compliance Manager.';
      });
    });
    draw();
  }
})();
