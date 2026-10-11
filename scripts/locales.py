"""The locale table for the Python build checks, read from the same sources the
site reads, so no check carries its own list of languages.

- HREFLANG and CORE_LOCALES come from src/i18n/hreflang.mjs (the one table that
  feeds <html lang>, the page hreflang set and the sitemap).
- LIVE is every code with a dictionary at src/i18n/ui/<code>.json, in table
  order, which is exactly the rule src/i18n/index.ts and astro.config.mjs use.
"""

from __future__ import annotations

import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
_TABLE = (ROOT / "src/i18n/hreflang.mjs").read_text(encoding="utf-8")


def _object(name: str) -> dict[str, str]:
    body = re.search(rf"export const {name} = \{{(.*?)\n\}};", _TABLE, flags=re.S)
    if not body:
        raise SystemExit(f"locales.py: cannot find {name} in src/i18n/hreflang.mjs")
    pairs = re.findall(r"^\s*'?([a-z-]+)'?\s*:\s*'([^']+)'", body.group(1), flags=re.M)
    return dict(pairs)


def _array(name: str) -> list[str]:
    body = re.search(rf"export const {name} = \[(.*?)\];", _TABLE, flags=re.S)
    if not body:
        raise SystemExit(f"locales.py: cannot find {name} in src/i18n/hreflang.mjs")
    return re.findall(r"'([^']+)'", body.group(1))


HREFLANG: dict[str, str] = _object("HREFLANG")
ALL: list[str] = list(HREFLANG)
CORE: list[str] = _array("CORE_LOCALES")
LIVE: list[str] = [code for code in ALL if (ROOT / "src/i18n/ui" / f"{code}.json").is_file()]
NON_DEFAULT_LIVE: list[str] = [code for code in LIVE if code != "en"]
RTL: set[str] = {"ar", "ur", "fa", "he"}

# Locales written in a script other than Latin. A page in one of these that is
# mostly ASCII letters is rendering English; for a Latin-script locale that test
# cannot tell the two apart, so it is not applied there.
NON_LATIN: set[str] = {
    "ar", "hi", "bn", "ur", "ru", "uk", "bg", "fa", "he", "el", "zh", "zh-hant",
    "ja", "ko", "th", "sr", "ta", "te", "kn", "ml", "mr", "gu", "pa", "or",
}


def locale_of(path: str) -> str:
    """The locale a site path belongs to, by its first segment."""
    first = path.strip("/").split("/", 1)[0]
    return first if first in LIVE and first != "en" else "en"


def prefixed(path: str, locale: str) -> str:
    return path if locale == "en" else f"/{locale}{path}"


if not LIVE or LIVE[0] != "en":
    raise SystemExit("locales.py: src/i18n/ui/en.json is missing")
