// JSON-LD structured-data builders for rich results.
const SITE = 'https://paperandpen.om';

export function organization() {
  return {
    '@type': 'Organization',
    '@id': `${SITE}/#organization`,
    name: 'Paper and Pen Company LLC',
    url: SITE,
    logo: `${SITE}/logo.svg`,
    // r372 / ledger llm20-13. schema.org telephone is a MACHINE field and this
    // was the estate's ONLY non-E.164 value: '+968-9889-9100' normalises to the
    // same number every other property publishes as '+96898899100', so a consumer
    // comparing schema strings read one BHD line as two. The human render stays
    // '+968 9889 9100' (Footer.astro:119) -- that is a display surface, not this one.
    telephone: '+96898899100',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Muscat',
      addressCountry: 'OM',
    },
    // sameAs is IDENTITY, not family: listing the parent's URL here says Paper and Pen
    // IS BHD Group. The parentOrganization edge below is the correct membership edge
    // and stays. Ledger llm223-2 / llm225-1, round 227.
    sameAs: ['https://api.whatsapp.com/send?phone=96898899100'],
    // A BARE @id reference, deliberately. Re-stating name/legalName/url here would
    // assert a second value for fields bhd.om/#organization already publishes
    // (legalName 'Bin Haider Darwish L.L.C.', url 'https://bhd.om/', @type
    // ['Organization','LocalBusiness']), which is exactly the two-bodies-one-@id
    // conflict entity_graph_gate is red on elsewhere. Ledger llm350-1, round 351.
    parentOrganization: { '@id': 'https://bhd.om/#organization' },
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


/**
 * WebSite + SearchAction. One node, on every page, so the site name and its
 * search entry point are stated once at the graph level rather than implied.
 * The target is the glossary index's own filter box, which is a real URL that
 * really answers `?q=`, not an invented /search endpoint: declaring a
 * SearchAction that 404s is worse than declaring none.
 */
export function webSite(opts: { name: string; description: string; locale: string; searchUrl?: string }) {
  const node: Record<string, unknown> = {
    '@type': 'WebSite',
    '@id': `${SITE}/#website`,
    name: opts.name,
    url: SITE,
    description: opts.description,
    inLanguage: opts.locale,
    publisher: { '@id': `${SITE}/#organization` },
  };
  if (opts.searchUrl) {
    node.potentialAction = {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE}${opts.searchUrl}?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    };
  }
  return node;
}

/** ItemList for a hub page, so the set of children is stated, not just linked. */
export function itemList(opts: { name: string; items: { name: string; url: string }[] }) {
  return {
    '@type': 'ItemList',
    name: opts.name,
    numberOfItems: opts.items.length,
    itemListElement: opts.items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: it.url.startsWith('http') ? it.url : `${SITE}${it.url}`,
    })),
  };
}

/**
 * DefinedTerm for a glossary entry, inside a DefinedTermSet for the glossary.
 * This is the schema Zoho's 1,712 glossary URLs ship none of.
 */
export function definedTerm(opts: {
  name: string;
  description: string;
  url: string;
  setName: string;
  setUrl: string;
  termCode?: string;
}) {
  return {
    '@type': 'DefinedTerm',
    '@id': `${SITE}${opts.url}#term`,
    name: opts.name,
    description: opts.description,
    url: `${SITE}${opts.url}`,
    ...(opts.termCode ? { termCode: opts.termCode } : {}),
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      '@id': `${SITE}${opts.setUrl}#termset`,
      name: opts.setName,
      url: `${SITE}${opts.setUrl}`,
    },
  };
}

/** An Article node for a glossary/definition page, so it can carry authorship. */
export function techArticle(opts: { headline: string; description: string; url: string; locale: string }) {
  return {
    '@type': 'TechArticle',
    headline: opts.headline,
    description: opts.description,
    url: `${SITE}${opts.url}`,
    inLanguage: opts.locale,
    isAccessibleForFree: true,
    publisher: { '@id': `${SITE}/#organization` },
    author: { '@id': `${SITE}/#organization` },
  };
}

/** Wrap one or more node objects into a @graph document. */
export function graph(...nodes: Record<string, unknown>[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean),
  };
}
