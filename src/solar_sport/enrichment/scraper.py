import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

CONTACT_KEYWORDS = [
    "contact", "partnerships", "commercial", "sponsorship",
    "facilities", "sustainability", "operations",
]


def extract_emails(html: str) -> list[str]:
    """Extract unique email addresses from HTML content."""
    seen: set[str] = set()
    unique: list[str] = []
    for email in EMAIL_PATTERN.findall(html):
        lower = email.lower()
        if lower not in seen:
            seen.add(lower)
            unique.append(email)
    return unique


def extract_contact_links(html: str, base_url: str) -> list[dict]:
    """Find links that likely lead to contact or partnerships pages."""
    soup = BeautifulSoup(html, "html.parser")
    results = []
    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        text = a_tag.get_text(strip=True).lower()
        href_lower = href.lower()
        if any(kw in text or kw in href_lower for kw in CONTACT_KEYWORDS):
            results.append({"url": urljoin(base_url, href), "text": a_tag.get_text(strip=True)})
    return results


def find_contact_page_url(html: str, base_url: str) -> str | None:
    """Find the most likely contact page URL from the HTML."""
    links = extract_contact_links(html, base_url)
    if not links:
        return None
    for link in links:
        if "contact" in link["url"].lower():
            return link["url"]
    return links[0]["url"]
