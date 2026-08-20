import pathlib, re, sys, json
sys.path.insert(0, 'scripts')
from genlib import call, scrub, lint_text, parallel

OUT = pathlib.Path('src/content/blog/en')

PROMPT = """Write a blog post for paperandpen.om, the site for Paper & Pen, a free cloud ERP and invoicing product. Readers are small business owners, freelancers and bookkeepers worldwide, with a large Gulf and South Asian readership.

TITLE ANGLE: {title}
WHAT THE POST MUST ACTUALLY DELIVER: {brief}

Return a complete Markdown document and nothing else. No code fence around it, no commentary. Start with this exact YAML frontmatter block, filled in:

---
locale: "en"
slug: "{slug}"
title: "a title of 45 to 65 characters"
description: "a real sentence, 120 to 155 characters"
pubDate: {date}
author: "Paper & Pen"
tags: [{tags}]
---

Then the body: 900 to 1,300 words of Markdown.

Body requirements:
- Open with 2 or 3 sentences that state the problem concretely. No throat-clearing, no "in today's business world".
- Use `##` section headings (5 to 7 of them) and `###` only where a section genuinely subdivides.
- Use bulleted lists where the content is a list, and a Markdown table where the content is a comparison. At least one list or table.
- Close with a short section that tells the reader exactly what to do next.
- Link 3 to 6 times to relevant pages on this site using Markdown links with RELATIVE paths WITH a trailing slash, chosen from this list: {links}
  Write the link text as natural prose, never as a bare URL, and never link the same page twice.

ABSOLUTE RULES, a breach means the post is discarded:
1. NEVER use an em dash. Not once. Use a comma, a colon, a period or parentheses.
2. NEVER invent a statistic, a percentage, a survey, a study, a benchmark, a customer count or a testimonial. If you want to say something is common, say it plainly as an observation, without a fake number attached.
3. NEVER state any country's tax rate, VAT registration threshold, filing deadline or e-invoicing mandate date. Those live on separate verified country pages. Refer the reader to their tax authority instead.
4. Do NOT claim a Paper & Pen capability beyond: creating invoices, quotations, estimates, proforma invoices, receipts, purchase orders, delivery notes, credit and debit notes; recurring invoices; customers and leads; stock and costs; journal entries, ledgers, profit and loss and balance sheet; expenses; HR and payroll and manufacturing as paid modules; reports; many currencies; configurable tax rates; five interface languages; RTL Arabic and Urdu; sharing by email or WhatsApp link; free forever for Sales and Invoicing. No bank feeds, no app-store apps, no AI, no named integrations other than Paymob for payment collection. Mention the product at most twice in the whole post.
5. No emojis. Never write "seamless", "leverage", "robust", "game-changer", "empower", "unlock", "elevate", "dive in", "in today's fast-paced".
6. International English spelling.
7. Any arithmetic in an example must be correct."""

LINKS = "/glossary/ /invoice-templates/ /alternatives/ /vat/ /tools/free-invoice-generator/ /tools/free-quotation-generator/ /tools/free-estimate-maker/ /tools/free-credit-note-generator/ /tools/free-receipt-generator/ /invoicing/invoices/ /invoicing/quotations/ /invoicing/credit-notes/ /invoicing/payment-reminders/ /features/inventory/ /features/accounting/ /features/invoicing/ /glossary/accounts-receivable/ /glossary/days-sales-outstanding/ /glossary/cash-flow-statement/ /glossary/gross-margin/ /glossary/fifo/ /glossary/tax-invoice/ /glossary/zero-rated-supply/ /glossary/proforma-invoice/ /glossary/credit-note/ /pricing/"

POSTS = [
 dict(slug='why-clients-pay-late-and-how-to-fix-it', date='2026-06-02', tags='"invoicing", "cash flow"',
      title='Why clients pay late, and the fixes that actually work',
      brief='Diagnose late payment by cause rather than treating it as one problem: an invoice that never arrived at the right person, an invoice missing something the payer needs (a PO number, a tax number, a signed delivery note), a payer whose own approval chain is slow, and a payer who simply will not pay. Each cause has a different fix and only the last one is a collections problem. Cover a dunning ladder, what to put in each reminder, and when to stop supplying.'),
 dict(slug='quotation-vs-estimate-vs-proforma-invoice', date='2026-06-16', tags='"quotations", "guide"',
      title='Quotation, estimate or proforma invoice: which to send',
      brief='These three documents are constantly confused and the confusion is expensive. Give a clear decision rule for each, explain which of them binds you if accepted, which creates a receivable, which creates a tax point, and what to do when a client treats your estimate as a fixed price. Include a comparison table.'),
 dict(slug='how-to-price-a-job-so-you-actually-make-money', date='2026-06-30', tags='"pricing", "guide"',
      title='How to price a job so you actually make money',
      brief='Walk through costing a job properly: direct cost, an honest allocation of overhead, and the difference between margin and markup, which is the single most common arithmetic error in small business pricing. Show the same job priced both ways so the reader sees the gap. Cover what to do when a client asks for a discount.'),
 dict(slug='the-month-end-close-for-small-businesses', date='2026-07-14', tags='"accounting", "guide"',
      title='A month-end close a small business can actually finish',
      brief='A practical closing checklist scaled to a business without a finance team: bank reconciliation, unbilled work, supplier bills not yet entered, stock, and the two or three reports worth reading afterwards. Explain why a close that happens late is worse than a close that is slightly rough, and give a realistic sequence.'),
 dict(slug='stock-costing-fifo-or-weighted-average', date='2026-07-28', tags='"inventory", "guide"',
      title='FIFO or weighted average: choosing a stock costing method',
      brief='Explain both methods with the SAME two purchase lots and the same sale, so the reader sees exactly where the profit figures diverge and why neither is wrong. Cover which suits which kind of business, why changing method mid-year distorts comparisons, and the practical point that consistency matters more than the choice.'),
 dict(slug='getting-paid-across-borders', date='2026-08-11', tags='"payments", "guide"',
      title='Getting paid across borders without losing the margin',
      brief='For a business invoicing customers in another country: which currency to bill in and who carries the exchange risk, why the rate on the invoice matters for your own books, bank charges and who pays them, and the documentation an overseas customer needs before their finance team will release a payment. Do not quote any bank fees or exchange rates.'),
]

def job(pd):
    f = OUT / f"{pd['slug']}.mdx"
    if f.exists() and '--force' not in sys.argv:
        return True, 'exists'
    last = ''
    for _ in range(3):
        p = PROMPT.format(links=LINKS, **pd)
        if last: p += f'\n\nA previous attempt failed with: {last}. Fix exactly that.'
        try:
            out = call(p, temp=0.6, max_tokens=32768, json_mode=False)
        except Exception as e:
            last = repr(e)[:100]; continue
        out = out.strip()
        if out.startswith('```'):
            out = re.sub(r'^```[a-z]*\n?', '', out); out = re.sub(r'\n?```$', '', out)
        out = scrub(out)
        probs = []
        m = re.match(r'^---\n(.*?)\n---\n(.*)$', out, re.S)
        if not m:
            last = 'no frontmatter'; continue
        fm, body = m.groups()
        words = len(body.split())
        if not (750 <= words <= 1700): probs.append(f'words {words}')
        if len(re.findall(r'^## ', body, re.M)) < 4: probs.append('too few h2')
        links = re.findall(r'\]\((/[^)]*)\)', body)
        bad = [l for l in links if l not in LINKS.split()]
        if bad: probs.append(f'bad links {bad[:3]}')
        if len(set(links)) < 3: probs.append(f'links {len(set(links))}')
        desc = re.search(r'^description:\s*"(.*)"$', fm, re.M)
        if not desc or len(desc.group(1)) > 155: probs.append('description length')
        probs += lint_text(out)
        if not probs:
            f.write_text(f'---\n{fm}\n---\n{body.lstrip()}')
            return True, ''
        last = '; '.join(probs[:4])
    return False, last

parallel(POSTS, job, workers=6, label='blog-en')
