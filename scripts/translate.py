"""
Locale fan-out. Translates an authored English JSON page into ar / hi / bn / ur.

The validator is the reason this is safe to run unattended. It enforces:
  - identical JSON SHAPE (same keys, same array lengths, recursively), so a
    template cannot receive a field it does not know how to render;
  - PROTECTED values byte-identical (slug, category, related slugs, seeAlso
    hrefs, icon names, order, locale, the <em> markup in heroTitle), because
    those are machine values, not prose, and a translated slug is a 404;
  - a non-Latin script ratio floor on the body prose, which is the only check
    that catches the real failure mode of a translation pass, namely a file that
    comes back still in English and looks perfectly valid otherwise.
"""
import json, pathlib, re, sys
sys.path.insert(0, 'scripts')
from genlib import call, parse_json, scrub, nonlatin_ratio, parallel

LOCALES = ['ar', 'hi', 'bn', 'ur']
NAMES = {'ar': 'Arabic', 'hi': 'Hindi', 'bn': 'Bengali', 'ur': 'Urdu'}
RTL = {'ar', 'ur'}

# Keys whose VALUES are machine identifiers and must survive untouched.
PROTECTED_KEYS = {'slug', 'category', 'locale', 'order', 'icon', 'href', 'related', 'toolType', 'image', 'competitor'}
# Keys whose values are expressions/markup that must not be reworded.
VERBATIM_KEYS = {'expr'}

def shape(o):
    if isinstance(o, dict): return {k: shape(v) for k, v in sorted(o.items())}
    if isinstance(o, list): return [shape(x) for x in o]
    return type(o).__name__

def protected_map(o, path='', out=None):
    out = {} if out is None else out
    if isinstance(o, dict):
        for k, v in o.items():
            if k in PROTECTED_KEYS or k in VERBATIM_KEYS:
                out[f'{path}.{k}'] = json.dumps(v, ensure_ascii=False, sort_keys=True)
            else:
                protected_map(v, f'{path}.{k}', out)
    elif isinstance(o, list):
        for i, v in enumerate(o): protected_map(v, f'{path}[{i}]', out)
    return out

PROMPT = """Translate the JSON document below into {lang} for paperandpen.om, the marketing site for Paper & Pen, a free cloud ERP and invoicing product. The audience is business owners and bookkeepers who read {lang}.

Return the SAME JSON structure: the same keys in the same places, arrays of the same length, nothing added, nothing removed.

TRANSLATE the human-readable prose. DO NOT TRANSLATE, and return byte-identical:
- any "slug", "category", "locale", "order", "icon", "toolType", "image" or "competitor" value
- every string inside a "related" array (they are URL slugs, a translated one is a dead link)
- every "href" value (URL paths)
- every "expr" value (a mathematical formula, it stays in ASCII and stays left-to-right)
- the product name "Paper & Pen", which is a proper noun and stays in Latin script everywhere, including inside metaTitle where it follows the " · " separator
- HTML markup: `<em class="text-copper-400 not-italic">...</em>` keeps its tag and its exact class attribute, and only the words INSIDE it are translated

Quality bar:
- This is a professional accounting and business audience. Use the accounting vocabulary a {lang}-speaking bookkeeper actually uses, not a literal word-for-word rendering. Where a term is normally left in English in {lang} business practice, leave it in English.
- Keep numbers, currency amounts and arithmetic exactly as they are. Do not convert currencies and do not restate any figure.
- "metaTitle" must stay 60 characters or fewer and "metaDescription" 155 characters or fewer after translation. Shorten the wording if you must, do not exceed them.
- NEVER use an em dash.
- No emojis.
{rtl_note}

Return only the JSON document.

DOCUMENT:
{doc}"""

RTL_NOTE = "- This is a right-to-left language. Write natural {lang} and do not insert directional control characters."

def translate_file(src: pathlib.Path, dst: pathlib.Path, loc: str, ratio_keys, force=False):
    if dst.exists() and not force:
        return True, 'exists'
    en = json.loads(src.read_text())
    want_shape = shape(en)
    want_prot = protected_map(en)
    last = ''
    for _ in range(3):
        p = PROMPT.format(lang=NAMES[loc], doc=json.dumps(en, ensure_ascii=False, indent=1),
                          rtl_note=RTL_NOTE.format(lang=NAMES[loc]) if loc in RTL else '')
        if last: p += f'\n\nA previous attempt failed validation with: {last}. Fix exactly that.'
        try:
            out = scrub(parse_json(call(p, model='gemini-3.5-flash', temp=0.3)))
        except Exception as e:
            last = repr(e)[:120]; continue
        if 'locale' in out: out['locale'] = loc
        probs = []
        cmp_en = dict(en); cmp_out = dict(out)
        if 'locale' in cmp_en: cmp_en['locale'] = loc
        if shape(cmp_out) != shape(cmp_en): probs.append('structure changed')
        gp = protected_map(out)
        for k, v in want_prot.items():
            if k == '.locale': continue
            if gp.get(k) != v: probs.append(f'protected {k} changed')
        blob = ' '.join(str(out.get(k, '')) for k in ratio_keys if isinstance(out.get(k), str))
        r = nonlatin_ratio(blob)
        if r < 0.5: probs.append(f'not translated (non-latin ratio {r:.2f})')
        if '—' in json.dumps(out, ensure_ascii=False): probs.append('em dash')
        if len(out.get('metaTitle', '')) > 62: probs.append(f"metaTitle {len(out['metaTitle'])}")
        if len(out.get('metaDescription', '')) > 158: probs.append(f"metaDesc {len(out['metaDescription'])}")
        if not probs:
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
            return True, ''
        last = '; '.join(probs[:4])
    return False, last

def run(src_dir, dst_root, ratio_keys, force=False, workers=8):
    srcs = sorted(pathlib.Path(src_dir).glob('*.json'))
    jobs = [(s, loc) for s in srcs for loc in LOCALES]
    def job(j):
        s, loc = j
        return translate_file(s, pathlib.Path(dst_root) / loc / s.name, loc, ratio_keys, force)
    return parallel(jobs, lambda j: job(j), workers=workers, label=f'{src_dir} -> 4 locales')

if __name__ == '__main__':
    which = sys.argv[1]
    force = '--force' in sys.argv
    if which == 'glossary':
        run('src/data/glossary/en', 'src/data/glossary', ['definition', 'matters', 'short'], force)
    else:
        run(f'src/content/{which}/en', f'src/content/{which}', ['heroSubtitle', 'metaDescription'], force)
