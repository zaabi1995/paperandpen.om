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


DIST = pathlib.Path("dist")
SITE = "https://paperandpen.om"
ORG_ID = f"{SITE}/#organization"
LOCALES = ("ar", "hi", "bn", "ur")
EXPECTED_PAGES = 974
EXPECTED_SITEMAP_URLS = 956
EXPECTED_NOINDEX = 18
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


def check_priority_alternates(path: str, document: str, base_path: str) -> None:
    alternates = hreflang_map(document)
    expected = {
        locale: f"{SITE}{localized_path(base_path, locale)}"
        for locale in ("en", *LOCALES)
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
    if not str(article.get("dateModified", "")).startswith(expected_updated):
        fail(f"{path}: BlogPosting dateModified is not {expected_updated}")
    if article.get("url") != f"{SITE}{path}":
        fail(f"{path}: BlogPosting URL does not match its canonical")
    if article.get("inLanguage") != locale_for(path):
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
            "@id": f"{SITE}{localized_path('/glossary/proforma-invoice/', locale_for(path))}#term"
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
            localized_path("/vat/oman/", locale),
            localized_path("/tools/free-proforma-invoice-generator/", locale),
            localized_path("/invoicing/proforma-invoices/", locale),
            localized_path("/blog/quotation-vs-estimate-vs-proforma-invoice/", locale),
        }
        missing_links = sorted(required_links - internal_links(document))
        if missing_links:
            fail(f"{path}: proforma answer internal links are missing: {missing_links}")
    if "/vat-invoicing-gcc-guide/" in path:
        locale = locale_for(path)
        required_sources = {
            localized_path(f"/vat/{country}/", locale)
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
    if organization.get("url") != SITE:
        fail(f"{path}: Organization root url must be exactly {SITE}")
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


if not DIST.is_dir():
    fail("dist is missing, run npm run build first")
    pages: list[pathlib.Path] = []
else:
    pages = sorted(DIST.rglob("index.html"))

if len(pages) != EXPECTED_PAGES:
    fail(f"expected {EXPECTED_PAGES} built pages, found {len(pages)}")

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
    check_breadcrumbs(path, jsonld)

for locale in ("en", *LOCALES):
    prefix = "" if locale == "en" else f"/{locale}"
    for slug in PRIORITY_ARTICLES:
        path = f"{prefix}/blog/{slug}/"
        document = documents_by_path.get(path, "")
        if path not in indexable_paths:
            fail(f"priority article is missing or not indexable: {path}")
            continue
        check_priority_article(path, document, jsonld_by_path[path])
        check_priority_alternates(path, document, f"/blog/{slug}/")
    calculator_path = f"{prefix}/tools/oman-vat-calculator/"
    calculator = documents_by_path.get(calculator_path, "")
    if calculator_path not in indexable_paths:
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

for unavailable_locale in ("hi", "bn", "ur"):
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

for legal_path in ("/ur/privacy/", "/ur/terms/"):
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
    for answer_path in sorted(PROFORMA_ANSWER_PATHS):
        answer_url = f"{SITE}{answer_path}"
        block = re.search(
            rf"<url>.*?<loc>{re.escape(answer_url)}</loc>.*?</url>",
            sitemap_text,
            flags=re.DOTALL,
        )
        if not block or not re.search(r"<lastmod>2026-08-22", block.group(0)):
            fail(f"{answer_path}: sitemap lastmod is not 2026-08-22")

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

for locale in ("en", *LOCALES):
    prefix = "" if locale == "en" else f"/{locale}"
    compare_path = f"{prefix}/compare/"
    industries_path = f"{prefix}/industries/"
    for required in (compare_path, industries_path):
        if required not in indexable_paths:
            fail(f"required indexable hub is missing: {required}")
    if compare_path in jsonld_by_path:
        check_hub(compare_path, jsonld_by_path[compare_path], 7)
    if industries_path in jsonld_by_path:
        check_hub(industries_path, jsonld_by_path[industries_path], 15)

inbound: dict[str, set[str]] = defaultdict(set)
for source in sorted(indexable_paths):
    for target in internal_links(documents_by_path[source]):
        if target in indexable_paths and target != source:
            inbound[target].add(source)
locale_roots = {"/", "/ar/", "/hi/", "/bn/", "/ur/"}
orphans = sorted(path for path in indexable_paths - locale_roots if not inbound[path])
if orphans:
    fail(f"visible indexable orphan pages: {orphans[:20]} (total {len(orphans)})")

for locale in ("en", *LOCALES):
    prefix = "" if locale == "en" else f"/{locale}"
    free_path = f"{prefix}/free-invoicing-software/"
    feature_path = f"{prefix}/features/invoicing/"
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
check_agent_index()
check_retired_shop_policy()

print(f"pages: {len(pages)}")
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
