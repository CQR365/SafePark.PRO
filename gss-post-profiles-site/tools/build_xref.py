"""Builds assets/xref.js: for every answerable line on the post pages, the line, its source and the document it relies on.
Run from the site folder:  python3 tools/build_xref.py
The collate page uses it to make the per person review sheet and the action register."""
import glob, json, re, os
from bs4 import BeautifulSoup

SKIP = {'s8', 's9', 's10', 's11', 's12'}          # hidden gap sections, job advert, sources
txt = lambda e: re.sub(r'\s+', ' ', e.get_text(' ', strip=True)) if e else ''
posts, items = {}, {}

for f in sorted(glob.glob('post/*.html')):
    s = BeautifulSoup(open(f, encoding='utf-8').read(), 'html.parser')
    title = txt(s.find('h1'))
    pid = None
    for e in s.find_all(attrs={'data-k': True}):
        m = re.match(r'(p\d\d)\|', e['data-k'])
        if m: pid = m.group(1); break
    if not pid: continue
    post = {'title': title, 'file': os.path.basename(f), 'cpd': [], 'bodies': [], 'purpose': ''}
    for sec in s.find_all('section'):
        sid = sec.get('id')
        if sid in SKIP: continue
        heading = txt(sec.find('h2'))
        for t in sec.find_all('table'):
            hdr = [txt(th) for th in t.find_all('th')]
            for tr in t.find_all('tr')[1:]:
                cells = {h: txt(td) for h, td in zip(hdr, tr.find_all('td'))}
                ks = [e['data-k'] for e in tr.find_all(attrs={'data-k': True}) if e.get('data-f') in ('agree', 'comment')]
                if sid == 's1' and 'Purpose' in cells: post['purpose'] = cells['Purpose']
                if sid == 's3' and 'Body' in cells: post['bodies'].append([cells.get('Body', ''), cells.get('Standing', ''), cells.get('Position at the Company', '')])
                if sid == 's5' and 'Item' in cells: post['cpd'].append([cells.get('Item', ''), cells.get('How often', ''), cells.get('Source', ''), cells.get('Applies', '')])
                if not ks: continue
                k = ks[0]; parts = k.split('|')
                if parts[0] == 'gap' or len(parts) < 3 or parts[1] in ('unowned',): continue
                kind = parts[1]
                it = {'sec': kind, 'secName': heading, 'ref': parts[2][1:] if kind == 'doc' and parts[2].startswith('d') else parts[2], 'post': pid}
                if kind == 'core':
                    it.update(line=cells.get('Core function', ''), source=cells.get('Source', ''), standing=cells.get('Standing', ''))
                elif kind == 'quals':
                    it.update(line=cells.get('Requirement', ''), source=cells.get('Basis', ''), standing=cells.get('Level', ''))
                elif kind == 'doc':
                    it.update(line=cells.get('What it gives the post to do', ''), docNow=cells.get('Document in force today', ''), draft=cells.get('Draft that replaces it', ''), standing='Tasks: ' + cells.get('Tasks', ''))
                elif kind == 'duty':
                    it.update(line=cells.get('Duty', ''), docNow=cells.get('Document in force today', ''), source=cells.get('Where it comes from', ''), note=cells.get('Note', ''))
                elif kind == 'iso':
                    it.update(line=cells.get('Responsibility', ''), source=cells.get('ISO clauses', ''), standing=cells.get('Ref', ''))
                else:
                    continue
                items[k] = it
    posts[pid] = post

out = 'window.XREF=' + json.dumps({'posts': posts, 'items': items}, ensure_ascii=False, separators=(',', ':')) + ';\n'
open('assets/xref.js', 'w', encoding='utf-8').write(out)
print(len(posts), 'posts,', len(items), 'lines,', len(out) // 1024, 'KB')
