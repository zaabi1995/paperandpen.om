"""
Translate blog MDX into the locales that were falling back to English.

Found in r375: /hi/blog/*, /bn/blog/* and /ur/blog/* rendered the ENGLISH post
body while declaring lang="hi" / "bn" / "ur", self-canonicalling and claiming an
hreflang alternate for a translation that did not exist. The blog was authored
in en and ar only and the route's English fallback covered the gap silently.
"""
import pathlib, re, sys
sys.path.insert(0, 'scripts')
from genlib import call, scrub, nonlatin_ratio, parallel

LOCALES = {'ar': 'Arabic', 'hi': 'Hindi', 'bn': 'Bengali', 'ur': 'Urdu'}
SRC = pathlib.Path('src/content/blog/en')

PROMPT = """Translate this Markdown blog post into {lang}. It is published on paperandpen.om, the site for Paper & Pen, a free cloud ERP and invoicing product, and it is read by business owners and bookkeepers.

Return the COMPLETE document: the YAML frontmatter block between --- fences, then the body. No code fence around the whole thing, no commentary before or after.

Frontmatter rules:
- `locale:` must become "{loc}"
- `slug:`, `pubDate:`, `author:` and the `tags:` array stay EXACTLY as they are, untranslated (slug is a URL, tags are machine keys)
- `title:` and `description:` are translated. Keep description under 155 characters.

Body rules:
- Keep every Markdown structure exactly: heading levels, list markers, bold and italic markers, links, tables, block quotes, code spans. Translate the link TEXT but never the URL inside the parentheses.
- Keep all numbers, currency codes and arithmetic unchanged. Do not convert currencies.
- "Paper & Pen" is a product name and stays in Latin script.
- Use the accounting vocabulary a {lang}-speaking bookkeeper actually uses. Where a term is normally left in English in {lang} business practice, leave it in English.
- NEVER use an em dash. No emojis.
- Translate the WHOLE post. Do not summarise, do not shorten, do not drop sections.

DOCUMENT:
{doc}"""

def job(j):
    src, loc = j
    dst = pathlib.Path(f'src/content/blog/{loc}/{src.name}')
    if dst.exists() and '--force' not in sys.argv:
        return True, 'exists'
    raw = src.read_text()
    en_heads = len(re.findall(r'^#{2,3} ', raw, re.M))
    last = ''
    for _ in range(3):
        p = PROMPT.format(lang=LOCALES[loc], loc=loc, doc=raw)
        if last: p += f'\n\nA previous attempt failed with: {last}. Fix exactly that.'
        try:
            out = call(p, model='gemini-3.5-flash', temp=0.3, max_tokens=32768, json_mode=False)
        except Exception as e:
            last = repr(e)[:100]; continue
        out = out.strip()
        if out.startswith('```'):
            out = re.sub(r'^```[a-z]*\n?', '', out); out = re.sub(r'\n?```$', '', out)
        out = scrub(out)
        probs = []
        if not out.startswith('---'): probs.append('no frontmatter')
        m = re.match(r'^---\n(.*?)\n---\n(.*)$', out, re.S)
        if not m: probs.append('frontmatter unparseable')
        else:
            fm, body = m.groups()
            fm = re.sub(r'^locale:.*$', f'locale: "{loc}"', fm, flags=re.M)
            for key in ('slug', 'pubDate', 'author', 'tags'):
                orig = re.search(rf'^{key}:.*$', raw, re.M)
                if orig:
                    if re.search(rf'^{key}:.*$', fm, re.M):
                        fm = re.sub(rf'^{key}:.*$', orig.group(0), fm, flags=re.M)
                    else:
                        probs.append(f'lost {key}')
            got_heads = len(re.findall(r'^#{2,3} ', body, re.M))
            if got_heads < en_heads - 1: probs.append(f'headings {got_heads} vs {en_heads}')
            r = nonlatin_ratio(body)
            if r < 0.6: probs.append(f'not translated ({r:.2f})')
            if len(body) < len(raw) * 0.45: probs.append('body truncated')
            if '—' in out: probs.append('em dash')
            if not probs:
                dst.parent.mkdir(parents=True, exist_ok=True)
                dst.write_text(f'---\n{fm}\n---\n{body.lstrip()}')
                return True, ''
        last = '; '.join(probs)
    return False, last

only = [a for a in sys.argv[1:] if not a.startswith('--')]
srcs = [f for f in sorted(SRC.glob('*.mdx')) if not only or f.stem in only]
jobs = [(s, loc) for s in srcs for loc in LOCALES]
parallel(jobs, job, workers=6, label='blog mdx')
