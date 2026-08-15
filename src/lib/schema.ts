// JSON-LD structured-data builders for rich results.
const SITE = 'https://paperandpen.om';

export function organization() {
  return {
    '@type': 'Organization',
    '@id': `${SITE}/#organization`,
    name: 'Paper and Pen Company LLC',
    url: SITE,
    logo: `${SITE}/logo.svg`,
    telephone: '+968-9889-9100',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Muscat',
      addressCountry: 'OM',
    },
    // sameAs is IDENTITY, not family: listing the parent's URL here says Paper and Pen
    // IS BHD Group. The parentOrganization edge below is the correct membership edge
    // and stays. Ledger llm223-2 / llm225-1, round 227.
    sameAs: ['https://api.whatsapp.com/send?phone=96898899100'],
    parentOrganization: { '@type': 'Organization', name: 'BHD Group', url: 'https://bhd.om' },
  };
}

export function softwareApplication(extra: Record<string, unknown> = {}) {
  return {
    '@type': 'SoftwareApplication',
    '@id': `${SITE}/#software`,
    name: 'Paper & Pen ERP',
    description:
      'Free cloud ERP & invoicing software for GCC small and mid-sized businesses. Sales, inventory, HR, accounting in Arabic and English.',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    url: SITE,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'OMR',
      description: 'Free forever for Sales & Invoicing',
    },
    // NO aggregateRating. The 4.9 / 73 that stood here arrived whole in the initial
    // site build (1826e05) and named no source: there is no Review node, no
    // testimonial surface and no third-party corpus anywhere for this product, and a
    // SoftwareApplication has no Google Business Profile to bind a figure to. A
    // generator may not invent the number, so the only branch open to it is deletion.
    // Ledger llm224-1 (the house 4.9 across six brands), round 255.
    featureList:
      'Sales & Invoicing, Inventory, HR & Payroll, Accounting, Manufacturing, Reports & Analytics, Multi-language (EN/AR/HI/BN/UR), OMR billing, Paymob payment integration',
    ...extra,
  };
}

export function webApplication(opts: { name: string; description: string; url: string }) {
  return {
    '@type': 'WebApplication',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'OMR' },
  };
}

export function howTo(opts: { name: string; steps: { name: string; text: string }[] }) {
  return {
    '@type': 'HowTo',
    name: opts.name,
    step: opts.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

export function faqPage(faqs: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function breadcrumbList(crumbs: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url.startsWith('http') ? c.url : `${SITE}${c.url}`,
    })),
  };
}

export function product(opts: {
  name: string;
  description: string;
  offers: { name: string; price: number; currency?: string }[];
}) {
  return {
    '@type': 'Product',
    name: opts.name,
    description: opts.description,
    brand: { '@type': 'Brand', name: 'Paper & Pen' },
    offers: opts.offers.map((o) => ({
      '@type': 'Offer',
      name: o.name,
      price: String(o.price),
      priceCurrency: o.currency || 'OMR',
      availability: 'https://schema.org/InStock',
    })),
  };
}

/** Wrap one or more node objects into a @graph document. */
export function graph(...nodes: Record<string, unknown>[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean),
  };
}
