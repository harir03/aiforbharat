"""
Record normalisation — pure, deterministic functions.

PRD Features A2: Strip legal suffixes, expand abbreviations,
uppercase, strip punctuation, collapse whitespace.
"""
import re
from typing import Optional

# Ordered longest-first so "private limited" is tried before "limited"
LEGAL_SUFFIXES: list[str] = sorted(
    [
        "private limited",
        "pvt ltd",
        "pvt. ltd.",
        "pvt. ltd",
        "(p) ltd",
        "(p) ltd.",
        "limited",
        "ltd.",
        "ltd",
        "llp",
        "co.",
    ],
    key=len,
    reverse=True,
)

ABBREVIATIONS: dict[str, str] = {
    "mfg": "manufacturing",
    "mfg.": "manufacturing",
    "engg": "engineering",
    "engg.": "engineering",
    "bros": "brothers",
    "intl": "international",
    "intl.": "international",
    "mgmt": "management",
    "svcs": "services",
    "corp": "corporation",
    "mnfg": "manufacturing",
}

ADDRESS_ABBREVIATIONS: dict[str, str] = {
    "rd": "road",
    "rd.": "road",
    "mkt": "market",
    "mkt.": "market",
    "st": "street",
    "st.": "street",
    "ave": "avenue",
    "ave.": "avenue",
    "blvd": "boulevard",
    "dr": "drive",
    "dr.": "drive",
}

# Regex to strip floor/unit numbers like "Unit 5", "Floor 3", "3rd Floor"
_FLOOR_UNIT_RE = re.compile(
    r"\b(?:unit|floor|flr|suite|shop\s*no\.?|plot\s*no\.?)\s*\d+\w*",
    re.IGNORECASE,
)
# Regex to extract 6-digit Indian PIN code
_PIN_RE = re.compile(r"\b(\d{6})\b")
# Regex to strip punctuation (keep alphanumeric and space)
_PUNCT_RE = re.compile(r"[^A-Z0-9\s]")
# Regex to collapse whitespace
_WS_RE = re.compile(r"\s+")


def normalise_name(raw: Optional[str]) -> str:
    """Normalise a business name to canonical form.

    Pure function — no side effects, deterministic output.
    Steps: lowercase → strip legal suffixes → expand abbreviations →
           uppercase → strip punctuation → collapse whitespace.
    """
    if not raw:
        return ""

    text = raw.strip().lower()

    # Strip legal suffixes (longest-first)
    for suffix in LEGAL_SUFFIXES:
        if text.endswith(suffix):
            text = text[: -len(suffix)].rstrip(" .")
            break

    # Expand abbreviations (whole-word only)
    words = text.split()
    expanded: list[str] = []
    for word in words:
        cleaned = word.strip(".,;:")
        replacement = ABBREVIATIONS.get(cleaned)
        if replacement:
            expanded.append(replacement)
        else:
            expanded.append(word)
    text = " ".join(expanded)

    # Uppercase
    text = text.upper()

    # Strip punctuation
    text = _PUNCT_RE.sub("", text)

    # Collapse whitespace
    text = _WS_RE.sub(" ", text).strip()

    return text


def normalise_address(raw: Optional[str]) -> str:
    """Normalise an address string.

    Pure function — no side effects, deterministic output.
    Steps: strip floor/unit numbers → expand abbreviations →
           remove embedded PIN → uppercase → strip punctuation → collapse WS.
    """
    if not raw:
        return ""

    text = raw.strip().lower()

    # Strip floor/unit numbers
    text = _FLOOR_UNIT_RE.sub("", text)

    # Remove embedded PIN code (we extract it separately)
    text = _PIN_RE.sub("", text)

    # Expand address abbreviations (whole-word)
    words = text.split()
    expanded: list[str] = []
    for word in words:
        cleaned = word.strip(".,;:")
        replacement = ADDRESS_ABBREVIATIONS.get(cleaned)
        if replacement:
            expanded.append(replacement)
        else:
            expanded.append(word)
    text = " ".join(expanded)

    # Uppercase
    text = text.upper()

    # Strip punctuation
    text = _PUNCT_RE.sub("", text)

    # Collapse whitespace
    text = _WS_RE.sub(" ", text).strip()

    return text


def extract_pin(raw: Optional[str]) -> Optional[str]:
    """Extract a 6-digit Indian PIN code from an address string."""
    if not raw:
        return None
    match = _PIN_RE.search(raw)
    return match.group(1) if match else None
