"""
Pre-deploy gate. Checks the BUILT output in dist/, not the source.

r376. This file previously ran three of its checks over ALPHABETICAL PREFIXES of
the page list (pages[:80], pages[:150], pages[:250] out of 960). Because
sorted(rglob) starts at dist/about/, dist/index.html sorts at position 693, so
the single most valuable page on the site was never checked for a Google Fonts
reference, for JSON-LD validity, or for dead internal links. A critic proved it
by injecting all three defects into dist/index.html and getting RESULT: PASS.

Every check now runs over EVERY page. The file is read once and reused, which
is what made the slicing feel necessary in the first place. If a check ever does
need to sample, it must go through `sample()` below, which is seeded and always
force-includes the homepage and every locale root.
"""
import html as htmlmod
import json, pathlib, random, re, sys, collections

sys.path.insert(0, 'scripts')
from genlib import lint_text

D = pathlib.Path('dist')
fails, warns = [], []
LOC = re.compile(r'^(ar|hi|bn|ur)(/|$)')

def rel(f):
    r = str(f.parent.relative_to(D))
    return '/' if r == '.' else f'/{r}/'

pages = sorted(D.rglob('index.html'))
# Read once. Every check below works off this, so full coverage costs one pass.
DOC = {f: f.read_text(errors='ignore') for f in pages}
REL = {f: rel(f) for f in pages}

# The pages that must never be sampled out, whatever any future check does.
ALWAYS = {D / 'index.html'} | {D / loc / 'index.html' for loc in ('ar', 'hi', 'bn', 'ur')}
missing_always = [str(p) for p in ALWAYS if p not in DOC]
if missing_always:
    fails.append(f'expected page not built: {missing_always}')

def sample(n, seed=1375):
    """Seeded random subset that ALWAYS contains the homepage and locale roots.
    Never take an alphabetical prefix: dist/index.html sorts at 693 of 960."""
    forced = [p for p in ALWAYS if p in DOC]
    rest = [p for p in pages if p not in set(forced)]
    rnd = random.Random(seed)
    return forced + rnd.sample(rest, min(n, len(rest)))

# ---------------------------------------------------------------- 1. headings
multi_h1 = [(REL[f], len(re.findall(r'<h1[ >]', h))) for f, h in DOC.items() if len(re.findall(r'<h1[ >]', h)) > 1]
no_h1 = [REL[f] for f, h in DOC.items() if '<h1' not in h]
if multi_h1: fails.append(f'{len(multi_h1)} pages with multiple h1: {multi_h1[:5]}')
if no_h1: fails.append(f'{len(no_h1)} pages with no h1: {no_h1[:5]}')

# ------------------------------------------------- 2. hreflang page vs sitemap
sm = (D / 'sitemap-0.xml').read_text()
sm_langs = collections.Counter(re.findall(r'hreflang="([^"]+)"', sm))
page_langs = set()
for f, h in DOC.items():
    if 'noindex' in h: continue
    page_langs |= set(re.findall(r'<link rel="alternate" hreflang="([^"]+)"', h))
if set(sm_langs) != page_langs:
    fails.append(f'hreflang mismatch: sitemap {sorted(sm_langs)} vs pages {sorted(page_langs)}')
if 'x-default' not in sm_langs:
    fails.append('sitemap has no x-default')

# html lang must match the URL's locale on every page
lang_mismatch = []
for f, h in DOC.items():
    m = re.search(r'<html lang="([^"]+)"', h)
    want = REL[f].lstrip('/').split('/')[0]
    want = want if want in ('ar', 'hi', 'bn', 'ur') else 'en'
    if m and m.group(1) != want: lang_mismatch.append((REL[f], m.group(1)))
if lang_mismatch: fails.append(f'{len(lang_mismatch)} html lang mismatches: {lang_mismatch[:5]}')

# ------------------------------------------------------ 3. meta length + canonical
long_t, long_d, no_canon = [], [], []
for f, h in DOC.items():
    if not re.search(r'<link rel="canonical"', h): no_canon.append(REL[f])
    if LOC.match(REL[f].lstrip('/')): continue
    t = re.search(r'<title>(.*?)</title>', h, re.S)
    d = re.search(r'<meta name="description" content="(.*?)"', h, re.S)
    tv = htmlmod.unescape(t.group(1)) if t else ''
    dv = htmlmod.unescape(d.group(1)) if d else ''
    if tv and len(tv) > 60: long_t.append((len(tv), REL[f]))
    if dv and len(dv) > 155: long_d.append((len(dv), REL[f]))
if no_canon: fails.append(f'{len(no_canon)} pages with no canonical: {no_canon[:5]}')
if long_t: warns.append(f'{len(long_t)} EN titles over 60: {sorted(long_t, reverse=True)[:5]}')
if long_d: warns.append(f'{len(long_d)} EN descriptions over 155: {sorted(long_d, reverse=True)[:5]}')

# ------------------------------------- 4. no indexable locale may render English
def prose_ratio(h):
    h = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', ' ', h, flags=re.S | re.I)
    h = re.sub(r'<[^>]+>', ' ', h)
    letters = [c for c in h if c.isalpha()]
    if len(letters) < 200: return None
    return sum(1 for c in letters if not c.isascii()) / len(letters)

english_fallback, lowest = [], (1.0, None)
for f, h in DOC.items():
    if not LOC.match(REL[f].lstrip('/')): continue
    if 'noindex' in h: continue   # not indexed, not in the sitemap; reported separately
    r = prose_ratio(h)
    if r is None: continue
    if r < lowest[0]: lowest = (r, REL[f])
    if r < 0.45: english_fallback.append((round(r, 2), REL[f]))
if english_fallback:
    fails.append(f'{len(english_fallback)} indexable localised pages rendering English: {sorted(english_fallback)[:8]}')

# ------------------------------------------------ 5. internal links resolve, EVERY page
built = set(REL.values())
extra = {'/404/'}
ASSET = re.compile(r'\.(png|svg|ico|xml|txt|json|webmanifest|css|js|pdf|webp|jpe?g|woff2?)$')
dead = collections.Counter()
for f, h in DOC.items():
    for href in re.findall(r'href="(/[^"#?]*)"', h):
        if href.startswith('/_astro/') or ASSET.search(href): continue
        if not href.endswith('/'):
            dead[f'NO TRAILING SLASH {href}'] += 1; continue
        if href in built or href in extra: continue
        if (D / href.strip('/')).exists(): continue
        dead[href] += 1
if dead: fails.append(f'{len(dead)} dead/bad internal link targets: {list(dead.items())[:8]}')

# --------------------------------------------- 6. house rules, EVERY page
em = [REL[f] for f, h in DOC.items() if '—' in h]
if em: fails.append(f'{len(em)} pages containing an em dash: {em[:5]}')
goog = [REL[f] for f, h in DOC.items() if 'fonts.googleapis' in h or 'fonts.gstatic' in h]
if goog: fails.append(f'{len(goog)} pages referencing Google Fonts: {goog[:5]}')

# The invented-claim linter used to see GENERATED CONTENT only, never the shared
# layout, which is how "4.9/5 · 73 business reviews" shipped on 350 pages
# underneath a gate written to catch exactly that. It now runs over the rendered
# document, where the layout finally is.
VISIBLE = re.compile(r'<(script|style)\b[^>]*>.*?</\1>', re.S | re.I)
claim_hits = collections.Counter()
for f, h in DOC.items():
    text = re.sub(r'<[^>]+>', ' ', VISIBLE.sub(' ', h))
    for problem in lint_text(htmlmod.unescape(text)):
        claim_hits[problem.split(':')[0]] += 1
if claim_hits:
    fails.append(f'unsupported-claim patterns in rendered pages: {dict(claim_hits)}')

# A rating in JSON-LD is a policy violation on top of a copy one.
agg = [REL[f] for f, h in DOC.items() if 'AggregateRating' in h or '"ratingValue"' in h]
if agg: fails.append(f'{len(agg)} pages with AggregateRating structured data: {agg[:5]}')

# ------------------------------------------------- 7. JSON-LD parses, EVERY page
bad_ld = []
for f, h in DOC.items():
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S):
        try: json.loads(block)
        except Exception as e: bad_ld.append((REL[f], str(e)[:50]))
if bad_ld: fails.append(f'{len(bad_ld)} unparseable JSON-LD blocks: {bad_ld[:3]}')

noindexed = sum(1 for h in DOC.values() if 'noindex' in h)
print(f'pages checked: {len(pages)} (ALL of them; {noindexed} noindex, excluded from the sitemap)')
print(f'homepage in set: {(D / "index.html") in DOC}  locale roots: {sum(1 for p in ALWAYS if p in DOC) - 1}/4')
print(f'sitemap urls: {len(re.findall("<loc>", sm))}')
print(f'sitemap hreflang: {dict(sm_langs)}')
print(f'lowest non-Latin ratio on an indexable localised page: {lowest[0]:.3f} at {lowest[1]}')
print()
for w in warns: print('WARN ', w)
for x in fails: print('FAIL ', x)
print()
print('RESULT:', 'FAIL' if fails else 'PASS')
sys.exit(1 if fails else 0)
