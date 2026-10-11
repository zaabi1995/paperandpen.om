#!/usr/bin/env python3
"""Deterministic SEO integrity checks for the generated site."""

from __future__ import annotations

import html
import json
import pathlib
import re
import sys
from collections import defaultdict
from urllib.parse import urlsplit

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import locales as L  # noqa: E402  (the locale table, read from src/i18n/hreflang.mjs)


DIST = pathlib.Path("dist")
SITE = "https://paperandpen.om"
ORG_ID = f"{SITE}/#organization"

# Live locales are read from the BUILD, not hardcoded: en plus every code in the
# locale table whose root page was built. A locale is live when its dictionary
# src/i18n/ui/<code>.json exists, so this equals the dictionary set at build time
# even while translations are still landing on disk.
LIVE = ["en"] + [code for code in L.ALL if code != "en" and (DIST / code / "index.html").is_file()]
LOCALES = tuple(LIVE[1:])
CORE_LIVE = tuple(code for code in LIVE if code in L.CORE)
CORE_NON_DEFAULT = tuple(code for code in CORE_LIVE if code != "en")
HREFLANG = L.HREFLANG
SITEMAP_LASTMOD_DATE = "2026-08-23"
SEARCH_UPDATED_DATE = "2026-08-21"
PRIORITY_ARTICLES = ("what-is-a-proforma-invoice", "vat-invoicing-gcc-guide")
PROFORMA_ANSWER_PATHS = {
    "/blog/what-is-a-proforma-invoice/",
    "/ar/blog/what-is-a-proforma-invoice/",
}
INTENT_PAGE_PAIRS = {
    "stationery": (
        "/stationery-supplies-oman/",
        "/ar/stationery-supplies-oman/",
    ),
    "erp": (
        "/erp-software-oman/",
        "/ar/erp-software-oman/",
    ),
}

failures: list[str] = []


def fail(message: str) -> None:
    failures.append(message)


def page_path(path: pathlib.Path) -> str:
    relative = path.parent.relative_to(DIST).as_posix()
    return "/" if relative == "." else f"/{relative}/"


def locale_for(path: str) -> str:
    first = path.strip("/").split("/", 1)[0]
    return first if first in LOCALES else "en"


def lang_for(path: str) -> str:
    """The BCP 47 tag a page in this locale declares (inLanguage, hreflang)."""
    return HREFLANG[locale_for(path)]


def json_type(node: dict, expected: str) -> bool:
    value = node.get("@type")
    if isinstance(value, str):
        return value == expected
    return isinstance(value, list) and expected in value


def top_level_nodes(documents: list[dict]) -> list[dict]:
    nodes: list[dict] = []
    for document in documents:
        graph = document.get("@graph")
        if isinstance(graph, list):
            nodes.extend(node for node in graph if isinstance(node, dict))
        elif "@type" in document:
            nodes.append(document)
    return nodes


def walk_json(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk_json(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk_json(child)


def extract_jsonld(path: str, document: str) -> list[dict]:
    blocks = re.findall(
        r'<script\b[^>]*\btype=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        document,
        flags=re.IGNORECASE | re.DOTALL,
    )
    parsed: list[dict] = []
    for index, block in enumerate(blocks, 1):
        try:
            value = json.loads(block)
        except json.JSONDecodeError as error:
            fail(f"{path}: JSON-LD block {index} does not parse: {error.msg}")
            continue
        if not isinstance(value, dict):
            fail(f"{path}: JSON-LD block {index} is not an object")
            continue
        parsed.append(value)
    return parsed


def canonical_from(document: str) -> str | None:
    match = re.search(
        r'<link\b[^>]*\brel=["\']canonical["\'][^>]*\bhref=["\']([^"\']+)["\']',
        document,
        flags=re.IGNORECASE,
    )
    if not match:
        match = re.search(
            r'<link\b[^>]*\bhref=["\']([^"\']+)["\'][^>]*\brel=["\']canonical["\']',
            document,
            flags=re.IGNORECASE,
        )
    return html.unescape(match.group(1)) if match else None


def is_noindex(document: str) -> bool:
    tags = re.findall(r"<meta\b[^>]*>", document, flags=re.IGNORECASE)
    for tag in tags:
        if not re.search(r'\bname=["\']robots["\']', tag, flags=re.IGNORECASE):
            continue
        content = re.search(r'\bcontent=["\']([^"\']*)["\']', tag, flags=re.IGNORECASE)
        if content and "noindex" in content.group(1).lower():
            return True
    return False


def title_from(document: str) -> str:
    match = re.search(r"<title>(.*?)</title>", document, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return ""
    return html.unescape(re.sub(r"<[^>]+>", "", match.group(1))).strip()


def description_from(document: str) -> str:
    for tag in re.findall(r"<meta\b[^>]*>", document, flags=re.IGNORECASE):
        if not re.search(r'\bname=["\']description["\']', tag, flags=re.IGNORECASE):
            continue
        match = re.search(r'\bcontent=(["\'])(.*?)\1', tag, flags=re.IGNORECASE | re.DOTALL)
        if match:
            return html.unescape(match.group(2)).strip()
    return ""


def search_answer_from(document: str) -> str:
    match = re.search(
        r'<p\b[^>]*\bdata-search-answer(?:=["\'][^"\']*["\'])?[^>]*>(.*?)</p>',
        document,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not match:
        return ""
    return html.unescape(re.sub(r"<[^>]+>", "", match.group(1))).strip()


def hreflang_map(document: str) -> dict[str, str]:
    pairs = re.findall(
        r'<link\b[^>]*\brel=["\']alternate["\'][^>]*\bhreflang=["\']([^"\']+)["\'][^>]*\bhref=["\']([^"\']+)["\']',
        document,
        flags=re.IGNORECASE,
    )
    return {language: html.unescape(url) for language, url in pairs}


def localized_path(path: str, locale: str) -> str:
    return path if locale == "en" else f"/{locale}{path}"


# Every page the build produced, known before any page is checked.
BUILT_PATHS = (
    {page_path(page) for page in DIST.rglob("index.html")} if DIST.is_dir() else set()
)


def link_target(path: str, locale: str) -> str:
    """Where a page in `locale` links for `path`: the localized page when it
    was built, otherwise the English page. A content page that is not yet
    translated into a non-core locale is linked in English, never as a URL
    that does not exist (src/i18n/index.ts localizePath)."""
    localized = localized_path(path, locale)
    return localized if localized in BUILT_PATHS else path


def check_priority_alternates(path: str, document: str, base_path: str) -> None:
    """Exact and reciprocal: every core locale, plus each other live locale in
    which this page was built (and is indexable), plus x-default."""
    alternates = hreflang_map(document)
    expected = {
        HREFLANG[locale]: f"{SITE}{localized_path(base_path, locale)}"
        for locale in LIVE
        if locale in CORE_LIVE or localized_path(base_path, locale) in indexable_paths
    }
    expected["x-default"] = f"{SITE}{base_path}"
    if alternates != expected:
        fail(f"{path}: priority hreflang set is not exact or reciprocal")


def check_intent_alternates(path: str, document: str, english_path: str, arabic_path: str) -> None:
    expected = {
        "en": f"{SITE}{english_path}",
        "ar": f"{SITE}{arabic_path}",
        "x-default": f"{SITE}{english_path}",
    }
    if hreflang_map(document) != expected:
        fail(f"{path}: commercial-intent hreflang set is not the exact English and Arabic pair")


def check_intent_page(kind: str, path: str, document: str, documents: list[dict]) -> None:
    description = description_from(document)
    answer = search_answer_from(document)
    if not description or answer != description:
        fail(f"{path}: visible direct answer does not match the meta description")

    canonical_url = f"{SITE}{path}"
    entity_reference = {"@id": ORG_ID}
    if kind == "stationery":
        services = [node for node in walk_json(documents) if json_type(node, "Service")]
        if len(services) != 1:
            fail(f"{path}: expected one Service, found {len(services)}")
        else:
            service = services[0]
            if service.get("description") != description:
                fail(f"{path}: Service description does not match the visible answer")
            if service.get("url") != canonical_url:
                fail(f"{path}: Service URL does not match its canonical")
            if service.get("provider") != entity_reference:
                fail(f"{path}: Service provider must reference the canonical organization")
            area = service.get("areaServed")
            if not isinstance(area, dict) or area.get("@type") != "Country":
                fail(f"{path}: Service areaServed must identify a country")
        if any(json_type(node, "Product") for node in walk_json(documents)):
            fail(f"{path}: quote-based stationery page must not publish Product schema")
        if len([node for node in walk_json(documents) if json_type(node, "HowTo")]) != 1:
            fail(f"{path}: stationery quote flow must have one HowTo")
    elif kind == "erp":
        applications = [
            node for node in walk_json(documents) if json_type(node, "SoftwareApplication")
        ]
        if len(applications) != 1:
            fail(f"{path}: expected one SoftwareApplication, found {len(applications)}")
        else:
            application = applications[0]
            if application.get("description") != description:
                fail(f"{path}: SoftwareApplication description does not match the visible answer")
            if application.get("url") != canonical_url:
                fail(f"{path}: SoftwareApplication URL does not match its canonical")
            if application.get("publisher") != entity_reference:
                fail(f"{path}: SoftwareApplication publisher must reference the canonical organization")
            if application.get("provider") != entity_reference:
                fail(f"{path}: SoftwareApplication provider must reference the canonical organization")

    if len([node for node in walk_json(documents) if json_type(node, "FAQPage")]) != 1:
        fail(f"{path}: commercial-intent page must have one FAQPage")


def check_priority_article(path: str, document: str, documents: list[dict]) -> None:
    description = description_from(document)
    answer = search_answer_from(document)
    if not description or answer != description:
        fail(f"{path}: visible short answer does not match the meta description")
    articles = [node for node in walk_json(documents) if json_type(node, "BlogPosting")]
    if len(articles) != 1:
        fail(f"{path}: expected one BlogPosting, found {len(articles)}")
        return
    article = articles[0]
    if article.get("description") != description:
        fail(f"{path}: BlogPosting description does not match the visible answer")
    expected_updated = "2026-08-22" if path in PROFORMA_ANSWER_PATHS else SEARCH_UPDATED_DATE
    if locale_for(path) not in CORE_LIVE:
        # A later locale's translation carries its English source's date.
        english_path = path[len(locale_for(path)) + 1:]
        english_articles = [
            node for node in walk_json(jsonld_by_path.get(english_path, []))
            if json_type(node, "BlogPosting")
        ]
        if english_articles:
            expected_updated = str(english_articles[0].get("dateModified", ""))[:10]
    if not str(article.get("dateModified", "")).startswith(expected_updated):
        fail(f"{path}: BlogPosting dateModified is not {expected_updated}")
    if article.get("url") != f"{SITE}{path}":
        fail(f"{path}: BlogPosting URL does not match its canonical")
    if article.get("inLanguage") != lang_for(path):
        fail(f"{path}: BlogPosting inLanguage does not match the page locale")
    entity_reference = {"@id": ORG_ID}
    if article.get("author") != entity_reference or article.get("publisher") != entity_reference:
        fail(f"{path}: BlogPosting author and publisher must reference the canonical organization")
    if path in PROFORMA_ANSWER_PATHS:
        canonical = f"{SITE}{path}"
        article_id = f"{canonical}#article"
        faq_id = f"{canonical}#faq"
        howto_id = f"{canonical}#howto"
        if article.get("@id") != article_id:
            fail(f"{path}: BlogPosting does not use its canonical article ID")
        expected_about = {
            "@id": f"{SITE}{link_target('/glossary/proforma-invoice/', locale_for(path))}#term"
        }
        if article.get("about") != expected_about:
            fail(f"{path}: BlogPosting does not reference the localized proforma term")
        citations = article.get("citation")
        citation_urls = {
            item.get("url")
            for item in citations or []
            if isinstance(item, dict)
        }
        expected_citations = {
            "https://www.trade.gov/pro-forma-invoice",
            "https://tms.taxoman.gov.om/portal/documents/20126/0/Decision+No.+53-2021+Issuing+the+Executive+Regulations+of+the+Value+Added+Tax+%28VAT%29+Law.pdf/6150f022-0d7f-4f9b-831f-8b50c69af118?t=1748250290518",
        }
        if citation_urls != expected_citations:
            fail(f"{path}: BlogPosting primary citations are not exact")

        top_nodes = top_level_nodes(documents)
        pages = [node for node in top_nodes if json_type(node, "WebPage") and node.get("@id") == canonical]
        if len(pages) != 1:
            fail(f"{path}: expected one canonical WebPage, found {len(pages)}")
        else:
            page = pages[0]
            if page.get("mainEntity") != {"@id": article_id}:
                fail(f"{path}: WebPage mainEntity does not reference the BlogPosting")
            if page.get("isPartOf") != {"@id": f"{SITE}/#website"}:
                fail(f"{path}: WebPage isPartOf does not reference the canonical WebSite")
            speakable = page.get("speakable")
            if not isinstance(speakable, dict) or speakable.get("cssSelector") != [
                "[data-search-answer]",
                "[data-key-takeaways]",
            ]:
                fail(f"{path}: WebPage speakable selectors are not exact")
            if page.get("hasPart") != [{"@id": howto_id}, {"@id": faq_id}]:
                fail(f"{path}: WebPage hasPart does not connect the HowTo and FAQ")

        how_tos = [node for node in top_nodes if json_type(node, "HowTo")]
        if len(how_tos) != 1:
            fail(f"{path}: expected one proforma HowTo, found {len(how_tos)}")
        elif how_tos[0].get("@id") != howto_id or len(how_tos[0].get("step", [])) != 6:
            fail(f"{path}: proforma HowTo ID or six-step sequence is wrong")

        faq_pages = [node for node in top_nodes if json_type(node, "FAQPage")]
        if len(faq_pages) != 1:
            fail(f"{path}: expected one proforma FAQPage, found {len(faq_pages)}")
        elif faq_pages[0].get("@id") != faq_id or len(faq_pages[0].get("mainEntity", [])) != 5:
            fail(f"{path}: proforma FAQPage ID or five-question set is wrong")

        for marker in ("data-key-takeaways", "data-answer-comparison", "data-answer-howto", "data-answer-sources"):
            if marker not in document:
                fail(f"{path}: visible extractable block is missing {marker}")
        if "<table" not in document:
            fail(f"{path}: visible comparison table is missing")
        locale = locale_for(path)
        required_links = {
            link_target("/vat/oman/", locale),
            link_target("/tools/free-proforma-invoice-generator/", locale),
            link_target("/invoicing/proforma-invoices/", locale),
            link_target("/blog/quotation-vs-estimate-vs-proforma-invoice/", locale),
        }
        missing_links = sorted(required_links - internal_links(document))
        if missing_links:
            fail(f"{path}: proforma answer internal links are missing: {missing_links}")
    if "/vat-invoicing-gcc-guide/" in path:
        locale = locale_for(path)
        required_sources = {
            link_target(f"/vat/{country}/", locale)
            for country in ("oman", "uae", "saudi-arabia", "bahrain")
        }
        missing_sources = sorted(required_sources - internal_links(document))
        if missing_sources:
            fail(f"{path}: authority-backed country links are missing: {missing_sources}")


def check_priority_tool(path: str, document: str, documents: list[dict]) -> None:
    description = description_from(document)
    answer = search_answer_from(document)
    if not description or answer != description:
        fail(f"{path}: calculator answer does not match the meta description")
    applications = [node for node in walk_json(documents) if json_type(node, "WebApplication")]
    if len(applications) != 1:
        fail(f"{path}: expected one WebApplication, found {len(applications)}")
    elif applications[0].get("description") != description:
        fail(f"{path}: WebApplication description does not match the visible answer")
    if len([node for node in walk_json(documents) if json_type(node, "HowTo")]) != 1:
        fail(f"{path}: calculator must have one HowTo")
    if len([node for node in walk_json(documents) if json_type(node, "FAQPage")]) != 1:
        fail(f"{path}: calculator must have one FAQPage")
    heading = re.search(r"<h1\b[^>]*>(.*?)</h1>", document, flags=re.IGNORECASE | re.DOTALL)
    if not heading or "&lt;em" in heading.group(1).lower():
        fail(f"{path}: tool heading exposes raw emphasis markup")
    how_tos = [node for node in walk_json(documents) if json_type(node, "HowTo")]
    if how_tos and "<" in str(how_tos[0].get("name", "")):
        fail(f"{path}: HowTo name contains HTML markup")


def check_organization(path: str, nodes: list[dict]) -> None:
    definitions = [
        node
        for node in nodes
        if node.get("@id") == ORG_ID and json_type(node, "Organization")
    ]
    if len(definitions) != 1:
        fail(f"{path}: expected one {ORG_ID} Organization definition, found {len(definitions)}")
        return
    organization = definitions[0]
    if organization.get("url") != f"{SITE}/":
        fail(f"{path}: Organization root url must match the canonical homepage")
    same_as = organization.get("sameAs", [])
    if isinstance(same_as, str):
        same_as = [same_as]
    if any("whatsapp" in str(value).lower() for value in same_as):
        fail(f"{path}: WhatsApp must not appear in Organization sameAs")
    points = organization.get("contactPoint", [])
    if isinstance(points, dict):
        points = [points]
    has_whatsapp = any(
        isinstance(point, dict)
        and json_type(point, "ContactPoint")
        and "whatsapp" in str(point.get("url", "")).lower()
        for point in points
    )
    if not has_whatsapp:
        fail(f"{path}: Organization has no WhatsApp ContactPoint")
    expected_parent = {
        "@type": "Organization",
        "@id": "https://bhd.om/#organization",
    }
    if organization.get("parentOrganization") != expected_parent:
        fail(f"{path}: BHD parentOrganization is not the typed-only reference")


def check_applications(path: str, documents: list[dict]) -> None:
    for node in walk_json(documents):
        if json_type(node, "SoftwareApplication") and node.get("operatingSystem") != "Web":
            fail(f"{path}: SoftwareApplication operatingSystem must be Web")
        if node.get("@id") == f"{SITE}/#software" and json_type(node, "SoftwareApplication"):
            entity_reference = {"@id": ORG_ID}
            if node.get("url") != f"{SITE}/":
                fail(f"{path}: global SoftwareApplication URL is not the canonical homepage")
            if node.get("publisher") != entity_reference or node.get("provider") != entity_reference:
                fail(f"{path}: global SoftwareApplication ownership is incomplete")
            # The APP's interface languages, a product claim that changes with
            # the app, not with how many languages this marketing site serves.
            if node.get("inLanguage") != ["en", "ar", "hi", "bn", "ur"]:
                fail(f"{path}: global SoftwareApplication language set is not exact")
            if node.get("isAccessibleForFree") is not True:
                fail(f"{path}: global SoftwareApplication must state that its free offer is accessible")


def check_site_graph(path: str, document: str, nodes: list[dict]) -> None:
    canonical = f"{SITE}{path}"
    website_id = f"{SITE}/#website"
    websites = [
        node for node in nodes
        if node.get("@id") == website_id and json_type(node, "WebSite")
    ]
    if len(websites) != 1:
        fail(f"{path}: expected one canonical WebSite, found {len(websites)}")
    else:
        website = websites[0]
        if website.get("url") != f"{SITE}/":
            fail(f"{path}: WebSite URL is not the canonical homepage")
        if website.get("inLanguage") != [HREFLANG[code] for code in LIVE]:
            fail(f"{path}: WebSite language set is not stable across locales")
        if website.get("publisher") != {"@id": ORG_ID}:
            fail(f"{path}: WebSite publisher does not reference the canonical organization")

    web_pages = [
        node for node in nodes
        if node.get("@id") == canonical and json_type(node, "WebPage")
    ]
    if len(web_pages) != 1:
        fail(f"{path}: expected one canonical WebPage, found {len(web_pages)}")
    else:
        page = web_pages[0]
        if page.get("url") != canonical:
            fail(f"{path}: WebPage URL does not match its canonical")
        if page.get("description") != description_from(document):
            fail(f"{path}: WebPage description does not match page metadata")
        if page.get("inLanguage") != lang_for(path):
            fail(f"{path}: WebPage language does not match its locale")
        if page.get("isPartOf") != {"@id": website_id}:
            fail(f"{path}: WebPage does not reference the canonical WebSite")
        if page.get("publisher") != {"@id": ORG_ID}:
            fail(f"{path}: WebPage publisher does not reference the canonical organization")

    identifiers = [node.get("@id") for node in nodes if isinstance(node.get("@id"), str)]
    duplicates = sorted({identifier for identifier in identifiers if identifiers.count(identifier) > 1})
    if duplicates:
        fail(f"{path}: duplicate top-level schema IDs: {duplicates}")


def check_article_graph(path: str, document: str, documents: list[dict]) -> None:
    if "/blog/" not in path or path.endswith("/blog/"):
        return
    articles = [node for node in walk_json(documents) if json_type(node, "BlogPosting")]
    if len(articles) != 1:
        fail(f"{path}: expected one BlogPosting, found {len(articles)}")
        return
    article = articles[0]
    canonical = f"{SITE}{path}"
    entity_reference = {"@id": ORG_ID}
    if article.get("url") != canonical:
        fail(f"{path}: BlogPosting URL does not match its canonical")
    if article.get("mainEntityOfPage") != {"@type": "WebPage", "@id": canonical}:
        fail(f"{path}: BlogPosting mainEntityOfPage is not canonical")
    if article.get("inLanguage") != lang_for(path):
        fail(f"{path}: BlogPosting language does not match its locale")
    if article.get("author") != entity_reference or article.get("publisher") != entity_reference:
        fail(f"{path}: BlogPosting author and publisher are not canonical")
    if article.get("isAccessibleForFree") is not True:
        fail(f"{path}: BlogPosting does not state free access")
    if article.get("isPartOf") != {"@id": canonical}:
        fail(f"{path}: BlogPosting isPartOf does not reference its WebPage")
    if article.get("image") != f"{SITE}/og-image.png":
        fail(f"{path}: BlogPosting image does not match the canonical social image")
    proforma_term = {
        "@id": f"{SITE}{link_target('/glossary/proforma-invoice/', locale_for(path))}#term"
    }
    if path.endswith("/what-is-a-proforma-invoice/"):
        if article.get("about") != proforma_term:
            fail(f"{path}: proforma BlogPosting does not reference its term")
    elif article.get("about") == proforma_term:
        fail(f"{path}: unrelated BlogPosting is incorrectly about proforma invoices")


def check_tool_application(path: str, documents: list[dict]) -> None:
    if "/tools/" not in path or path.endswith("/tools/"):
        return
    applications = [node for node in walk_json(documents) if json_type(node, "WebApplication")]
    if len(applications) != 1:
        fail(f"{path}: expected one WebApplication, found {len(applications)}")
        return
    application = applications[0]
    canonical = f"{SITE}{path}"
    if application.get("@id") != f"{canonical}#application":
        fail(f"{path}: WebApplication ID is not canonical")
    if application.get("url") != canonical:
        fail(f"{path}: WebApplication URL does not match its canonical")
    if application.get("inLanguage") != lang_for(path):
        fail(f"{path}: WebApplication language does not match its locale")
    if application.get("mainEntityOfPage") != {"@id": canonical}:
        fail(f"{path}: WebApplication mainEntityOfPage is not canonical")
    if application.get("provider") != {"@id": ORG_ID} or application.get("publisher") != {"@id": ORG_ID}:
        fail(f"{path}: WebApplication ownership is not canonical")


def check_breadcrumbs(path: str, documents: list[dict]) -> None:
    page_locale = locale_for(path)
    for node in walk_json(documents):
        if not json_type(node, "BreadcrumbList"):
            continue
        items = node.get("itemListElement")
        if not isinstance(items, list):
            fail(f"{path}: BreadcrumbList itemListElement is not a list")
            continue
        for item in items:
            if not isinstance(item, dict):
                fail(f"{path}: BreadcrumbList contains a non-object item")
                continue
            target = item.get("item")
            if isinstance(target, dict):
                target = target.get("@id") or target.get("url")
            if not isinstance(target, str):
                fail(f"{path}: BreadcrumbList item has no URL")
                continue
            parsed = urlsplit(target)
            if f"{parsed.scheme}://{parsed.netloc}" != SITE:
                fail(f"{path}: BreadcrumbList URL is not on {SITE}: {target}")
                continue
            if not parsed.path.endswith("/"):
                fail(f"{path}: BreadcrumbList URL lacks trailing slash: {target}")
            target_locale = locale_for(parsed.path)
            if target_locale != page_locale:
                fail(f"{path}: BreadcrumbList URL uses {target_locale}, expected {page_locale}: {target}")


def check_hub(path: str, documents: list[dict], expected_items: int) -> None:
    lists = [node for node in walk_json(documents) if json_type(node, "ItemList")]
    matching = [
        node
        for node in lists
        if node.get("numberOfItems") == expected_items
        and isinstance(node.get("itemListElement"), list)
        and len(node["itemListElement"]) == expected_items
    ]
    if len(matching) != 1:
        fail(f"{path}: expected one ItemList with {expected_items} items")


def internal_links(document: str) -> set[str]:
    links: set[str] = set()
    for _, raw in re.findall(r'<a\b[^>]*\bhref=(["\'])(.*?)\1', document, flags=re.IGNORECASE | re.DOTALL):
        value = html.unescape(raw.strip())
        if not value or value.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        parsed = urlsplit(value)
        if parsed.netloc and f"{parsed.scheme}://{parsed.netloc}" != SITE:
            continue
        if not parsed.netloc and not parsed.path.startswith("/"):
            continue
        target = parsed.path or "/"
        if target != "/" and not target.endswith("/"):
            continue
        links.add(target)
    return links


def check_translated_titles() -> None:
    """A localized page must not wear the English title.

    Every locale file translates `short`, `metaDescription` and the body, and a
    handful stopped one field short: the title. The page then ranked in Hindi,
    Urdu or Bengali while showing an English headline in the result, and the
    English twin and the translation shipped one identical <title>. Search
    Console reported seven of them as duplicates on paperandpen.om, 6 Sep 2026.

    This reads the SOURCE content, not the build, because that is where the gap
    is and where it is fixed. Fields are compared against the English file for
    the same slug, so a term deliberately kept in Latin script is only a failure
    when the WHOLE string matches English.
    """
    content_root = pathlib.Path("src") / "content"
    data_root = pathlib.Path("src") / "data"
    fields = ("metaTitle", "title")
    for base in (content_root, data_root):
        if not base.is_dir():
            continue
        for group in sorted(base.iterdir()):
            english_dir = group / "en"
            if not english_dir.is_dir():
                continue
            english = {}
            for entry in english_dir.glob("*.json"):
                try:
                    english[entry.stem] = json.loads(entry.read_text(encoding="utf8"))
                except json.JSONDecodeError:
                    fail(f"{entry} is not valid JSON")
            for locale_dir in sorted(x for x in group.iterdir() if x.is_dir()):
                if locale_dir.name == "en":
                    continue
                for entry in sorted(locale_dir.glob("*.json")):
                    try:
                        document = json.loads(entry.read_text(encoding="utf8"))
                    except json.JSONDecodeError:
                        fail(f"{entry} is not valid JSON")
                        continue
                    source = english.get(entry.stem)
                    if not source:
                        continue
                    for field in fields:
                        theirs = document.get(field)
                        ours = source.get(field)
                        if isinstance(theirs, str) and isinstance(ours, str) \
                                and theirs.strip() and theirs == ours:
                            fail(
                                f"{group.name}/{locale_dir.name}/{entry.stem}: "
                                f"{field} is still the English string"
                            )


def check_source_truth() -> None:
    gcc = r"(?:GCC|জিসিসি|الخليج|دول مجلس التعاون|جی سی سی|जीसीसी)"
    digit = r"[0-9০-৯٠-٩]"
    rate = rf"(?:(?<!{digit})5%|(?<!{digit})৫%|(?<!{digit})٥٪|%5|(?<!{digit})5 percent|(?<!{digit})5 শতাংশ|(?<!{digit})5 بالمئة|(?<!{digit})5 فیصد|(?<!{digit})5 प्रतिशत)"
    unsafe = re.compile(
        rf"{gcc}.{{0,260}}{rate}|{rate}.{{0,260}}{gcc}",
        flags=re.IGNORECASE | re.DOTALL,
    )
    roots = (pathlib.Path("src/content"), pathlib.Path("src/i18n"), pathlib.Path("public"))
    suffixes = {".json", ".mdx", ".md", ".txt", ".astro", ".ts", ""}
    hits: list[str] = []
    for root in roots:
        for source in sorted(path for path in root.rglob("*") if path.is_file()):
            if source.suffix.lower() not in suffixes:
                continue
            if source.as_posix().startswith("src/content/vat/"):
                continue
            try:
                text = source.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            for match in unsafe.finditer(text):
                number = text.count("\n", 0, match.start()) + 1
                hits.append(f"{source}:{number}")
    if hits:
        fail(f"unsafe global GCC 5 percent phrasing remains: {', '.join(hits[:12])}")


def check_agent_index() -> None:
    source = pathlib.Path("public/.well-known/agent-skills/index.json")
    try:
        data = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"agent discovery index does not parse: {error}")
        return
    if '"$schema"' in json.dumps(data, ensure_ascii=False):
        fail("agent discovery index still declares $schema")
    if "proprietary" not in str(data.get("format", "")).lower():
        fail("agent discovery index format is not labeled proprietary")
    if "not a standards-based" not in str(data.get("notice", "")).lower():
        fail("agent discovery index lacks a non-standard notice")


def check_retired_shop_policy() -> None:
    source = pathlib.Path("ops/nginx/paperandpen.om.conf")
    if not source.is_file():
        fail("versioned Paper & Pen nginx configuration is missing")
        return
    text = source.read_text(encoding="utf-8")
    successor = "https://paperandpen.om/stationery-supplies-oman/"
    for shop_path in ("/shop", "/shop/"):
        pattern = rf"location\s*=\s*{re.escape(shop_path)}\s*\{{\s*return\s+301\s+{re.escape(successor)};\s*\}}"
        if not re.search(pattern, text):
            fail(f"nginx does not redirect exact {shop_path} to the stationery successor")
    for retired_prefix in ("/product/", "/product-category/", "/product-tag/", "/category/"):
        pattern = rf"location\s+\^~\s+{re.escape(retired_prefix)}\s*\{{\s*return\s+410;\s*\}}"
        if not re.search(pattern, text):
            fail(f"nginx no longer returns 410 for retired catalogue prefix {retired_prefix}")
    if "\u2014" in text:
        fail("versioned nginx configuration contains an em dash")
    if not re.search(r"location\s*=\s*/llms\.txt\s*\{.*?charset\s+utf-8;", text, flags=re.DOTALL):
        fail("versioned nginx configuration does not preserve UTF-8 llms.txt responses")


def check_retired_crm_policy() -> None:
    source = pathlib.Path("ops/nginx/crm.paperandpen.om.conf")
    if not source.is_file():
        fail("versioned retired CRM nginx configuration is missing")
        return
    text = source.read_text(encoding="utf-8")
    if text.count("server_name crm.paperandpen.om;") != 2:
        fail("retired CRM nginx configuration must cover HTTP and HTTPS")
    if text.count("return 301 https://erp.paperandpen.om/;") != 2:
        fail("retired CRM nginx configuration does not point permanently to ERP")
    if re.search(r"return\s+503\b", text):
        fail("retired CRM nginx configuration still advertises a temporary outage")
    if "\u2014" in text:
        fail("retired CRM nginx configuration contains an em dash")


def check_deployment_wrapper() -> None:
    source = pathlib.Path("scripts/deploy_site.sh")
    if not source.is_file():
        fail("tracked deployment wrapper is missing")
        return
    text = source.read_text(encoding="utf-8")
    if not source.stat().st_mode & 0o111:
        fail("tracked deployment wrapper is not executable")
    required = (
        'REMOTE_HOST="root@147.93.20.54"',
        'REMOTE_ROOT="/www/wwwroot/paperandpen.om"',
        "-azc",
        "--dry-run",
        "sha256sum -c .deploy-manifest.sha256",
        "git diff --quiet",
        "origin/main",
    )
    for marker in required:
        if marker not in text:
            fail(f"deployment wrapper is missing safety marker: {marker}")
    if "--delete" in text:
        fail("deployment wrapper must remain additive")
    if "\u2014" in text:
        fail("deployment wrapper contains an em dash")


def check_nginx_deployment_wrapper() -> None:
    source = pathlib.Path("scripts/deploy_nginx.sh")
    if not source.is_file():
        fail("tracked nginx deployment wrapper is missing")
        return
    text = source.read_text(encoding="utf-8")
    if not source.stat().st_mode & 0o111:
        fail("tracked nginx deployment wrapper is not executable")
    required = (
        'MODE="${1:---dry-run}"',
        'REMOTE_APEX_CONFIG="$REMOTE_CONFIG_DIR/paperandpen.om.conf"',
        'REMOTE_CRM_CONFIG="$REMOTE_CONFIG_DIR/crm.paperandpen.om.conf"',
        'REMOTE_BACKUP_ROOT="$REMOTE_CONFIG_DIR/.paperandpen-backups"',
        'REMOTE_LOCK="/run/lock/paperandpen-nginx-deploy.lock"',
        "openssl x509 -in",
        "-checkhost",
        "-checkend",
        "os.memfd_create",
        "flock -n 9",
        "mkdir -m 0700",
        "install -m 0644",
        '"$nginx_bin" -t -q',
        '"$systemctl_bin" reload nginx',
        "apex_rollback_pending",
        "No reload was attempted",
        "on_signal TERM 143",
        "rollback",
        "git diff --quiet",
        "origin/main",
    )
    for marker in required:
        if marker not in text:
            fail(f"nginx deployment wrapper is missing safety marker: {marker}")
    if "--delete" in text or "rm -rf" in text:
        fail("nginx deployment wrapper contains a broad deletion operation")
    if "\u2014" in text:
        fail("nginx deployment wrapper contains an em dash")

    procedure = pathlib.Path("ops/nginx/DEPLOY.md")
    if not procedure.is_file():
        fail("nginx production procedure is not documented")
    elif "\u2014" in procedure.read_text(encoding="utf-8"):
        fail("nginx production procedure contains an em dash")

    rollback_test = pathlib.Path("scripts/test_deploy_nginx.sh")
    if not rollback_test.is_file():
        fail("nginx rollback test is missing")
    elif not rollback_test.stat().st_mode & 0o111:
        fail("nginx rollback test is not executable")
    else:
        rollback_test_text = rollback_test.read_text(encoding="utf-8")
        for marker in ("run_success_case", "run_lock_contention_case"):
            if marker not in rollback_test_text:
                fail(f"nginx rollback test is missing transaction coverage: {marker}")
        if "\u2014" in rollback_test_text:
            fail("nginx rollback test contains an em dash")

    package_source = pathlib.Path("package.json")
    try:
        package_scripts = json.loads(package_source.read_text(encoding="utf-8")).get("scripts", {})
    except (OSError, json.JSONDecodeError) as error:
        fail(f"package.json does not parse while checking nginx CI coverage: {error}")
    else:
        if package_scripts.get("test:nginx-deploy") != "bash scripts/test_deploy_nginx.sh":
            fail("package.json does not expose the nginx rollback test")
        if "npm run test:nginx-deploy" not in package_scripts.get("verify", ""):
            fail("the nginx rollback test is not wired into the verification gate")


def expected_counts() -> tuple[int, int, dict[str, set[str]]]:
    """Derive the page and noindex totals from the SOURCE tree and the live
    locale set, instead of hardcoding them, using the site's build rules:

    - every top-level and hub route is built once per live locale, except the
      routes on englishArabicStaticPaths (en and ar only);
    - a content slug is built in every live core locale when any core entry
      exists (English fallback), and in a live non-core locale only when that
      locale's own source file exists;
    - a glossary term is published only when every live core locale has it,
      then built in every live core locale and in each non-core locale that
      has its file;
    - noindex: login and signup in every locale, terms and privacy in every
      locale but English.

    Returns (pages, noindex, {route path: set of locales built}).
    """
    routes = pathlib.Path("src/pages/[...locale]")
    content_map = {
        "features": "/features", "documents": "/invoicing", "industries": "/industries",
        "usecases": "/use-cases", "comparisons": "/compare", "tools": "/tools",
        "templates": "/invoice-templates", "alternatives": "/alternatives",
        "vat": "/vat", "blog": "/blog",
    }
    built: dict[str, set[str]] = {}
    for source in sorted(routes.rglob("*.astro")):
        if source.name == "[slug].astro":
            continue
        text = source.read_text(encoding="utf-8")
        relative = source.relative_to(routes).with_suffix("").as_posix()
        route = "/" if relative == "index" else "/" + relative.removesuffix("/index")
        locales_for_route = (
            {code for code in LIVE if code in ("en", "ar")}
            if "englishArabicStaticPaths" in text
            else set(LIVE)
        )
        built[route] = locales_for_route
    for collection, base in content_map.items():
        root = pathlib.Path("src/content") / collection
        by_slug: dict[str, set[str]] = defaultdict(set)
        for entry in root.glob("*/*"):
            if entry.suffix in (".json", ".md", ".mdx"):
                by_slug[entry.stem].add(entry.parent.name)
        for slug, have in by_slug.items():
            core = set(CORE_LIVE) if have & set(L.CORE) else set()
            built[f"{base}/{slug}"] = core | {code for code in LIVE if code not in L.CORE and code in have}
    glossary_root = pathlib.Path("src/data/glossary")
    by_term: dict[str, set[str]] = defaultdict(set)
    for entry in glossary_root.glob("*/*.json"):
        by_term[entry.stem].add(entry.parent.name)
    for slug, have in by_term.items():
        if "en" in have and set(CORE_LIVE) <= have:
            built[f"/glossary/{slug}"] = set(CORE_LIVE) | {
                code for code in LIVE if code not in L.CORE and code in have
            }
    total = sum(len(codes) for codes in built.values())
    noindex = 2 * len(LIVE) + 2 * (len(LIVE) - 1)
    return total, noindex, built


EXPECTED_PAGES, EXPECTED_NOINDEX, EXPECTED_BUILT = expected_counts()
EXPECTED_SITEMAP_URLS = EXPECTED_PAGES - EXPECTED_NOINDEX

if not DIST.is_dir():
    fail("dist is missing, run npm run build first")
    pages: list[pathlib.Path] = []
else:
    pages = sorted(DIST.rglob("index.html"))

if len(pages) != EXPECTED_PAGES:
    fail(f"expected {EXPECTED_PAGES} built pages, found {len(pages)}")

# Every built page is one the rules above say exists, and the reverse. This is
# what proves a non-core locale has no English fallback pages: a /de/ content
# URL without a German source file is not in EXPECTED_BUILT.
built_paths = {page_path(page) for page in pages}
expected_paths = {
    f"{localized_path(route if route == '/' else route + '/', code)}"
    for route, codes in EXPECTED_BUILT.items()
    for code in codes
}
unexpected = sorted(built_paths - expected_paths)
not_built = sorted(expected_paths - built_paths)
if unexpected:
    fail(f"pages built that the locale rules do not allow (English fallback?): {unexpected[:8]} (total {len(unexpected)})")
if not_built:
    fail(f"pages the locale rules require but the build lacks: {not_built[:8]} (total {len(not_built)})")

documents_by_path: dict[str, str] = {}
jsonld_by_path: dict[str, list[dict]] = {}
canonical_by_path: dict[str, str] = {}
indexable_paths: set[str] = set()

for page in pages:
    path = page_path(page)
    document = page.read_text(encoding="utf-8", errors="replace")
    documents_by_path[path] = document
    if "\u2014" in document:
        fail(f"{path}: built HTML contains an em dash")
    canonical = canonical_from(document)
    expected_canonical = f"{SITE}{path}"
    if canonical is None:
        fail(f"{path}: canonical is missing")
    else:
        canonical_by_path[path] = canonical
        if canonical != expected_canonical:
            fail(f"{path}: canonical {canonical} does not match {expected_canonical}")
        if not canonical.endswith("/"):
            fail(f"{path}: canonical lacks a trailing slash")
    if not is_noindex(document):
        indexable_paths.add(path)
        page_title = title_from(document)
        if locale_for(path) == "en" and len(page_title) > 60:
            fail(f"{path}: English title is {len(page_title)} characters, expected at most 60")
    jsonld = extract_jsonld(path, document)
    jsonld_by_path[path] = jsonld
    nodes = top_level_nodes(jsonld)
    check_organization(path, nodes)
    check_applications(path, jsonld)
    check_site_graph(path, document, nodes)
    check_article_graph(path, document, jsonld)
    check_tool_application(path, jsonld)
    check_breadcrumbs(path, jsonld)
    if any(json_type(node, "Product") for node in walk_json(jsonld)):
        fail(f"{path}: merchant Product schema is not valid for the current SaaS and quote-based offers")

# Priority pages must exist in every live CORE locale. A non-core locale is
# checked wherever its translation has been built.
for locale in LIVE:
    prefix = "" if locale == "en" else f"/{locale}"
    required = locale in CORE_LIVE
    for slug in PRIORITY_ARTICLES:
        path = f"{prefix}/blog/{slug}/"
        document = documents_by_path.get(path, "")
        if path not in indexable_paths:
            if required:
                fail(f"priority article is missing or not indexable: {path}")
            continue
        check_priority_article(path, document, jsonld_by_path[path])
        check_priority_alternates(path, document, f"/blog/{slug}/")
    calculator_path = f"{prefix}/tools/oman-vat-calculator/"
    calculator = documents_by_path.get(calculator_path, "")
    if calculator_path not in indexable_paths:
        if required:
            fail(f"priority calculator is missing or not indexable: {calculator_path}")
    else:
        check_priority_tool(calculator_path, calculator, jsonld_by_path[calculator_path])
        check_priority_alternates(calculator_path, calculator, "/tools/oman-vat-calculator/")

for kind, (english_path, arabic_path) in INTENT_PAGE_PAIRS.items():
    for path in (english_path, arabic_path):
        document = documents_by_path.get(path, "")
        if path not in indexable_paths:
            fail(f"commercial-intent page is missing or not indexable: {path}")
            continue
        check_intent_page(kind, path, document, jsonld_by_path[path])
        check_intent_alternates(path, document, english_path, arabic_path)

for unavailable_locale in (code for code in LOCALES if code != "ar"):
    for english_path, _ in INTENT_PAGE_PAIRS.values():
        unavailable_path = f"/{unavailable_locale}{english_path}"
        if unavailable_path in documents_by_path:
            fail(f"untranslated commercial-intent page was built: {unavailable_path}")

home_links = {
    "/": internal_links(documents_by_path.get("/", "")),
    "/ar/": internal_links(documents_by_path.get("/ar/", "")),
}
for english_path, arabic_path in INTENT_PAGE_PAIRS.values():
    if english_path not in home_links["/"]:
        fail(f"English home page does not link to {english_path}")
    if arabic_path not in home_links["/ar/"]:
        fail(f"Arabic home page does not link to {arabic_path}")

for locale_prefix in ("", "/ar"):
    stationery_path = f"{locale_prefix}/stationery-supplies-oman/"
    erp_path = f"{locale_prefix}/erp-software-oman/"
    if erp_path not in internal_links(documents_by_path.get(stationery_path, "")):
        fail(f"{stationery_path}: visible link to the distinct ERP offer is missing")
    if stationery_path not in internal_links(documents_by_path.get(erp_path, "")):
        fail(f"{erp_path}: visible link to the distinct stationery offer is missing")

for locale in ("en", "ar"):
    target = localized_path("/blog/what-is-a-proforma-invoice/", locale)
    inbound_sources = (
        localized_path("/tools/free-proforma-invoice-generator/", locale),
        localized_path("/invoicing/proforma-invoices/", locale),
    )
    for source in inbound_sources:
        if target not in internal_links(documents_by_path.get(source, "")):
            fail(f"{source}: contextual link to the canonical proforma answer is missing")

for legal_path in (("/ur/privacy/", "/ur/terms/") if "ur" in LIVE else ()):
    description = description_from(documents_by_path.get(legal_path, ""))
    if not re.search(r"[\u0600-\u06ff]", description):
        fail(f"{legal_path}: Urdu meta description is missing Urdu text")

noindex_count = len(pages) - len(indexable_paths)
if noindex_count != EXPECTED_NOINDEX:
    fail(f"expected {EXPECTED_NOINDEX} noindex pages, found {noindex_count}")

sitemap_path = DIST / "sitemap-0.xml"
if not sitemap_path.is_file():
    fail("dist/sitemap-0.xml is missing")
    sitemap_urls: set[str] = set()
else:
    sitemap_text = sitemap_path.read_text(encoding="utf-8")
    sitemap_urls = set(html.unescape(value) for value in re.findall(r"<loc>(.*?)</loc>", sitemap_text))
    if len(sitemap_urls) != EXPECTED_SITEMAP_URLS:
        fail(f"expected {EXPECTED_SITEMAP_URLS} sitemap URLs, found {len(sitemap_urls)}")
    sitemap_blocks = re.findall(r"<url>.*?</url>", sitemap_text, flags=re.DOTALL)
    for block in sitemap_blocks:
        location = re.search(r"<loc>(.*?)</loc>", block, flags=re.DOTALL)
        lastmods = re.findall(r"<lastmod>(.*?)</lastmod>", block, flags=re.DOTALL)
        url = html.unescape(location.group(1)) if location else "unknown URL"
        if len(lastmods) != 1:
            fail(f"{url}: expected exactly one sitemap lastmod, found {len(lastmods)}")
        elif not lastmods[0].startswith(SITEMAP_LASTMOD_DATE):
            fail(f"{url}: sitemap lastmod is not the reviewed sitewide update date")

    sitemap_alias = DIST / "sitemap.xml"
    if not sitemap_alias.is_file():
        fail("dist/sitemap.xml is missing")
    else:
        alias_locations = re.findall(r"<loc>(.*?)</loc>", sitemap_alias.read_text(encoding="utf-8"))
        if alias_locations != [f"{SITE}/sitemap-0.xml"]:
            fail("sitemap.xml must directly reference sitemap-0.xml")

# Per-page hreflang, for EVERY indexable page: the <head> set, the set the
# build's availability implies, and the sitemap's xhtml:link set must be the
# same. Expected = every live locale in which this page was built and is
# indexable, plus x-default to English; a page indexable in one locale only
# carries no alternate set at all (neither in the head nor in the sitemap).
sitemap_alternates: dict[str, dict[str, str]] = {}
if sitemap_path.is_file():
    for block in re.findall(r"<url>.*?</url>", sitemap_text, flags=re.DOTALL):
        location = re.search(r"<loc>(.*?)</loc>", block, flags=re.DOTALL)
        if not location:
            continue
        links = re.findall(
            r'<xhtml:link\b[^>]*\bhreflang="([^"]+)"[^>]*\bhref="([^"]+)"', block
        )
        sitemap_alternates[html.unescape(location.group(1))] = {
            lang: html.unescape(url) for lang, url in links
        }


def default_path(path: str) -> str:
    locale = locale_for(path)
    return path if locale == "en" else path[len(locale) + 1:]


hreflang_head_mismatch: list[str] = []
hreflang_sitemap_mismatch: list[str] = []
for path in sorted(indexable_paths):
    base = default_path(path)
    present = [code for code in LIVE if localized_path(base, code) in indexable_paths]
    expected: dict[str, str] = {}
    if len(present) >= 2:
        expected = {HREFLANG[code]: f"{SITE}{localized_path(base, code)}" for code in present}
        expected["x-default"] = f"{SITE}{base}"
    if hreflang_map(documents_by_path[path]) != expected:
        hreflang_head_mismatch.append(path)
    if sitemap_alternates.get(f"{SITE}{path}", {}) != expected:
        hreflang_sitemap_mismatch.append(path)
if hreflang_head_mismatch:
    fail(
        "page hreflang set does not match the locales the page is built in: "
        f"{hreflang_head_mismatch[:8]} (total {len(hreflang_head_mismatch)})"
    )
if hreflang_sitemap_mismatch:
    fail(
        "sitemap alternates do not match the locales the page is built in: "
        f"{hreflang_sitemap_mismatch[:8]} (total {len(hreflang_sitemap_mismatch)})"
    )

# html lang and dir on every page follow the locale table.
for path, document in documents_by_path.items():
    tag = re.search(r"<html\b([^>]*)>", document)
    attrs = tag.group(1) if tag else ""
    lang = re.search(r'\blang="([^"]+)"', attrs)
    direction = re.search(r'\bdir="([^"]+)"', attrs)
    locale = locale_for(path)
    if not lang or lang.group(1) != HREFLANG[locale]:
        fail(f"{path}: html lang is not {HREFLANG[locale]}")
    want_dir = "rtl" if locale in L.RTL else "ltr"
    if not direction or direction.group(1) != want_dir:
        fail(f"{path}: html dir is not {want_dir}")

# Every internal page link on every built page must land on a page that was
# built. Content for later locales lands in waves, so a translated page's
# related links, breadcrumbs, nav and footer can name a page that does not yet
# exist in that locale; localizePath() then links the English page instead.
# This proves it never emits a URL that was not built.
ASSET_LINK = re.compile(r"\.(png|svg|ico|xml|txt|json|webmanifest|css|js|pdf|webp|jpe?g|woff2?)$")
dead_links: dict[str, set[str]] = defaultdict(set)
for path, document in documents_by_path.items():
    for raw in re.findall(r'<a\b[^>]*\bhref="(/[^"#?]*)', document):
        target = html.unescape(raw)
        if target.startswith(("/_astro/", "//")) or ASSET_LINK.search(target):
            continue
        if target != "/" and not target.endswith("/"):
            dead_links[target + " (no trailing slash)"].add(path)
            continue
        if target not in BUILT_PATHS and target != "/404/":
            dead_links[target].add(path)
if dead_links:
    sample_links = [f"{t} <- {sorted(src)[0]} (+{len(src) - 1})" for t, src in sorted(dead_links.items())[:8]]
    fail(f"internal links to pages that were not built: {sample_links} (total {len(dead_links)} targets)")

indexable_canonicals = {
    canonical_by_path[path]
    for path in indexable_paths
    if path in canonical_by_path
}
missing_sitemap = sorted(indexable_canonicals - sitemap_urls)
extra_sitemap = sorted(sitemap_urls - indexable_canonicals)
if missing_sitemap:
    fail(f"indexable canonicals missing from sitemap: {missing_sitemap[:8]}")
if extra_sitemap:
    fail(f"sitemap URLs without indexable pages: {extra_sitemap[:8]}")

for locale in LIVE:
    prefix = "" if locale == "en" else f"/{locale}"
    compare_path = f"{prefix}/compare/"
    industries_path = f"{prefix}/industries/"
    for required in (compare_path, industries_path):
        if required not in indexable_paths:
            fail(f"required indexable hub is missing: {required}")
    # Core locales list the whole set (7 comparisons, 15 industries). Any other
    # locale lists only what has been translated into it.
    def built_children(base: str, code: str) -> int:
        return sum(1 for route, codes in EXPECTED_BUILT.items() if route.startswith(base + "/") and code in codes)
    compare_items = 7 if locale in CORE_LIVE else built_children("/compare", locale)
    industry_items = 15 if locale in CORE_LIVE else built_children("/industries", locale)
    if compare_path in jsonld_by_path:
        check_hub(compare_path, jsonld_by_path[compare_path], compare_items)
    if industries_path in jsonld_by_path:
        check_hub(industries_path, jsonld_by_path[industries_path], industry_items)

inbound: dict[str, set[str]] = defaultdict(set)
for source in sorted(indexable_paths):
    for target in internal_links(documents_by_path[source]):
        if target in indexable_paths and target != source:
            inbound[target].add(source)
locale_roots = {"/"} | {f"/{code}/" for code in LOCALES}
orphans = sorted(path for path in indexable_paths - locale_roots if not inbound[path])
if orphans:
    fail(f"visible indexable orphan pages: {orphans[:20]} (total {len(orphans)})")

for locale in LIVE:
    prefix = "" if locale == "en" else f"/{locale}"
    free_path = f"{prefix}/free-invoicing-software/"
    feature_path = f"{prefix}/features/invoicing/"
    if locale not in CORE_LIVE and feature_path not in documents_by_path:
        continue  # the feature page is not translated into this locale yet
    free_title = title_from(documents_by_path.get(free_path, ""))
    feature_title = title_from(documents_by_path.get(feature_path, ""))
    if not free_title or not feature_title:
        fail(f"{locale}: invoicing intent comparison pages are missing titles")
    elif free_title.casefold() == feature_title.casefold():
        fail(f"{locale}: free landing and invoicing feature titles still collide")

required_files = (
    "robots.txt",
    "sitemap-index.xml",
    "sitemap-0.xml",
    "llms.txt",
    ".well-known/agent-skills/index.json",
    ".well-known/api-catalog",
)
for relative in required_files:
    built = DIST / relative
    if not built.is_file():
        fail(f"discovery file is missing from dist: {relative}")
        continue
    if relative not in {"sitemap-index.xml", "sitemap-0.xml"} and "\u2014" in built.read_text(encoding="utf-8"):
        fail(f"{relative}: discovery file contains an em dash")

llms_path = DIST / "llms.txt"
llms_text = llms_path.read_text(encoding="utf-8") if llms_path.is_file() else ""
for english_path, arabic_path in INTENT_PAGE_PAIRS.values():
    for path in (english_path, arabic_path):
        if f"{SITE}{path}" not in llms_text:
            fail(f"llms.txt is missing commercial-intent URL: {path}")
if "retired product catalogue" not in llms_text:
    fail("llms.txt does not explain that the former stationery catalogue is retired")
if "blanket e-invoicing certification" not in llms_text:
    fail("llms.txt does not preserve the GCC e-invoicing qualification")
for answer_path in sorted(PROFORMA_ANSWER_PATHS):
    if f"{SITE}{answer_path}" not in llms_text:
        fail(f"llms.txt is missing proforma answer URL: {answer_path}")
if "A proforma invoice is a proposed sale in invoice format, not the final tax invoice" not in llms_text:
    fail("llms.txt is missing the qualified proforma definition")

check_source_truth()
check_translated_titles()
check_agent_index()
check_retired_shop_policy()
check_retired_crm_policy()
check_deployment_wrapper()
check_nginx_deployment_wrapper()

print(f"live locales: {len(LIVE)} ({', '.join(LIVE)})")
print(f"pages: {len(pages)} (expected {EXPECTED_PAGES})")
print(f"indexable: {len(indexable_paths)}")
print(f"noindex: {noindex_count}")
print(f"sitemap urls: {len(sitemap_urls)}")
print(f"visible orphans: {len(orphans)}")
if failures:
    for message in sorted(set(failures)):
        print(f"FAIL {message}")
    print("SEO INTEGRITY: FAIL")
    sys.exit(1)

print("SEO INTEGRITY: PASS")
