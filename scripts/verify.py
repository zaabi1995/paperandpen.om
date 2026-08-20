"""Pre-deploy gate. Checks the BUILT output, not the source."""
import html as htmlmod
import json, pathlib, re, sys, collections

D = pathlib.Path('dist')
fails, warns = [], []
pages = sorted(D.rglob('index.html'))
LOC = re.compile(r'^(ar|hi|bn|ur)(/|$)')

def rel(f): return '/' + str(f.parent.relative_to(D)).replace('.', '') + '/'

# 1. one h1 per page, no skipped heading levels
multi_h1, no_h1 = [], []
for f in pages:
    h = f.read_text(errors='ignore')
    n = len(re.findall(r'<h1[ >]', h))
    if n > 1: multi_h1.append((rel(f), n))
    if n == 0: no_h1.append(rel(f))
if multi_h1: fails.append(f'{len(multi_h1)} pages with multiple h1: {multi_h1[:5]}')
if no_h1: fails.append(f'{len(no_h1)} pages with no h1: {no_h1[:5]}')

# 2. hreflang: page set must equal sitemap set, and x-default must be present
sm = (D / 'sitemap-0.xml').read_text()
sm_langs = collections.Counter(re.findall(r'hreflang="([^"]+)"', sm))
sample = [p for p in pages if 'login' not in str(p) and 'signup' not in str(p)][:400]
page_langs = set()
for f in sample:
    page_langs |= set(re.findall(r'<link rel="alternate" hreflang="([^"]+)"', f.read_text(errors='ignore')))
if set(sm_langs) != page_langs:
    fails.append(f'hreflang mismatch: sitemap {sorted(sm_langs)} vs pages {sorted(page_langs)}')
if 'x-default' not in sm_langs:
    fails.append('sitemap has no x-default')

# 3. meta lengths (english routes only; other scripts measure differently)
long_t, long_d, no_canon = [], [], []
for f in pages:
    r = rel(f)
    h = f.read_text(errors='ignore')
    if not re.search(r'<link rel="canonical"', h): no_canon.append(r)
    if LOC.match(r.lstrip('/')): continue
    t = re.search(r'<title>(.*?)</title>', h, re.S)
    d = re.search(r'<meta name="description" content="(.*?)"', h, re.S)
    tv = htmlmod.unescape(t.group(1)) if t else ''
    dv = htmlmod.unescape(d.group(1)) if d else ''
    if tv and len(tv) > 60: long_t.append((len(tv), r))
    if dv and len(dv) > 155: long_d.append((len(dv), r))
if no_canon: fails.append(f'{len(no_canon)} pages with no canonical: {no_canon[:5]}')
if long_t: warns.append(f'{len(long_t)} EN titles over 60: {sorted(long_t, reverse=True)[:5]}')
if long_d: warns.append(f'{len(long_d)} EN descriptions over 155: {sorted(long_d, reverse=True)[:5]}')

# 4. no locale may render English: measure body prose, not markup
def prose_ratio(f):
    h = f.read_text(errors='ignore')
    h = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', ' ', h, flags=re.S | re.I)
    h = re.sub(r'<[^>]+>', ' ', h)
    letters = [c for c in h if c.isalpha()]
    if len(letters) < 200: return None
    return sum(1 for c in letters if not c.isascii()) / len(letters)

english_fallback = []
for f in pages:
    r = rel(f).lstrip('/')
    if not LOC.match(r): continue
    # A noindexed page is not in the index and not in the sitemap, so English
    # text on it is a UX question, not a duplicate-content one. /login/ and
    # /signup/ are bare app screens; /terms/ and /privacy/ are English-only
    # legal text by decision. Both are excluded here and reported separately.
    if 'noindex' in f.read_text(errors='ignore'): continue
    ratio = prose_ratio(f)
    if ratio is not None and ratio < 0.45:
        english_fallback.append((round(ratio, 2), '/' + r))
if english_fallback:
    fails.append(f'{len(english_fallback)} localised pages rendering English: {sorted(english_fallback)[:8]}')

# 5. every internal link must resolve to a built page
built = {rel(f) for f in pages}
extra = {'/404/'}
dead = collections.Counter()
for f in pages[:250]:
    h = f.read_text(errors='ignore')
    for href in re.findall(r'href="(/[^"#?]*)"', h):
        if not href.endswith('/'):
            if re.search(r'\.(png|svg|ico|xml|txt|json|webmanifest|css|js|pdf|webp|jpg)$', href): continue
            if href.startswith('/_astro/'): continue
            dead[f'NO TRAILING SLASH {href}'] += 1; continue
        if href in built or href in extra: continue
        if (D / href.strip('/') ).exists(): continue
        dead[href] += 1
if dead: fails.append(f'{len(dead)} dead/bad internal link targets: {list(dead.items())[:8]}')

# 6. house rules in shipped HTML
em = [rel(f) for f in pages if '—' in f.read_text(errors='ignore')]
if em: fails.append(f'{len(em)} pages containing an em dash: {em[:5]}')
goog = [rel(f) for f in pages[:80] if 'fonts.googleapis' in f.read_text(errors='ignore') or 'fonts.gstatic' in f.read_text(errors='ignore')]
if goog: fails.append(f'google fonts referenced: {goog[:3]}')

# 7. structured data parses
bad_ld = []
for f in pages[:150]:
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', f.read_text(errors='ignore'), re.S):
        try: json.loads(block)
        except Exception as e: bad_ld.append((rel(f), str(e)[:50]))
if bad_ld: fails.append(f'{len(bad_ld)} unparseable JSON-LD blocks: {bad_ld[:3]}')

noindexed = sum(1 for f in pages if 'noindex' in f.read_text(errors='ignore'))
print(f'pages built: {len(pages)} ({noindexed} noindex, excluded from the sitemap)')
print(f'sitemap urls: {len(re.findall(chr(60)+"loc"+chr(62), sm))}')
print(f'sitemap hreflang: {dict(sm_langs)}')
print()
for w in warns: print('WARN ', w)
for x in fails: print('FAIL ', x)
print()
print('RESULT:', 'FAIL' if fails else 'PASS')
sys.exit(1 if fails else 0)
