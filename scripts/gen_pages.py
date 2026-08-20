"""Generate pageSchema-shaped marketing pages (templates / alternatives / industries)."""
import json, pathlib, sys, re
sys.path.insert(0, 'scripts')
from genlib import call, parse_json, scrub, lint_text, parallel

ICONS = "check plus star sparkle bolt shield lock bell doc invoice quote receipt reports calendar cart card wallet bank tag percent calc inventory truck manufacturing chart accounting users hr whatsapp mail phone pin globe clock play trend-up filter download refresh search"

SITE_PATHS = """/features/invoicing /features/quotations /features/inventory /features/accounting
/features/hr-payroll /features/reports /features/sales-crm /features/payments /features/manufacturing
/invoicing/invoices /invoicing/quotations /invoicing/estimates /invoicing/proforma-invoices
/invoicing/credit-notes /invoicing/debit-notes /invoicing/delivery-notes /invoicing/purchase-orders
/invoicing/sales-orders /invoicing/payment-receipts /invoicing/payment-reminders /invoicing/expenses
/invoicing/ledgers /invoicing/recurring-invoices /tools/free-invoice-generator
/tools/free-quotation-generator /tools/free-receipt-generator /tools/free-purchase-order-generator
/tools/free-delivery-note-generator /tools/free-proforma-invoice-generator /tools/oman-vat-calculator
/pricing /glossary /industries/trading /industries/retail /industries/restaurants
/industries/contracting /industries/salons /use-cases/freelancers /use-cases/accountants
/use-cases/agencies /use-cases/small-business /free-invoicing-software"""

BASE = """Return ONE JSON object with EXACTLY these keys:

{{
  "locale": "en",
  "slug": "{slug}",
  "order": {order},
  "title": "short label for breadcrumbs and cards, 2 to 5 words",
  "metaTitle": "60 characters or FEWER including the ' \\u00b7 Paper & Pen' suffix. Count them.",
  "metaDescription": "155 characters or FEWER. A real sentence.",
  "keywords": "6 to 10 comma-separated search phrases a real person would type",
  "heroEyebrow": "2 to 4 words",
  "heroTitle": "A headline of 6 to 12 words. Wrap the 1 to 3 most important words in <em class=\\"text-copper-400 not-italic\\">like this</em>. Exactly one em element.",
  "heroSubtitle": "25 to 45 words. Concrete, not a slogan.",
  "heroBullets": ["3 bullets, 3 to 7 words each"],
  "features": [{{ "icon": "one name from the icon list", "title": "2 to 5 words", "desc": "20 to 35 words" }}],
  "sections": [{{ "eyebrow": "2 to 3 words", "title": "5 to 10 words", "body": "70 to 130 words", "items": ["3 to 5 bullets of 5 to 14 words"] }}],
  "faqs": [{{ "q": "a question a real person types", "a": "50 to 90 words" }}],
  "related": ["3 to 5 site paths from the path list, no trailing slash, no locale prefix"],
  "ctaTitle": "6 to 10 words",
  "ctaSub": "15 to 28 words"
}}

Give 6 features, 3 sections, and 4 faqs.

ICON NAMES (use only these): {icons}

SITE PATHS for "related": {paths}

ABSOLUTE RULES, a breach means the page is discarded:
1. NEVER use an em dash. Not once. Use a comma, a colon, a period or parentheses.
2. NEVER invent a statistic, a percentage of businesses, a survey, a benchmark, a customer count, a testimonial or a rating. Never write "studies show" or "trusted by".
3. NEVER state any country's tax rate, VAT registration threshold, filing deadline or e-invoicing mandate date.
4. NEVER claim a Paper & Pen capability outside this list: create and send invoices, quotations, estimates, proforma invoices, receipts, purchase orders, delivery notes, credit and debit notes; recurring invoices; track customers and leads; track stock and costs; post journal entries and produce ledgers, profit and loss and balance sheet; expenses; HR and payroll as a paid module; manufacturing and bills of materials as a paid module; reports; many currencies; configurable tax rates; five interface languages (English, Arabic, Hindi, Bengali, Urdu); right-to-left Arabic and Urdu; share a document by email or WhatsApp link; free forever for Sales and Invoicing with paid add-on modules. Do NOT claim bank feeds, open-banking, automatic bank imports, mobile apps on any app store, AI features, e-invoicing clearance certification, third-party app marketplaces, offline mode, time tracking, project management, or any named integration other than payment collection through Paymob.
5. No emojis. Never write "seamless", "leverage", "robust", "game-changer", "empower", "in today's fast-paced world", "unlock", "elevate".
6. International English spelling (organisation, recognise, specialise, prioritise).
7. Write for a reader, not a keyword counter. Short sentences, concrete nouns.

Return only the JSON object."""

TEMPLATE_PROMPT = """You are writing the "{label} invoice template" landing page for paperandpen.om, the marketing site for Paper & Pen, a free cloud ERP and invoicing product. The page targets someone searching for an invoice template for {label_lower} work. It must be worth landing on: a generic invoice page with the trade's name swapped in is exactly the thin content this page must not be.

What makes THIS page specific, and what you must actually cover:
{specifics}

Structure the three sections as: (1) what a {label_lower} invoice must show, (2) how {label_lower} work is usually priced and billed, and (3) getting paid: terms, deposits and chasing. Ground every section in the real mechanics of this trade.

The page's action is the free invoice generator at /tools/free-invoice-generator, which needs no signup. Mention it naturally, do not repeat it in every section.

""" + BASE

ALT_PROMPT = """You are writing the "{label} alternative" page for paperandpen.om, the marketing site for Paper & Pen, a free cloud ERP and invoicing product. The reader is actively considering LEAVING {label} and is looking for what to move to.

This page is NOT a feature-matrix comparison (the site already has those at /compare/). It is a switching page, and its credibility comes from being honest about the switch:
- what actually transfers and what does not when you move (customers, items, open invoices, historical documents, the chart of accounts)
- the practical order of a migration and the sensible cutover point in a financial year
- what a Paper & Pen user genuinely gains
- and a plain, unhedged statement of WHO SHOULD NOT SWITCH, naming the kind of business {label} suits better. A page that claims everyone should switch is not believable and will not be published.

CRITICAL CONSTRAINT ON TALKING ABOUT {label}: you must NOT state {label}'s prices, plan names, plan limits, user counts, current feature set, or any dated claim about them. You do not have verified current information about their product and their pricing changes. Refer to them only in stable, general terms (for example that it is established accounting software with a paid subscription) and tell the reader plainly to check {label}'s own site for current plans and pricing. Do not disparage them, and do not put words in their mouth. If you cannot say something about {label} without asserting an unverified fact, say nothing about it.

{specifics}

Structure the three sections as: (1) what moving actually involves, (2) what you get on Paper & Pen, and (3) who should stay on {label}. Section 3 must be genuinely useful to someone it talks out of switching.

""" + BASE


INDUSTRY_PROMPT = """You are writing the "{label}" industry page for paperandpen.om, the marketing site for Paper & Pen, a free cloud ERP and invoicing product. The reader runs a {label_lower} business and wants to know whether this software fits how their business actually works.

An industry page that is the generic product page with the industry name swapped in is worthless and will not be published. What makes THIS page specific:
{specifics}

Structure the three sections around the real operating problems of this industry, not around product feature names. Name the documents, the units, the margins and the timing that this industry actually deals in.

Be honest about fit. If something this industry commonly needs is outside the capability list below, do not imply it exists.

""" + BASE

def validate(d, slug, order, paths):
    p = []
    req = {'locale','slug','title','metaTitle','metaDescription','heroTitle','heroSubtitle','features','sections','faqs','related'}
    miss = req - set(d)
    if miss: p.append(f'missing {sorted(miss)}')
    d['locale'] = 'en'; d['slug'] = slug; d['order'] = order
    if len(d.get('metaTitle','')) > 60: p.append(f"metaTitle {len(d['metaTitle'])}")
    if len(d.get('metaDescription','')) > 155: p.append(f"metaDesc {len(d['metaDescription'])}")
    ems = re.findall(r'<em\b', d.get('heroTitle',''))
    if len(ems) != 1: p.append(f'heroTitle em count {len(ems)}')
    if 'text-copper-400 not-italic' not in d.get('heroTitle',''): p.append('heroTitle em class')
    if not (4 <= len(d.get('features',[])) <= 8): p.append('features count')
    badicon = [f['icon'] for f in d.get('features',[]) if f.get('icon') not in ICONS.split()]
    if badicon: p.append(f'bad icons {badicon}')
    if not (2 <= len(d.get('sections',[])) <= 4): p.append('sections count')
    if not (3 <= len(d.get('faqs',[])) <= 5): p.append('faq count')
    rel = [r for r in d.get('related',[]) if r in paths]
    if len(rel) < 3: p.append(f'related {d.get("related")}')
    d['related'] = rel[:5]
    p += lint_text(json.dumps(d, ensure_ascii=False))
    return p

def run(kind, items, outdir, prompt_tpl):
    OUT = pathlib.Path(outdir); OUT.mkdir(parents=True, exist_ok=True)
    paths = set(SITE_PATHS.split())
    def job(it):
        f = OUT / f"{it['slug']}.json"
        if f.exists() and '--force' not in sys.argv: return True, 'exists'
        last = ''
        for _ in range(3):
            prompt = prompt_tpl.format(
                slug=it['slug'], order=it['order'], label=it['label'],
                label_lower=it['label'].lower(), specifics=it.get('specifics',''),
                icons=ICONS, paths=SITE_PATHS)
            if last: prompt += f'\n\nA previous attempt failed validation with: {last}. Fix exactly those problems.'
            d = scrub(parse_json(call(prompt)))
            probs = validate(d, it['slug'], it['order'], paths)
            if not probs:
                f.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
                return True, ''
            last = '; '.join(probs)
        return False, last
    parallel(items, job, workers=6, label=kind)

if __name__ == '__main__':
    which = sys.argv[1]
    plan = json.loads(pathlib.Path(f'scripts/plan_{which}.json').read_text())
    tpl = {'templates': TEMPLATE_PROMPT, 'alternatives': ALT_PROMPT, 'industries': INDUSTRY_PROMPT}[which]
    run(which, plan, f'src/content/{which}/en', tpl)
