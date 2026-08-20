import json, pathlib, sys, re
sys.path.insert(0, 'scripts')
from genlib import call, parse_json, scrub, lint_text, parallel

OUT = pathlib.Path('src/data/glossary/en'); OUT.mkdir(parents=True, exist_ok=True)

TERMS = json.loads(pathlib.Path('scripts/glossary_terms.json').read_text())
SLUGS = [t['slug'] for t in TERMS]

SEE_ALSO = """/features/invoicing /features/quotations /features/inventory /features/accounting
/features/hr-payroll /features/reports /features/sales-crm /features/payments /features/manufacturing
/invoicing/invoices /invoicing/quotations /invoicing/estimates /invoicing/proforma-invoices
/invoicing/credit-notes /invoicing/debit-notes /invoicing/delivery-notes /invoicing/purchase-orders
/invoicing/sales-orders /invoicing/payment-receipts /invoicing/payment-reminders /invoicing/expenses
/invoicing/ledgers /invoicing/recurring-invoices /tools/free-invoice-generator
/tools/free-quotation-generator /tools/free-receipt-generator /tools/free-purchase-order-generator
/tools/free-delivery-note-generator /tools/free-proforma-invoice-generator /tools/oman-vat-calculator
/pricing /industries/trading /industries/retail /industries/restaurants /industries/contracting
/industries/salons /use-cases/freelancers /use-cases/accountants /use-cases/agencies
/use-cases/small-business"""

PROMPT = """You are a chartered accountant writing the definitive glossary entry for "{term}" on paperandpen.om, the marketing site for Paper & Pen, a free cloud ERP and invoicing product. Audience: small business owners, bookkeepers and freelancers worldwide, with a large Gulf (GCC) and South Asian readership.

Return ONE JSON object, exactly these keys:

{{
  "slug": "{slug}",
  "term": "{term}",
  "abbr": "optional short abbreviation, omit the key entirely if there is none",
  "category": "{category}",
  "short": "ONE sentence, 18 to 32 words, that fully answers 'what is {term}' standing alone with no pronoun pointing outside itself. This is what a search engine may lift verbatim.",
  "metaTitle": "60 characters or fewer INCLUDING the ' \\u00b7 Paper & Pen' suffix. Count the characters.",
  "metaDescription": "155 characters or fewer, a real sentence, not keywords. Count the characters.",
  "definition": "90 to 150 words expanding the short definition. Plain English, second person where natural.",
  "how": {{
    "title": "How {term} works",
    "body": "80 to 140 words on the mechanics, in the order they happen.",
    "items": ["4 to 6 bullets, each a concrete step or component, 6 to 16 words each"]
  }},
  "formula": {{ "label": "...", "expr": "ASCII only, / for divide and x for multiply", "note": "1 to 2 sentences on reading the result" }},
  "example": {{ "title": "Worked example", "body": "70 to 120 words with a named business and arithmetic that ACTUALLY COMPUTES" }},
  "matters": "70 to 120 words on why an owner should care. Concrete consequences.",
  "faqs": [ {{ "q": "a question a real person types", "a": "45 to 85 words" }} ],
  "related": ["3 to 5 slugs, each EXACTLY from the master slug list"],
  "seeAlso": [ {{ "href": "a path from the site path list", "label": "2 to 4 words" }} ]
}}

Include "formula" ONLY where a genuine standard formula exists. Include "example" wherever arithmetic clarifies the term. Give 2 or 3 faqs. Give 1 to 3 seeAlso.

{extra}

ABSOLUTE RULES, a breach means the page is discarded:
1. NEVER use an em dash. Not once. Use a comma, a colon, a period or parentheses.
2. NEVER invent a statistic, a percentage of businesses, a survey, a benchmark, a customer count or a rating. Never write "studies show".
3. NEVER state any country's tax rate, VAT registration threshold, filing deadline or e-invoicing mandate date. Those vary by country and are published elsewhere on this site after verification against the tax authority. Writing "VAT is 5 percent in the GCC" is a hard failure because Saudi Arabia is not 5 percent. Define the concept and say the rate and threshold are set by each country's tax authority.
4. Any arithmetic you write must be correct. Compute it, then check it.
5. No emojis. Never write "seamless", "leverage", "robust", "game-changer", "empower", "in today's fast-paced world", "let's dive in".
6. International English spelling (organisation, recognise, amortisation).
7. About Paper & Pen you may say only: it creates invoices, quotations and receipts; it tracks stock; it posts journal entries; it supports many currencies and 5 languages; Sales and Invoicing is free forever. Nothing else. At most ONE sentence about the product per page, in "matters" or a faq, never in "short" or "definition".

MASTER SLUG LIST (every "related" value must be one of these, and never "{slug}" itself):
{slugs}

SITE PATH LIST for seeAlso hrefs (no trailing slash, no locale prefix):
{paths}

Return only the JSON object."""

def build(t):
    return PROMPT.format(
        term=t['term'], slug=t['slug'], category=t['category'],
        extra=t.get('extra', ''), slugs=' '.join(SLUGS), paths=SEE_ALSO)

REQ = {'slug','term','category','short','metaTitle','metaDescription','definition','how','matters','faqs','related','seeAlso'}
PATHS = set(SEE_ALSO.split())

def validate(d, t):
    p = []
    miss = REQ - set(d)
    if miss: p.append(f'missing {sorted(miss)}')
    if d.get('slug') != t['slug']: p.append('slug mismatch')
    if len(d.get('metaTitle','')) > 60: p.append(f"metaTitle {len(d['metaTitle'])}")
    if len(d.get('metaDescription','')) > 155: p.append(f"metaDesc {len(d['metaDescription'])}")
    if not (2 <= len(d.get('faqs',[])) <= 3): p.append('faq count')
    rel = [r for r in d.get('related',[]) if r != t['slug']]
    bad = [r for r in rel if r not in SLUGS]
    if bad: p.append(f'bad related {bad}')
    if not (3 <= len(rel) <= 5): p.append(f'related count {len(rel)}')
    d['related'] = rel
    sa = [s for s in d.get('seeAlso',[]) if s.get('href') in PATHS]
    if not sa: p.append('no valid seeAlso')
    d['seeAlso'] = sa[:3]
    h = d.get('how') or {}
    if not h.get('body') or not (3 <= len(h.get('items',[])) <= 7): p.append('how block')
    if len(d.get('definition','').split()) < 70: p.append('definition too short')
    p += lint_text(json.dumps(d, ensure_ascii=False))
    return p

def job(t):
    f = OUT / f"{t['slug']}.json"
    if f.exists() and not FORCE:
        return True, 'exists'
    last = ''
    for attempt in range(3):
        d = scrub(parse_json(call(build(t) + ('\n\nA previous attempt failed validation with: ' + last + '. Fix exactly those problems.' if last else ''))))
        probs = validate(d, t)
        if not probs:
            f.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
            return True, ''
        last = '; '.join(probs)
    return False, last

FORCE = '--force' in sys.argv
only = [a for a in sys.argv[1:] if not a.startswith('--')]
jobs = [t for t in TERMS if not only or t['slug'] in only]
parallel(jobs, job, workers=8, label='glossary-en')
