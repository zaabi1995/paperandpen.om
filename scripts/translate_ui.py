"""
Fill the gaps in the four non-English UI dictionaries.

useTranslations() falls back to English for a missing key, which means a new key
added to en.json alone does not break the build, does not fail a test and does
not show up as an error anywhere: it silently prints English in the middle of an
Arabic page. This walks the dictionaries, finds every key en.json has that a
locale does not, translates only those, and writes them back into place.
"""
import json, pathlib, sys, collections
sys.path.insert(0, 'scripts')
from genlib import call, parse_json, scrub, nonlatin_ratio

LOCALES = {'ar': 'Arabic', 'hi': 'Hindi', 'bn': 'Bengali', 'ur': 'Urdu'}
UI = pathlib.Path('src/i18n/ui')

def flatten(d, pre=''):
    out = {}
    for k, v in d.items():
        key = f'{pre}.{k}' if pre else k
        if isinstance(v, dict): out.update(flatten(v, key))
        else: out[key] = v
    return out

def setpath(d, dotted, val):
    parts = dotted.split('.')
    for p in parts[:-1]:
        d = d.setdefault(p, collections.OrderedDict())
    d[parts[-1]] = val

en = json.loads((UI / 'en.json').read_text(), object_pairs_hook=collections.OrderedDict)
flat_en = flatten(en)

PROMPT = """Translate these user-interface strings for paperandpen.om into {lang}. This is the navigation, headings and microcopy of a business software marketing site, read by business owners and bookkeepers.

Return a JSON object with the SAME KEYS and the translated values. Nothing added, nothing removed.

Rules:
- "Paper & Pen" is a product name: keep it in Latin script, untranslated, everywhere including after the " · " separator in a metaTitle.
- Keep any {{{{variable}}}} placeholder exactly as written, including its braces. Do not translate the variable name.
- Any value ending in a title used as a page <title> must stay 60 characters or fewer; a meta description must stay 155 characters or fewer.
- Use the terminology a {lang}-speaking bookkeeper actually uses. Where a term is normally left in English in {lang} business practice, leave it in English.
- NEVER use an em dash. No emojis.
- These are short interface labels: keep them short. A nav label that wraps to two lines breaks the layout.

STRINGS:
{doc}"""

for loc, lang in LOCALES.items():
    f = UI / f'{loc}.json'
    d = json.loads(f.read_text(), object_pairs_hook=collections.OrderedDict)
    flat = flatten(d)
    missing = {k: v for k, v in flat_en.items() if k not in flat and isinstance(v, str)}
    if not missing:
        print(loc, 'complete'); continue
    print(loc, len(missing), 'missing keys')
    got = {}
    items = list(missing.items())
    for i in range(0, len(items), 40):
        chunk = dict(items[i:i + 40])
        for attempt in range(3):
            try:
                out = scrub(parse_json(call(PROMPT.format(lang=lang, doc=json.dumps(chunk, ensure_ascii=False, indent=1)),
                                            model='gemini-3.5-flash', temp=0.25)))
            except Exception as e:
                print('  retry', repr(e)[:80]); continue
            if set(out) != set(chunk):
                continue
            blob = ' '.join(str(v) for v in out.values())
            if nonlatin_ratio(blob) < 0.4:
                continue
            got.update(out); break
        else:
            print('  chunk failed', i)
    for k, v in got.items():
        setpath(d, k, v)
    f.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
    still = [k for k in missing if k not in got]
    print(f'  {loc}: wrote {len(got)}, still missing {len(still)}', still[:6])
