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
EXPECTED_PAGES = 970
EXPECTED_SITEMAP_URLS = 952
EXPECTED_NOINDEX = 18

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
    jsonld = extract_jsonld(path, document)
    jsonld_by_path[path] = jsonld
    nodes = top_level_nodes(jsonld)
    check_organization(path, nodes)
    check_applications(path, jsonld)
    check_breadcrumbs(path, jsonld)

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

check_source_truth()
check_agent_index()

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
