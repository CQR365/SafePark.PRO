/* Review pack: for one contributor, a Word review sheet to go through with them, and an Excel action register.
   Built in the browser from the responses on the Collate page and assets/xref.js (the profile wording, sources and documents). */
(function (root) {
  var PLURAL = { core: 'Core functions', quals: 'Qualifications and experience', duty: 'Company duties', doc: 'Duties from documents', iso: 'ISO responsibilities' };
  var LABEL = { core: 'Core function', quals: 'Qualification or experience', duty: 'Company duty', doc: 'Duty from a document', iso: 'ISO responsibility' };
  var ORDER = ['core', 'quals', 'duty', 'doc', 'iso'];
  var CODE = /\b(IMSP|SMM|QMF|PRC|POL|RA|CHK|VSL|FORM|EP|CYB|WI|HBK|CI|EHQMS|TRA|HS|H&S)\s?(\d{1,3}[a-z]?(?:\.\d+)?)\b/gi;
  var TRAINWORDS = /train|course|certificat|qualif|competen|licen|ticket|refresher|cpd/i;

  function codes(t) { var out = [], m; CODE.lastIndex = 0; while ((m = CODE.exec(t || ''))) out.push((m[1] + ' ' + m[2]).toUpperCase().replace('H&S', 'HS')); return out.filter(function (c, i) { return out.indexOf(c) === i; }); }

  // Which lines (in any profile) rely on each document in force
  function docIndex(X) {
    var ix = {};
    Object.keys(X.items).forEach(function (k) { var it = X.items[k]; codes(it.docNow).forEach(function (c) { (ix[c] = ix[c] || []).push(k); }); });
    return ix;
  }

  function buildModel(sets, X) {
    var dix = docIndex(X);
    return sets.map(function (s) {
      var byPost = {};
      var ensure = function (pid) { return byPost[pid] || (byPost[pid] = { pid: pid, title: (X.posts[pid] || {}).title || pid, total: 0, agreed: [], action: [], unanswered: [], added: [], cpd: (X.posts[pid] || {}).cpd || [], bodies: (X.posts[pid] || {}).bodies || [] }); };
      Object.keys(s.responses || {}).forEach(function (k) { if (k !== '_who' && X.items[k]) ensure(X.items[k].post); else if (k !== '_who' && /^p\d\d\|other$/.test(k)) ensure(k.slice(0, 3)); });
      Object.keys(byPost).forEach(function (pid) {
        var P = byPost[pid];
        Object.keys(X.items).forEach(function (k) {
          var it = X.items[k]; if (it.post !== pid) return; P.total++;
          var r = (s.responses || {})[k] || {}, agree = r.agree || '', comment = (r.comment || '').trim();
          var L = { key: k, sec: it.sec, secLabel: LABEL[it.sec], secName: it.secName, ref: it.ref, line: it.line, source: it.source || '', standing: it.standing || '', docNow: it.docNow || '', draft: it.draft || '', note: it.note || '', agree: agree, comment: comment, affects: [], sameProfile: [], otherPosts: [] };
          if (agree === 'Y' && !comment) { P.agreed.push(L); return; }
          if (!agree && !comment) { P.unanswered.push(L); return; }
          // something to action: not agreed, or commented on
          L.affects.push('Job description: ' + LABEL[it.sec] + ' ' + it.ref);
          if (it.docNow) L.affects.push('Procedure or policy in force: ' + it.docNow);
          if (it.draft && agree === 'N') L.affects.push('Draft to update: ' + it.draft);
          if (it.sec === 'iso') L.affects.push('ISO clauses: ' + it.source);
          if (it.sec === 'quals' || TRAINWORDS.test(comment)) L.affects.push('Training and competence');
          var seenSame = {}, seenPost = {};
          codes(it.docNow).forEach(function (c) {
            (dix[c] || []).forEach(function (k2) {
              var o = X.items[k2]; if (k2 === k) return;
              if (o.post === pid) { var lab = o.secLabel || LABEL[o.sec]; var t = LABEL[o.sec] + ' ' + o.ref; if (!seenSame[t]) { seenSame[t] = 1; L.sameProfile.push(t); } }
              else { var tt = (X.posts[o.post] || {}).title || o.post; if (!seenPost[tt]) { seenPost[tt] = 1; L.otherPosts.push(tt); } }
            });
          });
          if (L.sameProfile.length) L.affects.push('Also relied on by ' + L.sameProfile.length + ' other line' + (L.sameProfile.length === 1 ? '' : 's') + ' in this profile');
          if (L.otherPosts.length) L.affects.push('Also relied on by other posts: ' + L.otherPosts.slice(0, 6).join(', ') + (L.otherPosts.length > 6 ? ' and ' + (L.otherPosts.length - 6) + ' more' : ''));
          P.action.push(L);
        });
        var rows = ((s.responses || {})[pid + '|other'] || {}).rows || [];
        rows.forEach(function (r, n) { if ((r || []).join('').trim()) P.added.push({ ref: 'Added ' + (n + 1), line: r[0] || '', often: r[1] || '', relies: r[2] || '' }); });
        var ord = function (a, b) { return ORDER.indexOf(a.sec) - ORDER.indexOf(b.sec) || (a.key < b.key ? -1 : 1); };
        P.action.sort(ord); P.agreed.sort(ord); P.unanswered.sort(ord);
        P.training = P.action.filter(function (l) { return l.sec === 'quals' || l.affects.indexOf('Training and competence') !== -1; });
        P.quals = Object.keys(X.items).filter(function (k) { return X.items[k].post === pid && X.items[k].sec === 'quals'; }).map(function (k) { var it = X.items[k], r = (s.responses || {})[k] || {}; return { ref: it.ref, line: it.line, level: it.standing, basis: it.source, agree: r.agree || '', comment: (r.comment || '').trim() }; });
      });
      return { who: s.who, exported: s.exported, posts: Object.keys(byPost).sort().map(function (p) { return byPost[p]; }) };
    });
  }

  var ans = function (l) { return (l.agree === 'N' ? 'Not agreed' : l.agree === 'Y' ? 'Agreed' : 'No answer') + (l.comment ? ' with a comment' : ''); };

  /* ---------- Excel action register ---------- */
  function workbook(models, XLSX) {
    var A = [['Post', 'Person', 'Section', 'Ref', 'Line (job description wording)', 'Answer', 'Their comment', 'Source', 'Document in force today', 'Draft that replaces it (not approved)', 'Also relied on in this profile', 'Also relied on by posts', 'What it affects', 'Discussion and solution', 'Decision', 'Owner', 'Due', 'Status', 'Key']];
    var T = [['Post', 'Person', 'Ref', 'Requirement', 'Level', 'Their answer', 'Their comment', 'Evidence held (Y/N)', 'Gap (Y/N)', 'Training action', 'Owner', 'Due', 'Status']];
    var N = [['Post', 'Person', 'Ref', 'Task added by the post holder', 'How often', 'Relies on', 'Source document', 'Decision (add to profile / procedure / no)', 'Owner', 'Due', 'Status']];
    var G = [['Post', 'Person', 'Section', 'Ref', 'Line', 'Source', 'Document in force today']];
    models.forEach(function (m) {
      m.posts.forEach(function (P) {
        P.action.forEach(function (l) { A.push([P.title, m.who.name, l.secLabel, l.ref, l.line, ans(l), l.comment, l.source, l.docNow, l.draft, l.sameProfile.join('; '), l.otherPosts.join('; '), l.affects.join(' | '), '', '', '', '', 'Open', l.key]); });
        P.quals.forEach(function (q) { T.push([P.title, m.who.name, q.ref, q.line, q.level, q.agree === 'N' ? 'Not agreed' : q.agree === 'Y' ? 'Agreed' : 'No answer', q.comment, '', '', '', '', '', 'Open']); });
        P.added.forEach(function (a) { N.push([P.title, m.who.name, a.ref, a.line, a.often, a.relies, '', '', '', '', 'Open']); });
        P.agreed.forEach(function (l) { G.push([P.title, m.who.name, l.secLabel, l.ref, l.line, l.source, l.docNow]); });
      });
    });
    var wb = XLSX.utils.book_new();
    var add = function (name, rows, widths) { var ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = widths.map(function (w) { return { wch: w }; }); ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length - 1, 0), c: widths.length - 1 } }) }; XLSX.utils.book_append_sheet(wb, ws, name); };
    add('Actions', A, [24, 18, 18, 8, 60, 18, 40, 40, 40, 36, 28, 36, 50, 40, 16, 14, 12, 10, 18]);
    add('Training gaps', T, [24, 18, 8, 60, 18, 14, 40, 14, 10, 40, 14, 12, 10]);
    add('Added tasks', N, [24, 18, 10, 50, 14, 36, 30, 28, 14, 12, 10]);
    add('Agreed', G, [24, 18, 18, 8, 60, 40, 40]);
    return wb;
  }

  /* ---------- Word review sheet ---------- */
  function wordDoc(model, D, logo) {
    var P_ = D.Paragraph, R = D.TextRun, T = D.Table, TR = D.TableRow, TC = D.TableCell, W = D.WidthType;
    var FONT = 'Arial';
    var run = function (t, o) { o = o || {}; return new R({ text: String(t == null ? '' : t), font: FONT, size: o.size || 18, bold: !!o.bold, italics: !!o.italics, color: o.color || '000000' }); };
    var para = function (t, o) { o = o || {}; return new P_({ children: [run(t, o)], spacing: { before: o.before || 0, after: o.after == null ? 60 : o.after }, keepNext: !!o.keepNext, alignment: o.align }); };
    var h1 = function (t) { return new P_({ children: [run(t, { size: 28, bold: true })], heading: D.HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 }, keepNext: true }); };
    var h2 = function (t) { return new P_({ children: [run(t, { size: 22, bold: true })], heading: D.HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 }, keepNext: true }); };
    var h3 = function (t) { return new P_({ children: [run(t, { size: 19, bold: true })], spacing: { before: 140, after: 60 }, keepNext: true }); };
    var BORDER = { style: D.BorderStyle.SINGLE, size: 4, color: '000000' };
    var borders = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
    var cell = function (content, w, o) {
      o = o || {};
      var lines = Array.isArray(content) ? content : [content];
      return new TC({ width: { size: w, type: W.DXA }, borders: borders, margins: { top: 50, bottom: 50, left: 80, right: 80 }, shading: o.head ? { type: D.ShadingType.CLEAR, fill: 'D9D9D9', color: 'auto' } : undefined,
        children: lines.map(function (t) { return new P_({ children: [run(t, { size: 16, bold: !!o.head || !!o.bold })], spacing: { after: 20 } }); }) });
    };
    var table = function (heads, widths, rows) {
      var tot = widths.reduce(function (a, b) { return a + b; }, 0);
      var out = [new TR({ tableHeader: true, cantSplit: true, children: heads.map(function (h, i) { return cell(h, widths[i], { head: true }); }) })];
      rows.forEach(function (r) { out.push(new TR({ cantSplit: true, children: r.map(function (c, i) { return cell(c, widths[i]); }) })); });
      return new T({ width: { size: tot, type: W.DXA }, columnWidths: widths, rows: out });
    };
    var W_ = 15400; // A4 landscape, 1 cm margins
    var kids = [];
    var date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    kids.push(h1('Post review sheet'));
    kids.push(para('Post holder: ' + model.who.name + (model.who.post ? ' (' + model.who.post + ')' : ''), { bold: true, size: 20 }));
    kids.push(para('Prepared ' + date + ' from the answers sent in' + (model.exported ? ' (latest ' + new Date(model.exported).toLocaleDateString('en-GB') + ')' : '') + '. Draft documents are named only as drafts and are not approved.', { size: 16 }));
    model.posts.forEach(function (P) {
      kids.push(h2(P.title));
      kids.push(para(P.total + ' lines in the profile. Agreed: ' + P.agreed.length + '. Not agreed or commented on, to action: ' + P.action.length + '. No answer: ' + P.unanswered.length + '. Tasks added by the post holder: ' + P.added.length + '.', { size: 18 }));
      // Part 1
      kids.push(h3('Part 1. Lines to action'));
      if (!P.action.length) kids.push(para('Nothing to action. Every answered line is agreed with no comment.'));
      var cur = '';
      var heads = ['Ref', 'Line as written in the profile', 'Source and document in force today', 'Their answer and comment', 'What it affects', 'Solution agreed', 'Owner and date'];
      var wid = [700, 3600, 3000, 2500, 2700, 1900, 1000];
      ORDER.forEach(function (sec) {
        var rows = P.action.filter(function (l) { return l.sec === sec; });
        if (!rows.length) return;
        kids.push(para(PLURAL[sec], { bold: true, size: 17, before: 80, keepNext: true }));
        kids.push(table(heads, wid, rows.map(function (l) {
          var src = []; if (l.source) src.push('Source: ' + l.source); if (l.docNow) src.push('In force today: ' + l.docNow); if (l.draft) src.push('Draft (not approved): ' + l.draft); if (l.note) src.push('Note: ' + l.note);
          return [l.ref, l.line, src.length ? src : '', [ans(l)].concat(l.comment ? [l.comment] : []), l.affects, '', ''];
        })));
      });
      // Part 2 training
      kids.push(h3('Part 2. Qualifications, training and competence'));
      kids.push(para('Every qualification line in the profile with the post holder\'s answer. Complete the last three columns in the meeting.', { size: 16 }));
      kids.push(table(['Ref', 'Requirement', 'Level', 'Their answer and comment', 'Evidence held (Y/N)', 'Gap and training action', 'Owner and date'], [700, 4300, 1500, 3000, 1300, 3400, 1200],
        P.quals.map(function (q) { return [q.ref, q.line, q.level, [q.agree === 'N' ? 'Not agreed' : q.agree === 'Y' ? 'Agreed' : 'No answer'].concat(q.comment ? [q.comment] : []), '', '', '']; })));
      var other = P.training.filter(function (l) { return l.sec !== 'quals'; });
      if (other.length) { kids.push(para('Other lines where the comment points to training or competence:', { bold: true, size: 16, before: 80, keepNext: true })); kids.push(table(['Ref', 'Line', 'Their comment', 'Training action', 'Owner and date'], [700, 5200, 4300, 3500, 1700], other.map(function (l) { return [l.ref, l.line, l.comment, '', '']; }))); }
      if (P.cpd.length) { kids.push(para('Continuing professional development in the profile:', { bold: true, size: 16, before: 80, keepNext: true })); kids.push(table(['Item', 'How often', 'Source', 'Applies', 'Held (Y/N)', 'Action'], [4500, 1500, 3600, 1600, 1200, 3000], P.cpd.map(function (c) { return c.concat(['', '']); }))); }
      // Part 3 added
      kids.push(h3('Part 3. Tasks added by the post holder'));
      if (!P.added.length) kids.push(para('None added.'));
      else kids.push(table(['Ref', 'Task', 'How often', 'Relies on', 'Source document', 'Decision', 'Owner and date'], [800, 4500, 1400, 3000, 2400, 2300, 1000], P.added.map(function (a) { return [a.ref, a.line, a.often, a.relies, '', '', '']; })));
      // Part 4 agreed
      kids.push(h3('Part 4. Agreed lines'));
      kids.push(para('Agreed with no comment. These form the confirmed part of the role and responsibilities list.', { size: 16 }));
      ORDER.forEach(function (sec) {
        var rows = P.agreed.filter(function (l) { return l.sec === sec; });
        if (!rows.length) return;
        kids.push(para(PLURAL[sec], { bold: true, size: 17, before: 80, keepNext: true }));
        kids.push(table(['Ref', 'Line as written in the profile', 'Source', 'Document in force today'], [800, 7000, 4200, 3400], rows.map(function (l) { return [l.ref, l.line, l.source, l.docNow]; })));
      });
      // Part 5 unanswered
      kids.push(h3('Part 5. No answer yet'));
      if (!P.unanswered.length) kids.push(para('Every line has an answer.'));
      else kids.push(table(['Ref', 'Section', 'Line'], [900, 2400, 12100], P.unanswered.map(function (l) { return [l.ref, l.secLabel, l.line]; })));
    });
    kids.push(h3('Review record'));
    kids.push(table(['Reviewed with', 'Reviewed by', 'Date', 'Next review'], [4500, 4500, 3000, 3400], [['', '', '', '']]));
    var children = logo ? [new P_({ children: [new D.ImageRun({ data: logo, transformation: { width: 100, height: 49 } })], spacing: { after: 60 } })].concat(kids) : kids;
    return new D.Document({
      creator: 'Gareloch Support Services (Plant) Ltd', title: 'Post review sheet: ' + model.who.name,
      styles: { default: { document: { run: { font: FONT, size: 18 } } } },
      sections: [{ properties: { page: { size: { width: 11906, height: 16838, orientation: D.PageOrientation.LANDSCAPE }, margin: { top: 567, bottom: 567, left: 567, right: 567 } } },
        footers: { default: new D.Footer({ children: [new P_({ children: [run('Gareloch Support Services (Plant) Ltd. Post review sheet for ' + model.who.name + '. Page ', { size: 14 }), new D.TextRun({ children: [D.PageNumber.CURRENT], font: FONT, size: 14 })] })] }) },
        children: children }]
    });
  }

  var api = { buildModel: buildModel, workbook: workbook, wordDoc: wordDoc, codes: codes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ReviewPack = api;
})(typeof window !== 'undefined' ? window : this);
