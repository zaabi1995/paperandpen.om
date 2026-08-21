"""
Content generation harness for paperandpen.om.

Why this exists: the site loses on VOLUME, and every page has to exist in five
locales. Hand-authoring 5 x N pages does not scale, and the alternative the
critic warned about (thin filler) is worse than no page. So: authored specs and
a hard validator on this side, generation in between, and NOTHING ships that the
validator has not passed.

The validator is the point, not the model call. It enforces the house rules that
a generator will otherwise break: no em dashes, no invented statistics patterns,
meta length caps, slug integrity, related-link membership, and for translations,
key parity plus a non-Latin script ratio so a silently-untranslated file cannot
pass as translated.
"""
import json, os, pathlib, re, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

EM_DASH = '—'

def call(prompt, model='gemini-3.1-pro-preview', temp=0.55, tries=4, max_tokens=32768, json_mode=True):
    key = pathlib.Path('/tmp/.gk').read_text().strip()
    if not key:
        raise RuntimeError('/tmp/.gk is empty')
    endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key=' + key
    body = {
        'contents': [{'parts': [{'text': prompt}]}],
        'generationConfig': {
            'temperature': temp,
            'maxOutputTokens': max_tokens,
            **({'responseMimeType': 'application/json'} if json_mode else {}),
        },
    }
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(
                endpoint.format(m=model),
                data=json.dumps(body).encode(),
                headers={'Content-Type': 'application/json'},
            )
            with urllib.request.urlopen(req, timeout=600) as r:
                d = json.load(r)
            cand = d['candidates'][0]
            parts = cand.get('content', {}).get('parts', [])
            txt = ''.join(p.get('text', '') for p in parts)
            if not txt:
                last = 'empty:' + str(cand.get('finishReason'))
                time.sleep(3 + 4 * i); continue
            return txt
        except urllib.error.HTTPError as e:
            last = f'{e.code} {e.read().decode()[:200]}'
            time.sleep(5 + 8 * i)
        except Exception as e:
            last = repr(e)
            time.sleep(4 + 5 * i)
    raise RuntimeError(f'gemini failed: {last}')

def parse_json(txt):
    """Tolerant of the two things the API occasionally appends to a JSON
    response: a fence, and a second document after the first one."""
    txt = txt.strip()
    if txt.startswith('```'):
        txt = re.sub(r'^```[a-z]*\n?', '', txt)
        txt = re.sub(r'\n?```$', '', txt)
    try:
        return json.loads(txt)
    except json.JSONDecodeError:
        dec = json.JSONDecoder()
        obj, _ = dec.raw_decode(txt.lstrip())
        return obj

def scrub(obj):
    """Strip the two things a generator reliably gets wrong regardless of prompt:
    em dashes (house rule) and non-breaking spaces (they break word counts and
    copy-paste)."""
    if isinstance(obj, str):
        s = obj.replace(EM_DASH, ', ').replace('– ', ' to ').replace(' ', ' ')
        return re.sub(r'\s+,', ',', re.sub(r' {2,}', ' ', s)).strip()
    if isinstance(obj, list):
        return [scrub(x) for x in obj]
    if isinstance(obj, dict):
        return {k: scrub(v) for k, v in obj.items()}
    return obj

# Patterns that indicate an invented statistic or an unverifiable claim.
BANNED = [
    (r'\b\d{1,3}(\.\d+)?\s?%\s+of\s+(businesses|companies|smes|firms|invoices)', 'invented statistic'),
    (r'\b(studies|research|surveys?)\s+(show|shows|suggest|found)', 'unsourced research claim'),
    (r'\b(most|many)\s+(businesses|companies)\s+report\b', 'unsourced claim'),
    (r'\btrusted by\b|\bjoin \d', 'invented social proof'),
    (r'\b\d(\.\d)?\s?/\s?5\b|\b\d\.\d\s+stars?\b', 'invented rating'),
    (r'\bVAT (?:is|rate is) \d', 'hardcoded tax rate'),
    (r'\b(seamless|leverage|robust|game.chang|cutting.edge|empower)', 'slop vocabulary'),
]

def lint_text(blob, extra_banned=()):
    problems = []
    if EM_DASH in blob:
        problems.append('em dash')
    for pat, label in list(BANNED) + list(extra_banned):
        m = re.search(pat, blob, re.I)
        if m:
            problems.append(f'{label}: {m.group(0)[:60]!r}')
    return problems

LATIN = re.compile(r'[A-Za-z]')
def nonlatin_ratio(s):
    letters = [c for c in s if c.isalpha()]
    if not letters:
        return 1.0
    return 1 - (sum(1 for c in letters if LATIN.match(c)) / len(letters))

def parallel(jobs, fn, workers=6, label=''):
    """jobs: list of anything. fn(job) -> (ok: bool, msg: str)."""
    ok, fail = [], []
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(fn, j): j for j in jobs}
        for f in as_completed(futs):
            j = futs[f]
            try:
                good, msg = f.result()
            except Exception as e:
                good, msg = False, repr(e)[:200]
            (ok if good else fail).append((j, msg))
            print(f'  [{len(ok)+len(fail)}/{len(jobs)}] {"OK " if good else "FAIL"} {str(j)[:60]} {msg[:110]}', flush=True)
    print(f'{label} done: {len(ok)} ok, {len(fail)} failed')
    if fail:
        print('FAILED:', [str(j)[:40] for j, _ in fail])
    return ok, fail
